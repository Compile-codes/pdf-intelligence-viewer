import io
import fitz  # PyMuPDF — fallback for non-table text
import pdfplumber
from openai import AsyncOpenAI
from app.db.client import get_pool

openai = AsyncOpenAI()

CHUNK_SIZE    = 512
CHUNK_OVERLAP = 64


def chunk_text(text: str, page_number: int) -> list[dict]:
    """Split plain text into overlapping word-window chunks."""
    words = text.split()
    if not words:
        return []
    chunks = []
    step = CHUNK_SIZE - CHUNK_OVERLAP
    for i in range(0, len(words), step):
        chunk_words = words[i : i + CHUNK_SIZE]
        if chunk_words:
            chunks.append({
                "page_number": page_number,
                "text": " ".join(chunk_words)
            })
    return chunks


def clean_text(text: str) -> str:
    """
    Remove repeating header/footer noise that appears on every page.

    This PDF has two noise patterns:
    1. Full noise lines:  "secure.employmenthero.com/..."
    2. Inline noise:      "01/07/2025, 20:41 Simply AI | Award Free Casual Contract
                           (Gross Day Rate + Notice) [real content starts here]"

    For inline noise, the real content starts after "Notice) " — we strip
    everything before that marker so the actual clause text is preserved.
    """
    NOISE_LINES = [
        'secure.employmenthero.com',
        'employmenthero.com',
    ]
    # Dates that appear at the start of noisy header lines
    NOISE_DATE_PREFIXES = [
        '01/07/2025',
        '02/07/2025',
        '30/06/2025',
    ]
    # The document title that appears inline with real content
    INLINE_NOISE_MARKER = 'Notice) '

    lines = []
    for line in text.split('\n'):
        s = line.strip()
        if not s:
            continue

        # Skip full noise lines (URLs)
        if any(n in s for n in NOISE_LINES):
            continue

        # Handle inline noise: "01/07/2025, 20:41 Simply AI | ... Notice) real content"
        stripped_line = s
        for prefix in NOISE_DATE_PREFIXES:
            if s.startswith(prefix):
                idx = s.find(INLINE_NOISE_MARKER)
                if idx != -1:
                    # Keep only content after the noise marker
                    stripped_line = s[idx + len(INLINE_NOISE_MARKER):].strip()
                else:
                    # Entire line is noise, skip it
                    stripped_line = ''
                break

        if stripped_line:
            lines.append(stripped_line)

    return '\n'.join(lines)


def extract_table_as_text(table: list[list], page_number: int) -> dict | None:
    """
    Convert a pdfplumber table into labeled key-value text.

    This PDF's Key Terms table has 3 columns:
      Col 0: Field name  (e.g. "Location")
      Col 1: Value       (e.g. "Sydney")
      Col 2: Clause ref  (e.g. "Clause 3.1")

    We only care about col 0 and col 1 — label and value.
    This ensures "Location: Sydney" is stored as a clean searchable chunk.
    """
    if not table:
        return None

    lines = []
    for row in table:
        if not row or not any(cell for cell in row if cell):
            continue  # skip empty rows

        # Get all non-empty cells
        cells = [str(c).strip() for c in row if c and str(c).strip()]

        if len(cells) >= 2:
            label = cells[0]
            value = cells[1]
            # Skip rows where both cells look like clause references
            if label.lower().startswith('clause') and value.lower().startswith('clause'):
                continue
            lines.append(f"{label}: {value}")
        elif len(cells) == 1:
            lines.append(cells[0])

    if not lines:
        return None

    return {
        "page_number": page_number,
        "text": f"[Table on page {page_number}]\n" + "\n".join(lines)
    }


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch embed texts using OpenAI text-embedding-3-small (1536 dims)."""
    response = await openai.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    return [item.embedding for item in response.data]


async def index_document(document_id: str, pdf_bytes: bytes):
    """
    Full indexing pipeline:
      1. Extract tables per page (pdfplumber) — preserves label:value structure
      2. Extract remaining plain text per page, filtered of noise
      3. Chunk text into overlapping windows
      4. Embed all chunks in batches of 100
      5. Upsert into chunks table
      6. Mark document as ready
    """
    pool = await get_pool()
    await pool.execute(
        "UPDATE documents SET status='indexing' WHERE id=$1",
        document_id
    )

    try:
        all_chunks: list[dict] = []

        # ── Step 1 & 2: Extract tables + text with pdfplumber ──────────────
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as plumber_doc:
            for page_num, page in enumerate(plumber_doc.pages, start=1):

                # Extract tables first — preserves key:value structure
                tables = page.extract_tables()
                for table in tables:
                    chunk = extract_table_as_text(table, page_num)
                    if chunk:
                        all_chunks.append(chunk)

                # Extract plain text and clean noise
                text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if text and text.strip():
                    cleaned = clean_text(text)
                    if cleaned.strip():
                        all_chunks.extend(chunk_text(cleaned, page_num))

        # ── Fallback: if pdfplumber extracted nothing, try PyMuPDF ─────────
        if not all_chunks:
            fitz_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page_num in range(len(fitz_doc)):
                text = fitz_doc[page_num].get_text()
                if text.strip():
                    cleaned = clean_text(text)
                    if cleaned.strip():
                        all_chunks.extend(chunk_text(cleaned, page_num + 1))

        if not all_chunks:
            await pool.execute(
                "UPDATE documents SET status='error' WHERE id=$1",
                document_id
            )
            return

        # ── Step 3: Embed in batches of 100 ────────────────────────────────
        for i in range(0, len(all_chunks), 100):
            batch = all_chunks[i : i + 100]
            embeddings = await embed_texts([c["text"] for c in batch])
            await pool.executemany(
                """INSERT INTO chunks (document_id, page_number, text, embedding)
                   VALUES ($1, $2, $3, $4)""",
                [
                    (document_id, c["page_number"], c["text"], emb)
                    for c, emb in zip(batch, embeddings)
                ]
            )

        # ── Step 4: Mark as ready ───────────────────────────────────────────
        await pool.execute(
            """UPDATE documents
               SET status='ready', page_count=$2, chunk_count=$3
               WHERE id=$1""",
            document_id,
            max(c["page_number"] for c in all_chunks),
            len(all_chunks)
        )

    except Exception as e:
        await pool.execute(
            "UPDATE documents SET status='error' WHERE id=$1",
            document_id
        )
        raise e