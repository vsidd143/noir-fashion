"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Product } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/context/CartContext";
import { useCursor } from "@/context/CursorContext";
import { getLiveProducts } from "@/lib/products-service";
import { ProductGridSkeleton } from "@/components/ui/ProductCardSkeleton";
import { Eye, ShoppingBag, Heart, ArrowRight, Tag } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function TrendingShowcase() {
  const { addToCart, setQuickViewProduct, isInWishlist, toggleWishlist } = useCart();
  const { setCursor, resetCursor } = useCursor();
  const sectionRef = useRef<HTMLElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const live = await getLiveProducts();
        if (!isMounted) return;

        // Prioritize best sellers, limited items, or featured products
        const trending = live.filter(
          (p) =>
            p.isLimited ||
            p.tags?.some((t) =>
              ["trending", "bestseller", "best-seller", "popular", "signature"].includes(t.toLowerCase())
            ) ||
            p.rating >= 4.8
        );

        // Fallback: If no products flagged as trending, pick the next slice of live products
        const finalSelection = (trending.length >= 2 ? trending : live.slice().reverse()).slice(0, 4);
        setProducts(finalSelection);
      } catch (err) {
        console.warn("Could not query trending products:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Subtle luxury micro-parallax on trending product photography inside rigid grid cards
  useEffect(() => {
    if (isLoading || products.length === 0 || !sectionRef.current) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const imgWraps = gsap.utils.toArray<HTMLElement>(".trending-img-parallax", sectionRef.current);

    if (imgWraps.length === 0) return;

    if (prefersReduced) {
      gsap.set(imgWraps, { clearProps: "all" });
      return;
    }

    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 768;

      gsap.fromTo(
        imgWraps,
        {
          yPercent: isMobile ? -3 : -6,
        },
        {
          yPercent: isMobile ? 3 : 6,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        }
      );
    }, sectionRef);

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, [isLoading, products]);

  const handleQuickAdd = (product: Product) => {
    const defaultColor = product.colors?.[0] || {
      name: "Obsidian Black",
      hex: "#0a0a0a",
      bgClass: "bg-neutral-950",
    };
    const defaultSize = product.sizes?.[0] || "M";
    addToCart(product, defaultColor, defaultSize, 1);
  };

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
              TRENDING NOW
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-xs sm:text-sm text-neutral-400 font-sans tracking-wide max-w-xs leading-relaxed hidden md:block">
              Signature runway cuts and bespoke fabrications currently in high demand worldwide.
            </p>
            <Link
              href="/new-arrivals"
              onMouseEnter={() => setCursor("hover")}
              onMouseLeave={resetCursor}
              className="inline-flex items-center gap-2 px-5 py-3 border border-white/20 hover:border-[#c5a46d] bg-white/[0.03] hover:bg-[#c5a46d] text-white hover:text-black font-mono text-xs uppercase tracking-[0.2em] transition-all duration-300"
            >
              <span>EXPLORE ALL PIECES</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Products Showcase */}
        {isLoading ? (
          <ProductGridSkeleton count={4} />
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="py-16 sm:py-20 px-4 sm:px-6 bg-[#080808] border border-white/10 text-center max-w-lg mx-auto space-y-5">
            <div className="w-14 h-14 rounded-full border border-white/10 bg-black flex items-center justify-center mx-auto text-[#c5a46d]">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase font-display text-white">
                ATELIER product CURATING
              </h3>
              <p className="text-xs text-neutral-400 font-mono mt-2 leading-relaxed">
                Our trend curation engine is compiling real-time demand metrics. Browse our current department catalogs.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/new-arrivals"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-mono text-xs font-bold uppercase tracking-wider transition-all"
              >
                <span>BROWSE CATALOG</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8">
            {products.map((product) => {
              const isSaved = isInWishlist(product.id);

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="group bg-[#090909] border border-white/10 hover:border-[#c5a46d]/60 transition-all duration-500 flex flex-col justify-between overflow-hidden"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[3/4] w-full bg-neutral-950 overflow-hidden">
                    <Link
                      href={`/product/${product.id}`}
                      onMouseEnter={() => setCursor("hover")}
                      onMouseLeave={resetCursor}
                      className="block w-full h-full relative overflow-hidden"
                    >
                      {/* Parallax Image Inner Wrapper */}
                      <div className="absolute -inset-y-5 inset-x-0 w-full h-[calc(100%+2.5rem)] pointer-events-none">
                        <div
                          className="trending-img-parallax w-full h-full transform-gpu"
                          style={{ willChange: "transform" }}
                        >
                          <img
                            src={product.images[0] || product.thumbnail}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                        </div>
                      </div>
                    </Link>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Top Badges & Actions */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 bg-black/85 border border-[#c5a46d]/50 text-[#c5a46d] font-mono text-[9px] font-black uppercase tracking-widest shadow-lg">
                        {product.isLimited ? "LIMITED EDITION" : "BEST SELLER"}
                      </span>

                      <div className="ml-auto pointer-events-auto flex items-center gap-1.5">
                        <button
                          onClick={() => setQuickViewProduct(product)}
                          className="p-2 bg-black/75 hover:bg-[#c5a46d] hover:text-black text-white rounded-full border border-white/15 transition-all cursor-pointer shadow-lg"
                          aria-label="Quick View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleWishlist(product.id, product)}
                          className={`p-2 rounded-full border transition-all cursor-pointer shadow-lg ${isSaved
                              ? "bg-rose-950/80 border-rose-500 text-rose-500"
                              : "bg-black/75 border-white/15 text-white hover:text-rose-400 hover:border-rose-400"
                            }`}
                          aria-label="Save to Wishlist"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Information Area */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                        <span>{product.category}</span>
                        {product.material && (
                          <span className="truncate max-w-[120px]">{product.material}</span>
                        )}
                      </div>

                      <Link
                        href={`/product/${product.id}`}
                        onMouseEnter={() => setCursor("hover")}
                        onMouseLeave={resetCursor}
                        className="block group/link"
                      >
                        <h3 className="text-sm font-bold font-display uppercase text-white group-hover/link:text-[#c5a46d] transition-colors truncate">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-base font-mono font-black text-white">
                          {formatPrice(product.price)}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-xs font-mono text-neutral-500 line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Add CTA */}
                    <div className="pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleQuickAdd(product)}
                        onMouseEnter={() => setCursor("hover")}
                        onMouseLeave={resetCursor}
                        className="w-full py-3 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-mono text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-[#c5a46d]/20"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add to Bag</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
