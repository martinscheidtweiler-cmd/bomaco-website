import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get("q")||"").trim();
 if(q.length<4||q.length>120)return NextResponse.json({results:[]});
 try{
  const url=new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q",q);url.searchParams.set("limit","6");
  const response=await fetch(url,{headers:{"Accept":"application/json","User-Agent":"OptimusAuction/1.0 (address search)"},signal:AbortSignal.timeout(4500),next:{revalidate:120}});
  if(!response.ok)throw new Error("Address provider unavailable");
  const json=await response.json();
  const results=(Array.isArray(json.features)?json.features:[]).map((f:{properties?:Record<string,unknown>})=>{
   const p=f.properties||{};
   const street=String(p.street||p.name||"");
   const house=String(p.housenumber||"");
   const city=String(p.city||p.town||p.village||p.locality||"");
   const postal_code=String(p.postcode||"");
   const country=String(p.country||"");
   return {label:[street+(house?" "+house:""),postal_code,city,country].filter(Boolean).join(", "),street:street+(house?" "+house:""),city,postal_code,country};
  }).filter((r:{label:string;street:string;city:string;postal_code:string;country:string})=>r.label&&r.country);
  return NextResponse.json({results},{headers:{"Cache-Control":"public, max-age=60"}});
 }catch{return NextResponse.json({results:[],unavailable:true},{status:200})}
}
