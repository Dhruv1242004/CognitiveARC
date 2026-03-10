"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    Sparkles,
    FileText,
    Wrench,
    Loader2,
    MessageSquare,
    FileUp,
    X,
    CheckCircle,
} from "lucide-react";

type Tab = "reasoning" | "context" | "tools" | "response";

interface ContextItem {
    text: string;
    source: string;
    relevance: number;
}

interface ToolItem {
    name: string;
    status: string;
    detail: string;
}

interface PipelineResult {
    reasoning: string[];
    context: ContextItem[];
    tools: ToolItem[];
    response: string;
    session_id: string;
}

interface UploadResult {
    document_id: string;
    filename: string;
    chunks: number;
    message: string;
    status: "processing" | "completed" | "failed";
}

export default function InteractiveDemo() {
    const [activeTab, setActiveTab] = useState<Tab>("reasoning");
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PipelineResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Document upload state
    const [uploadedDoc, setUploadedDoc] = useState<UploadResult | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Inline text for "Extract insights"
    const [inlineText, setInlineText] = useState("");
    const [showTextArea, setShowTextArea] = useState(false);

    const examplePrompts = [
        "Summarize this document",
        "What are the key findings?",
        "Extract insights from text",
    ];

    // ── API Calls ──

    const uploadDocument = useCallback(async (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            setUploadError("File too large (max 10MB)");
            return;
        }

        setUploading(true);
        setUploadError(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const raw = await res.text();
            let payload: Record<string, unknown> | null = null;
            if (raw) {
                try {
                    payload = JSON.parse(raw);
                } catch {
                    payload = null;
                }
            }

            if (!res.ok) {
                const detail =
                    (payload?.detail as string | undefined) ||
                    (payload?.message as string | undefined) ||
                    (raw ? raw.slice(0, 200) : undefined) ||
                    `Upload failed (${res.status})`;
                throw new Error(detail);
            }

            if (
                !payload ||
                typeof payload.document_id !== "string" ||
                typeof payload.filename !== "string" ||
                typeof payload.chunks !== "number" ||
                (payload.status !== "processing" &&
                    payload.status !== "completed" &&
                    payload.status !== "failed")
            ) {
                throw new Error("Invalid upload response from server");
            }

            setUploadedDoc(payload as unknown as UploadResult);
            setUploading((payload.status as UploadResult["status"]) === "processing");
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Upload failed";
            setUploadError(msg);
        } finally {
            setUploading(false);
        }
    }, []);

    useEffect(() => {
        if (!uploadedDoc || uploadedDoc.status !== "processing") {
            if (pollTimeoutRef.current) {
                clearTimeout(pollTimeoutRef.current);
                pollTimeoutRef.current = null;
            }
            return;
        }

        let cancelled = false;
        const pollStatus = async () => {
            try {
                const res = await fetch(`/api/upload/${uploadedDoc.document_id}`);
                const raw = await res.text();
                let payload: Record<string, unknown> | null = null;
                if (raw) {
                    try {
                        payload = JSON.parse(raw);
                    } catch {
                        payload = null;
                    }
                }

                if (!res.ok) {
                    const detail =
                        (payload?.detail as string | undefined) ||
                        (payload?.message as string | undefined) ||
                        `Upload failed (${res.status})`;
                    throw new Error(detail);
                }

                if (
                    !payload ||
                    typeof payload.document_id !== "string" ||
                    typeof payload.filename !== "string" ||
                    typeof payload.chunks !== "number" ||
                    (payload.status !== "processing" &&
                        payload.status !== "completed" &&
                        payload.status !== "failed")
                ) {
                    throw new Error("Invalid upload status response");
                }

                if (cancelled) return;
                const next = payload as unknown as UploadResult;
                setUploadedDoc(next);
                setUploading(next.status === "processing");
                if (next.status === "failed") {
                    setUploadError(next.message);
                    return;
                }
                if (next.status === "processing") {
                    pollTimeoutRef.current = setTimeout(pollStatus, 1200);
                }
            } catch (e: unknown) {
                if (cancelled) return;
                const msg = e instanceof Error ? e.message : "Upload failed";
                setUploadError(msg);
                setUploading(false);
            }
        };

        pollTimeoutRef.current = setTimeout(pollStatus, 900);
        return () => {
            cancelled = true;
            if (pollTimeoutRef.current) {
                clearTimeout(pollTimeoutRef.current);
                pollTimeoutRef.current = null;
            }
        };
    }, [uploadedDoc]);

    const runQuery = useCallback(
        async (query: string, textInput?: string) => {
            setLoading(true);
            setError(null);
            setResult(null);
            setActiveTab("reasoning");

            try {
                const body: Record<string, string | undefined> = {
                    query,
                    session_id: sessionId || undefined,
                    document_id: uploadedDoc?.document_id || undefined,
                };
                if (textInput?.trim()) {
                    body.inline_text = textInput.trim();
                }

                const res = await fetch("/api/query", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    let errorMsg = "Query failed";
                    try {
                        const err = await res.json();
                        errorMsg = err.detail || errorMsg;
                        // Clean up verbose API error messages
                        if (errorMsg.includes("rate") || errorMsg.includes("quota") || errorMsg.includes("429")) {
                            errorMsg = "Rate limit reached. Please wait a moment and try again.";
                        }
                    } catch {
                        errorMsg = `Server error (${res.status})`;
                    }
                    throw new Error(errorMsg);
                }

                const data: PipelineResult = await res.json();
                setResult(data);
                setSessionId(data.session_id);
                setActiveTab("response");
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "Query failed";
                setError(msg);
            } finally {
                setLoading(false);
            }
        },
        [sessionId, uploadedDoc]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;
        if (uploadedDoc?.status === "processing") {
            setError("Document is still being indexed. Please wait a moment.");
            return;
        }
        const text = showTextArea ? inlineText : undefined;
        runQuery(input.trim(), text);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadDocument(file);
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) uploadDocument(file);
    };

    const tabs: { key: Tab; label: string; icon: typeof Sparkles }[] = [
        { key: "reasoning", label: "Agent Reasoning", icon: Sparkles },
        { key: "context", label: "Retrieved Context", icon: FileText },
        { key: "tools", label: "Tool Activity", icon: Wrench },
        { key: "response", label: "AI Response", icon: MessageSquare },
    ];

    return (
        <section id="demo" className="section">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-14"
                >
                    <span className="section-title">Interactive</span>
                    <h2 className="section-heading text-center">Agent Demo</h2>
                    <p className="section-description mx-auto text-center">
                        Upload a document or enter a prompt — powered by a real AI agent
                        with RAG, tool orchestration, and Groq LLM.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid lg:grid-cols-[1fr_1.5fr] gap-6"
                >
                    {/* Left — Input Panel */}
                    <div className="flex flex-col gap-4">
                        {/* Document Upload */}
                        <div
                            className="card flex flex-col gap-3"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)]" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-cyan)]">
                                        Knowledge Base
                                    </span>
                                </div>
                                {uploadedDoc && (
                                    <button
                                        onClick={() => {
                                            setUploadedDoc(null);
                                            setUploadError(null);
                                            setUploading(false);
                                        }}
                                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {uploadedDoc ? (
                                <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                                    uploadedDoc.status === "completed"
                                        ? "bg-green-950/20 border-green-900/40"
                                        : "bg-[var(--bg-primary)] border-[var(--border-medium)]"
                                }`}>
                                    {uploadedDoc.status === "completed" ? (
                                        <CheckCircle size={16} className="text-green-400 shrink-0" />
                                    ) : (
                                        <Loader2 size={16} className="animate-spin text-[var(--accent-cyan)] shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className={`text-sm font-medium truncate ${
                                            uploadedDoc.status === "completed"
                                                ? "text-green-400"
                                                : "text-[var(--text-secondary)]"
                                        }`}>
                                            {uploadedDoc.filename}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {uploadedDoc.status === "completed"
                                                ? `${uploadedDoc.chunks} chunks indexed`
                                                : "Indexing document..."}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex flex-col items-center gap-2 px-4 py-5 rounded-lg border border-dashed border-[var(--border-medium)] hover:border-[var(--accent-cyan)] bg-[var(--bg-primary)] transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <Loader2 size={20} className="animate-spin text-[var(--accent-cyan)]" />
                                    ) : (
                                        <FileUp size={20} className="text-[var(--text-muted)]" />
                                    )}
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {uploading ? "Uploading and indexing..." : "Drop a PDF or click to upload"}
                                    </span>
                                </button>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {uploadError && (
                                <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2">
                                    <p className="text-xs text-red-300/80">{uploadError}</p>
                                </div>
                            )}
                        </div>

                        {/* Query Input */}
                        <div className="card flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)]" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-cyan)]">
                                    Query
                                </span>
                            </div>

                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={uploadedDoc ? "Ask about your document..." : "Enter your prompt..."}
                                    disabled={loading || uploadedDoc?.status === "processing"}
                                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim() || uploadedDoc?.status === "processing"}
                                    className="btn btn-primary px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Send size={16} />
                                    )}
                                </button>
                            </form>

                            {/* Toggle text area for insights */}
                            <button
                                onClick={() => setShowTextArea(!showTextArea)}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors text-left"
                            >
                                {showTextArea ? "▾ Hide text input" : "▸ Paste text for analysis"}
                            </button>

                            <AnimatePresence>
                                {showTextArea && (
                                    <motion.textarea
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        value={inlineText}
                                        onChange={(e) => setInlineText(e.target.value)}
                                        placeholder="Paste text here for the agent to analyze..."
                                        rows={4}
                                        className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors resize-none"
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Example prompts */}
                        <div className="card flex flex-col gap-3">
                            <span className="text-xs text-[var(--text-muted)] font-medium">
                                Example prompts
                            </span>
                            <div className="flex flex-col gap-2">
                                {examplePrompts.map((prompt) => (
                                    <button
                                        key={prompt}
                                        onClick={() => {
                                            setInput(prompt);
                                            if (prompt === "Extract insights from text") {
                                                setShowTextArea(true);
                                            }
                                        }}
                                        disabled={loading}
                                        className="text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-lg px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error display */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="card border-red-900/40 bg-red-950/20"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-400" />
                                    <span className="text-xs font-medium text-red-400">Error</span>
                                </div>
                                <p className="text-xs text-red-300/70 mt-1.5">{error}</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Right — Output panels */}
                    <div className="card p-0 overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-[var(--border-subtle)]">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const hasContent =
                                    (tab.key === "reasoning" && (result?.reasoning?.length ?? 0) > 0) ||
                                    (tab.key === "context" && (result?.context?.length ?? 0) > 0) ||
                                    (tab.key === "tools" && (result?.tools?.length ?? 0) > 0) ||
                                    (tab.key === "response" && !!result?.response);
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-medium transition-colors relative ${activeTab === tab.key
                                            ? "text-[var(--accent-cyan)] border-b-2 border-[var(--accent-cyan)]"
                                            : hasContent
                                                ? "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                                            }`}
                                    >
                                        <Icon size={14} />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                        {hasContent && activeTab !== tab.key && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] absolute top-2.5 right-3" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Panel content */}
                        <div className="p-6 min-h-[380px]">
                            {/* Loading state */}
                            {loading && (
                                <div className="flex flex-col items-center justify-center h-56 gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-2 border-[var(--border-subtle)] border-t-[var(--accent-cyan)] animate-spin" />
                                        <Sparkles size={20} className="text-[var(--accent-cyan)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-[var(--text-primary)] font-medium">Agent pipeline running...</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">Planning → Retrieving → Generating</p>
                                    </div>
                                </div>
                            )}

                            {/* Results */}
                            {!loading && result && (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {activeTab === "reasoning" && (
                                            <div className="flex flex-col gap-1">
                                                {result.reasoning.map((step, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="text-sm font-mono text-[var(--text-secondary)] py-1.5 px-3 rounded-md hover:bg-[var(--bg-primary)] transition-colors"
                                                    >
                                                        {step}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === "context" && (
                                            <div className="flex flex-col gap-3">
                                                {result.context.length === 0 ? (
                                                    <p className="text-sm text-[var(--text-muted)] text-center py-8">
                                                        No documents retrieved. Upload a PDF or paste text to enable RAG.
                                                    </p>
                                                ) : (
                                                    result.context.map((ctx, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: i * 0.08 }}
                                                            className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-4"
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                                                                    <FileText size={12} className="text-[var(--accent-cyan)]" />
                                                                    {ctx.source}
                                                                </span>
                                                                <span className="text-xs font-mono text-[var(--accent-cyan)]">
                                                                    relevance: {ctx.relevance}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                                                {ctx.text}
                                                            </p>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {activeTab === "tools" && (
                                            <div className="flex flex-col gap-2">
                                                {result.tools.map((tool, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.08 }}
                                                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${tool.status === "completed" ? "bg-green-400" : "bg-red-400"}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-medium text-[var(--text-primary)]">{tool.name}</span>
                                                            <span className="text-xs text-[var(--text-muted)] ml-2">— {tool.detail}</span>
                                                        </div>
                                                        <span className={`text-xs font-mono ${tool.status === "completed" ? "text-green-400" : "text-red-400"}`}>
                                                            ✓
                                                        </span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === "response" && (
                                            <div className="prose-sm">
                                                <div className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                                    {renderMarkdown(result.response)}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            )}

                            {/* Empty state */}
                            {!loading && !result && !error && (
                                <div className="flex flex-col items-center justify-center h-56 gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--accent-cyan-dim)] flex items-center justify-center">
                                        <Sparkles size={20} className="text-[var(--accent-cyan)]" />
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] text-center">
                                        Upload a document or enter a prompt to
                                        <br />
                                        start the real agent pipeline
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// ── Markdown-like renderer ──

function renderMarkdown(text: string) {
    if (!text) return null;
    const lines = text.split("\n");

    return lines.map((line, i) => {
        // Empty lines
        if (line.trim() === "") return <div key={i} className="h-2" />;

        // Headers
        if (line.startsWith("## ")) {
            return (
                <h3 key={i} className="text-base font-semibold text-[var(--text-primary)] mt-3 mb-1">
                    {line.replace("## ", "")}
                </h3>
            );
        }
        if (line.startsWith("# ")) {
            return (
                <h2 key={i} className="text-lg font-bold text-[var(--text-primary)] mt-3 mb-1">
                    {line.replace("# ", "")}
                </h2>
            );
        }
        if (line.startsWith("### ")) {
            return (
                <h4 key={i} className="text-sm font-semibold text-[var(--text-primary)] mt-2 mb-1">
                    {line.replace("### ", "")}
                </h4>
            );
        }

        // Bullet points
        if (line.match(/^[\-\*•]\s/)) {
            return (
                <div key={i} className="text-sm text-[var(--text-secondary)] py-0.5 pl-4">
                    <span className="text-[var(--accent-cyan)] mr-2">•</span>
                    {parseBold(line.replace(/^[\-\*•]\s/, ""))}
                </div>
            );
        }

        // Numbered lists
        if (line.match(/^\d+\.\s/)) {
            return (
                <div key={i} className="text-sm text-[var(--text-secondary)] py-0.5 pl-4">
                    {parseBold(line)}
                </div>
            );
        }

        // Regular text with bold support
        return (
            <p key={i} className="text-sm text-[var(--text-secondary)] py-0.5">
                {parseBold(line)}
            </p>
        );
    });
}

function parseBold(text: string) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    if (parts.length === 1) return <>{text}</>;
    return (
        <>
            {parts.map((part, idx) =>
                idx % 2 === 1 ? (
                    <strong key={idx} className="font-semibold text-[var(--text-primary)]">
                        {part}
                    </strong>
                ) : (
                    <span key={idx}>{part}</span>
                )
            )}
        </>
    );
}
