"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
type Queue={slug:string;name:string;image:string;no:string;start:string;end:string};
export default function LiveQueueWidget(){
 const [queue,setQueue]=useState<Queue|null>(null);const [now,setNow]=useState(0);const [small,setSmall]=useState(false);
 useEffect(()=>{function sync(){try{const raw=sessionStorage.getItem("optimus-live-queue");setQueue(raw?JSON.parse(raw):null)}catch{setQueue(null)}}
 sync();const t=setInterval(()=>{setNow(Date.now());sync()},500);window.addEventListener("optimus-live-queue-change",sync);
 return()=>{clearInterval(t);window.removeEventListener("optimus-live-queue-change",sync)}},[]);
 if(!queue)return null;
 const start=Date.parse(queue.start),end=Date.parse(queue.end);const remaining=now<start?Math.ceil((start-now)/1000):Math.max(0,Math.ceil((end-now)/1000));
 const label=now<start?"YOUR TURN IN":now<end?"YOUR TURN ENDS IN":"SLOT ENDED";
 return <aside className="queueFloat" aria-live="polite"><div className="queueFloatTop"><strong>OPTIMUS · BIDDING QUEUE</strong><button onClick={()=>setSmall(!small)} aria-label="Toggle queue">{small?"+":"−"}</button></div><Link className="queueFloatLot" href={"/lot/"+queue.slug}>{queue.image?<img src={queue.image} alt={queue.name}/>:<span className="queueFloatPlaceholder">O</span>}<span><b>{queue.name}</b><small>LOT #{queue.no}</small></span></Link>{!small&&<><div className="queueFloatMetrics"><div><small>{label}</small><b>{remaining}s</b></div></div><p>{now<start?"Your reserved bidding turn will start at the displayed time.":now<end?"Your exclusive ten-second turn is active.":"Your reserved turn has ended. Return to the lot to join again if the reward phase is still open."}</p><button className="queueFloatLeave" onClick={()=>{sessionStorage.removeItem("optimus-live-queue");window.dispatchEvent(new Event("optimus-live-queue-change"))}}>DISMISS</button></>}</aside>;
}
