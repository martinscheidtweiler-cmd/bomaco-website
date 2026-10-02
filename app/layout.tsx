import type { Metadata } from "next"; import "./globals.css";
export const metadata:Metadata={title:"Optimus Online Auction — Demo",description:"Optimus Online Auction demo"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}