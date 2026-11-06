"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUp, Globe } from "lucide-react";
import { InstagramIcon, TwitterIcon } from "@/components/ui/SocialIcons";

export default function Footer() {
  const [currency, setCurrency] = useState("INR (₹)");

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="w-full bg-[#030303] text-white border-t border-white/[0.08] pt-20 pb-12 px-6 md:px-14">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Top Mega Brand Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-12 gap-8">
          <div>
            <span className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-[0.25em] font-display text-white uppercase block leading-none">
              NOIR
            </span>
            <span className="text-xs font-mono tracking-[0.35em] text-[#a0a0a0] uppercase mt-3 block">
              LUXURY STREETWEAR & ATELIER EXPERIMENTS // 2026
            </span>
          </div>

          {/* Back to top */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-3 px-5 py-3 border border-white/15 hover:border-[#c5a46d] text-xs font-mono tracking-widest uppercase text-neutral-300 hover:text-[#c5a46d] transition-all self-start md:self-auto cursor-pointer"
          >
            <span>Back to Top</span>
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-column navigation links & coordinates */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-xs font-mono">
          {/* Col 1: Runway */}
          <div className="space-y-3">
            <span className="text-[#c5a46d] font-bold tracking-widest uppercase block mb-4">
              COLLECTION
            </span>
            <ul className="space-y-2.5 text-neutral-400">
              <li><Link href="/collection" className="hover:text-white transition-colors block text-left">Heavy Hoodies</Link></li>
              <li><Link href="/collection" className="hover:text-white transition-colors block text-left">Technical Jackets</Link></li>
              <li><Link href="/collection" className="hover:text-white transition-colors block text-left">Cargo Trousers</Link></li>
              <li><Link href="/collection" className="hover:text-white transition-colors block text-left">Heavyweight Tees</Link></li>
              <li><Link href="/collection" className="hover:text-white transition-colors block text-left">Luxury Footwear</Link></li>
            </ul>
          </div>

          {/* Col 2: Experiences */}
          <div className="space-y-3">
            <span className="text-[#c5a46d] font-bold tracking-widest uppercase block mb-4">
              EXPERIENCES
            </span>
            <ul className="space-y-2.5 text-neutral-400">
              <li><Link href="/" className="hover:text-white transition-colors block text-left">3D Interactive Model</Link></li>
              <li><Link href="/lookbook" className="hover:text-white transition-colors block text-left">Editorial Lookbook</Link></li>
              <li><Link href="/campaign" className="hover:text-white transition-colors block text-left">Visual Campaign</Link></li>
              <li><Link href="/collection" className="hover:text-white transition-colors block text-left">New Collection</Link></li>
              <li><Link href="/atelier" className="hover:text-white transition-colors block text-left">Craft & Materials</Link></li>
            </ul>
          </div>

          {/* Col 3: Client Vault */}
          <div className="space-y-3">
            <span className="text-[#c5a46d] font-bold tracking-widest uppercase block mb-4">
              CUSTOMER CARE
            </span>
            <ul className="space-y-2.5 text-neutral-400">
              <li><Link href="/cart" className="hover:text-white transition-colors block">Shopping Bag</Link></li>
              <li><Link href="/wishlist" className="hover:text-white transition-colors block">Wishlist</Link></li>
              <li><Link href="/user" className="hover:text-white transition-colors block">Track Orders</Link></li>
              <li><span className="text-neutral-500">Pan-India Express Delivery</span></li>
              <li><span className="text-neutral-500">Care: care@atelier-noir.in</span></li>
            </ul>
          </div>

          {/* Col 4: Flagship Store Locations */}
          <div className="space-y-3">
            <span className="text-[#c5a46d] font-bold tracking-widest uppercase block mb-4">
              FLAGSHIP STORES
            </span>
            <ul className="space-y-2.5 text-neutral-400">
              <li><span className="text-white">MUMBAI:</span> Linking Rd, Bandra W</li>
              <li><span className="text-white">DELHI:</span> DLF Emporio, Vasant Kunj</li>
              <li><span className="text-white">BENGALURU:</span> UB City, Lavelle Rd</li>
              <li><span className="text-white">HYDERABAD:</span> Jubilee Hills, Rd 36</li>
              <li><span className="text-white">KOLKATA:</span> Quest Mall, Ballygunge</li>
            </ul>
          </div>

          {/* Col 5: Currency & Social */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 space-y-4">
            <span className="text-[#c5a46d] font-bold tracking-widest uppercase block mb-4">
              CURRENCY & REGION
            </span>
            <div className="flex items-center gap-2 p-2.5 bg-[#0a0a0a] border border-white/10 text-xs">
              <Globe className="w-3.5 h-3.5 text-[#c5a46d]" />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer w-full font-mono"
              >
                <option value="INR (₹)" className="bg-black">INR (₹) · India (Pan-India COD)</option>
              </select>
            </div>

            <div className="pt-2">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-2">
                FOLLOW US
              </span>
              <div className="flex items-center gap-4 text-neutral-400">
                <a href="#instagram" className="hover:text-[#c5a46d] transition-colors" aria-label="Instagram">
                  <InstagramIcon className="w-4 h-4" />
                </a>
                <a href="#twitter" className="hover:text-[#c5a46d] transition-colors" aria-label="Twitter">
                  <TwitterIcon className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Rights Bar */}
        <div className="border-t border-white/[0.08] pt-8 flex flex-col md:flex-row items-center justify-between text-[10px] font-mono tracking-widest uppercase text-neutral-500 gap-4">
          <p>© 2026 NOIR ATELIER PRIVATE LIMITED. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
            <Link href="/atelier" className="hover:text-white transition-colors">CRAFT MANIFESTO</Link>
            <Link href="/collection" className="hover:text-white transition-colors">EDITION 07</Link>
            <Link href="/user" className="hover:text-white transition-colors">CLIENT VAULT</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
