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
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[15px] leading-tight font-medium text-[var(--text-secondary)]">
                                                    {node.label}
                                                </p>
                                                <p className="text-[11px] mt-0.5 text-[var(--text-muted)]">
                                                    Stage {String(i + 1).padStart(2, "0")}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );

                                    return (
                                        <div key={node.label} className="relative grid grid-cols-[1fr_auto_1fr] items-center min-h-[108px]">
                                            <div className="pr-8">{isLeft ? card : null}</div>
                                            <div className="relative w-9 h-9 flex items-center justify-center">
                                                <div className="w-2.5 h-2.5 bg-cyan-300/90 rounded-sm shadow-[0_0_10px_rgba(34,211,238,0.35)]" />
                                                <div
                                                    className={`absolute top-1/2 -translate-y-1/2 h-[2px] ${isLeft ? "right-5" : "left-5"} bg-cyan-300/55`}
                                                    style={{ width: "1.6rem" }}
                                                />
                                            </div>
                                            <div className="pl-8">{!isLeft ? card : null}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mobile fallback */}
                        <div className="relative md:hidden">
                            <div className="absolute left-3 top-2 bottom-2 w-[2px] rounded-full bg-gradient-to-b from-cyan-300 via-cyan-300/95 to-cyan-400/70 shadow-[0_0_16px_rgba(34,211,238,0.45)]" />
                            <div className="pl-8 flex flex-col gap-2.5">
                                {pipelineNodes.map((node, i) => {
                                    const Icon = node.icon;
                                    return (
                                        <div key={node.label} className="relative">
                                            <div className="absolute -left-[1.85rem] top-5 w-2.5 h-2.5 rounded-sm bg-cyan-300/90 shadow-[0_0_10px_rgba(34,211,238,0.35)]" />
                                            <motion.div
                                                whileHover={{
                                                    borderColor: "rgba(56,223,255,0.36)",
                                                    boxShadow: "0 0 0 1px rgba(34,211,238,0.14), 0 0 20px rgba(34,211,238,0.12)",
                                                    backgroundColor: "rgba(14, 31, 43, 0.50)",
                                                }}
                                                className="flex items-center gap-3 py-3 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${node.color}20` }}>
                                                    <Icon size={15} style={{ color: node.color }} />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-[var(--text-primary)]">{node.label}</p>
                                                    <p className="text-[11px] text-[var(--text-muted)]">Stage {String(i + 1).padStart(2, "0")}</p>
                                                </div>
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
