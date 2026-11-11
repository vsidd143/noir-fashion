"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";
import { usePageTransition } from "@/context/PageTransitionContext";

const CAMPAIGN_SCENES = [
  {
    id: "scene1",
    tag: "SCENE 01 // NOCTURNAL METROPOLIS",
    title: "SHADOW product",
    image: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1800&q=85",
    subtitle: "Heavy 480 GSM loopback cotton silhouetted against evening rain.",
  },
  {
    id: "scene2",
    tag: "SCENE 02 // MODERN ARCHITECTURE",
    title: "SYNTHESIS OF FORM",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1800&q=85",
    subtitle: "Quick-release magnetic hardware integrated into clean tailoring.",
  },
  {
    id: "scene3",
    tag: "SCENE 03 // NIGHT ARCHIVE",
    title: "TIMELESS DESIGN",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85",
    subtitle: "Oversized product crafted for effortless comfort and presence.",
  },
];

export default function CampaignSection() {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const activeScene = CAMPAIGN_SCENES[activeSceneIndex];
  const { navigateTo } = usePageTransition();

  const handleDiscover = () => {
    const el = document.getElementById("editorial-collections");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigateTo("/new-arrivals");
    }
  };

  return (
    <section id="campaign" className="relative w-full min-h-screen flex flex-col justify-between py-24 md:py-36 px-6 md:px-14 overflow-hidden bg-black text-white border-t border-white/[0.06]">
      {/* Background Cinematic Image Crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeScene.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${activeScene.image})` }}
        >
          {/* Dark Cinematic Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-[#050505]/40" />
        </motion.div>
      </AnimatePresence>

      {/* Top Campaign Bar */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between text-xs font-mono text-[#a0a0a0] uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#c5a46d]" />
          <span className="text-[#c5a46d]">CAMPAIGN 2026 // SYNTHESIS</span>
        </div>
        <div className="flex items-center gap-2">
          {CAMPAIGN_SCENES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSceneIndex(idx)}
              className={`h-1.5 transition-all ${activeSceneIndex === idx ? "w-8 bg-[#c5a46d]" : "w-3 bg-white/20 hover:bg-white/40"
                }`}
            />
          ))}
        </div>
      </div>

      {/* Center Hero Message */}
      <div className="relative z-10 max-w-7xl mx-auto w-full my-auto text-center py-16">
        <motion.span
          key={`tag-${activeScene.id}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-mono tracking-[0.35em] uppercase text-[#c5a46d] block mb-4"
        >
          {activeScene.tag}
        </motion.span>

        <motion.h2
          key={`head-${activeScene.id}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-[-0.03em] uppercase font-display leading-[0.9]"
        >
          DEFINE YOUR
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f0e6d2] to-[#c5a46d]">
            OWN STYLE.
          </span>
        </motion.h2>

        <p className="mt-6 text-xs sm:text-sm text-neutral-300 font-light tracking-[0.2em] uppercase max-w-xl mx-auto leading-relaxed">
          {activeScene.subtitle}
        </p>

        {/* CTA Button */}
        <div className="mt-12">
          <MagneticButton cursorText="DISCOVER">
            <button
              onClick={handleDiscover}
              className="px-10 py-5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-[0.3em] uppercase transition-all inline-flex items-center gap-3 shadow-2xl shadow-[#c5a46d]/25 group"
            >
              <span>Discover The Collection</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </button>
          </MagneticButton>
        </div>
      </div>

      {/* Bottom Scene Quick Selectors */}
      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/10 text-xs font-mono">
        {CAMPAIGN_SCENES.map((scene, idx) => (
          <button
            key={scene.id}
            onClick={() => setActiveSceneIndex(idx)}
            className={`p-4 border text-left transition-all ${activeSceneIndex === idx
                ? "border-[#c5a46d] bg-black/60 text-white"
                : "border-white/10 bg-black/30 text-neutral-400 hover:border-white/30"
              }`}
          >
            <span className="text-[10px] text-[#c5a46d] block mb-1">0{idx + 1} {"//"} SCENE</span>
            <span className="font-bold uppercase tracking-wider block font-display">
              {scene.title}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
