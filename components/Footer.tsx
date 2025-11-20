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
      transition={{ duration: 0.8 }}
      className="mx-auto mt-24 w-full max-w-6xl rounded-3xl border border-white/10 bg-white/5 px-8 py-10 backdrop-blur-xl"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Plagify</p>
          <p className="text-white/60">AI Code Quality & Plagiarism Checker UI</p>
        </div>
        <div className="flex gap-4 text-sm text-white/60">
          <Link href="/checker" className="transition hover:text-white">
            Checker
          </Link>
          <Link href="#features" className="transition hover:text-white">
            Features
          </Link>
          <Link href="#visuals" className="transition hover:text-white">
            Visuals
          </Link>
        </div>
      </div>
      <div className="mt-6 text-xs text-white/40">Placeholder UI only – plug in real APIs later.</div>
    </motion.footer>
  );
}
