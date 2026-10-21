import styles from "./pedigree.module.css";
import type { HorseDetails } from "./pedigree-data";

type Props = { horses: HorseDetails[] };

const branches = [
  [1, 3, 7, 8, 4, 9, 10],
  [2, 5, 11, 12, 6, 13, 14],
];

const layout = [
  { col: 1, row: 1, span: 8 },
  { col: 2, row: 1, span: 4 },
  { col: 2, row: 5, span: 4 },
  { col: 3, row: 1, span: 2 },
  { col: 3, row: 3, span: 2 },
  { col: 3, row: 5, span: 2 },
  { col: 3, row: 7, span: 2 },
  ...Array.from({ length: 8 }, (_, i) => ({ col: 4, row: i + 1, span: 1 })),
];

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
    <section className={styles.wrapper} aria-label="Four-generation horse pedigree">
      <div className={styles.desktop}>
        {horses.map((horse, index) => {
          const position = layout[index];
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
        <div className={styles.mobileRoot}><HorseText horse={horses[0]} /></div>
        <div className={styles.mobileBranches}>
          {branches.map((branch, side) => (
            <div className={styles.mobileBranch} key={side}>
              {branch.map((index, i) => (
                <div
                  key={index}
                  className={[
                    styles.mobileNode,
                    i === 0 ? styles.mobileParent : "",
                    i === 1 || i === 4 ? styles.mobileGrandparent : "",
                    i === 2 || i === 3 || i === 5 || i === 6 ? styles.mobileAncestor : "",
                  ].join(" ")}
                >
                  <HorseText horse={horses[index]} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
