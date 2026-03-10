"""
CognitiveARC — FastAPI Backend Server
Autonomous AI Agent Platform with RAG, tool orchestration, and modular pipeline.
"""

import asyncio
import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from agent.pipeline import run_pipeline
from services.llm import VisionExtractionError, extract_text_from_image
from services.vectordb import add_documents, get_document_count
from utils.document import (
    SUPPORTED_EXTENSIONS,
    extract_text_from_file,
    get_file_extension,
    is_image_file,
)
from utils.chunker import chunk_text_by_paragraphs


app = FastAPI(
    title="CognitiveARC API",
    description="Autonomous AI Agent Platform — RAG + Tool Orchestration",
    version="1.0.0",
)

import os

_allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
# Allow the Vercel production URL if set
_vercel_url = os.getenv("FRONTEND_URL")
if _vercel_url:
    _allowed_origins.append(_vercel_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # All Vercel preview deploys
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ──


class QueryRequest(BaseModel):
    query: str
    session_id: str | None = None
    document_id: str | None = None
    inline_text: str | None = None


class QueryResponse(BaseModel):
    reasoning: list[str]
    context: list[dict]
    tools: list[dict]
    response: str
    session_id: str


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks: int
    message: str
    status: str


class UploadJob:
    def __init__(self, document_id: str, filename: str):
        self.document_id = document_id
        self.filename = filename
        self.chunks = 0
        self.message = "Upload received. Processing document..."
        self.status = "processing"
        self.error: str | None = None


class HealthResponse(BaseModel):
    status: str
    documents_indexed: int
    version: str


_upload_jobs: dict[str, UploadJob] = {}


async def _process_upload(
    *,
    doc_id: str,
    filename: str,
    content: bytes,
    content_type: str | None,
) -> None:
    job = _upload_jobs[doc_id]
    ext = get_file_extension(filename)

    try:
        if is_image_file(filename):
            mime_type = content_type or f"image/{'jpeg' if ext == 'jpg' else ext}"
            text = await extract_text_from_image(content, mime_type)
        else:
            text = await asyncio.to_thread(extract_text_from_file, content, filename)

        if not text.strip():
            raise RuntimeError("No text could be extracted from the file")

        word_count = len(text.split())
        target_chunk_size = 700 if word_count > 2500 else 500
        chunks = await asyncio.to_thread(
            chunk_text_by_paragraphs,
            text,
            target_chunk_size,
        )
        if not chunks:
            raise RuntimeError("Document produced no chunks")

        metadata_list = [
            {"doc_id": doc_id, "chunk_index": i, "source": filename}
            for i in range(len(chunks))
        ]
        num_stored = await asyncio.to_thread(
            add_documents,
            doc_id=doc_id,
            chunks=chunks,
            metadata_list=metadata_list,
        )
        job.chunks = num_stored
        job.status = "completed"
        job.message = f"Successfully indexed {num_stored} chunks from {filename}"
    except VisionExtractionError as exc:
        job.status = "failed"
        job.error = str(exc)
        job.message = str(exc)
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
        job.message = f"Processing failed: {exc}"


# ── Endpoints ──


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Check API health and indexed document count."""
    return HealthResponse(
        status="healthy",
        documents_indexed=get_document_count(),
        version="1.0.0",
    )


@app.post("/api/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """Process a user query through the full agent pipeline."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        result = await run_pipeline(
            query=request.query,
            session_id=request.session_id,
            document_id=request.document_id,
            inline_text=request.inline_text,
        )
        return QueryResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


@app.post("/api/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Accept a document upload and process indexing asynchronously."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = get_file_extension(file.filename)
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '.{ext}'. "
                f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            ),
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    _upload_jobs[doc_id] = UploadJob(document_id=doc_id, filename=file.filename)
    asyncio.create_task(
        _process_upload(
            doc_id=doc_id,
            filename=file.filename,
            content=content,
            content_type=file.content_type,
        )
    )

    return UploadResponse(
        document_id=doc_id,
        filename=file.filename,
        chunks=0,
        message=f"Upload received. Processing {file.filename}...",
        status="processing",
    )


@app.get("/api/upload/{document_id}", response_model=UploadResponse)
async def get_upload_status(document_id: str):
    """Fetch the current processing status for an uploaded document."""
    job = _upload_jobs.get(document_id)
    if not job:
        raise HTTPException(status_code=404, detail="Upload job not found")
    if job.status == "failed" and job.error:
        raise HTTPException(status_code=500, detail=job.error)

    return UploadResponse(
        document_id=job.document_id,
        filename=job.filename,
        chunks=job.chunks,
        message=job.message,
        status=job.status,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
