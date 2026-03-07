"""
Agent Planner — Intent parsing and execution planning.
Analyzes the user query to determine intent, task type, and execution plan.
"""

from services.llm import generate_response
import json


PLANNING_PROMPT = """You are an AI agent planner. Analyze the user's query and produce a structured plan.

Return ONLY a JSON object (no markdown, no code fences) with these fields:
{
  "intent": "brief description of what the user wants",
  "task_type": "one of: summarization, information_retrieval, insight_extraction, question_answering, general",
  "requires_retrieval": true/false,
  "requires_document": true/false,
  "plan_steps": ["step 1", "step 2", ...],
  "tools_needed": ["tool1", "tool2", ...]
}

Available tools: VectorSearch, DocumentParser, EmbeddingEngine, MemoryManager, ResponseComposer, TextAnalyzer

User query: {query}
Context: {context}"""


async def plan_execution(query: str, has_documents: bool = False, has_text_input: bool = False) -> dict:
    """Parse user intent and create an execution plan."""
    context_parts = []
    if has_documents:
        context_parts.append("User has uploaded documents to the knowledge base.")
    if has_text_input:
        context_parts.append("User has provided inline text for analysis.")
    if not context_parts:
        context_parts.append("No documents uploaded. General query mode.")

    context = " ".join(context_parts)

    try:
        response = await generate_response(
            prompt=PLANNING_PROMPT.format(query=query, context=context),
            temperature=0.3,
            max_tokens=512,
        )

        # Clean response — strip markdown code fences if present
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        plan = json.loads(cleaned)
        return {
            "intent": plan.get("intent", "general query"),
            "task_type": plan.get("task_type", "general"),
            "requires_retrieval": plan.get("requires_retrieval", has_documents),
            "requires_document": plan.get("requires_document", False),
            "plan_steps": plan.get("plan_steps", ["Process query", "Generate response"]),
            "tools_needed": plan.get("tools_needed", ["ResponseComposer"]),
        }
    except (json.JSONDecodeError, Exception) as e:
        # Fallback plan if LLM response isn't valid JSON
        return {
            "intent": "process user query",
            "task_type": "general",
            "requires_retrieval": has_documents,
            "requires_document": False,
            "plan_steps": [
                "Parse user intent",
                "Retrieve relevant context" if has_documents else "Analyze query",
                "Generate response",
            ],
            "tools_needed": ["ResponseComposer"],
        }
