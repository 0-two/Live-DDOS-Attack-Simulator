import { getSnapshot } from "@/lib/radar";

export async function GET() {
  const snapshot = await getSnapshot();
  return Response.json(snapshot, {
    headers: {
      // Let Vercel's CDN absorb client polling; Radar is hit at most every ~5 min.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
