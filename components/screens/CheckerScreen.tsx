"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from "framer-motion";
import { CodeEditorWrapper, EditorHighlight } from "@/components/CodeEditorWrapper";
import { SimilarityResultPanel } from "@/components/SimilarityResultPanel";
import { ASTVisualizer } from "@/components/ASTVisualizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { AnimatedAnalyzeButton } from "@/components/AnimatedAnalyzeButton";
import { NormalizedCodePanel } from "@/components/NormalizedCodePanel";
import {
  compareCodes,
  bulkCompare,
  type CodeMetrics,
  type CompareCodesResponse,
  type BulkCompareResult,
  type BulkSubmissionInput,
} from "@/lib/apiPlaceholders";
import type { ASTNode } from "@/components/ASTVisualizer";

function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-panel flex min-h-[220px] flex-col items-start justify-center gap-4 rounded-3xl p-8">
      <h3 className="text-2xl font-semibold text-white/90">{title}</h3>
      <p className="max-w-prose text-sm text-white/60">{description}</p>
      <div className="mt-4 flex w-full items-center justify-start gap-3">
        <div className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/60">Awaiting input</div>
        <div className="rounded-full bg-cyan-600/20 px-3 py-1 text-xs font-medium text-cyan-200">Analyze when ready</div>
      </div>
    </div>
  );
}

type RiskLevel = "low" | "medium" | "high" | string;

type AnalysisResult = {
  similarityPercent: number;
  riskLevel: RiskLevel;
  semanticSimilarity: number;
  astSimilarity: number;
  tokenSimilarity: number;
  explanation: string;
  referenceMetrics?: CodeMetrics;
  submissionMetrics?: CodeMetrics;
  normalizedReference?: string;
  normalizedSubmission?: string;
  referenceAst: ASTNode[];
  submissionAst: ASTNode[];
  qualityScore?: number;
  qualityLabel?: string;
  qualityExplanation?: string;
};

type SubmissionEntry = BulkSubmissionInput & { localId: string };

type BulkResultView = {
  id: string;
  similarityPercent: number;
  riskLevel: RiskLevel;
  semanticSimilarity: number;
  astSimilarity: number;
  tokenSimilarity: number;
  explanation?: string;
};

const defaultSnippetA = `def analyze_quality(code: str) -> str:
    metrics = compute_metrics(code)
    score = metrics.get("score", 0)
    return "great" if score > 0.8 else "needs work"`;

const defaultSnippetB = `def analyze_quality(input_code: str) -> str:
    metrics = compute_metrics(input_code)
    score = metrics.get("score", 0)
    return "good" if score > 0.75 else "improve"`;

