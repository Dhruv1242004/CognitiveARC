"""
Hybrid retrieval engine with metadata-aware reranking.
"""

from __future__ import annotations

import time

from services.vectordb import hybrid_search, has_documents as check_has_docs


async def retrieve_context(
    *,
    query: str,
    doc_id: str | None = None,
    section_title: str | None = None,
    n_results: int = 6,
) -> dict:
    if not check_has_docs(doc_id):
        return {"results": [], "timing_ms": 0, "strategy": "hybrid", "filters": {}}

    where_filter: dict | None = {"doc_id": doc_id} if doc_id else None
    if section_title:
        where_filter = {**(where_filter or {}), "section_title": section_title}

    started = time.perf_counter()
    results = hybrid_search(
        query_text=query,
        top_k=n_results,
        vector_k=max(n_results + 4, 10),
        where=where_filter,
    )
    timing_ms = round((time.perf_counter() - started) * 1000, 2)

    filtered = [
        item
        for item in results
        if item.get("combined_score", 0.0) >= 0.18 or item.get("keyword_score", 0.0) >= 0.35
    ]

    return {
        "results": filtered,
        "timing_ms": timing_ms,
        "strategy": "hybrid",
        "filters": where_filter or {},
    }
