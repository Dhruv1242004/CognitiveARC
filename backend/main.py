"""
CognitiveARC FastAPI backend with warmed ingestion and retrieval services.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from hashlib import sha256
import os
import time
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from agent.pipeline import run_pipeline
from services.llm import VisionExtractionError, extract_text_from_image, warmup_llm_client
from services.vectordb import (
    add_documents,
    embed_texts,
    find_document_by_hash,
    get_document_count,
    get_registered_document,
    get_system_stats,
    register_document,
    warmup_vector_services,
)
from utils.chunker import StructuredChunk, chunk_document
from utils.document import (
    SUPPORTED_EXTENSIONS,
    build_suggested_prompts,
    extract_structured_document,
    get_file_extension,
    infer_document_category,
    is_image_file,
)


@dataclass
class UploadStage:
    key: str
    label: str
    status: str = "queued"
    detail: str = ""
    timing_ms: float | None = None


@dataclass
class UploadJob:
    document_id: str
    filename: str
    file_hash: str
    chunks: int = 0
    message: str = "Upload received. Waiting for indexing."
    status: str = "processing"
    error: str | None = None
    document_type: str | None = None
    category: str | None = None
    title: str | None = None
    suggested_prompts: list[str] = field(default_factory=list)
    stage_timings: dict[str, float] = field(default_factory=dict)
    stages: list[UploadStage] = field(
        default_factory=lambda: [
            UploadStage(key="parsing", label="Parsing"),
            UploadStage(key="chunking", label="Chunking"),
            UploadStage(key="embedding", label="Embedding"),
            UploadStage(key="indexing", label="Indexing"),
        ]
    )


class QueryRequest(BaseModel):
    query: str
    session_id: str | None = None
    document_id: str | None = None
    inline_text: str | None = None
    strict_retrieval: bool = True


class QueryResponse(BaseModel):
    query: str
    reasoning: list[str]
    context: list[dict]
    tools: list[dict]
    response: str
    session_id: str
    execution_trace: list[dict]
    structured_output: dict
    timings: dict
    strict_mode: bool


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks: int
    message: str
    status: str
    file_hash: str
    stages: list[dict]
    timings: dict
    document_type: str | None = None
    category: str | None = None
    title: str | None = None
    suggested_prompts: list[str] = []


class HealthResponse(BaseModel):
    status: str
    version: str
    documents_indexed: int
    warm: dict


_upload_jobs: dict[str, UploadJob] = {}
_warm_state: dict[str, str | bool] = {
    "vector_ready": False,
    "llm_ready": False,
    "status": "booting",
}


def _serialize_stages(job: UploadJob) -> list[dict]:
    return [
        {
            "key": stage.key,
            "label": stage.label,
            "status": stage.status,
            "detail": stage.detail,
            "timing_ms": stage.timing_ms,
        }
        for stage in job.stages
    ]


def _mark_stage(job: UploadJob, key: str, *, status: str, detail: str) -> float | None:
    stage = next((item for item in job.stages if item.key == key), None)
    if stage is None:
        return None
    stage.detail = detail
    stage.status = status
    if status == "running":
        job.stage_timings[key] = time.perf_counter()
        return None
    started = job.stage_timings.pop(key, None)
    if started is not None:
        stage.timing_ms = round((time.perf_counter() - started) * 1000, 2)
    return stage.timing_ms


async def _warmup_system() -> None:
    try:
        _warm_state["status"] = "warming"
        vector = await asyncio.to_thread(warmup_vector_services)
        llm = await asyncio.to_thread(warmup_llm_client)
        _warm_state.update(
            {
                "vector_ready": bool(vector.get("embedding_warm")),
                "llm_ready": bool(llm.get("llm_client_ready")),
                "embedding_model": vector.get("embedding_model"),
                "llm_model": llm.get("llm_model"),
                "status": "ready",
            }
        )
    except Exception as exc:
        _warm_state["status"] = f"degraded: {exc}"


@asynccontextmanager
async def lifespan(_: FastAPI):
    asyncio.create_task(_warmup_system())
    yield


app = FastAPI(
    title="CognitiveARC API",
    description="Autonomous AI Agent Platform — warmed RAG + tool orchestration",
    version="2.0.0",
    lifespan=lifespan,
)


allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
vercel_url = os.getenv("FRONTEND_URL")
if vercel_url:
    allowed_origins.append(vercel_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _process_upload(
    *,
    doc_id: str,
    filename: str,
    file_hash: str,
    content: bytes,
    content_type: str | None,
) -> None:
    job = _upload_jobs[doc_id]

    try:
        cached = find_document_by_hash(file_hash)
        if cached and cached.get("doc_id"):
            job.status = "completed"
            job.message = f"Skipped re-indexing. Reused cached document for {filename}."
            job.chunks = int(cached.get("chunks", 0))
            job.document_type = cached.get("document_type")
            job.category = cached.get("category")
            job.title = cached.get("title")
            job.suggested_prompts = list(cached.get("suggested_prompts", []))
            for stage in job.stages:
                stage.status = "completed"
                stage.detail = "Reused cached artifact"
                stage.timing_ms = 0.0
            return

        _mark_stage(job, "parsing", status="running", detail="Loading parser and extracting structured content")
        if is_image_file(filename):
            ext = get_file_extension(filename)
            mime_type = content_type or f"image/{'jpeg' if ext == 'jpg' else ext}"
            extracted_text = await extract_text_from_image(content, mime_type)
            from utils.document import ParsedDocument, DocumentSegment

            parsed = ParsedDocument(
                filename=filename,
                file_type=ext,
                title=filename.rsplit(".", 1)[0],
                segments=[DocumentSegment(text=extracted_text, kind="ocr", section_title="Image OCR")],
            )
        else:
            parsed = await asyncio.to_thread(extract_structured_document, content, filename)

        if not parsed.segments:
            raise RuntimeError("No structured content could be extracted from the file")

        job.document_type = parsed.file_type
        job.category = infer_document_category(parsed)
        job.title = parsed.title
        job.suggested_prompts = build_suggested_prompts(parsed)

        _mark_stage(
            job,
            "parsing",
            status="completed",
            detail=f"Extracted {len(parsed.segments)} structured blocks from {parsed.file_type.upper()}",
        )

        _mark_stage(job, "chunking", status="running", detail="Building section-aware semantic chunks")
        chunks = await asyncio.to_thread(
            chunk_document,
            parsed,
            document_id=doc_id,
            target_tokens=520,
            overlap_tokens=80,
        )
        if not chunks:
            raise RuntimeError("Document produced no retrieval chunks")
        _mark_stage(
            job,
            "chunking",
            status="completed",
            detail=f"Generated {len(chunks)} retrieval chunks with metadata",
        )

        _mark_stage(job, "embedding", status="running", detail="Embedding chunk batches with warmed local service")
        embeddings = await asyncio.to_thread(embed_texts, [chunk.text for chunk in chunks])
        _mark_stage(
            job,
            "embedding",
            status="completed",
            detail=f"Embedded {len(embeddings)} chunks",
        )

        _mark_stage(job, "indexing", status="running", detail="Writing vectors and metadata to Chroma")
        indexed = await asyncio.to_thread(add_documents, doc_id=doc_id, chunks=chunks, embeddings=embeddings)
        _mark_stage(
            job,
            "indexing",
            status="completed",
            detail=f"Indexed {indexed} chunks with section and page metadata",
        )

        job.chunks = indexed
        job.status = "completed"
        job.message = f"Indexed {indexed} chunks from {filename}"
        register_document(
            doc_id,
            {
                "doc_id": doc_id,
                "filename": filename,
                "file_hash": file_hash,
                "chunks": indexed,
                "document_type": parsed.file_type,
                "category": job.category,
                "title": parsed.title,
                "suggested_prompts": job.suggested_prompts,
            },
        )
    except VisionExtractionError as exc:
        job.status = "failed"
        job.error = str(exc)
        job.message = str(exc)
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
        job.message = f"Processing failed: {exc}"
        for stage in job.stages:
            if stage.status == "running":
                stage.status = "failed"
                stage.detail = str(exc)
                started = job.stage_timings.pop(stage.key, None)
                if started is not None:
                    stage.timing_ms = round((time.perf_counter() - started) * 1000, 2)


@app.get("/api/health", response_model=HealthResponse)
async def health_check(warm: bool = Query(default=False)):
    if warm and _warm_state.get("status") != "ready":
        await _warmup_system()
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        documents_indexed=get_document_count(),
        warm={**_warm_state, **get_system_stats()},
    )


@app.post("/api/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        result = await run_pipeline(
            query=request.query,
            session_id=request.session_id,
            document_id=request.document_id,
            inline_text=request.inline_text,
            strict_retrieval=request.strict_retrieval,
        )
        return QueryResponse(**result)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")


@app.post("/api/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = get_file_extension(file.filename)
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 15MB)")

    file_hash = sha256(content).hexdigest()
    cached = find_document_by_hash(file_hash)
    if cached:
        cached_doc_id = str(cached["doc_id"])
        return UploadResponse(
            document_id=cached_doc_id,
            filename=str(cached.get("filename", file.filename)),
            chunks=int(cached.get("chunks", 0)),
            message=f"Document already indexed. Reusing {cached_doc_id}.",
            status="completed",
            file_hash=file_hash,
            document_type=cached.get("document_type"),
            category=cached.get("category"),
            title=cached.get("title"),
            suggested_prompts=list(cached.get("suggested_prompts", [])),
            stages=[
                {
                    "key": "parsing",
                    "label": "Parsing",
                    "status": "completed",
                    "detail": "Reused cached parse result",
                    "timing_ms": 0.0,
                },
                {
                    "key": "chunking",
                    "label": "Chunking",
                    "status": "completed",
                    "detail": "Reused cached chunks",
                    "timing_ms": 0.0,
                },
                {
                    "key": "embedding",
                    "label": "Embedding",
                    "status": "completed",
                    "detail": "Reused cached embeddings",
                    "timing_ms": 0.0,
                },
                {
                    "key": "indexing",
                    "label": "Indexing",
                    "status": "completed",
                    "detail": "Reused indexed vectors",
                    "timing_ms": 0.0,
                },
            ],
            timings={},
        )

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    _upload_jobs[doc_id] = UploadJob(document_id=doc_id, filename=file.filename, file_hash=file_hash)

    asyncio.create_task(
        _process_upload(
            doc_id=doc_id,
            filename=file.filename,
            file_hash=file_hash,
            content=content,
            content_type=file.content_type,
        )
    )

    job = _upload_jobs[doc_id]
    return UploadResponse(
        document_id=doc_id,
        filename=file.filename,
        chunks=0,
        message=f"Upload received. Processing {file.filename}...",
        status="processing",
        file_hash=file_hash,
        document_type=None,
        category=None,
        title=None,
        suggested_prompts=[],
        stages=_serialize_stages(job),
        timings={},
    )


@app.get("/api/upload/{document_id}", response_model=UploadResponse)
async def get_upload_status(document_id: str):
    job = _upload_jobs.get(document_id)
    if not job:
        registered = get_registered_document(document_id)
        if registered:
            return UploadResponse(
                document_id=document_id,
                filename=str(registered.get("filename", document_id)),
                chunks=int(registered.get("chunks", 0)),
                message="Document already indexed.",
                status="completed",
                file_hash=str(registered.get("file_hash", "")),
                document_type=registered.get("document_type"),
                category=registered.get("category"),
                title=registered.get("title"),
                suggested_prompts=list(registered.get("suggested_prompts", [])),
                stages=[],
                timings={},
            )
        raise HTTPException(status_code=404, detail="Upload job not found")

    if job.status == "failed" and job.error:
        raise HTTPException(status_code=500, detail=job.error)

    return UploadResponse(
        document_id=job.document_id,
        filename=job.filename,
        chunks=job.chunks,
        message=job.message,
        status=job.status,
        file_hash=job.file_hash,
        document_type=job.document_type,
        category=job.category,
        title=job.title,
        suggested_prompts=job.suggested_prompts,
        stages=_serialize_stages(job),
        timings={stage.key: stage.timing_ms for stage in job.stages if stage.timing_ms is not None},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
