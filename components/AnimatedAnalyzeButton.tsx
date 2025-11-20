"use client";

import { motion } from "framer-motion";
import type { ComponentProps } from "react";

type MotionButtonProps = ComponentProps<typeof motion.button>;

interface AnimatedAnalyzeButtonProps
  extends MotionButtonProps {
  isLoading?: boolean;
  label?: string;
}

export function AnimatedAnalyzeButton({
  isLoading,
  label = "Analyze",
  className,
  ...props
}: AnimatedAnalyzeButtonProps) {
  return (
    <motion.button
      {...props}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full border border-cyan-400/50 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${className ?? ""}`.trim()}
    >
      <motion.span
        aria-hidden
        className="absolute inset-0 bg-linear-to-r from-fuchsia-600/40 via-cyan-400/40 to-transparent"
        animate={{ x: ["-50%", "50%"], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
      />
      <span className="relative flex items-center gap-2">
        {isLoading && (
          <motion.span
            className="h-3 w-3 rounded-full border-2 border-cyan-200 border-b-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        )}
        {label}
      </span>
    </motion.button>
  );
}
