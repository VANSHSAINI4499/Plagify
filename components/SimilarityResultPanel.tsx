"use client";

import { useEffect } from "react";
import {
  motion,
  animate,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface SimilarityResultPanelProps {
  similarityPercent: number;
  riskLevel?: string;
  semanticSim: number;
  structureSim: number;
  tokenSim: number;
  explanation?: string;
  insights?: string[];
  animateKey?: string;
}

export function SimilarityResultPanel({
  similarityPercent,
  riskLevel,
  semanticSim,
  structureSim,
  tokenSim,
  explanation,
  insights = [],
  animateKey = "plagiarism",
}: SimilarityResultPanelProps) {
  const riskMeta = getRiskMeta(riskLevel);
  const clampedPercent = clampPercent(similarityPercent);
  const percentProgress = useMotionValue(clampedPercent);
  const sweepAngle = useTransform(percentProgress, (value) => value * 3.6);
  const ringBackground = useMotionTemplate`conic-gradient(var(--primary) ${sweepAngle}deg, rgba(255,255,255,0.08) ${sweepAngle}deg)`;
  const percentText = useTransform(percentProgress, (value) => `${Math.round(value)}%`);

  useEffect(() => {
    if (animateKey !== "plagiarism") {
      percentProgress.set(clampedPercent);
      return;
    }
    percentProgress.set(0);
    const controls = animate(percentProgress, clampedPercent, {
      duration: 0.9,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [clampedPercent, animateKey, percentProgress]);
  return (
    <motion.div
      layout
      className="glass-panel flex flex-col gap-6 rounded-3xl p-6"
      initial={{ opacity: 0.4, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Similarity</p>
          <p className="text-2xl font-semibold text-white">AI verdict</p>
        </div>
        <Badge className={riskMeta.className}>{riskMeta.label}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative h-32 w-32">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <motion.div
            className="relative flex h-full w-full items-center justify-center rounded-full border border-white/10"
            style={{ background: ringBackground }}
            animate={{ rotate: [0, 2, -2, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="glass-panel flex h-24 w-24 flex-col items-center justify-center rounded-full text-center text-sm">
              <motion.span className="text-3xl font-bold text-cyan-200">{percentText}</motion.span>
              <span className="text-xs text-white/60">match</span>
            </div>
          </motion.div>
        </div>
        <div className="flex-1 space-y-4">
          <Metric label="Semantic" value={semanticSim} color="from-cyan-500 to-sky-400" animateKey={animateKey} />
          <Metric label="Structural" value={structureSim} color="from-fuchsia-500 to-purple-400" animateKey={animateKey} />
          <Metric label="Token" value={tokenSim} color="from-emerald-500 to-lime-400" animateKey={animateKey} />
        </div>
      </div>
      {explanation && (
        <motion.p
          key={explanation}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"
        >
          {explanation}
        </motion.p>
      )}
      {insights.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight) => (
            <div key={insight} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              {insight}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Metric({ label, value, color, animateKey = "plagiarism" }: { label: string; value: number; color: string; animateKey?: string }) {
  const target = clampPercent((value ?? 0) * 100);
  const progress = useMotionValue(target);
  const width = useTransform(progress, (val) => `${val}%`);
  const percentLabel = useTransform(progress, (val) => `${Math.round(val)}%`);

  useEffect(() => {
    if (animateKey !== "plagiarism") {
      progress.set(target);
      return;
    }
    progress.set(0);
    const controls = animate(progress, target, { duration: 0.8, ease: "easeOut" });
    return () => controls.stop();
  }, [animateKey, progress, target]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/50">
        <span>{label}</span>
        <motion.span>{percentLabel}</motion.span>
      </div>
      <div className="h-2 rounded-full bg-white/5">
        <motion.div
          className={`h-full rounded-full bg-linear-to-r ${color}`}
          style={{ width }}
          initial={false}
        />
      </div>
    </div>
  );
}

function getRiskMeta(riskLevel?: string) {
  const normalized = (riskLevel || "pending").toLowerCase();
  switch (normalized) {
    case "high":
      return { label: "High Risk", className: "bg-rose-500/20 text-rose-100" };
    case "medium":
      return { label: "Medium Risk", className: "bg-amber-500/20 text-amber-100" };
    case "low":
      return { label: "Low Risk", className: "bg-emerald-500/20 text-emerald-100" };
    default:
      return { label: "Pending", className: "bg-white/10 text-white/70" };
  }
}

function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
