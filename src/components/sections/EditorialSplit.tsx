"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface DepartmentStackItem {
  number: string;
  title: string;
  description: string;
  href: string;
}

const DEPARTMENT_STACK: DepartmentStackItem[] = [
  {
    number: "01",
    title: "Women",
    description: "Tailored jackets, relaxed dresses, and contemporary sets.",
    href: "/women",
  },
  {
    number: "02",
    title: "Kids",
    description: "Everyday luxury scaled for comfort and daily play.",
    href: "/kids",
  },
  {
    number: "03",
    title: "New Arrivals",
    description: "The latest additions to the NOIR collection.",
    href: "/new-arrivals",
  },
];

export default function EditorialSplit() {
  return (
    <section
      id="collections"
      className="relative w-full bg-[#F4F0E8] text-[#161616] pt-16 sm:pt-24 pb-14 sm:pb-20 px-4 sm:px-8 lg:px-12 border-t border-[#E5E0D8]"
    >
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E5E0D8]">
          <div>
            <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-2">
              Collections
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-normal tracking-tight text-[#161616]">
              Shop by Category
            </h2>
          </div>
          <p className="text-sm text-[#6E6D68] font-body max-w-md leading-relaxed">
            Thoughtfully designed clothing, intentional proportions, and contemporary product.
          </p>
        </div>

        {/* 55/45 Asymmetric Editorial Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left Column (55% width / 7 cols) — Feature Department Card */}
          <div className="lg:col-span-7 flex flex-col">
            <Link
              href="/men"
              className="group relative flex-1 flex flex-col justify-between p-6 sm:p-10 bg-[#161616] border border-[#E5E0D8] hover:border-[#1A3B8B] transition-all duration-300 min-h-[480px] sm:min-h-[560px] overflow-hidden rounded-none shadow-sm hover:shadow-lg"
              aria-label="Explore Men's Collection"
            >
              {/* Editorial Campaign Ad Image Background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <Image
                  src="/images/editorial-men-ad.jpg"
                  alt="NOIR Men's Collection Campaign — Tailored Outerwear"
                  fill
                  priority
                  unoptimized
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover object-top sm:object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {/* Gradient Overlays for pristine luxury editorial contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
              </div>

              {/* Top Tag & Indicator */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[11px] font-body font-semibold uppercase tracking-wider px-3 py-1 bg-white/95 backdrop-blur-md border border-white/30 text-[#1A3B8B] shadow-xs">
                  Featured Category
                </span>
                <span className="text-xs font-mono font-medium tracking-wider text-white/80 group-hover:text-white transition-colors drop-shadow-xs">
                  MEN
                </span>
              </div>

              {/* Bottom Feature Copy & CTA */}
              <div className="relative z-10 pt-28 sm:pt-36">
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-normal text-white group-hover:text-white transition-colors mb-3 tracking-tight drop-shadow-sm">
                  Men&apos;s Collection
                </h3>
                <p className="text-sm sm:text-base text-[#E5E0D8] font-body max-w-md leading-relaxed mb-6 drop-shadow-xs">
                  Structured outerwear, heavyweight hoodies, and tailored pieces designed for daily wear.
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-[#161616] group-hover:bg-[#1A3B8B] group-hover:text-white text-xs font-body font-medium uppercase tracking-wider transition-all duration-300 shadow-md">
                  <span>Explore Men</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>

          {/* Right Column (45% width / 5 cols) — Department Stack */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {DEPARTMENT_STACK.map((dept) => (
              <Link
                key={dept.number}
                href={dept.href}
                className="group flex-1 flex flex-col justify-between p-6 sm:p-7 bg-white border border-[#E5E0D8] hover:border-[#1A3B8B] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <span className="text-xs font-mono text-[#A09D96] group-hover:text-[#1A3B8B] transition-colors block mb-1">
                      {dept.number}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-headline font-normal text-[#161616] group-hover:text-[#1A3B8B] transition-colors">
                      {dept.title}
                    </h3>
                  </div>
                  <div className="p-2 rounded-full border border-[#E5E0D8] text-[#161616] group-hover:border-[#1A3B8B] group-hover:text-[#1A3B8B] group-hover:translate-x-0.5 transition-all shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <p className="text-sm text-[#6E6D68] font-body leading-relaxed mb-4">
                  {dept.description}
                </p>

                <div className="text-xs font-body font-medium text-[#161616] group-hover:text-[#1A3B8B] transition-colors inline-flex items-center gap-1.5">
                  <span>Explore {dept.title}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

