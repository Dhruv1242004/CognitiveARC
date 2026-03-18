"use client";

const impactPoints = [
  {
    title: "Grounded responses",
    description: "Hybrid retrieval and strict fallback behavior reduce generic answers.",
  },
  {
    title: "Modular orchestration",
    description: "Planner, retriever, memory, and formatter stay independently evolvable.",
  },
  {
    title: "Execution visibility",
    description: "Trace steps and source-linked output make the runtime easier to trust and debug.",
  },
];

export default function ImpactSection() {
  return (
    <section className="section-shell">
      <div className="section-header">
        <span className="section-kicker">Why It Matters</span>
        <h2 className="section-title-lg">Why this project matters</h2>
        <p className="section-copy">
          CognitiveARC goes beyond a prompt box by making the retrieval and execution path visible.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
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
