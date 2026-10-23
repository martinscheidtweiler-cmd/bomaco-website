import type { HorseDetails } from "../pedigree/pedigree-data";
import { normalizeHorseName } from "../pedigrees/ancestry";

export const SITES = ["be", "auction"] as const;
export type Site = (typeof SITES)[number];
export const SITE_LABEL: Record<Site, string> = {
  be: "www.stal-optimus.be",
  auction: "stal-optimus.auction",
};

export type LineItem = { horse: string; note: string; children?: LineItem[] };
export type LineSection = { title: string; horse: string; visible?: boolean; note?: string; notes?: string[]; items: LineItem[] };
export type LotDescription = { sections: LineSection[] };
export type HorseProfile = {
  normalized_name: string;
  display_name: string;
  video_url: string;
  level: string;
  birth_year: string;
  updated_at: string;
};
export type SiteCode = {
  owner_id: string;
  pedigree_id: string;
  site: Site;
  base_code: string;
  heights: number[];
  crop: number;
  updated_at: string;
  applied_signature: string | null;
  applied_at: string | null;
};
export type LotData = {
  owner_id: string; pedigree_id: string; description: LotDescription; updated_at: string;
};
export type PedigreeRecord = {
  id: string; owner_id: string; name: string; horses: HorseDetails[];
  public_token: string; is_published: boolean; updated_at: string;
};
export const WIDTH_LABELS = [
  "Desktop ≥ 992px", "Tablet 768–991px", "600–767px",
  "480–599px", "431–479px", "360–430px", "≤ 359px",
];
export const DEFAULT_HEIGHTS = [2600, 3500, 4800, 5400, 5900, 6300, 6800];

export function defaultDescription(horses: HorseDetails[]): LotDescription {
  return { sections: [
    { title: "SIRE", horse: horses[1]?.name || "", items: [] },
    { title: "DAM", horse: horses[2]?.name || "", items: [] },
    { title: "2ND DAM", horse: horses[6]?.name || "", items: [] },
    { title: "3RD DAM", horse: horses[14]?.name || "", items: [] },
    { title: "4TH DAM", horse: "", items: [] },
  ] };
}
// Shared Cristel maternal family. The sire is always read from the selected pedigree.
// Pregnancy details apply only to Philippa Optima, not to every descendant.
export function cristelDescription(horses: HorseDetails[], lotName = ""): LotDescription | null {
  const dam = normalizeHorseName(horses[2]?.name || "");
  if (!dam.startsWith("cristel")) return null;
  const philippa = normalizeHorseName(lotName).includes("philippa");
  const sections: LineSection[] = [
    { title: "SIRE", horse: horses[1]?.name || "", items: [] },
    { title: "DAM", horse: "Cristel 160", note: "WINNER NC CSI05* La Baule",
      items: [{ horse: "Spartacus Optimus 145", note: "" }] },
    { title: "2nd DAM", horse: "", items: [
      { horse: "Cristel 160", note: "WINNER NC CSI05* La Baule" },
      { horse: "Diacento 160", note: "" }, { horse: "Battle Cry 155", note: "" },
      { horse: "Caesar Optimus 150", note: "" }, { horse: "Klara Optima 145", note: "" },
    ] },
    { title: "3rd DAM", horse: "", items: [{ horse: "C-Trenton z 160", note: "" }] },
    { title: "", horse: "", notes: [
      "sister, dam, 2nd dam, ... all jumped 160",
      "brother of 5* GP WINNER 'Like a Diamond'",
    ], items: [] },
  ];
  if (philippa) {
    sections.unshift({ title: "PREGNANT BROODMARE FOR SALE", horse: "", items: [] });
    sections.splice(sections.length - 1, 0, {
      title: "In foal of Excelsior Optimus (Ermitage Kalone)", horse: "", items: [],
    });
  }
  return { sections };
}

// Shared Anita maternal family, independent of the offspring's sire.
// Embryo/implantation status is lot-specific and must not be copied to all descendants.
export function anitaDescription(horses: HorseDetails[]): LotDescription | null {
  const dam = normalizeHorseName(horses[2]?.name || "");
  if (!dam.startsWith("anita")) return null;
  return { sections: [
    { title: "SIRE", horse: horses[1]?.name || "", items: [] },
    { title: "DAM", horse: "Anita 150", items: [
      { horse: "Panamarenko Optimus 160", note: "" },
      { horse: "Rosanna Optima 145", note: "" },
      { horse: "Nixon du Park", note: "Approved KWPN" },
    ] },
    { title: "2nd DAM", horse: "", items: [
      { horse: "Beau Gosse du Park 160", note: "" },
      { horse: "Exploi du Park 150", note: "" },
      { horse: "Anita du Park du Park 150", note: "" },
      { horse: "Hope du Park 145", note: "" },
    ] },
    { title: "3rd DAM", horse: "", items: [
      { horse: "Diabolo du Park 160", note: "CSI5* GP WINNER" },
      { horse: "Rosanna du Park 160", note: "" },
      { horse: "Tisele du Park du Park 160", note: "" },
    ] },
  ] };
}

