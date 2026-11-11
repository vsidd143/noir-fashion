"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { useCursor } from "@/context/CursorContext";

// Register GSAP ScrollTrigger plugin on client
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface EditorialCardItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  href: string;
  image: string;
}

const EDITORIAL_CARDS: EditorialCardItem[] = [
  {
    id: "men",
    category: "MEN",
    title: "MEN'S ATELIER",
    subtitle: "Heavyweight hoodies, tailored outerwear & structural trousers.",
    href: "/men",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8ExBCJe9jANyqQmr7-fZuaDKXMOUwE6BHvdjjxOwu5Q&s=10",
  },
  {
    id: "women",
    category: "WOMEN",
    title: "WOMEN'S COUTURE",
    subtitle: "Sculptural jackets, draped product & minimalist tailoring.",
    href: "/women",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtoMaFTS-J6IevQTBHJY2-kUbu8l7K7-QEQRK3uEP7Iw&s",
  },
  {
    id: "kids",
    category: "KIDS",
    title: "KIDS ARCHIVE",
    subtitle: "Contemporary luxury scaled down for the next generation.",
    href: "/kids",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQg4EsgAbNHE7dca6UXnoMLILBvZWgdHBxUp7qLITY6FQ&s",
  },
  {
    id: "new-arrivals",
    category: "NEW ARRIVALS",
    title: "NEW ARRIVALS",
    subtitle: "Limited seasonal releases fresh from the nocturnal runway.",
    href: "/new-arrivals",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTSAm-BpdtkefRz8ArLlNMB4zzdoyosq2hcyvBNkgrbZQ&s=10",
  },
];

export default function EditorialCards() {
  const { setCursor, resetCursor } = useCursor();
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current || !gridRef.current) return;

    // Check user accessibility preference
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = gsap.utils.toArray<HTMLElement>(".editorial-card", gridRef.current);
    const imgParallaxes = gsap.utils.toArray<HTMLElement>(".editorial-img-parallax", gridRef.current);

    if (cards.length === 0) return;

    if (prefersReduced) {
      gsap.set(cards, { y: 0, opacity: 1, scale: 1, clearProps: "all" });
      if (imgParallaxes.length) gsap.set(imgParallaxes, { clearProps: "all" });
      return;
    }

    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 768;
      const dropDistance = isMobile ? -100 : -140;

      // 1. Bidirectional, fully reversible card drop animation powered by GSAP ScrollTrigger scrub
      const dropTl = gsap.timeline({
        scrollTrigger: {
          trigger: gridRef.current,
          start: "top 90%", // Starts as cards grid enters 90% of viewport
          end: "top 35%",   // Completes when cards grid reaches 35% of viewport
          scrub: 0.6,       // Smooth 0.6s scroll synchronization in both directions
          invalidateOnRefresh: true,
        },
      });

      dropTl.fromTo(
        cards,
        {
          y: dropDistance,
          opacity: 0.2,
          scale: 0.96,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1,
          stagger: 0.12,    // 0.12s stagger delay between cards
          ease: "power2.out",
          force3D: true,
        }
      );

      // 2. Nested inner image parallax: Shifts background photography subtly within its overflow-hidden container
      if (imgParallaxes.length > 0) {
        const imgTl = gsap.timeline({
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });

        imgTl.fromTo(
          imgParallaxes,
          {
            yPercent: isMobile ? -4 : -8,
          },
          {
            yPercent: isMobile ? 4 : 8,
            ease: "none",
            force3D: true,
          }
        );
      }
    }, sectionRef);

    // Refresh ScrollTrigger calculations after initial DOM layout settling
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert(); // Cleanly revert timeline and remove all ScrollTrigger listeners on unmount
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="editorial-collections"
      className="relative w-full pt-20 sm:pt-36 pb-16 sm:pb-32 px-4 sm:px-10 lg:px-16 bg-[#050505] border-t border-white/[0.08] select-none overflow-hidden scroll-mt-20 sm:scroll-mt-32"
    >
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-14">
        {/* Editorial Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-white/10">
          <div className="space-y-2 sm:space-y-3 max-w-xl">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase font-display tracking-tight text-white leading-none">
              EDITORIAL CHAPTERS
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans tracking-wide max-w-md leading-relaxed">
            Four curated fashion departments engineered with architectural precision, bespoke fabrications, and minimal product.
          </p>
        </div>

        {/* 2-Column Responsive Grid on Desktop (GSAP ScrollTrigger scrub target) */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 lg:gap-10">
          {EDITORIAL_CARDS.map((card) => (
            <div
              key={card.id}
              className="editorial-card group relative transform-gpu"
              style={{ willChange: "transform, opacity" }}
            >
              <Link
                href={card.href}
                onMouseEnter={() => setCursor("hover")}
                onMouseLeave={resetCursor}
                className="relative block w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden bg-neutral-950 border border-white/10 hover:border-[#c5a46d]/80 transition-all duration-700 focus:outline-none focus:ring-1 focus:ring-[#c5a46d]"
                aria-label={`Explore ${card.category}`}
              >
                {/* Parallax Image Inner Wrapper (-inset-y provides overflow margin for seamless -8% to +8% travel) */}
                <div className="absolute -inset-y-10 inset-x-0 w-full h-[calc(100%+5rem)] overflow-hidden pointer-events-none">
                  <div
                    className="editorial-img-parallax w-full h-full transform-gpu"
                    style={{ willChange: "transform" }}
                  >
                    <img
                      src={card.image}
                      alt={card.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center filter grayscale-[30%] brightness-[0.85] contrast-[1.05] group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                  </div>
                </div>

                {/* Dark Gradient Lighting Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/95 via-[#050505]/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/60 via-transparent to-transparent pointer-events-none" />

                {/* Corner Golden Accent Line */}
                <div className="absolute top-0 right-0 w-16 h-[1px] bg-gradient-to-l from-[#c5a46d] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute top-0 right-0 w-[1px] h-16 bg-gradient-to-b from-[#c5a46d] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Top Tag & Corner Action Pill */}
                <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between pointer-events-none">
                  <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.28em] text-[#c5a46d] font-semibold uppercase">
                    {card.category}
                  </span>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 border border-white/20 group-hover:border-[#c5a46d] group-hover:bg-[#c5a46d] text-white group-hover:text-black flex items-center justify-center transition-all duration-500 backdrop-blur-md">
                    <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>

                {/* Bottom Content Area */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 space-y-1.5 sm:space-y-2 pointer-events-none">
                  <h3 className="text-xl sm:text-3xl lg:text-4xl font-black font-display uppercase tracking-tight text-white group-hover:text-[#c5a46d] transition-colors duration-300">
                    {card.category}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 font-sans tracking-wide max-w-sm line-clamp-2">
                    {card.subtitle}
                  </p>
                  <div className="pt-1.5 sm:pt-2 flex items-center gap-2 text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase text-white/80 group-hover:text-[#c5a46d] transition-colors">
                    <span>EXPLORE COLLECTION</span>
                    <span className="text-sm transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
