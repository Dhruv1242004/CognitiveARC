"""
Pipeline orchestrator with execution trace visibility and strict grounded responses.
"""

from __future__ import annotations

import time
import uuid

from agent.memory import add_exchange, get_session_context, get_session_info
from agent.planner import plan_execution
from agent.retriever import retrieve_context
from agent.tools import execute_tools
from services.llm import LLMRequestContext, generate_response
from services.vectordb import has_documents


STRICT_SYSTEM_PROMPT = """You are CognitiveARC, an AI systems agent operating in strict retrieval mode.

Rules:
- Answer using only the retrieved context when documents are present.
- Cite source chunks inline using [1], [2], etc.
- If the answer is not supported by the retrieved context, say exactly: "Not found in indexed document."
- Keep the answer technical, concise, and specific.
- Do not invent implementation details or generic filler."""


GENERAL_SYSTEM_PROMPT = """You are CognitiveARC. Respond like a senior AI engineer: concise, structured, and technically precise."""

NO_CONTEXT_SYSTEM_PROMPT = """You are CognitiveARC.

Rules:
- If the user asks about CognitiveARC, answer from the provided product context only.
- If the user asks a general question without retrieval context, answer directly and concisely without citations.
- Do not speculate, hedge with 'likely', or invent unsupported implementation details.
- Do not mention citations unless retrieved context is actually present."""

PRODUCT_CONTEXT = """CognitiveARC is an autonomous AI agent platform focused on:
- document upload and indexing
- structure-aware chunking
- hybrid retrieval over indexed content
- session memory and tool-routed orchestration
- execution trace visibility with staged runtime signals
- grounded response generation with strict retrieval mode

The current stack uses a Next.js frontend, FastAPI backend, Chroma-based vector storage, warmed local embeddings, and Groq-backed generation and vision support."""


def _start_trace(
    traces: list[dict],
    *,
    key: str,
    label: str,
    description: str,
    input_snippet: str | None = None,
) -> dict:
    trace = {
        "key": key,
        "label": label,
        "description": description,
        "status": "running",
        "timing_ms": 0.0,
        "input": input_snippet,
        "output": None,
        "logs": [],
    }
    trace["_started_at"] = time.perf_counter()
    traces.append(trace)
    return trace


def _finish_trace(trace: dict, *, status: str, output: str | None = None, log: str | None = None) -> None:
    started_at = trace.pop("_started_at", time.perf_counter())
    trace["status"] = status
    trace["timing_ms"] = round((time.perf_counter() - started_at) * 1000, 2)
    trace["output"] = output
    if log:
        trace["logs"].append(log)


def _summarize_context_item(item: dict) -> str:
    source_parts = [item.get("source", "unknown")]
    if item.get("section_title"):
        source_parts.append(f"section {item['section_title']}")
    if item.get("page_number"):
        source_parts.append(f"page {item['page_number']}")
    if item.get("slide_number"):
        source_parts.append(f"slide {item['slide_number']}")
    return ", ".join(source_parts)


def _build_supporting_excerpts(context_items: list[dict]) -> list[dict]:
    excerpts = []
    for index, item in enumerate(context_items[:4], start=1):
        excerpts.append(
            {
                "citation": f"[{index}]",
                "excerpt": item["text"][:260].strip(),
                "source": item.get("source", "unknown"),
                "section_title": item.get("section_title"),
                "page_number": item.get("page_number"),
                "slide_number": item.get("slide_number"),
                "score": item.get("combined_score", item.get("relevance", 0)),
            }
        )
    return excerpts


def _build_sources(context_items: list[dict]) -> list[dict]:
    sources = []
    seen = set()
    for item in context_items:
        key = (
            item.get("source"),
            item.get("section_title"),
            item.get("page_number"),
            item.get("slide_number"),
        )
        if key in seen:
            continue
        seen.add(key)
        sources.append(
            {
                "document": item.get("source", "unknown"),
                "section_title": item.get("section_title"),
                "page_number": item.get("page_number"),
                "slide_number": item.get("slide_number"),
            }
        )
    return sources


def _build_not_found_payload(session_id: str, traces: list[dict], tools: list[dict], timings: dict) -> dict:
    answer = "Not found in indexed document."
    return {
        "query": "",
        "reasoning": [f"{trace['label']}: {trace['status']}" for trace in traces],
        "context": [],
        "tools": tools,
        "response": answer,
        "session_id": session_id,
        "execution_trace": traces,
        "structured_output": {
            "answer": answer,
            "supporting_excerpts": [],
            "sources": [],
        },
        "timings": timings,
        "strict_mode": True,
    }


