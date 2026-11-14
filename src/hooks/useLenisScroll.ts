"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface UseLenisOptions {
  duration?: number;
  smoothWheel?: boolean;
  touchMultiplier?: number;
}

/**
 * Initializes smooth Lenis scrolling perfectly synchronized with GSAP ScrollTrigger.
 * Respects 'prefers-reduced-motion' and cleans up on unmount.
 */
export function useLenisScroll(options: UseLenisOptions = {}) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Honor user accessibility preferences
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const lenis = new Lenis({
      duration: options.duration ?? 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: options.smoothWheel ?? true,
      touchMultiplier: options.touchMultiplier ?? 1.5,
    });

    lenisRef.current = lenis;

    // Synchronize ScrollTrigger with Lenis
    lenis.on("scroll", ScrollTrigger.update);

    // Drive Lenis from GSAP central ticker
    const tickerUpdate = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerUpdate);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerUpdate);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [options.duration, options.smoothWheel, options.touchMultiplier]);

  return lenisRef;
}

