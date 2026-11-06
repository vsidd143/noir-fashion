"use client";

import React from "react";
import { motion } from "framer-motion";
import PageShell from "@/components/layout/PageShell";
import ScrollStorytelling from "@/components/sections/ScrollStorytelling";
import NewsletterSection from "@/components/sections/NewsletterSection";
import { Compass, Camera } from "lucide-react";

export default function LookbookPage() {
  return (
    <PageShell>
      {/* Editorial Lookbook Hero Header with Staggered Entrance */}
      <section className="relative pt-36 pb-16 px-6 md:px-14 bg-[#050505] border-b border-white/[0.06] overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/4 w-96 h-96 bg-[#c5a46d]/10 rounded-full blur-[140px]" />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-4"
          >
            <Compass className="w-4 h-4" />
            <span>Archive 2026 // Visual Manifesto</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black uppercase font-display tracking-tight text-white max-w-4xl leading-[0.95]"
          >
            EDITORIAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f0e6d2] to-[#c5a46d]">LOOKBOOK</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-xs sm:text-sm text-neutral-400 font-mono max-w-2xl leading-relaxed"
          >
            Four serialized chapters exploring the geometry of black. Immersive editorial photography capturing the collision of high-frequency sportswear, dropped proportions, and architectural concrete.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="mt-8 flex items-center gap-6 text-xs font-mono text-[#c5a46d]"
          >
            <span className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>CHAPTERS 01 – 04</span>
            </span>
            <span>•</span>
            <span>MUMBAI · DELHI · BENGALURU RUNWAYS</span>
          </motion.div>
        </div>
      </section>

      {/* Full Chapter Scroll Experience with 3D Ribbon Storytelling */}
      <ScrollStorytelling />

      {/* VIP Access Newsletter */}
      <NewsletterSection />
    </PageShell>
  );
}
