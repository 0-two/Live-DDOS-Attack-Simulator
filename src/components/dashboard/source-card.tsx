"use client";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import type { Snapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

function useNow(ms = 1000) {
  // Starts at 0 so the prerendered HTML is deterministic; the clock starts on mount.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, ms);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [ms]);
  return now;
}

const ago = (ms: number) => {
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function SourceCard({
  snapshot,
  status,
  error,
  nextRefreshAt,
}: {
  snapshot: Snapshot | null;
  status: "loading" | "ok" | "error";
  error: string | null;
  nextRefreshAt: number;
}) {
  const now = useNow();
  const left = now ? Math.max(0, nextRefreshAt - now) : 0;
  const mmss = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;
  const sample = snapshot?.source === "sample";
  const loading = status === "loading" || !snapshot;
  const updated = snapshot ? Date.parse(snapshot.lastUpdated ?? snapshot.fetchedAt) : 0;
  const issues = [...(snapshot?.errors ?? []), ...(error ? [error] : [])];

  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="flex h-7 items-center gap-2 rounded-full border bg-background/80 px-3 text-xs transition-colors hover:bg-muted"
        >
          <span className="relative flex size-1.5">
            <span
              className={cn(
                "ping-soft absolute inset-0 rounded-full",
                loading ? "bg-muted-foreground" : sample ? "bg-amber-400" : "bg-emerald-400",
              )}
            />
            <span
              className={cn(
                "relative size-1.5 rounded-full",
                loading ? "bg-muted-foreground" : sample ? "bg-amber-400" : "bg-emerald-400",
              )}
            />
          </span>
          {loading ? "Connecting…" : sample ? "Sample data" : "Cloudflare Radar"}
          {!loading && <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{mmss}</span>}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-80 text-sm">
        <p className="font-medium">{sample ? "Running on sample data" : "Live aggregates from Cloudflare Radar"}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {sample
            ? "No CLOUDFLARE_API_TOKEN is configured, or the API was unreachable. The distributions below are illustrative."
            : "Origin→target pairs, vectors, bitrates and HTTP methods from the last 24 hours. Every event on screen is drawn from these."}
        </p>
        <Separator className="my-3" />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          {snapshot?.dateRange && (
            <>
              <dt className="text-muted-foreground">Window</dt>
              <dd className="text-right font-mono">
                {fmtDate(snapshot.dateRange.start)} → {fmtDate(snapshot.dateRange.end)}
              </dd>
            </>
          )}
          {!sample && snapshot && (
            <>
              <dt className="text-muted-foreground">Updated</dt>
              <dd className="text-right font-mono">{now ? ago(now - updated) : "—"}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Next pull</dt>
          <dd className="text-right font-mono tabular-nums">{mmss}</dd>
          {snapshot && (
            <>
              <dt className="text-muted-foreground">Pairs</dt>
              <dd className="text-right font-mono">{snapshot.pairs.length}</dd>
            </>
          )}
        </dl>
        {issues.length > 0 && (
          <>
            <Separator className="my-3" />
            <ul className="space-y-1 text-[11px] text-amber-300/90">
              {issues.slice(0, 4).map((e) => (
                <li key={e} className="break-words">
                  {e}
                </li>
              ))}
            </ul>
          </>
        )}
        <a
          href="https://radar.cloudflare.com/security/network-layer"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          radar.cloudflare.com <ExternalLink className="size-3" />
        </a>
      </HoverCardContent>
    </HoverCard>
  );
}
