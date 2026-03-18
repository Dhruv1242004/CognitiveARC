"use client";

import { motion } from "framer-motion";
import { Blocks, BrainCircuit, Database, FileOutput, PanelTop, Wrench } from "lucide-react";

const layers = [
  {
    title: "Client Layer",
    icon: PanelTop,
    accent: "var(--accent-cyan)",
    description: "Upload, query, trace, and output.",
    modules: ["Next.js", "Result UI"],
  },
  {
    title: "API Layer",
    icon: Blocks,
    accent: "var(--accent-blue)",
    description: "Async endpoints for upload, query, and warm health checks.",
    modules: ["FastAPI", "Background jobs"],
  },
  {
    title: "Orchestration",
    icon: BrainCircuit,
    accent: "var(--accent-indigo)",
    description: "Planner, memory, tool router, and formatter.",
    modules: ["Intent planner", "Strict mode"],
  },
  {
    title: "Retrieval",
    icon: Database,
    accent: "var(--accent-emerald)",
    description: "Structure-aware chunks with hybrid retrieval.",
    modules: ["Metadata", "Reranking"],
  },
  {
    title: "Tooling",
    icon: Wrench,
    accent: "var(--accent-amber)",
    description: "Inspectable tool execution instead of hidden generation.",
    modules: ["Vector search", "Response composition"],
  },
  {
    title: "Output",
    icon: FileOutput,
    accent: "var(--accent-violet)",
    description: "Answer packaged with sources and timings.",
    modules: ["Citations", "Runtime metrics"],
  },
];

export default function Architecture() {
  return (
    <section id="architecture" className="section-shell">
      <div className="section-header">
        <span className="section-kicker">Architecture</span>
        <h2 className="section-title-lg">Layered system map</h2>
        <p className="section-copy">
          Upload, orchestration, retrieval, and output are separated into clear runtime layers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {layers.map((layer, index) => {
          const Icon = layer.icon;
          return (
            <motion.div
              key={layer.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              className="surface-card"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                style={{ borderColor: `${layer.accent}55`, background: `${layer.accent}14` }}
              >
                <Icon size={18} style={{ color: layer.accent }} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{layer.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{layer.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {layer.modules.map((module) => (
                  <span key={module} className="demo-pill">
                    {module}
                  </span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
