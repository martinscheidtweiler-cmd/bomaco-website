"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

type QueueState={lotSlug:string;lotName:string;lotImage:string;lotNo:number;position:number;startAt:number;endAt:number;currentBid:number};
const KEY="optimus-demo-queue";
export default function QueueWidget(){
 const [queue,setQueue]=useState<QueueState|null>(null);
 const [now,setNow]=useState(0);
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{
  const refresh=()=>{try{const raw=sessionStorage.getItem(KEY);setQueue(raw?JSON.parse(raw):null)}catch{setQueue(null)}};
  refresh();const tick=setInterval(()=>{setNow(Date.now());refresh()},250);
  window.addEventListener("optimus-queue-change",refresh);
  return()=>{clearInterval(tick);window.removeEventListener("optimus-queue-change",refresh)};
 },[]);
 if(!queue)return null;
 const remaining=Math.max(0,Math.ceil((queue.startAt-now)/1000));
 const active=now>=queue.startAt&&now<queue.endAt;
 const expired=now>=queue.endAt;
 return <aside className="queueFloat" aria-live="polite">
  <div className="queueFloatTop"><strong>BIDDING QUEUE · DEMO</strong><button onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed?"Expand queue":"Minimize queue"}>{collapsed?"+":"−"}</button></div>
  <Link href={"/lot/"+queue.lotSlug} className="queueFloatLot"><img src={queue.lotImage} alt={queue.lotName}/><span><b>{queue.lotName}</b><small>LOT {queue.lotNo} · CURRENT €{queue.currentBid.toLocaleString("en-US")}</small></span></Link>
  {!collapsed&&<><div className="queueFloatMetrics"><div><small>PEOPLE AHEAD</small><b>{expired?0:active?0:queue.position}</b></div><div><small>{expired?"STATUS":active?"YOUR TURN ENDS IN":"YOUR TURN IN"}</small><b>{expired?"EXPIRED":active?Math.ceil((queue.endAt-now)/1000)+"s":remaining+"s"}</b></div></div><p>{expired?"Your demo slot has ended.":active?"Your 10-second bidding slot is active.":"Your position is reserved. Earlier bidders cannot shorten your waiting time."}</p><button className="queueFloatLeave" onClick={()=>{sessionStorage.removeItem(KEY);window.dispatchEvent(new Event("optimus-queue-change"))}}>Close demo queue</button></>}
 </aside>;
}
export function startDemoQueue(lot:{slug:string;name:string;image:string;no:number;current:number},position=2){
 const startAt=Date.now()+position*10000;
 const q:QueueState={lotSlug:lot.slug,lotName:lot.name,lotImage:lot.image,lotNo:lot.no,position,startAt,endAt:startAt+10000,currentBid:lot.current};
 sessionStorage.setItem(KEY,JSON.stringify(q));window.dispatchEvent(new Event("optimus-queue-change"));
}
