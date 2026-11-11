"use client";
import dynamic from "next/dynamic";
import type { GlobeConfig } from "@/components/ui/globe";
import { ARC_TIME, useAttackStream } from "@/hooks/use-attack-stream";
import { CountryList, Feed, Intensity, RadarMix, Stats, StatusPill } from "./panels";

// three.js needs `window`; render the globe only on the client.
const World = dynamic(() => import("@/components/ui/globe").then((m) => m.World), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse rounded-full bg-white/[0.02]" />,
});

const GLOBE_CONFIG: GlobeConfig = {
  globeColor: "#122555",
  showAtmosphere: true,
  atmosphereColor: "#5b8cff",
  atmosphereAltitude: 0.12,
  emissive: "#0a1a44",
  emissiveIntensity: 0.45,
  shininess: 0.8,
  polygonColor: "rgba(175, 205, 255, 0.75)",
  ambientLight: "#6b8cff",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: ARC_TIME,
  arcLength: 0.45,
  autoRotate: true,
  autoRotateSpeed: 0.5,
};

export function AttackMap() {
  const s = useAttackStream();

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[1800px] flex-col px-4 pb-4 lg:h-dvh lg:overflow-hidden lg:px-6">
      {/* Header */}
      <header className="relative z-10 flex flex-col gap-3 pt-4 sm:flex-row sm:items-start sm:justify-between lg:pt-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Live DDoS Attack Map</h1>
          <p className="mt-0.5 max-w-md text-xs text-muted">
            Attacks synthesized in real time from Cloudflare Radar&apos;s aggregated Layer 3/4 and Layer 7 DDoS data.
          </p>
        </div>
        <StatusPill snapshot={s.snapshot} status={s.status} error={s.error} nextRefreshAt={s.nextRefreshAt} />
      </header>

      {/* Globe — centred behind the side panels on desktop, inline on mobile */}
      <div className="pointer-events-none relative mx-auto my-2 aspect-square w-full max-w-[640px] lg:absolute lg:inset-0 lg:m-auto lg:h-[min(92dvh,calc(100vw-700px))] lg:w-auto lg:max-w-none">
        <div className="pointer-events-auto size-full">
          <World globeConfig={GLOBE_CONFIG} arcs={s.arcs} points={s.points} rings={s.rings} />
        </div>
      </div>

      {s.status === "error" && !s.snapshot && (
        <div className="panel relative z-10 mx-auto mt-4 max-w-md p-4 text-sm">
          Couldn&apos;t load attack data ({s.error}). Retrying in a few minutes.
        </div>
      )}

      {/* Panels */}
      <div className="relative z-10 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:pointer-events-none lg:mt-4 lg:grid-cols-[300px_1fr_320px] lg:min-h-0">
        <aside className="flex flex-col gap-3 lg:pointer-events-auto lg:min-h-0 lg:overflow-y-auto">
          <Stats total={s.total} perSecond={s.perSecond} byLayer={s.byLayer} />
          <CountryList title="Top targets" rows={s.topTargets} />
          <CountryList title="Top sources" rows={s.topOrigins} />
        </aside>

        <div className="hidden lg:block" />

        <aside className="flex flex-col gap-3 lg:pointer-events-auto lg:min-h-0">
          <Feed events={s.feed} />
          {s.snapshot && <RadarMix snapshot={s.snapshot} />}
          {s.snapshot && <Intensity snapshot={s.snapshot} pos={s.replay.pos} />}
        </aside>
      </div>

      <footer className="relative z-10 mt-3 text-center text-[10px] leading-relaxed text-muted/80 lg:absolute lg:inset-x-[360px] lg:bottom-3 lg:mt-0">
        Individual events are sampled from Cloudflare Radar&apos;s last-24h distributions (origin→target pairs, vectors,
        bitrates, HTTP methods), not a raw feed. L3 origin reflects the Cloudflare data center that saw the traffic.
        Data:{" "}
        <a className="underline decoration-dotted underline-offset-2 hover:text-foreground" href="https://radar.cloudflare.com/security/network-layer" target="_blank" rel="noreferrer">
          Cloudflare Radar
        </a>{" "}
        (CC BY-NC 4.0).
      </footer>
    </main>
  );
}
