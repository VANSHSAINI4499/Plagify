"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

/**
 * Renders a subtle animated neon grid backdrop that sits behind every page.
 */
export function NeonGridBackground() {
  const rows = useMemo(() => Array.from({ length: 16 }), []);
  const columns = useMemo(() => Array.from({ length: 24 }), []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,118,255,0.35),transparent_55%)]" />
      <motion.div
        aria-hidden
        className="absolute inset-0 opacity-60"
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(0,255,209,0.12) 0%, rgba(0,0,0,0) 60%), linear-gradient(300deg, rgba(124,77,255,0.18) 10%, rgba(0,0,0,0) 70%)",
        }}
      />
      <div className="absolute inset-0 grid-line-mask">
        {rows.map((_, rowIdx) => (
          <motion.span
            key={`row-${rowIdx}`}
            className="absolute left-0 h-px w-full bg-linear-to-r from-transparent via-cyan-400/50 to-transparent"
            style={{ top: `${(rowIdx / rows.length) * 100}%` }}
            animate={{ opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: 8, delay: rowIdx * 0.15, repeat: Infinity }}
          />
        ))}
        {columns.map((_, colIdx) => (
          <motion.span
            key={`col-${colIdx}`}
            className="absolute top-0 w-px h-full bg-linear-to-b from-transparent via-fuchsia-400/40 to-transparent"
            style={{ left: `${(colIdx / columns.length) * 100}%` }}
            animate={{ opacity: [0.05, 0.4, 0.05] }}
            transition={{ duration: 10, delay: colIdx * 0.1, repeat: Infinity }}
          />
        ))}
      </div>
      <div className="absolute inset-0" style={{ backgroundImage: "var(--noise)" }} />
    </div>
  );
}
