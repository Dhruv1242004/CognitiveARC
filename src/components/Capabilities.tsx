"use client";

import { motion } from "framer-motion";
import { Brain, Search, Wrench, MessageSquare } from "lucide-react";

const capabilities = [
    {
        icon: Brain,
        title: "Multi-Step Reasoning",
        description:
            "Agent interprets user intent and plans execution steps before generating a response.",
        color: "#8b5cf6",
    },
    {
        icon: Search,
        title: "Retrieval Augmented Generation",
        description:
            "Semantic search retrieves relevant information to ground responses and reduce hallucinations.",
        color: "#3b82f6",
    },
    {
        icon: Wrench,
        title: "Tool Execution Layer",
        description:
            "Agent can call external tools such as web search, document parsers, or APIs.",
        color: "#22d3ee",
    },
    {
        icon: MessageSquare,
        title: "Contextual Memory",
        description:
            "Short-term memory maintains session context for coherent multi-turn interactions.",
        color: "#6366f1",
    },
];

export default function Capabilities() {
    return (
        <section id="capabilities" className="section">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-14"
                >
                    <span className="section-title">Core Features</span>
                    <h2 className="section-heading text-center">Core Capabilities</h2>
                    <p className="section-description mx-auto text-center">
                        Four foundational capabilities that enable intelligent, grounded AI
                        agent behavior.
                    </p>
                </motion.div>

                {/* Cards grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                    {capabilities.map((cap, i) => {
                        const Icon = cap.icon;
                        return (
                            <motion.div
                                key={cap.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-60px" }}
                                transition={{ delay: i * 0.08, duration: 0.4 }}
                                className="card group"
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                                    style={{ background: `${cap.color}12` }}
                                >
                                    <Icon size={20} style={{ color: cap.color }} />
                                </div>
                                <h3 className="text-[0.9375rem] font-semibold text-[var(--text-primary)] mb-2">
                                    {cap.title}
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                    {cap.description}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
