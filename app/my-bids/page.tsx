"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Header,Footer} from "../components";
import {auctionSupabase} from "../auction-client";
type Bid={id:string;lot_slug:string;lot_name:string;lot_image:string|null;lot_number:number;amount:number;previous_bid:number;reward_amount:number;created_at:string;outbid:boolean};
export default function MyBids(){const [rows,setRows]=useState<Bid[]>([]);const [message,setMessage]=useState("Loading bids...");
 useEffect(()=>{const client=auctionSupabase();if(!client){setMessage("Authentication is not configured yet.");return}
 void (async()=>{const {data:{user}}=await client.auth.getUser();if(!user){window.location.replace("/login");return}
 const {data,error}=await client.rpc("auction_my_bid_history");if(error)setMessage(error.message);else{setRows((data||[]) as Bid[]);setMessage("")}})()},[]);
 const grouped=Object.values(rows.reduce<Record<string,Bid[]>>((acc,b)=>{(acc[b.lot_slug]??=[]).push(b);return acc},{}));
 return <><Header/><main className="auctionAccountPage"><div className="auctionAccountHeading"><span>MEMBER AREA</span><h1>MY BIDS</h1></div><div className="auctionAccountTabs"><Link href="/account">MY ACCOUNT</Link><Link href="/my-bids" aria-current="page">MY BIDS</Link></div>{message&&<p role="status">{message}</p>}{!message&&grouped.length===0&&<div className="auctionEmpty">You haven't placed any bids yet. <Link href="/foals">Explore the collection →</Link></div>}{grouped.map(group=><section className="auctionBidHistory" key={group[0].lot_slug}><Link href={"/lot/"+group[0].lot_slug} className="auctionBidHorse">{group[0].lot_image&&<img src={group[0].lot_image} alt={group[0].lot_name}/>}<b>{group[0].lot_name}</b><small>LOT #{group[0].lot_number}</small></Link><div className="auctionBidEvents">{group.map(b=><div className="auctionBidEvent" key={b.id}><span className={b.outbid?"outbid":"leading"}>{b.outbid?"YOU WERE OUTBID":"YOUR BID"} · €{b.amount.toLocaleString("en-IE")}</span><span>{new Date(b.created_at).toLocaleString("en-GB")}</span><strong>{b.reward_amount>0?"+ €"+b.reward_amount.toLocaleString("en-IE")+" earned":""}</strong></div>)}</div></section>)}</main><Footer/></>}
