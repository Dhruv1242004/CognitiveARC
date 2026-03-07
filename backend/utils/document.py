"""
Document Processor — extract text from common document and image formats.
"""

from pypdf import PdfReader
import io


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


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text content from a PDF file."""
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file."""
    try:
        from docx import Document
    except ImportError as exc:
        raise RuntimeError("DOCX support requires 'python-docx' to be installed.") from exc

    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]
    return "\n\n".join(paragraphs)


def extract_text_from_pptx(file_bytes: bytes) -> str:
    """Extract text from a PPTX file."""
    try:
        from pptx import Presentation
    except ImportError as exc:
        raise RuntimeError("PPTX support requires 'python-pptx' to be installed.") from exc

    presentation = Presentation(io.BytesIO(file_bytes))
    chunks: list[str] = []
    for slide_idx, slide in enumerate(presentation.slides, start=1):
        slide_lines: list[str] = []
        for shape in slide.shapes:
            text = getattr(shape, "text", None)
            if text and text.strip():
                slide_lines.append(text.strip())
        if slide_lines:
            chunks.append(f"Slide {slide_idx}:\n" + "\n".join(slide_lines))
    return "\n\n".join(chunks)


def extract_text_from_xlsx(file_bytes: bytes) -> str:
    """Extract visible cell values from an XLSX workbook."""
    try:
        from openpyxl import load_workbook
    except ImportError as exc:
        raise RuntimeError("XLSX support requires 'openpyxl' to be installed.") from exc

    wb = load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
    sheet_blocks: list[str] = []
    for ws in wb.worksheets:
        rows: list[str] = []
        for row in ws.iter_rows(values_only=True):
            values = [str(v).strip() for v in row if v is not None and str(v).strip()]
            if values:
                rows.append(" | ".join(values))
        if rows:
            sheet_blocks.append(f"Sheet: {ws.title}\n" + "\n".join(rows))
    return "\n\n".join(sheet_blocks)


def extract_text_from_image(file_bytes: bytes) -> str:
    """Extract text from an image via OCR (Tesseract)."""
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Image support requires 'pillow' to be installed.") from exc

    try:
        import pytesseract
    except ImportError as exc:
        raise RuntimeError("Image OCR requires 'pytesseract' to be installed.") from exc

    try:
        image = Image.open(io.BytesIO(file_bytes))
        # Preprocess image for faster, more reliable OCR.
        image = image.convert("L")
        max_width = 1800
        if image.width > max_width:
            ratio = max_width / float(image.width)
            image = image.resize((max_width, int(image.height * ratio)))

        # Use a generous timeout to avoid false timeouts on first-run OCR warmup.
        return pytesseract.image_to_string(image, timeout=45, config="--psm 6").strip()
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError(
            "Image OCR requires Tesseract to be installed on the server."
        ) from exc
    except RuntimeError as exc:
        # pytesseract raises RuntimeError on timeout
        if "timed out" in str(exc).lower():
            raise RuntimeError(
                "Image OCR timed out. Try a smaller/clearer image or retry."
            ) from exc
        raise


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extract text based on file type."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext == "docx":
        return extract_text_from_docx(file_bytes)
    elif ext == "pptx":
        return extract_text_from_pptx(file_bytes)
    elif ext == "xlsx":
        return extract_text_from_xlsx(file_bytes)
    elif ext in IMAGE_EXTENSIONS:
        return extract_text_from_image(file_bytes)
    elif ext in TEXT_EXTENSIONS:
        return file_bytes.decode("utf-8", errors="replace")

    raise RuntimeError(
        f"Unsupported file type '.{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
    )
