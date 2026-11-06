/* Optimus Auction — single-script PWeb loader. Keep lot-specific HTML small. */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script || script.getAttribute("data-optimus-loaded") === "1") return;
  var token = (script.getAttribute("data-lot") || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    console.warn("Optimus Auction: missing or invalid public lot ID.");
    return;
  }
  if (!script.parentNode || document.querySelector(".optimus-live-embed[data-optimus-site]")) return;
  script.setAttribute("data-optimus-loaded", "1");

  var origin = "https://optimusauction.vercel.app";
  // A PWeb head-level critical style is still needed to guarantee no first-paint flash.
  // The loader applies these styles as soon as PWeb executes it.
  var site = script.getAttribute("data-site") === "be" ? "be" : "auction";
  var isEmbryo = site === "auction" && script.getAttribute("data-kind") === "embryo";
  var embryoSex = script.getAttribute("data-sex") || "";
  var name = script.getAttribute("data-title") || "Optimus Auction lot";
  var heights = (script.getAttribute("data-heights") || "").trim();
  var crop = (script.getAttribute("data-crop") || "").trim();

  // Apply critical PWeb colors immediately, before the asynchronous bridge loads.
  if (!document.getElementById("optimus-critical-pweb-style")) {
    var critical = document.createElement("style");
    critical.id = "optimus-critical-pweb-style";
    critical.textContent = ".page-title-small,.page-title-small>div,.page-title-small>.container{background:#000!important;background-color:#000!important;border-color:#000!important}.page-title-small,.page-title-small h1,.page-title-small p,.page-title-small span,.page-title-small strong{color:#fff!important}#videos,.paard-foto #videos,.optimus-auction-video-holder,.padding-20px-top.width-100.pull-left.bg-light-gray{background:#111!important;background-color:#111!important;color:#fff!important}.optimus-pweb-video-button,.optimus-pweb-vet-link{background:#111!important;color:#fff!important}";
    document.head.appendChild(critical);
  }

  // Apply native PWeb button colors before the asynchronous bridge.
  if (!document.getElementById("optimus-pweb-action-first-paint")) {
    var actionStyle = document.createElement("style");
    actionStyle.id = "optimus-pweb-action-first-paint";
    actionStyle.textContent = [
      ".padding-20px-top.width-100.pull-left.bg-light-gray,.padding-20px-top.width-100.pull-left.bg-light-grey,#videos{background:#111!important;color:#fff!important;border-color:#111!important}",
      ".padding-20px-top.width-100.pull-left.bg-light-gray a,.padding-20px-top.width-100.pull-left.bg-light-gray button,#videos a,#videos button{background:#111!important;color:#fff!important;border-color:#111!important}",
      ".optimus-pweb-vet-link,.optimus-pweb-video-button{background:#111!important;color:#fff!important}"
    ].join("");
    document.head.appendChild(actionStyle);
  }

  // Keep PWeb's native YouTube hero out of the first paint while the
  // central bridge resolves the managed lot video.
  if (!document.querySelector("[data-optimus-native-media]")) document.documentElement.classList.add("optimus-video-resolving");
  if (!document.getElementById("optimus-video-first-paint")) {
    var firstPaint = document.createElement("style");
    firstPaint.id = "optimus-video-first-paint";
    firstPaint.textContent = "html.optimus-video-resolving .videoWrapper iframe[src*='youtube'],html.optimus-video-resolving .video-wrapper iframe[src*='youtube'],html.optimus-video-resolving .embed-responsive iframe[src*='youtube'],html.optimus-video-resolving .video-container iframe[src*='youtube']{visibility:hidden!important}";
    document.head.appendChild(firstPaint);
  }
  // Fail open if the live bridge cannot load.
  window.setTimeout(function () { document.documentElement.classList.remove("optimus-video-resolving"); }, 8000);

  // Hybrid PWeb: move the explicitly authored Vimeo player above the native photo gallery.
  // Keep the original video links, vet report and gallery untouched.
  if (site === "auction" && /delilah/i.test(name)) {
    var placeHybridVideo = function () {
      var player = document.querySelector(".optimus-delilah-video[data-optimus-native-media]");
      if (!player) return;
      var gallery = document.querySelector(".rev_slider_wrapper");
      if (!gallery) return;
      var column = gallery.parentElement;
      if (!column || column.contains(document.querySelector(".optimus-live-embed"))) return;
      if (player.parentElement !== column || player.nextElementSibling !== gallery) {
        column.insertBefore(player, gallery);
      }
      column.querySelectorAll(".videoWrapper,.video-wrapper,.embed-responsive,.video-container").forEach(function (wrapper) {
        if (wrapper === player || player.contains(wrapper) || wrapper.contains(player)) return;
        if (wrapper.querySelector('iframe[src*="youtube"],iframe[src*="youtu.be"]')) {
          wrapper.style.setProperty("display", "none", "important");
        }
      });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", placeHybridVideo, { once: true });
    } else {
      placeHybridVideo();
    }
    window.addEventListener("load", placeHybridVideo, { once: true });
  }

  var root = document.createElement("div");
  root.className = "optimus-live-embed";
  root.setAttribute("data-optimus-site", site);
  if (/^\d+(,\d+){6}$/.test(heights)) root.setAttribute("data-optimus-heights", heights);
  if (/^\d{1,5}$/.test(crop)) root.setAttribute("data-optimus-crop", crop);
  if (isEmbryo) {
    root.setAttribute("data-optimus-lot-kind", "embryo");
    if (embryoSex === "male" || embryoSex === "female") {
      root.setAttribute("data-optimus-embryo-sex", embryoSex);
    }
  }

  var frame = document.createElement("iframe");
  frame.className = "optimus-live-lot-iframe";
  frame.src = origin + "/lot/live/" + encodeURIComponent(token) + "?site=" + site;
  frame.title = name + " - Live description and pedigree";
  frame.width = "100%";
  frame.height = "900";
  frame.setAttribute("scrolling", "no");
  frame.setAttribute("loading", "eager");
  frame.style.cssText = "display:block;width:100%;height:900px;border:0;overflow:hidden";
  root.appendChild(frame);
  script.parentNode.insertBefore(root, script);

  if (site === "auction" && !document.getElementById("optimus-auction-instant-title-css")) {
    var style = document.createElement("style");
    style.id = "optimus-auction-instant-title-css";
    style.textContent = [
      ".page-title-small,.page-title-small > div,.page-title-small > .container{background:#000!important;background-color:#000!important;border-color:#000!important;box-shadow:none!important}",
      ".page-title-small,.page-title-small h1,.page-title-small p,.page-title-small span,.page-title-small strong,.page-title-small label,.page-title-small .display-block{color:#fff!important}",
      ".optimus-mobile-title-content{display:none!important}",
      "@media(max-width:767px){.page-title-small.optimus-mobile-title-ready{display:block!important;height:auto!important;min-height:0!important;padding:0!important;background:#000!important;color:#fff!important}.page-title-small.optimus-mobile-title-ready > :not(.optimus-mobile-title-content){display:none!important}.page-title-small.optimus-mobile-title-ready > .optimus-mobile-title-content{display:block!important;width:100%!important;box-sizing:border-box!important;margin:0!important;padding:22px 20px 20px!important;text-align:left!important;background:#000!important;color:#fff!important;font-family:Poppins,Montserrat,Arial,sans-serif!important}.optimus-mobile-title-content .omt-name{display:block!important;color:#fff!important;font-size:clamp(21px,5.5vw,26px)!important;line-height:1.2!important;font-weight:650!important;margin:0 0 10px!important;text-align:left!important}.optimus-mobile-title-content .omt-line{display:block!important;color:#d2d2d2!important;font-size:clamp(12px,3.2vw,14px)!important;line-height:1.5!important;margin:0!important}.optimus-mobile-title-content .omt-info{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;flex-wrap:wrap!important;margin:17px 0 0!important;padding:14px 0 0!important;border-top:1px solid #444!important}html body .optimus-mobile-title-content .omt-sex{color:#fff!important;font-size:19px!important;line-height:1.3!important;font-weight:600!important;white-space:nowrap!important}.optimus-mobile-title-content .omt-date{color:#d2d2d2!important;font-size:13px!important;line-height:1.3!important;white-space:nowrap!important}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function makeMobileTitle() {
    if (site !== "auction") return;
    var headers = document.querySelectorAll(".page-title-small");
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      if (header.classList.contains("optimus-mobile-title-ready")) return;
      var heading = header.querySelector("h1");
      if (!heading) continue;
      var source = header.querySelector(".hidden-md.hidden-lg.hidden-sm") || header;
      var nameNode = source.querySelector("h1") || heading;
      var title = (nameNode.textContent || "").trim();
      if (!title) continue;
      var values = Array.from(source.querySelectorAll(".display-block.margin-5px-top,span,p"));
      var blood = values.find(function (node) {
        var text = (node.textContent || "").trim();
        return text.length > 12 && /[x×]/i.test(text) && text !== title && text.length < 250;
      });
      var bloodText = blood ? blood.textContent.trim() : "";
      if (!bloodText) {
        var fallback = (header.querySelector(".display-block.margin-5px-top") || {}).textContent || "";
        if (/[x×]/i.test(fallback)) bloodText = fallback.trim();
      }
      bloodText = bloodText.replace(/\s+[Xx×]\s+/g, " × ").replace(/\s+/g, " ").trim();
      var full = (source.textContent || header.textContent || "").replace(/\s+/g, " ");
      var match = full.match(/\b(mare|stallion|gelding|hengst|merrie|ruin)\b/i);
      var label = match ? match[1] : "";
      if (label) label = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
      var sign = /^(mare|merrie)$/i.test(label) ? "♀ " : /^(stallion|hengst)$/i.test(label) ? "♂ " : "";
      var birth = full.match(/\b\d{2}[-/.]\d{2}[-/.]\d{4}\b/);
      var date = birth ? birth[0] : "";
      if (isEmbryo) {
        label = embryoSex === "female" ? "Female Embryo" : embryoSex === "male" ? "Male Embryo" : "Embryo";
        sign = embryoSex === "female" ? "♀ " : embryoSex === "male" ? "♂ " : "";
        var expected = full.match(/(?:°|expected|due|verwacht)\s*(?:in\s*)?(20\d{2})\b/i);
        date = birth ? "Expected " + birth[0] : expected ? "Expected " + expected[1] : "";
      }
      if (!bloodText || (!isEmbryo && (!label || !birth))) continue;
      var card = document.createElement("div");
      card.className = "optimus-mobile-title-content";
      var nm = document.createElement("div");
      nm.className = "omt-name";
      nm.textContent = title;
      var line = document.createElement("div");
      line.className = "omt-line";
      line.textContent = bloodText;
      var info = document.createElement("div");
      info.className = "omt-info";
      var sex = document.createElement("span");
      sex.className = "omt-sex";
      sex.textContent = sign + label;
      info.appendChild(sex);
      if (date) {
        var dateNode = document.createElement("span");
        dateNode.className = "omt-date";
        dateNode.textContent = date;
        info.appendChild(dateNode);
      }
      card.appendChild(nm);
      card.appendChild(line);
      card.appendChild(info);
      header.appendChild(card);
      header.classList.add("optimus-mobile-title-ready");
      return;
    }
  }

  makeMobileTitle();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", makeMobileTitle, { once: true });
  }
  var bridge = document.createElement("script");
  bridge.src = origin + "/optimus-pweb.js";
  bridge.async = true;
  document.head.appendChild(bridge);
})();
