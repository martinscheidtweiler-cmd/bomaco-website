"use client";

import { useEffect, useState } from "react";
import styles from "./pedigree.module.css";
import type { HorseDetails } from "./pedigree-data";

type Props = { horses: HorseDetails[]; videos?: string[] };

function formatLevel(value: string): string {
  const level = value.trim().replace(/^level\s*/i, "").trim();
  return level ? "Level " + level : "";
}

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

function HorseText({ horse, videoId, openVideo }: {
  horse: HorseDetails;
  videoId?: string;
  openVideo: (videoId: string) => void;
}) {
  const name = horse.name.trim() || "—";
  return (
    <>
      <span className={styles.name}>
        {videoId ? (
          <button type="button" className={styles.videoName}
            aria-label={"Bekijk video van " + name}
            onClick={() => openVideo(videoId)}>
            <span>{name}</span>
            <span className={styles.youtubeBadge} aria-hidden="true">▶</span>
          </button>
        ) : name}
      </span>
      {(horse.level.trim() || horse.year.trim()) && (
        <span className={styles.info}>
          {horse.level.trim() && <strong className={styles.level}>{formatLevel(horse.level)}</strong>}
          {horse.level.trim() && horse.year.trim() && <span className={styles.separator}> · </span>}
          {horse.year.trim() && <span className={styles.year}>{horse.year.trim()}</span>}
        </span>
      )}
    </>
  );
}

export default function PedigreeChart({ horses, videos = [] }: Props) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  useEffect(() => {
    if (!activeVideo) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveVideo(null);
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [activeVideo]);
  function openVideo(videoId: string) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
    if (window.parent !== window) {
      // The parent PWeb source can open a true full-screen popup. Older PWeb
      // codes without the listener fall back to a local iframe popup.
      let accepted = false;
      const onAck = (event: MessageEvent) => {
        if (event.source === window.parent &&
            event.data?.type === "optimus:pedigree-video-opened" &&
            event.data?.videoId === videoId) accepted = true;
      };
      window.addEventListener("message", onAck);
      window.parent.postMessage({ type: "optimus:pedigree-horse-video", videoId }, "*");
      window.setTimeout(() => {
        window.removeEventListener("message", onAck);
        if (!accepted) setActiveVideo(videoId);
      }, 250);
    } else {
      setActiveVideo(videoId);
    }
  }
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
              <div className={styles.card}><HorseText horse={horse} videoId={videos[index]} openVideo={openVideo} /></div>
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
                <div className={styles.mobileCard}><HorseText horse={horse} videoId={videos[index]} openVideo={openVideo} /></div>
              </div>
            );
          })}
        </div>
      </div>
      {activeVideo && (
        <div className={styles.videoOverlay} role="dialog" aria-modal="true"
          aria-label="Paardenvideo" onClick={() => setActiveVideo(null)}>
          <button type="button" className={styles.videoClose} aria-label="Sluit video"
            onClick={() => setActiveVideo(null)}>×</button>
          <div className={styles.videoWindow} onClick={(event) => event.stopPropagation()}>
            <iframe title="Horse video"
              src={"https://www.youtube-nocookie.com/embed/" + activeVideo + "?autoplay=1&rel=0"}
              allow="autoplay;encrypted-media;picture-in-picture;fullscreen" allowFullScreen />
          </div>
        </div>
      )}
    </section>
  );
}
