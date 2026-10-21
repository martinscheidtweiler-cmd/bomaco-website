import type { Metadata } from "next";
import styles from "./pedigree.module.css";

export const metadata: Metadata = {
  title: "Cacacha van het Schaeck | Pedigree | Optimus Auction",
  description: "Four-generation pedigree of Cacacha van het Schaeck.",
};

type Horse = {
  name: string;
  details: string;
  generation: 1 | 2 | 3 | 4;
  row: number;
  span: number;
};

/*
 * The original horse occupies all eight grid rows. Each following generation
 * occupies half as many rows, keeping parents centred between their offspring.
 */
const horses: Horse[] = [
  { name: "Cacacha van het Schaeck", details: "Chestnut mare · 2008 · sBs · xx 43.56%", generation: 1, row: 1, span: 8 },
  { name: "Bamako de Muze", details: "2001 · BWP · xx 42.58%", generation: 2, row: 1, span: 4 },
  { name: "Fortis Fortuna", details: "2005 · BWP · xx 44.54%", generation: 2, row: 5, span: 4 },
  { name: "Darco", details: "1980 · BWP · xx 25%", generation: 3, row: 1, span: 2 },
  { name: "Fragance de Chalus", details: "1993 · SF · xx 60.16%", generation: 3, row: 3, span: 2 },
  { name: "Quidam de Revel", details: "1982 · SF · xx 57.04%", generation: 3, row: 5, span: 2 },
  { name: "Coco 't Laerhof Z", details: "2000 · Z · xx 32.04%", generation: 3, row: 7, span: 2 },
  { name: "Lugano van la Roche", details: "1963 · Hann", generation: 4, row: 1, span: 1 },
  { name: "Ocoucha", details: "1968 · BWP", generation: 4, row: 2, span: 1 },
  { name: "Jalisco B", details: "1975 · SF", generation: 4, row: 3, span: 1 },
  { name: "Nifrane", details: "1979 · SF", generation: 4, row: 4, span: 1 },
  { name: "Jalisco B", details: "1975 · SF", generation: 4, row: 5, span: 1 },
  { name: "Dirka", details: "1969 · SF", generation: 4, row: 6, span: 1 },
  { name: "Carthago Z", details: "1987 · Holst", generation: 4, row: 7, span: 1 },
  { name: "Lhasa", details: "1988 · BWP", generation: 4, row: 8, span: 1 },
];

export default function CacachaPedigreePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Optimus Auction / Pedigree</p>
        <h1 className={styles.heading}>Cacacha van het Schaeck</h1>
        <p className={styles.subtitle}>Four generations · Sire and dam lines</p>
      </header>

      <p className={styles.mobileHint}>Swipe horizontally to explore the full pedigree →</p>
      <section className={styles.viewport} aria-label="Four-generation pedigree">
        <div className={styles.tree}>
          {horses.map((horse, index) => (
            <div
              key={index}
              className={[
                styles.node,
                horse.generation === 1 ? styles.root : styles.child,
                horse.generation === 2 ? styles.parent : "",
              ].join(" ")}
              style={{
                gridColumn: horse.generation,
                gridRow: horse.row + " / span " + horse.span,
              }}
            >
              <div className={styles.card}>
                <span className={styles.name}>{horse.name}</span>
                <span className={styles.details}>{horse.details}</span>
              </div>
              {horse.span > 1 ? <span className={styles.fork} aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
