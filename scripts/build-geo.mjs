// One-off: slim Natural Earth 110m countries GeoJSON for the globe and derive
// per-country centroids (largest polygon, area-weighted) keyed by ISO alpha-2.
// Usage: node scripts/build-geo.mjs <path-to-ne_110m_admin_0_countries.geojson>
import fs from "node:fs";

const src = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const ring = (r) => {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f;
  }
  a /= 2;
  return { area: Math.abs(a), lng: cx / (6 * a), lat: cy / (6 * a) };
};

const iso = (p) => {
  if (p.ISO_A2 && p.ISO_A2 !== "-99") return p.ISO_A2;
  if (p.WB_A2 && p.WB_A2 !== "-99") return p.WB_A2;
  return { Norway: "NO", France: "FR", Kosovo: "XK" }[p.ADMIN] ?? null;
};

const features = [];
const centroids = {};
for (const f of src.features) {
  const code = iso(f.properties);
  features.push({
    type: "Feature",
    properties: { iso: code, name: f.properties.NAME },
    geometry: f.geometry,
  });
  if (!code) continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const best = polys.map((p) => ring(p[0])).sort((a, b) => b.area - a.area)[0];
  centroids[code] = { lat: +best.lat.toFixed(2), lng: +best.lng.toFixed(2), name: f.properties.NAME };
}

fs.writeFileSync("src/data/globe.json", JSON.stringify({ type: "FeatureCollection", features }));
fs.writeFileSync("src/data/centroids.json", JSON.stringify(centroids, null, 0));
console.log(features.length, "features,", Object.keys(centroids).length, "centroids");
