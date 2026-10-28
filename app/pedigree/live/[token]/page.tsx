import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PedigreeChart from "../../PedigreeChart";
import styles from "../../pedigree.module.css";
import { cleanHorses } from "../../pedigree-data";

// Public information is refreshed in the background; failures retain the last good page.
export const revalidate = 60;
export async function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: "Live pedigree | Optimus Auction",
  description: "Four-generation sport horse pedigree.",
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
  if (!endpoint || !anonKey) throw new Error("Public embed configuration missing");

  // Only an explicitly published pedigree may be read anonymously.
  // The RPC exposes its 15 horse entries, never users or private team rows.
  const request = async (name: string): Promise<unknown> => {
    const response = await fetch(`${endpoint}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        ...(anonKey.startsWith("eyJ") ? { Authorization: `Bearer ${anonKey}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: token }),
      cache: "force-cache",
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Public pedigree RPC failed: ${response.status}`);
    return response.json();
  };
  const [result, videoResult] = await Promise.all([
    request("get_published_pedigree"),
    request("get_published_pedigree_videos"),
  ]);
  if (result === null) notFound();
  const horses = cleanHorses(result);
  if (!horses || !Array.isArray(videoResult)) throw new Error("Invalid public pedigree response");
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
