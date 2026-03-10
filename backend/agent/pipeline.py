"""
Pipeline Orchestrator — Ties all agent stages together.
This is the main entry point for processing user queries through the full agent pipeline.
"""

from agent.planner import plan_execution
from agent.retriever import retrieve_context
from agent.memory import get_session_context, add_exchange, get_session_info
from agent.tools import execute_tools
from services.llm import generate_response
from services.vectordb import has_documents
import uuid


RESPONSE_PROMPT = """You are CognitiveARC, an autonomous AI agent. Generate a helpful, well-structured response to the user's query.

{context_section}

{memory_section}

User Query: {query}

Instructions:
- If context documents were provided, ground your response in them and cite relevant information.
- If no documents are available, respond based on your general knowledge.
- Structure your response clearly with headers and bullet points where appropriate.
- Be thorough but concise.
- Use markdown formatting for readability."""


def _build_tools_needed(
    plan: dict,
    *,
    has_docs: bool,
    has_inline: bool,
    has_session_memory: bool,
) -> list[str]:
    """
    Hybrid tool selection:
    - Keep planner-selected tools.
    - Force-add deterministic core tools for observability/consistency.
    """
    planned = plan.get("tools_needed", []) or []
    merged: list[str] = [t for t in planned if isinstance(t, str) and t.strip()]

    if has_docs and plan.get("requires_retrieval", True):
        merged.append("VectorSearch")
    if has_inline:
        merged.append("TextAnalyzer")
    if has_session_memory:
        merged.append("MemoryManager")

    # ResponseComposer should always be present as the final composition step.
    merged.append("ResponseComposer")

    deduped: list[str] = []
    seen: set[str] = set()
    for tool in merged:
        if tool not in seen:
            seen.add(tool)
            deduped.append(tool)
    return deduped


async def run_pipeline(
    query: str,
    session_id: str | None = None,
    document_id: str | None = None,
    inline_text: str | None = None,
) -> dict:
    """
    Execute the full agent pipeline:
    1. Plan execution
    2. Retrieve relevant context
    3. Load session memory
    4. Execute tools
    5. Generate LLM response
    6. Store in memory
    7. Return structured result
    """
    if not session_id:
        session_id = str(uuid.uuid4())[:8]

    reasoning_steps = []

    # ── Stage 1: Planning ──
    reasoning_steps.append(f"1. Parsing query: \"{query[:80]}{'...' if len(query) > 80 else ''}\"")

    has_docs = has_documents(document_id)
    has_inline = bool(inline_text and inline_text.strip())

    plan = await plan_execution(
        query=query,
        has_documents=has_docs,
        has_text_input=has_inline,
    )

    reasoning_steps.append(f"2. Intent classified: {plan['intent']}")
    reasoning_steps.append(f"3. Task type: {plan['task_type']}")
    reasoning_steps.append(f"4. Execution plan: {' → '.join(plan['plan_steps'][:4])}")

    # ── Stage 2: Context Retrieval ──
    retrieved_context = []

    if has_inline:
        # User provided inline text — use it directly as context
        reasoning_steps.append("5. Using provided text as context source")
        retrieved_context.append({
            "text": inline_text[:2000],
            "source": "user_input",
            "relevance": 1.0,
        })
    elif has_docs and plan.get("requires_retrieval", True):
        reasoning_steps.append("5. Querying vector store for relevant chunks...")
        retrieved_context = await retrieve_context(
            query=query,
            doc_id=document_id,
            n_results=4,
        )
        if retrieved_context:
            reasoning_steps.append(f"   → Retrieved {len(retrieved_context)} relevant chunks (top relevance: {retrieved_context[0]['relevance']})")
        else:
            reasoning_steps.append("   → No relevant chunks found in knowledge base")
    else:
        reasoning_steps.append("5. No document context available — using general knowledge")

    # ── Stage 3: Memory ──
    session_context = get_session_context(session_id)
    session_info = get_session_info(session_id)
    if session_context:
        reasoning_steps.append(f"6. Loaded session memory ({session_info['exchanges']} prior exchanges)")
    else:
        reasoning_steps.append("6. No prior session context")

    # ── Stage 4: Tool Execution ──
    plan["tools_needed"] = _build_tools_needed(
        plan,
        has_docs=has_docs,
        has_inline=has_inline,
        has_session_memory=bool(session_context),
    )
    tools_used = await execute_tools(plan, query, document_id)
    reasoning_steps.append(f"7. Executed {len(tools_used)} tools: {', '.join(t['name'] for t in tools_used)}")

    # ── Stage 5: LLM Response Generation ──
    reasoning_steps.append("8. Generating grounded response via Groq...")

    # Build context section
    if retrieved_context:
        context_lines = ["Retrieved Context:"]
        for i, ctx in enumerate(retrieved_context):
            context_lines.append(f"\n--- Document {i+1} (source: {ctx['source']}, relevance: {ctx['relevance']}) ---")
            context_lines.append(ctx["text"][:1000])
        context_section = "\n".join(context_lines)
    else:
        context_section = "No document context available."

    memory_section = f"Session Memory:\n{session_context}" if session_context else ""

    response_text = await generate_response(
        prompt=RESPONSE_PROMPT.format(
            query=query,
            context_section=context_section,
            memory_section=memory_section,
        ),
        temperature=0.7,
        max_tokens=2048,
    )

    reasoning_steps.append("9. Response generated successfully")

    # ── Stage 6: Store in memory ──
    summary = response_text[:200] if response_text else "No response generated"
    add_exchange(session_id, query, summary)

    # ── Format context for frontend ──
    formatted_context = []
    for ctx in retrieved_context:
        formatted_context.append({
            "text": ctx["text"][:300] + ("..." if len(ctx["text"]) > 300 else ""),
            "source": ctx["source"],
            "relevance": ctx["relevance"],
        })

    # ── Format tools for frontend ──
    formatted_tools = []
    for tool in tools_used:
        formatted_tools.append({
            "name": tool["name"],
            "status": tool["status"],
            "detail": tool["detail"],
        })

    return {
        "reasoning": reasoning_steps,
        "context": formatted_context,
        "tools": formatted_tools,
        "response": response_text,
        "session_id": session_id,
    }
