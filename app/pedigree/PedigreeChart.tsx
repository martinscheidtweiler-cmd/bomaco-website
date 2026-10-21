import styles from "./pedigree.module.css";
import type { HorseDetails } from "./pedigree-data";

type Props = { horses: HorseDetails[] };

/* Four generations on desktop; mobile starts with parents and includes great-grandparents. */
const desktopLayout = [
  { col: 1, row: 1, span: 8 },
  { col: 2, row: 1, span: 4 },
  { col: 2, row: 5, span: 4 },
  { col: 3, row: 1, span: 2 },
  { col: 3, row: 3, span: 2 },
  { col: 3, row: 5, span: 2 },
  { col: 3, row: 7, span: 2 },
  ...Array.from({ length: 8 }, (_, i) => ({ col: 4, row: i + 1, span: 1 })),
];

const mobileLayout = [
  null, // The featured horse is intentionally omitted on mobile.
  { col: 1, row: 1, span: 4 }, // Sire
  { col: 1, row: 5, span: 4 }, // Dam
  { col: 2, row: 1, span: 2 },
  { col: 2, row: 3, span: 2 },
  { col: 2, row: 5, span: 2 },
  { col: 2, row: 7, span: 2 },
  ...Array.from({ length: 8 }, (_, i) => ({ col: 3, row: i + 1, span: 1 })),
]

function HorseText({ horse }: { horse: HorseDetails }) {
  return (
    <>
      <span className={styles.name}>{horse.name.trim() || "—"}</span>
      {(horse.level.trim() || horse.year.trim()) && (
        <span className={styles.info}>
          {horse.level.trim() && <strong className={styles.level}>{horse.level.trim()}</strong>}
          {horse.level.trim() && horse.year.trim() && <span className={styles.separator}> · </span>}
          {horse.year.trim() && <span className={styles.year}>{horse.year.trim()}</span>}
        </span>
      )}
    </>
  );
}

export default function PedigreeChart({ horses }: Props) {
  return (
    <section className={styles.wrapper} aria-label="Horse pedigree">
      <div className={styles.desktop}>
        {horses.map((horse, index) => {
          const position = desktopLayout[index];
          return (
            <div
              className={[
                styles.desktopNode,
                index === 0 ? styles.root : "",
                position.col > 1 ? styles.child : "",
              ].join(" ")}
              key={index}
              style={{ gridColumn: position.col, gridRow: `${position.row} / span ${position.span}` }}
            >
              <div className={styles.card}><HorseText horse={horse} /></div>
              {position.span > 1 && <span className={styles.fork} aria-hidden="true" />}
            </div>
          );
        })}
      </div>

      <div className={styles.mobile}>
        <div className={styles.mobileTree} aria-label="Parents, grandparents and great-grandparents on mobile">
          {horses.slice(1).map((horse, offset) => {
            const index = offset + 1;
            const position = mobileLayout[index]!;
            return (
              <div
                key={index}
                className={[
                  styles.mobileNode,
                  index <= 2 ? styles.mobileParent : "",
                  index >= 3 && index <= 6 ? styles.mobileGrandparent : "",
                  index >= 7 ? styles.mobileAncestor : "",
                ].join(" ")}
                style={{ gridColumn: position.col, gridRow: `${position.row} / span ${position.span}` }}
              >
                <div className={styles.mobileCard}><HorseText horse={horse} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
