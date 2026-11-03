"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import styles from "../dashboard.module.css";

const cloud = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) : null;
type CodeRow = { id: string; draft_css: string; draft_js: string; published_css: string; published_js: string; revision: number; published_at: string | null; draft_bridge:string|null;draft_auction:string|null;published_bridge:string|null;published_auction:string|null };
const baseSnippet = '<script src="https://optimusauction.vercel.app/optimus-loader.js" data-lot="UNIEK-VEULEN-ID" data-site="auction" defer></script>';
export default function GlobalPwebCode() {
  const [authorized,setAuthorized] = useState(false);
  const [loading,setLoading] = useState(true);
  const [row,setRow] = useState<CodeRow|null>(null);
  const [css,setCss] = useState("");
  const [js,setJs] = useState("");
  const [mode,setMode] = useState<"css"|"js"|"source">("css");
  const [coreCss,setCoreCss] = useState("");
  const [bridge,setBridge] = useState("");
  const [auction,setAuction] = useState("");
  const [baseBridge,setBaseBridge] = useState("");
  const [baseAuction,setBaseAuction] = useState("");
  const [sourcePart,setSourcePart] = useState<"bridge"|"auction">("bridge");
  useEffect(()=>{void fetch("/optimus-layout-source.css").then(r=>r.text()).then(setCoreCss).catch(()=>{});},[]);
  useEffect(()=>{void Promise.all(["/optimus-pweb.base.js","/optimus-auction-pweb.base.js"].map(p=>fetch(p).then(r=>r.text()))).then(parts=>{setBaseBridge(parts[0]);setBaseAuction(parts[1]);}).catch(()=>{});},[]);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  useEffect(() => {
    if (!cloud) { setNotice("Supabase niet geconfigureerd");setLoading(false);return; }
    let live = true;
    async function load() {
      const session = await cloud!.auth.getSession();
      if (!session.data.session) { if(live){setLoading(false);setNotice("Log eerst in via het dashboard.");}return; }
      const member = await cloud!.rpc("optimus_is_pedigree_member");
      if (!member.data || member.error) { if(live){setLoading(false);setNotice("Geen toegang tot het Optimus-team.");}return; }
      const result = await cloud!.from("optimus_auction_global_code").select("*").eq("id","main").single();
      if (!live) return;
      if (result.error) setNotice(result.error.message);
      else {const data=result.data as CodeRow;setRow(data);setCss(data.draft_css);setJs(data.draft_js);setBridge(data.draft_bridge||"");setAuction(data.draft_auction||"");setAuthorized(true);}
      setLoading(false);
    }
    void load();return()=>{live=false};
  },[]);
  async function save(publish:boolean) {
    if (!cloud || !row || busy) return;
    if (publish && !window.confirm("Deze code onmiddellijk publiceren op ALLE PWeb-veulenpagina's?")) return;
    setBusy(true);setNotice("");
    const patch = publish ? {draft_css:css,draft_js:js,draft_bridge:bridge,draft_auction:auction,published_bridge:bridge,published_auction:auction,published_css:css,published_js:js,published_at:new Date().toISOString(),updated_at:new Date().toISOString(),revision:row.revision+1}
      : {draft_css:css,draft_js:js,draft_bridge:bridge,draft_auction:auction,updated_at:new Date().toISOString(),revision:row.revision+1};
    const result = await cloud.from("optimus_auction_global_code").update(patch).eq("id","main").eq("revision",row.revision).select("*").maybeSingle();
    if(result.error) setNotice("Opslaan mislukt: "+result.error.message);
    else if (!result.data) setNotice("Een collega heeft ondertussen wijzigingen opgeslagen. Vernieuw de pagina.");
    else {setRow(result.data as CodeRow);setNotice(publish?"✓ Gepubliceerd: de wijzigingen gelden op alle pagina's die de centrale PWeb-code gebruiken.":"✓ Concept opgeslagen.");}
    setBusy(false);
  }
  const changed = !!row && (css!==row.draft_css || js!==row.draft_js || bridge!==(row.draft_bridge||"") || auction!==(row.draft_auction||""));
  return <main className={styles.page}>
    <header className={styles.top}><div><p className={styles.eyebrow}>OPTIMUS AUCTION · CENTRAAL BEHEER</p><h1>PWeb-code</h1><p>Één centrale code voor alle veulens en embryo's.</p></div><Link className={styles.primary} href="/dashboard">← DASHBOARD</Link></header>
    {loading ? <p>Code laden…</p> : !authorized ? <p className={styles.notice}>{notice} <Link href="/dashboard">Naar dashboard</Link></p> : <>
      <div className={styles.notice}><strong>Hoe werkt het?</strong> Bewerk de globale CSS of JavaScript. Sla eerst als concept op, en klik pas daarna op Publiceren. De bestaande PWeb-code blijft staan; alle pagina's halen automatisch de nieuwe versie op.</div>
      <div className={styles.siteTabs}><button className={mode==="css"?styles.tabActive:""} onClick={()=>setMode("css")}>CSS · OPMAAK</button><button className={mode==="js"?styles.tabActive:""} onClick={()=>setMode("js")}>EIGEN JAVASCRIPT</button><button className={mode==="source"?styles.tabActive:""} onClick={()=>setMode("source")}>VOLLEDIGE SYSTEEMCODE</button></div>
      <p className={styles.help}>{mode==="css"?"Voorbeeld: .optimus-pweb-video-button { background: pink !important; }":"Deze JavaScript-code draait op alle gekoppelde PWeb-pagina's. Wijzig alleen als je weet wat de code doet."}</p>
      {mode==="css" && <button className={styles.linkButton} type="button" disabled={!coreCss} onClick={()=>{if(css.trim()&&!window.confirm("De huidige concept-CSS vervangen door de volledige standaardcode?"))return;setCss(coreCss);}}>↻ VOLLEDIGE STANDAARD-CSS LADEN ({Math.round(coreCss.length/1000)} KB)</button>}
      {mode==="source" && <div className={styles.footerActions}><button className={sourcePart==="bridge"?styles.tabActive:""} onClick={()=>setSourcePart("bridge")}>CENTRALE BRIDGE</button><button className={sourcePart==="auction"?styles.tabActive:""} onClick={()=>setSourcePart("auction")}>AUCTION LAYOUT</button><button className={styles.linkButton} onClick={()=>{if(window.confirm("Standaardcode herstellen voor dit onderdeel?")){if(sourcePart==="bridge")setBridge(baseBridge);else setAuction(baseAuction);}}}>↻ STANDAARDCODE HERSTELLEN</button></div>}
      <textarea spellCheck={false} aria-label={mode==="css"?"Volledige CSS-code":mode==="js"?"Eigen JavaScript-code":"Volledige systeembroncode"} className={styles.outputCode} style={{minHeight:520,fontSize:12}} value={mode==="css"?css:mode==="js"?js:sourcePart==="bridge"?(bridge||baseBridge):(auction||baseAuction)} onChange={e=>mode==="css"?setCss(e.target.value):mode==="js"?setJs(e.target.value):sourcePart==="bridge"?setBridge(e.target.value):setAuction(e.target.value)} />
      <div className={styles.footerActions}>
        <button className={styles.appliedButton} disabled={busy||!changed} onClick={()=>void save(false)}>CONCEPT OPSLAAN</button>
        <button className={styles.primary} disabled={busy||!row||(css===row.published_css&&js===row.published_js&&bridge===(row.published_bridge||"")&&auction===(row.published_auction||""))} onClick={()=>void save(true)}>● PUBLICEREN OP ALLE VEULENS</button>
        <button className={styles.linkButton} onClick={()=>void navigator.clipboard.writeText(mode==="css"?css:mode==="js"?js:sourcePart==="bridge"?(bridge||baseBridge):(auction||baseAuction))}>CODE KOPIËREN</button>
      </div>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <p className={styles.help}>Laatst gepubliceerd: {row?.published_at?new Date(row.published_at).toLocaleString("nl-BE"):"Nog geen wijzigingen gepubliceerd"} · Revisie {row?.revision}</p>
      <details><summary style={{cursor:"pointer",fontWeight:700}}>Eenmalige PWeb-loader (ter informatie)</summary><p className={styles.help}>Deze code verschilt per veulen door het unieke ID. Kopieer de correcte code per veulen via het dashboard.</p><textarea readOnly className={styles.baseCode} value={baseSnippet} /></details>
    </>}
  </main>;
}
