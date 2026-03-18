"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Braces,
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  MessageSquareText,
  Radar,
  ShieldCheck,
  UploadCloud,
  Wrench,
} from "lucide-react";

type ResultTab = "output" | "reasoning" | "context" | "tools";
type StageStatus = "queued" | "running" | "completed" | "failed" | "retried";

interface UploadStage {
  key: string;
  label: string;
  status: StageStatus;
  detail: string;
  timing_ms?: number | null;
}

interface UploadResult {
  document_id: string;
  filename: string;
  chunks: number;
  message: string;
  status: "processing" | "completed" | "failed";
  file_hash: string;
  stages: UploadStage[];
  timings: Record<string, number>;
  document_type?: string | null;
  category?: string | null;
  title?: string | null;
  suggested_prompts?: string[];
}

interface ExecutionTraceStep {
  key: string;
  label: string;
  description: string;
  status: StageStatus;
  timing_ms: number;
  input?: string | null;
  output?: string | null;
  logs?: string[];
}

interface ContextItem {
  text: string;
  source: string;
  relevance: number;
  section_title?: string | null;
  page_number?: number | null;
  slide_number?: number | null;
}

interface ToolItem {
  name: string;
  status: string;
  detail: string;
  duration_ms?: number;
}

interface StructuredOutput {
  answer: string;
  supporting_excerpts: Array<{
    citation: string;
    excerpt: string;
    source: string;
    section_title?: string | null;
    page_number?: number | null;
    slide_number?: number | null;
    score?: number;
  }>;
  sources: Array<{
    document: string;
    section_title?: string | null;
    page_number?: number | null;
    slide_number?: number | null;
  }>;
}

interface PipelineResult {
  query: string;
  reasoning: string[];
  context: ContextItem[];
  tools: ToolItem[];
  response: string;
  session_id: string;
  execution_trace: ExecutionTraceStep[];
  structured_output: StructuredOutput;
  timings: Record<string, number>;
  strict_mode: boolean;
}

const fallbackPrompts = [
  "What milestones are explicitly mentioned in this document?",
  "Which section discusses risks or blockers?",
  "Extract action items with evidence.",
];

const defaultUploadStages: UploadStage[] = [
  { key: "parsing", label: "Parsing", status: "queued", detail: "Format-aware extraction path", timing_ms: null },
  { key: "chunking", label: "Chunking", status: "queued", detail: "Structure-aware semantic chunks", timing_ms: null },
  { key: "embedding", label: "Embedding", status: "queued", detail: "Persistent embedding service", timing_ms: null },
  { key: "indexing", label: "Indexing", status: "queued", detail: "Vector + metadata persistence", timing_ms: null },
];

const tabMeta: Record<ResultTab, { label: string; icon: ComponentType<{ size?: number }>; }> = {
  output: { label: "Answer", icon: Braces },
  reasoning: { label: "Trace", icon: Radar },
  context: { label: "Context", icon: Database },
  tools: { label: "Tools", icon: Wrench },
};

const formatMs = (value?: number | null) => (typeof value === "number" ? `${Math.round(value)}ms` : "pending");
const trimDetail = (value: string, max = 88) => (value.length > max ? `${value.slice(0, max)}...` : value);

