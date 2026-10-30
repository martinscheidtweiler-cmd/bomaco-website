"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import styles from "./references.module.css";

type Reference = {
  id: string; name: string; auction_label: string; result_text: string;
  video_url: string; poster_url: string; position: number;
};
const pad = (n: number) => String(n).padStart(2, "0");

export default function ReferencesEmbed() {
  const [items, setItems] = useState<Reference[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [videoError, setVideoError] = useState(false);
  const [sound, setSound] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(false);
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const pointerRef = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    async function load() {
      const {data, error: problem} = await supabase
        .from("optimus_auction_references")
        .select("id,name,auction_label,result_text,video_url,poster_url,position")
        .eq("is_published", true)
        .order("position", {ascending:true})
        .order("created_at", {ascending:true})
        .limit(100);
      if (!live) return;
      setItems((data || []) as Reference[]);
      setError(problem ? "Referenties kunnen momenteel niet geladen worden." : "");
      setLoading(false);
    }
    void load();
    return () => { live = false; };
  }, []);

  const next = useCallback(() => {
    setIndex(i => (i + 1) % items.length);
  }, [items.length]);
  const previous = useCallback(() => {
    setIndex(i => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !("ResizeObserver" in window)) return;
    const sendHeight = () => {
      // Height message is handled only by the approved .auction Pweb embed.
      window.parent.postMessage({type:"optimus-references-height",height:Math.ceil(node.getBoundingClientRect().height)}, "*");
    };
    const observer = new ResizeObserver(sendHeight);
    observer.observe(node);
    sendHeight();
    return () => observer.disconnect();
  }, [loading,items.length,error]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !items.length) return;
    node.muted = !sound;
    if (visible && !document.hidden) void node.play().catch(() => setNeedsPlay(true));
  }, [index,items.length,sound,visible]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting),{threshold:0.05});
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    const handleVisibility = () => {
      const node = videoRef.current;
      if (!node) return;
      if (document.hidden || !visible) node.pause();
      else void node.play().catch(() => {});
    };
    document.addEventListener("visibilitychange",handleVisibility);
    handleVisibility();
    return () => document.removeEventListener("visibilitychange",handleVisibility);
  },[index,visible]);

  useEffect(() => {
    if (!videoError || items.length < 2 || !visible) return;
    const timeout = window.setTimeout(next,6500);
    return () => window.clearTimeout(timeout);
  },[videoError,items.length,visible,next]);

  useEffect(() => { setVideoError(false); setSound(false); setNeedsPlay(false); },[index]);

  const item = items[index];
  return <main ref={containerRef} className={styles.page}>
    <header className={styles.heading}>
      <div className={styles.eyebrow}>STAL OPTIMUS · ONLINE AUCTION</div>
      <h1>OUR REFERENCES</h1>
      <p>FROM OUR BREEDING PROGRAMME TO THE SPORT</p>
    </header>
    {loading ? <div className={styles.message}>LOADING REFERENCES...</div>
    : error ? <div className={styles.message} role="alert">{error}</div>
    : !item ? <div className={styles.message}>OUR REFERENCES ARE COMING SOON</div>
    : <>
      <div className={styles.stage}>
        <div className={styles.videoBox}
          onTouchStart={e => { pointerRef.current=e.touches[0]?.clientX ?? null; }}
          onTouchEnd={e => {
            if (pointerRef.current === null) return;
            const touchX = e.changedTouches[0]?.clientX;
            if (touchX === undefined) return;
            const delta = touchX - pointerRef.current;
            pointerRef.current=null;
            if (delta < -55) next();
            else if (delta > 55) previous();
          }}>
          {videoError ? <div className={styles.videoUnavailable}>VIDEO CURRENTLY UNAVAILABLE</div>
          : <video key={item.id} ref={videoRef} className={styles.video} src={item.video_url}
              poster={item.poster_url || undefined} autoPlay muted={!sound} playsInline
              preload="metadata" onEnded={next} onError={() => setVideoError(true)} onPlaying={() => setNeedsPlay(false)}
              controls={false} />}
          {items.length>1 && <>
            <button type="button" className={styles.prev} onClick={previous} aria-label="Previous horse">‹</button>
            <button type="button" className={styles.next} onClick={next} aria-label="Next horse">›</button>
          </>}
          {!videoError && <button className={styles.sound} type="button"
            onClick={() => {setSound(v=>!v);void videoRef.current?.play().catch(()=>{});}}>
            {sound?"SOUND ON":"SOUND OFF"}
          </button>}
          {!videoError && <button type="button" className={needsPlay ? styles.playRequired : styles.play} aria-label="Play video"
            onClick={() => {videoRef.current?.play().catch(()=>{if(videoRef.current) videoRef.current.controls=true;});}}>▶</button>}
        </div>
        <div className={styles.info}>
          <h2>{item.name}</h2>
          <p className={styles.auction}>{item.auction_label}</p>
          {item.result_text && <p className={styles.result}>{item.result_text}</p>}
        </div>
      </div>
      <div className={styles.bottom}>
        <span className={styles.counter}>{pad(index+1)} <span>/</span> {pad(items.length)}</span>
        <div className={styles.dots}>
          {items.map((r,i)=><button key={r.id} type="button"
            aria-label={"View "+r.name} aria-current={i===index?"true":undefined}
            className={i===index?styles.activeDot:styles.dot} onClick={()=>setIndex(i)}/>)}
        </div>
        <span className={styles.bottomBrand}>OPTIMUS AUCTION</span>
      </div>
    </>}
  </main>;
}
