/* Optimus Auction: centrally published editable auction source. */
(function(){
 var script=document.createElement("script");
 script.src="https://optimusauction.vercel.app/api/pweb-source/auction";
 script.async=false;
 script.onerror=function(){var fallback=document.createElement("script");fallback.src="https://optimusauction.vercel.app/optimus-auction-pweb.base.js";document.head.appendChild(fallback);};
 document.head.appendChild(script);
})();
