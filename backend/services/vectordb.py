"""
Vector Database Service — ChromaDB interface.
Uses ChromaDB's built-in embedding function (sentence-transformers)
so no external embedding API is required.
"""

import chromadb

_client = None
_collections: dict[str, chromadb.Collection] = {}


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        # Use EphemeralClient (in-memory, no persistence) to avoid
        # Pydantic v1 Settings compatibility issues on Render
        _client = chromadb.EphemeralClient()
    return _client


def get_or_create_collection(name: str = "documents") -> chromadb.Collection:
    """Get or create a ChromaDB collection with built-in embeddings."""
    if name not in _collections:
        client = _get_client()
        # ChromaDB uses its default embedding function (all-MiniLM-L6-v2)
        # automatically — no external API needed
        _collections[name] = client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )
    return _collections[name]


def add_documents(
    doc_id: str,
    chunks: list[str],
    metadata_list: list[dict] | None = None,
    collection_name: str = "documents",
) -> int:
    """Add document chunks to the vector store. Embeddings are generated automatically."""
    collection = get_or_create_collection(collection_name)

    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = metadata_list or [
        {"doc_id": doc_id, "chunk_index": i, "source": doc_id}
        for i in range(len(chunks))
    ]

    # ChromaDB auto-generates embeddings using its default embedding function
    collection.add(
        ids=ids,
        documents=chunks,
        metadatas=metadatas,
    )
    return len(chunks)


def query_documents(
    query_text: str,
    n_results: int = 5,
    collection_name: str = "documents",
    where: dict | None = None,
) -> list[dict]:
    """Query the vector store for similar documents using text (auto-embedded)."""
    collection = get_or_create_collection(collection_name)

    if collection.count() == 0:
        return []

    kwargs = {
        "query_texts": [query_text],
        "n_results": min(n_results, collection.count()),
        "include": ["documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where

    results = collection.query(**kwargs)

    docs = []
    for i in range(len(results["ids"][0])):
        distance = results["distances"][0][i]
        relevance = round(max(0, 1 - distance), 3)
        docs.append({
            "text": results["documents"][0][i],
            "source": results["metadatas"][0][i].get("source", "unknown"),
            "relevance": relevance,
            "chunk_index": results["metadatas"][0][i].get("chunk_index", 0),
            "doc_id": results["metadatas"][0][i].get("doc_id", "unknown"),
        })

    return sorted(docs, key=lambda x: x["relevance"], reverse=True)


def get_document_count(collection_name: str = "documents") -> int:
    """Get the total number of chunks in a collection."""
    collection = get_or_create_collection(collection_name)
    return collection.count()


def has_documents(doc_id: str | None = None, collection_name: str = "documents") -> bool:
    """Check if any documents exist, optionally for a specific doc_id."""
    collection = get_or_create_collection(collection_name)
    if collection.count() == 0:
        return False
    if doc_id:
        results = collection.get(where={"doc_id": doc_id}, limit=1)
        return len(results["ids"]) > 0
    return True
