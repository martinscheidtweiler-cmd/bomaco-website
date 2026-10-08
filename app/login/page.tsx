"use client";
import {useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import {auctionSupabase} from "../auction-client";
import {Header,Footer} from "../components";
export default function Login(){
 const searchParams=useSearchParams();
 useEffect(()=>{setSignup(searchParams.get("mode")==="signup")},[searchParams]);
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [signup,setSignup]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();const client=auctionSupabase();if(!client){setMessage("Authentication is not configured yet.");return}setBusy(true);setMessage("");
  const {error}=signup?await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+"/account"}}):await client.auth.signInWithPassword({email,password});
  setBusy(false);if(error){setMessage(error.message);return}
  if(signup){setMessage("Check your email to confirm your account.");return}
  window.location.href="/account";
 }
 return <><Header/><main className="auctionAccountPage"><div className="auctionAccountHeading"><span>OPTIMUS ONLINE AUCTION</span><h1>{signup?"CREATE ACCOUNT":"LOGIN"}</h1></div><form onSubmit={submit} className="auctionAccountForm"><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" minLength={8} autoComplete={signup?"new-password":"current-password"} required value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy}>{busy?"PLEASE WAIT":signup?"REGISTER":"LOGIN"}</button>{message&&<p role="status">{message}</p>}<button type="button" className="accountTextButton" onClick={()=>{setSignup(!signup);setMessage("")}}>{signup?"Already have an account? Login":"New here? Create an account"}</button></form><p className="accountBack"><Link href="/">← BACK TO AUCTION</Link></p></main><Footer/></>
}