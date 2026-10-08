"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Header,Footer} from "../../components";
import {useAuctionLots} from "../../use-auction-lots";
import LiveBidPanel from "../../live-bid-panel";
import AuctionCountdown from "../../auction-countdown";
export default function LotPage({params}:{params:Promise<{slug:string}>}){
 const [slug,setSlug]=useState("");const lots=useAuctionLots();
 useEffect(()=>{let active=true;void params.then(p=>{if(active)setSlug(p.slug)});return()=>{active=false}},[params]);
 const lot=lots.find(x=>x.slug===slug);
 if(!lot)return <><Header/><main className="page"><div className="breadcrumbs"><Link href="/">HOME</Link> / <Link href="/foals">COLLECTION</Link></div><h1>LOT NOT AVAILABLE</h1><p>This lot is loading or is not published.</p></main><Footer/></>;
 const photos=[lot.image,...(lot.gallery_urls||[]).filter(x=>x!==lot.image)].filter(Boolean);
 return <><Header/><main className="page"><div className="breadcrumbs"><Link href="/">HOME</Link><span>/</span><Link href={lot.type==="FOAL"?"/foals":"/embryos"}>{lot.type==="FOAL"?"FOALS":"EMBRYOS"}</Link><span>/</span><b>{lot.name.toUpperCase()}</b></div><section className="lotHeader"><div><div className="kicker">LOT {lot.no} · {lot.type}</div><h1>{lot.name}</h1><p>{lot.pedigree}</p></div><div className="auctionEnd"><AuctionCountdown closesAt={lot.closes_at} status={lot.status}/><small>AUCTION ENDS</small><b>{lot.closes_at?new Date(lot.closes_at).toLocaleString("en-GB",{timeZone:"Europe/Brussels",dateStyle:"medium",timeStyle:"short"}):"TO BE ANNOUNCED"}</b></div></section><section className="lotLayout"><div className="mediaColumn"><div className="mainMedia">{lot.image&&<img src={lot.image} alt={lot.name}/>}<span>LOT {lot.no}</span></div>{photos.length>1&&<div className="auctionLotGallery">{photos.slice(1).map(url=><img key={url} src={url} alt={lot.name}/>)}</div>}<div className="facts"><div><small>TYPE</small><b>{lot.type}</b></div><div><small>SEX</small><b>{lot.sex||"—"}</b></div><div><small>YEAR</small><b>{lot.year||"—"}</b></div><div><small>LOCATION</small><b>Belgium</b></div></div><div className="description"><h3>ABOUT THIS LOT</h3><p>{lot.description}</p></div></div><aside className="bidPanel"><LiveBidPanel lot={lot}/></aside></section>{(lot.pedigree_url||lot.pedigree)&&<section className="pedigree"><div className="kicker">PEDIGREE</div><h2>Performance in every generation.</h2>{lot.pedigree_url?<iframe className="auctionAdminIframe" title={"Hippomundo pedigree for "+lot.name} src={lot.pedigree_url} loading="lazy" referrerPolicy="no-referrer"/>:<p>{lot.pedigree}</p>}</section>}{!!lot.video_urls?.length&&<section className="pedigree"><div className="kicker">VIDEOS</div><div className="auctionLotVideos">{lot.video_urls.map(url=><video key={url} src={url} controls preload="metadata"/>)}</div></section>}</main><Footer/></>;
}
