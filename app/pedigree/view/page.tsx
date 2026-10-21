import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PedigreeChart from "../PedigreeChart";
import styles from "../pedigree.module.css";
import { decodePedigree } from "../pedigree-data";

export const metadata: Metadata = {
  title: "Pedigree | Optimus Auction",
  description: "Four-generation equine pedigree with sport levels.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ d?: string | string[] }> };

export default async function PedigreeView({ searchParams }: Props) {
  const { d } = await searchParams;
  const horses = decodePedigree(typeof d === "string" ? d : undefined);
  if (!horses) notFound();
  return <main className={styles.surface}><PedigreeChart horses={horses} /></main>;
}
