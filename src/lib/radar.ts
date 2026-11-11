import "server-only";
import { cacheLife } from "next/cache";
import { locate } from "./geo";
import type { Pair, Share, Snapshot } from "./types";
import { SAMPLE_SNAPSHOT } from "./sample";

const API = "https://api.cloudflare.com/client/v4/radar";
const RANGE = "1d";

type Json = Record<string, unknown>;

async function radar(path: string, params: Record<string, string | number> = {}): Promise<Json> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN is not set");
  const qs = new URLSearchParams({ dateRange: RANGE, format: "json", ...stringify(params) });
  const res = await fetch(`${API}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store", // caching is handled by the surrounding 'use cache' scope
  });
  const body = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok || body.success === false) {
    const errs = (body.errors as { message?: string }[] | undefined)?.map((e) => e.message).join("; ");
    throw new Error(`${path}: HTTP ${res.status}${errs ? ` – ${errs}` : ""}`);
  }
  return (body.result ?? {}) as Json;
}

/** Try each path in order; deprecated Radar endpoints have newer generic equivalents. */
async function radarAny(paths: string[], params?: Record<string, string | number>) {
  let last: unknown;
  for (const p of paths) {
    try {
      return await radar(p, params);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

const stringify = (o: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]));

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

const LABELS: Record<string, string> = {
  UNDER_500_MBPS: "< 500 Mbps",
  _500_MBPS_TO_1_GBPS: "0.5–1 Gbps",
  _1_GBPS_TO_10_GBPS: "1–10 Gbps",
  _10_GBPS_TO_100_GBPS: "10–100 Gbps",
  OVER_100_GBPS: "> 100 Gbps",
  DDOS: "DDoS mitigation",
  WAF: "WAF",
  BOT_MANAGEMENT: "Bot management",
  ACCESS_RULES: "Access rules",
  IP_REPUTATION: "IP reputation",
  API_SHIELD: "API Shield",
  DATA_LOSS_PREVENTION: "DLP",
};

function summaryShares(result: Json): Share[] {
  const s = (result.summary_0 ?? {}) as Record<string, unknown>;
  return Object.entries(s)
    .map(([key, v]) => ({ key, name: LABELS[key] ?? key, share: num(v) }))
    .filter((x) => x.share > 0)
    .sort((a, b) => b.share - a.share);
}

function topShares(result: Json, side: "origin" | "target"): Share[] {
  const rows = (result.top_0 ?? []) as Json[];
  return rows
    .map((r) => {
      const key = String(r[`${side}CountryAlpha2`] ?? "");
      return { key, name: String(r[`${side}CountryName`] ?? key), share: num(r.value) };
    })
    .filter((x) => x.key && x.share > 0 && locate(x.key));
}

function pairRows(result: Json, layer: Pair["layer"]): Pair[] {
  const rows = (result.top_0 ?? []) as Json[];
  return rows
    .map((r) => ({
      layer,
      origin: String(r.originCountryAlpha2 ?? ""),
      originName: String(r.originCountryName ?? ""),
      target: String(r.targetCountryAlpha2 ?? ""),
      targetName: String(r.targetCountryName ?? ""),
      weight: num(r.value),
    }))
    .filter((p) => p.weight > 0 && locate(p.origin) && locate(p.target));
}

/**
 * Layer 3 origin-target pairs aren't reliably exposed (source IPs are spoofed,
 * so Cloudflare attributes L3 "origin" to the ingesting data center). When the
 * API doesn't give pairs, approximate the joint distribution as origin × target.
 */
function crossPairs(origins: Share[], targets: Share[]): Pair[] {
  const o = origins.slice(0, 15);
  const t = targets.slice(0, 15);
  const out: Pair[] = [];
  for (const a of o)
    for (const b of t) {
      if (a.key === b.key) continue;
      out.push({
        layer: "L3",
        origin: a.key,
        originName: a.name,
        target: b.key,
        targetName: b.name,
        weight: (a.share * b.share) / 100,
      });
    }
  return out;
}

function series(result: Json): { t: string; v: number }[] {
  const s = (result.serie_0 ?? {}) as { timestamps?: string[]; values?: unknown[] };
  const ts = s.timestamps ?? [];
  const vs = (s.values ?? []).map(num);
  const max = Math.max(1e-9, ...vs);
  return ts.map((t, i) => ({ t, v: vs[i] / max }));
}

function meta(result: Json) {
  const m = (result.meta ?? {}) as Json;
  const dr = (m.dateRange as { startTime: string; endTime: string }[] | undefined)?.[0];
  return {
    dateRange: dr ? { start: dr.startTime, end: dr.endTime } : null,
    lastUpdated: (m.lastUpdated as string | undefined) ?? null,
  };
}

export async function getSnapshot(): Promise<Snapshot> {
  "use cache";
  // Radar aggregates update roughly every 15 minutes; refresh our copy every 5.
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });

  if (!process.env.CLOUDFLARE_API_TOKEN) {
    return {
      ...SAMPLE_SNAPSHOT,
      fetchedAt: new Date().toISOString(),
      errors: ["CLOUDFLARE_API_TOKEN is not set – showing sample data."],
    };
  }

  const calls = {
    l7Pairs: radar("/attacks/layer7/top/attacks", { limit: 100 }),
    l3Pairs: radar("/attacks/layer3/top/attacks", { limit: 100 }),
    l3Origins: radar("/attacks/layer3/top/locations/origin", { limit: 25 }),
    l3Targets: radar("/attacks/layer3/top/locations/target", { limit: 25 }),
    l3Vectors: radarAny(["/attacks/layer3/summary/VECTOR", "/attacks/layer3/summary/vector"], { limitPerGroup: 8 }),
    l3Protocols: radarAny(["/attacks/layer3/summary/PROTOCOL", "/attacks/layer3/summary/protocol"]),
    l3Bitrates: radarAny(["/attacks/layer3/summary/BITRATE", "/attacks/layer3/summary/bitrate"]),
    l7Methods: radarAny(["/attacks/layer7/summary/HTTP_METHOD", "/attacks/layer7/summary/http_method"], { limitPerGroup: 6 }),
    l7Products: radarAny(["/attacks/layer7/summary/MITIGATION_PRODUCT", "/attacks/layer7/summary/mitigation_product"]),
    intensity: radar("/attacks/layer3/timeseries", { aggInterval: "15m", normalization: "MIN0_MAX" }),
  };

  const keys = Object.keys(calls) as (keyof typeof calls)[];
  const settled = await Promise.allSettled(keys.map((k) => calls[k]));
  const got = {} as Partial<Record<keyof typeof calls, Json>>;
  const errors: string[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") got[keys[i]] = r.value;
    else errors.push(String((r.reason as Error)?.message ?? r.reason));
  });

  const l7Pairs = got.l7Pairs ? pairRows(got.l7Pairs, "L7") : [];
  const l3Origins = got.l3Origins ? topShares(got.l3Origins, "origin") : [];
  const l3Targets = got.l3Targets ? topShares(got.l3Targets, "target") : [];
  let l3Pairs = got.l3Pairs ? pairRows(got.l3Pairs, "L3") : [];
  if (l3Pairs.length === 0) l3Pairs = crossPairs(l3Origins, l3Targets);

  // Nothing usable for the map → fall back so the page still works.
  if (l7Pairs.length === 0 && l3Pairs.length === 0) {
    return { ...SAMPLE_SNAPSHOT, fetchedAt: new Date().toISOString(), errors };
  }

  const m = meta(got.l7Pairs ?? got.l3Origins ?? {});
  const pick = (s: Share[], fallback: Share[]) => (s.length ? s : fallback);

  return {
    source: "cloudflare",
    fetchedAt: new Date().toISOString(),
    dateRange: m.dateRange,
    lastUpdated: m.lastUpdated,
    pairs: [...l7Pairs, ...l3Pairs],
    l3Origins,
    l3Targets,
    l3Vectors: pick(got.l3Vectors ? summaryShares(got.l3Vectors) : [], SAMPLE_SNAPSHOT.l3Vectors),
    l3Protocols: pick(got.l3Protocols ? summaryShares(got.l3Protocols) : [], SAMPLE_SNAPSHOT.l3Protocols),
    l3Bitrates: pick(got.l3Bitrates ? summaryShares(got.l3Bitrates) : [], SAMPLE_SNAPSHOT.l3Bitrates),
    l7Methods: pick(got.l7Methods ? summaryShares(got.l7Methods) : [], SAMPLE_SNAPSHOT.l7Methods),
    l7Products: pick(got.l7Products ? summaryShares(got.l7Products) : [], SAMPLE_SNAPSHOT.l7Products),
    intensity: got.intensity ? series(got.intensity) : [],
    errors,
  };
}
