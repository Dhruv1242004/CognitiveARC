"use client";

import { motion } from "framer-motion";

const metrics = [
  { label: "Avg Retrieval Time", value: "62-95ms", detail: "Hybrid reranking on indexed chunks" },
  { label: "Pipeline Stages", value: "6", detail: "Planner to output formatter" },
  { label: "Chunk Window", value: "300-800", detail: "Token-aware section chunks" },
  { label: "Chunk Overlap", value: "50-100", detail: "Context continuity across segments" },
  { label: "Indexed File Support", value: "PDF / DOCX / PPTX / XLSX", detail: "Format-specific extraction path" },
  { label: "Document Capacity", value: "15MB", detail: "Per-upload limit in current demo stack" },
  { label: "Containerized Services", value: "2", detail: "Frontend and backend deployment path" },
  { label: "Architecture Layers", value: "6", detail: "Client, API, orchestration, retrieval, tooling, output" },
];

export default function SystemMetricsSection() {
  return (
    <section id="metrics" className="section-shell">
      <div className="section-header">
        <span className="section-kicker">Engineering Metrics</span>
        <h2 className="section-title-lg">Engineering metrics</h2>
        <p className="section-copy">
          Runtime signals focused on retrieval, pipeline depth, and deployment readiness.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: index * 0.05, duration: 0.28 }}
            className="surface-card"
          >
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">{metric.label}</p>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{metric.value}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{metric.detail}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
