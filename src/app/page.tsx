"use client";

import React, { useState, useEffect } from "react";
import PageShell from "@/components/layout/PageShell";
import LoadingScreen from "@/components/ui/LoadingScreen";
import HeroSection from "@/components/sections/HeroSection";
import TrendingCarousel from "@/components/sections/TrendingCarousel";
import NewsletterSection from "@/components/sections/NewsletterSection";
import { usePageTransition } from "@/context/PageTransitionContext";
import { ArrowUpRight, Sparkles, Layers, Compass, Scissors, Film } from "lucide-react";

export default function HomePage() {
  const [loadingComplete, setLoadingComplete] = useState(true);
  const [showInitialLoader, setShowInitialLoader] = useState(false);
  const { navigateTo } = usePageTransition();

  useEffect(() => {
    // Only show full 3D intro loader on first site visit in this session
    if (typeof window !== "undefined") {
      const hasVisited = sessionStorage.getItem("noir_intro_shown");
      if (!hasVisited) {
        queueMicrotask(() => {
          setShowInitialLoader(true);
          setLoadingComplete(false);
        });
        sessionStorage.setItem("noir_intro_shown", "true");
      }
    }
  }, []);

  const portals = [
    {
      tag: "01 // RUNWAY",
      title: "THE COLLECTION",
      description: "Heavy 480 GSM loopback cotton, durable matte hardware, and relaxed modern proportions.",
      href: "/collection",
      icon: Layers,
      image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85",
    },
    {
      tag: "02 // ARCHIVE",
      title: "EDITORIAL LOOKBOOK",
      description: "Visual chapters exploring style, silhouettes, and modern streetwear aesthetic across city landscapes.",
      href: "/lookbook",
      icon: Compass,
      image: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1200&q=85",
    },
    {
      tag: "03 // CRAFT",
      title: "THE ATELIER",
      description: "Discover our craftsmanship: organic heavy cotton, custom tailoring, and limited runs under 250 pieces.",
      href: "/atelier",
      icon: Scissors,
      image: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1200&q=85",
    },
    {
      tag: "04 // SYNTHESIS",
      title: "CAMPAIGN 2026",
      description: "Monochrome Metropolis: Exploring contemporary luxury streetwear through cinematic photography and film stills.",
      href: "/campaign",
      icon: Film,
      image: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1200&q=85",
    },
  ];

  return (
    <>
      {showInitialLoader && !loadingComplete && (
        <LoadingScreen onComplete={() => setLoadingComplete(true)} />
      )}

      <PageShell>
        {/* Hero Section with Interactive 3D WebGL Monolith */}
        <HeroSection />

        {/* Trending Runway Pieces */}
        <TrendingCarousel />

        {/* Cinematic Universe Portals */}
        <section className="relative w-full py-24 md:py-36 px-6 md:px-14 bg-[#070707] border-t border-white/[0.06]">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>The NOIR Universe</span>
                </div>
                <h2 className="text-4xl sm:text-6xl font-black uppercase font-display tracking-tight text-white">
                  EXPLORE NOIR
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-neutral-400 font-light max-w-lg">
                  Explore our collections, editorial lookbook, craftsmanship stories, and seasonal campaign.
                </p>
              </div>
            </div>

            {/* Portals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {portals.map((portal) => {
                const Icon = portal.icon;
                return (
                  <button
                    key={portal.href}
                    onClick={() => navigateTo(portal.href)}
                    className="group relative text-left bg-neutral-950 border border-white/10 hover:border-[#c5a46d]/60 overflow-hidden transition-all duration-500 p-8 sm:p-12 flex flex-col justify-between min-h-[340px]"
                  >
                    {/* Background Image with Hover Zoom */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                      <img
                        src={portal.image}
                        alt={portal.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700 ease-out grayscale group-hover:grayscale-0"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
                    </div>

                    {/* Top Tag & Icon */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-[10px] font-mono tracking-[0.3em] text-[#c5a46d] font-bold uppercase">
                        {portal.tag}
                      </span>
                      <div className="p-2.5 rounded-full border border-white/10 bg-black/60 group-hover:border-[#c5a46d] transition-colors">
                        <Icon className="w-4 h-4 text-[#c5a46d]" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 space-y-3 mt-12">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl sm:text-3xl font-black uppercase font-display text-white tracking-wider group-hover:text-[#c5a46d] transition-colors">
                          {portal.title}
                        </h3>
                        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#c5a46d] group-hover:bg-[#c5a46d] group-hover:text-black transition-all">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-xs text-neutral-400 font-mono leading-relaxed max-w-md">
                        {portal.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <NewsletterSection />
      </PageShell>
    </>
  );
}
