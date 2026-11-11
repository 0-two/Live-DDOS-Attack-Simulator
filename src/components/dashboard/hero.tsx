"use client";
import { useMemo } from "react";
import { motion } from "motion/react";
import { FlipWords } from "@/components/ui/flip-words";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { Snapshot } from "@/lib/types";

const FALLBACK_WORDS = ["SYN floods", "HTTP floods", "DNS floods", "UDP floods"];

export function Hero({ snapshot }: { snapshot: Snapshot | null }) {
  // Cycle through the vectors Cloudflare actually saw most.
  const words = useMemo(() => {
    const v = snapshot?.l3Vectors
      .filter((x) => !/other/i.test(x.name))
      .slice(0, 4)
      .map((x) => x.name.replace(/flood$/i, "floods"));
    const list = v?.length ? [...v, "HTTP floods"] : FALLBACK_WORDS;
    return [...new Set(list)];
  }, [snapshot]);

  return (
    <div>
      <h1 className="text-[2.5rem] leading-[1.02] font-medium tracking-[-0.04em] text-balance sm:text-5xl">
        The internet,
        <br />
        <span className="text-faint">under fire.</span>
      </h1>
      <p className="mt-4 max-w-[19rem] text-sm leading-relaxed text-muted-foreground">
        Cloudflare&apos;s last 24 hours of
        <FlipWords key={words.join()} words={words} duration={2600} className="px-1 font-medium text-foreground" />
        <br />
        rebuilt into a live stream of attacks.
      </p>
    </div>
  );
}

export function Stats({
  perSecond,
  total,
  byLayer,
}: {
  perSecond: number;
  total: number;
  byLayer: { L3: number; L7: number };
}) {
  const sum = byLayer.L3 + byLayer.L7 || 1;
  const l3 = (byLayer.L3 / sum) * 100;
  return (
    <div>
      <div className="flex items-end gap-8">
        <div>
          <NumberTicker
            value={perSecond}
            decimalPlaces={1}
            className="font-mono text-6xl font-light tracking-[-0.06em] text-foreground"
          />
          <div className="mt-1 text-xs text-muted-foreground">attacks / sec</div>
        </div>
        <div className="pb-1">
          <NumberTicker value={total} className="font-mono text-2xl font-light tracking-tight text-foreground" />
          <div className="mt-1 text-xs text-muted-foreground">this session</div>
        </div>
      </div>

      <div className="mt-5 flex h-1 gap-1">
        <motion.div className="rounded-full bg-l3" animate={{ width: `${l3}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        <motion.div className="flex-1 rounded-full bg-l7" />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>
          <span className="text-l3">L3/4</span> {Math.round(l3)}%
        </span>
        <span>
          {Math.round(100 - l3)}% <span className="text-l7">L7</span>
        </span>
      </div>
    </div>
  );
}
