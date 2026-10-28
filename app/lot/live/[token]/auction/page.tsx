import type { Metadata } from "next";
import RenderLiveLot from "../../RenderLiveLot";

// A separate cache key keeps .auction and .be content isolated.
// The existing ?site=auction iframe URL is rewritten here internally.
export const revalidate = 60;
export async function generateStaticParams() { return []; }
export const metadata: Metadata = {
  title: "Live lot | Optimus Auction",
  robots: { index: false, follow: false },
};

export default async function AuctionLiveLotPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RenderLiveLot token={token} site="auction" />;
}
