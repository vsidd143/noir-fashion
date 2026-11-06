"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PageShell from "@/components/layout/PageShell";
import { useCart } from "@/context/CartContext";
import { getLiveProducts } from "@/lib/products-service";
import { Product } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useCart();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const live = await getLiveProducts();
        setAllProducts(live);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const savedProducts = allProducts.filter((p) => wishlist.includes(p.id));

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 pt-36 pb-24">
        {/* Header */}
        <div className="border-b border-white/10 pb-8 mb-10">
          <div className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-2">
            <Heart className="w-4 h-4" />
            <span>Saved Items // Wishlist</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase font-display tracking-tight text-white">
            SAVED PIECES {savedProducts.length > 0 && <span className="text-[#c5a46d]">({savedProducts.length})</span>}
          </h1>
        </div>

        {isLoading ? (
          <div className="p-20 text-center font-mono text-xs text-neutral-500 uppercase tracking-widest">
            Loading Wishlist...
          </div>
        ) : savedProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-16 bg-neutral-950 border border-white/10 text-center max-w-lg mx-auto space-y-6 my-12"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#c5a46d]">
              <Heart className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase font-display text-white">
                Your Wishlist is Empty
              </h3>
              <p className="text-xs text-neutral-400 font-mono mt-2 leading-relaxed">
                Save your favorite styles from our collection to view or purchase them later.
              </p>
            </div>
            <Link
              href="/collection"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-widest uppercase font-mono transition-all"
            >
              <span>Discover Runway Pieces</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {savedProducts.map((product) => {
              const defaultColor = product.colors[0] || { name: "Obsidian", hex: "#0a0a0a", bgClass: "bg-black" };
              const defaultSize = product.sizes[0] || "M";

              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#0a0a0a] border border-white/10 hover:border-[#c5a46d]/50 transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="relative aspect-[3/4] bg-neutral-950 overflow-hidden">
                    <Link href={`/product/${product.id}`}>
                      <img
                        src={product.images[0] || product.thumbnail}
                        alt={product.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    </Link>
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-red-950/80 text-rose-500 rounded-full border border-white/10 transition-colors cursor-pointer"
                      title="Remove from saved vault"
                      aria-label="Remove from saved vault"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {product.isNew && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 text-[8px] font-bold tracking-widest uppercase bg-[#c5a46d] text-black font-mono">
                        NEW DROP
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block">
                        {product.category}
                      </span>
                      <Link
                        href={`/product/${product.id}`}
                        className="text-sm font-bold uppercase text-white hover:text-[#c5a46d] transition-colors block truncate mt-1"
                      >
                        {product.name}
                      </Link>
                      <div className="text-sm font-mono font-bold text-[#c5a46d] mt-2">
                        {formatPrice(product.price)}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => addToCart(product, defaultColor, defaultSize, 1)}
                        className="w-full py-2.5 bg-white/10 hover:bg-[#c5a46d] hover:text-black text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add to Bag</span>
                      </button>
                      <Link
                        href={`/product/${product.id}`}
                        className="w-full py-2 border border-white/10 hover:border-white text-neutral-400 hover:text-white text-[11px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors block text-center"
                      >
                        <span>Inspect Silhouette</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
