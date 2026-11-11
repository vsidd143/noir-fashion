"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCursor } from "@/context/CursorContext";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HeroSection() {
  const { setCursor, resetCursor } = useCursor();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const videoParallaxRef = useRef<HTMLDivElement>(null);
  const headlineWrapRef = useRef<HTMLDivElement>(null);
  const subCtaWrapRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Optimized video playback management ensuring 100% reliable autoplay across mobile & desktop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Strict attributes for mobile autoplay policy compliance
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("autoplay", "");

    const startPlayback = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Retry on first user interaction
          const resumeOnInteraction = () => {
            video.muted = true;
            video.play().catch(() => {});
            window.removeEventListener("touchstart", resumeOnInteraction);
            window.removeEventListener("click", resumeOnInteraction);
            window.removeEventListener("scroll", resumeOnInteraction);
          };
          window.addEventListener("touchstart", resumeOnInteraction, { once: true, passive: true });
          window.addEventListener("click", resumeOnInteraction, { once: true });
          window.addEventListener("scroll", resumeOnInteraction, { once: true, passive: true });
        });
      }
    };

    if (video.readyState >= 2) {
      startPlayback();
    } else {
      video.addEventListener("canplay", startPlayback, { once: true });
      video.addEventListener("loadeddata", startPlayback, { once: true });
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Multi-layer GSAP ScrollTrigger scrub parallax
  useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      if (videoParallaxRef.current) gsap.set(videoParallaxRef.current, { clearProps: "all" });
      if (headlineWrapRef.current) gsap.set(headlineWrapRef.current, { clearProps: "all" });
      if (subCtaWrapRef.current) gsap.set(subCtaWrapRef.current, { clearProps: "all" });
      return;
    }

    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 768;

      // Hero scrub timeline linked strictly to scroll position
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      // Layer 1: Background video moves slowly down (10-14%) to create deep perspective without exposing edges
      if (videoParallaxRef.current) {
        tl.to(
          videoParallaxRef.current,
          {
            yPercent: isMobile ? 6 : 12,
            ease: "none",
            force3D: true,
          },
          0
        );
      }

      // Layer 2: Headline moves downward at moderate speed (30-45px vertical shift)
      if (headlineWrapRef.current) {
        tl.to(
          headlineWrapRef.current,
          {
            y: isMobile ? 20 : 42,
            ease: "none",
            force3D: true,
          },
          0
        );
      }

      // Layer 3: Subtitle & CTA button move faster than headline (55-68px vertical shift)
      if (subCtaWrapRef.current) {
        tl.to(
          subCtaWrapRef.current,
          {
            y: isMobile ? 28 : 66,
            ease: "none",
            force3D: true,
          },
          0
        );
      }
    }, sectionRef);

    return () => {
      ctx.revert();
    };
  }, []);

  // Cinematic entrance animations
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.22,
        delayChildren: shouldReduceMotion ? 0 : 0.35,
      },
    },
  };

  const lineVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 36 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.95,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const subtitleVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.85,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const ctaVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.85,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-[100dvh] w-full flex items-center overflow-hidden bg-[#050505] select-none border-b border-[#050505] border-r border-[#050505]"
    >
      {/* 1. Full-Screen Cinematic Video Background with Parallax Container */}
      <div className="absolute -top-[2%] -bottom-[2%] md:-top-[10%] md:-bottom-[10%] inset-x-0 w-full h-[104%] md:h-[120%] overflow-hidden pointer-events-none z-0">
        <div
          ref={videoParallaxRef}
          className="w-full h-full transform-gpu"
          style={{ willChange: "transform" }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            src="/videos/noir-hero.mp4"
            className="w-full h-full object-cover object-center filter brightness-[0.95] contrast-[1.04]"
          >
            <source
              src="/videos/noir-hero.mp4"
              type="video/mp4"
            />
          </video>
        </div>
      </div>

      {/* 2. Cinematic Overlays */}
      {/* Desktop/Tablet side gradient for text legibility without blackening mobile video */}
      <div className="pointer-events-none absolute inset-0 z-[1] hidden sm:block bg-gradient-to-r sm:from-[#050505]/85 sm:via-[#050505]/30 sm:to-transparent" />

      {/* Mobile-optimized subtle atmospheric overlay */}
      <div className="pointer-events-none absolute inset-0 z-[1] sm:hidden bg-gradient-to-t from-[#050505]/95 via-[#050505]/30 to-transparent" />

      {/* Top Header Fade */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 sm:h-40 z-[2] bg-gradient-to-b from-[#050505]/85 via-[#050505]/30 to-transparent" />

      {/* Bottom Architectural Grounding Fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 sm:h-52 z-[2] bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />

      {/* 3. Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-5 sm:px-12 md:px-16 pt-24 pb-12 sm:pb-16 flex items-center min-h-[100dvh]">
        {/* Position Adjustment: Balanced across mobile and desktop viewports */}
        <div className="relative top-2 sm:top-10 md:top-16 lg:top-20 w-full">
          <div className="w-full max-w-3xl text-left">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-5 sm:space-y-8"
            >
              {/* Main Heading — Two Lines in Dedicated Parallax Layer */}
              <div
                ref={headlineWrapRef}
                className="transform-gpu"
                style={{ willChange: "transform" }}
              >
                <h1 className="text-[2.25rem] xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-[-0.025em] font-display text-white leading-[0.95]">
                  <motion.span
                    variants={lineVariants}
                    className="block text-white sm:whitespace-nowrap"
                  >
                    BEYOND THE
                  </motion.span>

                  <motion.span
                    variants={lineVariants}
                    className="block text-white/95 sm:whitespace-nowrap"
                  >
                    ORDINARY.
                  </motion.span>
                </h1>
              </div>

              {/* Subtitle & CTA in Dedicated Parallax Layer */}
              <div
                ref={subCtaWrapRef}
                className="space-y-6 sm:space-y-8 transform-gpu"
                style={{ willChange: "transform" }}
              >
                {/* Subtitle */}
                <motion.p
                  variants={subtitleVariants}
                  className="text-xs sm:text-sm md:text-base lg:text-lg text-neutral-300 font-light tracking-[0.18em] sm:tracking-[0.22em] uppercase font-sans"
                >
                  Designed to stand apart.
                </motion.p>

                {/* CTA Button with Luxury Floating Hover Interaction */}
                <motion.div
                  variants={ctaVariants}
                  className="pt-2 sm:pt-4 inline-block"
                >
                  <motion.div
                    whileHover={
                      shouldReduceMotion
                        ? {}
                        : {
                            y: -5,
                            scale: 1.025,
                            transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                          }
                    }
                    whileTap={
                      shouldReduceMotion
                        ? {}
                        : {
                            scale: 0.98,
                            y: -1,
                            transition: { duration: 0.15 },
                          }
                    }
                    className="inline-block"
                  >
                    <Link
                      href="/new-arrivals"
                      onMouseEnter={() => setCursor("hover")}
                      onMouseLeave={resetCursor}
                      className="group inline-flex items-center gap-3.5 px-6 py-3.5 sm:px-8 sm:py-4 md:px-10 border border-white/30 hover:border-[#c5a46d] bg-black/25 hover:bg-[#c5a46d] backdrop-blur-md text-white hover:text-black font-mono text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.2em] sm:tracking-[0.25em] uppercase transition-colors duration-300 shadow-2xl shadow-black/60 hover:shadow-[0_12px_28px_rgba(197,164,109,0.22)] focus:outline-none focus:ring-1 focus:ring-[#c5a46d]"
                    >
                      <span>DISCOVER NOIR</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5 group-hover:-translate-y-0.5 text-[#c5a46d] group-hover:text-black shrink-0" />
                    </Link>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Edge Line: Kept strictly black */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[4px] bg-[#050505] z-30" />

      {/* Bottom Architectural Line: Kept strictly black */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-[1px] h-[4px] bg-[#050505] z-30" />
    </section>
  );
}
