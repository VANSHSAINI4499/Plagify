export function HeatmapLegend() {
  const ranges = [
    { label: "0 – 40%", color: "bg-rose-500/40" },
    { label: "41 – 70%", color: "bg-amber-400/40" },
    { label: "71 – 90%", color: "bg-cyan-400/40" },
    { label: "91 – 100%", color: "bg-emerald-400/60" },
  ];

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <p className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40">Heatmap Legend</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ranges.map((range) => (
          <div key={range.label} className="flex items-center gap-3 text-sm text-white/70">
            <span className={`h-3 w-12 rounded-full ${range.color}`} />
            {range.label}
          </div>
        ))}
      </div>
    </div>
  );
}
