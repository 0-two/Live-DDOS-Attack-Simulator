export type Layer = "L3" | "L7";

export type Share = { key: string; name: string; share: number };

export type Pair = {
  layer: Layer;
  origin: string;
  originName: string;
  target: string;
  targetName: string;
  /** Relative weight (percentage share in Cloudflare's aggregate). */
  weight: number;
};

export type Snapshot = {
  source: "cloudflare" | "sample";
  fetchedAt: string;
  /** Window Cloudflare aggregated over. */
  dateRange: { start: string; end: string } | null;
  lastUpdated: string | null;
  pairs: Pair[];
  l3Origins: Share[];
  l3Targets: Share[];
  l3Vectors: Share[];
  l3Protocols: Share[];
  l3Bitrates: Share[];
  l7Methods: Share[];
  l7Products: Share[];
  /** Normalized (0..1) L3 attack volume series, oldest → newest. */
  intensity: { t: string; v: number }[];
  errors: string[];
};

export type AttackEvent = {
  id: number;
  at: number;
  layer: Layer;
  origin: string;
  originName: string;
  target: string;
  targetName: string;
  vector: string;
  /** Human-readable magnitude, e.g. "18.2 Gbps" or "42k rps". */
  magnitude: string;
  /** 0..1, used for arc thickness/brightness. */
  severity: number;
};
