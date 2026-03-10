"""
LLM Service — Groq API client (free tier, fast inference).
Uses Llama 3.3 70B model for text generation and Groq vision for images.
"""

import asyncio
import base64
import io
import os

from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_client = None

LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
VISION_MODEL = os.getenv(
    "VISION_MODEL",
    "meta-llama/llama-4-scout-17b-16e-instruct",
)


class VisionExtractionError(RuntimeError):
    """Raised when the image-to-text vision path fails."""

    def __init__(self, message: str, *, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key or api_key == "your_groq_api_key_here":
            raise RuntimeError(
                "GROQ_API_KEY not set. Get a free key at https://console.groq.com/keys"
            )
        _client = Groq(api_key=api_key)
    return _client


async def generate_response(
    prompt: str,
    system_instruction: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    retries: int = 2,
) -> str:
    """Generate a response from Groq/Llama with retry on rate limit."""
    client = _get_client()

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    last_error = None
    for attempt in range(retries + 1):
        try:
            response = await asyncio.to_thread(
                client.chat.completions.create,
                model=LLM_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            last_error = e
            error_str = str(e)
            if "429" in error_str or "rate" in error_str.lower():
                if attempt < retries:
                    await asyncio.sleep(2 ** attempt * 3)
                    continue
                raise RuntimeError(
                    f"Groq rate limit reached. Free tier allows 30 requests/min. "
                    f"Please wait a moment and try again."
                ) from e
            raise

    raise last_error  # type: ignore
def _prepare_image_payload(file_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
    try:
        from PIL import Image
    except ImportError:
        return file_bytes, mime_type

    try:
        image = Image.open(io.BytesIO(file_bytes))
    except Exception:
        return file_bytes, mime_type

    image.load()
    max_dimension = 1600
    if max(image.size) > max_dimension:
        image.thumbnail((max_dimension, max_dimension))

    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    output = io.BytesIO()
    target_format = "PNG"
    target_mime = "image/png"

    if image.mode == "RGB":
        target_format = "JPEG"
        target_mime = "image/jpeg"
        image.save(output, format=target_format, quality=85, optimize=True)
    else:
        image.save(output, format=target_format, optimize=True)

    prepared = output.getvalue()
    if not prepared:
        return file_bytes, mime_type
    return prepared, target_mime


def _vision_request(file_bytes: bytes, mime_type: str) -> str:
    prepared_bytes, prepared_mime_type = _prepare_image_payload(file_bytes, mime_type)
    image_b64 = base64.b64encode(prepared_bytes).decode("ascii")
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Extract all legible text from this image as clean plain text. "
                        "Preserve structure where possible. If there is little or no text, "
                        "provide a concise factual description of the image instead."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{prepared_mime_type};base64,{image_b64}",
                    },
                },
            ],
        },
    ]

    try:
        response = _get_client().chat.completions.create(
            model=VISION_MODEL,
            messages=messages,
            temperature=0,
            max_tokens=500,
        )
    except Exception as exc:
        error_str = str(exc)
        if "429" in error_str or "rate" in error_str.lower():
            raise VisionExtractionError(
                "Groq vision rate limit reached. Please retry shortly.",
                status_code=503,
            ) from exc
        if "401" in error_str or "api key" in error_str.lower():
            raise VisionExtractionError(
                "Groq vision authentication failed. Check GROQ_API_KEY.",
                status_code=500,
            ) from exc
        if "403" in error_str or "permission" in error_str.lower():
            raise VisionExtractionError(
                "Groq vision access was denied for the configured model.",
                status_code=502,
            ) from exc
        raise VisionExtractionError(
            f"Groq vision OCR failed: {error_str[:300]}",
            status_code=502,
        ) from exc

    text = response.choices[0].message.content.strip() if response.choices else ""
    if not text:
        raise VisionExtractionError(
            "No text or usable description could be extracted from the image.",
            status_code=422,
        )
    return text


async def extract_text_from_image(file_bytes: bytes, mime_type: str) -> str:
    """Extract text or a concise description from an image using Groq vision."""
    return await asyncio.to_thread(_vision_request, file_bytes, mime_type)
