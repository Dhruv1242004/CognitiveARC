"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Braces,
  CheckCircle2,
  Clock3,
  Database,
  FileUp,
  Loader2,
  MessageSquareText,
  Radar,
  ShieldCheck,
  Sparkles,
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

const prompts = [
  "What milestones are explicitly mentioned in this document?",
  "Which section discusses risks or blockers?",
  "Extract action items with supporting evidence.",
];

const defaultUploadStages: UploadStage[] = [
  { key: "parsing", label: "Parsing", status: "queued", detail: "Waiting for document", timing_ms: null },
  { key: "chunking", label: "Chunking", status: "queued", detail: "Heading-aware semantic chunking", timing_ms: null },
  { key: "embedding", label: "Embedding", status: "queued", detail: "Persistent embedding service", timing_ms: null },
  { key: "indexing", label: "Indexing", status: "queued", detail: "Vector + metadata persistence", timing_ms: null },
];

const tabMeta: Record<ResultTab, { label: string; icon: ComponentType<{ size?: number }>; }> = {
  output: { label: "Structured Output", icon: Braces },
  reasoning: { label: "Execution Trace", icon: Radar },
  context: { label: "Retrieved Context", icon: Database },
  tools: { label: "Tool Activity", icon: Wrench },
};

const formatMs = (value?: number | null) => (typeof value === "number" ? `${Math.round(value)}ms` : "pending");

