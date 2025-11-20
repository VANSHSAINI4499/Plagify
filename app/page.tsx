"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroScene } from "@/components/HeroScene";
import { Button } from "@/components/ui/button";

const heroHighlights = [
  "Side-by-side Monaco editors",
  "Framer Motion interactions",
  "Bulk uploads with ranked insights",
];

export default function Home() {
  return (
    <div className="space-y-24">
      <section className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-100/70">
            AI Code Quality & Plagiarism UI
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Futuristic analyser for similarity, structure & AST insights.
          </h1>
          <p className="text-lg text-white/70">
            Plagify benchmarks duplicate detection, code health, and AST drift in seconds.
            Streamlined for academic integrity reviews, enterprise code reviews, and AI-model
            evaluations where trust and explainability matter.
          </p>
          <ul className="space-y-3 text-sm text-white/70">
            {heroHighlights.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-4">
            <Button asChild className="bg-linear-to-r from-cyan-500 to-fuchsia-500 text-black shadow-[0_0_35px_rgba(34,211,238,0.5)]">
              <Link href="/checker">Open Code Checker</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 text-white/80">
              <Link href="#bulk-analysis">See Bulk Analysis</Link>
            </Button>
          </div>
        </motion.div>
        <motion.div
          className="glass-panel relative h-128 rounded-3xl lg:ml-auto lg:w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <HeroScene />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-transparent" />
        </motion.div>
      </section>

      <section id="features" className="grid gap-6 md:grid-cols-2">
        {featureCards.map((card) => (
          <motion.div
            key={card.title}
            className="glass-panel rounded-3xl p-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: card.delay }}
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">{card.tag}</p>
            <h3 className="mt-3 text-xl font-semibold text-white">{card.title}</h3>
            <p className="mt-2 text-sm text-white/60">{card.description}</p>
          </motion.div>
        ))}
      </section>

      <section
        id="bulk-analysis"
        className="glass-panel grid gap-8 rounded-3xl p-8 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <motion.div
          className="space-y-5"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">Bulk data support</p>
          <h2 className="text-3xl font-semibold text-white">Upload dozens of files and inspect each verdict in-line.</h2>
          <p className="text-white/70">
            Plagify’s bulk mode batches Python submissions, ranks them by risk or quality, and pipes their
            metrics straight into the same four-tab workspace. Pick any filename from the dropdown and the
            plagiarism, quality, AST, and normalization tabs instantly reflect that submission’s evidence so
            you never juggle separate dashboards.
          </p>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
              Ranked summaries with semantic/structural/token scores for every file.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
              Quality chips stay in-tab, keeping explanations, metrics, and normalized code unified.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-400" />
              Dropdown filters let reviewers jump between highest-risk or highest-quality results in seconds.
            </li>
          </ul>
        </motion.div>
        <motion.div
          className="rounded-3xl border border-white/10 bg-black/30 p-6 text-white/70"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">Bulk flow snapshot</p>
          <ol className="mt-5 space-y-4 text-sm">
            <li>
              <p className="font-semibold text-white">1. Upload .py files</p>
              <p className="text-white/60">Monaco editor lets you preview or tweak every submission before running the batch.</p>
            </li>
            <li>
              <p className="font-semibold text-white">2. Analyze once</p>
              <p className="text-white/60">API fan-out scores plagiarism and quality for each file and streams structured results.</p>
            </li>
            <li>
              <p className="font-semibold text-white">3. Inspect tabs</p>
              <p className="text-white/60">Select any ID to reuse the main workspace without losing your reference context.</p>
            </li>
          </ol>
        </motion.div>
      </section>
    </div>
  );
}

const featureCards = [
  {
    tag: "Editors",
    title: "Synchronized Monaco views",
    description: "Two Monaco instances share highlights, scroll sync, and neon code decorations.",
    delay: 0,
  },
  {
    tag: "Analytics",
    title: "Similarity, Quality & AST",
    description: "Dedicated panels for plagiarism, quality scoring, and interactive AST explorer.",
    delay: 0.1,
  },
];
