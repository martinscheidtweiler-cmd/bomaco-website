import { notFound } from "next/navigation";
import { cleanHorses } from "../../pedigree/pedigree-data";
import { embryoDescription, dianaDescription, signoritaDescription, clarissaDescription, ladyDescription, anitaDescription, cristelDescription, defaultDescription, safeDescription, type HorseProfile } from "../../dashboard/content";
import LiveLot from "./[token]/LiveLot";

// Both public site variants share the rendering and validation below.
export default async function RenderLiveLot({ token, site }: { token: string; site: "auction" | "be" }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    notFound();
  }
  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!endpoint || !anonKey) throw new Error("Public embed configuration missing");

  const response = await fetch(endpoint + "/rest/v1/rpc/get_published_lot_content", {
    method: "POST",
    headers: {
      apikey: anonKey,
      ...(anonKey.startsWith("eyJ") ? { Authorization: "Bearer " + anonKey } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_token: token }),
    cache: "force-cache",
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(8000),
  });
  // Throw on upstream failure so ISR retains the last successful page.
  // A successful null response means publication was explicitly withdrawn.
  if (!response.ok) throw new Error(`Public lot RPC failed: ${response.status}`);
  const payload: unknown = await response.json();
  if (payload === null) notFound();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid public lot response");
  }
  const data = payload as Record<string, unknown>;
  const horses = cleanHorses(data.horses);
  if (!horses) throw new Error("Invalid public lot horses");

  // This data is limited by the public RPC to one explicitly published lot.
  // Validate all rendered text and links before passing to the client.
  const profiles: HorseProfile[] = Array.isArray(data.profiles)
    ? data.profiles.slice(0, 200).filter((entry): entry is Record<string, unknown> =>
        Boolean(entry && typeof entry === "object" && !Array.isArray(entry)))
      .map((entry) => ({
        normalized_name: String(entry.normalized_name || "").slice(0, 120),
        display_name: String(entry.display_name || "").slice(0, 120),
        level: String(entry.level || "").slice(0, 30),
        birth_year: String(entry.birth_year || "").slice(0, 8),
        video_url: String(entry.video_url || "").slice(0, 400),
        updated_at: "",
      }))
    : [];

  return (
    <LiveLot
      horses={horses}
      description={data.description && typeof data.description === "object" && "sections" in data.description && Array.isArray(data.description.sections) && data.description.sections.length
        ? safeDescription(data.description, horses)
        : (embryoDescription(horses, String(horses[0]?.name || data.name || '')) || dianaDescription(horses, String(horses[0]?.name || data.name || '')) || signoritaDescription(horses, String(horses[0]?.name || data.name || '')) || clarissaDescription(horses) || ladyDescription(horses, String(horses[0]?.name || '')) || anitaDescription(horses) || cristelDescription(horses, String(horses[0]?.name || data.name || data.lot_name || "")) || defaultDescription(horses))}
      profiles={profiles}
      site={site === "auction" ? "auction" : "be"}
    />
  );
}
