"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { HORSE_POSITIONS, type HorseDetails } from "../pedigree/pedigree-data";
import { normalizeHorseName } from "../pedigrees/ancestry";
import {
  SITES, SITE_LABEL, WIDTH_LABELS, DEFAULT_HEIGHTS,
  defaultDescription, safeDescription, safeHeights,
  generatePWebCode, signature, type Site, type SiteCode,
  type LotData, type HorseProfile, type PedigreeRecord, type LotDescription,
} from "./content";
import styles from "./dashboard.module.css";

const cloud = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

type Tab = "pedigree" | "description" | "videos" | "sites";

function makeSite(pedigree: PedigreeRecord, site: Site): SiteCode {
  return {
    owner_id: pedigree.owner_id, pedigree_id: pedigree.id, site,
    base_code: "", heights: [...DEFAULT_HEIGHTS], crop: 265,
    updated_at: "", applied_signature: null, applied_at: null,
  };
}

export default function AuctionDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [pedigrees, setPedigrees] = useState<PedigreeRecord[]>([]);
  const [lots, setLots] = useState<LotData[]>([]);
  const [siteCodes, setSiteCodes] = useState<SiteCode[]>([]);
  const [profiles, setProfiles] = useState<HorseProfile[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("pedigree");
  const [site, setSite] = useState<Site>("auction");
  const [draftHorses, setDraftHorses] = useState<HorseDetails[]>([]);
  const [draftDescription, setDraftDescription] = useState<LotDescription>({ sections: [] });
  const [draftSite, setDraftSite] = useState<SiteCode | null>(null);
  const [profileName, setProfileName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [copiedSignature, setCopiedSignature] = useState("");
  const [dirtyPedigree, setDirtyPedigree] = useState(false);
  const [dirtyDescription, setDirtyDescription] = useState(false);
  const [dirtySite, setDirtySite] = useState(false);

  useEffect(() => {
    if (!cloud) { setNotice("Supabase is niet geconfigureerd."); return; }
    void cloud.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setUserEmail(data.session?.user.email || "");
    });
    const { data: { subscription } } = cloud.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setUserEmail(session?.user.email || "");
    });
    return () => subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!cloud || !userId) return;
    setIsBusy(true);
    const auth = await cloud.rpc("optimus_is_pedigree_member");
    if (auth.error || !auth.data) {
      setAllowed(false);
      setNotice(auth.error?.message || "Dit account heeft geen toegang tot het Optimus-team.");
      setIsBusy(false);
      return;
    }
    setAllowed(true);
    const [a, b, c, d] = await Promise.all([
      cloud.from("optimus_pedigrees").select("id,owner_id,name,horses,public_token,is_published,updated_at").order("name").limit(500),
      cloud.from("optimus_auction_lot_descriptions").select("*").limit(500),
      cloud.from("optimus_auction_site_codes").select("*").limit(1000),
      cloud.from("optimus_auction_horse_profiles").select("*").limit(2000),
    ]);
    const problem = [a.error, b.error, c.error, d.error].find(Boolean);
    if (problem) {
      setNotice("Gegevens ophalen mislukt: " + problem.message);
    } else {
      setPedigrees((a.data || []) as PedigreeRecord[]);
      setLots((b.data || []) as LotData[]);
      setSiteCodes(((c.data || []) as SiteCode[]).map((row) => ({ ...row, heights: safeHeights(row.heights) })));
      setProfiles((d.data || []) as HorseProfile[]);
      setNotice("");
    }
    setIsBusy(false);
  }, [userId]);

  useEffect(() => {
    if (userId) void refresh();
    else { setAllowed(false); setPedigrees([]); setLots([]); setSiteCodes([]); setProfiles([]); }
  }, [userId, refresh]);

  function keyOf(p: PedigreeRecord) { return p.owner_id + ":" + p.id; }
  const selected = useMemo(() =>
    pedigrees.find((p) => keyOf(p) === selectedKey) || pedigrees[0], [pedigrees, selectedKey]);
  const selectedLot = lots.find((l) => l.owner_id === selected?.owner_id && l.pedigree_id === selected?.id);
  const selectedSite = siteCodes.find((s) => s.owner_id === selected?.owner_id && s.pedigree_id === selected?.id && s.site === site);
  const selectedDescription = selected ? safeDescription(selectedLot?.description, selected.horses) : { sections: [] };

  useEffect(() => {
    if (!selected) return;
    setDraftHorses(selected.horses.map((h) => ({ ...h })));
    setDraftDescription(safeDescription(
      lots.find((l) => l.owner_id === selected.owner_id && l.pedigree_id === selected.id)?.description,
      selected.horses,
    ));
    setDirtyPedigree(false);
    setDirtyDescription(false);
    setProfileName("");
    setVideoUrl("");
  // Only swap the editable lot when its selected ID changes or a cloud refresh changes the version.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.owner_id, selected?.id, selected?.updated_at, selectedLot?.updated_at]);

  useEffect(() => {
    if (!selected) return;
    const existing = siteCodes.find((s) => s.owner_id === selected.owner_id &&
      s.pedigree_id === selected.id && s.site === site);
    setDraftSite(existing ? { ...existing, heights: safeHeights(existing.heights) } : makeSite(selected, site));
    setCopiedSignature("");
    setDirtySite(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.owner_id, selected?.id, site, selectedSite?.updated_at]);

  const statusFor = (pedigree: PedigreeRecord, website: Site) => {
    const lot = lots.find((l) => l.pedigree_id === pedigree.id && l.owner_id === pedigree.owner_id);
    const saved = siteCodes.find((s) => s.pedigree_id === pedigree.id && s.owner_id === pedigree.owner_id && s.site === website);
    const current = signature(pedigree, lot, saved, profiles);
    return { needsUpdate: saved?.applied_signature !== current, version: current, saved };
  };

  const totalUpdates = useMemo(() => Object.fromEntries(SITES.map((s) =>
    [s, pedigrees.filter((p) => statusFor(p, s).needsUpdate).length])) as Record<Site, number>,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [pedigrees, lots, siteCodes, profiles]);

  const matching = pedigrees.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const editingProfile = profiles.find((p) => p.normalized_name === normalizeHorseName(profileName));
  const managedSite = selected && draftSite ? draftSite : null;
  const currentCode = selected && managedSite
    ? generatePWebCode(selected, draftDescription, managedSite, profiles.map((p) =>
      p.normalized_name === normalizeHorseName(profileName) && profileName && videoUrl !== (editingProfile?.video_url || "")
        ? { ...p, video_url: videoUrl } : p))
    : "";
  const publishedStatus = selected ? statusFor(selected, site) : null;
  const currentSignature = selected && managedSite
    ? signature(selected, selectedLot, selectedSite, profiles) : "";

  function updateHorse(index: number, field: keyof HorseDetails, value: string) {
    setDraftHorses((prev) => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
    setDirtyPedigree(true);
  }
  function updateSection(index: number, field: "title" | "horse", value: string) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((s, i) =>
      i === index ? { ...s, [field]: value } : s) }));
    setDirtyDescription(true);
  }
  function updateItem(section: number, item: number, field: "horse" | "note", value: string) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((s, i) =>
      i === section ? { ...s, items: s.items.map((v, j) => j === item ? { ...v, [field]: value } : v) } : s) }));
    setDirtyDescription(true);
  }
  function addItem(section: number) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((s, i) =>
      i === section ? { ...s, items: [...s.items, { horse: "", note: "" }] } : s) }));
    setDirtyDescription(true);
  }
  function removeItem(section: number, item: number) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((s, i) =>
      i === section ? { ...s, items: s.items.filter((_, j) => j !== item) } : s) }));
    setDirtyDescription(true);
  }
  function updateSite(field: keyof SiteCode, value: SiteCode[keyof SiteCode]) {
    setDraftSite((prev) => prev ? ({ ...prev, [field]: value }) : prev);
    setDirtySite(true);
    setCopiedSignature("");
  }

  async function savePedigree() {
    if (!cloud || !selected || isBusy) return;
    if (draftHorses.some((h) => h.name.length > 120 || h.level.length > 30 || h.year.length > 8)) {
      setNotice("Controleer naam, level en geboortejaar: een veld is te lang."); return;
    }
    setIsBusy(true);
    const { error } = await cloud.from("optimus_pedigrees")
      .update({ horses: draftHorses, updated_at: new Date().toISOString() })
      .eq("id", selected.id).eq("owner_id", selected.owner_id);
    if (error) { setNotice("Opslaan mislukt: " + error.message); setIsBusy(false); return; }
    setNotice("Pedigree opgeslagen. Gelijke paarden worden ook in andere pedigrees bijgewerkt.");
    setDirtyPedigree(false);
    await refresh();
  }

  async function saveDescription() {
    if (!cloud || !selected || isBusy) return;
    setIsBusy(true);
    const { error } = await cloud.from("optimus_auction_lot_descriptions").upsert({
      owner_id: selected.owner_id, pedigree_id: selected.id,
      description: draftDescription, updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id,pedigree_id" });
    if (error) { setNotice("Beschrijving opslaan mislukt: " + error.message); setIsBusy(false); return; }
    setNotice("Beschrijving opgeslagen. Controleer de broncodes voor beide websites.");
    setDirtyDescription(false);
    await refresh();
  }

  async function saveVideo() {
    if (!cloud || !profileName.trim() || isBusy) return;
    const normalized_name = normalizeHorseName(profileName);
    if (!normalized_name) return;
    if (videoUrl && !/^https:\/\/(www\.)?(youtu\.be|youtube\.com|youtube-nocookie\.com|m\.youtube\.com)\//i.test(videoUrl)) {
      setNotice("Gebruik een geldige HTTPS YouTube-link."); return;
    }
    setIsBusy(true);
    const { error } = await cloud.from("optimus_auction_horse_profiles").upsert({
      normalized_name, display_name: profileName.trim(), video_url: videoUrl.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "normalized_name" });
    if (error) { setNotice("Video opslaan mislukt: " + error.message); setIsBusy(false); return; }
    setNotice("Video opgeslagen. De broncodes met dit paard moeten bijgewerkt worden.");
    await refresh();
  }

  async function saveSite() {
    if (!cloud || !selected || !draftSite || isBusy) return;
    setIsBusy(true);
    const { error } = await cloud.from("optimus_auction_site_codes").upsert({
      owner_id: selected.owner_id, pedigree_id: selected.id, site,
      base_code: draftSite.base_code,
      heights: safeHeights(draftSite.heights),
      crop: Math.max(0, Math.min(20000, Number(draftSite.crop) || 0)),
      updated_at: new Date().toISOString(),
      // Existing applied_signature is intentionally not changed.
    }, { onConflict: "owner_id,pedigree_id,site" });
    if (error) { setNotice("Website-instellingen opslaan mislukt: " + error.message); setIsBusy(false); return; }
    setDirtySite(false);
    setNotice("Instellingen opgeslagen. Kopieer daarna de nieuwe broncode.");
    await refresh();
  }

  async function copyCode() {
    if (!currentCode || !selected || !draftSite) return;
    if (dirtyPedigree || dirtyDescription || dirtySite) {
      setNotice("Sla eerst alle wijzigingen op voordat je de definitieve broncode kopieert."); return;
    }
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopiedSignature(currentSignature);
      setNotice("Broncode gekopieerd. Plak hem in het PWeb CMS en bevestig daarna dat hij online staat.");
    } catch {
      setNotice("Automatisch kopiëren geblokkeerd. Selecteer de broncode en kopieer handmatig.");
    }
  }

  async function markApplied() {
    if (!cloud || !selected || !publishedStatus || isBusy) return;
    if (dirtyDescription || dirtyPedigree || dirtySite) {
      setNotice("Sla eerst de wijzigingen op."); return;
    }
    if (!window.confirm("Staat de nieuwe broncode daadwerkelijk online op " + SITE_LABEL[site] + "?")) return;
    setIsBusy(true);
    // An unsaved site gets its default entry first.
    if (!publishedStatus.saved) {
      const { error: newError } = await cloud.from("optimus_auction_site_codes").upsert({
        owner_id: selected.owner_id, pedigree_id: selected.id, site,
        base_code: draftSite?.base_code || "",
        heights: draftSite?.heights || DEFAULT_HEIGHTS,
        crop: draftSite?.crop ?? 265,
        updated_at: new Date().toISOString(),
      }, { onConflict: "owner_id,pedigree_id,site" });
      if (newError) { setNotice(newError.message); setIsBusy(false); return; }
      // The creation updates the signature, so refresh before marking it applied.
      await refresh();
      setNotice("Website-instellingen aangemaakt. Kopieer de nieuwe versie en bevestig opnieuw.");
      return;
    }
    const { error } = await cloud.from("optimus_auction_site_codes")
      .update({ applied_signature: currentSignature, applied_at: new Date().toISOString() })
      .eq("owner_id", selected.owner_id).eq("pedigree_id", selected.id).eq("site", site);
    if (error) { setNotice("Bevestiging mislukt: " + error.message); setIsBusy(false); return; }
    setNotice("✓ " + SITE_LABEL[site] + " gemarkeerd als bijgewerkt.");
    setCopiedSignature("");
    await refresh();
  }

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cloud) return;
    setIsBusy(true);
    const { error } = await cloud.auth.signInWithPassword({ email, password });
    setPassword("");
    setIsBusy(false);
    if (error) setNotice(error.message);
  }

  const uniqueHorses = useMemo(() => {
    if (!selected) return [];
    const dictionary = new Map<string, string>();
    for (const h of selected.horses) if (h.name.trim()) dictionary.set(normalizeHorseName(h.name), h.name.trim());
    for (const s of draftDescription.sections) {
      if (s.horse.trim()) dictionary.set(normalizeHorseName(s.horse), s.horse.trim());
      for (const i of s.items) if (i.horse.trim()) dictionary.set(normalizeHorseName(i.horse), i.horse.trim());
    }
    return [...dictionary.values()].sort();
  }, [selected, draftDescription]);

  function chooseProfile(name: string) {
    const existing = profiles.find((p) => p.normalized_name === normalizeHorseName(name));
    setProfileName(name);
    setVideoUrl(existing?.video_url || "");
  }

  if (!cloud) return <main className={styles.page}><h1>Supabase is niet ingesteld</h1></main>;
  if (!userId || !allowed) return (
    <main className={styles.loginPage}>
      <p className={styles.eyebrow}>OPTIMUS AUCTION · PRIVATE</p>
      <h1>Content dashboard</h1>
      <p>Log in met je bestaande Optimus Pedigree-account.</p>
      <form className={styles.loginForm} onSubmit={signIn}>
        <input type="email" required placeholder="E-mailadres" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" required placeholder="Wachtwoord" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={isBusy}>INLOGGEN</button>
      </form>
      {userId && !allowed && <button className={styles.linkButton} onClick={() => void refresh()}>Opnieuw controleren</button>}
      {notice && <p role="status">{notice}</p>}
    </main>
  );

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div><p className={styles.eyebrow}>OPTIMUS AUCTION · CONTENT MANAGEMENT</p>
          <h1>Dashboard</h1><p>Beheer alle pedigrees, bloedlijnen, video’s en PWeb-broncodes centraal.</p></div>
        <div className={styles.user}><span>{userEmail}</span><button onClick={() => void refresh()} disabled={isBusy}>↻ VERVERSEN</button>
          <button onClick={() => void cloud.auth.signOut()}>UITLOGGEN</button></div>
      </header>
      <div className={styles.stats}>
        <div><strong>{pedigrees.length}</strong><span>PEDIGREES</span></div>
        {SITES.map((s) => <div key={s}><strong>{totalUpdates[s]}</strong><span>UPDATE NODIG · {SITE_LABEL[s]}</span></div>)}
      </div>
      {notice && <div className={styles.notice} role="status">{notice}</div>}
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h2>Alle paarden</h2>
          <input aria-label="Paard zoeken" placeholder="Zoek paard of embryo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className={styles.horseList}>
            {matching.map((horse) => {
              const active = keyOf(horse) === keyOf(selected);
              const pending = SITES.filter((s) => statusFor(horse, s).needsUpdate);
              return <button key={keyOf(horse)} className={active ? styles.horseActive : styles.horseButton}
                onClick={() => {
                  if ((dirtyPedigree || dirtyDescription || dirtySite) && !window.confirm("Niet-opgeslagen wijzigingen weggooien?")) return;
                  setSelectedKey(keyOf(horse)); setTab("pedigree"); setNotice("");
                }}>
                <span className={styles.horseName}>{horse.name}</span>
                {pending.length ? <small>Update nodig: {pending.map((s) => s === "be" ? ".be" : ".auction").join(" · ")}</small>
                  : <small className={styles.good}>✓ Beide bijgewerkt</small>}
              </button>;
            })}
          </div>
        </aside>
        {selected ? <section className={styles.detail}>
          <div className={styles.detailHeader}>
            <div><p className={styles.eyebrow}>PEDIGREE / LOT</p><h2>{selected.name}</h2></div>
            <Link href="/pedigrees" target="_blank">OPEN OUDE PEDIGREE EDITOR ↗</Link>
          </div>
          <div className={styles.siteSummary}>
            {SITES.map((s) => {
              const pending = statusFor(selected, s).needsUpdate;
              return <button key={s} type="button" onClick={() => { setTab("sites"); setSite(s); }}
                className={pending ? styles.pending : styles.done}>
                <span>{SITE_LABEL[s]}</span><strong>{pending ? "● UPDATE NODIG" : "✓ BIJGEWERKT"}</strong>
              </button>;
            })}
          </div>
          <nav className={styles.tabs} aria-label="Dashboard onderdelen">
            {([["pedigree", "Pedigree"], ["description", "Beschrijving"], ["videos", "Video’s"], ["sites", "Broncodes & Hippomundo"]] as const).map(([value, label]) =>
              <button key={value} onClick={() => setTab(value)} className={tab === value ? styles.tabActive : ""}>{label}</button>)}
          </nav>

          {tab === "pedigree" && <section>
            <h3>Pedigree aanpassen</h3>
            <p className={styles.help}>Eén wijziging aan hetzelfde paard wordt in alle gekoppelde pedigrees overgenomen, ook bij andere loten.</p>
            <div className={styles.pedigreeFields}>
              {draftHorses.map((horse, i) => <div className={styles.pedigreeRow} key={i}>
                <small>{HORSE_POSITIONS[i]}</small>
                <input aria-label={"Naam " + HORSE_POSITIONS[i]} value={horse.name} maxLength={120} onChange={(e) => updateHorse(i, "name", e.target.value)} placeholder="Naam" />
                <input aria-label={"Level " + HORSE_POSITIONS[i]} value={horse.level} maxLength={30} onChange={(e) => updateHorse(i, "level", e.target.value)} placeholder="Level" />
                <input aria-label={"Jaar " + HORSE_POSITIONS[i]} value={horse.year} maxLength={8} onChange={(e) => updateHorse(i, "year", e.target.value)} placeholder="Jaar" />
              </div>)}
            </div>
            <button className={styles.primary} disabled={isBusy || !dirtyPedigree} onClick={savePedigree}>PEDIGREE OPSLAAN</button>
          </section>}

          {tab === "description" && <section>
            <h3>Beschrijving en damline</h3>
            <p className={styles.help}>Deze informatie wordt op beide websites gebruikt. Video-icoontjes verschijnen automatisch bij paarden met een opgeslagen YouTube-link.</p>
            {draftDescription.sections.map((section, i) => <div className={styles.descriptionBlock} key={i}>
              <div className={styles.formGrid}>
                <label>Sectie<input value={section.title} onChange={(e) => updateSection(i, "title", e.target.value)} /></label>
                <label>Paard<input value={section.horse} onChange={(e) => updateSection(i, "horse", e.target.value)} placeholder="Naam moeder / vader" /></label>
              </div>
              {section.items.map((item, j) => <div className={styles.itemRow} key={j}>
                <input aria-label="Paard" value={item.horse} onChange={(e) => updateItem(i, j, "horse", e.target.value)} placeholder="Paard (bv. Like a Diamond vh Schaeck)" />
                <input aria-label="Opmerking" value={item.note} onChange={(e) => updateItem(i, j, "note", e.target.value)} placeholder="Opmerking (bv. CSI5* GP WINNER)" />
                <button aria-label="Verwijder paard" onClick={() => removeItem(i, j)}>×</button>
              </div>)}
              <button className={styles.linkButton} onClick={() => addItem(i)}>+ PAARD TOEVOEGEN</button>
            </div>)}
            <button className={styles.linkButton} onClick={() => {
              setDraftDescription((prev) => ({ sections: [...prev.sections, { title: "DAMLINE", horse: "", items: [] }] }));
              setDirtyDescription(true);
            }}>+ SECTIE TOEVOEGEN</button>
            <div className={styles.footerActions}><button className={styles.primary} disabled={isBusy || !dirtyDescription} onClick={saveDescription}>BESCHRIJVING OPSLAAN</button></div>
          </section>}

          {tab === "videos" && <section>
            <h3>Video’s per paard</h3>
            <p className={styles.help}>Voeg een YouTube-link één keer toe. Dezelfde video verschijnt bij elke vermelding van dat paard.</p>
            <input placeholder="Filter paarden..." value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)} className={styles.searchInput} />
            <div className={styles.profilePills}>
              {uniqueHorses.filter((n) => n.toLowerCase().includes(profileFilter.toLowerCase()))
                .map((name) => <button key={name} onClick={() => chooseProfile(name)}
                  className={normalizeHorseName(profileName) === normalizeHorseName(name) ? styles.profileSelected : ""}>
                  {name} {profiles.some((p) => p.normalized_name === normalizeHorseName(name) && p.video_url) ? "▶" : "+"}
                </button>)}
            </div>
            <div className={styles.descriptionBlock}>
              <label>Naam paard<input value={profileName} onChange={(e) => {
                const name = e.target.value;
                setProfileName(name);
                const found = profiles.find((p) => p.normalized_name === normalizeHorseName(name));
                setVideoUrl(found?.video_url || "");
              }} placeholder="Like a Diamond vh Schaeck" /></label>
              <label>YouTube-video URL<input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtu.be/..." /></label>
              <button className={styles.primary} onClick={saveVideo} disabled={isBusy || !profileName.trim()}>VIDEO OPSLAAN / BIJWERKEN</button>
            </div>
          </section>}

          {tab === "sites" && managedSite && <section>
            <h3>Broncode en Hippomundo</h3>
            <p className={styles.help}>Iedere website heeft een eigen broncode en publicatiecontrole. Je bestaande PWeb-code blijft als basis behouden.</p>
            <div className={styles.siteTabs}>
              {SITES.map((s) => <button key={s} className={s === site ? styles.tabActive : ""}
                onClick={() => { if (dirtySite && !window.confirm("Niet-opgeslagen site-instellingen weggooien?")) return; setSite(s); }}>
                {SITE_LABEL[s]}</button>)}
            </div>
            <div className={publishedStatus?.needsUpdate ? styles.statusPending : styles.statusDone}>
              {publishedStatus?.needsUpdate ? "● NIEUWE BRONCODE NODIG" : "✓ LAATSTE VERSIE STAAT ONLINE"}
              {publishedStatus?.saved?.applied_at &&
                <small>Laatste bevestiging: {new Date(publishedStatus.saved.applied_at).toLocaleString("nl-BE")}</small>}
            </div>
            <h4>Hippomundo — iframehoogte per schermbreedte</h4>
            <p className={styles.help}>Pas de hoogte in pixels aan. De extra bovenste uitsnede kan je apart regelen.</p>
            <div className={styles.heightGrid}>
              {WIDTH_LABELS.map((label, i) => <label key={label}>{label}
                <input type="number" min="200" max="20000" value={managedSite.heights[i]}
                  onChange={(e) => updateSite("heights", managedSite.heights.map((n, j) => i === j ? Number(e.target.value) : n))} />
              </label>)}
              <label>Uitsnede bovenaan (px)
                <input type="number" min="0" max="20000" value={managedSite.crop}
                  onChange={(e) => updateSite("crop", Number(e.target.value))} />
              </label>
            </div>
            <h4>Bestaande PWeb-broncode</h4>
            <p className={styles.help}>Plak hier één keer de bestaande volledige HTML/CSS-code van deze website. Hierna worden wijzigingen automatisch eraan toegevoegd.</p>
            <textarea className={styles.baseCode} spellCheck={false} value={managedSite.base_code}
              onChange={(e) => updateSite("base_code", e.target.value)}
              placeholder="Plak hier de volledige huidige PWeb-broncode (HTML, CSS en JavaScript)..." />
            <button className={styles.primary} disabled={!dirtySite || isBusy} onClick={saveSite}>WEBSITE-INSTELLINGEN OPSLAAN</button>
            <h4>Gegenereerde volledige broncode</h4>
            <textarea readOnly spellCheck={false} className={styles.outputCode} value={currentCode}
              aria-label={"Gegenereerde code voor " + SITE_LABEL[site]} onFocus={(e) => e.currentTarget.select()} />
            <div className={styles.footerActions}>
              <button className={styles.primary} disabled={isBusy || dirtySite || dirtyDescription || dirtyPedigree} onClick={copyCode}>
                <span> <span aria-hidden="true">⧉</span> VOLLEDIGE BRONCODE KOPIËREN</span>
              </button>
              <button className={styles.appliedButton}
                disabled={isBusy || dirtySite || dirtyDescription || dirtyPedigree}
                onClick={markApplied}>✓ IK HEB DE BRONCODE ONLINE GEPLAATST</button>
            </div>
            {copiedSignature === currentSignature && <p className={styles.help}>✓ Deze versie is gekopieerd. Vergeet de bevestiging niet na het plakken.</p>}
          </section>}
        </section> : <p>Geen pedigrees gevonden.</p>}
      </div>
    </main>
  );
}
