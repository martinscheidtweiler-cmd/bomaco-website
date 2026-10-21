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
  try {
    const response = await fetch(`${endpoint}/rest/v1/rpc/get_published_pedigree`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: token }),
      cache: "no-store",
    });
    if (!response.ok) notFound();
    result = await response.json();
  } catch {
    notFound();
  }

  const horses = cleanHorses(result);
  if (!horses) notFound();
  return <main className={styles.surface}><PedigreeChart horses={horses} /></main>;
}