// Shared Lady Optima maternal family. Sire is always specific to each offspring.
// Pregnancy status and covering stallion are shown only for the photographed
// Chacoon Blue broodmare, not automatically on every Lady descendant.
export function ladyDescription(horses: HorseDetails[], lotName = ""): LotDescription | null {
  const dam = normalizeHorseName(horses[2]?.name || "");
  if (!dam.startsWith("lady optima")) return null;
  // The image does not identify which specific lot is pregnant. Do not infer it from the sire.
  const isBroodmare = false;
  const sections: LineSection[] = [
    { title: "SIRE", horse: horses[1]?.name || "", items: [] },
    { title: "DAM", horse: "Lady Optima 150", items: [] },
    { title: "2nd DAM", horse: "", items: [
      { horse: "Lady Optima 150", note: "" },
      { horse: "Lord Optimus 145", note: "" },
    ] },
    { title: "Damline Baloubet du Rouet", horse: "", items: [] },
  ];
  if (isBroodmare) {
    sections.unshift({ title: "PREGNANT BROODMARE FOR SALE", horse: "", items: [] });
    sections.push({ title: "In foal of Excelsior Optimus (Ermitage Kalone)", horse: "",
      notes: ["sister, dam, 2nd dam, ... all jumped 160",
        "brother of 5* GP WINNER 'Like a Diamond'"], items: [] });
  }
  return { sections };
}

// Shared Clarissa maternal line; sire and sire-specific remarks are per lot.
export function clarissaDescription(horses: HorseDetails[]): LotDescription | null {
  const dam = normalizeHorseName(horses[2]?.name || "");
  if (!dam.startsWith("clarissa")) return null;
  const sire = horses[1]?.name || "";
  const excelsior = normalizeHorseName(sire).includes("excelsior optimus");
  return { sections: [
    { title: "SIRE", horse: sire, notes: excelsior ? [
      "sister, dam, 2nd dam, ... all jumped 160",
      "brother of 5* GP WINNER 'Like a Diamond'",
    ] : [], items: [] },
    { title: "DAM", horse: horses[2]?.name || "Clarissa", note: "4yo", items: [] },
    { title: "2nd DAM", horse: "Exquise du Pachis 160", items: [] },
    { title: "3rd DAM", horse: "", items: [
      { horse: "Exquise du Pachis 160", note: "" },
      { horse: "Angie du Pachis 150", note: "" },
      { horse: "Arena du Pachis 150", note: "" },
      { horse: "Coeurgano 150", note: "" },
      { horse: "Albatros du Pachis 145", note: "" },
    ] },
    { title: "4th DAM", horse: "Intradella 160", items: [] },
    { title: "5th DAM", horse: "Femke P", items: [
      { horse: "Fritzy 160", note: "" },
      { horse: "Kwikstaart 160", note: "" },
      { horse: "Moujik de Souhan 160", note: "" },
      { horse: "Intradella 160", note: "" },
      { horse: "Linotte de Sohan 150", note: "", children: [
        { horse: "Virtuose d'hyrencourt 160", note: "" },
        { horse: "Chic Chin d'Hyrencourt", note: "" },
        { horse: "Havens Chicago 160", note: "" },
      ] },
      { horse: "...", note: "", children: [{ horse: "Otto de Kalvarie 160", note: "" }] },
    ] },
  ] };
}

export function safeDescription(value: unknown, horses: HorseDetails[]): LotDescription {
  if (!value || typeof value !== "object") return defaultDescription(horses);
  const sections = (value as LotDescription).sections;
  if (!Array.isArray(sections)) return defaultDescription(horses);
  return { sections: sections.slice(0, 12).map((section) => ({
    title: String(section.title || "").slice(0, 60),
    horse: String(section.horse || "").slice(0, 120),
    visible: section.visible !== false,
    note: String(section.note || "").slice(0, 200),
    notes: Array.isArray(section.notes) ? section.notes.slice(0, 12).map((line) => String(line).slice(0, 200)) : [],
    items: Array.isArray(section.items)
      ? section.items.slice(0, 50).map((item) => ({
          horse: String(item.horse || "").slice(0, 120),
          note: String(item.note || "").slice(0, 200),
          children: Array.isArray(item.children) ? item.children.slice(0, 30).map((child) => ({
            horse: String(child.horse || "").slice(0, 120),
            note: String(child.note || "").slice(0, 200),
          })) : [],
        })) : [],
  })) };
}
export function safeHeights(value: unknown): number[] {
  if (!Array.isArray(value) || value.length !== 7) return [...DEFAULT_HEIGHTS];
  return value.map((v, i) => Number.isFinite(Number(v)) && Number(v) >= 200 && Number(v) <= 20000
    ? Math.round(Number(v)) : DEFAULT_HEIGHTS[i]);
}
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
function youtubeId(url: string): string | null {
  if (!url.trim()) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const id = host === "youtu.be" ? parsed.pathname.slice(1).split("/")[0]
      : host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com"
        ? (parsed.searchParams.get("v") || parsed.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/)?.[1] || "")
        : "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
