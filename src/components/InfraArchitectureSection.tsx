"use client";

import { motion } from "framer-motion";
import { Box, Cloud, Database, GitBranchPlus, Globe, ServerCog } from "lucide-react";

const infraNodes = [
  {
    title: "Next.js Frontend",
    icon: Globe,
    detail: "Recruiter-facing interface, execution visibility panels, live demo controls, and result tabs.",
  },
  {
    title: "FastAPI Backend",
    icon: ServerCog,
    detail: "Async ingestion, query routing, startup warmup, health checks, and background indexing jobs.",
  },
  {
    title: "Vector Store",
    icon: Database,
    detail: "Chroma-backed chunk storage with document metadata, section filters, and hybrid retrieval inputs.",
  },
  {
    title: "Containerization",
    icon: Box,
    detail: "Frontend and backend are structured to run as isolated services with a clean deployment boundary.",
  },
  {
    title: "CI/CD Ready",
    icon: GitBranchPlus,
    detail: "Clear service separation supports build pipelines, health probes, and environment-based promotion.",
  },
  {
    title: "Cloud Deployment Path",
    icon: Cloud,
    detail: "Designed for Vercel-style frontend hosting, API hosting, persistent vector storage, and managed secrets.",
  },
];

export default function InfraArchitectureSection() {
  return (
    <section id="infra" className="section-shell">
      <div className="section-header">
        <span className="section-kicker">Deployment / Infra</span>
        <h2 className="section-title-lg">A deployable path, not a local-only prototype</h2>
        <p className="section-copy">
          The infra section makes the project read like a shipped system: service boundaries are clear, containerization is
          accounted for, and the runtime has a credible cloud deployment story.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="console-panel p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Infra Map</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Current deployment topology</h3>
            </div>
            <span className="rounded-full border border-[var(--border-muted)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              cloud-ready
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.4rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Presentation Tier</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Next.js UI, recruiter CTA, live demo, execution trace panels</p>
            </div>
            <div className="rounded-[1.4rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Runtime Tier</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">FastAPI orchestration, ingestion jobs, retrieval pipeline, strict response mode</p>
            </div>
            <div className="rounded-[1.4rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">State Tier</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Vector persistence, metadata filters, document hashes, warm service state</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {[
              "Browser -> Next.js recruiter-facing app shell",
              "Next.js -> FastAPI `/api/upload`, `/api/query`, `/api/health`",
              "FastAPI -> parser, chunker, embedding service, vector store",
              "Vector store -> hybrid retrieval results + metadata for citations",
            ].map((row) => (
              <div key={row} className="trace-row">
                <div className="status-dot status-completed" />
                <div className="min-w-0 flex-1 text-sm text-[var(--text-secondary)]">{row}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {infraNodes.map((node, index) => {
            const Icon = node.icon;
            return (
              <motion.div
                key={node.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="surface-card"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-muted)] bg-[rgba(12,25,38,0.72)]">
                  <Icon size={18} className="text-[var(--accent-cyan)]" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{node.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{node.detail}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
