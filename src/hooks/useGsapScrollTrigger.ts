"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Ensure ScrollTrigger is registered only in client-side environment
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Custom hook to initialize smooth GSAP ScrollTrigger reveals and parallax effects.
 * Automatically cleans up on unmount or dependency changes to prevent duplicate triggers or memory leaks.
 */
export function useGsapScrollTrigger(dependencies: React.DependencyList = []) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // Check accessibility: if reduced motion, skip movement
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // 1. Smooth Fade-Up Section Headers
      gsap.utils.toArray<HTMLElement>(".gsap-fade-up").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            clearProps: "opacity,transform",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      // 2. Progressive Staggered Product Cards
      gsap.utils.toArray<HTMLElement>(".gsap-product-grid").forEach((grid) => {
        const cards = grid.querySelectorAll(".gsap-product-card");
        if (cards.length > 0) {
          gsap.fromTo(
            cards,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              stagger: 0.06,
              ease: "power2.out",
              clearProps: "opacity,transform",
              scrollTrigger: {
                trigger: grid,
                start: "top 90%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      });

      // 3. Subtle Image Parallax
      gsap.utils.toArray<HTMLElement>(".gsap-parallax-container").forEach((container) => {
        const img = container.querySelector(".gsap-parallax-img");
        if (img) {
          gsap.fromTo(
            img,
            { y: "-6%" },
            {
              y: "6%",
              ease: "none",
              scrollTrigger: {
                trigger: container,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            }
          );
        }
      });
    }, containerRef);

    // Refresh ScrollTrigger after DOM settle
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert(); // Clean up all GSAP timelines & ScrollTriggers cleanly
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return containerRef;
}
