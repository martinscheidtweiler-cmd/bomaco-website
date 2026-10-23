"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PedigreeChart from "../../../pedigree/PedigreeChart";
import type { HorseDetails } from "../../../pedigree/pedigree-data";
import { normalizeHorseName } from "../../../pedigrees/ancestry";
import type { HorseProfile, LineItem, LineSection, LotDescription, Site } from "../../../dashboard/content";
import styles from "./live-lot.module.css";

type Props = {
  horses: HorseDetails[];
  description: LotDescription;
  profiles: HorseProfile[];
  site: Site;
};

function youtubeId(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const id = host === "youtu.be"
      ? parsed.pathname.slice(1).split("/")[0]
      : ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
        ? parsed.searchParams.get("v") || parsed.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/)?.[1] || ""
        : "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  } catch {
    return "";
  }
}

function displayLevel(raw: string): string {
  const metric = raw.match(/(?:^|\s)1[.,](\d{2})\s*m?$/i);
  if (metric) return "1" + metric[1];
  const cm = raw.match(/(?:^|\s)(1[2-7]\d)\s*(?:cm)?$/i);
  return cm ? cm[1] : "";
}

export default function LiveLot({ horses, description, profiles, site }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [localVideo, setLocalVideo] = useState<string | null>(null);
  const profileMap = useMemo(() => new Map(
    profiles.map((profile) => [profile.normalized_name, profile])
  ), [profiles]);

  const openVideo = useCallback((id: string) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    if (window.parent === window) {
      setLocalVideo(id);
      return;
    }
    let handled = false;
    const acknowledge = (event: MessageEvent) => {
      if (event.source === window.parent &&
        event.data?.type === "optimus:pedigree-video-opened" &&
        event.data?.videoId === id) {
        handled = true;
      }
    };
    window.addEventListener("message", acknowledge);
    window.parent.postMessage({ type: "optimus:pedigree-horse-video", videoId: id }, "*");
    window.setTimeout(() => {
      window.removeEventListener("message", acknowledge);
      if (!handled) setLocalVideo(id);
    }, 300);
  }, []);

  useEffect(() => {
    const target = root.current;
    if (!target || window.parent === window) return;
    let lastHeight = 0;
    const sendHeight = () => {
      const height = Math.max(100, Math.ceil(target.getBoundingClientRect().height) + 2);
      if (height !== lastHeight) {
        lastHeight = height;
        window.parent.postMessage({ type: "optimus:lot-height", height }, "*");
      }
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sendHeight) : null;
    observer?.observe(target);
    window.addEventListener("resize", sendHeight);
    const handleMeasurement = (event: MessageEvent) => {
      if (event.source === window.parent && event.data?.type === "optimus:lot-measure") {
        lastHeight = 0;
        sendHeight();
      }
    };
    window.addEventListener("message", handleMeasurement);
    sendHeight();
    // Give the host a chance to size before and after fonts load.
    const raf = window.requestAnimationFrame(sendHeight);
    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("resize", sendHeight);
      window.removeEventListener("message", handleMeasurement);
    };
  }, []);

  useEffect(() => {
    if (!localVideo) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLocalVideo(null);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [localVideo]);

  const horseLabel = (name: string) => {
    const profile = profileMap.get(normalizeHorseName(name));
    const level = displayLevel(profile?.level || "");
    const year = profile?.birth_year || "";
    const detail = level && !new RegExp("(?:\\s|\\()" + level + "\\)?$", "i").test(name.trim())
      ? " " + level
      : !level && /^20(1[8-9]|2[0-9])$/.test(year) ? " °" + year : "";
    const video = youtubeId(profile?.video_url || "");
    const label = name + detail;
    const levelMatch = label.match(/^(.*?)(\s+)(1[2-7]\d)$/);
    const styledLabel = levelMatch ? <>{levelMatch[1]}{levelMatch[2]}<span className={styles.level}>{levelMatch[3]}</span></> : label;
    return video ? (
      <button type="button" className={styles.videoName} onClick={() => openVideo(video)}
        aria-label={"Bekijk video van " + name}>
        <span>{styledLabel}</span><span className={styles.youtube} aria-hidden="true">▶</span>
      </button>
    ) : <span>{styledLabel}</span>;
  };

  const offspring = (item: LineItem, index: number, nested = false) => {
    if (!item.horse.trim()) return null;
    return <li key={index} className={nested ? styles.nestedHorse : ""}>
      <strong>{item.horse === "…" || item.horse === "..." ? "…" : horseLabel(item.horse)}</strong>
      {item.note.trim() && <span className={styles.note}> {item.note}</span>}
      {!nested && item.children && item.children.some((child) => child.horse.trim()) && (
        <ul className={styles.subList}>
          {item.children.map((child, childIndex) => offspring(child, childIndex, true))}
        </ul>
      )}
    </li>;
  };

  const section = (data: LineSection, index: number) => {
    return <section key={index} className={styles.section}>
      <h2 className={styles.heading}>
        {data.title || "DAM"}: {data.horse.trim() && <strong>{horseLabel(data.horse)}</strong>}
        {data.note?.trim() && <span className={styles.note}> {data.note}</span>}
      </h2>
      {(data.notes || []).filter(Boolean).map((note, i) => (
        <p key={i} className={styles.extraNote}>→ {note}</p>
      ))}
      {data.items.some((item) => item.horse.trim()) && (
        <ul className={styles.list}>{data.items.map((item, i) => offspring(item, i))}</ul>
      )}
    </section>;
  };

  const pedigreeVideos = horses.map((horse) =>
    youtubeId(profileMap.get(normalizeHorseName(horse.name))?.video_url || ""));

  return (
    <main ref={root} className={styles.root} data-optimus-site={site}>
      <div className={styles.description}>
        {description.sections.filter((section) => section.visible !== false).map(section)}
      </div>
      <div className={styles.pedigree}>
        <PedigreeChart horses={horses} videos={pedigreeVideos} />
      </div>
      {localVideo && (
        <div className={styles.videoOverlay} role="dialog" aria-modal="true"
          aria-label="Paardenvideo" onClick={() => setLocalVideo(null)}>
          <button type="button" className={styles.videoClose} aria-label="Sluit video"
            onClick={() => setLocalVideo(null)}>×</button>
          <div className={styles.videoWindow} onClick={(event) => event.stopPropagation()}>
            <iframe title="Horse video"
              src={"https://www.youtube-nocookie.com/embed/" + localVideo + "?autoplay=1&rel=0"}
              allow="autoplay;encrypted-media;picture-in-picture;fullscreen" allowFullScreen />
          </div>
        </div>
      )}
    </main>
  );
}
