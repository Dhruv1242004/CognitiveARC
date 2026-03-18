"""
Vector database service with warmed embedding lifecycle and hybrid retrieval helpers.
"""

from __future__ import annotations

import logging
import math
import os
import re
import threading
from typing import Any

os.environ.setdefault("ANONYMIZED_TELEMETRY", "FALSE")
logging.getLogger("chromadb.telemetry.product.posthog").disabled = True

import chromadb
from chromadb.config import Settings
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

from utils.chunker import StructuredChunk


_client: chromadb.ClientAPI | None = None
_collections: dict[str, chromadb.Collection] = {}
_embedding_lock = threading.Lock()
_client_lock = threading.Lock()
_collection_lock = threading.Lock()
_document_registry: dict[str, dict[str, Any]] = {}
_hash_registry: dict[str, str] = {}


def _sanitize_metadata_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return float(value)
    return str(value)


def _sanitize_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    sanitized: dict[str, Any] = {}
    for key, value in metadata.items():
        normalized = _sanitize_metadata_value(value)
        if normalized is None:
            continue
        sanitized[str(key)] = normalized
    return sanitized


class EmbeddingService:
    def __init__(self) -> None:
        self._function = DefaultEmbeddingFunction()
        self._is_warm = False
        self.model_name = "chroma-default-minilm"

    def warmup(self) -> None:
        if self._is_warm:
            return
        with _embedding_lock:
            if self._is_warm:
                return
            self._function(["cognitivearc warmup"])
            self._is_warm = True

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        self.warmup()
        embeddings = self._function(texts)
        return [[float(value) for value in embedding] for embedding in embeddings]

    def embed_query(self, query: str) -> list[float]:
        embedded = self.embed_texts([query])
        return embedded[0] if embedded else []

    @property
    def is_warm(self) -> bool:
        return self._is_warm


_embedding_service = EmbeddingService()


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                settings = Settings(anonymized_telemetry=False)
                persist_dir = os.getenv("CHROMA_PERSIST_DIR")
                if persist_dir:
                    _client = chromadb.PersistentClient(path=persist_dir, settings=settings)
                else:
                    _client = chromadb.EphemeralClient(settings=settings)
    return _client


def get_or_create_collection(name: str = "documents") -> chromadb.Collection:
    if name not in _collections:
        with _collection_lock:
            if name not in _collections:
                client = _get_client()
                _collections[name] = client.get_or_create_collection(
                    name=name,
                    metadata={"hnsw:space": "cosine"},
                )
    return _collections[name]


def warmup_vector_services() -> dict[str, Any]:
    _embedding_service.warmup()
    collection = get_or_create_collection()
    return {
        "embedding_model": _embedding_service.model_name,
        "embedding_warm": _embedding_service.is_warm,
        "documents_indexed": collection.count(),
    }


def embed_texts(texts: list[str]) -> list[list[float]]:
    return _embedding_service.embed_texts(texts)


def register_document(doc_id: str, payload: dict[str, Any]) -> None:
    _document_registry[doc_id] = payload
    file_hash = payload.get("file_hash")
    if isinstance(file_hash, str) and file_hash:
        _hash_registry[file_hash] = doc_id


def get_registered_document(doc_id: str) -> dict[str, Any] | None:
    return _document_registry.get(doc_id)


def find_document_by_hash(file_hash: str) -> dict[str, Any] | None:
    doc_id = _hash_registry.get(file_hash)
    if not doc_id:
        return None
    return _document_registry.get(doc_id)


def add_documents(
    *,
    doc_id: str,
    chunks: list[StructuredChunk],
    embeddings: list[list[float]] | None = None,
    collection_name: str = "documents",
    batch_size: int = 32,
) -> int:
    collection = get_or_create_collection(collection_name)
    if not chunks:
        return 0

    ids = [chunk.chunk_id for chunk in chunks]
    documents = [chunk.text for chunk in chunks]
    metadatas = [_sanitize_metadata(chunk.metadata) for chunk in chunks]
    embedded = embeddings or embed_texts(documents)

    for start in range(0, len(chunks), batch_size):
        end = start + batch_size
        collection.upsert(
            ids=ids[start:end],
            documents=documents[start:end],
            metadatas=metadatas[start:end],
            embeddings=embedded[start:end],
        )
    return len(chunks)


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]{2,}", text.lower())


def _keyword_score(query: str, text: str) -> float:
    query_terms = _tokenize(query)
    doc_terms = _tokenize(text)
    if not query_terms or not doc_terms:
        return 0.0

    doc_length = len(doc_terms)
    unique_terms = set(doc_terms)
    score = 0.0
    for term in query_terms:
        tf = doc_terms.count(term)
        if tf == 0:
            continue
        score += (tf / max(1, doc_length)) * (1 + math.log1p(len(unique_terms)))

    query_phrase = " ".join(query_terms)
    if query_phrase and query_phrase in " ".join(doc_terms):
        score += 1.25

    overlap = len(set(query_terms) & unique_terms) / max(1, len(set(query_terms)))
    score += overlap
    return round(score, 4)


