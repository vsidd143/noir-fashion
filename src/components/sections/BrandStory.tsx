"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Scissors, Cpu, Feather, Globe2, ShieldCheck } from "lucide-react";

const PILLARS = [
  {
    id: "materiality",
    title: "01 // MATERIALITY",
    headline: "Premium Quality Fabrics & Heavy Weight",
    icon: Feather,
    content:
      "We craft our fabrics using premium 100% organic cotton. Every roll of 480 GSM heavy loopback cotton is gently brushed to create a luxurious, soft drape that holds its shape and comfort through everyday wear.",
    stat: "480 GSM",
    statLabel: "Heavyweight Cotton Terry",
  },
  {
    id: "silhouette",
    title: "02 // SILHOUETTE",
    headline: "Modern Relaxed Fit & Clean Lines",
    icon: Scissors,
    content:
      "We design our patterns with relaxed dropped shoulders, tailored sleeves, and clean proportions to give you complete freedom of movement and an effortless luxury look.",
    stat: "PERFECT FIT",
    statLabel: "Comfort & Mobility Design",
  },
  {
    id: "technology",
    title: "03 // TECHNOLOGY",
    headline: "Durable Hardware & Weather Resistance",
    icon: Cpu,
    content:
      "Engineered with premium quick-release buckles, waterproof sealed seams, and subtle reflective details, NOIR garments offer everyday durability and weather protection.",
    stat: "ALL-WEATHER",
    statLabel: "Water & Wind Protection",
  },
  {
    id: "philosophy",
    title: "04 // RESPONSIBILITY",
    headline: "Limited Batches & Responsible Production",
    icon: Globe2,
    content:
      "We focus on sustainable fashion. Every drop is crafted in limited, numbered runs of under 250 units, individually hand-inspected to guarantee top craftsmanship with zero overproduction.",
    stat: "< 250 UNITS",
    statLabel: "Made Per Limited Drop",
  },
];

export default function BrandStory() {
  const [activePillar, setActivePillar] = useState(PILLARS[0]);

  return (
    <section id="atelier" className="relative w-full py-24 md:py-36 px-6 md:px-14 bg-[#070707] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="max-w-2xl mb-16">
          <div className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Section 04 // The Obsidian Atelier</span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.02em] uppercase font-display text-white">
            ARCHITECTS OF SHADOW
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-neutral-400 leading-relaxed font-light">
            Founded in 2024 with design studios in Mumbai and Delhi, NOIR crafts premium luxury streetwear for the modern wardrobe.
          </p>
        </div>

        {/* Interactive Story Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Pillar Selector Buttons (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              const isActive = activePillar.id === pillar.id;

              return (
                <button
                  key={pillar.id}
                  onClick={() => setActivePillar(pillar)}
                  className={`w-full text-left p-6 border transition-all flex items-center justify-between group ${
                    isActive
                      ? "bg-[#0d0d0d] border-[#c5a46d] shadow-xl"
                      : "bg-[#050505] border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 border rounded-none transition-colors ${
                        isActive
                          ? "border-[#c5a46d] text-[#c5a46d] bg-[#c5a46d]/10"
                          : "border-white/10 text-neutral-400 group-hover:text-white"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono tracking-widest text-[#a0a0a0] block uppercase">
                        {pillar.title}
                      </span>
                      <h4
                        className={`text-base font-bold uppercase font-display tracking-wider mt-0.5 transition-colors ${
                          isActive ? "text-white" : "text-neutral-400 group-hover:text-white"
                        }`}
                      >
                        {pillar.headline.split("&")[0]}
                      </h4>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-xs font-bold transition-transform ${
                      isActive ? "text-[#c5a46d] translate-x-1" : "text-neutral-600"
                    }`}
                  >
                    →
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Pillar In-Depth Display (7 cols) */}
          <div className="lg:col-span-7 bg-[#0d0d0d] border border-white/10 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient gold glow watermark */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#c5a46d]/5 rounded-full blur-3xl pointer-events-none" />

            <AnimatePresence mode="wait">
              <motion.div
                key={activePillar.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="inline-block px-3 py-1 bg-[#c5a46d]/10 border border-[#c5a46d]/30 text-[10px] font-mono tracking-widest uppercase text-[#c5a46d]">
                  {activePillar.title}
                </div>

                <h3 className="text-2xl sm:text-4xl font-black uppercase font-display tracking-tight text-white leading-tight">
                  {activePillar.headline}
                </h3>

                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-light">
                  {activePillar.content}
                </p>

                {/* Big Stat Callout */}
                <div className="p-6 bg-[#070707] border border-white/10 flex items-baseline justify-between mt-8">
                  <div>
                    <span className="text-3xl sm:text-5xl font-black font-mono text-[#c5a46d]">
                      {activePillar.stat}
                    </span>
                    <span className="block text-[11px] font-mono uppercase tracking-widest text-neutral-400 mt-1">
                      {activePillar.statLabel}
                    </span>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-[#c5a46d]/40" />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Bottom Atelier Origin Tag */}
            <div className="pt-8 mt-8 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-neutral-500 uppercase">
              <span>MUMBAI · DELHI · BENGALURU</span>
              <span className="text-[#c5a46d]">LIMITED RUNS // NOIR</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
