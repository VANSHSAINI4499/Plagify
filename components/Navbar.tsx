"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "APIs", href: "https://ai-plagiarism-checker-and-quality-scorer.onrender.com/docs", external: true },
];

export function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="sticky top-0 z-40 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/10 bg-black/40 px-6 py-4 text-sm">
        <Link href="/" className="relative flex items-center gap-2 font-semibold tracking-wide">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
          Plagify
          <span className="absolute -bottom-2 left-0 h-px w-full bg-linear-to-r from-cyan-500/0 via-cyan-400/60 to-fuchsia-500/0" />
        </Link>
        <nav className="hidden gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              className="relative text-white/70 transition hover:text-white"
            >
              {item.label}
              <span className="absolute -bottom-2 left-1/2 h-px w-6 -translate-x-1/2 bg-linear-to-r from-transparent via-cyan-400/60 to-transparent opacity-0 transition-opacity hover:opacity-100" />
            </Link>
          ))}
        </nav>
        <Button asChild variant="outline" className="border-cyan-400/40 bg-transparent text-xs uppercase tracking-[0.2em] text-cyan-100">
          <Link href="/checker">Open Checker</Link>
        </Button>
      </div>
    </motion.header>
  );
}
