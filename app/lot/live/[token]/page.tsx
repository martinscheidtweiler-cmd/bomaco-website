import type { Metadata } from "next";
import RenderLiveLot from "../RenderLiveLot";

// Cache the complete public page; no per-visitor database or rendering work.
export const revalidate = 60;
export async function generateStaticParams() { return []; }
export const metadata: Metadata = {
  title: "Live lot | Optimus Auction",
  robots: { index: false, follow: false },
};

export default async function LiveLotPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RenderLiveLot token={token} site="be" />;
}