const editorLanguage = "python";
const alphabetSequence = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function CheckerScreen() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [codeA, setCodeA] = useState(defaultSnippetA);
  const [codeB, setCodeB] = useState(defaultSnippetB);
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([
    createSubmissionEntry(defaultSubmissionId(0), defaultSnippetB),
  ]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkResultView[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("plagiarism");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fallbackHighlights = useMemo<EditorHighlight[]>(
    () => [
      { id: "A", startLine: 1, endLine: 2, color: "rgba(56,189,248,0.35)" },
      { id: "B", startLine: 3, endLine: 4, color: "rgba(244,63,94,0.35)" },
    ],
    [],
  );

  const highlights = useMemo<EditorHighlight[]>(() => {
    if (!analysis) return fallbackHighlights;
    const blocks = Math.max(2, Math.round(analysis.similarityPercent / 25));
    return Array.from({ length: blocks }).map((_, index) => ({
      id: `Match-${index + 1}`,
      startLine: 1 + index * 2,
      endLine: 2 + index * 2,
      color: `rgba(56,189,248,${0.2 + index * 0.1})`,
    }));
  }, [analysis, fallbackHighlights]);
  const uploadedFileNames = useMemo(() => Object.keys(uploadedFiles), [uploadedFiles]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      if (!codeA.trim()) {
        throw new Error("Reference code cannot be empty");
      }

      if (mode === "single") {
        if (!codeB.trim()) {
          throw new Error("Submission code cannot be empty");
        }
        const response = await compareCodes({
          language: editorLanguage,
          reference_code: codeA,
          submission_code: codeB,
        });
        setAnalysis(mapToAnalysis(response));
        setBulkResults(null);
        return;
      }

      const normalizedSubmissions = buildBulkSubmissionPayload(submissions, uploadedFiles);
      if (!normalizedSubmissions.length) {
        throw new Error("Upload or add at least one submission to compare");
      }

      const response = await bulkCompare({
        language: editorLanguage,
        reference_code: codeA,
        submissions: normalizedSubmissions,
      });
      setBulkResults(mapBulkResults(response.results));
      setAnalysis(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected analyzer error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmissionCodeChange = (localId: string, value: string) => {
    setSubmissions((prev) =>
      prev.map((submission) => (submission.localId === localId ? { ...submission, code: value } : submission)),
    );
  };

  const handleSubmissionIdChange = (localId: string, value: string) => {
    setSubmissions((prev) =>
      prev.map((submission) => (submission.localId === localId ? { ...submission, id: value } : submission)),
    );
  };

  const handleRemoveSubmission = (localId: string) => {
    setSubmissions((prev) => (prev.length <= 1 ? prev : prev.filter((submission) => submission.localId !== localId)));
  };

  const handleAddSubmission = () => {
    setSubmissions((prev) => {
      const registry = new Set(prev.map((submission, index) => resolveSubmissionId(submission, index)));
      const baseId = defaultSubmissionId(prev.length);
      const uniqueId = reserveUniqueSubmissionId(baseId, registry);
      return [...prev, createSubmissionEntry(uniqueId, "")];
    });
  };

  const handleRemoveUploadedFile = (filename: string) => {
    setUploadedFiles((prev) => {
      if (!(filename in prev)) return prev;
      const next = { ...prev };
      delete next[filename];
      return next;
    });
  };

  const handleClearUploadedFiles = () => {
    setUploadedFiles((prev) => {
      if (!Object.keys(prev).length) return prev;
      return {};
    });
  };

  const handleBulkFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    const fileArray = Array.from(files);
    const pythonFiles = fileArray.filter((file) => file.name.toLowerCase().endsWith(".py"));
    const rejectedCount = fileArray.length - pythonFiles.length;
    setUploadError(rejectedCount > 0 ? "Only Python (.py) files can be uploaded." : null);

    if (!pythonFiles.length) {
      event.target.value = "";
      return;
    }

    const uploads = await Promise.all(
      pythonFiles.map(async (file) => ({
        name: file.name,
        code: await file.text(),
      })),
    );

    setUploadedFiles((prev) => {
      const next = { ...prev };
      uploads.forEach(({ name, code }) => {
        next[name] = code;
      });
      return next;
    });

    event.target.value = "";
  };

  useEffect(() => {
    setActiveTab((current) => {
      if (mode === "bulk") return "bulk";
      return current === "bulk" ? "plagiarism" : current;
    });
  }, [mode]);

  useEffect(() => {
    if (mode === "bulk" && bulkResults?.length) {
      setActiveTab("bulk");
    }
  }, [mode, bulkResults]);

  useEffect(() => {
    if (mode === "bulk" && submissions.length === 0) {
      setSubmissions([createSubmissionEntry(defaultSubmissionId(0), "")]);
    }
  }, [mode, submissions.length]);

  const hasAnalysis = mode === "single" && Boolean(analysis);
  const hasBulkResults = mode === "bulk" && Boolean(bulkResults?.length);

  return (
    <div className="space-y-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <p className="text-xs uppercase tracking-[0.6em] text-white/50">AI Checker</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          Compare codebases visually with neon clarity.
        </h1>
        <p className="text-white/60">
          Editors sync scroll, share highlights, and animate as you explore similarity, quality, and AST breakdowns.
        </p>
      </motion.div>
      <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-3">
        <div className="inline-flex rounded-full bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${mode === "single" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}
          >
            Side-by-side
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${mode === "bulk" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}
          >
            Bulk upload
          </button>
        </div>
        <p className="text-sm text-white/70">
          {mode === "single"
            ? "Compare one submission alongside your reference."
            : "Upload many files; IDs follow filenames and duplicate names get /number prefixes."}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CodeEditorWrapper
          label="Reference Code"
          code={codeA}
          setCode={setCodeA}
          highlights={highlights}
          language={editorLanguage}
          style={{ minHeight: "32rem" }}
        />
        {mode === "single" ? (
          <CodeEditorWrapper
            label="Submission Code"
            code={codeB}
            setCode={setCodeB}
            highlights={highlights}
            language={editorLanguage}
            style={{ minHeight: "32rem" }}
          />
        ) : (
          <div className="space-y-4">
            <div className="glass-panel rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">Bulk uploads</p>
                  <p className="text-sm text-white/60">Attach .py files</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-auto rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/60 hover:text-cyan-200"
                >
                  Upload files
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".py"
                className="hidden"
                onChange={handleBulkFileSelect}
              />
              {uploadError && <p className="mt-3 text-xs text-rose-200">{uploadError}</p>}
            </div>
            <div className="glass-panel rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">Selected files</p>
                  <p className="text-sm text-white/60">
                    {uploadedFileNames.length ? `${uploadedFileNames.length} ready for bulk compare` : "No files selected yet"}
                  </p>
                </div>
                {uploadedFileNames.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearUploadedFiles}
                    className="ml-auto rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="mt-4 max-h-52 overflow-y-auto rounded-2xl border border-white/10 bg-black/30">
                {uploadedFileNames.length ? (
                  <ul className="divide-y divide-white/5">
                    {uploadedFileNames.map((filename) => (
                      <li key={filename} className="flex items-center gap-3 px-4 py-2 text-sm text-white/80">
                        <span className="truncate" title={filename}>
                          {filename}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUploadedFile(filename)}
                          className="ml-auto rounded-full border border-white/5 px-2 py-1 text-xs text-white/70 transition hover:border-rose-400/60 hover:text-rose-200"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-8 text-sm text-white/50">Upload .py files to see them listed here.</div>
                )}
              </div>
            </div>
            {submissions.map((submission, index) => (
              <div key={submission.localId} className="glass-panel space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-xs uppercase tracking-[0.4em] text-white/60">Submission ID</label>
                  <Input
                    value={submission.id}
                    onChange={(event) => handleSubmissionIdChange(submission.localId, event.target.value)}
                    className="h-9 w-40 border-white/10 bg-black/30 text-white"
                    maxLength={48}
                  />
                  {submissions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSubmission(submission.localId)}
                      className="ml-auto rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-rose-400/60 hover:text-rose-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <CodeEditorWrapper
                  label={`Submission ${getSubmissionLabel(submission, index)}`}
                  code={submission.code}
                  setCode={(value) => handleSubmissionCodeChange(submission.localId, value)}
                  highlights={index === 0 ? highlights : []}
                  language={editorLanguage}
                  style={{ minHeight: "22rem", height: "22rem" }}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddSubmission}
              className="w-full rounded-3xl border border-dashed border-white/20 py-4 text-sm font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
            >
              + Add another submission
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <AnimatedAnalyzeButton onClick={handleAnalyze} isLoading={isAnalyzing} label="Analyze" />
        <div className="text-sm text-white/60">
          Powered by the Plagify analysis endpoint.
        </div>
      </div>
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            key="analyzing"
            className="flex items-center gap-3 rounded-full border border-cyan-400/30 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            Running deep compare…
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            key={errorMessage}
            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full flex-wrap gap-2 rounded-full bg-white/5 p-1">
          <TabsTrigger value="plagiarism" disabled={mode !== "single" || !hasAnalysis}>
            Plagiarism
          </TabsTrigger>
          <TabsTrigger value="quality" disabled={mode !== "single" || !hasAnalysis}>
            Code Quality
          </TabsTrigger>
          <TabsTrigger value="ast" disabled={mode !== "single" || !hasAnalysis}>
            AST Visualization
          </TabsTrigger>
          <TabsTrigger value="normalized" disabled={mode !== "single" || !hasAnalysis}>
            Normalized Code
          </TabsTrigger>
          <TabsTrigger value="bulk" disabled={mode !== "bulk" || !hasBulkResults}>
            Bulk Results
          </TabsTrigger>
        </TabsList>
        <TabsContent value="plagiarism">
          {mode !== "single" ? (
            <PlaceholderPanel
              title="Side-by-side mode disabled"
              description="Switch to the side-by-side mode to view single submission verdicts."
            />
          ) : hasAnalysis && analysis ? (
            <SimilarityResultPanel
              similarityPercent={analysis.similarityPercent}
              riskLevel={analysis.riskLevel}
              semanticSim={analysis.semanticSimilarity}
              structureSim={analysis.astSimilarity}
              tokenSim={analysis.tokenSimilarity}
              explanation={analysis.explanation}
              animateKey={activeTab}
            />
          ) : (
            <PlaceholderPanel
              title="AI verdict pending"
              description="Paste code on both sides and press Analyze to see similarity, risk level, and semantic scores."
            />
          )}
        </TabsContent>
        <TabsContent value="quality">
          {mode !== "single" ? (
            <PlaceholderPanel
              title="Side-by-side mode disabled"
              description="Switch to the single comparison mode to inspect detailed metrics."
            />
          ) : hasAnalysis && analysis ? (
            <div className="space-y-6">
              <QualitySummary
                score={analysis.qualityScore}
                label={analysis.qualityLabel}
                explanation={analysis.qualityExplanation}
                animateKey={activeTab}
              />
              <motion.div className="glass-panel grid gap-6 rounded-3xl p-8 md:grid-cols-2" layout>
                {metricPanels(analysis.referenceMetrics, analysis.submissionMetrics).map((panel) => (
                  <MetricPanelCard key={panel.label} panel={panel} animateKey={activeTab} />
                ))}
              </motion.div>
            </div>
          ) : (
            <PlaceholderPanel
              title="Metrics awaiting analysis"
              description="Once you run the comparison, we will compute LOC, cyclomatic complexity, nesting depth, and more for each code sample."
            />
          )}
        </TabsContent>
        <TabsContent value="ast">
          {mode !== "single" ? (
            <PlaceholderPanel
              title="Side-by-side mode disabled"
              description="Switch to the single comparison mode to explore AST graphs."
            />
          ) : hasAnalysis && analysis ? (
            <Tabs defaultValue="reference" className="space-y-4">
              <TabsList className="w-full rounded-full bg-white/5">
                <TabsTrigger value="reference">Reference AST</TabsTrigger>
                <TabsTrigger value="submission">Submission AST</TabsTrigger>
              </TabsList>
              <TabsContent value="reference">
                <ASTVisualizer nodes={analysis.referenceAst} title="Reference AST" subtitle="Live" />
              </TabsContent>
              <TabsContent value="submission">
                <ASTVisualizer nodes={analysis.submissionAst} title="Submission AST" subtitle="Live" />
              </TabsContent>
            </Tabs>
          ) : (
            <PlaceholderPanel
              title="Visual tree unavailable"
              description="Run the analyzer to generate AST graphs with zoom and pan support."
            />
          )}
        </TabsContent>
        <TabsContent value="normalized">
          {mode !== "single" ? (
            <PlaceholderPanel
              title="Side-by-side mode disabled"
              description="Switch back to single comparison to inspect normalized code."
            />
          ) : hasAnalysis && analysis ? (
            <NormalizedCodePanel
              referenceCode={analysis.normalizedReference}
              submissionCode={analysis.normalizedSubmission}
              language={editorLanguage}
            />
          ) : (
            <PlaceholderPanel
              title="Normalized view empty"
              description="We will display canonicalized source for both files after running the comparison."
            />
          )}
        </TabsContent>
        <TabsContent value="bulk">
          {mode !== "bulk" ? (
            <PlaceholderPanel
              title="Bulk mode inactive"
              description="Switch to bulk upload mode to view aggregated submission scores."
            />
          ) : hasBulkResults && bulkResults ? (
            <BulkResultsPanel results={bulkResults} />
          ) : (
            <PlaceholderPanel
              title="Bulk results pending"
              description="Add at least two submissions and run Analyze to see batched comparisons."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const fallbackReferenceMetrics: CodeMetrics = {
  loc: 24,
  cyclomatic: 3,
  max_nesting: 2,
  num_functions: 1,
};

const fallbackSubmissionMetrics: CodeMetrics = {
  loc: 28,
  cyclomatic: 4,
  max_nesting: 3,
  num_functions: 1,
};

type MetricPanel = {
  label: string;
  metrics: { label: string; value: number }[];
};

function MetricPanelCard({ panel, animateKey }: { panel: MetricPanel; animateKey: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-8 pb-8 pt-6 shadow-[0_0_90px_rgba(16,185,222,0.18)]">
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">{panel.label}</p>
      <dl className="mt-6 space-y-4 text-white/80">
        {panel.metrics.map((metric, index) => (
          <MetricValue
            key={`${panel.label}-${metric.label}`}
            label={metric.label}
            value={metric.value}
            animateKey={animateKey}
            index={index}
          />
        ))}
      </dl>
    </div>
  );
}

function QualitySummary({
  score = 0,
  label,
  explanation,
  animateKey,
}: {
  score?: number;
  label?: string;
  explanation?: string;
  animateKey: string;
}) {
  const clampedScore = clampPercent(score ?? 0);
  const scoreMotion = useMotionValue(clampedScore);
  const scoreText = useTransform(scoreMotion, (value) => `${Math.round(value)}%`);
  const [typedText, setTypedText] = useState(explanation ?? "Awaiting quality insights...");

  useEffect(() => {
    if (animateKey !== "quality") {
      scoreMotion.set(clampedScore);
      return;
    }
    scoreMotion.set(0);
    const controls = animate(scoreMotion, clampedScore, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [animateKey, clampedScore, scoreMotion]);

  useEffect(() => {
    const target = explanation?.trim() || "Code structure is being inspected...";
    let index = 0;
    const resetTimer = setTimeout(() => setTypedText(""), 0);
    const interval = setInterval(() => {
      index += 1;
      setTypedText(target.slice(0, index));
      if (index >= target.length) {
        clearInterval(interval);
      }
    }, 18);
    return () => {
      clearTimeout(resetTimer);
      clearInterval(interval);
    };
  }, [explanation, animateKey]);

  const badgeClasses = getQualityLabelClasses(label);

  return (
    <div className="space-y-4">
      <motion.div layout className="glass-panel flex flex-wrap items-center gap-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Submission quality score</p>
          <motion.p className="text-5xl font-semibold text-cyan-200" layout>{scoreText}</motion.p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] ${badgeClasses}`}>
          {label?.toUpperCase() || "UNRATED"}
        </span>
      </motion.div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.5em] text-white/50">Explanation</p>
        <p className="mt-2 text-sm text-white/80">
          <TypingCursor text={typedText} />
        </p>
      </div>
    </div>
  );
}

function BulkResultsPanel({ results }: { results: BulkResultView[] }) {
  if (!results.length) return null;
  return (
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-[0.4em] text-white/60">Batch submissions</p>
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((result) => (
          <motion.div key={result.id} layout className="glass-panel space-y-4 rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Submission</p>
                <p className="text-xl font-semibold text-white">{result.id}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeClasses(result.riskLevel)}`}>
                {formatRiskLabel(result.riskLevel)}
              </span>
            </div>
            <div className="text-4xl font-semibold text-cyan-200">{result.similarityPercent}%</div>
            <div className="space-y-2">
              <BulkMetricBar label="Semantic" value={result.semanticSimilarity} />
              <BulkMetricBar label="Structural" value={result.astSimilarity} />
              <BulkMetricBar label="Token" value={result.tokenSimilarity} />
            </div>
            {result.explanation && (
              <p className="text-sm text-white/70">{result.explanation}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BulkMetricBar({ label, value }: { label: string; value: number }) {
  const percent = clampPercent((value ?? 0) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/50">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5">
        <div className="h-full rounded-full bg-white/40" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function metricPanels(reference?: CodeMetrics, submission?: CodeMetrics): MetricPanel[] {
  return [
    {
      label: "Reference metrics",
      metrics: buildMetricEntries(reference ?? fallbackReferenceMetrics),
    },
    {
      label: "Submission metrics",
      metrics: buildMetricEntries(submission ?? fallbackSubmissionMetrics),
    },
  ];
}

function MetricValue({
  label,
  value,
  animateKey,
  index,
}: {
  label: string;
  value: number;
  animateKey: string;
  index: number;
}) {
  const target = typeof value === "number" ? value : 0;
  const motionValue = useMotionValue(target);
  const formatted = useTransform(motionValue, (val) => formatMetricValue(val));

  useEffect(() => {
    if (animateKey !== "quality") {
      motionValue.set(target);
      return;
    }
    motionValue.set(0);
    const controls = animate(motionValue, target, {
      duration: 0.8,
      ease: "easeOut",
      delay: index * 0.08,
    });
    return () => controls.stop();
  }, [animateKey, index, motionValue, target]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
      <dt className="text-xs uppercase tracking-[0.4em] text-white/50">{label}</dt>
      <motion.dd className="text-xl font-semibold text-cyan-200">{formatted}</motion.dd>
    </div>
  );
}

function buildMetricEntries(metrics: CodeMetrics): { label: string; value: number }[] {
  return Object.entries(metrics).map(([key, value]) => ({
    label: formatMetricLabel(key),
    value: typeof value === "number" ? Number(value.toFixed(2)) : 0,
  }));
}

function formatMetricLabel(key: string) {
  switch (key) {
    case "loc":
      return "LOC";
    case "max_nesting":
      return "Nesting";
    case "num_functions":
      return "Functions";
    case "cyclomatic":
      return "Cyclomatic";
    default:
      return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function formatMetricValue(value: number) {
  if (Number.isNaN(value)) return "0";
  if (Math.abs(value - Math.round(value)) < 0.01) {
    return String(Math.round(value));
  }
  return value.toFixed(2);
}

function buildBulkSubmissionPayload(entries: SubmissionEntry[], fileMap: Record<string, string>): BulkSubmissionInput[] {
  const registry = new Set<string>();
  const payload: BulkSubmissionInput[] = [];

  entries.forEach((entry, index) => {
    if (!entry.code.trim()) return;
    const baseId = resolveSubmissionId(entry, index);
    const uniqueId = reserveUniqueSubmissionId(baseId, registry);
    payload.push({ id: uniqueId, code: entry.code });
  });

  Object.entries(fileMap).forEach(([filename, code]) => {
    if (!code.trim()) return;
    const baseId = deriveSubmissionIdFromFilename(filename);
    const uniqueId = reserveUniqueSubmissionId(baseId, registry);
    payload.push({ id: uniqueId, code });
  });

  return payload;
}

function resolveSubmissionId(entry: SubmissionEntry, index: number) {
  const fallbackId = defaultSubmissionId(index);
  const candidate = (entry.id?.trim() || fallbackId).replace(/\s+/g, "_");
  return candidate || fallbackId;
}

function deriveSubmissionIdFromFilename(name: string) {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");
  const normalized = withoutExtension.trim().replace(/\s+/g, "_");
  return normalized || "Submission";
}

function reserveUniqueSubmissionId(baseId: string, registry: Set<string>) {
  const candidate = baseId || "Submission";
  if (!registry.has(candidate)) {
    registry.add(candidate);
    return candidate;
  }
  let counter = 1;
  while (registry.has(`${counter}/${candidate}`)) {
    counter += 1;
  }
  const unique = `${counter}/${candidate}`;
  registry.add(unique);
  return unique;
}

function getSubmissionLabel(entry: SubmissionEntry, index: number) {
  return entry.id?.trim() || defaultSubmissionId(index);
}

function createSubmissionEntry(id: string, code: string): SubmissionEntry {
  return {
    id,
    code,
    localId: generateLocalId(),
  };
}

function generateLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `submission-${Math.random().toString(36).slice(2)}`;
}

function defaultSubmissionId(index: number) {
  return alphabetSequence[index] ?? `S${index + 1}`;
}

function mapBulkResults(results: BulkCompareResult[]): BulkResultView[] {
  return results.map((result) => ({
    id: result.id,
    similarityPercent: clampPercent(
      result.plagiarism_score <= 1 ? result.plagiarism_score * 100 : result.plagiarism_score,
    ),
    riskLevel: result.risk_level || "pending",
    semanticSimilarity: result.semantic_similarity ?? 0,
    astSimilarity: result.ast_similarity ?? 0,
    tokenSimilarity: result.token_similarity ?? 0,
    explanation: result.explanation,
  }));
}

function getRiskBadgeClasses(level?: string) {
  switch ((level || "pending").toLowerCase()) {
    case "high":
      return "bg-rose-500/20 text-rose-100";
    case "medium":
      return "bg-amber-500/20 text-amber-100";
    case "low":
      return "bg-emerald-500/20 text-emerald-100";
    default:
      return "bg-white/10 text-white/70";
  }
}

function getQualityLabelClasses(label?: string) {
  switch ((label || "").toLowerCase()) {
    case "excellent":
      return "bg-emerald-500/15 text-emerald-200";
    case "good":
      return "bg-cyan-500/15 text-cyan-200";
    case "average":
    case "fair":
      return "bg-amber-500/20 text-amber-100";
    case "poor":
    case "critical":
      return "bg-rose-500/20 text-rose-100";
    default:
      return "bg-white/10 text-white/70";
  }
}

function formatRiskLabel(level?: string) {
  switch ((level || "pending").toLowerCase()) {
    case "high":
      return "High Risk";
    case "medium":
      return "Medium Risk";
    case "low":
      return "Low Risk";
    case "none":
      return "No Risk";
    default:
      return "Pending";
  }
}

function TypingCursor({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{text}</span>
      <span className="inline-block h-4 w-0.5 animate-pulse bg-white/60" />
    </span>
  );
}

function mapToAnalysis(response: CompareCodesResponse): AnalysisResult {
  const percentRaw = response.plagiarism_score ?? 0;
  const similarityPercent = percentRaw <= 1 ? Math.round(percentRaw * 100) : Math.round(percentRaw);
  return {
    similarityPercent: clampPercent(similarityPercent),
    riskLevel: response.risk_level || "pending",
    semanticSimilarity: response.semantic_similarity ?? 0,
    astSimilarity: response.ast_similarity ?? 0,
    tokenSimilarity: response.token_similarity ?? 0,
    explanation: response.explanation || "No explanation returned by the analyzer.",
    referenceMetrics: response.reference?.metrics,
    submissionMetrics: response.submission?.metrics,
    normalizedReference: response.normalized?.reference_code,
    normalizedSubmission: response.normalized?.submission_code,
    referenceAst: coerceAst(response.reference?.ast),
    submissionAst: coerceAst(response.submission?.ast),
    qualityScore: response.submission_quality_score,
    qualityLabel: response.submission_quality_label,
    qualityExplanation: response.submission_quality_explanation,
  };
}

function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function coerceAst(input: unknown): ASTNode[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(coerceAstNode).filter(Boolean) as ASTNode[];
  }
  if (typeof input === "object") {
    if (hasAstIdentity(input)) {
      const single = coerceAstNode(input);
      return single ? [single] : [];
    }
    const record = input as Record<string, unknown>;
    return Object.values(record)
      .flatMap((value) => coerceAst(value))
      .filter(Boolean) as ASTNode[];
  }
  return [];
}

function coerceAstNode(input: unknown): ASTNode | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const node: ASTNode = {
    type: String(record.type ?? record.kind ?? record.name ?? "Node"),
  };
  if (typeof record.value === "string") {
    node.value = record.value;
  } else if (typeof record.name === "string" && !node.value) {
    node.value = record.name;
  }
  const childrenSource = record.children ?? record.body ?? record.args ?? null;
  const children = coerceAst(childrenSource);
  if (children.length) {
    node.children = children;
  }
  return node;
}

function hasAstIdentity(input: object) {
  return "type" in input || "name" in input || "kind" in input;
}
