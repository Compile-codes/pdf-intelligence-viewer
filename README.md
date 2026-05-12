# DocuLens AI

A PDF viewer with built-in AI Q&A. Upload any PDF, ask questions in plain English, and get grounded answers with clickable citations that jump directly to the source page.

Built on top of the original DocuLens viewer — all existing features (zoom, search, annotations, thumbnails, outline) are fully preserved.

---

## Demo

1. Drop a PDF into the viewer — it renders immediately
2. The **Ask AI** tab indexes the document in the background (green dot appears when ready)
3. Type a question — get a streamed answer with page citations
4. Click any **Page N** chip to jump directly to that page in the viewer
5. Ask follow-up questions — conversation context is maintained

---

## Architecture

```
frontend/          React + TypeScript + Vite (existing DocuLens app + AI chat layer)
backend/           Python + FastAPI (new)
  ├── POST /documents              Upload PDF → triggers background indexing
  ├── GET  /documents/:id/status   Poll indexing progress
  └── POST /documents/:id/chat     SSE streaming chat endpoint
database/          PostgreSQL + pgvector
```

### AI Pipeline

```
User question
    → Embed query (OpenAI text-embedding-3-small)
    → Vector similarity search (pgvector, top-5 chunks)
    → Build prompt with retrieved context + conversation history
    → Stream answer (Claude API)
    → Parse [Page N] citations → render as clickable chips
```

### What was added vs what was kept

| File                                                 | Status                                  |
| ---------------------------------------------------- | --------------------------------------- |
| All existing viewer, search, annotations, thumbnails | ✅ Untouched                            |
| `vite.config.ts`                                     | Modified — added `/api` proxy           |
| `src/stores/viewerStore.ts`                          | Modified — added `"chat"` tab type      |
| `src/App.tsx`                                        | Modified — added upload + polling logic |
| `src/components/ViewerShell.tsx`                     | Modified — passes new props through     |
| `src/components/sidebar/Sidebar.tsx`                 | Modified — added Ask AI tab             |
| `src/components/sidebar/ChatPanel.tsx`               | New                                     |
| `src/services/aiService.ts`                          | New                                     |
| `src/types/chat.ts`                                  | New                                     |
| `backend/`                                           | New — entire Python backend             |

---

## Tech Stack Decisions

### Why Python + FastAPI for the backend?

The AI/ML ecosystem is Python-first. PyMuPDF gives better PDF text extraction than any Node equivalent, the Anthropic and OpenAI SDKs are async-native in Python, and pgvector's `asyncpg` integration is cleaner. FastAPI provides automatic OpenAPI docs, Pydantic validation, and native SSE streaming. The frontend stays TypeScript — the two runtimes communicate over HTTP so there's no coupling.

### Why PostgreSQL + pgvector?

pgvector collapses two concerns into one: relational storage for documents and messages, plus vector similarity search for retrieval — all in a single query, no separate vector DB service. The tradeoff is that pgvector is slower than dedicated vector databases (Pinecone, Qdrant) at very large scale, but for document Q&A it's more than sufficient and dramatically simpler to operate.

### Why RAG instead of an agent?

This is a deliberate RAG pipeline, not an agent. RAG gives predictable latency, bounded cost, and simple failure modes. The retrieval strategy is fixed — one embedding + one vector search per question. An agentic approach (giving Claude tools to call `search_document` and `read_page` in a loop) would be better for multi-part questions requiring iterative retrieval, but adds latency and cost that aren't justified for single-document Q&A.

### Why 512-token overlapping chunks?

Pages vary wildly in length — page-level chunking gives unequal context windows. Sentence-level chunking is too granular for semantic search. 512-token windows with 64-token overlap fit comfortably in Claude's context, and the overlap ensures answers that straddle chunk boundaries aren't missed. The page number is stored with each chunk, enabling click-to-navigate citations.

### Why OpenAI for embeddings?

