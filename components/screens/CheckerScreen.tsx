"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from "framer-motion";
import { CodeEditorWrapper, EditorHighlight } from "@/components/CodeEditorWrapper";
import { SimilarityResultPanel } from "@/components/SimilarityResultPanel";
import { ASTVisualizer } from "@/components/ASTVisualizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const editorLanguage = "python";

const defaultSnippetA = `def normalize_scores(scores):
    if not scores:
        return []
    maximum = max(scores)
    return [round(score / maximum, 2) for score in scores]
`;

const defaultSnippetB = `def normalize_scores(scores):
    if not isinstance(scores, list):
        return []
    peak = max(scores + [1])
    normalized = []
    for score in scores:
        normalized.append(round(score / peak, 2))
    return normalized
`;

type AnalysisResult = {
  similarityPercent: number;
  riskLevel: string;
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
  qualityScore?: number | null;
  qualityLabel?: string | null;
  qualityExplanation?: string | null;
};

type BulkResultView = {
  id: string;
  similarityPercent: number;
  riskLevel: string;
  semanticSimilarity: number;
  astSimilarity: number;
  tokenSimilarity: number;
  explanation?: string;
  qualityScore?: number;
  qualityLabel?: string;
  qualityExplanation?: string;
  submissionAst: ASTNode[];
  normalizedSubmission?: string;
  submissionMetrics?: CodeMetrics;
};

