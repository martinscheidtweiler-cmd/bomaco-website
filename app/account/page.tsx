"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Header,Footer} from "../components";
import {auctionSupabase} from "../auction-client";
type Profile={full_name:string;phone:string;country:string;city:string;postal_code:string;street:string};
const empty:Profile={full_name:"",phone:"",country:"",city:"",postal_code:"",street:""};
export default function Account(){
 const [email,setEmail]=useState("");const [profile,setProfile]=useState<Profile>(empty);const [earned,setEarned]=useState<number|null>(null);const [message,setMessage]=useState("");const [ready,setReady]=useState(false);
 useEffect(()=>{const client=auctionSupabase();if(!client){setMessage("Authentication is not configured yet.");setReady(true);return}
 void (async()=>{const {data:{user}}=await client.auth.getUser();if(!user){window.location.replace("/login");return}
 setEmail(user.email||"");setProfile({...empty,...Object.fromEntries(Object.keys(empty).map(k=>[k,typeof user.user_metadata?.[k]==="string"?user.user_metadata[k]:""]))} as Profile);
 const {data}=await client.rpc("auction_my_total_earned");if(typeof data==="number")setEarned(data);setReady(true)})()},[]);
 async function save(e:React.FormEvent){e.preventDefault();const client=auctionSupabase();if(!client)return;const {error}=await client.auth.updateUser({data:profile});setMessage(error?error.message:"Account details saved.")}
 async function signOut(){await auctionSupabase()?.auth.signOut();window.location.href="/"}
 return <><Header/><main className="auctionAccountPage"><div className="auctionAccountHeading"><span>MEMBER AREA</span><h1>MY ACCOUNT</h1><p>Manage your details and follow your bids.</p></div><div className="auctionAccountTabs"><Link href="/account" aria-current="page">MY ACCOUNT</Link><Link href="/my-bids">MY BIDS</Link><button onClick={signOut}>LOG OUT</button></div>{ready&&<><section className="auctionAccountSummary"><div><small>TOTAL EARNED</small><strong>{earned===null?"—":"€"+earned.toLocaleString("en-IE",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div><p>Rewards earned from eligible bids. Payments are handled separately.</p></section><form onSubmit={save} className="auctionAccountForm"><h2>1. ACCOUNT</h2><label>Email<input value={email} disabled type="email"/></label><h2>2. PERSONAL INFORMATION</h2><div className="auctionAccountFields">{(Object.keys(empty) as (keyof Profile)[]).map(k=><label key={k}>{k.replaceAll("_"," ").toUpperCase()}<input value={profile[k]} onChange={e=>setProfile(p=>({...p,[k]:e.target.value}))}/></label>)}</div><div className="accountLanguageInfo"><strong>LANGUAGE</strong><span>English</span><small>Additional languages are not available yet.</small></div><button type="submit">SAVE CHANGES</button>{message&&<p role="status">{message}</p>}</form></>}</main><Footer/></>}
