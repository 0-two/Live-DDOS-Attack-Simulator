"use client";
import { useEffect, useRef, useState } from "react";
import type { GlobeArc, GlobePoint, GlobeRing } from "@/components/ui/globe";
import { locate } from "@/lib/geo";
import { createGenerator, type Generator } from "@/lib/simulate";
import type { AttackEvent, Snapshot } from "@/lib/types";

export const REFRESH_MS = 5 * 60_000;
export const ARC_TIME = 1600;
const ARC_LIFETIME = ARC_TIME * 1.5 + 150;
const RING_TIME = 1100;
const MAX_ACTIVE = 90;
const FEED_SIZE = 14;
const TICK_MS = 100;
const PUBLISH_MS = 200;

export const LAYER_COLOR = { L3: "#ff5b3a", L7: "#c8f560" } as const;

export type LayerFilter = "all" | "L3" | "L7";
export type StreamOptions = { paused: boolean; layers: LayerFilter };

type Live = {
  ev: AttackEvent;
  arc: GlobeArc;
  ring: GlobeRing;
};

export type Counter = { key: string; name: string; count: number };

export type StreamState = {
  snapshot: Snapshot | null;
  status: "loading" | "ok" | "error";
  error: string | null;
  nextRefreshAt: number;
  feed: AttackEvent[];
  arcs: GlobeArc[];
  points: GlobePoint[];
  rings: GlobeRing[];
  total: number;
  byLayer: { L3: number; L7: number };
  perSecond: number;
  topTargets: Counter[];
  topOrigins: Counter[];
  /** Highest-severity event seen this session. */
  peak: AttackEvent | null;
  replay: { pos: number; v: number; t: string | null };
};

function poisson(lambda: number) {
  // Knuth for small λ (we call this every 100 ms, so λ is ~0.1–3).
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 50);
  return k - 1;
}

function arcAltitude(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const cos =
    Math.sin(a.lat * r) * Math.sin(b.lat * r) +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.cos((a.lng - b.lng) * r);
  const angle = Math.acos(Math.min(1, Math.max(-1, cos)));
  return 0.06 + (angle / Math.PI) * 0.55;
}

function jitter(v: number, amt: number) {
  return v + (Math.random() - 0.5) * amt;
}

function bump(map: Map<string, Counter>, key: string, name: string) {
  const c = map.get(key);
  if (c) c.count++;
  else map.set(key, { key, name, count: 1 });
}

const top = (m: Map<string, Counter>, n: number) =>
  [...m.values()].sort((a, b) => b.count - a.count).slice(0, n);

