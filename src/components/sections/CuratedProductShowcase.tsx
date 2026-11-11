"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Product } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/context/CartContext";
import { getLiveProducts } from "@/lib/products-service";
import { Eye, ShoppingBag, Heart, ArrowRight } from "lucide-react";

type FilterTab = "all" | "new" | "men" | "women" | "kids";

export default function CuratedProductShowcase() {
  const { addToCart, setQuickViewProduct, isInWishlist, toggleWishlist } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const live = await getLiveProducts();
        if (isMounted) {
          setProducts(live);
        }
      } catch (err) {
        console.warn("Could not fetch showcase products:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (activeTab === "all") return products;
    if (activeTab === "new") {
      const news = products.filter(
        (p) => p.isNew || p.tags?.some((t) => t.toLowerCase().includes("new"))
      );
      return news.length > 0 ? news : products;
    }
    return products.filter((p) => p.department === activeTab);
  }, [products, activeTab]);

  return (
    <section
      id="curated-showcase"
      className="relative w-full bg-[#F4F0E8] text-[#161616] py-16 sm:py-24 px-4 sm:px-8 lg:px-12 border-t border-[#E5E0D8]"
    >
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        {/* Header with Title and Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E5E0D8]">
          <div>
            <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-2">
              Curated Garments
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-normal tracking-tight text-[#161616]">
              Selected Pieces
            </h2>
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: "all", label: "All Items" },
              { id: "new", label: "New Arrivals" },
              { id: "men", label: "Men" },
              { id: "women", label: "Women" },
              { id: "kids", label: "Kids" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FilterTab)}
                  className={`px-3.5 py-1.5 text-xs font-body transition-colors shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-[#161616] text-white font-medium"
                      : "bg-white text-[#6E6D68] hover:text-[#161616] border border-[#E5E0D8]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-[#E5E0D8] p-4 space-y-4 animate-pulse"
              >
                <div className="aspect-[3/4] bg-[#EFECE6] w-full" />
                <div className="h-4 bg-[#EFECE6] w-3/4" />
                <div className="h-4 bg-[#EFECE6] w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white border border-[#E5E0D8] p-8 max-w-md mx-auto">
            <h3 className="text-lg font-headline text-[#161616]">
              No products found in this category
            </h3>
            <p className="text-xs text-[#6E6D68] font-body">
              Check back soon for new additions to the collection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {filteredProducts.map((product) => {
              const isSaved = isInWishlist(product.id);
              const inStock = (product.stock_quantity ?? 0) > 0;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="group bg-white border border-[#E5E0D8] hover:border-[#1A3B8B] transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  {/* Image Display */}
                  <div className="relative aspect-[3/4] w-full bg-[#F7F5F0] overflow-hidden">
                    <Link
                      href={`/product/${product.id}`}
                      className="block w-full h-full relative overflow-hidden"
                    >
                      <img
                        src={product.images[0] || product.thumbnail}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    </Link>

                    {/* Top Badges & Actions */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      {product.isNew ? (
                        <span className="px-2 py-0.5 bg-[#1A3B8B] text-white font-body text-[10px] font-medium uppercase tracking-wider">
                          New
                        </span>
                      ) : (
                        <span />
                      )}

                      <div className="ml-auto pointer-events-auto flex items-center gap-1.5">
                        <button
                          onClick={() => setQuickViewProduct(product)}
                          className="p-1.5 bg-white/90 hover:bg-white text-[#161616] hover:text-[#1A3B8B] border border-[#E5E0D8] transition-colors cursor-pointer shadow-sm"
                          aria-label="Quick View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleWishlist(product.id, product)}
                          className={`p-1.5 border transition-colors cursor-pointer shadow-sm ${
                            isSaved
                              ? "bg-rose-50 border-rose-300 text-rose-600"
                              : "bg-white/90 border-[#E5E0D8] text-[#161616] hover:text-[#1A3B8B]"
                          }`}
                          aria-label="Save to Wishlist"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-body text-[#6E6D68] uppercase tracking-wider">
                        <span>{product.department}</span>
                        <span className={inStock ? "text-emerald-700" : "text-neutral-400"}>
                          {inStock ? "In stock" : "Sold out"}
                        </span>
                      </div>

                      <Link href={`/product/${product.id}`} className="block">
                        <h3 className="font-headline text-base sm:text-lg text-[#161616] group-hover:text-[#1A3B8B] transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>
                    </div>

                    <div className="pt-2 border-t border-[#E5E0D8] flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-sm sm:text-base font-medium text-[#161616]">
                          {formatPrice(product.price)}
                        </span>
                        {product.originalPrice && (
                          <span className="font-mono text-xs line-through text-[#A09D96]">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => addToCart(product, product.colors?.[0], product.sizes?.[0] || "M", 1)}
                        disabled={!inStock}
                        className="p-1.5 bg-[#161616] hover:bg-[#1A3B8B] disabled:bg-neutral-200 disabled:text-neutral-400 text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                        aria-label={`Add ${product.name} to bag`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
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
