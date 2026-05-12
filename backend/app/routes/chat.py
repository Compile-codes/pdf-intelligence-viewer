from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.db.client import get_pool
from app.services.retriever import retrieve_chunks
from app.services.claude import stream_answer
from app.models import ChatRequest
import anthropic
import json

router = APIRouter(prefix="/documents/{document_id}")


async def expand_query(query: str) -> str:
    """
    Rewrite the user's query using terms likely found in employment contract documents.

    Users ask "office address" but contracts say "Location".
    Users ask "salary" but contracts say "Remuneration".
    This expansion bridges that vocabulary gap before retrieval.
    """
    client = anthropic.AsyncAnthropic()
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=100,
        messages=[{
            "role": "user",
            "content": f"""Rewrite this question using alternative terms that might appear in an employment contract document.
Return ONLY the rewritten query, nothing else. No explanation.

Original: {query}

Examples:
- "office address" -> "location workplace place of work"
- "salary" -> "remuneration pay rate compensation"
- "boss" -> "manager reporting to supervisor"
- "start date" -> "commencement date employment start"
- "working hours" -> "hours of work casual engagement"
- "fired" -> "termination end of employment notice"

Rewritten query:"""
        }]
    )
    return response.content[0].text.strip()


@router.post("/chat")
async def chat(document_id: str, body: ChatRequest):
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT status FROM documents WHERE id=$1", document_id
    )
    if not row:
        raise HTTPException(404, "Document not found")
    if row["status"] != "ready":
        raise HTTPException(409, "Document is still being indexed")

    user_query = body.messages[-1].content

    # Expand query with contract-specific synonyms for better retrieval
    expanded_query = await expand_query(user_query)
    print(f"Original query:  {user_query}")
    print(f"Expanded query:  {expanded_query}")

    chunks = await retrieve_chunks(document_id, expanded_query)

    # Always pin the page 1 Key Terms table chunk so key facts are always in context.
    # Key terms (location, salary, manager etc.) live on page 1 but may not rank
    # highly for queries that use different vocabulary (e.g. "address" vs "location").
    page1_key_terms = await pool.fetch(
        """SELECT page_number, text, 1.0 AS similarity
           FROM chunks
           WHERE document_id = $1
             AND page_number = 1
             AND text LIKE '[Table on page 1]%'
             AND text LIKE '%Location%'
           LIMIT 1""",
        document_id
    )

    # Merge pinned chunks at the front, avoiding duplicates
    existing_texts = {c["text"] for c in chunks}
    pinned = [c for c in page1_key_terms if c["text"] not in existing_texts]
    chunks = pinned + list(chunks)[:7]  # keep total at 8 max

    # Debug — remove after confirming retrieval works
    print("=== RETRIEVED CHUNKS ===")
    for c in chunks:
        print(f"  Page {c['page_number']} | sim: {float(c['similarity']):.3f} | {c['text'][:80]}")
    print("========================")

    await pool.execute(
        "INSERT INTO messages (document_id, role, content) VALUES ($1,$2,$3)",
        document_id, "user", user_query
    )

    async def event_stream():
        full_response = []
        async for text in stream_answer(chunks, [m.model_dump() for m in body.messages]):
            full_response.append(text)
            yield f"data: {json.dumps({'type': 'chunk', 'text': text})}\n\n"

        pages = list({c["page_number"] for c in chunks})
        yield f"data: {json.dumps({'type': 'citations', 'pages': sorted(pages)})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

        await pool.execute(
            "INSERT INTO messages (document_id, role, content) VALUES ($1,$2,$3)",
            document_id, "assistant", "".join(full_response)
        )

    return StreamingResponse(event_stream(), media_type="text/event-stream")