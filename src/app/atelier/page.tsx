"use client";

import React from "react";
import { motion } from "framer-motion";
import PageShell from "@/components/layout/PageShell";
import BrandStory from "@/components/sections/BrandStory";
import NewsletterSection from "@/components/sections/NewsletterSection";
import { Sparkles, Scissors, Cpu, ShieldCheck, Award, Layers } from "lucide-react";

export default function AtelierPage() {
  const standards = [
    {
      title: "Premium Heavyweight Cotton",
      detail: "100% organic cotton yarn spun with high-density weave to achieve our signature 480 GSM soft, structured drape.",
      icon: Layers,
    },
    {
      title: "Durable Metal Hardware",
      detail: "Laser-etched aglets, quick-release magnetic buckles, and heavy-duty snap fasteners built to last.",
      icon: Cpu,
    },
    {
      title: "Clean Bonded Seams",
      detail: "Precision-taped waterproof seams that eliminate chafing and keep wind and rain completely out.",
      icon: Scissors,
    },
    {
      title: "Numbered Edition Authenticity",
      detail: "Every piece comes with an individual authenticity serial number and official verification certificate.",
      icon: Award,
    },
  ];

  return (
    <PageShell>
      {/* Atelier Hero Header */}
      <section className="relative pt-36 pb-16 px-6 md:px-14 bg-[#050505] border-b border-white/[0.06] overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-1/3 w-96 h-96 bg-[#c5a46d]/10 rounded-full blur-[140px]" />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-4"
          >
            <Sparkles className="w-4 h-4" />
            <span>NOIR Studio // Craftsmanship & Materials</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black uppercase font-display tracking-tight text-white max-w-4xl leading-[0.95]"
          >
            THE OBSIDIAN <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f0e6d2] to-[#c5a46d]">ATELIER</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-xs sm:text-sm text-neutral-400 font-mono max-w-2xl leading-relaxed"
          >
            Operating as an independent luxury studio with flagship locations across Mumbai, Delhi, and Bengaluru. Rejecting fast-fashion overproduction in favor of numbered limited batches and modern, clean tailoring.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-6 text-xs font-mono text-[#c5a46d]"
          >
            <span>FOUNDED 2024</span>
            <span>•</span>
            <span>MUMBAI // DELHI // BENGALURU</span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>LIFETIME ATELIER GUARANTEE</span>
            </span>
          </motion.div>
        </div>
      </section>

      {/* Interactive 4 Pillars Showcase */}
      <BrandStory />

      {/* Atelier Craft Standards Section */}
      <section className="py-24 px-6 md:px-14 bg-[#0a0a0a] border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-14">
            <span className="text-[10px] font-mono tracking-[0.3em] text-[#c5a46d] uppercase block mb-2">
              Specifications & Guarantees
            </span>
            <h3 className="text-3xl sm:text-4xl font-black uppercase font-display text-white">
              ENGINEERED WITHOUT COMPROMISE
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {standards.map((std, i) => {
              const Icon = std.icon;
              return (
                <div
                  key={i}
                  className="p-8 bg-neutral-950 border border-white/10 hover:border-[#c5a46d]/50 transition-all space-y-4 group"
                >
                  <div className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-[#c5a46d] group-hover:border-[#c5a46d] group-hover:bg-[#c5a46d] group-hover:text-black transition-all">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold uppercase font-display text-white">
                    {std.title}
                  </h4>
                  <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                    {std.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* VIP Access Newsletter */}
      <NewsletterSection />
    </PageShell>
  );
}
