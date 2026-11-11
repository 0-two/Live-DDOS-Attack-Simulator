"use client";
import { useEffect, useState } from "react";
import type { Counter } from "@/hooks/use-attack-stream";
import type { AttackEvent, Share, Snapshot } from "@/lib/types";

const nf = new Intl.NumberFormat("en-US");

export function Code({ code, layer }: { code: string; layer?: "L3" | "L7" }) {
  return (
    <span
      className={`inline-flex h-5 min-w-7 items-center justify-center rounded px-1 font-mono text-[11px] font-semibold ${
        layer === "L3" ? "bg-l3/15 text-l3" : layer === "L7" ? "bg-l7/15 text-l7" : "bg-white/8 text-foreground/85"
      }`}
    >
      {code}
    </span>
  );
}

export function PanelTitle({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{children}</h2>
      {hint && <span className="text-[10px] text-muted/80">{hint}</span>}
    </div>
  );
}

export function Stats({ total, perSecond, byLayer }: { total: number; perSecond: number; byLayer: { L3: number; L7: number } }) {
  const sum = byLayer.L3 + byLayer.L7 || 1;
  return (
    <div className="panel p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted">Attacks seen</div>
          <div className="tabular mt-1 text-2xl font-semibold">{nf.format(total)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted">Per second</div>
          <div className="tabular mt-1 text-2xl font-semibold">{perSecond.toFixed(1)}</div>
        </div>
      </div>
      <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="bg-l3 transition-[width] duration-500" style={{ width: `${(byLayer.L3 / sum) * 100}%` }} />
        <div className="bg-l7 transition-[width] duration-500" style={{ width: `${(byLayer.L7 / sum) * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>
          <span className="mr-1.5 inline-block size-2 rounded-full bg-l3" />
          Network (L3/4) <span className="tabular text-foreground/80">{nf.format(byLayer.L3)}</span>
        </span>
        <span>
          <span className="mr-1.5 inline-block size-2 rounded-full bg-l7" />
          HTTP (L7) <span className="tabular text-foreground/80">{nf.format(byLayer.L7)}</span>
        </span>
      </div>
    </div>
  );
}

export function CountryList({ title, rows }: { title: string; rows: Counter[] }) {
  const max = rows[0]?.count || 1;
  return (
    <div className="panel p-4">
      <PanelTitle hint="this session">{title}</PanelTitle>
      {rows.length === 0 ? (
        <p className="text-xs text-muted">Waiting for events…</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
              <Code code={r.key} />
              <div className="relative h-5 min-w-0">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-white/6 transition-[width] duration-500"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
                <span className="relative block truncate px-1.5 leading-5 text-foreground/85">{r.name}</span>
              </div>
              <span className="tabular text-muted">{nf.format(r.count)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const time = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function Feed({ events }: { events: AttackEvent[] }) {
  return (
    <div className="panel flex max-h-[420px] min-h-0 flex-col p-4 lg:max-h-none lg:flex-1">
      <PanelTitle hint={<span className="flex items-center gap-1.5"><span className="pulse-dot inline-block size-1.5 rounded-full bg-red-500" />live</span>}>
        Attack feed
      </PanelTitle>
      <ul className="min-h-0 flex-1 space-y-1 overflow-hidden">
        {events.map((e) => (
          <li key={e.id} className="feed-in rounded-lg px-2 py-1.5 text-xs hover:bg-white/4">
            <div className="flex items-center gap-1.5">
              <Code code={e.origin} />
              <span className={e.layer === "L3" ? "text-l3" : "text-l7"} aria-hidden>
                →
              </span>
              <Code code={e.target} layer={e.layer} />
              <span className="tabular ml-auto font-mono text-[10px] text-muted">{time(e.at)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate text-foreground/75">{e.vector}</span>
              <span className="tabular shrink-0 font-mono text-foreground/90">{e.magnitude}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bars({ rows, color, limit = 5 }: { rows: Share[]; color: string; limit?: number }) {
  const shown = rows.slice(0, limit);
  const max = shown[0]?.share || 1;
  return (
    <ul className="space-y-1.5">
      {shown.map((r) => (
        <li key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-x-2 text-xs">
          <span className="truncate text-foreground/80">{r.name}</span>
          <span className="tabular text-muted">{r.share.toFixed(1)}%</span>
          <div className="col-span-2 h-1 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full" style={{ width: `${(r.share / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RadarMix({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="panel p-4">
      <PanelTitle hint={snapshot.source === "cloudflare" ? "Cloudflare Radar · 24h" : "sample"}>Attack mix</PanelTitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-[11px] text-l3">L3/4 vectors</div>
          <Bars rows={snapshot.l3Vectors} color="var(--l3)" />
        </div>
        <div>
          <div className="mb-2 text-[11px] text-l7">L7 HTTP methods</div>
          <Bars rows={snapshot.l7Methods} color="var(--l7)" />
        </div>
      </div>
    </div>
  );
}

export function Intensity({ snapshot, pos }: { snapshot: Snapshot; pos: number }) {
  const s = snapshot.intensity;
  if (s.length < 2) return null;
  const W = 300;
  const H = 40;
  const pts = s.map((p, i) => [(i / (s.length - 1)) * W, H - 2 - p.v * (H - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = `${line}L${W},${H}L0,${H}Z`;
  const x = pos * W;
  return (
    <div className="panel p-4">
      <PanelTitle hint="replaying 24h curve">L3 attack intensity</PanelTitle>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-10 w-full" role="img" aria-label="Layer 3 attack volume over the last 24 hours">
        <defs>
          <linearGradient id="ig" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--l3)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--l3)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ig)" />
        <path d={line} fill="none" stroke="var(--l3)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
        <line x1={x} x2={x} y1="0" y2={H} stroke="white" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>−24h</span>
        <span>now</span>
      </div>
    </div>
  );
}

function useNow(ms = 1000) {
  // Start at 0 so the prerendered HTML is deterministic; the clock starts on mount.
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

export function StatusPill({
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

  if (status === "loading" || !snapshot)
    return <div className="panel px-3 py-2 text-xs text-muted">Connecting to Cloudflare Radar…</div>;

  const sample = snapshot.source === "sample";
  const updated = snapshot.lastUpdated ? Date.parse(snapshot.lastUpdated) : Date.parse(snapshot.fetchedAt);
  return (
    <div className="panel flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs" title={[...(snapshot.errors ?? []), error].filter(Boolean).join("\n") || undefined}>
      <span className="flex items-center gap-1.5">
        <span className={`pulse-dot inline-block size-2 rounded-full ${sample ? "bg-amber-400" : "bg-emerald-400"}`} />
        <span className="font-medium">{sample ? "Sample data" : "Cloudflare Radar"}</span>
      </span>
      {!sample && <span className="text-muted">aggregates updated {ago(now - updated)}</span>}
      {sample && <span className="text-amber-300/80">set CLOUDFLARE_API_TOKEN for real data</span>}
      <span className="tabular text-muted">next pull {mmss}</span>
    </div>
  );
}
