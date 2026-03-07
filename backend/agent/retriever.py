"""
Retrieval Engine — Semantic search over the vector database.
Uses ChromaDB's built-in embeddings for similarity search.
"""

from services.vectordb import query_documents, has_documents as check_has_docs


async def retrieve_context(
    query: str,
    doc_id: str | None = None,
    n_results: int = 5,
) -> list[dict]:
    """
    Retrieve the most relevant chunks from the vector store
    for the given query text.
    """
    if not check_has_docs(doc_id):
        return []

    where_filter = {"doc_id": doc_id} if doc_id else None

    results = query_documents(
        query_text=query,
        n_results=n_results,
        where=where_filter,
    )

    return results
