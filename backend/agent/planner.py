"""
Deterministic query planner to avoid spending an external LLM call on routing.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlannerRule:
    task_type: str
    keywords: tuple[str, ...]
    tools_needed: tuple[str, ...]


RULES: tuple[PlannerRule, ...] = (
    PlannerRule(
        task_type="insight_extraction",
        keywords=("extract", "list", "identify", "action items", "risks", "blockers", "milestones"),
        tools_needed=("VectorSearch", "ResponseComposer"),
    ),
    PlannerRule(
        task_type="summarization",
        keywords=("summarize", "summary", "overview", "tl;dr", "main points"),
        tools_needed=("VectorSearch", "ResponseComposer"),
    ),
    PlannerRule(
        task_type="information_retrieval",
        keywords=("where", "which", "who", "when", "what", "find", "mentioned", "section"),
        tools_needed=("VectorSearch", "ResponseComposer"),
    ),
    PlannerRule(
        task_type="question_answering",
        keywords=("compare", "explain", "why", "how", "difference", "impact"),
        tools_needed=("VectorSearch", "ResponseComposer"),
    ),
)


def _normalize(query: str) -> str:
    return " ".join(query.lower().strip().split())


def _match_rule(normalized_query: str) -> PlannerRule | None:
    for rule in RULES:
        if any(keyword in normalized_query for keyword in rule.keywords):
            return rule
    return None


async def plan_execution(query: str, has_documents: bool = False, has_text_input: bool = False) -> dict:
    """Build a deterministic execution plan from query heuristics and current scope."""
    normalized_query = _normalize(query)
    matched = _match_rule(normalized_query)

    if matched:
        task_type = matched.task_type
        tools_needed = list(matched.tools_needed)
    else:
        task_type = "general"
        tools_needed = ["ResponseComposer"]

    requires_retrieval = has_documents or has_text_input or task_type != "general"
    requires_document = has_documents and any(
        token in normalized_query for token in ("document", "file", "pdf", "slide", "section", "page")
    )

    plan_steps = ["Parse user intent"]
    if has_documents or has_text_input:
        plan_steps.append("Retrieve relevant context")
    else:
        plan_steps.append("Answer directly")
    plan_steps.append("Compose grounded response")

    if has_documents and "VectorSearch" not in tools_needed:
        tools_needed.insert(0, "VectorSearch")

    return {
        "intent": normalized_query[:120] or "process user query",
        "task_type": task_type,
        "requires_retrieval": requires_retrieval,
        "requires_document": requires_document,
        "plan_steps": plan_steps,
        "tools_needed": tools_needed,
    }
