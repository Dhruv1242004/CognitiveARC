"use client";

import { motion } from "framer-motion";
import { GitBranch, Zap, Shield, Container } from "lucide-react";

const highlights = [
    {
        icon: GitBranch,
        title: "Modular Agent Pipeline",
        description:
            "Planner, retrieval, memory, and execution layers separated for extensibility.",
        color: "#8b5cf6",
    },
    {
        icon: Zap,
        title: "Async Backend Architecture",
        description:
            "FastAPI async endpoints support concurrent request handling.",
        color: "#22d3ee",
    },
    {
        icon: Shield,
        title: "Grounded AI Responses",
        description:
            "Retrieval pipelines reduce hallucination by injecting relevant context.",
        color: "#3b82f6",
    },
    {
        icon: Container,
        title: "Containerized Deployment",
        description:
            "Dockerized services allow scalable and portable deployments.",
        color: "#6366f1",
    },
];

export default function EngineeringHighlights() {
    return (
        <section className="section">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-14"
                >
                    <span className="section-title">Engineering</span>
                    <h2 className="section-heading text-center">
                        Engineering Highlights
                    </h2>
                    <p className="section-description mx-auto text-center">
                        Key engineering decisions designed for production-grade AI systems.
                    </p>
                </motion.div>

                {/* Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {highlights.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-60px" }}
                                transition={{ delay: i * 0.08, duration: 0.4 }}
                                className="card group text-center"
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-4"
                                    style={{ background: `${item.color}12` }}
                                >
                                    <Icon size={20} style={{ color: item.color }} />
                                </div>
                                <h3 className="text-[0.9375rem] font-semibold text-[var(--text-primary)] mb-2">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                    {item.description}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
