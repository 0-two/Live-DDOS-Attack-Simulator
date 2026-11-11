import type { Pair, Share, Snapshot } from "./types";

/**
 * Illustrative fallback used only when the Cloudflare API is unavailable or no
 * token is configured. The UI labels it as sample data. Values are rough
 * shapes, not real measurements.
 */
const s = (rows: [string, string, number][]): Share[] =>
  rows.map(([key, name, share]) => ({ key, name, share }));

const l3Origins = s([
  ["US", "United States", 14], ["DE", "Germany", 9], ["BR", "Brazil", 7],
  ["SG", "Singapore", 6], ["ID", "Indonesia", 6], ["VN", "Vietnam", 5],
  ["IN", "India", 5], ["NL", "Netherlands", 5], ["HK", "Hong Kong", 4],
  ["AR", "Argentina", 4], ["GB", "United Kingdom", 3], ["FR", "France", 3],
]);
const l3Targets = s([
  ["CN", "China", 13], ["US", "United States", 11], ["DE", "Germany", 8],
  ["BR", "Brazil", 7], ["HK", "Hong Kong", 6], ["TR", "Turkey", 5],
  ["KR", "South Korea", 5], ["SG", "Singapore", 4], ["GB", "United Kingdom", 4],
  ["RU", "Russia", 4], ["TW", "Taiwan", 3], ["JP", "Japan", 3],
]);

const l7: [string, string, number][] = [
  ["US", "US", 9], ["ID", "US", 5], ["DE", "US", 4], ["CN", "US", 4],
  ["BR", "BR", 4], ["US", "GB", 3], ["NL", "DE", 3], ["IN", "IN", 3],
  ["RU", "UA", 3], ["SG", "HK", 2.5], ["VN", "US", 2.5], ["FR", "FR", 2],
  ["US", "CA", 2], ["GB", "US", 2], ["KR", "JP", 2], ["ID", "SG", 2],
  ["CN", "TW", 2], ["DE", "DE", 1.8], ["BR", "AR", 1.6], ["US", "AU", 1.5],
  ["TR", "IL", 1.5], ["IR", "IL", 1.4], ["IN", "PK", 1.2], ["RU", "PL", 1.2],
  ["US", "JP", 1.1], ["NG", "ZA", 1], ["MX", "US", 1], ["UA", "RU", 1],
];
const names = Object.fromEntries([...l3Origins, ...l3Targets].map((x) => [x.key, x.name]));
const EXTRA_NAMES: Record<string, string> = {
  IL: "Israel", ZA: "South Africa", IR: "Iran", CA: "Canada", AU: "Australia", UA: "Ukraine",
  PL: "Poland", PK: "Pakistan", NG: "Nigeria", MX: "Mexico",
};
const nm = (k: string) => names[k] ?? EXTRA_NAMES[k] ?? k;

const pairs: Pair[] = [
  ...l7
    .filter(([o, t]) => o !== t)
    .map(([o, t, w]) => ({ layer: "L7" as const, origin: o, originName: nm(o), target: t, targetName: nm(t), weight: w })),
  ...l3Origins.slice(0, 8).flatMap((o) =>
    l3Targets.slice(0, 8).filter((t) => t.key !== o.key).map((t) => ({
      layer: "L3" as const, origin: o.key, originName: o.name, target: t.key, targetName: t.name,
      weight: (o.share * t.share) / 100,
    })),
  ),
];

export const SAMPLE_SNAPSHOT: Snapshot = {
  source: "sample",
  fetchedAt: new Date(0).toISOString(),
  dateRange: null,
  lastUpdated: null,
  pairs,
  l3Origins,
  l3Targets,
  l3Vectors: s([
    ["SYN Flood", "SYN Flood", 38], ["DNS Flood", "DNS Flood", 17], ["UDP Flood", "UDP Flood", 14],
    ["ACK Flood", "ACK Flood", 9], ["RST Flood", "RST Flood", 7], ["Mirai", "Mirai", 6],
    ["GRE Flood", "GRE Flood", 5], ["Other", "Other", 4],
  ]),
  l3Protocols: s([["UDP", "UDP", 45], ["TCP", "TCP", 48], ["ICMP", "ICMP", 4], ["GRE", "GRE", 3]]),
  l3Bitrates: s([
    ["UNDER_500_MBPS", "< 500 Mbps", 88], ["_500_MBPS_TO_1_GBPS", "0.5–1 Gbps", 6],
    ["_1_GBPS_TO_10_GBPS", "1–10 Gbps", 5], ["_10_GBPS_TO_100_GBPS", "10–100 Gbps", 0.9],
    ["OVER_100_GBPS", "> 100 Gbps", 0.1],
  ]),
  l7Methods: s([["GET", "GET", 72], ["POST", "POST", 20], ["HEAD", "HEAD", 4], ["PUT", "PUT", 2], ["OTHER", "Other", 2]]),
  l7Products: s([
    ["DDOS", "DDoS mitigation", 37], ["WAF", "WAF", 41], ["IP_REPUTATION", "IP reputation", 10],
    ["ACCESS_RULES", "Access rules", 7], ["BOT_MANAGEMENT", "Bot management", 4], ["API_SHIELD", "API Shield", 1],
  ]),
  intensity: Array.from({ length: 96 }, (_, i) => ({
    t: new Date(Date.UTC(2026, 0, 1) + i * 15 * 60_000).toISOString(),
    v: 0.55 + 0.25 * Math.sin(i / 7) + 0.15 * Math.sin(i / 2.3),
  })),
  errors: [],
};
