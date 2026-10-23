"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { HORSE_POSITIONS, type HorseDetails } from "../pedigree/pedigree-data";
import { normalizeHorseName } from "../pedigrees/ancestry";
import {
  SITES, SITE_LABEL, WIDTH_LABELS, DEFAULT_HEIGHTS,
  signoritaDescription, clarissaDescription, ladyDescription, anitaDescription, cristelDescription, defaultDescription, safeDescription, safeHeights,
  generatePWebCode, signature, type Site, type SiteCode,
  type LotData, type HorseProfile, type PedigreeRecord, type LotDescription,
} from "./content";
import styles from "./dashboard.module.css";

const cloud = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

type Tab = "pedigree" | "description" | "videos" | "sites";
type HorseDescriptionEdit = { display_name: string; level: string; video_url: string; birth_year: string };

/** Reuse whole ancestry sections for a recognized horse, independently of the foal's sex. */
function sharedAncestry(
  own: LotDescription, horseList: HorseDetails[], records: LotData[],
  pedigrees: PedigreeRecord[], currentId: string,
): LotDescription {
  const available = new Map<string, { section: LotDescription["sections"][number]; updated: string }>();
  for (const lot of records) {
    if (lot.pedigree_id === currentId) continue;
    const pedigree = pedigrees.find((p) => p.id === lot.pedigree_id && p.owner_id === lot.owner_id);
    if (!pedigree) continue;
    for (const section of safeDescription(lot.description, pedigree.horses).sections) {
      const key = normalizeHorseName(section.horse);
      if (!key || !section.horse.trim()) continue;
      const existing = available.get(key);
      if (!existing || lot.updated_at > existing.updated) {
        available.set(key, { section, updated: lot.updated_at });
      }
    }
  }
  return { sections: own.sections.map((section, index) => {
    // Keep the current foal's sire section independent. The maternal sections
    // follow the pedigree's named horses and can be reused across siblings.
    if (index === 0) return section;
    const horse = section.horse || (index === 1 ? horseList[2]?.name : index === 2 ? horseList[6]?.name : index === 3 ? horseList[14]?.name : "");
    const match = available.get(normalizeHorseName(horse || ""));
    if (!match) return section;
    const hasOwnContent = Boolean(section.note?.trim() || section.notes?.some((n) => n.trim()) || section.items.length);
    return hasOwnContent ? section : { ...match.section, title: section.title, horse: horse || match.section.horse };
  }) };
}

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
  const [descriptionHorseEdits, setDescriptionHorseEdits] = useState<Record<string, HorseDescriptionEdit>>({});
  const [draftSite, setDraftSite] = useState<SiteCode | null>(null);
  const [profileName, setProfileName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [profileLevel, setProfileLevel] = useState("");
  const [profileYear, setProfileYear] = useState("");
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
    setDraftDescription(signoritaDescription(selected.horses, selected.name) || clarissaDescription(selected.horses) || ladyDescription(selected.horses, selected.name) || anitaDescription(selected.horses) || cristelDescription(selected.horses, selected.name) || sharedAncestry(safeDescription(
      lots.find((l) => l.owner_id === selected.owner_id && l.pedigree_id === selected.id)?.description,
      selected.horses,
    ), selected.horses, lots, pedigrees, selected.id));
    setDirtyPedigree(false);
    setDirtyDescription(false);
    setDescriptionHorseEdits({});
    setProfileName("");
    setVideoUrl("");
    setProfileLevel("");
    setProfileYear("");
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
  // All auction lots use the same PWeb shell. A new lot can reuse a saved
  // auction template instead of requiring a manual paste of its old HTML.
  const templateSite = siteCodes.find((entry) => entry.site === site && entry.base_code.trim());
  const managedSite = selected && draftSite
    ? { ...draftSite, base_code: draftSite.base_code.trim() || templateSite?.base_code || "" }
    : null;
  const currentCode = selected && managedSite
    ? generatePWebCode(selected, draftDescription, managedSite, profiles)
    : "";
  const publishedStatus = selected ? statusFor(selected, site) : null;
  const currentSignature = selected && managedSite
    ? signature(selected, selectedLot, selectedSite, profiles) : "";

  function updateHorse(index: number, field: keyof HorseDetails, value: string) {
    setDraftHorses((prev) => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
    setDirtyPedigree(true);
  }
  function updateSectionVisibility(index: number, visible: boolean) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((section, i) =>
      i === index ? { ...section, visible } : section) }));
    setDirtyDescription(true);
  }
  function moveSection(index: number, direction: -1 | 1) {
    setDraftDescription((prev) => {
      const next = [...prev.sections];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { sections: next };
    });
    setDirtyDescription(true);
  }
  function removeSection(index: number) {
    if (!window.confirm("Dit volledige onderdeel met nakomelingen verwijderen? Je kan het ook gewoon verbergen.")) return;
    setDraftDescription((prev) => ({ sections: prev.sections.filter((_, i) => i !== index) }));
    setDirtyDescription(true);
  }
  function updateSection(index: number, field: "title" | "horse" | "note", value: string) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((s, i) =>
      i === index ? { ...s, [field]: value } : s) }));
    setDirtyDescription(true);
  }
  function updateSectionNotes(section: number, multiline: string) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((s, i) =>
      i === section ? { ...s, notes: multiline.split("\n").slice(0, 12).map((line) => line.slice(0, 200)) } : s) }));
    setDirtyDescription(true);
  }
  function updateChild(section: number, item: number, child: number, field: "horse" | "note", value: string) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((s, i) =>
      i === section ? { ...s, items: s.items.map((v, j) => j === item
        ? { ...v, children: (v.children || []).map((c, k) => k === child ? { ...c, [field]: value } : c) }
        : v) } : s) }));
    setDirtyDescription(true);
  }
  function addChild(section: number, item: number) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((s, i) =>
      i === section ? { ...s, items: s.items.map((v, j) =>
        j === item ? { ...v, children: [...(v.children || []), { horse: "", note: "" }] } : v) } : s) }));
    setDirtyDescription(true);
  }
  function removeChild(section: number, item: number, child: number) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((s, i) =>
      i === section ? { ...s, items: s.items.map((v, j) =>
        j === item ? { ...v, children: (v.children || []).filter((_, k) => k !== child) } : v) } : s) }));
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
  function moveItem(section: number, index: number, direction: -1 | 1) {
    setDraftDescription((prev) => ({ sections: prev.sections.map((s, i) => {
      if (i !== section) return s;
      const target = index + direction;
      if (target < 0 || target >= s.items.length) return s;
      const items = [...s.items];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...s, items };
    }) }));
    setDirtyDescription(true);
  }
  function descriptionHorse(name: string): HorseDescriptionEdit {
    const normalized = normalizeHorseName(name);
    const found = profiles.find((p) => p.normalized_name === normalized);
    const fromPedigree = selected?.horses.find((horse) => normalizeHorseName(horse.name) === normalized);
    return descriptionHorseEdits[normalized] || {
      display_name: name,
      level: found?.level || fromPedigree?.level || "",
      birth_year: found?.birth_year || fromPedigree?.year || "",
      video_url: found?.video_url || "",
    };
  }
  function updateDescriptionHorse(name: string, field: "level" | "video_url" | "birth_year", value: string) {
    const normalized = normalizeHorseName(name);
    if (!normalized) return;
    setDescriptionHorseEdits((before) => {
      const current = before[normalized] || descriptionHorse(name);
      return { ...before, [normalized]: { ...current, display_name: name.trim(), [field]: value } };
    });
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

  async function publishPedigree() {
    if (!cloud || !selected || isBusy) return;
    if (dirtyPedigree) { setNotice("Sla eerst je pedigree-wijzigingen op."); return; }
    setIsBusy(true);
    const { error } = await cloud.from("optimus_pedigrees")
      .update({ is_published: true })
      .eq("id", selected.id).eq("owner_id", selected.owner_id);
    if (error) { setNotice("Publiceren mislukt: " + error.message); setIsBusy(false); return; }
    setNotice("✓ Live pedigree gepubliceerd. Deze link blijft automatisch up-to-date.");
    await refresh();
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
    const listedNames = new Set(draftDescription.sections.flatMap((section) =>
      [section.horse, ...section.items.flatMap((item) => [item.horse, ...(item.children || []).map((child) => child.horse)])].map(normalizeHorseName)));
    const profileChanges = Object.entries(descriptionHorseEdits)
      .filter(([key]) => listedNames.has(key))
      .map(([normalized_name, changed]) => ({
        normalized_name,
        display_name: changed.display_name.trim(),
        level: changed.level.trim(),
        birth_year: changed.birth_year.trim(),
        video_url: changed.video_url.trim(),
        updated_at: new Date().toISOString(),
      }));

    if (profileChanges.some((profile) =>
      profile.video_url && !/^https:\/\/(www\.)?(youtu\.be|youtube\.com|youtube-nocookie\.com|m\.youtube\.com)\//i.test(profile.video_url))) {
      setNotice("Controleer de YouTube-links: gebruik https://youtu.be/... of een normale YouTube-link.");
      return;
    }
    setIsBusy(true);
    if (profileChanges.length) {
      const { error: profileError } = await cloud.from("optimus_auction_horse_profiles")
        .upsert(profileChanges, { onConflict: "normalized_name" });
      if (profileError) {
        setNotice("De gedeelde paardgegevens konden niet worden opgeslagen: " + profileError.message);
        setIsBusy(false);
        return;
      }
    }
    const { error } = await cloud.from("optimus_auction_lot_descriptions").upsert({
      owner_id: selected.owner_id, pedigree_id: selected.id,
      description: draftDescription, updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id,pedigree_id" });
    if (error) { setNotice("Beschrijving opslaan mislukt: " + error.message); setIsBusy(false); return; }
    // Propagate changed ancestry sections to all lots sharing that named horse.
    // Do not overwrite each sibling's own sire or foal-specific data.
    const changed = new Map(draftDescription.sections.slice(1)
      .filter((section) => normalizeHorseName(section.horse))
      .map((section) => [normalizeHorseName(section.horse), section]));
    const siblings = lots.filter((lot) => lot.pedigree_id !== selected.id).flatMap((lot) => {
      const pedigree = pedigrees.find((p) => p.id === lot.pedigree_id && p.owner_id === lot.owner_id);
      if (!pedigree) return [];
      const original = safeDescription(lot.description, pedigree.horses);
      let touched = false;
      const sections = original.sections.map((section, index) => {
        if (index === 0) return section;
        const name = section.horse || (index === 1 ? pedigree.horses[2]?.name : index === 2 ? pedigree.horses[6]?.name : index === 3 ? pedigree.horses[14]?.name : "");
        const shared = changed.get(normalizeHorseName(name || ""));
        if (!shared) return section;
        touched = true;
        return { ...shared, title: section.title, horse: name || shared.horse };
      });
      return touched ? [{ owner_id: lot.owner_id, pedigree_id: lot.pedigree_id,
        description: { sections }, updated_at: new Date().toISOString() }] : [];
    });
    if (siblings.length) {
      const { error: siblingError } = await cloud.from("optimus_auction_lot_descriptions")
        .upsert(siblings, { onConflict: "owner_id,pedigree_id" });
      if (siblingError) {
        setNotice("Beschrijving opgeslagen, maar synchronisatie met andere veulens mislukt: " + siblingError.message);
        setIsBusy(false);
        return;
      }
    }
    setNotice("Beschrijving opgeslagen en gedeelde moederlijnen bijgewerkt bij " + siblings.length + " andere veulens.");
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
      level: profileLevel.trim(), birth_year: profileYear.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "normalized_name" });
    if (error) { setNotice("Video opslaan mislukt: " + error.message); setIsBusy(false); return; }
    setNotice("Paardgegevens opgeslagen. De video's en prestaties worden automatisch bijgewerkt in alle live iframes.");
    await refresh();
  }

  async function saveSite() {
    if (!cloud || !selected || !draftSite || isBusy) return;
    setIsBusy(true);
    const { error } = await cloud.from("optimus_auction_site_codes").upsert({
      owner_id: selected.owner_id, pedigree_id: selected.id, site,
      base_code: draftSite.base_code.trim() || managedSite?.base_code || "",
      heights: safeHeights(draftSite.heights),
      crop: Math.max(0, Math.min(20000, Number(draftSite.crop) || 0)),
      updated_at: new Date().toISOString(),
      // Existing applied_signature is intentionally not changed.
    }, { onConflict: "owner_id,pedigree_id,site" });
    if (error) { setNotice("Website-instellingen opslaan mislukt: " + error.message); setIsBusy(false); return; }
    setDirtySite(false);
    setNotice("Hippomundo-/website-instellingen opgeslagen. Kopieer hiervoor opnieuw de vaste PWeb-code.");
    await refresh();
  }

  async function copyCode() {
    if (!currentCode || !selected || !draftSite) return;
    if (!managedSite?.base_code.trim()) { setNotice("Er is nog geen opgeslagen PWeb-sjabloon beschikbaar voor deze website."); return; }
    if (!selected.is_published) { setNotice("Publiceer eerst het live pedigree voor dit lot."); return; }
    if (dirtyPedigree || dirtyDescription || dirtySite) {
      setNotice("Sla eerst alle wijzigingen op voordat je de definitieve broncode kopieert."); return;
    }
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopiedSignature(currentSignature);
      setNotice("Vaste broncode gekopieerd. Plak die in PWeb; wijzigingen aan moederlijn, video's en pedigree volgen nadien automatisch.");
    } catch {
      setNotice("Automatisch kopiëren geblokkeerd. Selecteer de broncode en kopieer handmatig.");
    }
  }

  async function markApplied() {
    if (!cloud || !selected || !publishedStatus || isBusy) return;
    if (!managedSite?.base_code.trim() || !selected.is_published) { setNotice("Publiceer eerst het pedigree en bewaar een bestaande volledige PWeb-broncode."); return; }
    if (dirtyDescription || dirtyPedigree || dirtySite) {
      setNotice("Sla eerst de wijzigingen op."); return;
    }
    if (!window.confirm("Staat de nieuwe broncode daadwerkelijk online op " + SITE_LABEL[site] + "?")) return;
    setIsBusy(true);
    // An unsaved site gets its default entry first.
    if (!publishedStatus.saved) {
      const { error: newError } = await cloud.from("optimus_auction_site_codes").upsert({
        owner_id: selected.owner_id, pedigree_id: selected.id, site,
        base_code: managedSite?.base_code || "",
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
      for (const i of s.items) {
        if (i.horse.trim()) dictionary.set(normalizeHorseName(i.horse), i.horse.trim());
        for (const child of i.children || []) if (child.horse.trim())
          dictionary.set(normalizeHorseName(child.horse), child.horse.trim());
      }
    }
    return [...dictionary.values()].sort();
  }, [selected, draftDescription]);

  function chooseProfile(name: string) {
    const existing = profiles.find((p) => p.normalized_name === normalizeHorseName(name));
    setProfileName(name);
    setVideoUrl(existing?.video_url || "");
    const fromChart = selected?.horses.find((horse) => normalizeHorseName(horse.name) === normalizeHorseName(name));
    setProfileLevel(existing?.level ?? fromChart?.level ?? "");
    setProfileYear(existing?.birth_year ?? fromChart?.year ?? "");
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
            {!selected.is_published && <button className={styles.appliedButton} style={{marginLeft:10}} disabled={isBusy || dirtyPedigree} onClick={publishPedigree}>LIVE PEDIGREE PUBLICEREN</button>}
            {selected.is_published && <p className={styles.help}>✓ Live pedigree gepubliceerd — gedeelde wijzigingen verschijnen zonder opnieuw iframecode te plakken.</p>}
          </section>}

          {tab === "description" && <section>
            <h3>Beschrijving & moederlijn</h3>
            <p className={styles.help}>
              Vul elke moederlijn en haar nakomelingen in. Je kunt extra generaties, prestaties,
              tekstregels en video's toevoegen. Schakel per onderdeel <strong>Tonen op website</strong>
              aan of uit zonder de opgeslagen gegevens te verliezen. Dezelfde paardgegevens
              en video's werken automatisch in alle live iframes.
            </p>
            <datalist id="optimus-description-known-horses">
              {profiles.map((p) => <option key={p.normalized_name} value={p.display_name} />)}
            </datalist>
            {draftDescription.sections.map((section, i) => {
              const isSire = section.title.trim().toUpperCase() === "SIRE";
              const motherInfo = descriptionHorse(section.horse);
              return <div className={section.visible === false ? styles.damBlockHidden : styles.damBlock} key={i}>
                <div className={styles.damTitle}>
                  <span className={styles.damIndex}>{section.title || "DAMLINE"}</span>
                  <span className={styles.damCount}>{section.visible === false
                    ? "VERBORGEN" : isSire ? "Vader" : section.items.length + " nakomelingen"}</span>
                </div>
                <div className={styles.sectionControls}>
                  <label className={styles.visibilitySwitch}>
                    <input type="checkbox" checked={section.visible !== false}
                      onChange={(e) => updateSectionVisibility(i, e.target.checked)} />
                    <span>{section.visible === false ? "Verborgen op website" : "Tonen op website"}</span>
                  </label>
                  <div className={styles.sectionOrdering}>
                    <button type="button" disabled={i === 0} onClick={() => moveSection(i, -1)} title="Blok omhoog">↑</button>
                    <button type="button" disabled={i === draftDescription.sections.length - 1}
                      onClick={() => moveSection(i, 1)} title="Blok omlaag">↓</button>
                    <button type="button" onClick={() => removeSection(i)} title="Blok definitief verwijderen">×</button>
                  </div>
                </div>
                <div className={styles.damHorseFields}>
                  <label>Onderdeel
                    <input value={section.title} maxLength={60} onChange={(e) => updateSection(i, "title", e.target.value)} />
                  </label>
                  <label>{isSire ? "Naam vader" : "Naam moeder"}
                    <input value={section.horse} list="optimus-description-known-horses" maxLength={120}
                      onChange={(e) => updateSection(i, "horse", e.target.value)} placeholder="Naam paard" />
                  </label>
                  <label>Springniveau
                    <input value={motherInfo.level} maxLength={30} disabled={!section.horse.trim()}
                      onChange={(e) => updateDescriptionHorse(section.horse, "level", e.target.value)} placeholder="bv. 160" />
                  </label>
                  <label>YouTube-video (optioneel)
                    <input value={motherInfo.video_url} disabled={!section.horse.trim()}
                      onChange={(e) => updateDescriptionHorse(section.horse, "video_url", e.target.value)} placeholder="https://youtu.be/..." />
                  </label>
                </div>
                <div className={styles.descriptionExtras}>
                  <label>Extra informatie naast de naam (optioneel)
                    <input value={section.note || ""} maxLength={200}
                      onChange={(e) => updateSection(i, "note", e.target.value)}
                      placeholder={isSire ? "bv. (Ermitage Kalone)" : "bv. WINNER NC CSIO5* La Baule"} />
                  </label>
                  <label>Extra zinnen onder {isSire ? "SIRE" : "de moeder"} (één per regel)
                    <textarea rows={isSire ? 3 : 2} value={(section.notes || []).join("\n")}
                      onChange={(e) => updateSectionNotes(i, e.target.value)}
                      placeholder="bv. sister, dam, 2nd dam, ... all jumped 160" />
                  </label>
                </div>
                {!isSire && <>
                  <div className={styles.offspringHeading}>
                    <div><strong>Nakomelingen van {section.horse.trim() || "deze moeder"}</strong>
                      <small>Per paard: naam, niveau, prestaties en optioneel video</small></div>
                    <button className={styles.addOffspring} type="button" onClick={() => addItem(i)}>+ NAKOMELING TOEVOEGEN</button>
                  </div>
                  {section.items.length === 0 && <div className={styles.emptyOffspring}>
                    Nog geen nakomelingen toegevoegd. Gebruik de knop hierboven om de eerste toe te voegen.
                  </div>}
                  {section.items.map((item, j) => {
                    const details = descriptionHorse(item.horse);
                    return <div className={styles.offspringRow} key={j}>
                      <div className={styles.offspringTop}>
                        <span className={styles.offspringNumber}>{String(j + 1).padStart(2, "0")}</span>
                        <span className={styles.offspringNamePreview}>{item.horse || "Nieuwe nakomeling"}</span>
                        <div className={styles.offspringTools}>
                          <button type="button" disabled={j === 0} aria-label="Nakomeling omhoog" onClick={() => moveItem(i, j, -1)}>↑</button>
                          <button type="button" disabled={j === section.items.length - 1} aria-label="Nakomeling omlaag" onClick={() => moveItem(i, j, 1)}>↓</button>
                          <button type="button" aria-label="Nakomeling verwijderen" onClick={() => removeItem(i, j)}>×</button>
                        </div>
                      </div>
                      <div className={styles.offspringFields}>
                        <label>Naam paard
                          <input value={item.horse} list="optimus-description-known-horses" maxLength={120}
                            onChange={(e) => updateItem(i, j, "horse", e.target.value)}
                            placeholder="bv. Like a Diamond vh Schaeck" />
                        </label>
                        <label>Niveau
                          <input value={details.level} maxLength={30} disabled={!item.horse.trim()}
                            onChange={(e) => updateDescriptionHorse(item.horse, "level", e.target.value)}
                            placeholder="bv. 165" />
                        </label>
                        <label>Prestaties / extra info
                          <input value={item.note} maxLength={200}
                            onChange={(e) => updateItem(i, j, "note", e.target.value)}
                            placeholder="bv. CSI5* GP WINNER / BWP approved" />
                        </label>
                        <label>Video (YouTube)
                          <input value={details.video_url} disabled={!item.horse.trim()}
                            onChange={(e) => updateDescriptionHorse(item.horse, "video_url", e.target.value)}
                            placeholder="https://youtu.be/..." />
                        </label>
                      </div>
                      <div className={styles.nestedChildren}>
                        {(item.children || []).map((child, k) => {
                          const nested = descriptionHorse(child.horse);
                          return <div key={k} className={styles.nestedChildRow}>
                            <span className={styles.childIndicator}>↳</span>
                            <label>Naam<input value={child.horse} list="optimus-description-known-horses" maxLength={120}
                              onChange={(e) => updateChild(i, j, k, "horse", e.target.value)} placeholder="Nakomeling van dit paard" /></label>
                            <label>Niveau<input value={nested.level} maxLength={30} disabled={!child.horse.trim()}
                              onChange={(e) => updateDescriptionHorse(child.horse, "level", e.target.value)} placeholder="160" /></label>
                            <label>Info<input value={child.note} maxLength={200}
                              onChange={(e) => updateChild(i, j, k, "note", e.target.value)} placeholder="Prestaties" /></label>
                            <label>YouTube<input value={nested.video_url} disabled={!child.horse.trim()}
                              onChange={(e) => updateDescriptionHorse(child.horse, "video_url", e.target.value)} placeholder="https://youtu.be/..." /></label>
                            <button type="button" aria-label="Onderliggende nakomeling verwijderen"
                              onClick={() => removeChild(i, j, k)}>×</button>
                          </div>;
                        })}
                        <button type="button" className={styles.childAdd} onClick={() => addChild(i,j)}>
                          + NAKOMELING VAN {item.horse.trim() || "DIT PAARD"} TOEVOEGEN
                        </button>
                      </div>
                    </div>;
                  })}
                </>}
              </div>;
            })}
            <button className={styles.linkButton} type="button" onClick={() => {
              setDraftDescription((prev) => ({ sections: [...prev.sections, { title: "5TH DAM", horse: "", visible: true, items: [] }] }));
              setDirtyDescription(true);
            }}>+ EXTRA MOEDERLIJN TOEVOEGEN</button>

            <div className={styles.descriptionPreview}>
              <h4>Voorbeeld van de beschrijving</h4>
              {draftDescription.sections.filter((section) => section.visible !== false).map((section, i) => <div key={i}>
                <strong>{section.title}: {section.horse}
                  {descriptionHorse(section.horse).level ? " " + descriptionHorse(section.horse).level : ""}</strong>
                {section.note && <span> {section.note}</span>}
                {(section.notes || []).filter(Boolean).map((line, j) => <p key={j} className={styles.previewLine}>→ {line}</p>)}
                {!!section.items.length && <ul>{section.items.filter((v) => v.horse.trim()).map((item, j) =>
                  <li key={j}><strong>{item.horse}{descriptionHorse(item.horse).level
                    ? " " + descriptionHorse(item.horse).level : ""}</strong>
                    {item.note.trim() && <span> {item.note}</span>}
                    {(item.children || []).some((child) => child.horse.trim()) && <ul>
                      {(item.children || []).filter((child) => child.horse.trim()).map((child, k) =>
                        <li key={k}><strong>{child.horse}{descriptionHorse(child.horse).level
                          ? " " + descriptionHorse(child.horse).level : ""}</strong> {child.note}</li>)}
                    </ul>}
                  </li>)}</ul>}
              </div>)}
            </div>
            <div className={styles.footerActions}>
              <button className={styles.primary} type="button" disabled={isBusy || !dirtyDescription}
                onClick={saveDescription}>VOLLEDIGE BESCHRIJVING OPSLAAN</button>
              {dirtyDescription && <span className={styles.unsavedWarning}>● Nog niet opgeslagen</span>}
            </div>
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
                const fromChart = selected?.horses.find((horse) => normalizeHorseName(horse.name) === normalizeHorseName(name));
                setProfileLevel(found?.level ?? fromChart?.level ?? "");
                setProfileYear(found?.birth_year ?? fromChart?.year ?? "");
              }} placeholder="Like a Diamond vh Schaeck" /></label>
              <label>YouTube-video URL<input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtu.be/..." /></label>
              <div className={styles.formGrid}>
                <label>Springniveau<input value={profileLevel} maxLength={30} onChange={(e) => setProfileLevel(e.target.value)} placeholder="bv. 165 of level 1.60m" /></label>
                <label>Geboortejaar<input value={profileYear} maxLength={8} onChange={(e) => setProfileYear(e.target.value)} placeholder="bv. 2020" /></label>
              </div>
              <button className={styles.primary} onClick={saveVideo} disabled={isBusy || !profileName.trim()}>PAARDGEGEVENS OPSLAAN / BIJWERKEN</button>
            </div>
          </section>}

          {tab === "sites" && managedSite && <section>
            <h3>Vaste PWeb-code & Hippomundo</h3>
            <p className={styles.help}>Installeer deze vaste broncode per veulen één keer op PWeb. Beschrijving, video's en pedigree verschijnen daarna automatisch via de live iframe. Alleen gewijzigde website-instellingen of Hippomundo-afmetingen vereisen nieuwe code.</p>
            <div className={styles.siteTabs}>
              {SITES.map((s) => <button key={s} className={s === site ? styles.tabActive : ""}
                onClick={() => { if (dirtySite && !window.confirm("Niet-opgeslagen site-instellingen weggooien?")) return; setSite(s); }}>
                {SITE_LABEL[s]}</button>)}
            </div>
            <div className={publishedStatus?.needsUpdate ? styles.statusPending : styles.statusDone}>
              {publishedStatus?.needsUpdate ? "● EENMALIGE PWEB-CODE INSTALLEREN / BIJWERKEN" : "✓ CODE GEPLAATST — LIVE INHOUD WORDT AUTOMATISCH BIJGEWERKT"}
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
            {selected.is_published && <p className={styles.help}>
              <strong>Live voorbeeld:</strong>{" "}
              <a href={"https://optimusauction.vercel.app/lot/live/" + selected.public_token + "?site=" + site}
                target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                Bekijk actuele beschrijving, video's en pedigree
              </a>
            </p>}
            <h4>Oorspronkelijke PWeb-basiscode</h4>
            <p className={styles.help}>De generator gebruikt automatisch het bestaande PWeb-sjabloon van een ander lot als dit lot nog geen eigen basiscode heeft.</p>
            {!managedSite.base_code.trim() && <p className={styles.help}><strong>Er is nog geen PWeb-sjabloon beschikbaar voor deze website.</strong></p>}
            {!selected.is_published && <p className={styles.help}><strong>Let op:</strong> publiceer ook eerst dit live pedigree op het tabblad Pedigree.</p>}
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12, marginBottom: 12 }}>
                Geavanceerd: oorspronkelijke broncode bekijken of aanpassen
              </summary>
              <textarea className={styles.baseCode} spellCheck={false} value={managedSite.base_code}
                onChange={(e) => updateSite("base_code", e.target.value)}
                placeholder="Volledige PWeb-broncode..." />
            </details>
            <button className={styles.primary} disabled={!dirtySite || isBusy} onClick={saveSite}>HIPPOMUNDO-/WEBSITE-INSTELLINGEN OPSLAAN</button>
            <h4>Vaste PWeb-code — eenmalig kopiëren</h4>
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12, marginBottom: 12 }}>
                Technische code bekijken (normaal niet nodig)
              </summary>
              <textarea readOnly spellCheck={false} className={styles.outputCode} value={currentCode}
                aria-label={"Gegenereerde code voor " + SITE_LABEL[site]} onFocus={(e) => e.currentTarget.select()} />
            </details>
            <div className={styles.footerActions}>
              <button className={styles.primary} disabled={isBusy || dirtySite || dirtyDescription || dirtyPedigree || !managedSite.base_code.trim() || !selected.is_published} onClick={copyCode}>
                <span> <span aria-hidden="true">⧉</span> EENMALIGE PWEB-CODE KOPIËREN</span>
              </button>
              <button className={styles.appliedButton}
                disabled={isBusy || dirtySite || dirtyDescription || dirtyPedigree || !managedSite.base_code.trim() || !selected.is_published}
                onClick={markApplied}>✓ VASTE CODE STAAT ONLINE</button>
            </div>
            {copiedSignature === currentSignature && <p className={styles.help}>✓ Deze versie is gekopieerd. Vergeet de bevestiging niet na het plakken.</p>}
          </section>}
        </section> : <p>Geen pedigrees gevonden.</p>}
      </div>
    </main>
  );
}
