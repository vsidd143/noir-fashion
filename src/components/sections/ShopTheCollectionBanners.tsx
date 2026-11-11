"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { useCursor } from "@/context/CursorContext";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface CampaignBanner {
  id: string;
  department: string;
  subtitle: string;
  description: string;
  number: string;
  href: string;
  image: string;
}

const BANNERS: CampaignBanner[] = [
  {
    id: "men",
    department: "MEN",
    subtitle: "STRUCTURAL FORM & HEAVYWEIGHT DRAPE",
    description: "480 GSM French terry hoodies, oversized bomber jackets & technical modular cargo product.",
    number: "01",
    href: "/men",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1400&q=85",
  },
  {
    id: "women",
    department: "WOMEN",
    subtitle: "SCULPTURAL LINES & FLUID COUTURE",
    description: "Architectural cropped outerwear, raw-edge tailored coats & draped monochrome dresses.",
    number: "02",
    href: "/women",
    image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1400&q=85",
  },
  {
    id: "kids",
    department: "KIDS",
    subtitle: "JUVENILE STREETWEAR ARCHIVE",
    description: "Downscaled luxury street product engineered with organic cotton and reinforced construction.",
    number: "03",
    href: "/kids",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1400&q=85",
  },
];

export default function ShopTheCollectionBanners() {
  const { setCursor, resetCursor } = useCursor();
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current || !gridRef.current) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const imgWraps = gsap.utils.toArray<HTMLElement>(".campaign-img-parallax", gridRef.current);
    const contentLayers = gsap.utils.toArray<HTMLElement>(".campaign-content-layer", gridRef.current);
    const labelLayers = gsap.utils.toArray<HTMLElement>(".campaign-label-layer", gridRef.current);

    if (imgWraps.length === 0) return;

    if (prefersReduced) {
      gsap.set(imgWraps, { clearProps: "all" });
      gsap.set(contentLayers, { clearProps: "all" });
      gsap.set(labelLayers, { clearProps: "all" });
      return;
    }

    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 768;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      // 1. Large background campaign image moves at slow scroll speed inside tall frames (-10% to +10%)
      tl.fromTo(
        imgWraps,
        {
          yPercent: isMobile ? -5 : -10,
        },
        {
          yPercent: isMobile ? 5 : 10,
          ease: "none",
          force3D: true,
        },
        0
      );

      // 2. Bottom narrative text and CTA float on a counter-layer with subtle displacement
      tl.fromTo(
        contentLayers,
        {
          y: isMobile ? 8 : 16,
        },
        {
          y: isMobile ? -8 : -16,
          ease: "none",
          force3D: true,
        },
        0
      );

      // 3. Top department and campaign number badges float on separate layer
      tl.fromTo(
        labelLayers,
        {
          y: isMobile ? 4 : 8,
        },
        {
          y: isMobile ? -4 : -8,
          ease: "none",
          force3D: true,
        },
        0
      );
    }, sectionRef);

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-16 sm:py-28 px-4 sm:px-10 lg:px-16 bg-[#050505] border-t border-white/[0.08] select-none overflow-hidden"
    >
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-white/10">
          <div className="space-y-2 sm:space-y-3 max-w-xl">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase font-display tracking-tight text-white leading-none">
              SHOP THE COLLECTION
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans tracking-wide max-w-md leading-relaxed">
            Immerse yourself in our three core design divisions, each crafted to challenge conventional product through structural volume and dark minimalism.
          </p>
        </div>

        {/* 3-Column Tall Editorial Campaign Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
          {BANNERS.map((banner, idx) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.65, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="group relative"
            >
              <Link
                href={banner.href}
                onMouseEnter={() => setCursor("hover")}
                onMouseLeave={resetCursor}
                className="relative block w-full aspect-[3/4] sm:aspect-[4/5] md:aspect-[3/5] overflow-hidden bg-neutral-950 border border-white/10 hover:border-[#c5a46d] transition-all duration-700 focus:outline-none"
                aria-label={`Shop ${banner.department}`}
              >
                {/* Parallax Background Image Container (-inset-y provides boundary for -10% to +10% travel) */}
                <div className="absolute -inset-y-12 inset-x-0 w-full h-[calc(100%+6rem)] overflow-hidden pointer-events-none">
                  <div
                    className="campaign-img-parallax w-full h-full transform-gpu"
                    style={{ willChange: "transform" }}
                  >
                    <img
                      src={banner.image}
                      alt={banner.department}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center filter grayscale-[40%] brightness-[0.8] contrast-[1.1] group-hover:grayscale-0 group-hover:brightness-95 group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                  </div>
                </div>

                {/* Lighting Vignette Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/45 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/60 via-transparent to-transparent pointer-events-none" />

                {/* Top Numbering & Division Label (Layered Parallax) */}
                <div
                  className="campaign-label-layer absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between pointer-events-none transform-gpu"
                  style={{ willChange: "transform" }}
                >
                  <span className="font-mono text-xs tracking-[0.3em] text-[#c5a46d] font-bold">
                    {`// ${banner.number}`}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.25em] text-neutral-400 uppercase bg-black/50 px-2.5 py-1 border border-white/10 backdrop-blur-sm">
                    CAMPAIGN
                  </span>
                </div>

                {/* Bottom Narrative & CTA (Layered Parallax) */}
                <div
                  className="campaign-content-layer absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 space-y-2.5 sm:space-y-3 pointer-events-none transform-gpu"
                  style={{ willChange: "transform" }}
                >
                  <div className="space-y-1">
                    <p className="font-mono text-[9px] sm:text-[10px] tracking-[0.25em] text-[#c5a46d] uppercase font-semibold">
                      {banner.subtitle}
                    </p>
                    <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black font-display uppercase tracking-tight text-white group-hover:text-[#c5a46d] transition-colors duration-300">
                      {banner.department}
                    </h3>
                  </div>

                  <p className="text-xs text-neutral-300 font-sans tracking-wide leading-relaxed line-clamp-2">
                    {banner.description}
                  </p>

                  <div className="pt-2">
                    <div className="inline-flex items-center gap-3 px-4 py-2.5 border border-white/20 group-hover:border-[#c5a46d] bg-black/40 group-hover:bg-[#c5a46d] text-white group-hover:text-black font-mono text-xs uppercase tracking-[0.2em] transition-all duration-300">
                      <span>EXPLORE</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
