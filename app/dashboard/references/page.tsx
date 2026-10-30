"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "../../lib/supabaseClient";
import styles from "./references-admin.module.css";

type Reference = {
  id:string;name:string;auction_label:string;result_text:string;
  video_url:string;poster_url:string;position:number;is_published:boolean;
  sire:string;dam:string;birth_year:string;sex:string;
  created_at:string;
};
type Form = {name:string;auction_label:string;result_text:string;video_url:string;poster_url:string;is_published:boolean;sire:string;dam:string;birth_year:string;sex:string};
const EMPTY:Form = {name:"",auction_label:"",result_text:"",video_url:"",poster_url:"",is_published:false,sire:"",dam:"",birth_year:"",sex:""};
const BUCKET="optimus-auction-media";
const EMBED_URL="https://optimusauction.vercel.app/references/embed";
const EMBED_CODE = [
 '<iframe id="optimus-references-frame" src="'+EMBED_URL+'"',
 ' title="Optimus Auction References" allow="autoplay; fullscreen"',
 ' loading="lazy" scrolling="no"',
 ' style="display:block;width:100%;height:850px;max-width:1036px;margin:0 auto;border:0;background:#fff;"></iframe>',
 '<script>(function(){',
 'var f=document.getElementById("optimus-references-frame");if(!f)return;',
 'window.addEventListener("message",function(e){',
 'if(e.origin!=="https://optimusauction.vercel.app"||e.source!==f.contentWindow)return;',
 'if(!e.data)return;',
 'if(e.data.type==="optimus-references-scroll"){f.scrollIntoView({behavior:"smooth",block:"start"});return;}',
 'if(e.data.type!=="optimus-references-height")return;',
 'var h=Number(e.data.height);if(Number.isFinite(h)&&h>=160&&h<=30000)f.style.height=(h+3)+"px";',
 '});})();</script>'
].join("\n");