`text-embedding-3-small` scores meaningfully higher on retrieval benchmarks than free local alternatives (e.g. `all-MiniLM-L6-v2`). At $0.02 per million tokens, indexing a 50-page PDF costs ~$0.001 — negligible. Better embeddings → better chunk retrieval → better answers, which is the core value of the feature. If data privacy were a hard requirement, switching to a local model is a one-line change.

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 17+ with pgvector extension
- Anthropic API key — [console.anthropic.com](https://console.anthropic.com)
- OpenAI API key — [platform.openai.com](https://platform.openai.com)

### 1. Install pgvector

```bash
brew install pgvector
```

### 2. Database setup

```bash
# Start PostgreSQL
brew services start postgresql@17

# Create database
psql -U $(whoami) -d postgres -c "CREATE DATABASE doculens;"

# Run schema
psql -U $(whoami) -d doculens -f backend/app/db/schema.sql
```

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

Create `backend/.env`:

```
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/doculens
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Verify at: http://localhost:8000/docs

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

---

## Environment Variables

| Variable            | Required | Description                          |
| ------------------- | -------- | ------------------------------------ |
| `DATABASE_URL`      | ✅       | PostgreSQL connection string         |
| `ANTHROPIC_API_KEY` | ✅       | Claude API key for answer generation |
| `OPENAI_API_KEY`    | ✅       | OpenAI key for text embeddings       |

---

## API Reference

### `POST /documents`

Upload a PDF for indexing.

**Request:** `multipart/form-data` with `file` field (PDF only)

**Response:**

```json
{ "id": "uuid" }
```

Indexing runs in the background — the document ID is returned immediately so the frontend can start polling.

### `GET /documents/{id}/status`

Poll indexing progress.

**Response:**

```json
{
  "id": "uuid",
  "filename": "contract.pdf",
  "status": "pending | indexing | ready | error",
  "page_count": 10,
  "chunk_count": 47
}
```

### `POST /documents/{id}/chat`

Ask a question. Returns a Server-Sent Events stream.

**Request:**

```json
{
  "messages": [{ "role": "user", "content": "What are the termination terms?" }]
}
```

**SSE Events:**

```
data: {"type": "chunk", "text": "Either party may terminate..."}
data: {"type": "citations", "pages": [7, 8, 12]}
data: {"type": "done"}
```

Pass the full conversation history in `messages` for multi-turn context.

---

## Project Structure

```
pdf-intelligence-viewer-main/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── sidebar/
│   │   │   │   ├── ChatPanel.tsx        ← AI chat UI
│   │   │   │   ├── Sidebar.tsx          ← added Ask AI tab
│   │   │   │   └── ...existing panels
│   │   │   ├── ViewerShell.tsx
│   │   │   └── ...existing components
│   │   ├── services/
│   │   │   ├── aiService.ts             ← upload, poll, SSE stream
│   │   │   └── ...existing services
│   │   ├── stores/
│   │   │   └── viewerStore.ts           ← added "chat" tab
│   │   ├── types/
│   │   │   ├── chat.ts                  ← ChatMessage, IndexingStatus
│   │   │   └── ...existing types
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── package.json
│
└── backend/
    ├── app/
    │   ├── main.py                      ← FastAPI app, CORS, routes
    │   ├── models.py                    ← Pydantic schemas
    │   ├── routes/
    │   │   ├── documents.py             ← upload + status endpoints
    │   │   └── chat.py                  ← SSE chat endpoint
    │   ├── services/
    │   │   ├── indexer.py               ← PDF parse → chunk → embed → store
    │   │   ├── retriever.py             ← embed query → vector search
    │   │   └── claude.py                ← build prompt → stream response
    │   └── db/
    │       ├── client.py                ← asyncpg connection pool
    │       └── schema.sql               ← documents, chunks, messages tables
    ├── requirements.txt
    └── .env.example
```

---

## Key Design Decisions & Tradeoffs

| Decision         | Chosen                        | Considered                  | Why                                                                 |
| ---------------- | ----------------------------- | --------------------------- | ------------------------------------------------------------------- |
| Backend language | Python + FastAPI              | Node + Hono                 | AI ecosystem is Python-first; better PDF libs                       |
| Vector storage   | pgvector (Postgres)           | Pinecone, Qdrant            | One service instead of two; sufficient at this scale                |
| Embeddings       | OpenAI text-embedding-3-small | Local sentence-transformers | Higher benchmark scores → better retrieval accuracy                 |
| Chunking         | 512-token overlapping windows | Page-level, sentence-level  | Balance between context size and retrieval precision                |
| Streaming        | SSE                           | WebSockets                  | SSE is unidirectional, stateless — perfect for token streams        |
| Pipeline type    | RAG                           | Agent                       | Predictable latency + cost; iteration not needed for single-doc Q&A |

---

## What I'd Do Differently With More Time

- **Re-ranking** — add a cross-encoder on the top-k chunks before passing to Claude for better precision on nuanced queries
- **Table extraction** — PDF tables get flattened to plain text during extraction, which can confuse retrieval. Using a dedicated table parser (e.g. `pdfplumber`) and storing tables with their headers preserved would improve accuracy on structured documents
- **Job queue** — replace `BackgroundTasks` with BullMQ or Celery for reliable background processing with retries and progress tracking
- **Multi-document chat** — allow querying across multiple uploaded PDFs simultaneously
- **Hybrid search** — combine vector similarity with BM25 keyword search for better results on exact-match queries (names, clause numbers, dates)
- **Streaming citations** — currently citations are sent after the full response; interleaving them inline as Claude mentions page numbers would feel more responsive

---

## Running Tests

```bash
# Backend — test the API is live
curl http://localhost:8000/health

# Test document upload
curl -X POST http://localhost:8000/documents \
  -F "file=@your-document.pdf"

# Check indexing status
curl http://localhost:8000/documents/{id}/status
```

---

## License

MIT
