"""
Structure-aware chunking for retrieval-backed ingestion.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
import re

from utils.document import ParsedDocument, DocumentSegment, normalize_text


@dataclass
class StructuredChunk:
    chunk_id: str
    text: str
    metadata: dict
    token_estimate: int


def estimate_tokens(text: str) -> int:
    return max(1, math.ceil(len(text.split()) * 1.3))


def _split_long_text(text: str, target_tokens: int, overlap_tokens: int) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", normalize_text(text))
    if len(sentences) <= 1:
        words = text.split()
        if not words:
            return []
        target_words = max(60, math.floor(target_tokens / 1.3))
        overlap_words = min(target_words - 20, max(20, math.floor(overlap_tokens / 1.3)))
        pieces: list[str] = []
        start = 0
        while start < len(words):
            end = min(len(words), start + target_words)
            pieces.append(" ".join(words[start:end]).strip())
            if end >= len(words):
                break
            start = max(start + 1, end - overlap_words)
        return pieces

    chunks: list[str] = []
    current: list[str] = []
    current_tokens = 0

    for sentence in sentences:
        sentence = normalize_text(sentence)
        if not sentence:
            continue
        sentence_tokens = estimate_tokens(sentence)
        if current and current_tokens + sentence_tokens > target_tokens:
            chunks.append(" ".join(current).strip())
            overlap: list[str] = []
            overlap_count = 0
            for prior_sentence in reversed(current):
                prior_tokens = estimate_tokens(prior_sentence)
                if overlap and overlap_count + prior_tokens > overlap_tokens:
                    break
                overlap.insert(0, prior_sentence)
                overlap_count += prior_tokens
            current = overlap + [sentence]
            current_tokens = overlap_count + sentence_tokens
        else:
            current.append(sentence)
            current_tokens += sentence_tokens

    if current:
        chunks.append(" ".join(current).strip())

    return chunks


def _segment_descriptor(segment: DocumentSegment) -> str:
    refs: list[str] = []
    if segment.page_number is not None:
        refs.append(f"page {segment.page_number}")
    if segment.slide_number is not None:
        refs.append(f"slide {segment.slide_number}")
    if segment.sheet_name:
        refs.append(f"sheet {segment.sheet_name}")
    return ", ".join(refs)


def chunk_document(
    parsed: ParsedDocument,
    *,
    document_id: str,
    target_tokens: int = 520,
    overlap_tokens: int = 80,
) -> list[StructuredChunk]:
    if not parsed.segments:
        return []

    chunks: list[StructuredChunk] = []
    buffer: list[str] = []
    buffer_tokens = 0
    section_title = parsed.title
    section_refs: dict[str, int | str | None] = {
        "page_number": None,
        "slide_number": None,
        "sheet_name": None,
    }
    chunk_index = 0

    def flush_buffer() -> None:
        nonlocal buffer, buffer_tokens, chunk_index
        text = normalize_text("\n".join(buffer))
        if not text:
            buffer = []
            buffer_tokens = 0
            return
        descriptor = ", ".join(
            part
            for part in [
                f"Section: {section_title}" if section_title else "",
                f"Source: {parsed.filename}",
                f"Page: {section_refs['page_number']}" if section_refs["page_number"] else "",
                f"Slide: {section_refs['slide_number']}" if section_refs["slide_number"] else "",
                f"Sheet: {section_refs['sheet_name']}" if section_refs["sheet_name"] else "",
            ]
            if part
        )
        chunk_text = f"{descriptor}\n{text}" if descriptor else text
        chunks.append(
            StructuredChunk(
                chunk_id=f"{document_id}_chunk_{chunk_index:04d}",
                text=chunk_text,
                token_estimate=estimate_tokens(chunk_text),
                metadata={
                    "doc_id": document_id,
                    "source": parsed.filename,
                    "section_title": section_title or parsed.title,
                    "page_number": section_refs["page_number"],
                    "slide_number": section_refs["slide_number"],
                    "sheet_name": section_refs["sheet_name"],
                    "chunk_index": chunk_index,
                    "document_type": parsed.file_type,
                },
            )
        )
        chunk_index += 1
        buffer = []
        buffer_tokens = 0

    for segment in parsed.segments:
        if segment.kind in {"heading", "slide_title"}:
            flush_buffer()
            section_title = segment.text
            section_refs = {
                "page_number": segment.page_number,
                "slide_number": segment.slide_number,
                "sheet_name": segment.sheet_name,
            }
            buffer.append(segment.text)
            buffer_tokens += estimate_tokens(segment.text)
            continue

        if segment.section_title:
            if segment.section_title != section_title and buffer:
                flush_buffer()
            section_title = segment.section_title

        section_refs = {
            "page_number": segment.page_number or section_refs["page_number"],
            "slide_number": segment.slide_number or section_refs["slide_number"],
            "sheet_name": segment.sheet_name or section_refs["sheet_name"],
        }

        descriptor = _segment_descriptor(segment)
        segment_text = f"[{descriptor}] {segment.text}" if descriptor else segment.text
        segment_tokens = estimate_tokens(segment_text)

        if segment_tokens > target_tokens:
            flush_buffer()
            for piece in _split_long_text(segment_text, target_tokens, overlap_tokens):
                buffer = [piece]
                buffer_tokens = estimate_tokens(piece)
                flush_buffer()
            continue

        if buffer and buffer_tokens + segment_tokens > target_tokens:
            flush_buffer()
            if overlap_tokens > 0 and chunks:
                previous_words = chunks[-1].text.split()
                overlap_words = previous_words[-min(len(previous_words), math.floor(overlap_tokens / 1.3)) :]
                if overlap_words:
                    buffer = [" ".join(overlap_words)]
                    buffer_tokens = estimate_tokens(buffer[0])

        buffer.append(segment_text)
        buffer_tokens += segment_tokens

    flush_buffer()
    return chunks
