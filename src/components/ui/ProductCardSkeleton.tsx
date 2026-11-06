"use client";

import React from "react";

export function ProductCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      style={{ animationDelay: `${index * 80}ms` }}
      className="relative flex flex-col justify-between bg-[#0a0a0a] border border-white/[0.08] p-4 overflow-hidden animate-pulse"
    >
      {/* Shimmering Visual Placeholder */}
      <div className="relative aspect-[3/4] w-full bg-neutral-900/80 overflow-hidden mb-4">
        {/* Subtle Luxury Gradient Wave */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c5a46d]/[0.05] to-transparent animate-shimmer" />

        {/* Top Badges Placeholder */}
        <div className="absolute top-3 left-3 w-16 h-4 bg-white/10 rounded-xs" />
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10" />
      </div>

      {/* Metadata Skeleton Placeholders */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="w-16 h-2.5 bg-[#c5a46d]/20 rounded-xs" />
          <div className="w-10 h-2.5 bg-white/10 rounded-xs" />
        </div>

        <div className="w-3/4 h-3.5 bg-white/15 rounded-xs" />
        <div className="w-1/2 h-2.5 bg-white/10 rounded-xs" />

        {/* Pricing & CTA Line */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <div className="w-20 h-4 bg-[#c5a46d]/30 rounded-xs" />
          <div className="w-16 h-5 bg-white/10 rounded-xs" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

