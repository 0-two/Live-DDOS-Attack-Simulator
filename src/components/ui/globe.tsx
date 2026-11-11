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

type GlobeProps = {
  globeConfig: GlobeConfig;
  arcs: GlobeArc[];
  points: GlobePoint[];
  rings: GlobeRing[];
};

function rgba(hex: string, a: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

export function Globe({ globeConfig, arcs, points, rings }: GlobeProps) {
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
        const c = (d as GlobeArc).color;
        return [rgba(c, 0.15), c];
      })
      .arcAltitude((d) => (d as GlobeArc).arcAlt)
      .arcStroke((d) => (d as GlobeArc).stroke)
      .arcDashLength(cfg.arcLength)
      .arcDashGap(50)
      .arcDashInitialGap(1)
      .arcDashAnimateTime(cfg.arcTime)
      .arcsTransitionDuration(0);

    g.pointColor((d) => (d as GlobePoint).color)
      .pointAltitude(0.005)
      .pointRadius((d) => (d as GlobePoint).size)
      .pointsMerge(true)
      .pointsTransitionDuration(0);

    g.ringColor((d: object) => (t: number) => rgba((d as GlobeRing).color, Math.max(0, 1 - t)))
      .ringMaxRadius((d: object) => (d as GlobeRing).maxRadius)
      .ringPropagationSpeed(4)
      .ringRepeatPeriod(700);

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
  useEffect(() => {
    if (ready) globeRef.current?.arcsData(arcs);
  }, [ready, arcs]);

  useEffect(() => {
    if (ready) globeRef.current?.pointsData(points);
  }, [ready, points]);

  useEffect(() => {
    if (ready) globeRef.current?.ringsData(rings);
  }, [ready, rings]);

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
    <Canvas scene={scene} camera={camera} dpr={[1, 2]}>
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
