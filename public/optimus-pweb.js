/* Optimus Auction — central PWeb bridge. Change this file once for every installed lot. */
(function () {
  "use strict";

  if (window.__optimusPwebBridgeV1) return;
  var root = document.querySelector(".optimus-live-embed[data-optimus-site]");
  if (!root) return;
  var frame = root.querySelector("iframe.optimus-live-lot-iframe");
  if (!frame) return;
  window.__optimusPwebBridgeV1 = true;

  var site = root.getAttribute("data-optimus-site") === "be" ? "be" : "auction";
  var origin = "https://optimusauction.vercel.app";
  var oldOverflow = null;
  var sizes = (root.getAttribute("data-optimus-heights") || "").split(",").map(Number);
  var defaults = [2600, 3500, 4800, 5400, 5900, 6300, 6800];
  sizes = defaults.map(function (fallback, i) {
    return Number.isFinite(sizes[i]) && sizes[i] >= 200 && sizes[i] <= 20000 ? sizes[i] : fallback;
  });
  var crop = Number(root.getAttribute("data-optimus-crop"));
  if (!Number.isFinite(crop) || crop < 0 || crop > 20000) crop = 265;

  function addStyles() {
    if (document.getElementById("optimus-central-pweb-style")) return;
    var css = [
      ".optimus-live-embed,.optimus-live-wide{display:block!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin:0!important;padding:0!important;background:#fff!important;border:0!important;box-shadow:none!important}",
      ".optimus-live-embed iframe.optimus-live-lot-iframe{display:block!important;width:100%!important;max-width:100%!important;height:900px;border:0!important;margin:0!important;padding:0!important;background:#fff!important}",
      ".optimus-live-wide{clear:both!important}",
      ".optimus-live-wide:after{content:'';display:table;clear:both}",
      ".page-title-small{background:#000!important;background-color:#000!important;color:#fff!important;border-color:#000!important;box-shadow:none!important}",
      ".page-title-small h1,.page-title-small p,.page-title-small span,.page-title-small strong,.page-title-small label,.page-title-small .display-block{color:#fff!important}",
      ".optimus-pweb-native-videos-hidden{display:none!important;height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}",
      ".optimus-pweb-video-button{display:flex!important;align-items:center!important;gap:11px!important;width:100%!important;min-height:48px!important;box-sizing:border-box!important;padding:13px 18px!important;margin:0 0 9px!important;background:#111!important;color:#fff!important;border:0!important;border-radius:0!important;text-align:left!important;text-decoration:none!important;font:600 13px/1.4 Poppins,Montserrat,Arial,sans-serif!important;cursor:pointer!important}",
      ".optimus-pweb-video-button:hover{background:#282828!important;color:#fff!important}",
      ".optimus-pweb-video-button .optimus-pweb-play{color:#fff!important;flex:none}",
      ".optimus-pweb-vet-link{display:flex!important;align-items:center!important;min-height:48px!important;width:100%!important;box-sizing:border-box!important;background:#111!important;color:#fff!important;border:0!important;border-radius:0!important;padding:13px 18px!important;margin:0 0 9px!important;text-decoration:none!important;font:600 13px/1.4 Poppins,Montserrat,Arial,sans-serif!important}",
      ".optimus-pweb-vet-link *{color:#fff!important}",
      "#optimus-live-video-overlay{display:none!important;position:fixed!important;inset:0!important;z-index:2147483647!important;background:rgba(0,0,0,.93)!important;padding:16px!important;box-sizing:border-box!important;align-items:center!important;justify-content:center!important}",
      "#optimus-live-video-overlay.open{display:flex!important}",
      "#optimus-live-video-overlay .optimus-video-frame{width:min(96vw,800px)!important;aspect-ratio:16/9!important;position:relative!important}",
      "#optimus-live-video-overlay iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important}",
      "#optimus-live-video-overlay button{position:fixed!important;right:20px!important;top:20px!important;width:42px!important;height:42px!important;border:0!important;border-radius:50%!important;background:#fff!important;color:#111!important;font-size:26px!important;cursor:pointer!important}",
      "@media(max-width:767px){#optimus-live-video-overlay{padding:0!important}#optimus-live-video-overlay .optimus-video-frame{width:100vw!important}#optimus-live-video-overlay button{right:15px!important;top:calc(15px + env(safe-area-inset-top))!important}}",
      ".paard-foto .row.bg-light-gray.mr-0.ml-0.mb-15.padding-15px-all:empty{display:none!important}",
      "[id='IframeWrapper'].optimus-hippomundo-duplicate{display:none!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}",
      "#IframeWrapper:has(iframe.iframe-height-hippomundo),#IframeWrapper:has(iframe[src*='hippomundo.com']){height:calc(var(--optimus-hip-height) - var(--optimus-hip-crop))!important;min-height:calc(var(--optimus-hip-height) - var(--optimus-hip-crop))!important;max-height:calc(var(--optimus-hip-height) - var(--optimus-hip-crop))!important;overflow:hidden!important;background:#fff!important;border:0!important;margin-bottom:20px!important}",
      "#IframeWrapper iframe.iframe-height-hippomundo,#IframeWrapper iframe[src*='hippomundo.com']{display:block!important;width:100%!important;height:var(--optimus-hip-height)!important;min-height:var(--optimus-hip-height)!important;max-height:var(--optimus-hip-height)!important;margin-top:calc(0px - var(--optimus-hip-crop))!important;margin-bottom:0!important;padding:0!important;border:0!important}"
    ];
    var queries = [
      "", "(min-width:768px) and (max-width:991px)", "(min-width:600px) and (max-width:767px)",
      "(min-width:480px) and (max-width:599px)", "(min-width:431px) and (max-width:479px)",
      "(min-width:360px) and (max-width:430px)", "(max-width:359px)"
    ];
    queries.forEach(function (q, i) {
      var style = "#IframeWrapper{--optimus-hip-height:" + sizes[i] + "px!important;--optimus-hip-crop:" + crop + "px!important}";
      css.push(q ? "@media " + q + "{" + style + "}" : style);
    });
    var tag = document.createElement("style");
    tag.id = "optimus-central-pweb-style";
    tag.textContent = css.join("\n");
    document.head.appendChild(tag);
  }

  function findVideoPanel() {
    var nativePanel = document.getElementById("videos");
    if (nativePanel && nativePanel !== document.body &&
      nativePanel.querySelector("a,button") && !nativePanel.contains(root)) {
      return nativePanel;
    }
    var headings = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
    for (var i = 0; i < headings.length; i++) {
      if (!/^videos?$/i.test((headings[i].textContent || "").trim())) continue;
      var el = headings[i].parentElement;
      for (var j = 0; j < 6 && el && el !== document.body; j++, el = el.parentElement) {
        if (el.contains(root)) break;
        var r = el.getBoundingClientRect();
        if (r.width < 150 || r.height < 50 || r.height > 600) continue;
        if (el.querySelector("a[href]:not([href='#videos']),button")) return el;
      }
    }
    return null;
  }

  function findVetReport() {
    var links = Array.from(document.querySelectorAll("a[href]"));
    return links.find(function (link) {
      if (link.closest(".optimus-live-embed,#IframeWrapper")) return false;
      var text = ((link.textContent || "") + " " + (link.getAttribute("href") || "")).toLowerCase();
      return /vet[\s_-]*(check|report)|veterinary|veterinair|klinisch[\s_-]*verslag/.test(text);
    }) || null;
  }

  function moveNativeVideoActions() {
    if (document.getElementById("optimus-pweb-video-actions")) return true;
    var panel = findVideoPanel();
    var report = findVetReport();
    if (!panel || !report || panel.contains(report)) return false;
    var actions = Array.from(panel.querySelectorAll("a,button")).filter(function (node) {
      var label = (node.textContent || node.getAttribute("title") || node.getAttribute("aria-label") || "").trim();
      if (!label || /^videos?$|^close$|^sluiten$/i.test(label)) return false;
      var href = node.getAttribute("href");
      return href !== "#videos" && href !== "#IframeWrapper";
    });
    // Never remove access to a video if there is no usable original action.
    if (!actions.length || actions.length > 12) return false;

    var holder = document.createElement("div");
    holder.id = "optimus-pweb-video-actions";
    actions.forEach(function (native) {
      var label = (native.textContent || native.getAttribute("title") || native.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
      var button = document.createElement("button");
      button.type = "button";
      button.className = "optimus-pweb-video-button";
      button.setAttribute("aria-label", label);
      var symbol = document.createElement("span");
      symbol.className = "optimus-pweb-play";
      symbol.textContent = "▶";
      symbol.setAttribute("aria-hidden", "true");
      var text = document.createElement("span");
      text.textContent = label;
      button.appendChild(symbol);
      button.appendChild(text);
      button.addEventListener("click", function () { native.click(); });
      holder.appendChild(button);
    });
    report.classList.add("optimus-pweb-vet-link");
    report.insertAdjacentElement("afterend", holder);
    // Remove the complete grey Videos panel only after new actions exist.
    panel.classList.add("optimus-pweb-native-videos-hidden");
    return true;
  }

  function widenEmbed() {
    if (root.closest(".optimus-live-wide")) return;
    var node = root;
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains("row")) {
        var cols = Array.from(node.children).filter(function (child) {
          return child.matches('[class*="col-md-"],[class*="col-lg-"]');
        });
        var gallery = cols.find(function (child) {
          return child.contains(root) && child.matches(".col-lg-8,.col-md-8");
        });
        var auction = cols.find(function (child) {
          return child !== gallery && child.matches(".col-lg-4,.col-md-4");
        });
        if (gallery && auction && node.parentElement) {
          var former = root.parentElement;
          var wide = document.createElement("div");
          wide.className = "optimus-live-wide";
          node.insertAdjacentElement("afterend", wide);
          wide.appendChild(root);
          // Only remove an empty former HTML slot, never a photo or bid panel.
          var item = former;
          while (item && item !== gallery && gallery.contains(item)) {
            var next = item.parentElement;
            var text = (item.innerText || "").trim();
            if (!text && !item.querySelector("img,iframe,video,canvas,form,a,button")) {
              var r = item.getBoundingClientRect();
              if (r.height > 0 && r.height < 180 && r.width > 250) {
                item.style.setProperty("display", "none", "important");
              }
            }
            item = next;
          }
          return;
        }
      }
      node = node.parentElement;
    }
  }

  function normalizeHippomundo() {
    if (site !== "auction") return;
    var wrappers = Array.from(document.querySelectorAll('[id="IframeWrapper"]'))
      .filter(function (el) {
        return !!el.querySelector('iframe[src*="hippomundo" i],iframe.iframe-height-hippomundo');
      });
    if (!wrappers.length) return;
    var target = root.closest(".optimus-live-wide") || root;
    var keeper = wrappers.find(function (el) { return el.classList.contains("optimus-hippomundo-primary"); }) ||
      wrappers.find(function (el) { return target.contains(el); }) || wrappers[0];
    keeper.classList.add("optimus-hippomundo-primary");
    wrappers.forEach(function (el) {
      if (el !== keeper) el.classList.add("optimus-hippomundo-duplicate");
      else el.classList.remove("optimus-hippomundo-duplicate");
    });
    if (target.nextElementSibling !== keeper && !target.contains(keeper)) {
      target.insertAdjacentElement("afterend", keeper);
    }
  }

  function closeVideo() {
    var popup = document.getElementById("optimus-live-video-overlay");
    if (popup) {
      popup.classList.remove("open");
      var player = popup.querySelector("iframe");
      if (player) player.src = "about:blank";
    }
    if (oldOverflow !== null) {
      document.body.style.overflow = oldOverflow;
      oldOverflow = null;
    }
  }

  function openVideo(id) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || "")) return;
    var popup = document.getElementById("optimus-live-video-overlay");
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "optimus-live-video-overlay";
      popup.setAttribute("role", "dialog");
      popup.setAttribute("aria-modal", "true");
      popup.setAttribute("aria-label", "Paardenvideo");
      popup.innerHTML = '<div class="optimus-video-frame"><iframe title="Horse video" src="about:blank" allow="autoplay;encrypted-media;picture-in-picture;fullscreen" allowfullscreen></iframe></div><button type="button" aria-label="Close video">&times;</button>';
      document.body.appendChild(popup);
      popup.addEventListener("click", function (event) {
        if (event.target === popup || event.target.closest("button")) closeVideo();
      });
    }
    popup.querySelector("iframe").src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
    popup.classList.add("open");
    if (oldOverflow === null) oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== origin || event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "optimus:lot-height") {
      var height = Number(data.height);
      if (Number.isFinite(height) && height > 100 && height < 20000) {
        frame.style.setProperty("height", Math.ceil(height) + "px", "important");
      }
    }
    if (data.type === "optimus:hippomundo-jump") {
      var hip = document.getElementById("IframeWrapper");
      if (hip) hip.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (data.type === "optimus:pedigree-horse-video" && /^[A-Za-z0-9_-]{11}$/.test(data.videoId || "")) {
      openVideo(data.videoId);
      event.source.postMessage({ type: "optimus:pedigree-video-opened", videoId: data.videoId }, event.origin);
    }
  });

  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeVideo(); });

  function askHeight() {
    if (frame.contentWindow) frame.contentWindow.postMessage({ type: "optimus:lot-measure" }, origin);
  }

  function init() {
    addStyles();
    widenEmbed();
    moveNativeVideoActions();
    normalizeHippomundo();
    askHeight();
  }

  frame.addEventListener("load", askHeight);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
  window.addEventListener("load", init, { once: true });
  // PWeb can inject its Videos and vet-report links after initial rendering.
  window.setTimeout(moveNativeVideoActions, 600);
  window.setTimeout(moveNativeVideoActions, 1800);
  window.setTimeout(moveNativeVideoActions, 3500);
})();
