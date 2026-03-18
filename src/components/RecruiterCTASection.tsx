"use client";

import { ArrowUpRight, FileText, Github, Layers3, PlayCircle } from "lucide-react";

const links = [
  {
    title: "Live Demo",
    href: "#demo",
    icon: PlayCircle,
    detail: "Open the upload, indexing, retrieval, and execution panels.",
  },
  {
    title: "Source Code",
    href: "https://github.com/Dhruv1242004/CognitiveARC",
    icon: Github,
    detail: "Review the frontend systems UI and backend RAG pipeline implementation.",
  },
  {
    title: "Architecture Docs",
    href: "https://github.com/Dhruv1242004/CognitiveARC/blob/main/README.md",
    icon: Layers3,
    detail: "See the project structure, stack decisions, and deployment direction.",
  },
];

export default function RecruiterCTASection() {
  return (
    <section className="section-shell pt-0">
      <div className="console-panel overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="section-kicker">Recruiter CTA</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
              Interview-ready summary: full-stack AI infra, visible execution, and deployable architecture.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
              CognitiveARC demonstrates backend systems thinking, retrieval quality work, runtime observability, and a polished
              product interface. It is designed to trigger a deeper engineering conversation, not just skimmed portfolio interest.
            </p>

            <div className="mt-6 rounded-[1.35rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <FileText size={15} className="text-[var(--accent-cyan)]" />
                Recruiter-friendly summary
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Built with `Next.js`, `TypeScript`, `FastAPI`, `Python`, `Chroma`, format-aware document parsing, structure-aware
                chunking, hybrid retrieval, startup warmup, strict grounded responses, and explicit execution trace visibility.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {links.map((link) => {
              const Icon = link.icon;
              const external = link.href.startsWith("http");
              return (
                <a
                  key={link.title}
                  href={link.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="surface-card group block"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-muted)] bg-[rgba(12,25,38,0.72)]">
                      <Icon size={18} className="text-[var(--accent-cyan)]" />
                    </div>
                    <ArrowUpRight size={18} className="text-[var(--text-dim)] transition group-hover:text-[var(--text-primary)]" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{link.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{link.detail}</p>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
