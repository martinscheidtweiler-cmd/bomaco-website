"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {auctionSupabase} from "./auction-client";
type State={slug:string;name:string;image:string;no:string;current:number;close:string;cutoff:string;status:string;queueStart?:string;queueEnd?:string};
export default function LiveBidPanel({lot}:{lot:{slug:string;name:string;image:string;no:string;current:number}}){
 const [state,setState]=useState<State>({slug:lot.slug,name:lot.name,image:lot.image,no:lot.no,current:lot.current,close:"",cutoff:"",status:"draft"});
 const [amount,setAmount]=useState(lot.current+100);const [now,setNow]=useState(0);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{const client=auctionSupabase();if(!client)return;let alive=true;
  async function refresh(){if(!client)return;const {data}=await client.rpc("auction_public_lot",{p_slug:lot.slug});const d=Array.isArray(data)?data[0]:null;if(!alive||!d)return;
   const {data:cutoff}=await client.rpc("auction_reward_cutoff",{p_slug:lot.slug});if(!alive)return;setState(s=>({...s,current:Number(d.current_bid),close:d.closes_at,cutoff:typeof cutoff==="string"?cutoff:"",status:d.status}));setAmount(a=>Math.max(a,Number(d.current_bid)+100));
  }
  void refresh();const interval=setInterval(()=>{setNow(Date.now());void refresh()},2000);
  return()=>{alive=false;clearInterval(interval)};
 },[lot.slug]);
 const end=state.close?Date.parse(state.close):0;const cutoffAt=state.cutoff?Date.parse(state.cutoff):end-300000;const final=end>0&&now>=cutoffAt;const open=state.status==="live"&&end>now;const slotStart=state.queueStart?Date.parse(state.queueStart):0;const slotEnd=state.queueEnd?Date.parse(state.queueEnd):0;const turn=slotStart>0&&now>=slotStart&&now<slotEnd;
 async function join(){const client=auctionSupabase();if(!client){setMessage("Auction connection not configured");return}setBusy(true);setMessage("");const {data:{user}}=await client.auth.getUser();if(!user){window.location.href="/login";return}
 const {data,error}=await client.rpc("auction_join_queue",{p_slug:lot.slug});setBusy(false);if(error){setMessage(error.message);return}
 const q=Array.isArray(data)?data[0]:null;if(q){setState(s=>({...s,queueStart:q.slot_starts_at,queueEnd:q.slot_ends_at}));sessionStorage.setItem("optimus-live-queue",JSON.stringify({slug:lot.slug,name:lot.name,image:lot.image,no:lot.no,start:q.slot_starts_at,end:q.slot_ends_at}));window.dispatchEvent(new Event("optimus-live-queue-change"));}
 }
 async function bid(){const client=auctionSupabase();if(!client)return;setBusy(true);setMessage("");const {error}=await client.rpc("auction_place_bid",{p_slug:lot.slug,p_amount:amount});setBusy(false);setMessage(error?error.message:"Bid accepted.");if(!error){setState(s=>({...s,current:amount}));setAmount(amount+100);}}
 const potential=final?0:Math.max(0,(amount-state.current)*.1);
 return <><div className="status">{open?"LIVE AUCTION":state.status==="draft"?"AUCTION NOT OPEN":"AUCTION CLOSED"}</div><small>CURRENT BID</small><div className="currentBid">€{state.current.toLocaleString("en-IE")}</div><div className="earnInfo"><b>BID & EARN</b><p>{final?"FINAL AUCTION: No new rewards. Every accepted bid resets the countdown to five minutes.":"REWARD PHASE: Until five minutes before the original closing time, every accepted bid earns 10% of the increase. You keep it even if you are outbid."}</p></div><label>YOUR BID</label><div className="moneyInput"><span>€</span><input type="number" min={state.current+100} step="100" value={amount} onFocus={()=>{if(open&&!final&&(!state.queueEnd||now>=slotEnd))void join()}} onChange={e=>setAmount(Number(e.target.value))}/></div><p className="bidPhaseNote">{final?"FINAL AUCTION · OPEN BIDDING · EVERY BID RESETS THE CLOCK TO 5 MINUTES":"REWARD PHASE · REWARDS END 5 MINUTES BEFORE THE ORIGINAL CLOSING TIME"}</p><div className="potential"><div><small>YOU EARN WITH THIS BID</small><span>{final?"Rewards closed":"10% of the increase"}</span></div><b>€{potential.toLocaleString("en-IE")}</b></div>{open&&!final&&<div className="auctionQueueStatus">{state.queueEnd?(turn?"YOUR TURN · "+Math.ceil((slotEnd-now)/1000)+"s":now<slotStart?"YOUR TURN IN "+Math.ceil((slotStart-now)/1000)+"s":<button type="button" className="auctionJoinQueue" onClick={()=>void join()}>SLOT EXPIRED · JOIN AGAIN</button>):<button type="button" className="auctionJoinQueue" onClick={()=>void join()}>JOIN THE BIDDING QUEUE</button>}</div>}<button className="placeBid" disabled={!open||busy||(!final&&!turn)} onClick={()=>void bid()}>{busy?"PLEASE WAIT":"PLACE BID"}</button>{message&&<p role="status" className="demo">{message}</p>}<div className="loginLine"><Link href="/account">MY ACCOUNT</Link> · <Link href="/my-bids">MY BIDS</Link></div></>;
}
