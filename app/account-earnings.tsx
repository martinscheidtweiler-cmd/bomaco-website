"use client";
import {useEffect,useState} from "react";
import {auctionSupabase} from "./auction-client";
type EarnedState={name:string|null;amount:number|null};
export default function AuctionAccountEarnings(){
 const [state,setState]=useState<EarnedState>({name:null,amount:null});
 useEffect(()=>{
  const supabase=auctionSupabase();
  if(!supabase)return;
  let alive=true;
  async function refresh(){
   const {data:{user}}=await supabase.auth.getUser();
   if(!alive)return;
   if(!user){setState({name:null,amount:null});return}
   const name=user.user_metadata?.full_name||user.email?.split("@")[0]||"MY ACCOUNT";
   const {data,error}=await supabase.rpc("auction_my_total_earned");
   if(alive)setState({name,amount:!error&&typeof data==="number"?data:null});
  }
  void refresh();
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>void refresh(),0)});
  const interval=setInterval(()=>void refresh(),15000);
  return()=>{alive=false;subscription.unsubscribe();clearInterval(interval)};
 },[]);
 return <span className="auctionAccountEarnings">
  {state.name&&state.amount!==null&&<span className="auctionEarnedTotal"><small>TOTAL EARNED</small><b>€{state.amount.toLocaleString("en-IE",{minimumFractionDigits:2,maximumFractionDigits:2})}</b></span>}
  <a href={state.name?"/account":"/login"} className="accountNav">{state.name||"LOGIN"}</a>
 </span>;
}
