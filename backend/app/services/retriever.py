from openai import AsyncOpenAI
from sentence_transformers import CrossEncoder
from app.db.client import get_pool

openai = AsyncOpenAI()

# Cross-encoder for re-ranking top-k chunks
# Loaded once at startup — ~80MB, runs locally, no API cost
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


async def retrieve_chunks(document_id: str, query: str, top_k: int = 8):
    """
    Hybrid retrieval pipeline:
      1. Semantic search  — embed query → vector cosine similarity (top 20)
      2. Keyword search   — PostgreSQL full-text search BM25 (top 20)
      3. RRF fusion       — Reciprocal Rank Fusion merges both ranked lists
      4. Re-ranking       — cross-encoder scores the fused top-k for the query

    Why hybrid?
      Vector search finds semantically similar text ("exit clause" ≈ "termination").
      Keyword search finds exact matches (clause numbers, names, dates).
      RRF combines both signals without needing to tune weights.

    Why re-rank?
      The bi-encoder embeddings used for vector search are fast but approximate.
      The cross-encoder reads (query, chunk) pairs together — much more accurate
      at judging relevance, but too slow to run on the whole corpus.
      Running it only on the fused top-20 is the right tradeoff.
    """

    # ── Step 1: Embed the query ─────────────────────────────────────────────
    response = await openai.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    query_embedding = response.data[0].embedding

    pool = await get_pool()

    # ── Step 2 & 3: Hybrid search with RRF fusion ───────────────────────────
    rows = await pool.fetch(
        """
        WITH semantic AS (
            -- Vector similarity search: finds conceptually related chunks
            SELECT id, page_number, text,
                   ROW_NUMBER() OVER (
                       ORDER BY embedding <=> $1::vector
                   ) AS rank
            FROM chunks
            WHERE document_id = $2
            LIMIT 20
        ),
        keyword AS (
            -- Full-text search: finds exact word matches (names, clause numbers)
            SELECT id, page_number, text,
                   ROW_NUMBER() OVER (
                       ORDER BY ts_rank(text_search, plainto_tsquery('english', $3)) DESC
                   ) AS rank
            FROM chunks
            WHERE document_id = $2
              AND text_search @@ plainto_tsquery('english', $3)
            LIMIT 20
        ),
        fused AS (
            -- Reciprocal Rank Fusion: 1/(k+rank) where k=60 dampens high-rank outliers
            SELECT
                COALESCE(s.id, k.id)                  AS id,
                COALESCE(s.page_number, k.page_number) AS page_number,
                COALESCE(s.text, k.text)               AS text,
                (COALESCE(1.0 / (60 + s.rank), 0.0) +
                 COALESCE(1.0 / (60 + k.rank), 0.0))  AS rrf_score
            FROM semantic s
            FULL OUTER JOIN keyword k ON s.id = k.id
        )
        SELECT id, page_number, text, rrf_score AS similarity
        FROM fused
        ORDER BY rrf_score DESC
        LIMIT $4
        """,
        query_embedding,
        document_id,
        query,
        top_k * 4  # fetch 4x top_k for re-ranker to work with
    )

    if not rows:
        return []

    # ── Step 4: Re-rank with cross-encoder ──────────────────────────────────
    # Cross-encoder reads (query, chunk) together — much more accurate than
    # the bi-encoder embeddings used for vector search, but too slow for full corpus.
    # Only run on the fused candidates (top_k * 4 chunks).
    pairs = [(query, row["text"]) for row in rows]
    scores = reranker.predict(pairs)

    reranked = sorted(
        zip(rows, scores),
        key=lambda x: x[1],
        reverse=True
    )

    # Return only top_k after re-ranking
    return [row for row, _ in reranked[:top_k]]