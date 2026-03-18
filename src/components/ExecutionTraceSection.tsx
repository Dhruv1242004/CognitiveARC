"use client";

import { motion } from "framer-motion";

const traceSteps = [
  {
    key: "planner",
    label: "Planner",
    timing: "28ms",
    description: "Classifies the request and resolves the path.",
  },
  {
    key: "retriever",
    label: "Retriever",
    timing: "84ms",
    description: "Runs hybrid search and reranks the result.",
  },
  {
    key: "memory",
    label: "Memory",
    timing: "7ms",
    description: "Loads short-term session context.",
  },
  {
    key: "tool-router",
    label: "Tool Router",
    timing: "12ms",
    description: "Schedules deterministic tool steps.",
  },
  {
    key: "generator",
    label: "Response Generator",
    timing: "316ms",
    description: "Builds the grounded answer with citations.",
  },
  {
    key: "formatter",
    label: "Output Formatter",
    timing: "11ms",
    description: "Packages sources and timings for the UI.",
  },
];

export default function ExecutionTraceSection() {
  return (
    <section id="execution-trace" className="section-shell">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="section-header">
          <span className="section-kicker">Execution Trace</span>
          <h2 className="section-title-lg">Visible runtime steps</h2>
          <p className="section-copy">
            Planning, retrieval, memory, and output formatting stay visible instead of hidden behind one response box.
          </p>
        </div>

        <div className="space-y-3">
          {traceSteps.map((step, index) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.05, duration: 0.24 }}
              className="trace-row"
            >
              <div className="status-dot status-completed" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-[0.8rem] text-[var(--text-primary)]">{step.label}</span>
                  <span className="trace-ms">{step.timing}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
