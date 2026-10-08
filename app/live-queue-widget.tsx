"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
type Queue={slug:string;name:string;image:string;no:string;start:string;end:string};
export default function LiveQueueWidget(){
 const pathname=usePathname();
 const [queue,setQueue]=useState<Queue|null>(null);const [now,setNow]=useState(0);const [small,setSmall]=useState(false);
 useEffect(()=>{function sync(){try{const raw=sessionStorage.getItem("optimus-live-queue");const saved:Queue|null=raw?JSON.parse(raw):null;if(!saved||!saved.slug||!Number.isFinite(Date.parse(saved.end))||Date.parse(saved.end)<=Date.now()){if(raw)sessionStorage.removeItem("optimus-live-queue");setQueue(null);return}setQueue(saved)}catch{sessionStorage.removeItem("optimus-live-queue");setQueue(null)}}
 sync();const t=setInterval(()=>{setNow(Date.now());sync()},500);window.addEventListener("optimus-live-queue-change",sync);
 return()=>{clearInterval(t);window.removeEventListener("optimus-live-queue-change",sync)}},[]);
 if(!queue||now>=Date.parse(queue.end)||pathname==="/lot/"+queue.slug||pathname==="/lot/"+queue.slug+"/")return null;
 const start=Date.parse(queue.start),end=Date.parse(queue.end);const remaining=now<start?Math.ceil((start-now)/1000):Math.max(0,Math.ceil((end-now)/1000));
 const label=now<start?"YOUR TURN IN":"YOUR TURN ENDS IN";
 return <aside className="queueFloat" aria-live="polite"><div className="queueFloatTop"><strong>OPTIMUS · BIDDING QUEUE</strong><button onClick={()=>setSmall(!small)} aria-label="Toggle queue">{small?"+":"−"}</button></div><Link className="queueFloatLot" href={"/lot/"+queue.slug}>{queue.image?<img src={queue.image} alt={queue.name}/>:<span className="queueFloatPlaceholder">O</span>}<span><b>{queue.name}</b><small>LOT #{queue.no}</small></span></Link>{!small&&<><div className="queueFloatMetrics"><div><small>{label}</small><b>{remaining}s</b></div></div><p>{now<start?"Your reserved bidding turn will start at the displayed time.":"Your exclusive fifteen-second turn is active. Return to the lot to place your bid."}</p><button className="queueFloatLeave" onClick={()=>{sessionStorage.removeItem("optimus-live-queue");window.dispatchEvent(new Event("optimus-live-queue-change"))}}>DISMISS</button></>}</aside>;
}
