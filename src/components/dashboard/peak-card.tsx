"use client";
import { AnimatePresence, motion } from "motion/react";
import { BorderBeam } from "@/components/ui/border-beam";
import type { AttackEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Flag } from "./flag";

export function PeakCard({ peak }: { peak: AttackEvent | null }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card/60 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium">Largest this session</h2>
        {peak && (
          <span className={cn("font-mono text-[11px]", peak.layer === "L3" ? "text-l3" : "text-l7")}>
            {peak.layer === "L3" ? "L3/4" : "L7"}
          </span>
        )}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        {peak ? (
          <motion.div
            key={peak.id}
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.35 }}
          >
            <div className="mt-3 font-mono text-3xl font-light tracking-[-0.04em]">{peak.magnitude}</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flag code={peak.origin} />
              <span className="truncate">{peak.originName}</span>
              <span>→</span>
              <Flag code={peak.target} />
              <span className="truncate text-foreground">{peak.targetName}</span>
            </div>
            <div className="mt-1 truncate text-xs text-faint">{peak.vector}</div>
          </motion.div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Watching…</p>
        )}
      </AnimatePresence>
      <BorderBeam size={90} duration={9} colorFrom="var(--l3)" colorTo="var(--l7)" borderWidth={1} />
    </section>
  );
}
