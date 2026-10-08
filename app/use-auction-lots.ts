"use client";
import {useEffect,useState} from "react";
import {auctionSupabase} from "./auction-client";
export type PublicLot={slug:string;no:string;name:string;pedigree:string;type:"FOAL"|"EMBRYO";current:number;sex:string;year:string;image:string;description:string;pedigree_url?:string;gallery_urls?:string[];video_urls?:string[];closes_at?:string;status:string};
export function useAuctionLots(){const [lots,setLots]=useState<PublicLot[]>([]);useEffect(()=>{const client=auctionSupabase();if(!client)return;let active=true;async function load(){const {data}=await client!.rpc("auction_public_lots");if(active&&Array.isArray(data))setLots(data)}void load();const t=setInterval(()=>void load(),10000);return()=>{active=false;clearInterval(t)}},[]);return lots}
