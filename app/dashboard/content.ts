import type { HorseDetails } from "../pedigree/pedigree-data";
import { normalizeHorseName } from "../pedigrees/ancestry";

export const SITES = ["be", "auction"] as const;
export type Site = (typeof SITES)[number];
export const SITE_LABEL: Record<Site, string> = {
  be: "www.stal-optimus.be",
  auction: "stal-optimus.auction",
};

export type LineItem = { horse: string; note: string; children?: LineItem[] };
export type LineSection = { title: string; horse: string; note?: string; notes?: string[]; items: LineItem[] };
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
export function safeDescription(value: unknown, horses: HorseDetails[]): LotDescription {
  if (!value || typeof value !== "object") return defaultDescription(horses);
  const sections = (value as LotDescription).sections;
  if (!Array.isArray(sections)) return defaultDescription(horses);
  return { sections: sections.slice(0, 12).map((section) => ({
    title: String(section.title || "").slice(0, 60),
    horse: String(section.horse || "").slice(0, 120),
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
  return "v2-" + (hash >>> 0).toString(16);
}

/** Generate safe, complete PWeb code with horse-specific videos and original CSS. */
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
    "#IframeWrapper{--hippomundo-height:" + heights[0] + "px!important;--hippomundo-crop:" + crop + "px!important}",
    ...[
      "(min-width:768px) and (max-width:991px)", "(min-width:600px) and (max-width:767px)",
      "(min-width:480px) and (max-width:599px)", "(min-width:431px) and (max-width:479px)",
      "(min-width:360px) and (max-width:430px)", "(max-width:359px)",
    ].map((query, i) => "@media " + query + "{#IframeWrapper{--hippomundo-height:" + heights[i + 1] + "px!important}}"),
    ".optimus-description .optimus-extended-note{margin:3px 0 6px 20px;font-style:italic;font-weight:400}",
    ".optimus-description .optimus-horse-sublist{list-style-type:circle;padding-left:32px;margin-top:8px}",
    ".optimus-description .optimus-horse-video-name{display:inline-flex!important;flex-wrap:wrap!important;align-items:center!important;gap:4px!important;vertical-align:middle!important;border:0!important;border-radius:0!important;background:transparent!important;color:inherit!important;font:inherit!important;font-weight:inherit!important;line-height:inherit!important;text-align:left!important;padding:0!important;margin:0!important;cursor:pointer!important;white-space:normal!important}",
    ".optimus-description .optimus-horse-video-name:hover .optimus-horse-video-label{text-decoration:underline!important;text-underline-offset:2px}",
    ".optimus-description .optimus-horse-video-name:focus-visible{outline:2px solid currentColor!important;outline-offset:2px}",
    ".optimus-description .optimus-horse-video-label{color:inherit!important;font:inherit!important;font-weight:inherit!important}",
    ".optimus-description .optimus-horse-video-name .camas-youtube-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:none!important;background:#ff0033!important;color:#fff!important;border-radius:3px!important;width:13px!important;height:10px!important;font-size:7px!important}",
    "#optimus-managed-video-overlay{position:fixed!important;inset:0!important;z-index:2147483647!important;display:none!important;align-items:center!important;justify-content:center!important;background:rgba(0,0,0,.92)!important;padding:20px!important;box-sizing:border-box!important}",
    "#optimus-managed-video-overlay.is-open{display:flex!important}",
    "#optimus-managed-video-overlay .optimus-managed-frame{width:min(100%,720px)!important;aspect-ratio:16/9!important;position:relative!important}",
    "#optimus-managed-video-overlay iframe{position:absolute!important;width:100%!important;height:100%!important;inset:0!important;border:0!important}",
    "#optimus-managed-video-close{position:fixed!important;top:22px!important;right:22px!important;width:42px!important;height:42px!important;color:#111!important;background:#fff!important;border:0!important;border-radius:50%!important;font-size:26px!important;cursor:pointer!important}",
    "@media(max-width:767px){#optimus-managed-video-overlay{padding:0!important}#optimus-managed-video-overlay .optimus-managed-frame{width:100%!important}#optimus-managed-video-close{top:calc(15px + env(safe-area-inset-top))!important;right:15px!important}}",
    "@media(min-width:992px){.col-lg-8 .bg-light-gray:has(>a[href='#videos']),.col-md-8 .bg-light-gray:has(>a[href='#videos']),.col-lg-8 .bg-light-grey:has(>a[href='#videos']),.col-md-8 .bg-light-grey:has(>a[href='#videos']){display:none!important}}",
  ].join("\n");
  const markup = descriptionHtml(description, profiles);
  const payload = JSON.stringify({ markup, pedigreeUrl, site: site.site }).replace(/</g, "\\u003c");
  const fallback = '<div class="optimus-description"></div>\n<div class="optimus-pedigree-container"><iframe class="optimus-pedigree" width="100%" height="650" scrolling="no" style="border:0"></iframe></div>';
  const marker = "<!-- OPTIMUS DASHBOARD MANAGED CONTENT START -->";
  const rawBase = (site.base_code || fallback).split(marker)[0];
  const descriptionStart = rawBase.indexOf('<div class="optimus-description">');
  const styleStart = descriptionStart >= 0 ? rawBase.indexOf("<style>", descriptionStart) : -1;
  const withDescription = descriptionStart >= 0 && styleStart > descriptionStart
    ? rawBase.slice(0, descriptionStart) +
      '<div class="optimus-description">\n' + markup + "\n</div>\n\n" +
      rawBase.slice(styleStart)
    : rawBase;
  // Old PWeb scripts moved the bid and gallery DOM and caused loading loops.
  // The safe version already tested on PWeb leaves this structure intact.
  const safeBase = withDescription.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const runtime = "(function(){\n\"use strict\";\nvar config=__OPTIMUS_CONFIG__;\nfunction apply(){\n var desc=document.querySelector(\".optimus-description\");\n if(desc&&!desc.hasAttribute(\"data-dashboard-markup\")){\n  if(desc.innerHTML!==config.markup)desc.innerHTML=config.markup;\n  desc.setAttribute(\"data-dashboard-markup\",\"v2\");\n }\n var frame=document.querySelector(\"iframe.optimus-pedigree\");\n if(frame&&config.pedigreeUrl&&frame.getAttribute(\"src\")!==config.pedigreeUrl)frame.setAttribute(\"src\",config.pedigreeUrl);\n}\nvar previousOverflow=null;\nfunction closeVideo(){\n var el=document.getElementById(\"optimus-managed-video-overlay\");\n if(el){el.classList.remove(\"is-open\");var f=el.querySelector(\"iframe\");if(f)f.setAttribute(\"src\",\"about:blank\");}\n if(previousOverflow!==null){document.body.style.overflow=previousOverflow;previousOverflow=null;}\n}\nfunction openVideo(id){\n if(!/^[A-Za-z0-9_-]{11}$/.test(id||\"\"))return;\n var overlay=document.getElementById(\"optimus-managed-video-overlay\");\n if(!overlay){\n  overlay=document.createElement(\"div\");overlay.id=\"optimus-managed-video-overlay\";\n  overlay.setAttribute(\"role\",\"dialog\");overlay.setAttribute(\"aria-modal\",\"true\");\n  overlay.setAttribute(\"aria-label\",\"Paardenvideo\");\n  overlay.innerHTML='<div class=\"optimus-managed-frame\"><iframe title=\"Horse video\" src=\"about:blank\" allow=\"autoplay;encrypted-media;picture-in-picture;fullscreen\" allowfullscreen></iframe></div><button type=\"button\" id=\"optimus-managed-video-close\" aria-label=\"Sluit video\">&times;</button>';\n  document.body.appendChild(overlay);\n }\n var f=overlay.querySelector(\"iframe\");\n if(!f)return;\n f.setAttribute(\"src\",\"https://www.youtube-nocookie.com/embed/\"+id+\"?autoplay=1&rel=0\");\n overlay.classList.add(\"is-open\");\n if(previousOverflow===null)previousOverflow=document.body.style.overflow;\n document.body.style.overflow=\"hidden\";\n}\ndocument.addEventListener(\"click\",function(event){\n var target=event.target;if(!target||!target.closest)return;\n var button=target.closest(\".optimus-managed-video\");\n if(button){event.preventDefault();openVideo(button.getAttribute(\"data-youtube\"));return;}\n if(target.id===\"optimus-managed-video-close\"||target.id===\"optimus-managed-video-overlay\")closeVideo();\n});\ndocument.addEventListener(\"keydown\",function(event){if(event.key===\"Escape\")closeVideo();});\nwindow.addEventListener(\"message\",function(event){\n if(event.origin!==\"https://optimusauction.vercel.app\")return;\n var iframe=document.querySelector(\"iframe.optimus-pedigree\");\n if(!iframe||event.source!==iframe.contentWindow)return;\n var data=event.data;\n if(data&&data.type===\"optimus:pedigree-horse-video\"){openVideo(data.videoId);if(event.source&&event.source.postMessage)event.source.postMessage({type:\"optimus:pedigree-video-opened\",videoId:data.videoId},event.origin);}\n});\nfunction removeGreyBar(){\n if(config.site!==\"be\"||window.innerWidth<992)return;\n var desc=document.querySelector(\".optimus-description\");if(!desc)return;\n var d=desc.getBoundingClientRect();\n var nodes=document.querySelectorAll(\".col-lg-8 div,.col-md-8 div\");\n for(var i=0;i<nodes.length;i++){\n  var el=nodes[i];\n  if(el.contains(desc)||el.closest(\".optimus-description,.optimus-pedigree-container,#IframeWrapper\"))continue;\n  if(el.querySelector(\"img,video,canvas,iframe,input,form,.optimus-description,.optimus-pedigree-container\"))continue;\n  var rect=el.getBoundingClientRect();\n  if(rect.width<300||rect.height<18||rect.height>100||rect.bottom>d.top+8||d.top-rect.bottom>160)continue;\n  var color=window.getComputedStyle(el).backgroundColor;\n  var match=color.match(/^rgba?\\(\\s*(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/);\n  if(!match)continue;\n  var r=Number(match[1]),g=Number(match[2]),b=Number(match[3]);\n  if(r<215||r>245||Math.abs(r-g)>3||Math.abs(r-b)>3)continue;\n  if((el.innerText||\"\").trim())continue;\n  var controls=el.querySelectorAll(\"a,button\"),visible=false;\n  for(var j=0;j<controls.length;j++){\n   var c=controls[j],cs=window.getComputedStyle(c),cr=c.getBoundingClientRect();\n   if(cs.display!==\"none\"&&cs.visibility!==\"hidden\"&&cr.width>0&&cr.height>0){visible=true;break;}\n  }\n  if(!visible)el.style.setProperty(\"display\",\"none\",\"important\");\n }\n}\nfunction init(){apply();removeGreyBar();}\nif(document.readyState===\"loading\")document.addEventListener(\"DOMContentLoaded\",init,{once:true});else init();\nwindow.addEventListener(\"load\",init,{once:true});\n})();".replace("__OPTIMUS_CONFIG__", payload);
  return safeBase + "\n" + marker + "\n" +
    '<style id="optimus-dashboard-override">\n' + css + "\n</style>\n" +
    '<script id="optimus-dashboard-script">\n' + runtime + "\n</script>\n" +
    "<!-- OPTIMUS DASHBOARD MANAGED CONTENT END -->";
}