async def run_pipeline(
    query: str,
    session_id: str | None = None,
    document_id: str | None = None,
    inline_text: str | None = None,
    strict_retrieval: bool = True,
    requester_id: str | None = None,
    provider_api_key: str | None = None,
) -> dict:
    if not session_id:
        session_id = str(uuid.uuid4())[:8]

    traces: list[dict] = []
    timings: dict[str, float] = {}
    started = time.perf_counter()
    reasoning_steps: list[str] = []

    has_docs = has_documents(document_id)
    has_inline = bool(inline_text and inline_text.strip())
    llm_context = LLMRequestContext(requester_id=requester_id, api_key=provider_api_key)

    planning_trace = _start_trace(
        traces,
        key="planner",
        label="Planner",
        description="Classifies intent and composes the orchestration path.",
        input_snippet=query[:240],
    )
    plan = await plan_execution(query=query, has_documents=has_docs, has_text_input=has_inline)
    _finish_trace(
        planning_trace,
        status="completed",
        output=f"{plan['task_type']} | tools: {', '.join(plan['tools_needed'])}",
        log=f"Intent: {plan['intent']}",
    )
    timings["planning_ms"] = planning_trace["timing_ms"]
    reasoning_steps.append(f"Planner resolved task type `{plan['task_type']}`")

    retrieved_context: list[dict] = []
    retrieval_timing_ms = 0.0
    retrieval_trace = _start_trace(
        traces,
        key="retrieval",
        label="Retriever",
        description="Runs hybrid semantic + keyword retrieval over indexed chunks.",
        input_snippet=query[:240],
    )

    if has_inline:
        retrieved_context = [
            {
                "id": "inline_text_0",
                "text": inline_text[:2400],
                "source": "inline_text",
                "relevance": 1.0,
                "combined_score": 1.0,
                "section_title": "Provided Input",
                "page_number": None,
                "slide_number": None,
            }
        ]
        _finish_trace(
            retrieval_trace,
            status="completed",
            output="Inline text injected as retrieval context",
            log="Bypassed vector search because inline text was provided.",
        )
    elif has_docs and plan.get("requires_retrieval", True):
        retrieval_result = await retrieve_context(query=query, doc_id=document_id, n_results=6)
        retrieved_context = retrieval_result["results"]
        retrieval_timing_ms = retrieval_result["timing_ms"]
        _finish_trace(
            retrieval_trace,
            status="completed" if retrieved_context else "failed",
            output=f"{len(retrieved_context)} grounded chunks",
            log=f"Hybrid retrieval completed in {retrieval_timing_ms} ms",
        )
    else:
        _finish_trace(
            retrieval_trace,
            status="completed",
            output="No indexed document scope",
            log="General knowledge mode",
        )

    timings["retrieval_ms"] = retrieval_trace["timing_ms"]
    reasoning_steps.append(
        f"Retriever returned `{len(retrieved_context)}` candidate chunks"
        if retrieved_context
        else "Retriever found no grounded chunks"
    )

    memory_trace = _start_trace(
        traces,
        key="memory",
        label="Memory",
        description="Loads short-term session exchanges for continuity.",
        input_snippet=session_id,
    )
    session_context = get_session_context(session_id)
    session_info = get_session_info(session_id)
    _finish_trace(
        memory_trace,
        status="completed",
        output=f"{session_info['exchanges']} exchanges loaded",
        log="No prior exchanges" if not session_context else "Session context injected",
    )
    timings["memory_ms"] = memory_trace["timing_ms"]
    reasoning_steps.append(f"Memory loaded `{session_info['exchanges']}` prior exchanges")

    tool_trace = _start_trace(
        traces,
        key="tool_router",
        label="Tool Router",
        description="Schedules deterministic tools for retrieval-backed composition.",
        input_snippet=", ".join(plan.get("tools_needed", [])),
    )
    tools_used = await execute_tools(
        plan,
        query,
        document_id,
        retrieval_timing_ms=retrieval_timing_ms or retrieval_trace["timing_ms"],
    )
    _finish_trace(
        tool_trace,
        status="completed",
        output=", ".join(tool["name"] for tool in tools_used),
        log=f"{len(tools_used)} tool events recorded",
    )
    timings["tool_routing_ms"] = tool_trace["timing_ms"]

    if strict_retrieval and has_docs and not retrieved_context:
        formatter_trace = _start_trace(
            traces,
            key="output_formatter",
            label="Output Formatter",
            description="Formats the final recruiter-visible structured result.",
            input_snippet="strict retrieval empty",
        )
        _finish_trace(
            formatter_trace,
            status="completed",
            output="Not found in indexed document.",
            log="Strict retrieval mode prevented an ungrounded answer.",
        )
        timings["output_formatter_ms"] = formatter_trace["timing_ms"]
        timings["total_ms"] = round((time.perf_counter() - started) * 1000, 2)
        add_exchange(session_id, query, "Not found in indexed document.")
        payload = _build_not_found_payload(session_id, traces, tools_used, timings)
        payload["query"] = query
        return payload

    generation_trace = _start_trace(
        traces,
        key="response_generator",
        label="Response Generator",
        description="Produces the final grounded answer from retrieved context.",
        input_snippet=query[:240],
    )

    use_no_context_mode = not retrieved_context and not has_docs and not has_inline

    if retrieved_context:
        context_lines = []
        for index, item in enumerate(retrieved_context[:5], start=1):
            context_lines.append(
                f"[{index}] {_summarize_context_item(item)}\n{item['text'][:1200]}"
            )
        context_section = "\n\n".join(context_lines)
        prompt = f"""User Query: {query}

Retrieved Context:
{context_section}

Session Memory:
{session_context if session_context else "No prior session context."}

Return:
1. A concise answer grounded in the retrieved context.
2. Inline citations [1], [2] where relevant.
3. If multiple facts are required, use short bullets.
"""
    else:
        prompt = f"""User Query: {query}

Known Product Context:
{PRODUCT_CONTEXT}

Session Memory:
{session_context if session_context else "No prior session context."}

Return:
1. A concise direct answer.
2. No citations unless document retrieval context exists.
3. If the user asks about CognitiveARC, ground the answer in the product context above.
"""

    response_text = await generate_response(
        prompt=prompt,
        system_instruction=(
            STRICT_SYSTEM_PROMPT
            if strict_retrieval and has_docs
            else NO_CONTEXT_SYSTEM_PROMPT if use_no_context_mode else GENERAL_SYSTEM_PROMPT
        ),
        temperature=0.2 if retrieved_context else 0.5,
        max_tokens=900,
        context=llm_context,
    )
    _finish_trace(
        generation_trace,
        status="completed",
        output=response_text[:180],
        log="Grounded answer generated",
    )
    timings["generation_ms"] = generation_trace["timing_ms"]

    formatter_trace = _start_trace(
        traces,
        key="output_formatter",
        label="Output Formatter",
        description="Packages answer, excerpts, citations, and runtime metrics.",
        input_snippet=response_text[:180],
    )
    supporting_excerpts = _build_supporting_excerpts(retrieved_context)
    sources = _build_sources(retrieved_context)
    _finish_trace(
        formatter_trace,
        status="completed",
        output=f"{len(supporting_excerpts)} excerpts, {len(sources)} sources",
        log="Structured payload ready for frontend panels",
    )
    timings["output_formatter_ms"] = formatter_trace["timing_ms"]
    timings["total_ms"] = round((time.perf_counter() - started) * 1000, 2)

    add_exchange(session_id, query, response_text[:200] if response_text else "No response generated")

    formatted_context = []
    for item in retrieved_context:
        formatted_context.append(
            {
                "text": item["text"][:320] + ("..." if len(item["text"]) > 320 else ""),
                "source": item.get("source", "unknown"),
                "relevance": item.get("combined_score", item.get("relevance", 0.0)),
                "section_title": item.get("section_title"),
                "page_number": item.get("page_number"),
                "slide_number": item.get("slide_number"),
            }
        )

    return {
        "query": query,
        "reasoning": reasoning_steps,
        "context": formatted_context,
        "tools": tools_used,
        "response": response_text,
        "session_id": session_id,
        "execution_trace": traces,
        "structured_output": {
            "answer": response_text,
            "supporting_excerpts": supporting_excerpts,
            "sources": sources,
        },
        "timings": timings,
        "strict_mode": strict_retrieval and has_docs,
    }
