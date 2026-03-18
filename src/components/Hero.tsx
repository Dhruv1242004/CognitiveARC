"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Github, Play } from "lucide-react";

const credibilityChips = [
  "Modular Agent Pipeline",
  "RAG + Memory",
  "Tool Orchestration",
  "FastAPI + Docker",
];

const miniTrace = [
  { label: "planner", status: "completed", detail: "retrieval-backed task", ms: "28ms" },
  { label: "retriever", status: "completed", detail: "6 ranked chunks", ms: "84ms" },
  { label: "memory", status: "completed", detail: "session context loaded", ms: "7ms" },
  { label: "generator", status: "running", detail: "assembling grounded answer", ms: "live" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-18 sm:pt-32 sm:pb-22">
      <div className="hero-backdrop" />
      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10"
        >
          <div className="eyebrow-chip">Autonomous AI Agent Platform</div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl lg:text-[4.35rem] lg:leading-[1.02]">
            CognitiveARC turns planning, retrieval, memory, and tools into a visible agent runtime.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
            Built as an architecture-first AI product with grounded retrieval, execution trace visibility, and a deployable full-stack backend.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {credibilityChips.map((chip) => (
              <span key={chip} className="credibility-chip">
                <CheckCircle2 size={14} />
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#demo" className="btn btn-primary">
              <Play size={16} />
              Launch Live Demo
            </a>
            <a href="#execution-trace" className="btn btn-secondary">
              View Execution Trace
              <ArrowRight size={16} />
            </a>
            <a
              href="https://github.com/Dhruv1242004/CognitiveARC"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-tertiary"
            >
              <Github size={16} />
              Source Code
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="hero-stat-card">
              <span className="hero-stat-value">6 stages</span>
              <span className="hero-stat-label">Visible execution pipeline</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-value">Hybrid RAG</span>
              <span className="hero-stat-label">Semantic + keyword retrieval</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-value">Warm startup</span>
              <span className="hero-stat-label">Preloaded embedding path</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08, duration: 0.6 }}
          className="relative z-10"
        >
          <div className="console-panel overflow-hidden">
            <div className="console-topbar">
              <div className="console-lights">
                <span />
                <span />
                <span />
              </div>
              <span className="console-title">live-run.preview</span>
            </div>

            <div className="grid gap-5 p-5 sm:p-6">
              <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--panel-strong)] p-4">
                <div className="flex items-center justify-between text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">
                  <span>Input</span>
                  <span>session 7af2b1</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-primary)]">
                  Extract milestones and risks from the uploaded planning materials.
                </p>
              </div>

              <div className="space-y-3">
                {miniTrace.map((step, index) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 + index * 0.05, duration: 0.35 }}
                    className="trace-row"
                  >
                    <div className={`status-dot status-${step.status}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-[0.82rem] text-[var(--text-primary)]">{step.label}</span>
                        <span className="trace-ms">{step.ms}</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{step.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="rounded-2xl border border-[rgba(114,226,169,0.18)] bg-[rgba(29,57,45,0.35)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[0.72rem] uppercase tracking-[0.22em] text-[var(--accent-emerald)]">Structured Output</span>
                  <span className="rounded-full border border-[rgba(114,226,169,0.2)] px-2 py-1 text-[0.66rem] text-[var(--accent-emerald)]">
                    grounded
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-primary)]">
                  Milestones validated against indexed sections with cited evidence.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
