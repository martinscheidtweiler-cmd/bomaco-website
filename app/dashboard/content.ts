import type { HorseDetails } from "../pedigree/pedigree-data";
import { normalizeHorseName } from "../pedigrees/ancestry";

export const SITES = ["be", "auction"] as const;
export type Site = (typeof SITES)[number];
export const SITE_LABEL: Record<Site, string> = {
  be: "www.stal-optimus.be",
  auction: "stal-optimus.auction",
};

export type LineItem = { horse: string; note: string };
export type LineSection = { title: string; horse: string; items: LineItem[] };
export type LotDescription = { sections: LineSection[] };
export type HorseProfile = {
  normalized_name: string;
  display_name: string;
  video_url: string;
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
    { title: "2ND DAM", horse: "", items: [] },
    { title: "3RD DAM", horse: "", items: [] },
    { title: "4TH DAM", horse: "", items: [] },
  ] };
}
export function safeDescription(value: unknown, horses: HorseDetails[]): LotDescription {
  if (!value || typeof value !== "object") return defaultDescription(horses);
  const sections = (value as LotDescription).sections;
  if (!Array.isArray(sections)) return defaultDescription(horses);
  return { sections: sections.slice(0, 12).map((section) => ({
    title: String(section.title || "").slice(0, 60),
    horse: String(section.horse || "").slice(0, 120),
    items: Array.isArray(section.items)
      ? section.items.slice(0, 50).map((item) => ({
          horse: String(item.horse || "").slice(0, 120),
          note: String(item.note || "").slice(0, 200),
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
  return '<strong>' + escapeHtml(name) +
    (id ? ' <button type="button" class="optimus-managed-video" data-youtube="' + id +
      '" aria-label="Watch ' + escapeHtml(name) + ' video"><span class="camas-youtube-icon">&#9654;</span></button>' : "") +
    "</strong>";
}
function descriptionHtml(description: LotDescription, profiles: HorseProfile[]): string {
  return description.sections.map((section) => {
    const heading = escapeHtml(section.title) + ": " + horseMark(section.horse, profiles);
    const lines = section.items.filter((item) => item.horse.trim()).map((item) =>
      "<li>" + horseMark(item.horse, profiles) +
      (item.note.trim() ? ' <span class="optimus-horse-note">' + escapeHtml(item.note) + "</span>" : "") +
      "</li>").join("");
    return '<div class="optimus-description-section">' +
      '<p class="optimus-description-heading">' + heading + "</p>" +
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
    ...description.sections.flatMap((s) => [normalizeHorseName(s.horse), ...s.items.map((i) => normalizeHorseName(i.horse))]),
  ]);
  return profiles.filter((p) => names.has(p.normalized_name));
}
export function signature(
  pedigree: PedigreeRecord, lot: LotData | undefined,
  site: SiteCode | undefined, profiles: HorseProfile[],
): string {
  const body = JSON.stringify([
    pedigree.updated_at, pedigree.horses, pedigree.public_token, pedigree.is_published,
    lot?.updated_at || "", lot?.description || "",
    site?.updated_at || "", site?.base_code || "", site?.heights || "", site?.crop || "",
    ...relevantProfiles(pedigree.horses, lot?.description || defaultDescription(pedigree.horses), profiles)
      .sort((a, b) => a.normalized_name.localeCompare(b.normalized_name))
      .map((p) => [p.normalized_name, p.video_url, p.updated_at]),
  ]);
  let hash = 2166136261;
  for (let i = 0; i < body.length; i++) {
    hash ^= body.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return "v1-" + (hash >>> 0).toString(16);
}

/** Produce a complete PWeb source block. Existing CSS, gallery and bidding layout remain untouched.
 * The managed tail edits only Optimus description content, the existing live pedigree iframe
 * and Hippomundo's CSS variables. Never execute untrusted HTML as editor-preview content. */
export function generatePWebCode(
  pedigree: PedigreeRecord, description: LotDescription,
  site: SiteCode, profiles: HorseProfile[],
): string {
  const pedigreeUrl = pedigree.is_published && pedigree.public_token
    ? "https://optimusauction.vercel.app/pedigree/live/" + encodeURIComponent(pedigree.public_token)
    : "";
  const heights = safeHeights(site.heights);
  const crop = numberOr(site.crop, 265);
  const css = [
    "#IframeWrapper { --hippomundo-height:" + heights[0] + "px !important; --hippomundo-crop:" + crop + "px !important; }",
    ...[
      "(min-width:768px) and (max-width:991px)", "(min-width:600px) and (max-width:767px)",
      "(min-width:480px) and (max-width:599px)", "(min-width:431px) and (max-width:479px)",
      "(min-width:360px) and (max-width:430px)", "(max-width:359px)",
    ].map((query, i) => "@media " + query + "{#IframeWrapper{--hippomundo-height:" + heights[i+1] + "px !important;}}"),
    ".optimus-description .optimus-managed-video{display:inline-flex!important;vertical-align:middle;border:0!important;background:transparent!important;padding:0 2px!important;cursor:pointer!important}",
    ".optimus-description .optimus-managed-video .camas-youtube-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;background:#ff0033!important;color:white!important;border-radius:3px!important;width:13px!important;height:10px!important;font-size:7px!important}",
    "#optimus-managed-video-overlay{position:fixed!important;inset:0!important;z-index:2147483647!important;display:none!important;align-items:center!important;justify-content:center!important;background:rgba(0,0,0,.9)!important;padding:20px!important}",
    "#optimus-managed-video-overlay.is-open{display:flex!important}",
    "#optimus-managed-video-overlay .optimus-managed-frame{width:min(100%,720px);aspect-ratio:16/9;position:relative}",
    "#optimus-managed-video-overlay iframe{position:absolute;width:100%;height:100%;inset:0;border:0}",
    "#optimus-managed-video-close{position:fixed;top:22px;right:22px;width:42px;height:42px;color:#111;background:#fff;border:0;border-radius:50%;font-size:26px;cursor:pointer}",
    "@media(max-width:767px){#optimus-managed-video-overlay{padding:0!important}#optimus-managed-video-overlay .optimus-managed-frame{width:100%}#optimus-managed-video-close{top:calc(15px + env(safe-area-inset-top));right:15px}}",
  ].join("\n");
  const managedMarkup = descriptionHtml(description, profiles);
  const safePayload = JSON.stringify({ markup: managedMarkup, pedigreeUrl }).replace(/</g, "\\u003c");
  const fallback = '<div class="optimus-description"></div>\n<div class="optimus-pedigree-container"><iframe class="optimus-pedigree" width="100%" height="650" scrolling="no" style="border:0"></iframe></div>';
  // Strip an older generated managed tail if a user pasted generated code back as a base.
  const base = (site.base_code || fallback).split("\n<!-- OPTIMUS DASHBOARD MANAGED CONTENT START -->")[0];
  return base +
    "\n<!-- OPTIMUS DASHBOARD MANAGED CONTENT START -->\n" +
    '<style id="optimus-dashboard-override">\n' + css + "\n</style>\n" +
    '<script id="optimus-dashboard-script">\n(function(){\n"use strict";\n' +
    "var config=" + safePayload + ";\n" +
    'function apply(){\n' +
    ' var desc=document.querySelector(".optimus-description");\n' +
    ' if(desc&&desc.getAttribute("data-dashboard-markup")!=="v1"){desc.innerHTML=config.markup;desc.setAttribute("data-dashboard-markup","v1");}\n' +
    ' var frame=document.querySelector("iframe.optimus-pedigree");\n' +
    ' if(frame&&config.pedigreeUrl&&frame.getAttribute("src")!==config.pedigreeUrl){frame.setAttribute("src",config.pedigreeUrl);}\n' +
    '}\n' +
    'function close(){var el=document.getElementById("optimus-managed-video-overlay");if(el){el.classList.remove("is-open");el.querySelector("iframe").src="about:blank";}document.body.style.overflow="";}\n' +
    'document.addEventListener("click",function(e){var button=e.target.closest(".optimus-managed-video");if(button){e.preventDefault();var id=button.getAttribute("data-youtube");if(!/^[A-Za-z0-9_-]{11}$/.test(id||""))return;var overlay=document.getElementById("optimus-managed-video-overlay");if(!overlay){overlay=document.createElement("div");overlay.id="optimus-managed-video-overlay";overlay.innerHTML=\'<div class="optimus-managed-frame"><iframe title="Horse video" src="about:blank" allow="autoplay;encrypted-media;picture-in-picture;fullscreen" allowfullscreen></iframe></div><button type="button" id="optimus-managed-video-close" aria-label="Close">&times;</button>\';document.body.appendChild(overlay);}overlay.querySelector("iframe").src="https://www.youtube-nocookie.com/embed/"+id+"?autoplay=1&rel=0";overlay.classList.add("is-open");document.body.style.overflow="hidden";return;}if(e.target.id==="optimus-managed-video-close"||e.target.id==="optimus-managed-video-overlay")close();});\n' +
    'document.addEventListener("keydown",function(e){if(e.key==="Escape")close();});\n' +
    'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply);else apply();\n' +
    'window.addEventListener("load",apply);\n' +
    '})();\n</script>\n' +
    '<!-- OPTIMUS DASHBOARD MANAGED CONTENT END -->';
}
