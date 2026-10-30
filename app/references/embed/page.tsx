"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import styles from "./references.module.css";

type Reference = {
  id: string;
  name: string;
  auction_label: string;
  result_text: string;
  video_url: string;
  poster_url: string;
  position: number;
  sire: string;
  dam: string;
  birth_year: string;
  sex: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function ReferencesEmbed() {
  const [items, setItems] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLimit,setShowLimit] = useState("all");
  const [sort,setSort] = useState("position");
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [sound, setSound] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(false);
  const [visible, setVisible] = useState(true);

  const containerRef = useRef<HTMLElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointerStart = useRef<number | null>(null);
  const previewRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      const {data, error: problem} = await supabase
        .from("optimus_auction_references")
        .select("id,name,auction_label,result_text,video_url,poster_url,position,sire,dam,birth_year,sex")
        .eq("is_published", true)
        .order("position", {ascending: true})
        .order("created_at", {ascending: true})
        .limit(100);
      if (!live) return;
      setItems((data || []) as Reference[]);
      setError(problem ? "REFERENCES COULD NOT BE LOADED" : "");
      setLoading(false);
    };
    void load();
    return () => {live = false;};
  }, []);

  // Keep the PWeb iframe's height in sync with the cards and the popup.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !("ResizeObserver" in window)) return;
    const reportSize = () => {
      const height = Math.ceil(container.getBoundingClientRect().height);
      window.parent.postMessage({type: "optimus-references-height", height}, "*");
    };
    const observer = new ResizeObserver(reportSize);
    observer.observe(container);
    reportSize();
    return () => observer.disconnect();
  }, [loading, items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
    }, {threshold: 0.05});
    observer.observe(container);
    return () => observer.disconnect();
  }, [loading]);

  const stopPreviews = useCallback(() => {
    for (const video of previewRefs.current.values()) {
      video.pause();
      if (video.readyState >= 1) {
        try {video.currentTime = 0.1;} catch {}
      }
    }
  }, []);

  const previewStart = useCallback((id: string) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (activeIndex !== null || document.hidden) return;
    stopPreviews();
    const video = previewRefs.current.get(id);
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {});
  }, [activeIndex, stopPreviews]);

  const previewStop = useCallback((id: string) => {
    const video = previewRefs.current.get(id);
    if (!video) return;
    video.pause();
    if (video.readyState >= 1) {
      try {video.currentTime = 0.1;} catch {}
    }
  }, []);

  const open = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return;
    stopPreviews();
    lastFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActiveIndex(index);
    setSound(false);
    setVideoError(false);
    setNeedsPlay(false);
    // The embed's PWeb host handles scrolling to the top of the iframe.
    window.parent.postMessage({type: "optimus-references-scroll"}, "*");
    if (window.parent === window) window.scrollTo({top: 0, behavior: "smooth"});
  }, [items.length, stopPreviews]);

  const close = useCallback(() => {
    playerRef.current?.pause();
    setActiveIndex(null);
    setNeedsPlay(false);
    window.requestAnimationFrame(() => lastFocused.current?.focus());
  }, []);

  const change = useCallback((direction: number) => {
    if (!items.length) return;
    setActiveIndex(current => current === null ? null : (current + direction + items.length) % items.length);
    setSound(false);
    setVideoError(false);
    setNeedsPlay(false);
  }, [items.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {event.preventDefault(); close();}
      if (event.key === "ArrowRight") {event.preventDefault(); change(1);}
      if (event.key === "ArrowLeft") {event.preventDefault(); change(-1);}
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), video[controls]"
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeIndex, change, close]);

  useEffect(() => {
    if (activeIndex === null) return;
    const video = playerRef.current;
    if (!video || document.hidden || !visible) return;
    video.muted = !sound;
    void video.play().catch(() => setNeedsPlay(true));
  }, [activeIndex, sound, visible]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopPreviews();
        playerRef.current?.pause();
      } else if (activeIndex !== null && visible) {
        void playerRef.current?.play().catch(() => setNeedsPlay(true));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [activeIndex, visible, stopPreviews]);

  useEffect(() => {
    if (!videoError || items.length < 2 || activeIndex === null || !visible) return;
    const timer = window.setTimeout(() => change(1), 5500);
    return () => window.clearTimeout(timer);
  }, [videoError, items.length, activeIndex, visible, change]);

  const displayed = useMemo(() => {
    const list = [...items];
    if (sort === "name") list.sort((a,b) => a.name.localeCompare(b.name));
    if (sort === "auction") list.sort((a,b) => {
      const year = (v: string) => Number(v.match(/\b(?:19|20)\d{2}\b/)?.[0] || 0);
      return year(b.auction_label)-year(a.auction_label);
    });
    return showLimit === "all" ? list : list.slice(0,Number(showLimit));
  },[items,sort,showLimit]);
  const activeItem = activeIndex === null ? null : items[activeIndex];

  return <main ref={containerRef} className={activeItem ? styles.pageOpen : styles.page}>
    <header className={styles.heading}>
      <div className={styles.eyebrow}>STAL OPTIMUS · ONLINE AUCTION</div>
      <h1>OUR REFERENCES</h1>
      <p>FROM OUR BREEDING PROGRAMME TO THE SPORT</p>
    </header>

    {loading ? <div className={styles.message}>LOADING REFERENCES...</div>
    : error ? <div className={styles.message} role="alert">{error}</div>
    : !items.length ? <div className={styles.message}>OUR REFERENCES ARE COMING SOON</div>
    : <section className={styles.grid} aria-label="Optimus reference horses">
      {items.map((item, index) => <button
        type="button"
        key={item.id}
        className={styles.card}
        onPointerEnter={event => {if (event.pointerType === "mouse") previewStart(item.id);}}
        onPointerLeave={() => previewStop(item.id)}
        onClick={() => open(index)}
        aria-label={"Watch "+item.name+" video"}
      >
        <span className={styles.cardMedia}>
          <video
            ref={node => {
              if (node) previewRefs.current.set(item.id, node);
              else previewRefs.current.delete(item.id);
            }}
            className={styles.previewVideo}
            src={item.video_url}
            poster={item.poster_url || undefined}
            playsInline muted loop
            preload={item.poster_url ? "none" : "metadata"}
            onLoadedMetadata={event => {
              if (!item.poster_url && event.currentTarget.duration > 0.15) {
                try {event.currentTarget.currentTime = 0.1;} catch {}
              }
            }}
            aria-hidden="true"
          />
          <span className={styles.cardPlay} aria-hidden="true">▶</span>
          <span className={styles.cardView} aria-hidden="true">WATCH VIDEO</span>
        </span>
        <span className={styles.cardText}>
          <strong>{item.name}</strong>
          {item.auction_label && <span className={styles.cardEdition}>{item.auction_label}</span>}
          {item.result_text && <span className={styles.cardResult}>{item.result_text}</span>}
        </span>
      </button>)}
    </section>}

    {activeItem && <div className={styles.overlay}>
      <button type="button" aria-label="Close video player" className={styles.backdrop} onClick={close}/>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-label={"Video: "+activeItem.name}>
        <div className={styles.dialogTop}>
          <span>OPTIMUS AUCTION <span className={styles.dialogTopMuted}>/ REFERENCES</span></span>
          <button ref={closeRef} className={styles.close} type="button" onClick={close} aria-label="Close video">✕</button>
        </div>
        <div className={styles.playerWrap}
          onTouchStart={e => {pointerStart.current = e.touches[0]?.clientX ?? null;}}
          onTouchEnd={e => {
            if (pointerStart.current === null) return;
            const last = e.changedTouches[0]?.clientX;
            if (last === undefined) return;
            const delta = last - pointerStart.current;
            pointerStart.current = null;
            if (delta < -75) change(1);
            else if (delta > 75) change(-1);
          }}>
          {videoError ? <div className={styles.videoUnavailable}>VIDEO CURRENTLY UNAVAILABLE</div>
          : <video key={activeItem.id}
              ref={playerRef}
              className={styles.playerVideo}
              src={activeItem.video_url}
              poster={activeItem.poster_url || undefined}
              autoPlay
              playsInline
              muted={!sound}
              controls
              preload="auto"
              loop={items.length === 1}
              onPlaying={() => setNeedsPlay(false)}
              onError={() => setVideoError(true)}
              onEnded={() => {if (items.length > 1) change(1);}}
            />}
          {items.length > 1 && <>
            <button className={styles.previous} type="button" onClick={() => change(-1)} aria-label="Previous reference">‹</button>
            <button className={styles.next} type="button" onClick={() => change(1)} aria-label="Next reference">›</button>
          </>}
          {needsPlay && !videoError && <button type="button" className={styles.playRequired}
            onClick={() => void playerRef.current?.play().catch(() => setNeedsPlay(true))}>▶ PLAY VIDEO</button>}
        </div>
        <div className={styles.playerInfo}>
          <div className={styles.playerMeta}>
            <span>{pad((activeIndex ?? 0) + 1)} / {pad(items.length)}</span>
            {!videoError && <button className={styles.sound} type="button" onClick={() => setSound(v => !v)}>
              {sound ? "SOUND ON" : "SOUND OFF"}
            </button>}
          </div>
          <h2>{activeItem.name}</h2>
          {activeItem.auction_label && <p className={styles.playerAuction}>{activeItem.auction_label}</p>}
          {activeItem.result_text && <p className={styles.playerResult}>{activeItem.result_text}</p>}
          {items.length > 1 && items.length <= 15 && <div className={styles.dots} aria-label="References">
            {items.map((item, i) => <button key={item.id} type="button"
              aria-label={"Show "+item.name}
              aria-current={i === activeIndex ? "true" : undefined}
              className={i === activeIndex ? styles.activeDot : styles.dot}
              onClick={() => {
                setActiveIndex(i);
                setSound(false);
                setVideoError(false);
                setNeedsPlay(false);
              }}/>)}
          </div>}
        </div>
      </div>
    </div>}
  </main>;
}