function horseMark(name: string, profiles: HorseProfile[]) {
  const video = profiles.find((profile) => profile.normalized_name === normalizeHorseName(name));
  const id = youtubeId(video?.video_url || "");
  const rawLevel = (video?.level || "").trim();
  const metricMatch = rawLevel.match(/(?:^|\s)1[.,](\d{2})\s*m?$/i);
  const wholeCm = rawLevel.match(/(?:^|\s)(1[2-7]\d)\s*(?:cm)?$/i);
  const jumpLevel = metricMatch ? "1" + metricMatch[1] : wholeCm ? wholeCm[1] : "";
  const birthYear = (video?.birth_year || "").trim();
  const nameHasLevel = jumpLevel && new RegExp("(?:\\s|\\()"+jumpLevel+"\\)?$","i").test(name.trim());
  const detail = jumpLevel && !nameHasLevel ? " " + jumpLevel
    : !jumpLevel && /^20(1[8-9]|2[0-9])$/.test(birthYear) ? " °" + birthYear : "";
  const visibleName = escapeHtml(name) + escapeHtml(detail);
  return id
    ? '<strong><button type="button" class="optimus-managed-video optimus-horse-video-name" data-youtube="' + id +
      '" aria-label="Bekijk video van ' + escapeHtml(name) + '">' +
      '<span class="optimus-horse-video-label">' + visibleName + '</span>' +
      ' <span class="camas-youtube-icon" aria-hidden="true">&#9654;</span></button></strong>'
    : '<strong>' + visibleName + '</strong>';
}
function descriptionHtml(description: LotDescription, profiles: HorseProfile[]): string {
  function itemHtml(item: LineItem, allowChildren: boolean): string {
    if (!item.horse.trim()) return "";
    const children = allowChildren && (item.children || []).some((child) => child.horse.trim())
      ? '<ul class="optimus-horse-sublist">' + (item.children || []).map((child) => itemHtml(child, false)).join("") + "</ul>"
      : "";
    return "<li>" + (item.horse.trim() === "…" || item.horse.trim() === "..."
      ? "<span>…</span>" : horseMark(item.horse, profiles)) +
      (item.note.trim() ? ' <span class="optimus-horse-note">' + escapeHtml(item.note) + "</span>" : "") +
      children + "</li>";
  }
  return description.sections.map((section) => {
    const heading = escapeHtml(section.title) + ": " +
      (section.horse.trim() ? horseMark(section.horse, profiles) : "") +
      (section.note?.trim() ? ' <span class="optimus-horse-note">' + escapeHtml(section.note) + "</span>" : "");
    const lines = section.items.map((item) => itemHtml(item, true)).join("");
    const notes = (section.notes || []).filter(Boolean).map((note) =>
      '<p class="optimus-extended-note">→ ' + escapeHtml(note) + "</p>").join("");
    return '<div class="optimus-description-section">' +
      '<p class="optimus-description-heading">' + heading + "</p>" +
      notes +
      (lines ? '<ul class="optimus-horse-list">' + lines + "</ul>" : "") +
      "</div>";
  }).join("");
}
function numberOr(value: unknown, fallback: number) {
  const x = Number(value);
  return Number.isFinite(x) ? Math.max(0, Math.min(20000, Math.round(x))) : fallback;
}
export function relevantProfiles(
  horses: HorseDetails[], description: LotDescription, profiles: HorseProfile[],
): HorseProfile[] {
  const names = new Set([
    ...horses.map((h) => normalizeHorseName(h.name)),
    ...description.sections.flatMap((s) => [normalizeHorseName(s.horse), ...s.items.flatMap((i) => [normalizeHorseName(i.horse), ...(i.children || []).map((child) => normalizeHorseName(child.horse))])]),
  ]);
  return profiles.filter((p) => names.has(p.normalized_name));
}
/** Only fixed PWeb settings require re-installation. Description, pedigree and
 * horse videos are fetched live by the embedded lot page. */
