"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {auctionSupabase} from "../../auction-client";

type Bid={id:string;lot_id:string;lot_name:string;lot_number:number;lot_slug:string;lot_status:string;closes_at:string;bidder_id:string;bidder_name:string;bidder_email:string;amount:number;previous_bid:number;reward_amount:number;created_at:string;is_highest:boolean};
const euro=(value:number)=>"€"+Number(value).toLocaleString("en-IE",{minimumFractionDigits:0,maximumFractionDigits:2});
const date=(value:string)=>new Date(value).toLocaleString("en-GB",{timeZone:"Europe/Brussels",dateStyle:"medium",timeStyle:"short"});
export default function AdminBids(){
 const [bids,setBids]=useState<Bid[]>([]),[lotId,setLotId]=useState("all"),[loading,setLoading]=useState(true),[error,setError]=useState(""),[allowed,setAllowed]=useState(false);
 useEffect(()=>{const client=auctionSupabase();if(!client){setError("Auction connection unavailable");setLoading(false);return}let active=true;
  async function load(){const {data,error:err}=await client!.rpc("auction_admin_bid_report");if(!active)return;if(err){setError(err.message);setLoading(false);return}setBids(Array.isArray(data)?data:[]);setAllowed(true);setError("");setLoading(false)}
  void load();const timer=setInterval(()=>void load(),5000);return()=>{active=false;clearInterval(timer)}
 },[]);
 const lots=useMemo(()=>Array.from(new Map(bids.map(b=>[b.lot_id,{id:b.lot_id,name:b.lot_name,no:b.lot_number}])).values()).sort((a,b)=>a.no-b.no),[bids]);
 const shown=lotId==="all"?bids:bids.filter(b=>b.lot_id===lotId);
 const top=shown.filter(b=>b.is_highest);
 return <main className="auctionAdmin"><header className="auctionAdminHeading"><div><small>OPTIMUS ONLINE AUCTION</small><h1>BID HISTORY</h1><p>Private administrator report · Refreshes every five seconds</p></div><Link href="/admin/auction">← MANAGE LOTS</Link></header>
 {loading?<p>Loading bid history...</p>:error?<p role="alert">{error} <Link href="/login">SIGN IN</Link></p>:allowed&&<>
 <div className="auctionBidToolbar"><label>FILTER BY LOT <select value={lotId} onChange={e=>setLotId(e.target.value)}><option value="all">ALL LOTS</option>{lots.map(l=><option key={l.id} value={l.id}>#{l.no} · {l.name}</option>)}</select></label><strong>{shown.length} ACCEPTED BIDS</strong></div>
 <section className="auctionAdminWinners"><h2>HIGHEST BIDDERS</h2>{top.length===0?<p>No accepted bids yet.</p>:top.map(b=>{const ended=b.lot_status==="closed"||Date.parse(b.closes_at)<=Date.now();return <div className="auctionAdminWinner" key={b.lot_id}><div><b>#{b.lot_number} · {b.lot_name}</b><small>{ended?"AUCTION ENDED · RESULT PENDING CONFIRMATION":"CURRENT LEADER · AUCTION STILL OPEN"}</small></div><div><b>{b.bidder_name}</b><small>{b.bidder_email}</small></div><strong>{euro(b.amount)}</strong></div>})}<p className="auctionAdminDisclaimer">The highest bidder is not automatically a confirmed buyer. Payment and transfer must be verified separately.</p></section>
 <section className="auctionBidHistory"><h2>ALL ACCEPTED BIDS</h2><div className="auctionBidTableWrap"><table><thead><tr><th>DATE / TIME</th><th>LOT</th><th>BIDDER</th><th>PREVIOUS BID</th><th>NEW BID</th><th>REWARD</th><th>STATUS</th></tr></thead><tbody>{shown.map(b=><tr key={b.id}><td>{date(b.created_at)}</td><td><Link href={"/lot/"+b.lot_slug}>#{b.lot_number} · {b.lot_name}</Link></td><td><b>{b.bidder_name}</b><small>{b.bidder_email}</small></td><td>{euro(b.previous_bid)}</td><td><b>{euro(b.amount)}</b></td><td>{euro(b.reward_amount)}</td><td>{b.is_highest?"HIGHEST BID":"OUTBID"}</td></tr>)}</tbody></table>{shown.length===0&&<p>No accepted bids found for this selection.</p>}</div></section></>}</main>;
}
