"use client";

import { motion } from "framer-motion";
import { Server, Cpu, Database, Cloud, Layers, Brain, Send, FileOutput } from "lucide-react";

const pipelineNodes = [
    { label: "User Interface", icon: Layers, color: "#22d3ee" },
    { label: "API Gateway (FastAPI)", icon: Server, color: "#3b82f6" },
    { label: "Agent Planner", icon: Brain, color: "#8b5cf6" },
    { label: "Retrieval Engine", icon: Send, color: "#6366f1" },
    { label: "Vector Database", icon: Database, color: "#a78bfa" },
    { label: "Memory Manager", icon: Cpu, color: "#8b5cf6" },
    { label: "Tool Router", icon: Cloud, color: "#6366f1" },
    { label: "LLM Processing Layer", icon: Brain, color: "#3b82f6" },
    { label: "Response Composer", icon: FileOutput, color: "#22d3ee" },
    { label: "Structured Output", icon: Layers, color: "#22d3ee" },
];

const systemStack = [
    {
        category: "Backend",
        items: ["FastAPI", "Python"],
        color: "#3b82f6",
    },
    {
        category: "AI Layer",
        items: ["LLM APIs", "RAG Pipelines", "Embeddings"],
        color: "#8b5cf6",
    },
    {
        category: "Data Layer",
        items: ["Vector Database", "PostgreSQL"],
        color: "#6366f1",
    },
    {
        category: "Infrastructure",
        items: ["Docker Containerization"],
        color: "#22d3ee",
    },
];

export default function Architecture() {
    return (
        <section id="architecture" className="section">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <span className="section-title">System Design</span>
                    <h2 className="section-heading text-center">System Architecture</h2>
                    <p className="section-description mx-auto text-center">
                        End-to-end pipeline from user input to structured AI response,
                        designed for modularity and extensibility.
                    </p>
                </motion.div>

                {/* Pipeline diagram */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="max-w-5xl mx-auto mb-20"
                >
                    <div className="relative overflow-hidden border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-secondary)] p-5 sm:p-7">
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute -top-20 right-0 w-72 h-72 rounded-full bg-cyan-500/12 blur-3xl" />
                            <div className="absolute -bottom-24 left-0 w-72 h-72 rounded-full bg-blue-500/12 blur-3xl" />
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
                        </div>

                        <div className="relative hidden md:block">
                            <div className="absolute left-1/2 -translate-x-1/2 top-6 bottom-6 w-[2px] rounded-full bg-gradient-to-b from-cyan-300 via-cyan-300/95 to-cyan-400/70 shadow-[0_0_20px_rgba(34,211,238,0.55)]" />

                            <div className="flex flex-col">
                                {pipelineNodes.map((node, i) => {
                                    const Icon = node.icon;
                                    const isLeft = i % 2 === 0;

                                    const card = (
                                        <motion.div
                                            initial={{ opacity: 0, y: 12 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.05, duration: 0.32 }}
                                            whileHover={{
                                                borderColor: "rgba(56,223,255,0.36)",
                                                boxShadow: "0 0 0 1px rgba(34,211,238,0.14), 0 0 20px rgba(34,211,238,0.12)",
                                                backgroundColor: "rgba(14, 31, 43, 0.50)",
                                            }}
                                            className="flex items-center gap-3 py-3.5 px-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] backdrop-blur-[2px] transition-colors"
                                        >
                                            <div
                                                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                                                style={{
                                                    background: `${node.color}16`,
                                                }}
                                            >
                                                <Icon size={16} style={{ color: node.color }} />
                                            </div>
                                            <p className="text-[15px] leading-tight font-medium text-[var(--text-secondary)]">
                                                {node.label}
                                            </p>
                                        </motion.div>
                                    );

                                    return (
                                        <div key={node.label} className="relative grid grid-cols-[1fr_auto_1fr] items-center min-h-[96px]">
                                            <div className="pr-6">{isLeft ? card : null}</div>
                                            <div className="relative w-10 h-10 flex items-center justify-center">
                                                {/* Connector line (behind badge) */}
                                                <div
                                                    className={`absolute top-1/2 -translate-y-1/2 h-[2px] bg-cyan-300/40 ${isLeft ? "-left-4" : "-right-4"}`}
                                                    style={{ width: "1.25rem" }}
                                                />
                                                {/* Number badge (on top) */}
                                                <div
                                                    className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center border shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                                                    style={{
                                                        background: `color-mix(in srgb, ${node.color} 15%, #0c1824)`,
                                                        borderColor: `${node.color}50`,
                                                    }}
                                                >
                                                    <span
                                                        className="text-[11px] font-bold leading-none"
                                                        style={{ color: node.color }}
                                                    >
                                                        {String(i + 1).padStart(2, "0")}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="pl-6">{!isLeft ? card : null}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mobile layout */}
                        <div className="relative md:hidden">
                            {/* Center glow line */}
                            <div className="absolute left-[1.15rem] top-0 bottom-0 w-[2px] rounded-full bg-gradient-to-b from-cyan-400/80 via-blue-500/60 to-purple-500/40" />

                            <div className="flex flex-col gap-0">
                                {pipelineNodes.map((node, i) => {
                                    const Icon = node.icon;
                                    const isLast = i === pipelineNodes.length - 1;
                                    return (
                                        <div key={node.label} className="relative flex items-stretch">
                                            {/* Timeline dot + connector */}
                                            <div className="flex flex-col items-center shrink-0 w-[2.35rem]">
                                                <div
                                                    className="w-[1.65rem] h-[1.65rem] rounded-full flex items-center justify-center shrink-0 mt-3 border border-[rgba(34,211,238,0.25)] backdrop-blur-sm"
                                                    style={{ background: `${node.color}22` }}
                                                >
                                                    <span
                                                        className="text-[9px] font-bold leading-none"
                                                        style={{ color: node.color }}
                                                    >
                                                        {String(i + 1).padStart(2, "0")}
                                                    </span>
                                                </div>
                                                {!isLast && (
                                                    <div className="flex-1 w-[2px] bg-gradient-to-b from-cyan-400/30 to-transparent min-h-[0.5rem]" />
                                                )}
                                            </div>

                                            {/* Card */}
                                            <motion.div
                                                initial={{ opacity: 0, x: -8 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.04, duration: 0.25 }}
                                                className="flex-1 ml-2 mb-2 flex items-center gap-2.5 py-2.5 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/80 backdrop-blur-sm"
                                            >
                                                <div
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ background: `${node.color}18` }}
                                                >
                                                    <Icon size={13} style={{ color: node.color }} />
                                                </div>
                                                <p className="text-[13px] leading-tight font-medium text-[var(--text-secondary)]">
                                                    {node.label}
                                                </p>
                                            </motion.div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* System stack */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {systemStack.map((stack) => (
                            <div key={stack.category} className="card">
                                <div className="flex items-center gap-2 mb-4">
                                    <div
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: stack.color }}
                                    />
                                    <span
                                        className="text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: stack.color }}
                                    >
                                        {stack.category}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {stack.items.map((item) => (
                                        <span
                                            key={item}
                                            className="text-sm text-[var(--text-secondary)]"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
