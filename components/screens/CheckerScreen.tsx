"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from "framer-motion";
import { CodeEditorWrapper, EditorHighlight } from "@/components/CodeEditorWrapper";
import { SimilarityResultPanel } from "@/components/SimilarityResultPanel";
import { ASTVisualizer } from "@/components/ASTVisualizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedAnalyzeButton } from "@/components/AnimatedAnalyzeButton";
import { NormalizedCodePanel } from "@/components/NormalizedCodePanel";
import { compareCodes, type CodeMetrics, type CompareCodesResponse } from "@/lib/apiPlaceholders";
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

export function CheckerScreen() {
  const [codeA, setCodeA] = useState(defaultSnippetA);
  const [codeB, setCodeB] = useState(defaultSnippetB);
  const [syncScroll, setSyncScroll] = useState<{ a: number; b: number }>({ a: 0, b: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("plagiarism");

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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const response = await compareCodes({
        language: editorLanguage,
        reference_code: codeA,
        submission_code: codeB,
      });
      setAnalysis(mapToAnalysis(response));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected analyzer error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasAnalysis = Boolean(analysis);

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
      <div className="grid gap-6 lg:grid-cols-2">
        <CodeEditorWrapper
          label="Code A"
          code={codeA}
          setCode={setCodeA}
          highlights={highlights}
          onScroll={(scrollTop) => setSyncScroll((prev) => ({ ...prev, a: scrollTop }))}
          externalScrollTop={syncScroll.b}
          language={editorLanguage}
          style={{ minHeight: "32rem" }}
        />
        <CodeEditorWrapper
          label="Code B"
          code={codeB}
          setCode={setCodeB}
          highlights={highlights}
          onScroll={(scrollTop) => setSyncScroll((prev) => ({ ...prev, b: scrollTop }))}
          externalScrollTop={syncScroll.a}
          language={editorLanguage}
          style={{ minHeight: "32rem" }}
        />
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
        <TabsList className="w-full justify-start rounded-full bg-white/5">
          <TabsTrigger value="plagiarism">Plagiarism</TabsTrigger>
          <TabsTrigger value="quality">Code Quality</TabsTrigger>
          <TabsTrigger value="ast">AST Visualization</TabsTrigger>
          <TabsTrigger value="normalized">Normalized Code</TabsTrigger>
        </TabsList>
        <TabsContent value="plagiarism">
          {hasAnalysis && analysis ? (
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
          {hasAnalysis && analysis ? (
            <motion.div className="glass-panel grid gap-6 rounded-3xl p-8 md:grid-cols-2" layout>
              {metricPanels(analysis.referenceMetrics, analysis.submissionMetrics).map((panel) => (
                <MetricPanelCard key={panel.label} panel={panel} animateKey={activeTab} />
              ))}
            </motion.div>
          ) : (
            <PlaceholderPanel
              title="Metrics awaiting analysis"
              description="Once you run the comparison, we will compute LOC, cyclomatic complexity, nesting depth, and more for each code sample."
            />
          )}
        </TabsContent>
        <TabsContent value="ast">
          {hasAnalysis && analysis ? (
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
          {hasAnalysis && analysis ? (
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
      </Tabs>
    </div>
  );
}

const defaultInsights = [
  "High structural overlap across functions",
  "Loop complexity mirrors original code",
  "Variable naming shows strong similarity",
];

const defaultAst: { nodes: ASTNode[] } = {
  nodes: [
    {
      type: "FunctionDeclaration",
      children: [
        { type: "Identifier", value: "compare" },
        { type: "Parameter", value: "codeA" },
        { type: "Parameter", value: "codeB" },
        {
          type: "BlockStatement",
          children: [
            { type: "VariableDeclaration", value: "score" },
            { type: "ReturnStatement", value: "score" },
          ],
        },
      ],
    },
  ],
};

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

const defaultAnalysis: AnalysisResult = {
  similarityPercent: 72,
  riskLevel: "medium",
  semanticSimilarity: 0.81,
  astSimilarity: 0.74,
  tokenSimilarity: 0.68,
  explanation: defaultInsights[0],
  referenceMetrics: fallbackReferenceMetrics,
  submissionMetrics: fallbackSubmissionMetrics,
  normalizedReference: undefined,
  normalizedSubmission: undefined,
  referenceAst: defaultAst.nodes,
  submissionAst: defaultAst.nodes,
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