export function CheckerScreen() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [codeA, setCodeA] = useState(defaultSnippetA);
  const [codeB, setCodeB] = useState(defaultSnippetB);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkResultView[] | null>(null);
  const [bulkSortBy, setBulkSortBy] = useState<SortOption>("plagiarism");
  const [selectedBulkId, setSelectedBulkId] = useState<string | null>(null);
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
  const selectedFileCode = useMemo(() => {
    if (!selectedFilename) return "";
    return uploadedFiles[selectedFilename] ?? "";
  }, [selectedFilename, uploadedFiles]);
  const sortedBulkResults = useMemo(
    () => (bulkResults ? sortBulkResults(bulkResults, bulkSortBy) : []),
    [bulkResults, bulkSortBy],
  );
  const selectedBulkResult = useMemo(() => {
    if (!sortedBulkResults.length) return null;
    if (selectedBulkId) {
      const match = sortedBulkResults.find((entry) => entry.id === selectedBulkId);
      if (match) return match;
    }
    return sortedBulkResults[0];
  }, [selectedBulkId, sortedBulkResults]);

  useEffect(() => {
    setSelectedFilename((current) => {
      if (current && uploadedFiles[current] !== undefined) {
        return current;
      }
      const [first] = Object.keys(uploadedFiles);
      return first ?? null;
    });
  }, [uploadedFiles]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!sortedBulkResults.length) {
        setSelectedBulkId(null);
        return;
      }
      setSelectedBulkId((current) => {
        if (current && sortedBulkResults.some((entry) => entry.id === current)) {
          return current;
        }
        return sortedBulkResults[0].id;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [sortedBulkResults]);

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

      const normalizedSubmissions = buildBulkSubmissionPayload(uploadedFiles);
      if (!normalizedSubmissions.length) {
        throw new Error("Upload at least one Python file to compare");
      }

      const response = await bulkCompare({
        language: editorLanguage,
        reference_code: codeA,
        submissions: normalizedSubmissions,
      });
      setBulkResults(mapBulkResults(response.results));
      setBulkSortBy("plagiarism");
      setSelectedBulkId(null);
      setAnalysis(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected analyzer error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectUploadedFile = (filename: string) => {
    if (!(filename in uploadedFiles)) return;
    setSelectedFilename(filename);
  };

  const handleUploadedFileCodeChange = (value: string) => {
    setUploadedFiles((prev) => {
      if (!selectedFilename) return prev;
      if (!(selectedFilename in prev)) return prev;
      return { ...prev, [selectedFilename]: value };
    });
  };

  const handleRemoveUploadedFile = (filename: string) => {
    setUploadedFiles((prev) => {
      if (!(filename in prev)) return prev;
      const next = { ...prev };
      delete next[filename];
      return next;
    });
    setSelectedFilename((current) => (current === filename ? null : current));
  };

  const handleClearUploadedFiles = () => {
    setUploadedFiles((prev) => {
      if (!Object.keys(prev).length) return prev;
      return {};
    });
    setSelectedFilename(null);
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

    setSelectedFilename((current) => current ?? uploads[uploads.length - 1]?.name ?? null);

    event.target.value = "";
  };

  useEffect(() => {
    setActiveTab((current) => {
      if (mode === "bulk") return "plagiarism";
      return current;
    });
  }, [mode]);

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
                      <li
                        key={filename}
                        className={`flex items-center gap-3 px-4 py-2 text-sm text-white/80 transition ${selectedFilename === filename ? "bg-white/10" : "hover:bg-white/5"}`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectUploadedFile(filename)}
                          className="flex-1 truncate text-left"
                          aria-pressed={selectedFilename === filename}
                        >
                          {filename}
                        </button>
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
            {uploadedFileNames.length ? (
              <div className="glass-panel space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-white/60">Code preview</p>
                    <p className="text-sm text-white/60">
                      {selectedFilename ? `Editing ${selectedFilename}` : "Select a file to view"}
                    </p>
                  </div>
                </div>
                {selectedFilename ? (
                  <CodeEditorWrapper
                    label={selectedFilename}
                    code={selectedFileCode}
                    setCode={handleUploadedFileCodeChange}
                    highlights={[]}
                    language={editorLanguage}
                    style={{ minHeight: "22rem", height: "22rem" }}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/60">
                    Choose a filename from the list above to preview and edit its contents.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/20 px-4 py-10 text-center text-sm text-white/60">
                Upload .py files to edit them before running the analysis.
              </div>
            )}
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
      {mode === "bulk" && (
        hasBulkResults && bulkResults && selectedBulkResult ? (
          <BulkResultsControls
            results={sortedBulkResults}
            sortBy={bulkSortBy}
            selectedId={selectedBulkResult.id}
            onSelect={setSelectedBulkId}
            onSortChange={setBulkSortBy}
          />
        ) : (
          <PlaceholderPanel
            title="Bulk results pending"
            description="Upload Python files and run Analyze to see batched comparisons."
          />
        )
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full flex-wrap gap-2 rounded-full bg-white/5 p-1">
          <TabsTrigger value="plagiarism" disabled={mode === "single" ? !hasAnalysis : !selectedBulkResult}>
            Plagiarism
          </TabsTrigger>
          <TabsTrigger value="quality" disabled={mode === "single" ? !hasAnalysis : !selectedBulkResult}>
            Code Quality
          </TabsTrigger>
          <TabsTrigger value="ast" disabled={mode === "single" ? !hasAnalysis : !selectedBulkResult}>
            AST Visualization
          </TabsTrigger>
          <TabsTrigger value="normalized" disabled={mode === "single" ? !hasAnalysis : !selectedBulkResult}>
            Normalized Code
          </TabsTrigger>
        </TabsList>
        <TabsContent value="plagiarism">
          {mode === "single" ? (
            hasAnalysis && analysis ? (
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
            )
          ) : selectedBulkResult ? (
            <SimilarityResultPanel
              similarityPercent={selectedBulkResult.similarityPercent}
              riskLevel={selectedBulkResult.riskLevel}
              semanticSim={selectedBulkResult.semanticSimilarity}
              structureSim={selectedBulkResult.astSimilarity}
              tokenSim={selectedBulkResult.tokenSimilarity}
              explanation={selectedBulkResult.explanation}
              animateKey={`${activeTab}-${selectedBulkResult.id}`}
            />
          ) : (
            <PlaceholderPanel
              title="No submission selected"
              description="Upload files, pick one from the dropdowns, and rerun Analyze to view its verdict."
            />
          )}
        </TabsContent>
        <TabsContent value="quality">
          {mode === "single" ? (
            hasAnalysis && analysis ? (
              <div className="space-y-6">
                <QualitySummary
                  score={analysis.qualityScore ?? undefined}
                  label={analysis.qualityLabel ?? undefined}
                  explanation={analysis.qualityExplanation ?? undefined}
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
            )
          ) : selectedBulkResult ? (
            selectedBulkResult.qualityScore !== undefined ? (
              <div className="space-y-6">
                <QualitySummary
                  score={selectedBulkResult.qualityScore}
                  label={selectedBulkResult.qualityLabel}
                  explanation={buildBulkQualityExplanation(selectedBulkResult)}
                  animateKey={`${activeTab}-${selectedBulkResult.id}`}
                />
                {selectedBulkResult.submissionMetrics ? (
                  <motion.div className="glass-panel rounded-3xl p-6" layout>
                    <p className="text-xs uppercase tracking-[0.4em] text-white/50">Submission metrics</p>
                    <dl className="mt-4 grid gap-4 md:grid-cols-2">
                      {buildMetricEntries(selectedBulkResult.submissionMetrics).map((metric) => (
                        <div
                          key={`bulk-${selectedBulkResult.id}-${metric.label}`}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/80"
                        >
                          <dt className="text-xs uppercase tracking-[0.4em] text-white/50">{metric.label}</dt>
                          <dd className="text-lg font-semibold text-cyan-100">{formatMetricValue(metric.value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </motion.div>
                ) : (
                  <motion.div className="glass-panel rounded-3xl p-6" layout>
                    <p className="text-xs uppercase tracking-[0.4em] text-white/50">Submission metrics</p>
                    <p className="text-sm text-white/60">No metrics returned for this submission.</p>
                  </motion.div>
                )}
              </div>
            ) : (
              <PlaceholderPanel
                title="Quality score unavailable"
                description="This submission did not include a code quality score in the bulk response."
              />
            )
          ) : (
            <PlaceholderPanel
              title="No submission selected"
              description="Upload files, pick one from the dropdowns, and rerun Analyze to inspect quality."
            />
          )}
        </TabsContent>
        <TabsContent value="ast">
          {mode === "single" ? (
            hasAnalysis && analysis ? (
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
            )
          ) : selectedBulkResult ? (
            selectedBulkResult.submissionAst.length ? (
              <ASTVisualizer
                nodes={selectedBulkResult.submissionAst}
                title="Submission AST"
                subtitle={`Bulk · ${selectedBulkResult.id}`}
              />
            ) : (
              <PlaceholderPanel
                title="AST tree unavailable"
                description="This bulk response did not include a submission AST payload."
              />
            )
          ) : (
            <PlaceholderPanel
              title="No submission selected"
              description="Upload files, pick one from the dropdowns, and rerun Analyze to inspect ASTs."
            />
          )}
        </TabsContent>
        <TabsContent value="normalized">
          {mode === "single" ? (
            hasAnalysis && analysis ? (
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
            )
          ) : selectedBulkResult ? (
            selectedBulkResult.normalizedSubmission ? (
              <NormalizedCodePanel
                referenceCode={codeA}
                submissionCode={selectedBulkResult.normalizedSubmission}
                language={editorLanguage}
              />
            ) : (
              <PlaceholderPanel
                title="Normalized view unavailable"
                description="This bulk response did not include normalized code output."
              />
            )
          ) : (
            <PlaceholderPanel
              title="No submission selected"
              description="Upload files, pick one from the dropdowns, and rerun Analyze to inspect normalized code."
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

function buildBulkQualityExplanation(result: BulkResultView) {
  if (result.qualityExplanation?.trim()) {
    return result.qualityExplanation;
  }
  if (typeof result.qualityScore === "number" && Number.isFinite(result.qualityScore)) {
    const scoreText = `${Math.round(result.qualityScore)}%`;
    if (result.qualityLabel) {
      return `${result.qualityLabel} quality rating at ${scoreText}.`;
    }
    return `Quality score reported at ${scoreText}.`;
  }
  if (result.qualityLabel) {
    return `${result.qualityLabel} quality rating provided without additional explanation.`;
  }
  return "Quality signal was not included in this bulk comparison.";
}

type SortOption = "plagiarism" | "quality";

const sortOptionMeta: Record<SortOption, { label: string; helper: string }> = {
  plagiarism: {
    label: "Plagiarism score",
    helper: "Higher values mean more overlap with the reference",
  },
  quality: {
    label: "Code quality score",
    helper: "Higher values mean cleaner, more maintainable code",
  },
};

function BulkResultsControls({
  results,
  sortBy,
  selectedId,
  onSelect,
  onSortChange,
}: {
  results: BulkResultView[];
  sortBy: SortOption;
  selectedId: string;
  onSelect: (id: string) => void;
  onSortChange: (value: SortOption) => void;
}) {
  if (!results.length) return null;
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_55px_rgba(14,165,233,0.12)] md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">Batch submissions</p>
        <p className="text-sm text-white/60">{results.length} compared file{results.length === 1 ? "" : "s"}</p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
        <SortDropdown sortBy={sortBy} onChange={onSortChange} />
        <SubmissionDropdown sortBy={sortBy} results={results} selectedId={selectedId} onChange={onSelect} />
      </div>
    </div>
  );
}

function SortDropdown({ sortBy, onChange }: { sortBy: SortOption; onChange: (value: SortOption) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-[220px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white shadow-[0_12px_45px_rgba(15,23,42,0.35)]"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.5em] text-white/50">Sort by</p>
          <p className="text-sm font-semibold text-white">{sortOptionMeta[sortBy].label}</p>
        </div>
        <span className={`text-lg transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/70 backdrop-blur"
          >
            {(Object.keys(sortOptionMeta) as SortOption[]).map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-white/5 ${sortBy === option ? "bg-white/5" : ""}`}
                >
                  <span className="text-sm font-semibold text-white">{sortOptionMeta[option].label}</span>
                  <span className="text-xs text-white/60">{sortOptionMeta[option].helper}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubmissionDropdown({
  results,
  sortBy,
  selectedId,
  onChange,
}: {
  results: BulkResultView[];
  sortBy: SortOption;
  selectedId: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedValue = getMetricScore(results.find((entry) => entry.id === selectedId), sortBy);
  const selectedScore = formatScoreValue(selectedValue);

  useEffect(() => {
    const handler = (event: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-[260px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white shadow-[0_12px_45px_rgba(15,23,42,0.35)]"
      >
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.5em] text-white/50">Submission</p>
          <p className="truncate text-sm font-semibold text-white">{selectedId || "Select a file"}</p>
        </div>
        <ScoreChip metric={sortBy} value={selectedValue ?? undefined} text={selectedScore} />
        <span className={`text-lg transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-full z-20 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-white/10 bg-black/70 backdrop-blur"
          >
            {results.map((result) => {
              const value = getMetricScore(result, sortBy);
              return (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(result.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${selectedId === result.id ? "bg-white/5" : ""}`}
                  >
                    <span className="flex-1 truncate text-sm font-semibold text-white">{result.id}</span>
                    <ScoreChip metric={sortBy} value={value} />
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScoreChip({
  metric,
  value,
  text,
}: {
  metric: SortOption;
  value?: number | null;
  text?: string;
}) {
  const content = text ?? formatScoreValue(value);
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getScoreChipClasses(metric, value)}`}>
      {content}
    </span>
  );
}

function normalizePercent(value: unknown): number | null {
  const numeric = coerceFinite(value);
  if (numeric === null) return null;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return clampPercent(percent);
}

function coerceNumber(value: unknown): number {
  return coerceFinite(value) ?? 0;
}

function coerceFinite(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function sortBulkResults(results: BulkResultView[], sortBy: SortOption) {
  return [...results].sort((a, b) => {
    const valueA = getMetricScore(a, sortBy);
    const valueB = getMetricScore(b, sortBy);
    const normalizedA = typeof valueA === "number" ? valueA : -1;
    const normalizedB = typeof valueB === "number" ? valueB : -1;
    return normalizedB - normalizedA;
  });
}

function getMetricScore(result: BulkResultView | undefined, metric: SortOption): number | null {
  if (!result) return null;
  if (metric === "plagiarism") return result.similarityPercent ?? 0;
  if (typeof result.qualityScore === "number") return result.qualityScore;
  return null;
}

function formatScoreValue(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) return "--";
  return `${Math.round(value)}%`;
}

function getScoreChipClasses(metric: SortOption, value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return "bg-white/10 text-white/60";
  }
  const normalized = clampPercent(value);
  if (metric === "plagiarism") {
    if (normalized >= 75) return "bg-rose-500/20 text-rose-100";
    if (normalized >= 40) return "bg-amber-500/20 text-amber-100";
    return "bg-emerald-500/20 text-emerald-100";
  }
  if (normalized >= 75) return "bg-emerald-500/20 text-emerald-100";
  if (normalized >= 50) return "bg-amber-500/20 text-amber-100";
  return "bg-rose-500/20 text-rose-100";
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

function buildBulkSubmissionPayload(fileMap: Record<string, string>): BulkSubmissionInput[] {
  const registry = new Set<string>();
  const payload: BulkSubmissionInput[] = [];

  Object.entries(fileMap).forEach(([filename, code]) => {
    if (!code.trim()) return;
    const baseId = deriveSubmissionIdFromFilename(filename);
    const uniqueId = reserveUniqueSubmissionId(baseId, registry);
    payload.push({ id: uniqueId, code });
  });

  return payload;
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

function mapBulkResults(results: BulkCompareResult[]): BulkResultView[] {
  return results.map((result) => ({
    id: result.id,
    similarityPercent: normalizePercent(result.plagiarism_score) ?? 0,
    riskLevel: result.risk_level || "pending",
    semanticSimilarity: coerceNumber(result.semantic_similarity),
    astSimilarity: coerceNumber(result.ast_similarity),
    tokenSimilarity: coerceNumber(result.token_similarity),
    explanation: result.explanation,
    qualityScore: normalizePercent(result.quality_score) ?? undefined,
    qualityLabel: result.quality_label,
    qualityExplanation: result.quality_explanation,
    submissionAst: coerceAst(result.submission_ast),
    normalizedSubmission: result.normalized_code ?? undefined,
    submissionMetrics: result.metrics ?? undefined,
  }));
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