def query_documents(
    *,
    query_text: str,
    n_results: int = 8,
    collection_name: str = "documents",
    where: dict | None = None,
) -> list[dict]:
    collection = get_or_create_collection(collection_name)
    if collection.count() == 0:
        return []

    query_embedding = _embedding_service.embed_query(query_text)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(max(1, n_results), collection.count()),
        include=["documents", "metadatas", "distances"],
        where=where,
    )

    rows: list[dict] = []
    ids = results.get("ids", [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for row_id, document, metadata, distance in zip(ids, documents, metadatas, distances):
        metadata = metadata or {}
        relevance = round(max(0.0, 1 - float(distance)), 4)
        rows.append(
            {
                "id": row_id,
                "text": document,
                "source": metadata.get("source", "unknown"),
                "relevance": relevance,
                "distance": round(float(distance), 4),
                "chunk_index": metadata.get("chunk_index", 0),
                "doc_id": metadata.get("doc_id", "unknown"),
                "section_title": metadata.get("section_title"),
                "page_number": metadata.get("page_number"),
                "slide_number": metadata.get("slide_number"),
                "sheet_name": metadata.get("sheet_name"),
                "document_type": metadata.get("document_type"),
                "metadata": metadata,
            }
        )

    return rows


def keyword_search(
    *,
    query_text: str,
    n_results: int = 8,
    collection_name: str = "documents",
    where: dict | None = None,
) -> list[dict]:
    collection = get_or_create_collection(collection_name)
    if collection.count() == 0:
        return []

    results = collection.get(where=where, include=["documents", "metadatas"])
    docs = results.get("documents", [])
    ids = results.get("ids", [])
    metadatas = results.get("metadatas", [])
    ranked: list[dict] = []

    for row_id, document, metadata in zip(ids, docs, metadatas):
        metadata = metadata or {}
        score = _keyword_score(query_text, document)
        if score <= 0:
            continue
        ranked.append(
            {
                "id": row_id,
                "text": document,
                "source": metadata.get("source", "unknown"),
                "keyword_score": score,
                "chunk_index": metadata.get("chunk_index", 0),
                "doc_id": metadata.get("doc_id", "unknown"),
                "section_title": metadata.get("section_title"),
                "page_number": metadata.get("page_number"),
                "slide_number": metadata.get("slide_number"),
                "sheet_name": metadata.get("sheet_name"),
                "document_type": metadata.get("document_type"),
                "metadata": metadata,
            }
        )

    ranked.sort(key=lambda item: item["keyword_score"], reverse=True)
    return ranked[:n_results]


def hybrid_search(
    *,
    query_text: str,
    top_k: int = 6,
    vector_k: int = 10,
    collection_name: str = "documents",
    where: dict | None = None,
) -> list[dict]:
    semantic = query_documents(
        query_text=query_text,
        n_results=vector_k,
        collection_name=collection_name,
        where=where,
    )
    lexical = keyword_search(
        query_text=query_text,
        n_results=vector_k,
        collection_name=collection_name,
        where=where,
    )

    merged: dict[str, dict] = {}
    for item in semantic:
        merged[item["id"]] = {
            **item,
            "semantic_score": item["relevance"],
            "keyword_score": 0.0,
        }

    for item in lexical:
        current = merged.get(item["id"], {})
        merged[item["id"]] = {
            **current,
            **item,
            "semantic_score": current.get("semantic_score", 0.0),
            "keyword_score": item.get("keyword_score", 0.0),
        }

    combined = []
    for item in merged.values():
        semantic_score = float(item.get("semantic_score", 0.0))
        keyword_score = float(item.get("keyword_score", 0.0))
        combined_score = round((semantic_score * 0.68) + min(keyword_score, 2.5) * 0.32, 4)
        item["combined_score"] = combined_score
        combined.append(item)

    combined.sort(
        key=lambda item: (
            item.get("combined_score", 0.0),
            item.get("semantic_score", 0.0),
            item.get("keyword_score", 0.0),
        ),
        reverse=True,
    )
    return combined[:top_k]


def get_document_count(collection_name: str = "documents") -> int:
    return get_or_create_collection(collection_name).count()


def has_documents(doc_id: str | None = None, collection_name: str = "documents") -> bool:
    collection = get_or_create_collection(collection_name)
    if collection.count() == 0:
        return False
    if doc_id:
        results = collection.get(where={"doc_id": doc_id}, limit=1)
        return len(results.get("ids", [])) > 0
    return True


def get_system_stats() -> dict[str, Any]:
    return {
        "documents_indexed": get_document_count(),
        "embedding_model": _embedding_service.model_name,
        "embedding_warm": _embedding_service.is_warm,
        "registered_documents": len(_document_registry),
    }
