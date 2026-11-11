"use client";
import { useMemo } from "react";
import { Marquee } from "@/components/ui/marquee";
import type { Snapshot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Flag } from "./flag";

/** Scrolling strip of Cloudflare's busiest origin→target routes (the real aggregate). */
export function PairTicker({ snapshot }: { snapshot: Snapshot }) {
  const pairs = useMemo(() => {
    const totals = { L3: 0, L7: 0 };
    for (const p of snapshot.pairs) totals[p.layer] += p.weight;
    return [...snapshot.pairs]
      .map((p) => ({ ...p, pct: (p.weight / (totals[p.layer] || 1)) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 18);
  }, [snapshot]);

  return (
    <div className="relative flex items-center gap-4 overflow-hidden">
      <span className="hidden shrink-0 font-mono text-[11px] text-faint sm:block">top routes · 24h</span>
      <div className="relative min-w-0 flex-1 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <Marquee pauseOnHover className="[--duration:60s] [--gap:2rem] p-0">
          {pairs.map((p) => (
            <span key={`${p.layer}${p.origin}${p.target}`} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <Flag code={p.origin} />
              <span className="font-mono text-muted-foreground">{p.origin}</span>
              <span className={cn(p.layer === "L3" ? "text-l3" : "text-l7")}>→</span>
              <Flag code={p.target} />
              <span className="font-mono">{p.target}</span>
              <span className="font-mono text-faint">{p.pct.toFixed(1)}%</span>
            </span>
          ))}
        </Marquee>
      </div>
    </div>
  );
}
