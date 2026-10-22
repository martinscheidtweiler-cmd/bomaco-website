import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PedigreeChart from "../../PedigreeChart";
import styles from "../../pedigree.module.css";
import { cleanHorses } from "../../pedigree-data";

// Embed pages always fetch the latest saved version. Never cache pedigrees.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Live pedigree | Optimus Auction",
  description: "Always-current, four-generation sport horse pedigree.",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function LivePedigree({ params }: Props) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    notFound();
  }

  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!endpoint || !anonKey) notFound();

  // Only an explicitly published pedigree may be read anonymously.
  // The RPC exposes its 15 horse entries, never users or private team rows.
  let result: unknown;
  let videoResult: unknown = [];
  try {
    const request = (name: string) => fetch(`${endpoint}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        ...(anonKey.startsWith("eyJ") ? { Authorization: `Bearer ${anonKey}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: token }),
      cache: "no-store",
    });
    const [response, videosResponse] = await Promise.all([
      request("get_published_pedigree"),
      request("get_published_pedigree_videos"),
    ]);
    if (!response.ok) notFound();
    result = await response.json();
    if (videosResponse.ok) videoResult = await videosResponse.json();
  } catch {
    notFound();
  }

  const horses = cleanHorses(result);
  if (!horses) notFound();
  // Show public horse videos only when they are attached to a published pedigree.
  // Validate links, and pass only YouTube video IDs to the browser.
  const videoId = (raw: unknown): string => {
    if (typeof raw !== "string" || !raw) return "";
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") return "";
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const value = host === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
          ? (url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/)?.[1] || "")
          : "";
      return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : "";
    } catch {
      return "";
    }
  };
  const videos = Array.isArray(videoResult)
    ? horses.map((_, index) => videoId(videoResult[index]))
    : [];
  return <main className={styles.surface}><PedigreeChart horses={horses} videos={videos} /></main>;
}
