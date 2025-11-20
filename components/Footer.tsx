"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function Footer() {
  return (
    <motion.footer
      id="apis"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      className="mx-auto mt-24 w-full max-w-6xl rounded-3xl border border-white/10 bg-black/40 px-8 py-10 backdrop-blur-xl"
    >
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Plagify platform</p>
          <p className="text-lg font-semibold text-white">Integrate similarity + quality insights in minutes.</p>
          <p className="text-sm text-white/60">
            Drop our Next.js checker into your review workflow or drive it headlessly via the same APIs we proxy
            through this demo. Bulk uploads, metric tabs, and AST visuals are ready for real classrooms and dev teams.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Quick links</p>
          <div className="mt-3 flex flex-col gap-3">
            <Link href="/checker" className="transition hover:text-white">
              Launch checker workspace
            </Link>
            <a
              href="https://ai-plagiarism-checker-and-quality-scorer.onrender.com/docs"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white"
            >
              REST API reference
            </a>
            <Link href="#bulk-analysis" className="transition hover:text-white">
              Learn about bulk mode
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-white/40">
        <span>© {new Date().getFullYear()} Plagify UI experiment.</span>
        <span>Bring your own credentials & scoring models.</span>
      </div>
    </motion.footer>
  );
}
