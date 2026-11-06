"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePageTransition } from "@/context/PageTransitionContext";

/**
 * Signature NOIR Transition Effect:
 * 1. Screen smoothly fades into deep luxury matte black background (#030303).
 * 2. A subtle gold line expands horizontally across the screen from center.
 * 3. NOIR branding appears with architectural typography.
 * 4. The next page reveals smoothly with a premium cinematic fade-unveil.
 * Total target duration: ~350-400ms.
 * CRITICAL: pointer-events-none ensures user interactions are NEVER blocked.
 */
export default function PageTransitionOverlay() {
  const { isTransitioning, transitionStage } = usePageTransition();

  return (
    <AnimatePresence mode="wait">
      {isTransitioning && (
        <motion.div
          key="noir-signature-transition"
          initial={{ opacity: 0 }}
          animate={{
            opacity: transitionStage === "covering" ? 1 : 0,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.2,
            ease: [0.25, 1, 0.5, 1],
          }}
          className="fixed inset-0 z-[9999] pointer-events-none flex flex-col justify-between p-8 sm:p-14 bg-[#030303] text-white overflow-hidden select-none"
        >
          {/* Subtle Ambient Vignette & Golden Warmth */}
          <div className="absolute inset-0 bg-radial-gradient from-[#c5a46d]/[0.08] via-transparent to-transparent opacity-70" />

          {/* Top Atmospheric Metadata */}
          <div className="relative z-10 flex items-center justify-between text-[10px] font-mono tracking-[0.3em] uppercase text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a46d] animate-ping" />
              <span className="text-[#c5a46d] font-bold">NOIR // ATELIER</span>
            </div>
            <span className="hidden sm:inline text-neutral-500">AUTUMN-WINTER EDITION 07</span>
          </div>

          {/* Center Brand Lockup & Signature Expanding Gold Line */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full max-w-4xl mx-auto space-y-6 text-center">
            {/* NOIR Monogram / Wordmark */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, letterSpacing: "0.3em" }}
              animate={{
                opacity: transitionStage === "covering" ? 1 : 0,
                scale: transitionStage === "covering" ? 1 : 1.02,
                letterSpacing: transitionStage === "covering" ? "0.45em" : "0.55em",
              }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="space-y-2"
            >
              <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase font-display text-white">
                NOIR
              </h2>
              <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.4em] text-[#c5a46d] uppercase font-bold">
                MUMBAI // DELHI // BENGALURU
              </p>
            </motion.div>

            {/* Signature Horizontal Gold Line Expanding Horizontally */}
            <div className="w-full max-w-md sm:max-w-xl h-[1px] relative flex items-center justify-center">
              {/* Diffuse Back-Glow Beam */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{
                  scaleX: transitionStage === "covering" ? 1 : 1.15,
                  opacity: transitionStage === "covering" ? 0.7 : 0,
                }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c5a46d]/40 to-transparent blur-[3px]"
              />

              {/* Crisp Center Hairline Laser */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{
                  scaleX: transitionStage === "covering" ? 1 : 1.05,
                  opacity: transitionStage === "covering" ? 1 : 0,
                }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#c5a46d] to-transparent shadow-[0_0_12px_rgba(197,164,109,0.9)]"
              />
            </div>

            {/* Sub-tag */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{
                opacity: transitionStage === "covering" ? 0.8 : 0,
                y: transitionStage === "covering" ? 0 : -4,
              }}
              transition={{ duration: 0.18, delay: 0.04 }}
              className="text-[9px] font-mono uppercase tracking-[0.3em] text-neutral-400"
            >
              BEYOND ORDINARY // BEYOND FASHION
            </motion.div>
          </div>

          {/* Bottom Coordinates & Craftsmanship Guarantee */}
          <div className="relative z-10 flex items-center justify-between text-[9px] font-mono tracking-[0.25em] uppercase text-neutral-500">
            <span>MUMBAI · DELHI · BENGALURU</span>
            <span className="text-[#c5a46d] font-bold">LUXURY STREETWEAR</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
