"""
LLM Service — Groq API client (free tier, fast inference).
Uses Llama 3.3 70B model via Groq's infrastructure.
"""

import os
import time
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_client = None

LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")


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
            response = client.chat.completions.create(
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
                    time.sleep(2 ** attempt * 3)
                    continue
                raise RuntimeError(
                    f"Groq rate limit reached. Free tier allows 30 requests/min. "
                    f"Please wait a moment and try again."
                ) from e
            raise

    raise last_error  # type: ignore
