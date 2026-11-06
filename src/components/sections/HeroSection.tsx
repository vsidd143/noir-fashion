"use client";

import React from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import MagneticButton from "@/components/ui/MagneticButton";
import { Sparkles, ChevronRight } from "lucide-react";
import { useCursor } from "@/context/CursorContext";
import { usePageTransition } from "@/context/PageTransitionContext";

// Lazy-load WebGL Canvas scene with luxury ambient fallback
const HeroScene = dynamic(() => import("@/components/canvas/HeroScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
      <div className="w-64 h-64 rounded-full border border-[#c5a46d]/20 animate-pulse bg-radial-gradient from-[#c5a46d]/5 to-transparent blur-[1px]" />
    </div>
  ),
});

export default function HeroSection() {
  const { setCursor, resetCursor } = useCursor();
  const { navigateTo } = usePageTransition();

  const handleExplore = () => {
    navigateTo("/collection");
  };

  const handleShopNow = () => {
    navigateTo("/lookbook");
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen w-full flex flex-col justify-between pt-28 pb-12 px-6 md:px-14 overflow-hidden bg-[#050505]"
    >
      {/* 3D WebGL Canvas Layer */}
      <HeroScene />

      {/* Atmospheric Vignette & Gradients */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-radial-gradient from-transparent via-black/40 to-[#050505]" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 z-[2] bg-gradient-to-t from-[#050505] to-transparent" />

      {/* Top Banner Tag */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between text-xs tracking-[0.3em] font-mono text-[#a0a0a0]">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#c5a46d] animate-pulse" />
          <span className="text-[#c5a46d]">EDITION 07</span>
          <span className="hidden sm:inline">{"//"} FALL-WINTER RUNWAY</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="hidden md:flex items-center gap-4 text-[11px]"
        >
          <span>MUMBAI 14:30 IST</span>
          <span>•</span>
          <span>DELHI NCR VAULT</span>
          <span>•</span>
          <span className="text-[#c5a46d]">PAN-INDIA EXPRESS DISPATCH</span>
        </motion.div>
      </div>

      {/* Center Cinematic Typography & Brand Identity */}
      <div className="relative z-10 max-w-7xl mx-auto w-full my-auto pointer-events-none">
        <div className="max-w-3xl pointer-events-auto">
          {/* Subtle Tagline Badge */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-black/50 backdrop-blur-md mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c5a46d]" />
            <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-neutral-300">
              Interactive 3D Digital Archive
            </span>
          </motion.div>

          {/* Main Hero Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-[-0.03em] uppercase leading-[0.92] text-white font-display"
          >
            WEAR YOUR
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f0e6d2] to-[#c5a46d]">
              IDENTITY.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-6 text-base sm:text-lg md:text-xl text-neutral-300 font-light tracking-[0.15em] uppercase max-w-xl"
          >
            Beyond Fashion. Beyond Ordinary.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-3 text-xs sm:text-sm text-neutral-400 font-normal leading-relaxed max-w-md"
          >
            Luxury streetwear crafted from 480 GSM heavy loopback cotton fleece, durable matte hardware, and clean modern tailoring.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-10 flex flex-wrap items-center gap-4 sm:gap-6"
          >
            {/* Primary Magnetic CTA */}
            <MagneticButton cursorText="EXPLORE">
              <button
                onClick={handleExplore}
                onMouseEnter={() => setCursor("hover")}
                onMouseLeave={resetCursor}
                className="group relative px-8 py-4 bg-[#c5a46d] hover:bg-[#d4b57e] text-black text-xs font-black tracking-[0.25em] uppercase transition-all flex items-center gap-3 shadow-xl shadow-[#c5a46d]/20"
              >
                <span>Explore Collection</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </MagneticButton>

            {/* Secondary Lookbook CTA */}
            <MagneticButton cursorText="LOOKBOOK">
              <button
                onClick={handleShopNow}
                onMouseEnter={() => setCursor("hover")}
                onMouseLeave={resetCursor}
                className="px-8 py-4 bg-transparent border border-white/25 hover:border-white text-white hover:text-white text-xs font-bold tracking-[0.25em] uppercase transition-all backdrop-blur-sm"
              >
                View Lookbook
              </button>
            </MagneticButton>
          </motion.div>
        </div>
      </div>

      {/* Bottom Status Bar & Scroll Indicator */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex items-end justify-between pt-8 border-t border-white/[0.08] text-xs text-neutral-400 font-mono">
        <div className="flex items-center gap-6">
          <span className="text-[#c5a46d] font-bold">01 / 06</span>
          <span className="hidden sm:inline">MOVE CURSOR TO INTERACT WITH 3D MODEL</span>
        </div>

        <button
          onClick={handleExplore}
          className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neutral-400 hover:text-white transition-colors group"
        >
          <span>Explore Collection</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#c5a46d] group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </section>
  );
}
