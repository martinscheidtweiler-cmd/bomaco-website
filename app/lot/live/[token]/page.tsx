import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cleanHorses } from "../../../pedigree/pedigree-data";
import { embryoDescription, dianaDescription, signoritaDescription, clarissaDescription, ladyDescription, anitaDescription, cristelDescription, defaultDescription, safeDescription, type HorseProfile } from "../../../dashboard/content";
import LiveLot from "./LiveLot";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Live lot | Optimus Auction",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ site?: string }>;
};

export default async function LiveLotPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { site } = await searchParams;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    notFound();
  }
  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!endpoint || !anonKey) notFound();

  let payload: unknown;
  try {
    const response = await fetch(endpoint + "/rest/v1/rpc/get_published_lot_content", {
      method: "POST",
      headers: {
        apikey: anonKey,
        ...(anonKey.startsWith("eyJ") ? { Authorization: "Bearer " + anonKey } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: token }),
      cache: "no-store",
    });
    if (!response.ok) notFound();
    payload = await response.json();
  } catch {
    notFound();
  }
  if (!payload || typeof payload !== "object") notFound();
  const data = payload as Record<string, unknown>;
  const horses = cleanHorses(data.horses);
  if (!horses) notFound();

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
