"""
Document ingestion utilities with format-aware parsing and semantic structure retention.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import io
import re

from pypdf import PdfReader


TEXT_EXTENSIONS = {"txt", "md", "csv", "json", "py", "js", "ts", "tsx", "jsx"}
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"}
SUPPORTED_EXTENSIONS = {
    "pdf",
    "docx",
    "pptx",
    "xlsx",
    *TEXT_EXTENSIONS,
    *IMAGE_EXTENSIONS,
}


@dataclass
class DocumentSegment:
    text: str
    kind: str
    section_title: str | None = None
    page_number: int | None = None
    slide_number: int | None = None
    sheet_name: str | None = None
    level: int | None = None


@dataclass
class ParsedDocument:
    filename: str
    file_type: str
    title: str
    segments: list[DocumentSegment] = field(default_factory=list)

    @property
    def full_text(self) -> str:
        return "\n\n".join(segment.text for segment in self.segments if segment.text.strip())


def get_file_extension(filename: str) -> str:
    return filename.lower().rsplit(".", 1)[-1] if "." in filename else ""


def is_image_file(filename: str) -> bool:
    return get_file_extension(filename) in IMAGE_EXTENSIONS


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _title_from_filename(filename: str) -> str:
    base = filename.rsplit(".", 1)[0]
    return base.replace("_", " ").replace("-", " ").strip() or filename


def _add_segment(
    segments: list[DocumentSegment],
    *,
    text: str,
    kind: str,
    section_title: str | None = None,
    page_number: int | None = None,
    slide_number: int | None = None,
    sheet_name: str | None = None,
    level: int | None = None,
) -> None:
    normalized = normalize_text(text)
    if not normalized:
        return
    segments.append(
        DocumentSegment(
            text=normalized,
            kind=kind,
            section_title=section_title,
            page_number=page_number,
            slide_number=slide_number,
            sheet_name=sheet_name,
            level=level,
        )
    )


def extract_pdf_segments(file_bytes: bytes, filename: str) -> ParsedDocument:
    title = _title_from_filename(filename)
    segments: list[DocumentSegment] = []

    try:
        import fitz  # PyMuPDF

        document = fitz.open(stream=file_bytes, filetype="pdf")
        for page_index, page in enumerate(document, start=1):
            blocks = page.get_text("blocks")
            page_segments = 0
            for block in sorted(blocks, key=lambda item: (item[1], item[0])):
                text = block[4]
                if normalize_text(text):
                    _add_segment(
                        segments,
                        text=text,
                        kind="paragraph",
                        section_title=f"Page {page_index}",
                        page_number=page_index,
                    )
                    page_segments += 1
            if page_segments == 0:
                fallback_text = normalize_text(page.get_text("text"))
                if fallback_text:
                    _add_segment(
                        segments,
                        text=fallback_text,
                        kind="paragraph",
                        section_title=f"Page {page_index}",
                        page_number=page_index,
                    )
        document.close()
    except ImportError:
        reader = PdfReader(io.BytesIO(file_bytes))
        for page_index, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            _add_segment(
                segments,
                text=text,
                kind="paragraph",
                section_title=f"Page {page_index}",
                page_number=page_index,
            )

    return ParsedDocument(filename=filename, file_type="pdf", title=title, segments=segments)


def extract_docx_segments(file_bytes: bytes, filename: str) -> ParsedDocument:
    try:
        from docx import Document
    except ImportError as exc:
        raise RuntimeError("DOCX support requires 'python-docx' to be installed.") from exc

    title = _title_from_filename(filename)
    doc = Document(io.BytesIO(file_bytes))
    segments: list[DocumentSegment] = []
    current_heading = title

    for paragraph in doc.paragraphs:
        text = normalize_text(paragraph.text)
        if not text:
            continue

        style_name = (paragraph.style.name if paragraph.style else "").lower()
        if "heading" in style_name or style_name in {"title", "subtitle"}:
            current_heading = text
            level_match = re.search(r"(\d+)", style_name)
            level = int(level_match.group(1)) if level_match else 1
            _add_segment(
                segments,
                text=text,
                kind="heading",
                section_title=current_heading,
                level=level,
            )
        else:
            _add_segment(
                segments,
                text=text,
                kind="paragraph",
                section_title=current_heading,
            )

    for table_index, table in enumerate(doc.tables, start=1):
        rows: list[str] = []
        for row in table.rows:
            cells = [normalize_text(cell.text) for cell in row.cells]
            values = [cell for cell in cells if cell]
            if values:
                rows.append(" | ".join(values))
        if rows:
            _add_segment(
                segments,
                text="\n".join(rows),
                kind="table",
                section_title=f"{current_heading} / Table {table_index}",
            )

    return ParsedDocument(filename=filename, file_type="docx", title=title, segments=segments)


def extract_pptx_segments(file_bytes: bytes, filename: str) -> ParsedDocument:
    try:
        from pptx import Presentation
    except ImportError as exc:
        raise RuntimeError("PPTX support requires 'python-pptx' to be installed.") from exc

    title = _title_from_filename(filename)
    deck = Presentation(io.BytesIO(file_bytes))
    segments: list[DocumentSegment] = []

    for slide_index, slide in enumerate(deck.slides, start=1):
        slide_title = title
        if getattr(slide.shapes, "title", None) and slide.shapes.title.text:
            slide_title = normalize_text(slide.shapes.title.text) or slide_title

        _add_segment(
            segments,
            text=slide_title,
            kind="slide_title",
            section_title=slide_title,
            slide_number=slide_index,
            level=1,
        )

        for shape in slide.shapes:
            if not hasattr(shape, "text_frame") or not shape.text_frame:
                text = getattr(shape, "text", None)
                if text and normalize_text(text) and normalize_text(text) != slide_title:
                    _add_segment(
                        segments,
                        text=text,
                        kind="paragraph",
                        section_title=slide_title,
                        slide_number=slide_index,
                    )
                continue

            for paragraph in shape.text_frame.paragraphs:
                runs = [run.text for run in paragraph.runs if run.text]
                text = normalize_text("".join(runs) if runs else paragraph.text)
                if not text or text == slide_title:
                    continue
                kind = "bullet" if paragraph.level > 0 else "paragraph"
                _add_segment(
                    segments,
                    text=text,
                    kind=kind,
                    section_title=slide_title,
                    slide_number=slide_index,
                    level=paragraph.level,
                )

    return ParsedDocument(filename=filename, file_type="pptx", title=title, segments=segments)


def extract_xlsx_segments(file_bytes: bytes, filename: str) -> ParsedDocument:
    try:
        from openpyxl import load_workbook
    except ImportError as exc:
        raise RuntimeError("XLSX support requires 'openpyxl' to be installed.") from exc

    title = _title_from_filename(filename)
    workbook = load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
    segments: list[DocumentSegment] = []

    for worksheet in workbook.worksheets:
        _add_segment(
            segments,
            text=worksheet.title,
            kind="heading",
            section_title=worksheet.title,
            sheet_name=worksheet.title,
            level=1,
        )
        for row in worksheet.iter_rows(values_only=True):
            values = [normalize_text(str(value)) for value in row if value is not None]
            filtered = [value for value in values if value]
            if filtered:
                _add_segment(
                    segments,
                    text=" | ".join(filtered),
                    kind="table_row",
                    section_title=worksheet.title,
                    sheet_name=worksheet.title,
                )

    return ParsedDocument(filename=filename, file_type="xlsx", title=title, segments=segments)


def extract_text_segments(file_bytes: bytes, filename: str) -> ParsedDocument:
    title = _title_from_filename(filename)
    decoded = file_bytes.decode("utf-8", errors="replace")
    blocks = [normalize_text(block) for block in decoded.split("\n\n")]
    segments = [
        DocumentSegment(text=block, kind="paragraph", section_title=title)
        for block in blocks
        if block
    ]
    return ParsedDocument(filename=filename, file_type=get_file_extension(filename), title=title, segments=segments)


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    return extract_structured_document(file_bytes, filename).full_text


def extract_structured_document(file_bytes: bytes, filename: str) -> ParsedDocument:
    ext = get_file_extension(filename)

    if ext == "pdf":
        return extract_pdf_segments(file_bytes, filename)
    if ext == "docx":
        return extract_docx_segments(file_bytes, filename)
    if ext == "pptx":
        return extract_pptx_segments(file_bytes, filename)
    if ext == "xlsx":
        return extract_xlsx_segments(file_bytes, filename)
    if ext in IMAGE_EXTENSIONS:
        raise RuntimeError("Image files must be routed through the vision OCR pipeline.")
    if ext in TEXT_EXTENSIONS:
        return extract_text_segments(file_bytes, filename)

    raise RuntimeError(
        f"Unsupported file type '.{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
    )
