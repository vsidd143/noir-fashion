"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles, Check, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { useCursor } from "@/context/CursorContext";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const PHILOSOPHY_PRINCIPLES = [
  {
    num: "01",
    label: "DESIGN",
    quote: "Intentional product. Timeless expression.",
  },
  {
    num: "02",
    label: "MATERIAL",
    quote: "Considered fabrics. Refined textures.",
  },
  {
    num: "03",
    label: "CRAFT",
    quote: "Precision in every stitch. Purpose in every detail.",
  },
];

export default function WhyNoirAndNewsletter() {
  const { setCursor, resetCursor } = useCursor();
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const philosophyGridRef = useRef<HTMLDivElement>(null);
  const photoWrapRef = useRef<HTMLDivElement>(null);
  const typographyRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Parallax scroll choreography for The NOIR Philosophy
  useEffect(() => {
    if (typeof window === "undefined" || !philosophyGridRef.current) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      if (photoWrapRef.current) gsap.set(photoWrapRef.current, { clearProps: "all" });
      if (typographyRef.current) gsap.set(typographyRef.current, { clearProps: "all" });
      return;
    }

    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 768;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: philosophyGridRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      // Left photograph moves at slow parallax speed (-8% to +8%)
      if (photoWrapRef.current) {
        tl.fromTo(
          photoWrapRef.current,
          {
            yPercent: isMobile ? -4 : -8,
          },
          {
            yPercent: isMobile ? 4 : 8,
            ease: "none",
            force3D: true,
          },
          0
        );
      }

      // Right typography floats with subtle counter-depth
      if (typographyRef.current) {
        tl.fromTo(
          typographyRef.current,
          {
            y: isMobile ? 10 : 22,
          },
          {
            y: isMobile ? -10 : -22,
            ease: "none",
            force3D: true,
          },
          0
        );
      }
    }, sectionRef);

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading" || status === "success") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "homepage-philosophy" }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setEmail("");

        try {
          confetti({
            particleCount: 45,
            spread: 55,
            origin: { y: 0.8 },
            colors: ["#c5a46d", "#ffffff", "#050505"],
          });
        } catch {
          // Graceful fallback
        }
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Subscription failed. Please verify your address.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-16 sm:py-32 px-4 sm:px-10 lg:px-16 bg-[#060606] border-t border-white/[0.08] select-none overflow-hidden"
    >
      {/* Background Decorative Ambient Radial Glow */}
      <div className="absolute inset-0 bg-radial-gradient from-[#c5a46d]/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-32 relative z-10">
        {/* AREA 1: THE NOIR PHILOSOPHY (Luxury Editorial Split Layout with Parallax) */}
        <div
          ref={philosophyGridRef}
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 xl:gap-20"
        >
          {/* Left Side: Editorial Monochrome Garment Photography (52% width) */}
          <motion.div
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:w-[52%] group"
          >
            <div className="relative aspect-[4/5] sm:aspect-[16/11] lg:aspect-[4/5] w-full overflow-hidden bg-neutral-950 border border-white/10 hover:border-[#c5a46d]/60 transition-colors duration-700">
              {/* Parallax Image Inner Wrapper */}
              <div className="absolute -inset-y-10 inset-x-0 w-full h-[calc(100%+5rem)] overflow-hidden pointer-events-none">
                <div
                  ref={photoWrapRef}
                  className="w-full h-full transform-gpu"
                  style={{ willChange: "transform" }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1600&q=85"
                    alt="NOIR Philosophy — Tailored Structure & Fabric Detail"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-center filter grayscale contrast-[1.12] brightness-[0.88] group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                </div>
              </div>

              {/* Subtle Atmospheric Vignettes */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </motion.div>

          {/* Right Side: Editorial Philosophy Text & 3 Principles (48% width with subtle scroll depth) */}
          <div
            ref={typographyRef}
            className="w-full lg:w-[48%] flex flex-col justify-center space-y-6 sm:space-y-8 transform-gpu"
            style={{ willChange: "transform" }}
          >
            {/* Eyebrow & Main Headings */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-[#c5a46d] font-mono text-[10px] sm:text-xs tracking-[0.3em] uppercase font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>THE NOIR PHILOSOPHY</span>
              </div>

              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase font-display tracking-tight text-white leading-[0.95]">
                LESS, BUT BETTER.
              </h2>

              <p className="text-base sm:text-lg text-neutral-300 font-editorial italic tracking-wide leading-relaxed pt-2">
                &ldquo;Fashion is not about more. It&apos;s about making every detail matter.&rdquo;
              </p>
            </div>

            {/* Subtle Horizontal Divider */}
            <div className="w-full h-[1px] bg-gradient-to-r from-white/20 via-white/10 to-transparent" />

            {/* Three Editorial Principles */}
            <div className="space-y-6 sm:space-y-7">
              {PHILOSOPHY_PRINCIPLES.map((principle, idx) => (
                <motion.div
                  key={principle.num}
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 + idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-1.5 border-l-2 border-white/10 hover:border-[#c5a46d] pl-5 sm:pl-6 transition-colors duration-300 group/item"
                >
                  <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs font-bold text-[#c5a46d] tracking-[0.25em] uppercase">
                    <span>{principle.num} &mdash; {principle.label}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-300 font-sans tracking-wide leading-relaxed">
                    &ldquo;{principle.quote}&rdquo;
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* AREA 2: NEWSLETTER SUBSCRIPTION (Maintained completely stable and grounded) */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto p-5 sm:p-12 md:p-16 bg-[#080808] border border-white/15 text-center space-y-6 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Ambient Corner Glow */}
          <div className="pointer-events-none absolute -bottom-20 -right-20 w-60 h-60 bg-[#c5a46d]/10 rounded-full blur-[80px]" />

          <div className="space-y-3">
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#c5a46d] font-bold">
              EXCLUSIVE CLIENT PRIVILEGES
            </span>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase font-display tracking-tight text-white leading-tight">
              JOIN THE NOIR WORLD
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans tracking-wide max-w-md mx-auto leading-relaxed">
              Get updates on new collections and exclusive releases.
            </p>
          </div>

          <div className="max-w-md mx-auto pt-2">
            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="p-5 bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-center gap-3 text-left"
                >
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
                      SUBSCRIPTION CONFIRMED
                    </p>
                    <p className="text-[11px] text-neutral-300 font-sans mt-0.5">
                      You are now inscribed in our private client register.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubscribe}
                  className="space-y-3"
                >
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === "error") setStatus("idle");
                      }}
                      placeholder="Enter your email address"
                      disabled={status === "loading"}
                      className="flex-1 bg-black/80 border border-white/20 focus:border-[#c5a46d] px-4 py-3.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none transition-colors disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={status === "loading" || !email.trim()}
                      onMouseEnter={() => setCursor("hover")}
                      onMouseLeave={resetCursor}
                      className="px-8 py-3.5 bg-[#c5a46d] hover:bg-[#d6b77e] disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-mono text-xs font-bold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-lg hover:shadow-[#c5a46d]/20"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>SENDING</span>
                        </>
                      ) : (
                        <>
                          <span>SUBSCRIBE</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {status === "error" && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-2 text-rose-400 text-xs font-mono pt-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
