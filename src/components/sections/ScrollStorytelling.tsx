"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "framer-motion";
import { LOOKBOOK_CHAPTERS } from "@/data/products";
import { Compass, MapPin } from "lucide-react";

// Dynamically import the 3D rotating ribbon canvas
const RibbonStoryCanvas = dynamic(
  () => import("@/components/canvas/RibbonStoryCanvas"),
  { ssr: false }
);

export default function ScrollStorytelling() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const textScale = useTransform(scrollYProgress, [0.3, 0.6], [0.95, 1.05]);

  return (
    <section
      id="lookbook"
      ref={containerRef}
      className="relative w-full bg-[#050505] text-white overflow-hidden py-24 md:py-36 border-t border-white/[0.06]"
    >
      {/* 3D Kinetic Ribbon Background Canvas */}
      <RibbonStoryCanvas />

      {/* Atmospheric Overlays */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#050505]/70 to-[#050505] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-14">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 md:mb-32">
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-4">
            <Compass className="w-3.5 h-3.5" />
            <span>Section 03 // The Editorial Lookbook</span>
          </div>

          <motion.h2
            style={{ scale: textScale }}
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-[-0.03em] uppercase font-display leading-[0.95]"
          >
            NOT JUST CLOTHING.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f0e6d2] to-[#c5a46d]">
              IT&apos;S AN ATTITUDE.
            </span>
          </motion.h2>

          <p className="mt-6 text-xs sm:text-sm text-neutral-400 tracking-[0.15em] uppercase leading-relaxed">
            A radical departure from mass cycles. Built for the architects, nocturnal creators, and cultural innovators who wear their intent on their skin.
          </p>
        </div>

        {/* Lookbook Chapters Spreads */}
        <div className="space-y-32 md:space-y-48">
          {LOOKBOOK_CHAPTERS.map((chapter, index) => {
            const isEven = index % 2 === 0;

            return (
              <div
                key={chapter.number}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-14 items-center ${
                  isEven ? "" : "lg:flex-row-reverse"
                }`}
              >
                {/* Media Image Column with Parallax Frame */}
                <div
                  className={`lg:col-span-7 relative ${
                    isEven ? "order-1" : "order-1 lg:order-2"
                  }`}
                >
                  <div className="relative aspect-[4/5] sm:aspect-[16/11] w-full overflow-hidden bg-neutral-900 border border-white/10 group">
                    <img
                      src={chapter.image}
                      alt={chapter.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 group-hover:grayscale-0 transition-all duration-1000"
                    />

                    {/* Film Grain & Dark Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Coordinates Stamp */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[10px] font-mono tracking-widest text-[#c5a46d] uppercase bg-black/70 backdrop-blur-md px-3 py-2 border border-white/10">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#c5a46d]" />
                        {chapter.coords}
                      </span>
                      <span>CHAPTER {chapter.number}</span>
                    </div>
                  </div>
                </div>

                {/* Narrative Typography Column */}
                <div
                  className={`lg:col-span-5 space-y-6 ${
                    isEven ? "order-2" : "order-2 lg:order-1"
                  }`}
                >
                  <div className="flex items-baseline gap-3 text-xs font-mono text-[#c5a46d] font-bold">
                    <span className="text-xl">[{chapter.number}]</span>
                    <span className="uppercase tracking-[0.25em]">{chapter.subtitle}</span>
                  </div>

                  <h3 className="text-3xl sm:text-4xl font-extrabold uppercase font-display tracking-tight text-white leading-tight">
                    {chapter.title}
                  </h3>

                  {/* Pull Quote */}
                  <blockquote className="border-l-2 border-[#c5a46d] pl-4 py-1 text-sm sm:text-base font-display font-medium text-neutral-200 italic">
                    &quot;{chapter.quote}&quot;
                  </blockquote>

                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-light">
                    {chapter.description}
                  </p>

                  <div className="pt-4 border-t border-white/10 flex items-center gap-6 text-[11px] font-mono text-neutral-500 uppercase">
                    <span>ARCHIVE RUNWAY</span>
                    <span>•</span>
                    <span className="text-[#c5a46d]">NOIR STUDIO</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
