"use client";
import { motion } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Share, Snapshot } from "@/lib/types";

/** One segmented bar per layer; each segment is a vector/method, hover for its share. */
function Segmented({ label, rows, color }: { label: string; rows: Share[]; color: string }) {
  const shown = rows.slice(0, 6);
  const total = shown.reduce((a, r) => a + r.share, 0) || 1;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="truncate pl-2 font-mono text-[11px] text-foreground">
          {shown[0]?.name} <span className="text-muted-foreground">{shown[0]?.share.toFixed(0)}%</span>
        </span>
      </div>
      <div className="flex h-2 gap-0.5">
        {shown.map((r, i) => (
          <Tooltip key={r.key}>
            <TooltipTrigger asChild>
              <motion.div
                className="h-full rounded-[2px] first:rounded-l-full last:rounded-r-full"
                style={{ background: color, opacity: 1 - i * 0.14 }}
                initial={{ width: 0 }}
                animate={{ width: `${(r.share / total) * 100}%` }}
                transition={{ type: "spring", stiffness: 90, damping: 18, delay: i * 0.05 }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {r.name} · {r.share.toFixed(1)}%
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ snapshot, pos }: { snapshot: Snapshot; pos: number }) {
  const s = snapshot.intensity;
  if (s.length < 2) return null;
  const W = 300;
  const H = 44;
  const pts = s.map((p, i) => [(i / (s.length - 1)) * W, H - 3 - p.v * (H - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = `${line}L${W},${H}L0,${H}Z`;
  const x = pos * W;
  const idx = Math.min(pts.length - 1, Math.round(pos * (pts.length - 1)));
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">L3 volume · last 24h</span>
        <span className="font-mono text-[11px] text-faint">replay 60×</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-11 w-full overflow-visible" role="img" aria-label="Layer 3 attack volume over the last 24 hours">
        <defs>
          <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--l3)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--l3)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="played">
            <rect x="0" y="0" width={x} height={H} />
          </clipPath>
        </defs>
        <path d={line} fill="none" stroke="currentColor" className="text-white/15" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <g clipPath="url(#played)">
          <path d={area} fill="url(#spark)" />
          <path d={line} fill="none" stroke="var(--l3)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </g>
        <circle cx={x} cy={pts[idx][1]} r="2.5" fill="var(--l3)" />
      </svg>
    </div>
  );
}

export function AttackMix({ snapshot, pos }: { snapshot: Snapshot; pos: number }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card/85 p-4">
      <Segmented label="L3/4 vectors" rows={snapshot.l3Vectors} color="var(--l3)" />
      <Segmented label="L7 methods" rows={snapshot.l7Methods} color="var(--l7)" />
      <Sparkline snapshot={snapshot} pos={pos} />
    </section>
  );
}
