"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen({ onComplete }: { onComplete?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const duration = 450; // ms - fast, snappy luxury intro
    const intervalTime = 20;
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment + 4;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsFinished(true);
            if (onComplete) onComplete();
          }, 80);
          return 100;
        }
        return Math.floor(next);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Allow clicking anywhere to skip intro immediately
  const handleSkip = () => {
    setIsFinished(true);
    if (onComplete) onComplete();
  };

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          key="loader-overlay"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            y: "-100%",
            transition: { duration: 0.4, ease: [0.76, 0, 0.24, 1] },
          }}
          onClick={handleSkip}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-between bg-[#050505] p-8 md:p-14 select-none cursor-pointer"
        >
          {/* Top metadata */}
          <div className="w-full flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-[#a0a0a0]">
            <span className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c5a46d] animate-ping" />
              SYSTEM 07 // ONLINE
            </span>
            <span className="hidden sm:inline-block">MUMBAI · DELHI · BENGALURU</span>
            <span className="text-[#c5a46d]">EDITION 2026</span>
          </div>

          {/* Center Brand Identity */}
          <div className="flex flex-col items-center text-center">
            {/* Animated Geometric Monogram */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative mb-8"
            >
              <div className="relative h-24 w-24 flex items-center justify-center">
                {/* Rotating accent diamond */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border border-[#c5a46d]/30 rotate-45"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 border border-white/10"
                />
                <span className="text-3xl font-black tracking-widest text-[#FFFFFF] font-display">
                  N
                </span>
              </div>
            </motion.div>

            {/* Brand Title */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl md:text-7xl font-extrabold tracking-[0.35em] text-white font-display uppercase"
            >
              NOIR
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-3 text-xs md:text-sm tracking-[0.4em] text-[#a0a0a0] uppercase"
            >
              Beyond Fashion. Beyond Ordinary.
            </motion.p>
          </div>

          {/* Bottom Progress Counter & Bar */}
          <div className="w-full max-w-md">
            <div className="flex justify-between items-baseline mb-3 text-xs tracking-[0.2em]">
              <span className="text-[#a0a0a0] uppercase">Compiling Atelier Canvas</span>
              <span className="font-mono text-base font-bold text-[#c5a46d]">
                {Math.min(100, Math.floor(progress))}%
              </span>
            </div>

            {/* Slim gold progress track */}
            <div className="h-[2px] w-full bg-neutral-900 overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-[#c5a46d] via-[#e5d0a1] to-[#c5a46d]"
                style={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>

            <div className="mt-4 text-center text-[10px] tracking-[0.25em] text-neutral-600 uppercase">
              Interact with 3D canvas via cursor / drag
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
