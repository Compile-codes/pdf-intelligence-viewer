from pydantic import BaseModel
from uuid import UUID
from typing import Literal

class DocumentStatus(BaseModel):
    id: UUID
    filename: str
    status: Literal["pending", "indexing", "ready", "error"]
    page_count: int | None = None
    chunk_count: int | None = None

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]