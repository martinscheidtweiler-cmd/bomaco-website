/* Optimus Auction — approved shared .auction layout.
   Runs only for the auction template; never touches stal-optimus.be. */
(function () {
  "use strict";
  var lot = document.querySelector('.optimus-live-embed[data-optimus-site="auction"]');
  if (!lot || window.__optimusAuctionPolishedV1) return;
  window.__optimusAuctionPolishedV1 = true;

  var css = [
    '.optimus-auction-vet-parent{background:#fff!important;background-color:#fff!important;background-image:none!important;border:0!important;box-shadow:none!important;padding-top:0!important;padding-bottom:0!important}',
    '.optimus-auction-vet-parent.optimus-auction-vet-tight{padding:0!important}',
    'body:has(.optimus-live-embed[data-optimus-site="auction"]) .paard-foto .padding-20px-top.padding-20px-bottom.width-100.pull-left.bg-light-gray.mb-15{background:#fff!important;background-color:#fff!important;background-image:none!important;box-shadow:none!important;border-color:transparent!important}',
    'body:has(.optimus-live-embed[data-optimus-site="auction"]) .paard-foto .padding-20px-top.width-100.pull-left.bg-light-gray.mb-15:has(h5){background:#fff!important;background-color:#fff!important;box-shadow:none!important}',
    '.optimus-auction-vet-report,.optimus-auction-vet-report:link,.optimus-auction-vet-report:hover,.optimus-auction-vet-report:visited{display:grid!important;grid-template-columns:18px minmax(0,1fr)!important;column-gap:12px!important;align-items:center!important;justify-items:start!important;width:100%!important;max-width:100%!important;min-height:52px!important;height:auto!important;box-sizing:border-box!important;padding:14px 18px!important;margin:0!important;background:#111!important;color:#fff!important;border:0!important;border-radius:0!important;text-align:left!important;text-decoration:none!important;font:600 13px/1.4 Poppins,Montserrat,Arial,sans-serif!important}',
    '.optimus-auction-vet-report *,.optimus-auction-vet-report:hover *{color:#fff!important}',
    '.optimus-auction-video-holder{display:block!important;float:none!important;position:static!important;width:100%!important;max-width:100%!important;margin:9px 0 12px!important;padding:0!important;box-sizing:border-box!important;background:#fff!important;border:0!important;box-shadow:none!important}',
    '.optimus-auction-video-button,.optimus-auction-video-button:hover,.optimus-auction-video-button:focus{display:grid!important;grid-template-columns:18px minmax(0,1fr)!important;column-gap:12px!important;align-items:center!important;justify-items:start!important;width:100%!important;max-width:100%!important;min-height:52px!important;height:auto!important;box-sizing:border-box!important;margin:0!important;padding:14px 18px!important;background:#111!important;color:#fff!important;border:0!important;border-radius:0!important;text-align:left!important;text-decoration:none!important;font:600 13px/1.4 Poppins,Montserrat,Arial,sans-serif!important;cursor:pointer!important}',
    '.optimus-auction-video-button > span:first-child,.optimus-auction-vet-report > i:first-child,.optimus-auction-vet-report > span:first-child,.optimus-auction-vet-report > svg:first-child{grid-column:1!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:18px!important;min-width:18px!important;max-width:18px!important;margin:0!important;padding:0!important;line-height:1!important;text-align:center!important}',
    '.optimus-auction-video-button > span:last-child{grid-column:2!important;display:inline-flex!important;align-items:baseline!important;justify-content:flex-start!important;flex-wrap:wrap!important;column-gap:8px!important;row-gap:2px!important;min-width:0!important;line-height:1.4!important;text-align:left!important}',
    '.optimus-auction-video-kind{display:inline-block!important;align-self:baseline!important;flex:0 0 auto!important;font:400 11px/1.4 Poppins,Montserrat,Arial,sans-serif!important;color:#b7b7b7!important;white-space:nowrap!important;margin:0!important;padding:0!important;letter-spacing:0!important;text-transform:none!important}',
    '.optimus-auction-vet-report.optimus-auction-multi-document{margin-bottom:9px!important}',
    '.optimus-auction-video-button + .optimus-auction-video-button{margin-top:9px!important}',
    '.optimus-auction-hidden-panel{display:none!important;height:0!important;min-height:0!important;padding:0!important;margin:0!important;overflow:hidden!important}',
    '@media(max-width:767px){.page-title-small.optimus-mobile-title-ready .optimus-mobile-title-content .omt-sex{font-size:19px!important}}'
  ].join("\n");
  var style = document.createElement("style");
  style.id = "optimus-auction-polished-css";
  style.textContent = css;
  document.head.appendChild(style);

  function visible(node) {
    if (!node || !node.isConnected) return false;
    var rect = node.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5) return false;
    for (var el = node; el && el !== document.documentElement; el = el.parentElement) {
      var computed = window.getComputedStyle(el);
      if (computed.display === "none" || computed.visibility === "hidden") return false;
    }
    return true;
  }

  // A lot can have several reports (vet, X-rays, certificates, etc.).
  // Keep its original labels whenever more than one distinct file is present.
  function isVeterinaryFile(link) {
    var label=link.getAttribute("data-optimus-vet-original")||link.textContent||"";
    var href=link.getAttribute("href")||"";
    return /vet[\s_-]*(?:check|report)|veterinary|veterinair|klinisch[\s_-]*verslag/i.test(label+" "+href);
  }

  function reports(onlyVisible) {
    var links=Array.from(document.querySelectorAll("a[href]"));
    var fileRoots=links.filter(function(link) { return isVeterinaryFile(link); }).map(function(link) {
      return link.closest(".padding-20px-top.padding-20px-bottom.width-100.pull-left.bg-light-gray.mb-15,.optimus-download-parent") ||
        link.closest(".bg-light-gray,.bg-light-grey");
    }).filter(Boolean);

    return links.filter(function(link) {
      if(link.closest(".optimus-live-embed,#IframeWrapper,#videos,.optimus-auction-video-holder"))return false;
      if(onlyVisible&&!visible(link))return false;
      var href=link.getAttribute("href")||"";
      var text=link.getAttribute("data-optimus-vet-original")||link.textContent||"";
      var fileHref=/\/userfiles\/file\/(?:paard\/)?/i.test(href) ||
        /\.(?:pdf|docx?|xlsx?|zip|txt)(?:[?#]|$)/i.test(href) || link.hasAttribute("download");
      if(/\.(?:mp4|mov|avi|webm|jpe?g|png|gif|webp)(?:[?#]|$)/i.test(href))return false;
      if(isVeterinaryFile(link))return true;
      var samePanel=fileRoots.some(function(root){return root.contains(link);});
      var namedDocument=/x[\s-]?rays?|radiograph|document|medical|klinisch|veterinary|veterinair|certificate|scan|ultrasound|passport|pregnancy|echo|report/i.test(text);
      return fileHref && (samePanel || /\/userfiles\/file\/paard\//i.test(href) || namedDocument);
    });
  }

  function distinctCount(links) {
    var keys=new Set();
    links.forEach(function(link) {
      var name=(link.getAttribute("data-optimus-vet-original")||link.textContent||"").replace(/\s+/g," ").trim().toLowerCase();
      var href=(link.getAttribute("href")||"").trim();
      keys.add(href || name);
    });
    return keys.size;
  }

  function formatReport(link, isOnlyDocument) {
    if(!link)return;
    link.classList.add("optimus-auction-vet-report");
    if(!link.hasAttribute("data-optimus-vet-original"))
      link.setAttribute("data-optimus-vet-original",(link.textContent||"").trim());
    var originally=link.getAttribute("data-optimus-vet-original")||"";
    var walker=document.createTreeWalker(link,NodeFilter.SHOW_TEXT);
    var nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    var target=nodes.find(function(node){
      return /vet[\s_-]*(?:check|report)|veterinary|veterinair/i.test(node.nodeValue||"");
    });
    if(isOnlyDocument && isVeterinaryFile(link)){
      link.setAttribute("aria-label","Vet report");
      if(target && !/^\s*VET REPORT\s*$/.test(target.nodeValue||"")){
        var prefix=((target.nodeValue||"").match(/^\s*[↓⇩↧⬇]*\s*/)||[""])[0];
        target.nodeValue=prefix+"VET REPORT";
      }
    }else{
      // Multiple files: do not rename any of them, including the vet check.
      if(link.getAttribute("aria-label")==="Vet report")link.setAttribute("aria-label",originally);
      if(target && /^\s*VET REPORT\s*$/.test(target.nodeValue||"") && originally &&
        !/^\s*VET REPORT\s*$/i.test(originally))target.nodeValue=originally;
    }
    link.classList.toggle("optimus-auction-multi-document",!isOnlyDocument);

    // Remove the grey background only from the file block, never gallery/bid rows.
    var parent=link.parentElement;
    for(var i=0;i<7&&parent&&parent!==document.body;i++,parent=parent.parentElement){
      if(parent.classList&&(parent.classList.contains("bg-light-gray")||
          parent.classList.contains("bg-light-grey"))&&
          !parent.querySelector("img,iframe,video,form,.page-title-small")){
        parent.classList.add("optimus-auction-vet-parent");
        if(parent.classList.contains("padding-20px-top")&&parent.classList.contains("padding-20px-bottom"))
          parent.classList.add("optimus-auction-vet-tight");
      }
      if(parent.classList&&parent.classList.contains("paard-foto"))break;
    }
  }

  function videoPanels(onlyVisible) {
    return Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).filter(function (heading) {
      return /^videos?$/i.test((heading.textContent || "").trim()) && (!onlyVisible || visible(heading));
    }).map(function (heading) {
      return heading.closest(".padding-20px-top.width-100.pull-left.bg-light-gray,.padding-20px-top.width-100.pull-left.bg-light-grey") ||
        heading.closest(".bg-light-gray,.bg-light-grey");
    }).filter(function (panel) {
      return panel && !panel.contains(lot) && !panel.querySelector(".page-title-small,.optimus-live-embed") &&
        (!onlyVisible || visible(panel));
    });
  }

  function videoActions(panel) {
    if (!panel) return [];
    var nodes = Array.from(panel.querySelectorAll("a,button,[role='button'],[onclick],[data-toggle],[data-target],.btn"));
    var candidates = nodes.filter(function (node) {
      var text = (node.textContent || node.getAttribute("aria-label") || node.getAttribute("title") || "").replace(/\s+/g, " ").trim();
      var href = node.getAttribute("href") || "";
      return text.length > 2 && text.length < 120 && !/^videos?$|^close$|^sluiten$/i.test(text) &&
        href !== "#videos" && href !== "#IframeWrapper";
    });
    candidates = candidates.filter(function (node) {
      return !candidates.some(function (child) { return child !== node && node.contains(child); });
    });
    if (candidates.length) return candidates.slice(0, 10);
    var leaf = Array.from(panel.querySelectorAll("span,label,strong,div,p")).find(function (el) {
      return /leg\s+conformation\s*(?:&|and)\s*walk/i.test(el.textContent || "") &&
        !Array.from(el.children).some(function (child) {
          return /leg\s+conformation\s*(?:&|and)\s*walk/i.test(child.textContent || "");
        });
    });
    var native = leaf && (leaf.closest("a,button,[role='button'],[onclick],[data-toggle],[data-target],.btn") || leaf.parentElement);
    return native && native !== panel ? [native] : [];
  }

  function videoActionKey(node) {
    var label=(node.textContent||node.getAttribute("aria-label")||node.getAttribute("title")||"").replace(/\s+/g," ").trim().toLowerCase();
    var href=node.getAttribute("href")||node.getAttribute("onclick")||node.getAttribute("data-video-id")||node.getAttribute("data-youtube-id")||"";
    return label+"|"+href;
  }

  function distinctVideoActions() {
    var seen=new Set(),actions=[];
    videoPanels(false).forEach(function(panel){
      videoActions(panel).forEach(function(action){
        var key=videoActionKey(action);
        if(seen.has(key))return;
        seen.add(key);
        actions.push(action);
      });
    });
    return actions.slice(0,20);
  }

  function bindVideoReference(button,native) {
    if(!native)return;
    // Read this button's own URL first. A shared parent may contain
    // multiple video URLs, so it must not supply a different video's ID.
    var id=findYoutubeId(native.outerHTML);
    if(!id&&native.parentElement){
      var siblings=native.parentElement.querySelectorAll("a,button,[role='button'],[onclick],[data-toggle],[data-target],.btn");
      if(siblings.length===1)id=findYoutubeId(native.parentElement.outerHTML);
    }
    if(id)button.setAttribute("data-optimus-youtube-id",id);
  }

  function addVideoButton(holder,native) {
    var label=(native.textContent||native.getAttribute("aria-label")||"LEG CONFORMATION & WALK").replace(/\s+/g," ").trim();
    if(!label||label.length>120)label="LEG CONFORMATION & WALK";
    var button=document.createElement("button");
    button.type="button";
    button.setAttribute("aria-label",label);
    var icon=document.createElement("span");
    icon.textContent="▶";
    icon.setAttribute("aria-hidden","true");
    var title=document.createElement("span");
    title.textContent=label;
    button.appendChild(icon);
    button.appendChild(title);
    bindVideoReference(button,native);
    button.addEventListener("click",function(){native.click();});
    holder.appendChild(button);
    return button;
  }

  function ensureAllVideoButtons(holder) {
    if(!holder)return;
    var actions=distinctVideoActions();
    var buttons=Array.from(holder.querySelectorAll("button"));
    var used=new Set();
    actions.forEach(function(native) {
      var text=(native.textContent||native.getAttribute("aria-label")||"").replace(/\s+/g," ").trim().toLowerCase();
      var match=buttons.find(function(button) {
        if(used.has(button))return false;
        return (button.getAttribute("aria-label")||"").replace(/\s+/g," ").trim().toLowerCase()===text;
      });
      if(match){
        used.add(match);
        bindVideoReference(match,native);
      }else{
        var added=addVideoButton(holder,native);
        used.add(added);
        buttons.push(added);
      }
    });
  }

  function decorate(holder) {
    if(!holder)return;
    holder.classList.add("optimus-auction-video-holder");
    var buttons=Array.from(holder.querySelectorAll("button"));
    var multiple=distinctVideoActions().length>1||buttons.length>1;
    buttons.forEach(function(button){
      button.classList.add("optimus-auction-video-button");
      var spans=Array.from(button.children).filter(function(el){return el.tagName==="SPAN";});
      var label=spans[spans.length-1];
      if(!label||label===spans[0])return;
      var existing=label.querySelector(".optimus-auction-video-kind");
      if(multiple){
        // Several videos: keep every exact original video title.
        if(existing)existing.remove();
        return;
      }
      if(existing)return;
      var kind=document.createElement("small");
      kind.className="optimus-auction-video-kind";
      kind.textContent="video";
      label.appendChild(kind);
    });
  }

  function makeHolder(report,panel,id) {
    var actions=videoActions(panel);
    if(!actions.length||!report||panel.contains(report))return null;
    var holder=document.createElement("div");
    holder.id=id;
    actions.forEach(function(native){addVideoButton(holder,native);});
    if(!holder.children.length)return null;
    report.insertAdjacentElement("afterend",holder);
    ensureAllVideoButtons(holder);
    decorate(holder);
    panel.classList.add("optimus-auction-hidden-panel");
    return holder;
  }

  function findYoutubeId(raw) {
    var text = String(raw || "").replace(/&amp;/g, "&").replace(/\\\//g, "/");
    var attempts = [text];
    try { attempts.push(decodeURIComponent(text)); } catch (_e) {}
    for (var i = 0; i < attempts.length; i++) {
      var id = attempts[i].match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|live\/|watch\?(?:[^\s"'<>]*?&)?v=)|[?&]v=)([a-zA-Z0-9_-]{11})/i);
      if (id) return id[1];
      id = attempts[i].match(/(?:youtube|video)[- _]?(?:id|url)?["'\s:=,()]+([a-zA-Z0-9_-]{11})(?![\w-])/i);
      if (id) return id[1];
    }
    return null;
  }

  function youtubeForButton(button) {
    var direct=button.getAttribute("data-optimus-youtube-id");
    if(direct && /^[A-Za-z0-9_-]{11}$/.test(direct))return direct;

    var label=(button.getAttribute("aria-label")||button.textContent||"").replace(/\s+video\s*$/i,"").toLowerCase().trim();
    var matches=distinctVideoActions().filter(function(action){
      return (action.textContent||action.getAttribute("aria-label")||"").replace(/\s+/g," ").trim().toLowerCase()===label;
    });
    if(matches.length===1){
      var one=matches[0];
      var id=findYoutubeId(one.outerHTML);
      if(!id&&one.parentElement){
        var siblings=one.parentElement.querySelectorAll("a,button,[role='button'],[onclick],[data-toggle],[data-target],.btn");
        if(siblings.length===1)id=findYoutubeId(one.parentElement.outerHTML);
      }
      if(id)return id;
    }
    // With several videos, never guess and play the wrong one.
    // Its original PWeb click handler remains a functional fallback.
    if(distinctVideoActions().length!==1)return null;
    var panels=videoPanels(false);
    for(var i=0;i<panels.length;i++){
      var fromPanel=findYoutubeId(panels[i].outerHTML);
      if(fromPanel)return fromPanel;
    }
    return null;
  }

  function openPopup(id) {
    var overlay = document.getElementById("optimus-live-video-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "optimus-live-video-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Horse video");
      overlay.innerHTML = '<div class="optimus-video-frame"><iframe title="Horse video" src="about:blank" allow="autoplay;encrypted-media;picture-in-picture;fullscreen" allowfullscreen></iframe></div><button type="button" aria-label="Close video">&times;</button>';
      document.body.appendChild(overlay);
    }
    if (!overlay.__optimusAuctionCloseBound) {
      overlay.__optimusAuctionCloseBound = true;
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay || event.target.closest("#optimus-live-video-overlay > button")) closePopup();
      });
    }
    var player = overlay.querySelector("iframe");
    if (!player) return;
    player.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
    if (oldBodyOverflow === null) oldBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlay.classList.add("open");
  }

  var oldBodyOverflow = null;
  function closePopup() {
    var overlay = document.getElementById("optimus-live-video-overlay");
    if (overlay) {
      overlay.classList.remove("open");
      var player = overlay.querySelector("iframe");
      if (player) player.src = "about:blank";
    }
    if (oldBodyOverflow !== null) { document.body.style.overflow = oldBodyOverflow; oldBodyOverflow = null; }
  }

  document.addEventListener("click", function (event) {
    var source = event.target;
    if (!source || !source.closest) return;
    var button = source.closest("#optimus-pweb-video-actions button,#optimus-auction-desktop-video-actions button,#optimus-auction-mobile-video-actions button");
    if (!button) return;
    var id = youtubeForButton(button);
    if (!id) return; // PWeb's original link remains functional as a fallback.
    event.preventDefault();
    event.stopImmediatePropagation();
    openPopup(id);
  }, true);
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closePopup(); });

  function apply() {
    var docs=reports(false);
    var count=distinctCount(docs);
    docs.forEach(function(link){formatReport(link,count<=1);});

    var central=document.getElementById("optimus-pweb-video-actions");
    if(central){
      ensureAllVideoButtons(central);
      decorate(central);
    }
    var visibleDocs=reports(true);
    // Place the video list after the *last* visible document.
    var report=visibleDocs[visibleDocs.length-1];
    if(!report)return;

    var holder=central&&central.querySelector("button")?central:
      document.getElementById(window.matchMedia("(max-width:767px)").matches?
        "optimus-auction-mobile-video-actions":"optimus-auction-desktop-video-actions");

    if(holder && holder.querySelector("button")){
      if(holder.previousElementSibling!==report)report.insertAdjacentElement("afterend",holder);
      ensureAllVideoButtons(holder);
      decorate(holder);
      // Hide only those native panels whose actions have working replacements.
      videoPanels(true).forEach(function(panel){
        var natives=videoActions(panel);
        if(natives.length&&Array.from(holder.querySelectorAll("button")).length>=natives.length &&
            !panel.contains(holder))panel.classList.add("optimus-auction-hidden-panel");
      });
      return;
    }
    var panel=videoPanels(true)[0];
    if(!panel)return;
    makeHolder(report,panel,window.matchMedia("(max-width:767px)").matches?
      "optimus-auction-mobile-video-actions":"optimus-auction-desktop-video-actions");
  }

  function begin() {
    apply();
    [200,650,1500,3000,5500,8500].forEach(function (delay) { window.setTimeout(apply, delay); });
    window.addEventListener("resize", apply, {passive:true});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", begin, {once:true});
  else begin();
})();