export function useAttackStream(options: StreamOptions): StreamState {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  }, [options]);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<StreamState["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState(0);
  const [view, setView] = useState<Omit<StreamState, "snapshot" | "status" | "error" | "nextRefreshAt">>({
    feed: [],
    arcs: [],
    points: [],
    rings: [],
    total: 0,
    byLayer: { L3: 0, L7: 0 },
    perSecond: 0,
    topTargets: [],
    topOrigins: [],
    peak: null,
    replay: { pos: 0, v: 0, t: null },
  });

  const gen = useRef<Generator | null>(null);
  const lastId = useRef(0);

  // ---- Poll the aggregated snapshot ------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      try {
        const res = await fetch("/api/attacks");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const snap = (await res.json()) as Snapshot;
        if (cancelled) return;
        setSnapshot(snap);
        setStatus("ok");
        setError(null);
      } catch (e) {
        if (cancelled) return;
        // Keep simulating from the last good snapshot; just surface the error.
        setStatus((s) => (s === "ok" ? "ok" : "error"));
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) {
          setNextRefreshAt(Date.now() + REFRESH_MS);
          timer = setTimeout(load, REFRESH_MS);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Rebuild the generator whenever fresh aggregates land.
  useEffect(() => {
    if (snapshot) gen.current = createGenerator(snapshot, lastId.current);
  }, [snapshot]);

  // ---- Event loop ------------------------------------------------------------------
  useEffect(() => {
    const live: Live[] = [];
    const feed: AttackEvent[] = [];
    const targets = new Map<string, Counter>();
    const origins = new Map<string, Counter>();
    const recent: number[] = [];
    let total = 0;
    const byLayer = { L3: 0, L7: 0 };
    let last = performance.now();
    let lastPublish = 0;
    const pointCache = new Map<string, GlobePoint>();
    let points: GlobePoint[] = [];
    let lastPtKey = "";
    let peak: AttackEvent | null = null;

    const tick = () => {
      const g = gen.current;
      const nowPerf = performance.now();
      // Clamp dt so a backgrounded tab doesn't dump a burst of events on return.
      const dt = Math.min(nowPerf - last, 500) / 1000;
      last = nowPerf;
      const now = Date.now();

      if (g && !opts.current.paused) {
        const filter = opts.current.layers;
        const n = poisson(g.rate(now) * dt);
        for (let i = 0; i < n; i++) {
          const ev = g.next(now - Math.random() * dt * 1000);
          lastId.current = ev.id;
          if (filter !== "all" && ev.layer !== filter) continue;
          const o = locate(ev.origin);
          const t = locate(ev.target);
          if (!o || !t) continue;
          total++;
          if (!peak || ev.severity > peak.severity) peak = ev;
          byLayer[ev.layer]++;
          recent.push(now);
          bump(targets, ev.target, ev.targetName);
          bump(origins, ev.origin, ev.originName);
          feed.unshift(ev);
          if (feed.length > FEED_SIZE) feed.length = FEED_SIZE;

          if (live.length >= MAX_ACTIVE) continue; // still counted, just not drawn
          // Jitter endpoints so repeated pairs don't stack on one line.
          const start = { lat: jitter(o.lat, 3), lng: jitter(o.lng, 3) };
          const end = { lat: jitter(t.lat, 1.5), lng: jitter(t.lng, 1.5) };
          const color = LAYER_COLOR[ev.layer];
          live.push({
            ev,
            arc: {
              id: ev.id,
              startLat: start.lat,
              startLng: start.lng,
              endLat: end.lat,
              endLng: end.lng,
              arcAlt: arcAltitude(start, end),
              color,
              stroke: 0.35 + ev.severity * 0.6,
            },
            ring: { lat: end.lat, lng: end.lng, color, maxRadius: 1.5 + ev.severity * 3.5 },
          });
        }
      }

      // Expire.
      for (let i = live.length - 1; i >= 0; i--) {
        if (now - live[i].ev.at > ARC_LIFETIME + RING_TIME) live.splice(i, 1);
      }
      while (recent.length && now - recent[0] > 5000) recent.shift();

      if (nowPerf - lastPublish < PUBLISH_MS) return;
      lastPublish = nowPerf;

      const arcs = live.filter((l) => now - l.ev.at < ARC_LIFETIME).map((l) => l.arc);
      const rings = live
        .filter((l) => {
          const since = now - l.ev.at - ARC_TIME;
          return since >= 0 && since < RING_TIME;
        })
        .map((l) => l.ring);
      const pts = new Map<string, GlobePoint>();
      for (const l of live) {
        const ok = `o${l.ev.origin}`;
        const tk = `t${l.ev.target}:${l.ev.layer}`;
        if (!pointCache.has(ok)) {
          const o = locate(l.ev.origin)!;
          pointCache.set(ok, { lat: o.lat, lng: o.lng, color: "#ffffff", size: 0.35 });
        }
        if (!pointCache.has(tk)) {
          const t = locate(l.ev.target)!;
          pointCache.set(tk, { lat: t.lat, lng: t.lng, color: LAYER_COLOR[l.ev.layer], size: 0.6 });
        }
        pts.set(ok, pointCache.get(ok)!);
        pts.set(`t${l.ev.target}`, pointCache.get(tk)!);
      }
      const ptKey = [...pts.keys()].sort().join();
      if (ptKey !== lastPtKey) {
        lastPtKey = ptKey;
        points = [...pts.values()];
      }

      setView({
        feed: feed.slice(),
        arcs,
        rings,
        points,
        total,
        byLayer: { ...byLayer },
        perSecond: recent.length / 5,
        topTargets: top(targets, 8),
        topOrigins: top(origins, 8),
        peak,
        replay: g ? g.replay(now) : { pos: 0, v: 0, t: null },
      });
    };

    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return { snapshot, status, error, nextRefreshAt, ...view };
}
