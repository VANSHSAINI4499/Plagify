"use client";

import { motion } from "framer-motion";
import { CodeEditorWrapper } from "@/components/CodeEditorWrapper";

interface NormalizedCodePanelProps {
  referenceCode?: string;
  submissionCode?: string;
  language?: string;
}

const noop = () => {
  /* read-only */
};

export function NormalizedCodePanel({
  referenceCode,
  submissionCode,
  language = "python",
}: NormalizedCodePanelProps) {
  const hasData = Boolean(referenceCode || submissionCode);

  if (!hasData) {
    return (
      <motion.div
        layout
        className="glass-panel rounded-3xl border border-white/5 p-6 text-center text-white/60"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Normalized code will appear here after you run an analysis.
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className="grid gap-6 lg:grid-cols-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <CodeEditorWrapper
        label="Normalized Reference"
        code={referenceCode ?? ""}
        setCode={noop}
        language={language}
        readOnly
        style={{ minHeight: "24rem" }}
      />
      <CodeEditorWrapper
        label="Normalized Submission"
        code={submissionCode ?? ""}
        setCode={noop}
        language={language}
        readOnly
        style={{ minHeight: "24rem" }}
      />
    </motion.div>
  );
}
