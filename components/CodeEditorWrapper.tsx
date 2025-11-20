"use client";

import { Editor } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export type EditorHighlight = {
  id?: string;
  startLine: number;
  endLine: number;
  color?: string;
};

interface CodeEditorWrapperProps {
  label: string;
  code: string;
  setCode?: (value: string) => void;
  highlights?: EditorHighlight[];
  language?: string;
  readOnly?: boolean;
  onReady?: (instance: MonacoEditor.IStandaloneCodeEditor) => void;
  onScroll?: (scrollTop: number) => void;
  externalScrollTop?: number;
  className?: string;
  style?: CSSProperties;
}

const defaultOptions: MonacoEditor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  smoothScrolling: true,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  theme: "vs-dark",
  wordWrap: "on",
  formatOnPaste: true,
  formatOnType: true,
};

export function CodeEditorWrapper({
  label,
  code,
  setCode,
  highlights = [],
  language = "typescript",
  readOnly,
  onReady,
  onScroll,
  externalScrollTop,
  className,
  style,
}: CodeEditorWrapperProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const decorationIds = useRef<string[]>([]);

  const decorations = useMemo(
    () =>
      highlights.map((highlight, index) => ({
        range: {
          startLineNumber: highlight.startLine,
          startColumn: 1,
          endLineNumber: highlight.endLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: "monaco-line-highlight",
          inlineClassName: "monaco-inline-highlight",
          beforeContentClassName: "monaco-line-gutter",
          stickiness: 1,
          overviewRuler: {
            color: highlight.color ?? "rgba(45,255,196,0.6)",
            position: 7,
          },
          hoverMessage: highlight.id
            ? [{ value: `Similarity cluster ${highlight.id}` }]
            : undefined,
          zIndex: 5 + index,
        },
      })),
    [highlights],
  );

  useEffect(() => {
    if (!editorRef.current) return;
    decorationIds.current = editorRef.current.deltaDecorations(
      decorationIds.current,
      decorations,
    );
  }, [decorations]);

  useEffect(() => {
    if (!editorRef.current || !onScroll) return;
    const disposable = editorRef.current.onDidScrollChange((evt) => {
      onScroll(evt.scrollTop);
    });
    return () => disposable.dispose();
  }, [onScroll]);

  useEffect(() => {
    if (
      editorRef.current &&
      typeof externalScrollTop === "number" &&
      Math.abs(editorRef.current.getScrollTop() - externalScrollTop) > 2
    ) {
      editorRef.current.setScrollTop(externalScrollTop);
    }
  }, [externalScrollTop]);

  const handleMount = (instance: MonacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = instance;
    onReady?.(instance);
  };

  return (
    <motion.div
      layout
      className={`glass-panel relative flex h-full flex-col overflow-hidden rounded-2xl ${className ?? ""}`.trim()}
      style={style}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3 text-xs uppercase tracking-[0.3em] text-white/70">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {label}
        </div>
        <Badge variant="outline" className="border-white/20 text-white/70">
          Monaco
        </Badge>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode?.(value ?? "")}
          onMount={handleMount}
          options={{ ...defaultOptions, readOnly }}
        />
      </div>
    </motion.div>
  );
}