function validHttps(value:string) {
  try {return new URL(value).protocol==="https:";} catch {return false;}
}
export default function ReferencesAdmin() {
  const [auth,setAuth]=useState<"loading"|"denied"|"allowed">("loading");
  const [items,setItems]=useState<Reference[]>([]);
  const [form,setForm]=useState<Form>(EMPTY);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [uploading,setUploading]=useState<"video"|"poster"|null>(null);
  const [videoFile,setVideoFile]=useState<File|null>(null);
  const [posterFile,setPosterFile]=useState<File|null>(null);
  const [inputVersion,setInputVersion]=useState(0);
  const [notice,setNotice]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [needsLogin,setNeedsLogin]=useState(false);

  const reload=useCallback(async()=>{
    const {data,error}=await supabase.from("optimus_auction_references")
      .select("id,name,auction_label,result_text,video_url,poster_url,position,is_published,created_at,sire,dam,birth_year,sex")
      .order("position",{ascending:true}).order("created_at",{ascending:true}).limit(100);
    if(error)setNotice("Ophalen mislukt: "+error.message);
    else setItems((data||[]) as Reference[]);
  },[]);

  const checkAuth=useCallback(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setNeedsLogin(true);setAuth("denied");return;}
    const {data,error}=await supabase.rpc("optimus_is_pedigree_member");
    if(error||!data){setNeedsLogin(false);setAuth("denied");return;}
    setAuth("allowed");
    setNeedsLogin(false);
    await reload();
  },[reload]);

  useEffect(()=>{
    void checkAuth();
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{window.setTimeout(()=>void checkAuth(),0);});
    return ()=>subscription.unsubscribe();
  },[checkAuth]);

  async function signIn(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setNotice("");
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setBusy(false);setPassword("");
    if(error)setNotice(error.message); else void checkAuth();
  }

  function resetForm(){setForm({...EMPTY});setEditingId(null);setVideoFile(null);setPosterFile(null);setInputVersion(x=>x+1);}
  function edit(item:Reference){
    setVideoFile(null);setPosterFile(null);setInputVersion(x=>x+1);
    setEditingId(item.id);
    setForm({name:item.name,auction_label:item.auction_label,
      result_text:item.result_text,video_url:item.video_url,
      poster_url:item.poster_url,is_published:item.is_published,
      sire:item.sire||"",dam:item.dam||"",birth_year:item.birth_year||"",sex:item.sex||""});
    window.scrollTo({top:0,behavior:"smooth"});
  }
  async function uploadFile(file:File|undefined,kind:"video"|"poster"):Promise<string|null>{
    if(!file)return null;
    const valid = kind==="video"
      ? ["video/mp4","video/webm"].includes(file.type)
      : ["image/jpeg","image/png","image/webp"].includes(file.type);
    if(!valid){setNotice(kind==="video"?"Gebruik een MP4- of WebM-video.":"Gebruik JPG, PNG of WebP.");return null;}
    if(file.size>100*1024*1024){setNotice("Bestand is groter dan 100 MB. Comprimeer eerst de video.");return null;}
    setUploading(kind);setNotice("");
    const ext=kind==="video"?(file.type==="video/webm"?"webm":"mp4")
      :(file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg");
    const path="references/"+crypto.randomUUID()+"."+ext;
    const {error}=await supabase.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
    if(error){setNotice("Upload mislukt: "+error.message);setUploading(null);return null;}
    const {data}=supabase.storage.from(BUCKET).getPublicUrl(path);
    setForm(p=>({...p,[kind==="video"?"video_url":"poster_url"]:data.publicUrl}));
    setNotice(kind==="video"?"Video geüpload. Klik nu op OPSLAAN.":"Afbeelding geüpload. Klik nu op OPSLAAN.");
    setUploading(null);
    return data.publicUrl;
  }

  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!form.name.trim()){setNotice("Vul een paardennaam in.");return;}
    if(!videoFile&&!validHttps(form.video_url)){setNotice("Kies een MP4/WebM-video of vul een HTTPS-videolink in.");return;}
    if(!posterFile&&form.poster_url&&!validHttps(form.poster_url)){setNotice("De afbeelding moet een HTTPS-link zijn.");return;}
    setBusy(true);setNotice("");
    const videoUrl=videoFile ? await uploadFile(videoFile,"video") : form.video_url.trim();
    if(!videoUrl){setBusy(false);return;}
    if(videoFile)setVideoFile(null);
    const posterUrl=posterFile ? await uploadFile(posterFile,"poster") : form.poster_url.trim();
    if(posterFile&&!posterUrl){setBusy(false);return;}
    if(posterFile)setPosterFile(null);
    const payload={
      name:form.name.trim(),auction_label:form.auction_label.trim(),
      result_text:form.result_text.trim(),video_url:videoUrl,
      poster_url:posterUrl||"",is_published:form.is_published,
      sire:form.sire.trim(),dam:form.dam.trim(),birth_year:form.birth_year.trim(),sex:form.sex.trim(),
      updated_at:new Date().toISOString()
    };
    const result=editingId
      ? await supabase.from("optimus_auction_references").update(payload).eq("id",editingId)
      : await supabase.from("optimus_auction_references").insert({...payload,position:items.length?Math.max(...items.map(i=>i.position))+1:0});
    if(result.error)setNotice("Opslaan mislukt: "+result.error.message);
    else {setNotice("Referentie opgeslagen. Gepubliceerde wijzigingen staan automatisch op de iframepagina.");resetForm();await reload();}
    setBusy(false);
  }

  async function remove(item:Reference){
    if(!window.confirm('Referentie "'+item.name+'" verwijderen?'))return;
    setBusy(true);setNotice("");
    const {error}=await supabase.from("optimus_auction_references").delete().eq("id",item.id);
    if(error)setNotice("Verwijderen mislukt: "+error.message);
    else {if(editingId===item.id)resetForm();await reload();setNotice("Referentie verwijderd.");}
    setBusy(false);
  }

  async function setPublished(item:Reference){
    setBusy(true);setNotice("");
    const {error}=await supabase.from("optimus_auction_references")
      .update({is_published:!item.is_published,updated_at:new Date().toISOString()}).eq("id",item.id);
    if(error)setNotice(error.message);else await reload();
    setBusy(false);
  }

  async function move(index:number,direction:-1|1){
    const other=items[index+direction],current=items[index];
    if(!other)return;
    setBusy(true);setNotice("");
    const {error:first}=await supabase.from("optimus_auction_references").update({position:other.position}).eq("id",current.id);
    if(first){setNotice(first.message);setBusy(false);return;}
    const {error:second}=await supabase.from("optimus_auction_references").update({position:current.position}).eq("id",other.id);
    if(second)setNotice("Sorteren mislukt: "+second.message);
    await reload();setBusy(false);
  }

  async function copyEmbed(){
    try {await navigator.clipboard.writeText(EMBED_CODE);setNotice("Iframecode gekopieerd. Plaats deze één keer in Pweb.");}
    catch {setNotice("Kopiëren geblokkeerd. Selecteer de code hieronder handmatig.");}
  }

  if(auth==="loading")return <main className={styles.page}>Dashboard laden...</main>;
  if(auth==="denied")return <main className={styles.login}>
    <p className={styles.eyebrow}>OPTIMUS AUCTION · PRIVATE</p>
    <h1>References beheren</h1>
    <p>{needsLogin?"Log in met je bestaande Optimus-dashboardaccount.":"Dit account heeft geen toegang tot het Optimus-team."}</p>
    {needsLogin&&<form onSubmit={signIn} className={styles.loginForm}>
      <input type="email" required placeholder="E-mailadres" value={email} onChange={e=>setEmail(e.target.value)}/>
      <input type="password" required placeholder="Wachtwoord" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button disabled={busy}>INLOGGEN</button>
    </form>}
    {notice&&<p role="status">{notice}</p>}
    <Link href="/dashboard">← Terug naar dashboard</Link>
  </main>;

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>OPTIMUS AUCTION · CONTENT MANAGEMENT</p>
        <h1>References</h1><p>Beheer alle referentievideo&apos;s op één plaats.</p></div>
      <div className={styles.headerActions}>
        <Link className={styles.secondary} href="/dashboard">← DASHBOARD</Link>
        <a className={styles.secondary} target="_blank" rel="noreferrer" href="/references/embed">BEKIJK PAGINA ↗</a>
      </div>
    </header>
    {notice&&<div role="status" className={styles.notice}>{notice}</div>}
    <div className={styles.columns}>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><h2>{editingId?"REFERENTIE AANPASSEN":"NIEUWE REFERENTIE"}</h2>
          {editingId&&<button className={styles.textButton} type="button" onClick={resetForm}>+ NIEUWE</button>}</div>
        <form onSubmit={save} className={styles.form}>
          <label>NAAM VAN HET PAARD *<input required maxLength={150} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Bijv. Excelsior Optimus"/></label>
          <label>VEILING / EDITIE<input maxLength={160} value={form.auction_label} onChange={e=>setForm(p=>({...p,auction_label:e.target.value}))} placeholder="OPTIMUS AUCTION 2021"/></label>
          <label>VADER (SIRE)<input maxLength={120} value={form.sire} onChange={e=>setForm(p=>({...p,sire:e.target.value}))} placeholder="Bijv. Diamant de Semilly"/></label>
          <label>MOEDER (DAM)<input maxLength={120} value={form.dam} onChange={e=>setForm(p=>({...p,dam:e.target.value}))} placeholder="Bijv. Cacacha vh Schaeck"/></label>
          <div className={styles.extraFields}>
            <label>GEBOORTEJAAR<input maxLength={4} inputMode="numeric" value={form.birth_year} onChange={e=>setForm(p=>({...p,birth_year:e.target.value.replace(/[^0-9]/g,"").slice(0,4)}))} placeholder="2021"/></label>
            <label>GESLACHT<select value={form.sex} onChange={e=>setForm(p=>({...p,sex:e.target.value}))}>
              <option value="">Niet ingevuld</option>
              <option value="STALLION">Stallion</option>
              <option value="MARE">Mare</option>
              <option value="GELDING">Gelding</option>
            </select></label>
          </div>
          <label>PRESTATIE OF VERKOOPRESULTAAT<textarea rows={3} maxLength={300} value={form.result_text} onChange={e=>setForm(p=>({...p,result_text:e.target.value}))} placeholder="Bijv. CSI 1.50m of SOLD FOR €60,000 IN 2025"/></label>
          <label>VIDEO UPLOADEN (MP4 / WEBM, MAX. 100 MB)
            <input key={"video-"+inputVersion} type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={busy} onChange={e=>{setVideoFile(e.target.files?.[0]||null);setNotice("");}}/>
          </label>
          {videoFile&&<p className={styles.muted}>✓ Bestand geselecteerd: {videoFile.name} ({(videoFile.size/1024/1024).toFixed(1)} MB). Wordt bij OPSLAAN geüpload.</p>}
          {uploading==="video"&&<p className={styles.muted}>Video wordt geüpload. Laat dit venster open.</p>}
          <label>OF DIRECTE VIDEO-URL<input type="url" value={form.video_url} onChange={e=>setForm(p=>({...p,video_url:e.target.value}))} placeholder="https://.../video.mp4"/></label>
          <label>OPTIONELE COVERFOTO
            <input key={"poster-"+inputVersion} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={busy} onChange={e=>{setPosterFile(e.target.files?.[0]||null);setNotice("");}}/>
          </label>
          {posterFile&&<p className={styles.muted}>✓ Coverfoto geselecteerd: {posterFile.name}</p>}
          {uploading==="poster"&&<p className={styles.muted}>Coverfoto wordt geüpload. Laat dit venster open.</p>}
          <label>OF COVERFOTO-URL<input type="url" value={form.poster_url} onChange={e=>setForm(p=>({...p,poster_url:e.target.value}))} placeholder="https://.../foto.jpg"/></label>
          {form.video_url&&<div className={styles.preview}><video src={form.video_url} poster={form.poster_url||undefined} muted playsInline controls preload="metadata"/></div>}
          <label className={styles.toggle}><input type="checkbox" checked={form.is_published} onChange={e=>setForm(p=>({...p,is_published:e.target.checked}))}/> PUBLICEREN OP WEBSITE</label>
          <button className={styles.primary} disabled={busy||!!uploading} type="submit">{busy?"BEZIG...":editingId?"WIJZIGINGEN OPSLAAN":"REFERENTIE TOEVOEGEN"}</button>
        </form>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><h2>ALLE REFERENTIES ({items.length})</h2></div>
        {!items.length?<div className={styles.empty}>Nog geen referenties toegevoegd.</div>:
        <div className={styles.list}>{items.map((item,i)=><article className={styles.row} key={item.id}>
          <div className={styles.rowIndex}>{String(i+1).padStart(2,"0")}</div>
          <div className={styles.thumbnail}>
            <video src={item.video_url+"#t=0.1"} poster={item.poster_url||undefined} muted preload="metadata"/>
          </div>
          <div className={styles.rowBody}>
            <strong>{item.name}</strong>
            <small>{item.auction_label || "GEEN VEILINGEDITIE"}</small>
            <span className={item.is_published?styles.published:styles.draft}>{item.is_published?"ONLINE":"CONCEPT"}</span>
            <div className={styles.rowActions}>
              <button type="button" disabled={busy} onClick={()=>edit(item)}>BEWERKEN</button>
              <button type="button" disabled={busy} onClick={()=>void setPublished(item)}>{item.is_published?"VERBERGEN":"PUBLICEREN"}</button>
              <button type="button" disabled={busy||i===0} onClick={()=>void move(i,-1)}>↑</button>
              <button type="button" disabled={busy||i===items.length-1} onClick={()=>void move(i,1)}>↓</button>
              <button type="button" disabled={busy} onClick={()=>void remove(item)}>×</button>
            </div>
          </div>
        </article>)}</div>}
      </section>
    </div>
    <section className={styles.embedPanel}>
      <div className={styles.panelTitle}><h2>IFRAME VOOR PWEB</h2>
        <button className={styles.primary} type="button" onClick={()=>void copyEmbed()}>KOPIEER IFRAMECODE</button></div>
      <p>Plak deze code één keer op de nieuwe References-pagina van stal-optimus.auction. Nadien beheer je alle video&apos;s hier, zonder Pweb opnieuw aan te passen.</p>
      <textarea aria-label="Iframe broncode" readOnly value={EMBED_CODE} rows={6} onFocus={e=>e.target.select()}/>
    </section>
  </main>;
}
