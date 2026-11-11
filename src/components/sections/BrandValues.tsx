"use client";

import React from "react";
import { Scissors, Package, Banknote } from "lucide-react";

const VALUES = [
  {
    icon: Scissors,
    title: "Durable Construction",
    description:
      "Proportion, reinforced seams, and considered fabrics designed to hold shape and wear comfortably over time.",
  },
  {
    icon: Package,
    title: "Delivery Across India",
    description:
      "Direct delivery to your doorstep across India with status updates and courier tracking on every package.",
  },
  {
    icon: Banknote,
    title: "Cash on Delivery",
    description:
      "Shop with complete confidence. Pay in cash directly to your delivery executive upon parcel arrival.",
  },
];

export default function BrandValues() {
  return (
    <section className="w-full bg-[#EFECE6] text-[#161616] py-16 sm:py-20 px-4 sm:px-8 lg:px-12 border-t border-[#E5E0D8]">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B]">
            Our Commitment
          </span>
          <h2 className="text-3xl sm:text-4xl font-headline font-normal tracking-tight text-[#161616]">
            Considered Design & Service
          </h2>
          <p className="text-sm text-[#6E6D68] font-body">
            Grounded in reliable construction, transparent ordering, and doorstep service.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {VALUES.map((val, idx) => {
            const Icon = val.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-[#E5E0D8] p-6 sm:p-8 space-y-4 hover:border-[#1A3B8B] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#F4F0E8] border border-[#E5E0D8] flex items-center justify-center text-[#1A3B8B]">
                  <Icon className="w-5 h-5 stroke-[1.5]" />
                </div>
                <h3 className="text-xl font-headline text-[#161616]">
                  {val.title}
                </h3>
                <p className="text-sm text-[#6E6D68] font-body leading-relaxed">
                  {val.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

