# Live DDoS Attack Map

A 3D globe (Aceternity UI's Globe, built on three-globe and react-three-fiber) that shows a live stream of DDoS attacks, synthesized from **Cloudflare Radar's** aggregated attack data.

## How the "live" data works

Cloudflare Radar publishes **aggregates** rather than a raw event stream. This app turns them back into individual events:

1. **`/api/attacks`** (`src/app/api/attacks/route.ts` → `src/lib/radar.ts`) pulls these, all over the last 24h:
   - Layer 7 top origin→target country pairs (`/radar/attacks/layer7/top/attacks`)
   - Layer 3 top attack pairs, or top origin × top target locations when pairs aren't returned
   - The mix of L3 vectors, protocols and bitrates, and of L7 HTTP methods and mitigation products
   - The L3 attack-volume timeseries (15-minute buckets)

   The result is cached with `'use cache'` / `cacheLife({ revalidate: 300 })` and `s-maxage=300`, so Cloudflare is called at most about every 5 minutes, however many people are watching.
2. **The client** (`src/lib/simulate.ts`, `src/hooks/use-attack-stream.ts`) re-fetches every 5 minutes and generates events as a Poisson process:
   - Each event's origin→target pair, vector and magnitude are drawn in proportion to Cloudflare's shares, so over time the stream matches the real distribution.
   - The arrival rate follows the 24h intensity curve, replayed in compressed time (15 seconds per 15-minute bucket).

If the token is missing or the API fails, the API returns built-in sample data and the UI labels it **Sample data**.

> Note: for Layer 3 attacks Cloudflare reports the *data center* that received the traffic as the origin, because source IPs are spoofed.


## Regenerating geo data

`src/data/globe.json` (country polygons) and `src/data/centroids.json` come from Natural Earth 110m, via `scripts/build-geo.mjs`.

Data: Cloudflare Radar, licensed CC BY-NC 4.0.