export function signature(
  pedigree: PedigreeRecord, _lot: LotData | undefined,
  site: SiteCode | undefined, _profiles: HorseProfile[],
): string {
  const body = JSON.stringify([
    "live-lot-iframe-v3-approved-auction-v13", pedigree.public_token, pedigree.is_published,
    site?.site || "", site?.updated_at || "", site?.base_code || "",
    site?.heights || "", site?.crop ?? "",
  ]);
  let hash = 2166136261;
  for (let i = 0; i < body.length; i++) {
    hash ^= body.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return "v3-" + (hash >>> 0).toString(16);
}

/** One-time PWeb installation. Future lot content and videos load from
 * /lot/live/[token] and never get baked into this PWeb source. */
export function generatePWebCode(
  pedigree: PedigreeRecord, _description: LotDescription,
  site: SiteCode, _profiles: HorseProfile[],
): string {
  const token = encodeURIComponent(pedigree.public_token || "");
  const iframeUrl = "https://optimusauction.vercel.app/lot/live/" + token +
    "?site=" + encodeURIComponent(site.site);
  const heights = safeHeights(site.heights);
  const crop = numberOr(site.crop, 265);
  const css = [
    "#IframeWrapper{--hippomundo-height:" + heights[0] + "px!important;--hippomundo-crop:" + crop + "px!important}",
    ...[
      "(min-width:768px) and (max-width:991px)", "(min-width:600px) and (max-width:767px)",
      "(min-width:480px) and (max-width:599px)", "(min-width:431px) and (max-width:479px)",
      "(min-width:360px) and (max-width:430px)", "(max-width:359px)",
    ].map((q,i) => "@media " + q + "{#IframeWrapper{--hippomundo-height:" + heights[i+1] + "px!important}}"),
    ".optimus-live-embed,.optimus-live-wide{display:block!important;width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;box-sizing:border-box!important;background:#fff!important;border:0!important;box-shadow:none!important}",
    ".optimus-live-embed iframe{display:block!important;width:100%!important;max-width:100%!important;height:900px;border:0!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}",
    ".optimus-live-wide{clear:both!important;padding:0!important;margin-left:0!important;margin-right:0!important}",
    ".optimus-live-wide::after{content:'';display:table;clear:both}",
    ".paard-foto .row.bg-light-gray.mr-0.ml-0.mb-15.padding-15px-all,.paard-foto .padding-20px-all.width-100.pull-left.bg-light-gray.mb-15{display:none!important}",
    ...(site.site === "auction" ? [
      "[id=\"IframeWrapper\"].optimus-hippomundo-duplicate{display:none!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}",
      "[id=\"IframeWrapper\"].optimus-hippomundo-primary{display:block!important}",
      ".paard-foto .padding-20px-top.padding-20px-bottom.width-100.pull-left.bg-light-gray.mb-15,.paard-foto .padding-20px-top.padding-20px-bottom.width-100.pull-left.bg-light-gray.mb-15 > div,.paard-foto .row > .col-md-12.no-padding-lr.sm-padding-15px-lr:has(> .padding-20px-top.padding-20px-bottom.width-100.pull-left.bg-light-gray.mb-15){background:#fff!important;background-color:#fff!important;box-shadow:none!important;border-color:transparent!important}",
    ] : []),
    ...(site.site === "auction" ? [
      // PWeb native ancestry table and Hippomundo are separate from our live lot.
      // Hide only on mobile, including the parent rows to avoid blank spacing.
      "@media(max-width:767px){.row.ml-0.mr-0.padding-15px-all:has(> .col-md-12.pl-0 > table.table.allcaps),.row.ml-0.mr-0.padding-15px-all:has(table.table.allcaps){display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important}#IframeWrapper{display:block!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important}}",
    ] : []),

    ...(site.site === "be" ? [
      ".row.bg-light-gray.mr-0.ml-0.mb-15.padding-15px-all:has(> .admin-tekst:empty){display:none!important}",
      ".paard-foto #videos,.paard-foto #videos>div,#videos,.optimus-be-videos-section{background:#111!important;background-color:#111!important;color:#fff!important;border-radius:0!important}",
      "#videos h1,#videos h2,#videos h3,#videos h4,#videos p,#videos span,#videos a,#videos button,.optimus-be-videos-section h1,.optimus-be-videos-section h2,.optimus-be-videos-section a{color:#fff!important}",
      "#videos a,#videos button,.optimus-be-videos-section a,.optimus-be-videos-section button{background:#111!important;border-color:#fff!important;border-radius:0!important}",
    ] : []),

    "#optimus-live-video-overlay{display:none!important;position:fixed!important;inset:0!important;z-index:2147483647!important;align-items:center!important;justify-content:center!important;background:rgba(0,0,0,.93)!important;padding:16px!important;box-sizing:border-box!important}",
    "#optimus-live-video-overlay.open{display:flex!important}",
    "#optimus-live-video-overlay .optimus-video-frame{width:min(96vw,800px)!important;aspect-ratio:16/9!important;position:relative!important}",
    "#optimus-live-video-overlay iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important}",
    "#optimus-live-video-overlay button{position:fixed!important;right:20px!important;top:20px!important;border:0!important;border-radius:50%!important;background:#fff!important;color:#111!important;width:42px!important;height:42px!important;font-size:26px!important;cursor:pointer!important}",
    "@media(max-width:767px){#optimus-live-video-overlay{padding:0!important}#optimus-live-video-overlay .optimus-video-frame{width:100vw!important}#optimus-live-video-overlay button{top:calc(15px + env(safe-area-inset-top))!important;right:15px!important}}",
    ...(site.site === "be" ? [
      ".optimus-be-videos-section{background:#111!important;background-color:#111!important;color:#fff!important}",
      ".optimus-be-videos-section h1,.optimus-be-videos-section h2,.optimus-be-videos-section h3,.optimus-be-videos-section h4,.optimus-be-videos-section h5,.optimus-be-videos-section h6,.optimus-be-videos-section p,.optimus-be-videos-section strong,.optimus-be-videos-section span,.optimus-be-videos-section label{color:#fff!important}",
      ".optimus-be-videos-section a,.optimus-be-videos-section button{color:#fff!important;background:#111!important;border:1px solid #eee!important;border-radius:0!important}",
      ".optimus-be-videos-section a *,.optimus-be-videos-section button *{color:#fff!important}",
      ".optimus-be-videos-section a:hover,.optimus-be-videos-section button:hover{background:#262626!important}",
    ] : []),
  ].join("\n");
  const embed = '<div class="optimus-live-embed">' +
    '<iframe class="optimus-live-lot-iframe" src="' + iframeUrl +
    '" title="' + escapeHtml(pedigree.name) + ' - Live description and pedigree"' +
    ' width="100%" height="900" scrolling="no" loading="eager"' +
    ' style="display:block;width:100%;height:900px;border:0;overflow:hidden"></iframe></div>';
  const marker = "<!-- OPTIMUS DASHBOARD MANAGED CONTENT START -->";
  const base = (site.base_code || "").split(marker)[0];
  const descriptionStart = base.indexOf('<div class="optimus-description">');
  const firstStyle = descriptionStart >= 0 ? base.indexOf("<style>", descriptionStart) : -1;
  // Preserve the site's original styling, top video and Hippomundo rules.
  // The old static description and duplicate pedigree must not remain.
  let fixed = descriptionStart >= 0 && firstStyle > descriptionStart
    ? base.slice(0, descriptionStart) + embed + "\n\n" + base.slice(firstStyle)
    : embed + "\n" + base;
  fixed = fixed.replace(/<div\s+class=["']optimus-pedigree-container["'][^>]*>\s*<iframe\b[\s\S]*?<\/iframe>\s*<\/div>/gi, "");
  fixed = fixed.replace(/<a\b[^>]*class=["']optimus-hippomundo-jump["'][\s\S]*?<\/a>/gi, "");
  // Old page-mutating scripts caused PWeb to hang; keep only one bounded,
  // delegated message listener. Do not move PWeb's gallery or bidding widgets.
  fixed = fixed.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const runtime = `(function(){
"use strict";
if(window.optimusLiveLotInstalledV14)return;
window.optimusLiveLotInstalledV14=true;
var root=document.querySelector(".optimus-live-embed");
var iframe=root&&root.querySelector("iframe.optimus-live-lot-iframe");
if(!root||!iframe)return;
function widen(){
 if(root.closest(".optimus-live-wide"))return;
 var n=root;
 while(n&&n!==document.body){
  if(n.classList&&n.classList.contains("row")){
   var cols=Array.from(n.children).filter(function(x){return x.matches('[class*="col-md-"],[class*="col-lg-"]');});
   var gallery=cols.find(function(x){return x.contains(root)&&x.matches(".col-lg-8,.col-md-8");});
   var auction=cols.find(function(x){return x!==gallery&&x.matches(".col-lg-4,.col-md-4");});
   if(gallery&&auction&&n.parentElement){
    // The PWeb HTML block originally lives inside a light-grey wrapper.
    // When its live iframe moves below the photo/bid columns, that empty
    // wrapper remains as the thin grey strip visible on desktop.
    var oldSlot=root.parentElement;
    var wide=document.createElement("div");
    wide.className="optimus-live-wide";
    n.insertAdjacentElement("afterend",wide);
    wide.appendChild(root);
    // Hippomundo placement is handled after the live section is moved.

    function emptyAndSafe(el){
     if(!el||el===gallery||el===document.body)return false;
     if(el.querySelector("img,iframe,video,canvas,svg,input,textarea,form"))return false;
     if((el.innerText||"").trim())return false;
     return !Array.from(el.querySelectorAll("a,button,[role=button]")).some(function(control){
      var s=window.getComputedStyle(control),r=control.getBoundingClientRect();
      return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0;
     });
    }
    // Only collapse genuinely empty wrappers on the former HTML slot path.
    // Never modify the picture gallery, auction column or download buttons.
    var placeholder=oldSlot;
    while(placeholder&&placeholder!==gallery&&gallery.contains(placeholder)){
     var next=placeholder.parentElement;
     if(emptyAndSafe(placeholder)){
      var r=placeholder.getBoundingClientRect();
      if(r.height>0&&r.height<180&&r.width>300){
       placeholder.style.setProperty("display","none","important");
      }
     }
     placeholder=next;
    }

    function alignWithContainer(){
     // No inherited left-padding or accumulated offsets.
     // The live iframe aligns with the visible content box on both viewports.
     wide.style.setProperty("padding","0px","important");
     wide.style.setProperty("margin-left","0px","important");
     wide.style.setProperty("margin-right","0px","important");
     root.style.setProperty("padding","0px","important");
     root.style.setProperty("margin-left","0px","important");
     root.style.setProperty("width","100%","important");
     var panel=videosPanel();
     var photo=Array.from(gallery.querySelectorAll("img")).find(function(img){
      var b=img.getBoundingClientRect();return b.width>300&&b.height>120;
     });
     var ref=window.innerWidth<992&&panel?panel:photo;
     if(!ref&&panel)ref=panel;
     if(!ref)return;
     var box=ref.getBoundingClientRect();
     var current=wide.getBoundingClientRect();
     var dx=box.left-current.left;
     if(Math.abs(dx)<=120&&box.width>240){
      wide.style.setProperty("position","relative","important");
      wide.style.setProperty("left",dx+"px","important");
      wide.style.setProperty("width",box.width+"px","important");
      wide.style.setProperty("max-width","none","important");
     }
    }
    if("__SITE__"==="be"){
     alignWithContainer();
     window.addEventListener("resize",function(){
      window.requestAnimationFrame(alignWithContainer);
     },{passive:true});
    }
    return;
   }
  }
  n=n.parentElement;
 }
}
var oldOverflow=null;
function closeVideo(){
 var popup=document.getElementById("optimus-live-video-overlay");
 if(popup){popup.classList.remove("open");var video=popup.querySelector("iframe");if(video)video.src="about:blank";}
 if(oldOverflow!==null){document.body.style.overflow=oldOverflow;oldOverflow=null;}
}
function video(id){
 if(!/^[A-Za-z0-9_-]{11}$/.test(id||""))return;
 var popup=document.getElementById("optimus-live-video-overlay");
 if(!popup){
  popup=document.createElement("div");
  popup.id="optimus-live-video-overlay";
  popup.setAttribute("role","dialog");
  popup.setAttribute("aria-label","Paardenvideo");
  popup.setAttribute("aria-modal","true");
  popup.innerHTML='<div class="optimus-video-frame"><iframe title="Horse video" src="about:blank" allow="autoplay;encrypted-media;picture-in-picture;fullscreen" allowfullscreen></iframe></div><button type="button" aria-label="Close video">&times;</button>';
  document.body.appendChild(popup);
  popup.addEventListener("click",function(e){if(e.target===popup||e.target.closest("button"))closeVideo();});
 }
 var frame=popup.querySelector("iframe");
 if(frame)frame.src="https://www.youtube-nocookie.com/embed/"+id+"?autoplay=1&rel=0";
 popup.classList.add("open");
 if(oldOverflow===null)oldOverflow=document.body.style.overflow;
 document.body.style.overflow="hidden";
}
window.addEventListener("message",function(event){
 if(event.origin!=="https://optimusauction.vercel.app"||event.source!==iframe.contentWindow)return;
 var data=event.data;
 if(!data||typeof data!=="object")return;
 if(data.type==="optimus:lot-height"){
  var height=Number(data.height);
  if(Number.isFinite(height)&&height>100&&height<20000)iframe.style.setProperty("height",Math.ceil(height)+"px","important");
 }
 if(data.type==="optimus:hippomundo-jump"){
  var hippomundo=document.getElementById("IframeWrapper");
  if(hippomundo)hippomundo.scrollIntoView({behavior:"smooth",block:"start"});
 }
 if(data.type==="optimus:pedigree-horse-video"&&/^[A-Za-z0-9_-]{11}$/.test(data.videoId||"")){
  video(data.videoId);
  if(event.source&&event.source.postMessage)event.source.postMessage({type:"optimus:pedigree-video-opened",videoId:data.videoId},event.origin);
 }
});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeVideo();});
function videosPanel(){
 var headings=document.querySelectorAll("h1,h2,h3,h4,h5,h6");
 for(var i=0;i<headings.length;i++){
  var heading=headings[i];
  if(!/^videos?$/i.test((heading.textContent||"").trim())&&
     !/^video['’]s$/i.test((heading.textContent||"").trim()))continue;
  var ancestor=heading.parentElement;
  for(var n=0;n<7&&ancestor&&ancestor!==document.body;n++,ancestor=ancestor.parentElement){
   if(ancestor.contains(root)||ancestor.contains(document.getElementById("IframeWrapper")))break;
   var r=ancestor.getBoundingClientRect();
   if(r.width<220||r.height<100||r.height>650)continue;
   var actions=Array.from(ancestor.querySelectorAll("a,button"));
   var visibleAction=actions.some(function(link){
    var lr=link.getBoundingClientRect(),style=window.getComputedStyle(link);
    return lr.width>65&&lr.height>10&&style.display!=="none"&&style.visibility!=="hidden";
   });
   if(visibleAction)return ancestor;
  }
 }
 var native=document.getElementById("videos");
 if(native){
  var box=native.getBoundingClientRect();
  if(box.width>220&&box.height>60&&box.height<650)return native;
  var parent=native.parentElement;
  if(parent&&parent.getBoundingClientRect().width>220)return parent;
 }
 return null;
}
function isGrey(color){
 var matched=(color||"").match(/^rgba?\\(\\s*(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/);
 if(!matched)return false;
 var r=Number(matched[1]),g=Number(matched[2]),b=Number(matched[3]);
 return r>=215&&r<=245&&Math.abs(r-g)<=3&&Math.abs(r-b)<=3;
}
function styleNativeVideos(panel){
 if(!panel)return;
 panel.classList.add("optimus-be-videos-section");
 panel.style.setProperty("background","#111","important");
 panel.style.setProperty("color","#fff","important");
 panel.querySelectorAll("div,section,article,ul,li").forEach(function(el){
  if(isGrey(window.getComputedStyle(el).backgroundColor)){
   el.style.setProperty("background-color","transparent","important");
  }
 });
 panel.querySelectorAll("h1,h2,h3,h4,h5,h6,p,strong,span,label,i").forEach(function(el){
  el.style.setProperty("color","#fff","important");
 });
 panel.querySelectorAll("a,button").forEach(function(el){
  var r=el.getBoundingClientRect();
  if(r.width<40||r.height<10)return;
  el.style.setProperty("background-color","#111","important");
  el.style.setProperty("color","#fff","important");
  el.style.setProperty("border-color","#f1f1f1","important");
  el.style.setProperty("border-radius","0","important");
 });
}
function hideKnownPwebPlaceholders(){
 // Exact PWeb containers identified in the live page inspector.
 // Remove only when no visible text or media is present.
 document.querySelectorAll(".row.bg-light-gray.mr-0.ml-0.mb-15.padding-15px-all, .padding-20px-all.width-100.pull-left.bg-light-gray.mb-15").forEach(function(el){
  if(el.closest(".optimus-live-embed,.optimus-live-wide,#IframeWrapper"))return;
  if(el.querySelector("img,iframe,video,canvas,input,textarea,form"))return;
  if((el.innerText||"").trim())return;
  if(Array.from(el.querySelectorAll("a,button")).some(function(c){
   var b=c.getBoundingClientRect();return b.width>4&&b.height>4;
  }))return;
  el.style.setProperty("display","none","important");
 });
}
function hideEmptyGreyBars(panel){
 var live=document.querySelector(".optimus-live-embed");
 if(!live)return;
 // Grey PWeb placeholders are separate blocks immediately above the Videos
 // section on mobile and above the live lot on desktop. Their backgrounds
 // are rgb(234,234,234). Do not use innerText: invisible PWeb widget labels
 // can leave innerText despite the boxes being visually blank.
 var anchors=[live.getBoundingClientRect()];
 if(panel)anchors.push(panel.getBoundingClientRect());
 var candidates=[];
 document.querySelectorAll("div,section,article").forEach(function(el){
  if(el===panel||(panel&&el.contains(panel))||el===live||el.contains(live))return;
  if(el.closest(".optimus-live-embed,.optimus-live-wide,#IframeWrapper,.optimus-be-videos-section"))return;
  var rect=el.getBoundingClientRect();
  if(rect.width<200||rect.height<14||rect.height>110)return;
  if(!isGrey(window.getComputedStyle(el).backgroundColor))return;
  if(el.querySelector("img,video,iframe,canvas,svg,input,textarea,form"))return;
  // Never hide a visible link or a user-facing action.
  if(Array.from(el.querySelectorAll("a,button,[role=button]")).some(function(c){
   var b=c.getBoundingClientRect(),style=window.getComputedStyle(c);
   return b.width>10&&b.height>10&&style.display!=="none"&&
     style.visibility!=="hidden"&&Number(style.opacity)>0;
  }))return;
  var near=anchors.some(function(anchor){
   var distance=anchor.top-rect.bottom;
   var overlap=Math.min(anchor.right,rect.right)-Math.max(anchor.left,rect.left);
   return distance>=-8&&distance<=300&&overlap>Math.min(rect.width,anchor.width)*.60;
  });
  if(near)candidates.push(el);
 });
 // Only top-level matching rectangles; collapsing a nested child alone
 // can leave a second grey background visible.
 candidates.sort(function(a,b){return a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_CONTAINED_BY?-1:1;});
 candidates.forEach(function(el){
  if(el.dataset.optimusGreyHidden)return;
  if(candidates.some(function(parent){return parent!==el&&parent.contains(el)}))return;
  el.dataset.optimusGreyHidden="1";
  el.style.setProperty("display","none","important");
 });
}
function hideAuctionNativeAncestry(){
 if("__SITE__"!=="auction")return;
 var live=document.querySelector(".optimus-live-embed");
 if(!live)return;
 var names=["diamant de semilly","cacacha vh schaeck","bamako","quidam de revel"];
 document.querySelectorAll("table,.row,section,article").forEach(function(el){
  if(el===live||el.contains(live)||el.closest(".optimus-live-embed,#IframeWrapper"))return;
  if(el.closest(".rev_slider_wrapper")||el.querySelector("img,video,iframe,input,button,form"))return;
  var r=el.getBoundingClientRect(),lr=live.getBoundingClientRect();
  if(r.width<220||r.height<80||r.height>450||r.top>lr.top+30)return;
  var txt=(el.innerText||"").toLowerCase().replace(/\\s+/g," ");
  if(txt.length>800||names.filter(function(n){return txt.includes(n);}).length<2)return;
  if(Array.from(el.children).some(function(child){
   var t=(child.innerText||"").toLowerCase().replace(/\\s+/g," ");
   return child.getBoundingClientRect().height>70&&names.filter(function(n){return t.includes(n);}).length>=2;
  }))return;
  el.style.setProperty("display","none","important");
 });
}
function normalizeHippomundo(){
 if("__SITE__"!=="auction")return;
 var live=document.querySelector(".optimus-live-embed");
 if(!live)return;
 var wrappers=Array.from(document.querySelectorAll('[id="IframeWrapper"]'))
  .filter(function(el){return !!el.querySelector('iframe[src*="hippomundo" i],iframe.iframe-height-hippomundo');});
 if(!wrappers.length)return;
 var wide=live.closest(".optimus-live-wide");
 var target=wide||live;
 var keeper=wrappers.find(function(el){return el.classList.contains("optimus-hippomundo-primary");})||
  wrappers.find(function(el){return target.contains(el);})||wrappers[0];
 keeper.classList.add("optimus-hippomundo-primary");
 wrappers.forEach(function(el){
  if(el===keeper){
   el.classList.remove("optimus-hippomundo-duplicate");
   el.style.removeProperty("display");
   el.style.removeProperty("height");
   el.style.removeProperty("min-height");
   el.style.removeProperty("max-height");
  }else{
   el.classList.add("optimus-hippomundo-duplicate");
   el.style.setProperty("display","none","important");
  }
 });
 // Always place Hippomundo directly AFTER the entire live iframe section.
 // Never insert it before the iframe or inside the iframe container.
 if(target.nextElementSibling!==keeper){
  target.insertAdjacentElement("afterend",keeper);
 }
 document.querySelectorAll('iframe[src*="hippomundo" i],iframe.iframe-height-hippomundo').forEach(function(frame){
  if(keeper.contains(frame))return;
  var parent=frame.closest('[id="IframeWrapper"]')||frame;
  parent.style.setProperty("display","none","important");
 });
}
function removeAuctionDuplicates(){
 if("__SITE__"!=="auction")return;
 normalizeHippomundo();
 var live=document.querySelector(".optimus-live-embed");
 if(!live)return;
 var liveY=live.getBoundingClientRect().top+window.scrollY;
 document.querySelectorAll(".optimus-pedigree-container,.optimus-pedigree,.pedigree-tree,[class*=pedigree],[id*=pedigree]").forEach(function(el){
  if(el===live||el.contains(live)||el.closest(".optimus-live-embed,[id=IframeWrapper]"))return;
  var y=el.getBoundingClientRect().top+window.scrollY;
  if(y>liveY+100||el.closest(".rev_slider_wrapper")||el.querySelector("img,video"))return;
  el.style.setProperty("display","none","important");
 });
}
function fixBeVisuals(){
 var panel=videosPanel();
 if("__SITE__"==="be")styleNativeVideos(panel);
 hideKnownPwebPlaceholders();
 hideEmptyGreyBars(panel);
 removeAuctionDuplicates();
 hideAuctionNativeAncestry();
}
function askHeight(){
 if(iframe.contentWindow)iframe.contentWindow.postMessage({type:"optimus:lot-measure"},"https://optimusauction.vercel.app");
}
iframe.addEventListener("load",askHeight);
function placeHippomundoBelowLive(){normalizeHippomundo();}
function init(){widen();placeHippomundoBelowLive();askHeight();fixBeVisuals();placeHippomundoBelowLive();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.addEventListener("load",init,{once:true});
// PWeb sometimes fills its video list after DOM ready. One bounded retry.
window.setTimeout(fixBeVisuals,800);
window.setTimeout(fixBeVisuals,2200);
})();`.replaceAll("__SITE__", site.site);
  return fixed + "\n" + marker + "\n" +
    '<style id="optimus-dashboard-override">\n' + css + "\n</style>\n" +
    '<script id="optimus-dashboard-live-runtime">\n' + runtime + "\n</script>\n" +
    "<!-- OPTIMUS DASHBOARD MANAGED CONTENT END -->";
}
