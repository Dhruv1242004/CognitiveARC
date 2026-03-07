"use client";

import { motion } from "framer-motion";
import { Github, FileText } from "lucide-react";

const stackGroups = [
    {
        category: "Frontend",
        items: ["Next.js", "TypeScript", "Tailwind CSS"],
        color: "#22d3ee",
    },
    {
        category: "Backend",
        items: ["FastAPI", "Python", "Async API Design"],
        color: "#3b82f6",
    },
    {
        category: "AI Systems",
        items: ["LLM APIs", "RAG", "Embeddings", "Vector Search"],
        color: "#8b5cf6",
    },
    {
        category: "Infrastructure",
        items: ["Docker", "PostgreSQL"],
        color: "#6366f1",
    },
];

export default function TechStack() {
    return (
        <section id="tech-stack" className="section">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-14"
                >
                    <span className="section-title">Technology</span>
                    <h2 className="section-heading text-center">Tech Stack & Source</h2>
                    <p className="section-description mx-auto text-center">
                        Built with modern, production-ready tools for performance, scalability, and developer experience.
                    </p>
                </motion.div>

                {/* Stack grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
                >
                    {stackGroups.map((group) => (
                        <div key={group.category} className="card">
                            <div className="flex items-center gap-2 mb-4">
                                <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: group.color }}
                                />
                                <span
                                    className="text-xs font-semibold uppercase tracking-wider"
                                    style={{ color: group.color }}
                                >
                                    {group.category}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {group.items.map((item) => (
                                    <span key={item} className="tag">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* CTA buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="flex justify-center gap-4 flex-wrap"
                >
                    <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        <Github size={16} />
                        View Source Code
                    </a>
                    <a href="#" className="btn btn-secondary">
                        <FileText size={16} />
                        Project Documentation
                    </a>
                </motion.div>
            </div>
        </section>
    );
}
