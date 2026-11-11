"use client";
/**
 * Adapted from Aceternity UI's Globe (https://ui.aceternity.com/components/github-globe).
 * Changes for a live feed:
 *  - country hex polygons are built once instead of on every data change
 *  - arcs/points/rings are separate props that can be swapped many times a second
 *  - each arc fires once (origin → target) instead of looping
 *  - Canvas scene/camera are memoised so parent re-renders don't rebuild them
 */
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Color, Fog, Group, Scene, Vector3 } from "three";
import ThreeGlobe from "three-globe";
import { Canvas, extend, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import countries from "@/data/globe.json";

declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: ThreeElements["mesh"] & { new (): ThreeGlobe };
  }
}
extend({ ThreeGlobe });

const cameraZ = 300;

export type GlobeArc = {
  id: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
  stroke: number;
};

export type GlobePoint = { lat: number; lng: number; color: string; size: number };
export type GlobeRing = { lat: number; lng: number; color: string; maxRadius: number };

export type GlobeConfig = {
  globeColor?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shininess?: number;
  polygonColor?: string;
  ambientLight?: string;
  directionalLeftLight?: string;
  directionalTopLight?: string;
  pointLight?: string;
  /** ms for an arc's dash to travel origin → target */
  arcTime?: number;
  /** dash length relative to arc (0..1) */
  arcLength?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};

export type GlobeFrame = { arcs: GlobeArc[]; points: GlobePoint[]; rings: GlobeRing[] };

/**
 * Arc/point/ring data is pushed through a subscription instead of props, so a
 * new arc updates three-globe directly without re-rendering the React tree
 * (and the R3F canvas) several times a second.
 */
export type GlobeFeed = {
  get(): GlobeFrame;
  subscribe(fn: (f: GlobeFrame) => void): () => void;
};

type GlobeProps = {
  globeConfig: GlobeConfig;
  feed: GlobeFeed;
};

/**
 * An invisible, permanent ring (speed 0, no repeat → created once, never removed).
 * Impact rings are short-lived; whenever none were alive three.js released the
 * line shader and recompiled it for the next ring, causing a visible hitch.
 */
const KEEPALIVE_RING: GlobeRing = { lat: 0, lng: 0, color: "#000000", maxRadius: 0.5 };
// Same idea for arcs and points, which can all disappear while paused or filtered.
const KEEPALIVE_ARC: GlobeArc = {
  id: -1, startLat: 0, startLng: 0, endLat: 0, endLng: 1, arcAlt: 0.01, color: "#000000", stroke: 0.01,
};
const KEEPALIVE_POINT: GlobePoint = { lat: 0, lng: 0, color: "rgba(0,0,0,0)", size: 0.01 };

