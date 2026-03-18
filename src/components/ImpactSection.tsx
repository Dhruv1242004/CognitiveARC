"use client";

const impactPoints = [
  {
    title: "Grounded response generation",
    description: "Hybrid retrieval and strict fallback behavior reduce the chance of generic answers when document support is missing.",
  },
  {
    title: "Modular orchestration",
    description: "Planner, retriever, memory, tool router, and formatter are separated so the system can evolve without rewriting the whole runtime.",
  },
  {
    title: "Execution visibility",
    description: "Trace steps, timings, and source-linked output make the agent explainable for demos, debugging, and recruiter review.",
  },
  {
    title: "Extensible deployment path",
    description: "Warm startup, container boundaries, health checks, and metadata-aware retrieval move the project closer to production behavior.",
  },
];

export default function ImpactSection() {
  return (
    <section className="section-shell">
      <div className="section-header">
        <span className="section-kicker">Why It Matters</span>
        <h2 className="section-title-lg">Technical choices that matter for real AI system behavior</h2>
        <p className="section-copy">
          CognitiveARC is meaningful because it pushes beyond a single prompt-response surface and exposes the operational
          decisions that make retrieval-backed agents more reliable and more explainable.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {impactPoints.map((point) => (
          <div key={point.title} className="surface-card">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{point.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{point.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