export default function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<ResultTab>("output");
  const [input, setInput] = useState(prompts[0]);
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
          pollTimeoutRef.current = setTimeout(poll, 1100);
        }
      } catch (err) {
        if (cancelled) return;
        setUploading(false);
        setUploadError(err instanceof Error ? err.message : "Failed to fetch upload status");
      }
    };

    pollTimeoutRef.current = setTimeout(poll, 800);
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
      setError("Document is still indexing. Wait for the pipeline to reach ready state.");
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
  const runtimeSummary = useMemo(() => {
    if (!result) return null;
    return [
      { label: "Total", value: formatMs(result.timings.total_ms) },
      { label: "Retrieval", value: formatMs(result.timings.retrieval_ms) },
      { label: "Generation", value: formatMs(result.timings.generation_ms) },
      { label: "Strict Mode", value: result.strict_mode ? "on" : "off" },
    ];
  }, [result]);

  return (
    <section id="demo" className="section-shell">
      <div className="section-header">
        <span className="section-kicker">Live Demo</span>
        <h2 className="section-title-lg">Upload, index, retrieve, and inspect the full answer path</h2>
        <p className="section-copy">
          The demo now behaves like an AI systems console: uploads show stage-by-stage indexing, and answers surface traces,
          context, tool activity, and structured output instead of raw generation alone.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
        <div className="grid gap-5">
          <div className="surface-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Document Ingestion</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Upload and index a source document</h3>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
              >
                <UploadCloud size={16} />
                Select File
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

            <div className="mt-5 rounded-[1.4rem] border border-dashed border-[var(--border-strong)] bg-[var(--panel-strong)] p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-muted)] bg-[rgba(49,90,122,0.2)]">
                  <FileUp size={20} className="text-[var(--accent-cyan)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Supported formats</p>
                  <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                    PDF, DOCX, PPTX, XLSX, images, and text files are parsed with format-specific extraction before
                    structure-aware chunking and indexing.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {(uploadedDoc?.stages?.length ? uploadedDoc.stages : defaultUploadStages).map((stage) => (
                <div key={stage.key} className="trace-row">
                  <div className={`status-dot status-${stage.status}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-[0.8rem] text-[var(--text-primary)]">{stage.label}</span>
                      <span className="trace-ms">{formatMs(stage.timing_ms)}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{stage.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-[var(--border-muted)] bg-[var(--panel-strong)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {uploadedDoc ? uploadedDoc.filename : "No file uploaded yet"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {uploadedDoc?.message || "Upload a source file to unlock document-grounded querying."}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                  uploadReady
                    ? "border-[rgba(114,226,169,0.18)] text-[var(--accent-emerald)]"
                    : "border-[var(--border-muted)] text-[var(--text-dim)]"
                }`}>
                  {uploadReady ? "ready" : uploading ? "processing" : "idle"}
                </span>
              </div>
            </div>

            {uploadError ? (
              <div className="mt-4 rounded-2xl border border-[rgba(242,106,115,0.2)] bg-[rgba(93,32,41,0.28)] p-4 text-sm text-[var(--accent-red)]">
                {uploadError}
              </div>
            ) : null}
          </div>

          <div className="surface-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Query Runner</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Ground the response in indexed context</h3>
              </div>
              <label className="flex items-center gap-2 rounded-full border border-[var(--border-muted)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                <ShieldCheck size={14} className="text-[var(--accent-emerald)]" />
                strict retrieval
                <input
                  type="checkbox"
                  checked={strictMode}
                  onChange={(event) => setStrictMode(event.target.checked)}
                  className="accent-[var(--accent-cyan)]"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full border border-[var(--border-muted)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[var(--text-primary)]">Prompt</span>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-[1.2rem] border border-[var(--border-muted)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-strong)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[var(--text-primary)]">Optional inline context</span>
                <textarea
                  value={inlineText}
                  onChange={(event) => setInlineText(event.target.value)}
                  rows={5}
                  placeholder="Paste notes or text to compare against the indexed document."
                  className="mt-2 w-full rounded-[1.2rem] border border-[var(--border-muted)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-strong)]"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.3rem] border border-[var(--border-muted)] bg-[var(--panel-strong)] px-4 py-3">
              <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <Sparkles size={16} className="text-[var(--accent-cyan)]" />
                {uploadReady
                  ? `${uploadedDoc?.chunks ?? 0} chunks indexed and available for retrieval`
                  : "Queries can still run with inline text or general mode"}
              </div>
              <button type="button" onClick={() => void runQuery()} className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
                Run Agent
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-[rgba(242,106,115,0.2)] bg-[rgba(93,32,41,0.28)] p-4 text-sm text-[var(--accent-red)]">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="surface-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Run Output</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Execution evidence and final answer</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {runtimeSummary?.map((item) => (
                <div key={item.label} className="rounded-full border border-[var(--border-muted)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                  <span className="text-[var(--text-dim)]">{item.label}</span> {item.value}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(Object.keys(tabMeta) as ResultTab[]).map((tab) => {
              const Icon = tabMeta[tab].icon;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                    activeTab === tab
                      ? "border-[var(--border-strong)] bg-[rgba(75,136,181,0.18)] text-[var(--text-primary)]"
                      : "border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon size={14} />
                  {tabMeta[tab].label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 min-h-[34rem] rounded-[1.6rem] border border-[var(--border-muted)] bg-[var(--panel-strong)] p-4 sm:p-5">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full min-h-[30rem] flex-col items-center justify-center text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border-muted)] bg-[rgba(49,90,122,0.2)]">
                    <Radar size={26} className="text-[var(--accent-cyan)]" />
                  </div>
                  <h4 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">No run executed yet</h4>
                  <p className="mt-3 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
                    Upload a file and run a query to inspect indexed-state changes, retrieval evidence, tool activity, and
                    final structured output.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "output" ? (
                    <div>
                      <div className="rounded-[1.35rem] border border-[rgba(114,226,169,0.16)] bg-[rgba(29,57,45,0.28)] p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-sm text-[var(--accent-emerald)]">
                            <CheckCircle2 size={15} />
                            Structured final answer
                          </div>
                          <span className="rounded-full border border-[rgba(114,226,169,0.18)] px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--accent-emerald)]">
                            {result.strict_mode ? "grounded mode" : "general mode"}
                          </span>
                        </div>
                        <div className="prose-panel mt-4 whitespace-pre-wrap">{result.structured_output.answer}</div>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-[1.35rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
                            Supporting Excerpts
                          </h4>
                          <div className="mt-4 space-y-3">
                            {result.structured_output.supporting_excerpts.length ? (
                              result.structured_output.supporting_excerpts.map((excerpt) => (
                                <div key={`${excerpt.citation}-${excerpt.source}`} className="rounded-2xl border border-[var(--border-muted)] bg-[var(--panel-strong)] p-3.5">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="font-mono text-xs text-[var(--accent-cyan)]">{excerpt.citation}</span>
                                    <span className="text-xs text-[var(--text-dim)]">
                                      {excerpt.section_title || excerpt.source}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{excerpt.excerpt}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-[var(--text-secondary)]">No supporting excerpts returned.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[1.35rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
                            Sources
                          </h4>
                          <div className="mt-4 space-y-3">
                            {result.structured_output.sources.length ? (
                              result.structured_output.sources.map((source, index) => (
                                <div key={`${source.document}-${index}`} className="rounded-2xl border border-[var(--border-muted)] bg-[var(--panel-strong)] p-3.5 text-sm text-[var(--text-secondary)]">
                                  <p className="font-medium text-[var(--text-primary)]">{source.document}</p>
                                  <p className="mt-1">
                                    {source.section_title || "Section metadata unavailable"}
                                    {source.page_number ? ` • page ${source.page_number}` : ""}
                                    {source.slide_number ? ` • slide ${source.slide_number}` : ""}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-[var(--text-secondary)]">No source references returned.</p>
                            )}
                          </div>
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
                                <p className="font-mono text-[0.82rem] text-[var(--text-primary)]">{step.label}</p>
                                <p className="mt-1 text-sm text-[var(--text-secondary)]">{step.description}</p>
                              </div>
                              <span className="trace-ms">{formatMs(step.timing_ms)}</span>
                            </div>
                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                              <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--panel-soft)] p-3">
                                <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Input</p>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">{step.input || "None"}</p>
                              </div>
                              <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--panel-soft)] p-3">
                                <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Output</p>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">{step.output || "None"}</p>
                              </div>
                            </div>
                            {step.logs?.length ? (
                              <div className="mt-3 rounded-2xl border border-[var(--border-muted)] bg-[rgba(11,16,24,0.74)] p-3 font-mono text-xs leading-6 text-[var(--text-dim)]">
                                {step.logs.join(" ")}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {activeTab === "context" ? (
                    <div className="space-y-3">
                      {result.context.length ? (
                        result.context.map((item, index) => (
                          <div key={`${item.source}-${index}`} className="rounded-[1.2rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.section_title || item.source}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">
                                  {item.source}
                                  {item.page_number ? ` • page ${item.page_number}` : ""}
                                  {item.slide_number ? ` • slide ${item.slide_number}` : ""}
                                </p>
                              </div>
                              <span className="rounded-full border border-[var(--border-muted)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                                score {item.relevance.toFixed(2)}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.text}</p>
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
                          <div key={tool.name} className="rounded-[1.2rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
                            <div className="flex items-center justify-between gap-4">
                              <p className="font-medium text-[var(--text-primary)]">{tool.name}</p>
                              <span className="rounded-full border border-[var(--border-muted)] px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                {tool.status}
                              </span>
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

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <ShieldCheck size={15} className="text-[var(--accent-emerald)]" />
                Guardrail
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                If retrieval returns no support, strict mode responds with “Not found in indexed document.”
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <ArrowUpRight size={15} className="text-[var(--accent-cyan)]" />
                Observability
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                Planner, retrieval, memory, tool routing, generation, and formatting each expose timing and logs.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--border-muted)] bg-[var(--panel-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <Database size={15} className="text-[var(--accent-amber)]" />
                Retrieval
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                Hybrid semantic + keyword reranking improves targeted QA on section-heavy documents.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
