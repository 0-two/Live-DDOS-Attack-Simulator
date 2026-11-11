"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { AnimatedListItem } from "@/components/ui/animated-list";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import type { LayerFilter } from "@/hooks/use-attack-stream";
import type { AttackEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Flag } from "./flag";

const REVEAL_MS = 450; // one new row at a time, so each insert animates cleanly
const SHOWN = 9;
const MAX_QUEUE = 3; // when attacks outpace the feed, skip to the newest ones

/**
 * Attacks arrive faster (and in bursts) than a list can animate legibly. Queue
 * them and reveal one per tick; counters and the globe still show every event.
 */
function usePacedFeed(events: AttackEvent[], layers: LayerFilter) {
  const [shown, setShown] = useState<AttackEvent[]>([]);
  const queue = useRef<AttackEvent[]>([]);
  const seen = useRef(0);
  const filter = useRef(layers);
  useEffect(() => {
    filter.current = layers;
  }, [layers]);

  useEffect(() => {
    const fresh = events.filter((e) => e.id > seen.current).reverse(); // oldest first
    if (!fresh.length) return;
    seen.current = fresh[fresh.length - 1].id;
    queue.current = [...queue.current, ...fresh].slice(-MAX_QUEUE);
  }, [events]);

  useEffect(() => {
    const id = setInterval(() => {
      // Skip anything queued before the layer filter changed.
      let next = queue.current.shift();
      while (next && filter.current !== "all" && next.layer !== filter.current) next = queue.current.shift();
      if (next) setShown((s) => [next, ...s].slice(0, SHOWN));
    }, REVEAL_MS);
    return () => clearInterval(id);
  }, []);

  // Hide already-shown rows from a layer that's now filtered out.
  return layers === "all" ? shown : shown.filter((e) => e.layer === layers);
}

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

export function LiveFeed({ events, paused, layers }: { events: AttackEvent[]; paused: boolean; layers: LayerFilter }) {
  const shown = usePacedFeed(events, layers);
  return (
    <section className="relative flex min-h-0 flex-col rounded-2xl border p-1.5">
      <GlowingEffect spread={36} glow disabled={false} proximity={72} inactiveZone={0.01} borderWidth={2} />
      <div className="relative flex min-h-0 flex-1 flex-col rounded-xl bg-card/90 p-3">
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
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((e) => (
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
