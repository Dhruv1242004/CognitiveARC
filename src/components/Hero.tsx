"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, Github } from "lucide-react";

const pipelineSteps = [
    { label: "User Query", color: "#22d3ee" },
    { label: "Agent Planner", color: "#3b82f6" },
    { label: "Retrieval Engine", color: "#8b5cf6" },
    { label: "Memory Context", color: "#a78bfa" },
    { label: "Tool Router", color: "#6366f1" },
    { label: "LLM Response Generator", color: "#3b82f6" },
    { label: "Structured Output", color: "#22d3ee" },
];

const techTags = ["FastAPI", "Python", "RAG", "Vector Database", "Docker"];

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
    }),
};

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px]"
                    style={{
                        background:
                            "radial-gradient(ellipse at center, rgba(34,211,238,0.06) 0%, transparent 70%)",
                    }}
                />
            </div>

            <div className="max-w-6xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-20">
                {/* Left content */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col gap-6"
                >
                    <motion.div custom={0} variants={fadeIn}>
                        <span className="section-title">Autonomous AI Agent Platform</span>
                    </motion.div>

                    <motion.h1
                        custom={1}
                        variants={fadeIn}
                        className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.1] tracking-tight"
                        style={{ fontFamily: "var(--font-plus-jakarta), var(--font-inter), sans-serif" }}
                    >
                        Cognitive
                        <span className="text-[var(--accent-cyan)]">ARC</span>
                    </motion.h1>

                    <motion.p
                        custom={2}
                        variants={fadeIn}
                        className="text-[var(--text-secondary)] text-base sm:text-lg leading-relaxed max-w-lg"
                    >
                        A modular AI agent system combining retrieval, tool execution, and
                        contextual memory to perform grounded multi-step reasoning
                        workflows.
                    </motion.p>

                    <motion.div custom={3} variants={fadeIn} className="flex flex-wrap gap-3 mt-1">
                        <a href="#demo" className="btn btn-primary btn-pill">
                            <Play size={15} />
                            Live Demo
                        </a>
                        <a
                            href="https://github.com/Dhruv1242004/CognitiveARC"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-pill"
                        >
                            <Github size={15} />
                            Source Code
                        </a>
                    </motion.div>

                    <motion.div custom={4} variants={fadeIn} className="flex flex-wrap gap-2 mt-2">
                        {techTags.map((tag) => (
                            <span key={tag} className="tag">
                                {tag}
                            </span>
                        ))}
                    </motion.div>
                </motion.div>

                {/* Right — pipeline visualization */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="hidden lg:block"
                >
                    <div className="relative border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-secondary)] p-8">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-6">
                            <span className="ml-3 text-xs text-[var(--text-muted)] font-mono">
                                agent-pipeline.flow
                            </span>
                        </div>

                        {/* Pipeline steps */}
                        <div className="flex flex-col gap-0">
                            {pipelineSteps.map((step, i) => (
                                <motion.div
                                    key={step.label}
                                    initial={{ opacity: 0, x: -15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                                >
                                    <div className="flex items-center gap-3 py-2.5 px-3 group">
                                        {/* Dot + connector */}
                                        <div className="relative flex flex-col items-center">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{
                                                    background: step.color,
                                                    boxShadow: `0 0 0 2px var(--bg-secondary), 0 0 0 4px ${step.color}, 0 0 8px ${step.color}40`,
                                                }}
                                            />
                                        </div>

                                        {/* Label */}
                                        <span className="text-sm font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                                            {step.label}
                                        </span>
                                    </div>

                                    {/* Connector line */}
                                    {i < pipelineSteps.length - 1 && (
                                        <div className="flex items-center gap-3 px-3">
                                            <div className="relative flex flex-col items-center">
                                                <div className="w-[1px] h-3 bg-[var(--border-medium)]" />
                                                <ArrowRight
                                                    size={10}
                                                    className="text-[var(--text-muted)] rotate-90 -mt-0.5"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {/* Subtle pulse indicator */}
                        <div className="mt-6 flex items-center gap-2 px-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#27c93f] animate-pulse" />
                            <span className="text-[11px] text-[var(--text-muted)] font-mono">
                                Pipeline active
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
