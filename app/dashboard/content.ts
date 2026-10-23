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
    "live-lot-iframe-v3" + (site?.site === "be" ? "-be-exact-pweb-placeholder-cleanup-v6" : ""), pedigree.public_token, pedigree.is_published,
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
  const runtime = "(function(){\n\"use strict\";\nif(window.optimusLiveLotInstalled)return;\nwindow.optimusLiveLotInstalled=true;\nvar root=document.querySelector(\".optimus-live-embed\");\nvar iframe=root&&root.querySelector(\"iframe.optimus-live-lot-iframe\");\nif(!root||!iframe)return;\nfunction widen(){\n if(root.closest(\".optimus-live-wide\"))return;\n var n=root;\n while(n&&n!==document.body){\n  if(n.classList&&n.classList.contains(\"row\")){\n   var cols=Array.from(n.children).filter(function(x){return x.matches('[class*=\"col-md-\"],[class*=\"col-lg-\"]');});\n   var gallery=cols.find(function(x){return x.contains(root)&&x.matches(\".col-lg-8,.col-md-8\");});\n   var auction=cols.find(function(x){return x!==gallery&&x.matches(\".col-lg-4,.col-md-4\");});\n   if(gallery&&auction&&n.parentElement){\n    // The PWeb HTML block originally lives inside a light-grey wrapper.\n    // When its live iframe moves below the photo/bid columns, that empty\n    // wrapper remains as the thin grey strip visible on desktop.\n    var oldSlot=root.parentElement;\n    var wide=document.createElement(\"div\");\n    wide.className=\"optimus-live-wide\";\n    n.insertAdjacentElement(\"afterend\",wide);\n    wide.appendChild(root);\n    var hip=document.getElementById(\"IframeWrapper\");\n    if(hip&&gallery.contains(hip))wide.appendChild(hip);\n\n    function emptyAndSafe(el){\n     if(!el||el===gallery||el===document.body)return false;\n     if(el.querySelector(\"img,iframe,video,canvas,svg,input,textarea,form\"))return false;\n     if((el.innerText||\"\").trim())return false;\n     return !Array.from(el.querySelectorAll(\"a,button,[role=button]\")).some(function(control){\n      var s=window.getComputedStyle(control),r=control.getBoundingClientRect();\n      return s.display!==\"none\"&&s.visibility!==\"hidden\"&&r.width>0&&r.height>0;\n     });\n    }\n    // Only collapse genuinely empty wrappers on the former HTML slot path.\n    // Never modify the picture gallery, auction column or download buttons.\n    var placeholder=oldSlot;\n    while(placeholder&&placeholder!==gallery&&gallery.contains(placeholder)){\n     var next=placeholder.parentElement;\n     if(emptyAndSafe(placeholder)){\n      var r=placeholder.getBoundingClientRect();\n      if(r.height>0&&r.height<180&&r.width>300){\n       placeholder.style.setProperty(\"display\",\"none\",\"important\");\n      }\n     }\n     placeholder=next;\n    }\n\n    function alignWithContainer(){\n     // No inherited left-padding or accumulated offsets.\n     // The live iframe aligns with the visible content box on both viewports.\n     wide.style.setProperty(\"padding\",\"0px\",\"important\");\n     wide.style.setProperty(\"margin-left\",\"0px\",\"important\");\n     wide.style.setProperty(\"margin-right\",\"0px\",\"important\");\n     root.style.setProperty(\"padding\",\"0px\",\"important\");\n     root.style.setProperty(\"margin-left\",\"0px\",\"important\");\n     root.style.setProperty(\"width\",\"100%\",\"important\");\n     var panel=videosPanel();\n     var photo=Array.from(gallery.querySelectorAll(\"img\")).find(function(img){\n      var b=img.getBoundingClientRect();return b.width>300&&b.height>120;\n     });\n     var ref=window.innerWidth<992&&panel?panel:photo;\n     if(!ref&&panel)ref=panel;\n     if(!ref)return;\n     var box=ref.getBoundingClientRect();\n     var current=wide.getBoundingClientRect();\n     var dx=box.left-current.left;\n     if(Math.abs(dx)<=120&&box.width>240){\n      wide.style.setProperty(\"position\",\"relative\",\"important\");\n      wide.style.setProperty(\"left\",dx+\"px\",\"important\");\n      wide.style.setProperty(\"width\",box.width+\"px\",\"important\");\n      wide.style.setProperty(\"max-width\",\"none\",\"important\");\n     }\n    }\n    if(\"__SITE__\"===\"be\"){\n     alignWithContainer();\n     window.addEventListener(\"resize\",function(){\n      window.requestAnimationFrame(alignWithContainer);\n     },{passive:true});\n    }\n    return;\n   }\n  }\n  n=n.parentElement;\n }\n}\nvar oldOverflow=null;\nfunction closeVideo(){\n var popup=document.getElementById(\"optimus-live-video-overlay\");\n if(popup){popup.classList.remove(\"open\");var video=popup.querySelector(\"iframe\");if(video)video.src=\"about:blank\";}\n if(oldOverflow!==null){document.body.style.overflow=oldOverflow;oldOverflow=null;}\n}\nfunction video(id){\n if(!/^[A-Za-z0-9_-]{11}$/.test(id||\"\"))return;\n var popup=document.getElementById(\"optimus-live-video-overlay\");\n if(!popup){\n  popup=document.createElement(\"div\");\n  popup.id=\"optimus-live-video-overlay\";\n  popup.setAttribute(\"role\",\"dialog\");\n  popup.setAttribute(\"aria-label\",\"Paardenvideo\");\n  popup.setAttribute(\"aria-modal\",\"true\");\n  popup.innerHTML='<div class=\"optimus-video-frame\"><iframe title=\"Horse video\" src=\"about:blank\" allow=\"autoplay;encrypted-media;picture-in-picture;fullscreen\" allowfullscreen></iframe></div><button type=\"button\" aria-label=\"Close video\">&times;</button>';\n  document.body.appendChild(popup);\n  popup.addEventListener(\"click\",function(e){if(e.target===popup||e.target.closest(\"button\"))closeVideo();});\n }\n var frame=popup.querySelector(\"iframe\");\n if(frame)frame.src=\"https://www.youtube-nocookie.com/embed/\"+id+\"?autoplay=1&rel=0\";\n popup.classList.add(\"open\");\n if(oldOverflow===null)oldOverflow=document.body.style.overflow;\n document.body.style.overflow=\"hidden\";\n}\nwindow.addEventListener(\"message\",function(event){\n if(event.origin!==\"https://optimusauction.vercel.app\"||event.source!==iframe.contentWindow)return;\n var data=event.data;\n if(!data||typeof data!==\"object\")return;\n if(data.type===\"optimus:lot-height\"){\n  var height=Number(data.height);\n  if(Number.isFinite(height)&&height>100&&height<20000)iframe.style.setProperty(\"height\",Math.ceil(height)+\"px\",\"important\");\n }\n if(data.type===\"optimus:hippomundo-jump\"){\n  var hippomundo=document.getElementById(\"IframeWrapper\");\n  if(hippomundo)hippomundo.scrollIntoView({behavior:\"smooth\",block:\"start\"});\n }\n if(data.type===\"optimus:pedigree-horse-video\"&&/^[A-Za-z0-9_-]{11}$/.test(data.videoId||\"\")){\n  video(data.videoId);\n  if(event.source&&event.source.postMessage)event.source.postMessage({type:\"optimus:pedigree-video-opened\",videoId:data.videoId},event.origin);\n }\n});\ndocument.addEventListener(\"keydown\",function(e){if(e.key===\"Escape\")closeVideo();});\nfunction videosPanel(){\n var headings=document.querySelectorAll(\"h1,h2,h3,h4,h5,h6\");\n for(var i=0;i<headings.length;i++){\n  var heading=headings[i];\n  if(!/^videos?$/i.test((heading.textContent||\"\").trim())&&\n     !/^video['’]s$/i.test((heading.textContent||\"\").trim()))continue;\n  var ancestor=heading.parentElement;\n  for(var n=0;n<7&&ancestor&&ancestor!==document.body;n++,ancestor=ancestor.parentElement){\n   if(ancestor.contains(root)||ancestor.contains(document.getElementById(\"IframeWrapper\")))break;\n   var r=ancestor.getBoundingClientRect();\n   if(r.width<220||r.height<100||r.height>650)continue;\n   var actions=Array.from(ancestor.querySelectorAll(\"a,button\"));\n   var visibleAction=actions.some(function(link){\n    var lr=link.getBoundingClientRect(),style=window.getComputedStyle(link);\n    return lr.width>65&&lr.height>10&&style.display!==\"none\"&&style.visibility!==\"hidden\";\n   });\n   if(visibleAction)return ancestor;\n  }\n }\n var native=document.getElementById(\"videos\");\n if(native){\n  var box=native.getBoundingClientRect();\n  if(box.width>220&&box.height>90&&box.height<650)return native;\n }\n return null;\n}\nfunction isGrey(color){\n var matched=(color||\"\").match(/^rgba?\\(\\s*(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/);\n if(!matched)return false;\n var r=Number(matched[1]),g=Number(matched[2]),b=Number(matched[3]);\n return r>=215&&r<=245&&Math.abs(r-g)<=3&&Math.abs(r-b)<=3;\n}\nfunction styleNativeVideos(panel){\n if(!panel)return;\n panel.classList.add(\"optimus-be-videos-section\");\n panel.style.setProperty(\"background\",\"#111\",\"important\");\n panel.style.setProperty(\"color\",\"#fff\",\"important\");\n panel.querySelectorAll(\"div,section,article,ul,li\").forEach(function(el){\n  if(isGrey(window.getComputedStyle(el).backgroundColor)){\n   el.style.setProperty(\"background-color\",\"transparent\",\"important\");\n  }\n });\n panel.querySelectorAll(\"h1,h2,h3,h4,h5,h6,p,strong,span,label,i\").forEach(function(el){\n  el.style.setProperty(\"color\",\"#fff\",\"important\");\n });\n panel.querySelectorAll(\"a,button\").forEach(function(el){\n  var r=el.getBoundingClientRect();\n  if(r.width<40||r.height<10)return;\n  el.style.setProperty(\"background-color\",\"#111\",\"important\");\n  el.style.setProperty(\"color\",\"#fff\",\"important\");\n  el.style.setProperty(\"border-color\",\"#f1f1f1\",\"important\");\n  el.style.setProperty(\"border-radius\",\"0\",\"important\");\n });\n}\nfunction hideKnownPwebPlaceholders(){\n // Exact PWeb containers identified in the live page inspector.\n // Remove only when no visible text or media is present.\n document.querySelectorAll(\".row.bg-light-gray.mr-0.ml-0.mb-15.padding-15px-all, .padding-20px-all.width-100.pull-left.bg-light-gray.mb-15\").forEach(function(el){\n  if(el.closest(\".optimus-live-embed,.optimus-live-wide,#IframeWrapper\"))return;\n  if(el.querySelector(\"img,iframe,video,canvas,input,textarea,form\"))return;\n  if((el.innerText||\"\").trim())return;\n  if(Array.from(el.querySelectorAll(\"a,button\")).some(function(c){\n   var b=c.getBoundingClientRect();return b.width>4&&b.height>4;\n  }))return;\n  el.style.setProperty(\"display\",\"none\",\"important\");\n });\n}\nfunction hideEmptyGreyBars(panel){\n var live=document.querySelector(\".optimus-live-embed\");\n if(!live)return;\n // Grey PWeb placeholders are separate blocks immediately above the Videos\n // section on mobile and above the live lot on desktop. Their backgrounds\n // are rgb(234,234,234). Do not use innerText: invisible PWeb widget labels\n // can leave innerText despite the boxes being visually blank.\n var anchors=[live.getBoundingClientRect()];\n if(panel)anchors.push(panel.getBoundingClientRect());\n var candidates=[];\n document.querySelectorAll(\"div,section,article\").forEach(function(el){\n  if(el===panel||(panel&&el.contains(panel))||el===live||el.contains(live))return;\n  if(el.closest(\".optimus-live-embed,.optimus-live-wide,#IframeWrapper,.optimus-be-videos-section\"))return;\n  var rect=el.getBoundingClientRect();\n  if(rect.width<200||rect.height<14||rect.height>110)return;\n  if(!isGrey(window.getComputedStyle(el).backgroundColor))return;\n  if(el.querySelector(\"img,video,iframe,canvas,svg,input,textarea,form\"))return;\n  // Never hide a visible link or a user-facing action.\n  if(Array.from(el.querySelectorAll(\"a,button,[role=button]\")).some(function(c){\n   var b=c.getBoundingClientRect(),style=window.getComputedStyle(c);\n   return b.width>10&&b.height>10&&style.display!==\"none\"&&\n     style.visibility!==\"hidden\"&&Number(style.opacity)>0;\n  }))return;\n  var near=anchors.some(function(anchor){\n   var distance=anchor.top-rect.bottom;\n   var overlap=Math.min(anchor.right,rect.right)-Math.max(anchor.left,rect.left);\n   return distance>=-8&&distance<=300&&overlap>Math.min(rect.width,anchor.width)*.60;\n  });\n  if(near)candidates.push(el);\n });\n // Only top-level matching rectangles; collapsing a nested child alone\n // can leave a second grey background visible.\n candidates.sort(function(a,b){return a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_CONTAINED_BY?-1:1;});\n candidates.forEach(function(el){\n  if(el.dataset.optimusGreyHidden)return;\n  if(candidates.some(function(parent){return parent!==el&&parent.contains(el)}))return;\n  el.dataset.optimusGreyHidden=\"1\";\n  el.style.setProperty(\"display\",\"none\",\"important\");\n });\n}\nfunction fixBeVisuals(){\n if(\"__SITE__\"!==\"be\")return;\n var panel=videosPanel();\n styleNativeVideos(panel);\n hideKnownPwebPlaceholders();\n hideEmptyGreyBars(panel);\n}\nfunction askHeight(){\n if(iframe.contentWindow)iframe.contentWindow.postMessage({type:\"optimus:lot-measure\"},\"https://optimusauction.vercel.app\");\n}\niframe.addEventListener(\"load\",askHeight);\nfunction init(){widen();askHeight();fixBeVisuals();}\nif(document.readyState===\"loading\")document.addEventListener(\"DOMContentLoaded\",init,{once:true});else init();\nwindow.addEventListener(\"load\",init,{once:true});\n// PWeb sometimes fills its video list after DOM ready. One bounded retry.\nwindow.setTimeout(fixBeVisuals,800);\n})();".replace("__SITE__", site.site);
  return fixed + "\n" + marker + "\n" +
    '<style id="optimus-dashboard-override">\n' + css + "\n</style>\n" +
    '<script id="optimus-dashboard-live-runtime">\n' + runtime + "\n</script>\n" +
    "<!-- OPTIMUS DASHBOARD MANAGED CONTENT END -->";
}
