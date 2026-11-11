import type { AttackEvent, Pair, Share, Snapshot } from "./types";

/** Weighted sampler: O(log n) draws via cumulative weights + binary search. */
export class Sampler<T> {
  private cum: number[] = [];
  private total = 0;
  constructor(private items: T[], weight: (t: T) => number) {
    for (const it of items) {
      this.total += Math.max(0, weight(it));
      this.cum.push(this.total);
    }
  }
  get empty() {
    return this.total <= 0;
  }
  draw(): T {
    const r = Math.random() * this.total;
    let lo = 0;
    let hi = this.cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] > r) hi = mid;
      else lo = mid + 1;
    }
    return this.items[lo];
  }
}

// Bitrate buckets → Mbps ranges, sampled log-uniformly inside the bucket.
const BITRATE_MBPS: Record<string, [number, number, number]> = {
  UNDER_500_MBPS: [5, 500, 0.15],
  _500_MBPS_TO_1_GBPS: [500, 1000, 0.35],
  _1_GBPS_TO_10_GBPS: [1000, 10_000, 0.6],
  _10_GBPS_TO_100_GBPS: [10_000, 100_000, 0.85],
  OVER_100_GBPS: [100_000, 2_000_000, 1],
};

const logUniform = (a: number, b: number) => Math.exp(Math.log(a) + Math.random() * (Math.log(b) - Math.log(a)));

function fmtBits(mbps: number) {
  if (mbps >= 1_000_000) return `${(mbps / 1_000_000).toFixed(2)} Tbps`;
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gbps`;
  return `${Math.round(mbps)} Mbps`;
}

function fmtRps(rps: number) {
  if (rps >= 1_000_000) return `${(rps / 1_000_000).toFixed(1)}M rps`;
  if (rps >= 1000) return `${(rps / 1000).toFixed(1)}k rps`;
  return `${Math.round(rps)} rps`;
}

/** Box–Muller standard normal. */
function gauss() {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

export type Generator = {
  next(now: number): AttackEvent;
  /** Mean events per second at a given point of the intensity replay. */
  rate(now: number): number;
  /** Position (0..1) in the replayed 24h intensity curve and its value. */
  replay(now: number): { pos: number; v: number; t: string | null };
};

/** Seconds of wall-clock time per 15-minute Radar bucket during replay. */
export const REPLAY_SECONDS_PER_BUCKET = 15;
const BASE_RATE = 7; // events/s at mean intensity

export function createGenerator(snap: Snapshot, startId = 0): Generator {
  const l7 = new Sampler<Pair>(snap.pairs.filter((p) => p.layer === "L7"), (p) => p.weight);
  const l3 = new Sampler<Pair>(snap.pairs.filter((p) => p.layer === "L3"), (p) => p.weight);
  const vectors = new Sampler<Share>(snap.l3Vectors, (s) => s.share);
  const methods = new Sampler<Share>(snap.l7Methods, (s) => s.share);
  const products = new Sampler<Share>(snap.l7Products, (s) => s.share);
  const bitrates = new Sampler<Share>(snap.l3Bitrates, (s) => s.share);
  const series = snap.intensity.length ? snap.intensity : [{ t: "", v: 0.6 }];
  const mean = series.reduce((a, b) => a + b.v, 0) / series.length || 0.6;
  const epoch = Date.now();
  let id = startId;

  const replay = (now: number) => {
    const buckets = (now - epoch) / 1000 / REPLAY_SECONDS_PER_BUCKET;
    const i = Math.floor(buckets) % series.length;
    const j = (i + 1) % series.length;
    const f = buckets - Math.floor(buckets);
    const v = series[i].v * (1 - f) + series[j].v * f; // smooth between buckets
    return { pos: (i + f) / series.length, v, t: series[i].t || null };
  };

  return {
    replay,
    rate: (now) => BASE_RATE * Math.max(0.15, replay(now).v / mean),
    next(now) {
      // Pick layer in proportion to how much pair data each has (fallback to whichever exists).
      const layer = l3.empty ? "L7" : l7.empty ? "L3" : Math.random() < 0.5 ? "L7" : "L3";
      const pair = (layer === "L7" ? l7 : l3).draw();
      let vector: string;
      let magnitude: string;
      let severity: number;
      if (layer === "L3") {
        const b = bitrates.empty ? null : bitrates.draw();
        const [lo, hi, sev] = BITRATE_MBPS[b?.key ?? "UNDER_500_MBPS"] ?? BITRATE_MBPS.UNDER_500_MBPS;
        magnitude = fmtBits(logUniform(lo, hi));
        severity = sev;
        vector = vectors.empty ? "Network flood" : vectors.draw().name;
      } else {
        const rps = Math.exp(Math.log(4000) + 1.4 * gauss()); // heavy-tailed request rate
        magnitude = fmtRps(rps);
        severity = Math.min(1, Math.max(0.1, Math.log10(rps) / 6.5));
        const m = methods.empty ? "GET" : methods.draw().name;
        const p = products.empty ? null : products.draw().name;
        vector = `HTTP ${m} flood${p ? ` · ${p}` : ""}`;
      }
      return {
        id: ++id,
        at: now,
        layer,
        origin: pair.origin,
        originName: pair.originName || pair.origin,
        target: pair.target,
        targetName: pair.targetName || pair.target,
        vector,
        magnitude,
        severity,
      };
    },
  };
}
