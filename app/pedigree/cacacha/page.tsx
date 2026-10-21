import type { Metadata } from "next";
import PedigreeChart from "../PedigreeChart";
import styles from "../pedigree.module.css";
import { CACACHA } from "../pedigree-data";

export const metadata: Metadata = {
  title: "Cacacha van het Schaeck | Optimus Auction",
  description: "Pedigree of Cacacha van het Schaeck.",
};

export default function CacachaPedigreePage() {
  return <main className={styles.surface}><PedigreeChart horses={CACACHA} /></main>;
}
