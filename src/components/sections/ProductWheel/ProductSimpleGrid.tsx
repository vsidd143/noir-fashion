"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import { WHEEL_SECTION_COPY } from "./constants";

interface ProductSimpleGridProps {
  products: Product[];
}

export default function ProductSimpleGrid({ products }: ProductSimpleGridProps) {
  return (
    <section
      id="new-this-month"
      className="relative z-20 w-full bg-[#F4F0E8] text-[#161616] py-12 sm:py-20 border-t border-[#E5E0D8]"
      aria-label="New this month collection"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12 space-y-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-normal tracking-tight text-[#161616]">
          {WHEEL_SECTION_COPY.heading}
        </h2>

        {products.length === 0 ? (
          <div className="py-12 border border-[#E5E0D8] rounded-[2px] p-8 text-center bg-white/40">
            <p className="font-mono text-xs uppercase tracking-widest text-[#6E6D68]">
              No new arrivals registered
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl">
            {products.map((product) => {
              const primaryImg =
                product.images?.[0] || product.thumbnail || "/images/placeholder-silhouette.png";
              return (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group block space-y-3"
                >
                  <div className="relative aspect-auto min-h-[340px] bg-[#EFECE6] border border-[#E5E0D8] rounded-[2px] overflow-hidden group-hover:border-[#1A3B8B] transition-colors">
                    <Image
                      src={primaryImg}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 400px"
                      className="object-contain p-4 group-hover:scale-102 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-headline font-normal text-[#161616] group-hover:text-[#1A3B8B] transition-colors">
                      {product.name}
                    </span>
                    <span className="text-xs font-mono font-medium text-[#161616]">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

