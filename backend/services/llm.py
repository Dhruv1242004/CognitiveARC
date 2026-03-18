"""
LLM service with shared-key traffic shaping and optional per-request API keys.
"""

from __future__ import annotations

import asyncio
import base64
from collections import deque
from dataclasses import dataclass
import io
import os
import threading
import time

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

_shared_client = None
_client_lock = threading.Lock()
_custom_clients: dict[str, Groq] = {}
_budget_lock = threading.Lock()
_shared_request_history: deque[float] = deque()
_requester_history: dict[str, deque[float]] = {}

LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
VISION_MODEL = os.getenv(
    "VISION_MODEL",
    "meta-llama/llama-4-scout-17b-16e-instruct",
)
MAX_CONCURRENT_LLM_REQUESTS = max(1, int(os.getenv("MAX_CONCURRENT_LLM_REQUESTS", "4")))
SHARED_KEY_GLOBAL_RPM = max(1, int(os.getenv("SHARED_KEY_GLOBAL_RPM", "24")))
SHARED_KEY_REQUESTER_RPM = max(1, int(os.getenv("SHARED_KEY_REQUESTER_RPM", "8")))
_llm_semaphore = asyncio.Semaphore(MAX_CONCURRENT_LLM_REQUESTS)


@dataclass(slots=True)
class LLMRequestContext:
    requester_id: str | None = None
    api_key: str | None = None


class LLMServiceError(RuntimeError):
    """Raised for user-visible LLM traffic control errors."""

    def __init__(self, message: str, *, status_code: int = 503):
        super().__init__(message)
        self.status_code = status_code


class VisionExtractionError(RuntimeError):
    """Raised when the image-to-text vision path fails."""

    def __init__(self, message: str, *, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _get_configured_api_key() -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        raise RuntimeError(
            "GROQ_API_KEY not set. Get a free key at https://console.groq.com/keys"
        )
    return api_key


def _get_client(api_key: str | None = None) -> Groq:
    global _shared_client
    resolved_key = api_key or _get_configured_api_key()
    with _client_lock:
        if api_key:
            client = _custom_clients.get(resolved_key)
            if client is None:
                client = Groq(api_key=resolved_key)
                _custom_clients[resolved_key] = client
            return client
        if _shared_client is None:
            _shared_client = Groq(api_key=resolved_key)
        return _shared_client


def _trim_window(window: deque[float], now: float, interval_s: float = 60.0) -> None:
    while window and now - window[0] >= interval_s:
        window.popleft()


def _enforce_shared_budget(requester_id: str | None) -> None:
    now = time.monotonic()
    with _budget_lock:
        _trim_window(_shared_request_history, now)
        if len(_shared_request_history) >= SHARED_KEY_GLOBAL_RPM:
            raise LLMServiceError(
                "Shared LLM capacity is saturated. Retry in a few seconds or use your own Groq API key.",
                status_code=429,
            )

        requester_key = requester_id or "anonymous"
        requester_window = _requester_history.setdefault(requester_key, deque())
        _trim_window(requester_window, now)
        if len(requester_window) >= SHARED_KEY_REQUESTER_RPM:
            raise LLMServiceError(
                "Per-user LLM request budget exceeded for the current minute. Retry shortly or use your own Groq API key.",
                status_code=429,
            )

        _shared_request_history.append(now)
        requester_window.append(now)


def warmup_llm_client() -> dict:
    client = _get_client()
    return {
        "llm_client_ready": client is not None,
        "llm_model": LLM_MODEL,
        "vision_model": VISION_MODEL,
    }


async def generate_response(
    prompt: str,
    system_instruction: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    retries: int = 2,
    context: LLMRequestContext | None = None,
) -> str:
    """Generate a response with concurrency and shared-key safeguards."""
    request_context = context or LLMRequestContext()
    if not request_context.api_key:
        _enforce_shared_budget(request_context.requester_id)

    client = _get_client(request_context.api_key)

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    last_error = None
    async with _llm_semaphore:
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
                        await asyncio.sleep(2 ** attempt * 2)
                        continue
                    raise LLMServiceError(
                        "Groq rate limit reached. Retry in a few seconds or use your own Groq API key.",
                        status_code=429,
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


def _vision_request(file_bytes: bytes, mime_type: str, api_key: str | None = None) -> str:
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
        response = _get_client(api_key).chat.completions.create(
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


async def extract_text_from_image(
    file_bytes: bytes,
    mime_type: str,
    context: LLMRequestContext | None = None,
) -> str:
    """Extract text or a concise description from an image using Groq vision."""
    request_context = context or LLMRequestContext()
    if not request_context.api_key:
        _enforce_shared_budget(request_context.requester_id)
    async with _llm_semaphore:
        return await asyncio.to_thread(_vision_request, file_bytes, mime_type, request_context.api_key)
