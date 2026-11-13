"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import { WHEEL_SECTION_COPY } from "./constants";

interface ProductSnapStripProps {
  products: Product[];
}

export default function ProductSnapStrip({ products }: ProductSnapStripProps) {
  return (
    <section
      id="new-this-month"
      className="relative z-20 w-full bg-[#F4F0E8] text-[#161616] py-10 sm:py-16 border-t border-[#E5E0D8] overflow-hidden"
      aria-label="New this month collection"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12 space-y-6 sm:space-y-8">
        {/* Dedicated Header Block strictly matching page container alignment */}
        <div className="pb-2">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-normal tracking-tight text-[#161616]">
            {WHEEL_SECTION_COPY.heading}
          </h2>
        </div>

        {/* Horizontal Scroll-Snap Strip starting at exact same left container edge */}
        <div className="w-full overflow-x-auto no-scrollbar snap-x snap-mandatory flex gap-4 sm:gap-6 pb-6 pt-1 scroll-smooth">
          {products.map((product, idx) => {
            const primaryImg =
              product.images?.[0] || product.thumbnail || "/images/placeholder-product.png";
            const productHref = `/product/${product.id}`;

            return (
              <div
                key={product.id || idx}
                className="w-[72vw] sm:w-[220px] md:w-[240px] shrink-0 snap-start group"
              >
                <Link
                  href={productHref}
                  tabIndex={0}
                  className="block relative aspect-[4/5] bg-[#EFECE6] border border-[#E5E0D8] rounded-[2px] overflow-hidden transition-all duration-300 group-hover:border-[#1A3B8B] group-focus:border-[#1A3B8B] group-focus:ring-2 group-focus:ring-[#1A3B8B]/30 outline-none"
                  aria-label={`${product.name} - ${formatPrice(product.price)}`}
                >
                  <Image
                    src={primaryImg}
                    alt={product.name}
                    fill
                    unoptimized={primaryImg.startsWith("http")}
                    sizes="(max-width: 640px) 72vw, (max-width: 1024px) 220px, 240px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-103"
                    priority={idx < 2}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = "/images/placeholder-product.png";
                    }}
                  />

                  {/* Badges: Top-Left ONLY with consistent padding */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none z-10">
                    {product.isNew && (
                      <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-[#161616] text-[#F4F0E8] font-medium rounded-[1px] shadow-xs">
                        New
                      </span>
                    )}
                    {product.category && (
                      <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-white/95 text-[#161616] font-medium border border-[#E5E0D8] rounded-[1px] shadow-xs">
                        {product.category}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Caption below card (touch target >= 44px) */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link
                      href={productHref}
                      className="text-sm font-headline font-normal text-[#161616] truncate hover:text-[#1A3B8B] transition-colors py-1 inline-block"
                    >
                      {product.name}
                    </Link>
                    <span className="text-xs font-mono font-medium text-[#161616] shrink-0">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* End padding spacer ensuring the last card fully fits with zero price cutoff */}
          <div className="w-6 shrink-0 sm:w-12" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
