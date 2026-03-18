"use client";

import { motion } from "framer-motion";

const queryContext = {
  query: "Find delivery milestones, flagged risks, and supporting evidence in the uploaded planning materials.",
  attachment: "product-roadmap-deck.pptx • 38 slides • 124 chunks indexed",
};

const traceSteps = [
  {
    key: "planner",
    label: "Planner",
    status: "completed",
    timing: "28ms",
    description: "Intent classified as targeted retrieval-backed QA with strict grounding enabled.",
    logs: ["task_type=question_answering", "requires_retrieval=true", "tools=VectorSearch, ResponseComposer"],
    input: "milestones + risks + evidence",
    output: "multi-hop document query",
  },
  {
    key: "retriever",
    label: "Retriever",
    status: "completed",
    timing: "84ms",
    description: "Hybrid semantic and keyword retrieval ranked six chunks across roadmap and risk sections.",
    logs: ["top_k=6", "strategy=hybrid", "doc_filter=product-roadmap-deck.pptx"],
    input: "delivery milestones, risks",
    output: "6 chunks with section metadata",
  },
  {
    key: "memory",
    label: "Memory",
    status: "completed",
    timing: "7ms",
    description: "Loaded prior session summary so the response could reconcile repeated follow-up questions.",
    logs: ["session=7af2b1", "exchanges=3"],
    input: "session context",
    output: "3 prior exchanges",
  },
  {
    key: "tool-router",
    label: "Tool Router",
    status: "completed",
    timing: "12ms",
    description: "Scheduled deterministic formatting and retrieval tools rather than free-form generation alone.",
    logs: ["VectorSearch=completed", "ResponseComposer=queued"],
    input: "planner tool set",
    output: "tool execution plan",
  },
  {
    key: "generator",
    label: "Response Generator",
    status: "completed",
    timing: "316ms",
    description: "Generated answer with source-linked evidence and strict fallback if unsupported.",
    logs: ["temperature=0.2", "strict_retrieval=true", "citations=[1],[2],[3]"],
    input: "grounded context bundle",
    output: "technical answer with citations",
  },
  {
    key: "formatter",
    label: "Output Formatter",
    status: "completed",
    timing: "11ms",
    description: "Packaged final answer, excerpts, source metadata, and runtime timings for the UI.",
    logs: ["sources=3", "supporting_excerpts=4"],
    input: "answer + evidence",
    output: "structured frontend payload",
  },
];

const finalOutput = {
  answer:
    "The delivery plan targets three explicit milestones: beta readiness, customer pilot rollout, and analytics hardening. Risks are concentrated around API dependency delays and missing evaluation coverage, with both issues cited directly from the roadmap and risk slides.",
  sources: [
    "product-roadmap-deck.pptx • Q3 Delivery Plan • slide 12",
    "product-roadmap-deck.pptx • Risks and Dependencies • slide 17",
    "planning-notes.docx • Engineering Milestones • page 4",
  ],
};

export default function ExecutionTraceSection() {
  return (
    <section id="execution-trace" className="section-shell">
      <div className="section-header">
        <span className="section-kicker">Execution Trace</span>
        <h2 className="section-title-lg">A recruiter can see the agent execute, not just read about it</h2>
        <p className="section-copy">
          CognitiveARC now surfaces an end-to-end run across query planning, retrieval, memory lookup, tool execution,
          grounded generation, and final structured output.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr_0.9fr]">
        <div className="surface-card">
          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Run Input</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Query and document scope</h3>
          <div className="mt-5 rounded-[1.35rem] border border-[var(--border-muted)] bg-[var(--panel-strong)] p-4">
            <p className="text-sm leading-7 text-[var(--text-primary)]">{queryContext.query}</p>
          </div>
          <div className="mt-4 rounded-[1.35rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Indexed Context</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{queryContext.attachment}</p>
          </div>
        </div>

        <div className="surface-card">
          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Timeline</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Step-by-step runtime</h3>
          <div className="mt-5 space-y-3">
            {traceSteps.map((step, index) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.05, duration: 0.28 }}
                className="trace-row"
              >
                <div className={`status-dot status-${step.status}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-[0.82rem] text-[var(--text-primary)]">{step.label}</span>
                    <span className="trace-ms">{step.timing}</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{step.description}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--panel-soft)] p-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Input</p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">{step.input}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--panel-soft)] p-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Output</p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">{step.output}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-[var(--border-muted)] bg-[rgba(11,16,24,0.74)] p-3 font-mono text-xs leading-6 text-[var(--text-dim)]">
                    {step.logs.join(" • ")}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="surface-card">
          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Structured Result</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Final answer payload</h3>
          <div className="mt-5 rounded-[1.35rem] border border-[rgba(114,226,169,0.16)] bg-[rgba(29,57,45,0.25)] p-4">
            <p className="text-sm leading-7 text-[var(--text-primary)]">{finalOutput.answer}</p>
          </div>
          <div className="mt-4 rounded-[1.35rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Source Metadata</p>
            <div className="mt-3 space-y-3">
              {finalOutput.sources.map((source) => (
                <div key={source} className="rounded-2xl border border-[var(--border-muted)] bg-[var(--panel-strong)] px-3.5 py-3 text-sm text-[var(--text-secondary)]">
                  {source}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