function rgba(hex: string, a: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

export function Globe({ globeConfig, feed }: GlobeProps) {
  const globeRef = useRef<ThreeGlobe | null>(null);
  const groupRef = useRef<Group>(null);
  const [ready, setReady] = useState(false);

  const cfg = {
    atmosphereColor: "#ffffff",
    showAtmosphere: true,
    atmosphereAltitude: 0.1,
    polygonColor: "rgba(255,255,255,0.7)",
    globeColor: "#1d072e",
    emissive: "#000000",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    arcTime: 1600,
    arcLength: 0.45,
    ...globeConfig,
  };

  // Create globe + static layers once.
  useEffect(() => {
    if (globeRef.current || !groupRef.current) return;
    const g = new ThreeGlobe();
    groupRef.current.add(g);
    globeRef.current = g;

    g.hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.7)
      .showAtmosphere(cfg.showAtmosphere)
      .atmosphereColor(cfg.atmosphereColor)
      .atmosphereAltitude(cfg.atmosphereAltitude)
      .hexPolygonColor(() => cfg.polygonColor);

    // Dash runs once: starts at origin (initial gap 1 — distances run end→start),
    // reaches the target after arcTime, and the huge gap prevents a repeat.
    g.arcStartLat((d) => (d as GlobeArc).startLat)
      .arcStartLng((d) => (d as GlobeArc).startLng)
      .arcEndLat((d) => (d as GlobeArc).endLat)
      .arcEndLng((d) => (d as GlobeArc).endLng)
      .arcColor((d: object) => {
        if (d === KEEPALIVE_ARC) return ["rgba(0,0,0,0)", "rgba(0,0,0,0)"];
        const c = (d as GlobeArc).color;
        return [rgba(c, 0.15), c];
      })
      .arcAltitude((d) => (d as GlobeArc).arcAlt)
      .arcStroke((d) => (d as GlobeArc).stroke)
      .arcDashLength(cfg.arcLength)
      .arcDashGap(50)
      .arcDashInitialGap(1)
      .arcDashAnimateTime(cfg.arcTime)
      .arcCurveResolution(40) // default 64; plenty for short-lived arcs
      .arcCircularResolution(4) // default 6; tubes are thin
      .arcsTransitionDuration(0);

    g.pointColor((d) => (d as GlobePoint).color)
      .pointAltitude(0.005)
      .pointRadius((d) => (d as GlobePoint).size)
      // Not merged: a merged mesh is rebuilt (new material, disposed old one) on every
      // change, which forces three.js to recompile the shader each time.
      .pointsMerge(false)
      .pointsTransitionDuration(0);

    g.ringColor((d: object) =>
      d === KEEPALIVE_RING ? "rgba(0,0,0,0)" : (t: number) => rgba((d as GlobeRing).color, Math.max(0, 1 - t)),
    )
      .ringMaxRadius((d: object) => (d as GlobeRing).maxRadius)
      .ringPropagationSpeed((d: object) => (d === KEEPALIVE_RING ? 0 : 4))
      .ringRepeatPeriod((d: object) => (d === KEEPALIVE_RING ? 0 : 700));

    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !globeRef.current) return;
    const m = globeRef.current.globeMaterial() as unknown as {
      color: Color;
      emissive: Color;
      emissiveIntensity: number;
      shininess: number;
    };
    m.color = new Color(cfg.globeColor);
    m.emissive = new Color(cfg.emissive);
    m.emissiveIntensity = cfg.emissiveIntensity;
    m.shininess = cfg.shininess;
  }, [ready, cfg.globeColor, cfg.emissive, cfg.emissiveIntensity, cfg.shininess]);

  // Arc objects keep their identity between updates, so three-globe only
  // creates geometry for new arcs and existing dashes keep animating.
  // Each layer is only re-digested when its array actually changed.
  useEffect(() => {
    const g = globeRef.current;
    if (!ready || !g) return;
    let prev: GlobeFrame = { arcs: [], points: [], rings: [] };
    const apply = (f: GlobeFrame) => {
      if (f.arcs !== prev.arcs) g.arcsData([KEEPALIVE_ARC, ...f.arcs]);
      if (f.points !== prev.points) g.pointsData([KEEPALIVE_POINT, ...f.points]);
      if (f.rings !== prev.rings) g.ringsData([KEEPALIVE_RING, ...f.rings]);
      prev = f;
    };
    apply(feed.get());
    return feed.subscribe(apply);
  }, [ready, feed]);

  return <group ref={groupRef} />;
}

function WebGLRendererConfig() {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(0xffaaff, 0);
  }, [gl]);
  return null;
}

export const World = memo(function World(props: GlobeProps) {
  const { globeConfig } = props;
  const scene = useMemo(() => {
    const s = new Scene();
    s.fog = new Fog(0xffffff, 400, 2000);
    return s;
  }, []);
  // Camera as props (not an instance) so R3F keeps its aspect in sync with the canvas.
  const camera = useMemo(
    () => ({ fov: 50, near: 180, far: 1800, position: [0, 0, cameraZ] as [number, number, number] }),
    [],
  );

  return (
    <Canvas scene={scene} camera={camera} dpr={[1, 1.5]} gl={{ powerPreference: "high-performance" }}>
      <WebGLRendererConfig />
      <ambientLight color={globeConfig.ambientLight} intensity={0.6} />
      <directionalLight color={globeConfig.directionalLeftLight} position={new Vector3(-400, 100, 400)} />
      <directionalLight color={globeConfig.directionalTopLight} position={new Vector3(-200, 500, 200)} />
      <pointLight color={globeConfig.pointLight} position={new Vector3(-200, 500, 200)} intensity={0.8} />
      <Globe {...props} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={cameraZ}
        maxDistance={cameraZ}
        autoRotateSpeed={globeConfig.autoRotateSpeed ?? 0.6}
        autoRotate={globeConfig.autoRotate ?? true}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI - Math.PI / 3}
      />
    </Canvas>
  );
});
