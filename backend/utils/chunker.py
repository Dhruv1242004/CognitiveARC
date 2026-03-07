"""
Text Chunker — Splits text into overlapping chunks for embedding.
"""


def chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> list[str]:
    """
    Split text into chunks of approximately `chunk_size` words
    with `chunk_overlap` word overlap between consecutive chunks.
    """
    words = text.split()
    if len(words) <= chunk_size:
        return [text.strip()] if text.strip() else []

    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk.strip())
        start += chunk_size - chunk_overlap

    return chunks


def chunk_text_by_paragraphs(
    text: str,
    max_chunk_size: int = 1000,
) -> list[str]:
    """
    Split text by paragraphs, merging small paragraphs together
    until they approach max_chunk_size words.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return chunk_text(text, chunk_size=max_chunk_size)

    chunks = []
    current_chunk = []
    current_size = 0

    for para in paragraphs:
        para_size = len(para.split())
        if current_size + para_size > max_chunk_size and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [para]
            current_size = para_size
        else:
            current_chunk.append(para)
            current_size += para_size

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks
