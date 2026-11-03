import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const endpoint=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!endpoint||!key)return new NextResponse("/* Global PWeb config unavailable */",{headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-store"}});
  try {
    const response=await fetch(endpoint+"/rest/v1/optimus_auction_global_code?id=eq.main&select=published_css,published_js",{
      headers:{apikey:key,...(key.startsWith("eyJ")?{Authorization:"Bearer "+key}:{})},
      cache:"no-store",signal:AbortSignal.timeout(5000)
    });
    if(!response.ok)throw Error("config "+response.status);
    const data=await response.json() as {published_css:string;published_js:string}[];
    const row=data[0];
    const css=String(row?.published_css||"").slice(0,100000);
    const js=String(row?.published_js||"").slice(0,100000);
    const script="(function(){\n"+
      "var css="+JSON.stringify(css)+";\n"+
      "if(css){var s=document.createElement('style');s.id='optimus-global-published-css';s.textContent=css;document.head.appendChild(s);}\n"+
      "if("+JSON.stringify(Boolean(js))+"){\n"+js+"\n}\n"+
      "})();";
    return new NextResponse(script,{headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
  }catch{
    return new NextResponse("/* Global PWeb config temporarily unavailable */",{headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-store"}});
  }
}
