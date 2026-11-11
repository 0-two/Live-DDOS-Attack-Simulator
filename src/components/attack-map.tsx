"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Spotlight } from "@/components/ui/spotlight-new";
import type { GlobeConfig } from "@/components/ui/globe";
import { ARC_TIME, useAttackStream, type LayerFilter } from "@/hooks/use-attack-stream";
import { AttackMix } from "./dashboard/attack-mix";
import { CountryTabs } from "./dashboard/country-tabs";
import { Hero, Stats } from "./dashboard/hero";
import { LiveFeed } from "./dashboard/live-feed";
import { PairTicker } from "./dashboard/pair-ticker";
import { PeakCard } from "./dashboard/peak-card";
import { SourceCard } from "./dashboard/source-card";
import { TopBar } from "./dashboard/top-bar";

// three.js needs `window`; render the globe only on the client.
const World = dynamic(() => import("@/components/ui/globe").then((m) => m.World), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center">
      <div className="aspect-square w-[62%] animate-pulse rounded-full bg-white/[0.025]" />
    </div>
  ),
});

const BASE_GLOBE: GlobeConfig = {
  globeColor: "#34302b",
  showAtmosphere: true,
  atmosphereColor: "#ffd2b8",
  atmosphereAltitude: 0.13,
  emissive: "#2a2622",
  emissiveIntensity: 0.6,
  shininess: 0.6,
  polygonColor: "rgba(242, 234, 222, 0.72)",
  ambientLight: "#fff3e8",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: ARC_TIME,
  arcLength: 0.45,
  autoRotateSpeed: 0.45,
};

const WARM = {
  gradientFirst:
    "radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(18, 100%, 82%, .07) 0, hsla(18, 100%, 55%, .02) 50%, hsla(18, 100%, 45%, 0) 80%)",
  gradientSecond:
    "radial-gradient(50% 50% at 50% 50%, hsla(40, 100%, 85%, .05) 0, hsla(40, 100%, 55%, .015) 80%, transparent 100%)",
  gradientThird:
    "radial-gradient(50% 50% at 50% 50%, hsla(80, 90%, 80%, .035) 0, hsla(80, 90%, 45%, .015) 80%, transparent 100%)",
};

export function AttackMap() {
  const [layers, setLayers] = useState<LayerFilter>("all");
  const [paused, setPaused] = useState(false);
  const [spin, setSpin] = useState(true);
  const options = useMemo(() => ({ layers, paused }), [layers, paused]);
  const s = useAttackStream(options);
  const globeConfig = useMemo(() => ({ ...BASE_GLOBE, autoRotate: spin }), [spin]);

  return (
    <main className="relative isolate min-h-dvh overflow-x-clip lg:h-dvh lg:overflow-hidden">
      {/* Atmosphere */}
      <div className="dot-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgba(255,91,58,0.07),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
        <Spotlight {...WARM} />
      </div>

      <div className="relative mx-auto flex h-full max-w-[1760px] flex-col px-4 pt-4 pb-3 sm:px-6 lg:pt-5">
        <TopBar
          layers={layers}
          onLayers={setLayers}
          paused={paused}
          onPaused={setPaused}
          spin={spin}
          onSpin={setSpin}
          source={<SourceCard snapshot={s.snapshot} status={s.status} error={s.error} nextRefreshAt={s.nextRefreshAt} />}
        />

        <div className="mt-8 flex min-h-0 flex-1 flex-col gap-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(300px,340px)_1fr_minmax(300px,340px)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-10 lg:gap-y-8">
          {/* Headline */}
          <div className="relative z-10 lg:col-start-1 lg:row-start-1">
            <Hero snapshot={s.snapshot} />
          </div>

          {/* Globe: inline on mobile, centred behind the columns on desktop */}
          <div className="relative -mx-4 aspect-square sm:mx-auto sm:w-full sm:max-w-[560px] lg:pointer-events-none lg:fixed lg:inset-0 lg:z-0 lg:m-auto lg:aspect-auto lg:h-[min(100dvh,calc(100vw-620px))] lg:w-[min(100dvh,calc(100vw-620px))] lg:max-w-none">
            <div className="size-full lg:pointer-events-auto">
              <World globeConfig={globeConfig} arcs={s.arcs} points={s.points} rings={s.rings} />
            </div>
          </div>

          {/* Left column */}
          <div className="relative z-10 flex flex-col gap-8 lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto lg:[scrollbar-width:none]">
            <Stats perSecond={s.perSecond} total={s.total} byLayer={s.byLayer} />
            <CountryTabs targets={s.topTargets.slice(0, 7)} sources={s.topOrigins.slice(0, 7)} />
          </div>

          {/* Right column */}
          <div className="relative z-10 flex flex-col gap-4 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:min-h-0">
            <PeakCard peak={s.peak} />
            <div className="flex h-[420px] min-h-0 flex-col lg:h-auto lg:flex-1">
              <LiveFeed events={s.feed} paused={paused} />
            </div>
            {s.snapshot && <AttackMix snapshot={s.snapshot} pos={s.replay.pos} />}
          </div>
        </div>

        {/* Bottom strip */}
        <div className="relative z-10 mt-6 border-t pt-3">
          {s.snapshot ? <PairTicker snapshot={s.snapshot} /> : <div className="h-5" />}
          <p className="mt-2 text-center text-[10px] text-faint">
            Simulated from Cloudflare Radar aggregates, not raw packets · Data CC BY-NC 4.0
          </p>
        </div>

        {s.status === "error" && !s.snapshot && (
          <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-sm rounded-xl border bg-popover p-4 text-sm shadow-xl">
            Couldn&apos;t load attack data ({s.error}). Retrying shortly.
          </div>
        )}
      </div>
    </main>
  );
}
