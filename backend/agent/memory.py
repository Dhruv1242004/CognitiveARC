"""
Memory Manager — Session-based conversation context.
Stores recent exchanges per session for short-term memory.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Exchange:
    query: str
    response_summary: str
    timestamp: str


_sessions: dict[str, list[Exchange]] = defaultdict(list)
MAX_HISTORY = 10


def add_exchange(session_id: str, query: str, response_summary: str) -> None:
    """Record a query-response exchange in session memory."""
    _sessions[session_id].append(Exchange(
        query=query,
        response_summary=response_summary[:200],  # Keep summaries short
        timestamp=datetime.now().isoformat(),
    ))
    # Trim old exchanges
    if len(_sessions[session_id]) > MAX_HISTORY:
        _sessions[session_id] = _sessions[session_id][-MAX_HISTORY:]


def get_session_context(session_id: str) -> str:
    """Get formatted session history for context injection."""
    history = _sessions.get(session_id, [])
    if not history:
        return ""

    lines = ["Previous conversation:"]
    for ex in history[-5:]:  # Last 5 exchanges
        lines.append(f"User: {ex.query}")
        lines.append(f"Assistant: {ex.response_summary}")
    return "\n".join(lines)


def get_session_info(session_id: str) -> dict:
    """Get session metadata."""
    history = _sessions.get(session_id, [])
    return {
        "exchanges": len(history),
        "has_history": len(history) > 0,
    }


def clear_session(session_id: str) -> None:
    """Clear a session's history."""
    if session_id in _sessions:
        del _sessions[session_id]
