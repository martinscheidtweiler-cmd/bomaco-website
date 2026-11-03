import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(_request: NextRequest, context: { params: Promise<{ part: string }> }) {
  const { part } = await context.params;
  if (part !== "bridge" && part !== "auction") return new NextResponse("Not found", { status: 404 });
  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const fallback = part === "bridge" ? "/optimus-pweb.base.js" : "/optimus-auction-pweb.base.js";
  let code = "";
  if (endpoint && key) {
    try {
      const field = part === "bridge" ? "published_bridge" : "published_auction";
      const response = await fetch(endpoint + "/rest/v1/optimus_auction_global_code?id=eq.main&select=" + field, {
        headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: "Bearer " + key } : {}) },
        cache: "no-store", signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const data = await response.json() as Record<string, string | null>[];
        code = String(data[0]?.[field] || "");
      }
    } catch {}
  }
  // No published custom source: load the known-good, versioned baseline.
  if (!code) code = "(function(){var s=document.createElement('script');s.src=" + JSON.stringify(fallback) + ";s.async=false;document.head.appendChild(s);})();";
  return new NextResponse(code, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}
