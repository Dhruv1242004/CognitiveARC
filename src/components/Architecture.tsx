"use client";

import { motion } from "framer-motion";
import { Blocks, BrainCircuit, Database, PanelTop, Wrench, FileOutput } from "lucide-react";

const layers = [
  {
    title: "Client Layer",
    icon: PanelTop,
    accent: "var(--accent-cyan)",
    description: "Recruiter-facing systems UI with upload controls, indexed-state gating, trace visibility, and structured result views.",
    modules: ["Next.js app shell", "Execution console", "Upload + query state", "Result tabs"],
  },
  {
    title: "API Layer",
    icon: Blocks,
    accent: "var(--accent-blue)",
    description: "Async FastAPI endpoints coordinate warm startup, ingestion jobs, health checks, and query execution.",
    modules: ["Upload API", "Query API", "Warm health endpoint", "Background task orchestration"],
  },
  {
    title: "Orchestration Layer",
    icon: BrainCircuit,
    accent: "var(--accent-indigo)",
    description: "Planner, memory, tool router, and response composer run as separate stages with explicit runtime signals.",
    modules: ["Intent planner", "Session memory", "Tool router", "Strict response formatter"],
  },
  {
    title: "Retrieval / Memory Layer",
    icon: Database,
    accent: "var(--accent-emerald)",
    description: "Structure-aware chunks are embedded once, indexed with metadata, and retrieved through hybrid reranking.",
    modules: ["Hybrid retrieval", "Section metadata", "Short-term memory", "Chunk citations"],
  },
  {
    title: "Tooling Layer",
    icon: Wrench,
    accent: "var(--accent-amber)",
    description: "Tool invocations remain inspectable so the agent shows routed execution, not opaque text generation.",
    modules: ["Vector search", "Text analysis", "Response composition", "Future tool adapters"],
  },
  {
    title: "Output Layer",
    icon: FileOutput,
    accent: "var(--accent-violet)",
    description: "Final answers are packaged with excerpts, source metadata, and per-stage timings for explainable output assembly.",
    modules: ["Structured answer", "Supporting excerpts", "Source references", "Timing metrics"],
  },
];

export default function Architecture() {
  return (
    <section id="architecture" className="section-shell">
      <div className="section-header">
        <span className="section-kicker">Architecture</span>
        <h2 className="section-title-lg">Layered system map for an observable agent runtime</h2>
        <p className="section-copy">
          The site now shows CognitiveARC as an orchestration product: upload and retrieval are distinct from planning,
          tool execution, and grounded response assembly.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="console-panel p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Systems Map</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Runtime layers</h3>
            </div>
            <div className="rounded-full border border-[var(--border-muted)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              6 layers
            </div>
          </div>

          <div className="relative mt-8">
            <div className="absolute bottom-0 left-[22px] top-2 w-px bg-[linear-gradient(180deg,rgba(87,187,255,0.35),rgba(87,187,255,0.05))]" />
            <div className="space-y-5">
              {layers.map((layer, index) => {
                const Icon = layer.icon;
                return (
                  <motion.div
                    key={layer.title}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ delay: index * 0.06, duration: 0.32 }}
                    className="relative flex gap-4"
                  >
                    <div
                      className="relative z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                      style={{ borderColor: `${layer.accent}55`, background: `${layer.accent}14` }}
                    >
                      <Icon size={18} style={{ color: layer.accent }} />
                    </div>
                    <div className="flex-1 rounded-3xl border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-base font-semibold text-[var(--text-primary)]">{layer.title}</h4>
                        <span className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                          layer {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{layer.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {layers.map((layer, index) => (
            <motion.div
              key={`${layer.title}-card`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0.08 + index * 0.05, duration: 0.35 }}
              className="surface-card"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{layer.title}</h3>
                <span className="rounded-full border border-[var(--border-muted)] px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">
                  modules
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {layer.modules.map((module) => (
                  <div key={module} className="rounded-2xl border border-[var(--border-muted)] bg-[var(--panel-strong)] px-3.5 py-3 text-sm text-[var(--text-secondary)]">
                    {module}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
