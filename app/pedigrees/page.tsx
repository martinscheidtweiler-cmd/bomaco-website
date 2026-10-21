import type { Metadata } from "next";
import PedigreeEditor from "./editor";

export const metadata: Metadata = {
  title: "Pedigree editor | Optimus Auction",
  description: "Build and embed four-generation horse pedigrees.",
  robots: { index: false, follow: false },
};

export default function PedigreeEditorPage() {
  return <PedigreeEditor />;
}
