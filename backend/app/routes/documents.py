from fastapi import APIRouter, UploadFile, BackgroundTasks, HTTPException
from app.db.client import get_pool
from app.services.indexer import index_document
from app.models import DocumentStatus

router = APIRouter(prefix="/documents")

@router.post("", status_code=201)
async def upload_document(file: UploadFile, background_tasks: BackgroundTasks):
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF files are accepted")
    pdf_bytes = await file.read()
    pool = await get_pool()
    row = await pool.fetchrow(
        "INSERT INTO documents (filename) VALUES ($1) RETURNING id",
        file.filename
    )
    document_id = str(row["id"])
    background_tasks.add_task(index_document, document_id, pdf_bytes)
    return {"id": document_id}

@router.get("/{document_id}/status", response_model=DocumentStatus)
async def get_status(document_id: str):
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT * FROM documents WHERE id=$1", document_id
    )
    if not row:
        raise HTTPException(404, "Document not found")
    return dict(row)