export default function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<ResultTab>("output");
  const [input, setInput] = useState(fallbackPrompts[0]);
  const [inlineText, setInlineText] = useState("");
  const [strictMode, setStrictMode] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uploadDocument = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || payload.message || "Upload failed");
      }
      setUploadedDoc(payload);
      setUploading(payload.status === "processing");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
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
    const poll = async () => {
      try {
        const response = await fetch(`/api/upload/${uploadedDoc.document_id}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail || payload.message || "Failed to fetch upload status");
        }
        if (cancelled) return;
        setUploadedDoc(payload);
        setUploading(payload.status === "processing");
        if (payload.status === "processing") {
          pollTimeoutRef.current = setTimeout(poll, 1000);
        }
      } catch (err) {
        if (cancelled) return;
        setUploading(false);
        setUploadError(err instanceof Error ? err.message : "Failed to fetch upload status");
      }
    };

    pollTimeoutRef.current = setTimeout(poll, 700);
    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [uploadedDoc]);

  const runQuery = useCallback(async () => {
    if (!input.trim() || loading) return;
    if (uploadedDoc?.status === "processing") {
      setError("Document is still indexing. Wait for ready state before querying it.");
      return;
    }

    setLoading(true);
    setError(null);
    setActiveTab("output");

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input.trim(),
          session_id: sessionId ?? undefined,
          document_id: uploadedDoc?.document_id ?? undefined,
          inline_text: inlineText.trim() || undefined,
          strict_retrieval: strictMode,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "Query failed");
      }
      setResult(payload);
      setSessionId(payload.session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }, [inlineText, input, loading, sessionId, strictMode, uploadedDoc]);

  const uploadReady = uploadedDoc?.status === "completed";
  const promptSuggestions = uploadedDoc?.suggested_prompts?.length
    ? uploadedDoc.suggested_prompts
    : fallbackPrompts;
  const runtimeSummary = useMemo(() => {
    if (!result) return [];
    return [
      { label: "Total", value: formatMs(result.timings.total_ms) },
      { label: "Retrieval", value: formatMs(result.timings.retrieval_ms) },
      { label: "Generation", value: formatMs(result.timings.generation_ms) },
      { label: "Mode", value: result.strict_mode ? "strict" : "general" },
    ];
  }, [result]);

  return (
    <section id="demo" className="section-shell">
      <div className="section-header">
        <span className="section-kicker">Live Demo</span>
        <h2 className="section-title-lg">Upload, query, inspect</h2>
        <p className="section-copy">
          One workspace for the document, the question, and the result.
        </p>
      </div>

      <div className="console-panel overflow-hidden">
        <div className="demo-toolbar">
          <div>
            <p className="demo-label">Query Workspace</p>
            <h3 className="demo-heading">Upload a document and run a targeted query</h3>
            {uploadedDoc?.title ? (
              <p className="demo-helper mt-2">
                Detected: {uploadedDoc.title}
                {uploadedDoc.category ? ` • ${uploadedDoc.category}` : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {runtimeSummary.map((item) => (
              <span key={item.label} className="demo-pill">
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-6 border-b border-[var(--border-muted)] px-5 py-5 sm:px-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {promptSuggestions.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="demo-chip"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="demo-subtitle">Prompt</span>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={4}
                className="demo-textarea mt-2"
              />
            </label>

            <label className="block">
              <span className="demo-subtitle">Optional inline context</span>
              <textarea
                value={inlineText}
                onChange={(event) => setInlineText(event.target.value)}
                rows={4}
                placeholder="Paste notes or reference text to compare against the uploaded file."
                className="demo-textarea mt-2"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="demo-upload-card demo-upload-surface">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="demo-subtitle">Document</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    Upload a file and query it as soon as indexing finishes.
                  </p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary">
                  <UploadCloud size={16} />
                  Upload File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadDocument(file);
                    event.target.value = "";
                  }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="demo-pill">PDF</span>
                <span className="demo-pill">DOCX</span>
                <span className="demo-pill">PPTX</span>
                <span className="demo-pill">XLSX</span>
                <span className="demo-pill">Images</span>
              </div>

              <div className="mt-5 rounded-[1rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {uploadedDoc?.filename || "No file uploaded yet"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {uploadedDoc?.message || "Select a file to start indexing."}
                    </p>
                  </div>
                  <span className={`demo-status ${uploadReady ? "is-ready" : ""}`}>
                    {uploadReady ? "ready" : uploading ? "processing" : "idle"}
                  </span>
                </div>
              </div>
            </div>

            <div className="demo-action-bar">
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <ShieldCheck size={15} className="text-[var(--accent-emerald)]" />
                strict retrieval
                <input
                  type="checkbox"
                  checked={strictMode}
                  onChange={(event) => setStrictMode(event.target.checked)}
                  className="accent-[var(--accent-cyan)]"
                />
              </label>

              <button type="button" onClick={() => void runQuery()} className="btn btn-primary demo-run-btn" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
                Run Query
              </button>
            </div>

            {error ? <div className="demo-error">{error}</div> : null}
            {uploadError ? <div className="demo-error">{uploadError}</div> : null}
          </div>
        </div>

        <div className="grid gap-6 px-5 py-5 sm:px-6 xl:grid-cols-[0.76fr_1.24fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="demo-label">Indexing Stages</p>
                <h4 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Current upload state</h4>
              </div>
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">
                {uploadedDoc?.chunks ? `${uploadedDoc.chunks} chunks` : "no chunks yet"}
              </span>
            </div>

            {(uploadedDoc?.stages?.length ? uploadedDoc.stages : defaultUploadStages).map((stage) => (
              <div key={stage.key} className="trace-row">
                <div className={`status-dot status-${stage.status}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-[0.8rem] text-[var(--text-primary)]">{stage.label}</span>
                    <span className="trace-ms">{formatMs(stage.timing_ms)}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{trimDetail(stage.detail, 64)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="demo-label">Run Output</p>
                <h4 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Answer, evidence, and runtime trace</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(tabMeta) as ResultTab[]).map((tab) => {
                  const Icon = tabMeta[tab].icon;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`demo-tab ${activeTab === tab ? "is-active" : ""}`}
                    >
                      <Icon size={14} />
                      {tabMeta[tab].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.3rem] border border-[var(--border-muted)] bg-[var(--panel-strong)] p-4 sm:p-5">
              <AnimatePresence mode="wait">
                {!result ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex min-h-[25rem] flex-col items-center justify-center text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-[var(--border-muted)] bg-[rgba(19,35,53,0.72)]">
                      <Radar size={22} className="text-[var(--accent-cyan)]" />
                    </div>
                    <h4 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">No run executed yet</h4>
                    <p className="mt-3 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
                      Upload a file and run a query to populate this panel.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    {activeTab === "output" ? (
                      <div className="space-y-4">
                        <div className="rounded-[1.1rem] border border-[rgba(114,226,169,0.18)] bg-[rgba(23,47,37,0.28)] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent-emerald)]">
                              <CheckCircle2 size={15} />
                              Final answer
                            </div>
                            <span className="demo-pill">{result.strict_mode ? "strict mode" : "general mode"}</span>
                          </div>
                          <div className="prose-panel result-scroll mt-4 whitespace-pre-wrap">{result.structured_output.answer}</div>
                        </div>

                        <div className="rounded-[1.1rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
                          <p className="demo-subtitle">Sources</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {result.structured_output.sources.length ? (
                              result.structured_output.sources.slice(0, 2).map((source, index) => (
                                <div key={`${source.document}-${index}`} className="rounded-[1rem] border border-[var(--border-muted)] bg-[var(--panel-strong)] p-3.5">
                                  <p className="text-sm font-medium text-[var(--text-primary)]">{source.document}</p>
                                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                    {source.section_title || "Section"}
                                    {source.page_number ? ` • page ${source.page_number}` : ""}
                                    {source.slide_number ? ` • slide ${source.slide_number}` : ""}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-[var(--text-secondary)]">No sources returned.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {activeTab === "reasoning" ? (
                      <div className="space-y-3">
                        {result.execution_trace.map((step) => (
                          <div key={step.key} className="trace-row">
                            <div className={`status-dot status-${step.status}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-mono text-[0.8rem] text-[var(--text-primary)]">{step.label}</p>
                                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{trimDetail(step.description, 72)}</p>
                                </div>
                                <span className="trace-ms">{formatMs(step.timing_ms)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {activeTab === "context" ? (
                      <div className="space-y-3">
                        {result.context.length ? (
                          result.context.slice(0, 3).map((item, index) => (
                            <div key={`${item.source}-${index}`} className="rounded-[1rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.section_title || item.source}</p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">
                                    {item.source}
                                    {item.page_number ? ` • page ${item.page_number}` : ""}
                                    {item.slide_number ? ` • slide ${item.slide_number}` : ""}
                                  </p>
                                </div>
                                <span className="demo-pill">score {item.relevance.toFixed(2)}</span>
                              </div>
                              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{trimDetail(item.text, 220)}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-secondary)]">No retrieved context was returned.</p>
                        )}
                      </div>
                    ) : null}

                    {activeTab === "tools" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {result.tools.length ? (
                          result.tools.map((tool) => (
                            <div key={tool.name} className="rounded-[1rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
                              <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-medium text-[var(--text-primary)]">{tool.name}</p>
                                <span className="demo-pill">{tool.status}</span>
                              </div>
                              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{tool.detail}</p>
                              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-dim)]">
                                <Clock3 size={12} />
                                {formatMs(tool.duration_ms)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-secondary)]">No tool activity recorded.</p>
                        )}
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
