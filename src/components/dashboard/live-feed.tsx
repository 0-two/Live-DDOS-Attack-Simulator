"use client";
import { AnimatePresence } from "motion/react";
import { AnimatedListItem } from "@/components/ui/animated-list";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import type { AttackEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Flag } from "./flag";

const time = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function Item({ e }: { e: AttackEvent }) {
  const l3 = e.layer === "L3";
  return (
    <div className="group grid grid-cols-[3px_1fr] gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]">
      <span className={cn("rounded-full", l3 ? "bg-l3" : "bg-l7")} style={{ opacity: 0.35 + e.severity * 0.65 }} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[13px]">
          <Flag code={e.origin} />
          <span className="truncate text-muted-foreground">{e.originName}</span>
          <span className={cn("shrink-0", l3 ? "text-l3" : "text-l7")}>→</span>
          <Flag code={e.target} />
          <span className="truncate">{e.targetName}</span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3 text-xs">
          <span className="truncate text-muted-foreground">{e.vector}</span>
          <span className="shrink-0 font-mono text-foreground tabular-nums">{e.magnitude}</span>
        </div>
      </div>
      <span className="sr-only">{time(e.at)}</span>
    </div>
  );
}

export function LiveFeed({ events, paused }: { events: AttackEvent[]; paused: boolean }) {
  return (
    <section className="relative flex min-h-0 flex-col rounded-2xl border p-1.5">
      <GlowingEffect spread={36} glow disabled={false} proximity={72} inactiveZone={0.01} borderWidth={2} />
      <div className="relative flex min-h-0 flex-1 flex-col rounded-xl bg-card/70 p-3 backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between px-2">
          <h2 className="text-[13px] font-medium">Incoming</h2>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            {paused ? (
              "paused"
            ) : (
              <>
                <span className="relative flex size-1.5">
                  <span className="ping-soft absolute inset-0 rounded-full bg-l3" />
                  <span className="relative size-1.5 rounded-full bg-l3" />
                </span>
                {events[0] ? time(events[0].at) : "--:--:--"}
              </>
            )}
          </span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
          <div className="flex flex-col">
            <AnimatePresence initial={false}>
              {events.map((e) => (
                <AnimatedListItem key={e.id}>
                  <Item e={e} />
                </AnimatedListItem>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
