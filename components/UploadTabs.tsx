"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface UploadTabsProps {
  codeA: string;
  setCodeA: (value: string) => void;
  codeB: string;
  setCodeB: (value: string) => void;
}

type TabValue = "codeA" | "codeB" | "manual";

export function UploadTabs({ codeA, setCodeA, codeB, setCodeB }: UploadTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("manual");
  const [manualCode, setManualCode] = useState("# Paste sample Python code here\ndef greet(name: str) -> None:\n    print(f'Hello {name}!')");

  const handleFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setter(text);
  };

  const applyManualToBoth = () => {
    setCodeA(manualCode);
    setCodeB(manualCode);
  };

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm uppercase tracking-[0.4em] text-white/60">Input Modes</p>
        <span className="text-xs text-white/60">Upload or paste snippets</span>
      </div>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <TabsList className="grid w-full grid-cols-3 rounded-full bg-white/5">
          <TabsTrigger value="codeA">Upload A</TabsTrigger>
          <TabsTrigger value="codeB">Upload B</TabsTrigger>
          <TabsTrigger value="manual">Paste</TabsTrigger>
        </TabsList>
        <AnimatePresence mode="wait">
          <TabsContent key="codeA" value="codeA" asChild forceMount>
            <motion.div
              key="codeA-pane"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-4 pt-6"
            >
              <Input
                type="file"
                accept=".py"
                onChange={(event) => handleFile(event, setCodeA)}
                className="cursor-pointer border-cyan-400/30 bg-transparent"
              />
              <Textarea value={codeA} onChange={(event) => setCodeA(event.target.value)} rows={6} className="resize-none border-white/10 bg-black/30 font-mono text-xs" />
            </motion.div>
          </TabsContent>
          <TabsContent key="codeB" value="codeB" asChild forceMount>
            <motion.div
              key="codeB-pane"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-4 pt-6"
            >
              <Input
                type="file"
                accept=".py"
                onChange={(event) => handleFile(event, setCodeB)}
                className="cursor-pointer border-fuchsia-400/30 bg-transparent"
              />
              <Textarea value={codeB} onChange={(event) => setCodeB(event.target.value)} rows={6} className="resize-none border-white/10 bg-black/30 font-mono text-xs" />
            </motion.div>
          </TabsContent>
          <TabsContent key="manual" value="manual" asChild forceMount>
            <motion.div
              key="manual-pane"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-4 pt-6"
            >
              <Textarea value={manualCode} onChange={(event) => setManualCode(event.target.value)} rows={6} className="resize-none border-white/10 bg-black/40 font-mono text-xs" />
              <button
                type="button"
                onClick={applyManualToBoth}
                className="rounded-full border border-cyan-400/50 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100"
              >
                Apply to both editors
              </button>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
