"use client";

import React, { useRef, useState, useEffect } from "react";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/context/CartContext";
import { useCursor } from "@/context/CursorContext";
import { usePageTransition } from "@/context/PageTransitionContext";
import { getLiveProducts } from "@/lib/products-service";
import { Product } from "@/types/fashion";
import { ChevronLeft, ChevronRight, ShoppingBag, Eye, Flame } from "lucide-react";

export default function TrendingCarousel() {
  const { addToCart, setQuickViewProduct } = useCart();
  const { setCursor, resetCursor } = useCursor();
  const { navigateTo } = usePageTransition();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      const live = await getLiveProducts();
      setProducts(live);
    })();
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Gracefully hide section when catalog is empty
  if (products.length === 0) {
    return null;
  }

  return (
    <section id="trending" className="relative w-full py-24 md:py-36 px-6 md:px-14 bg-[#050505] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        {/* Header with Nav Controls */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Section 05 // Trending Silhouettes</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase font-display text-white">
              RUNWAY ACCELERATION
            </h2>
          </div>

          {/* Arrow navigation buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => scroll("left")}
              className="p-3 border border-white/15 hover:border-[#c5a46d] text-white hover:text-[#c5a46d] transition-colors"
              aria-label="Scroll runway items left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-3 border border-white/15 hover:border-[#c5a46d] text-white hover:text-[#c5a46d] transition-colors"
              aria-label="Scroll runway items right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Carousel */}
        <div
          ref={scrollContainerRef}
          onMouseEnter={() => setCursor("drag", "DRAG")}
          onMouseLeave={resetCursor}
          className="flex gap-6 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[280px] sm:w-[340px] bg-[#090909] border border-white/10 hover:border-[#c5a46d]/50 transition-all duration-300 group flex flex-col justify-between"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-950">
                <img
                  src={product.images[0] || product.thumbnail}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                    product.images[1] ? "group-hover:opacity-0" : ""
                  } group-hover:scale-105`}
                />
                {product.images[1] && (
                  <img
                    src={product.images[1]}
                    alt={`${product.name} hover`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-50 pointer-events-none" />

                <div className="absolute top-3 left-3">
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest uppercase bg-black/70 backdrop-blur-md text-[#c5a46d] border border-[#c5a46d]/40">
                    EDITION #{product.editionCount || 100}
                  </span>
                </div>

                <div className="absolute inset-x-3 bottom-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setQuickViewProduct(product)}
                    className="flex-1 py-2 bg-black/80 text-white text-[10px] font-mono tracking-widest uppercase hover:bg-black transition-colors flex items-center justify-center gap-1.5 backdrop-blur-md"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Quick View</span>
                  </button>
                  <button
                    onClick={() => addToCart(product)}
                    className="p-2 bg-[#c5a46d] text-black hover:bg-[#d6b77e] transition-colors"
                    title="Add to Cart"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-5 flex items-center justify-between">
                <div 
                  onClick={() => navigateTo(`/product/${product.id}`)}
                  className="cursor-pointer"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white line-clamp-1 group-hover:text-[#c5a46d] transition-colors">
                    {product.name}
                  </h4>
                  <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                    {product.subtitle}
                  </p>
                </div>
                <span className="text-sm font-mono font-bold text-[#c5a46d]">
                  {formatPrice(product.price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
