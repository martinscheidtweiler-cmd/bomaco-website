"use client";
import {useEffect,useState} from "react";

export default function AuctionCountdown({closesAt,status,compact=false}:{closesAt?:string;status:string;compact?:boolean}){
 const [now,setNow]=useState<number|null>(null);
 useEffect(()=>{const tick=()=>setNow(Date.now());tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer)},[]);
 const end=closesAt?Date.parse(closesAt):NaN;
 const remaining=now!==null&&Number.isFinite(end)?Math.max(0,Math.ceil((end-now)/1000)):null;
 const ended=status==="closed"||(remaining!==null&&remaining===0);
 const days=remaining===null?0:Math.floor(remaining/86400);
 const hours=remaining===null?0:Math.floor((remaining%86400)/3600);
 const minutes=remaining===null?0:Math.floor((remaining%3600)/60);
 const seconds=remaining===null?0:remaining%60;
 const label=ended?"AUCTION CLOSED":status==="live"?"TIME REMAINING":"AUCTION COUNTDOWN";
 return <div className={"optimusCountdown"+(compact?" optimusCountdownCompact":"")} role="timer" aria-label={label}>
  <small>{label}</small>
  {ended?<strong className="optimusCountdownEnded">CLOSED</strong>:remaining===null?<strong className="optimusCountdownPending">{closesAt?"LOADING...":"TO BE ANNOUNCED"}</strong>:<div className="optimusCountdownDigits">
   {[["DAYS",days],["HRS",hours],["MIN",minutes],["SEC",seconds]].map(([unit,value])=><span key={unit}><b>{String(value).padStart(2,"0")}</b><em>{unit}</em></span>)}
  </div>}
 </div>;
}
