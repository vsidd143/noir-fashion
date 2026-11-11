"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { getLiveProducts } from "@/lib/products-service";
import { Product } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import { X, Heart, ShoppingBag, Trash2 } from "lucide-react";

export default function WishlistDrawer() {
  const { wishlist, isWishlistOpen, setIsWishlistOpen, toggleWishlist, addToCart } = useCart();
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      const live = await getLiveProducts();
      setAllProducts(live);
    })();
  }, [isWishlistOpen]);

  const savedProducts = allProducts.filter((p) => wishlist.includes(p.id));

  return (
    <AnimatePresence>
      {isWishlistOpen && (
        <div className="fixed inset-0 z-[200] overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsWishlistOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="w-screen max-w-md bg-[#0a0a0a] border-l border-white/10 flex flex-col justify-between shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-widest text-white uppercase font-display flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500 fill-current" />
                    Saved Atelier Pieces
                  </h2>
                  <p className="text-[11px] tracking-wider text-[#a0a0a0] uppercase font-mono mt-0.5">
                    {wishlist.length} {wishlist.length === 1 ? "Piece Saved" : "Pieces Saved"}
                  </p>
                </div>
                <button
                  onClick={() => setIsWishlistOpen(false)}
                  className="p-2 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-[#c5a46d] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {savedProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16">
                    <Heart className="w-12 h-12 text-neutral-700 mb-4 stroke-1" />
                    <h3 className="text-base font-bold tracking-wider text-white uppercase font-display">
                      Your wishlist is empty.
                    </h3>
                    <p className="text-xs text-neutral-500 mt-2 max-w-xs">
                      Tap the heart icon on any runway silhouette to save it to your private atelier moodboard.
                    </p>
                  </div>
                ) : (
                  savedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex gap-4 pb-6 border-b border-white/5 group"
                    >
                      <div className="relative w-20 h-24 bg-neutral-900 border border-white/10 shrink-0 overflow-hidden">
                        <img
                          src={product.thumbnail}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold tracking-wider text-white uppercase line-clamp-1">
                              {product.name}
                            </h4>
                            <button
                              onClick={() => toggleWishlist(product.id)}
                              className="text-neutral-500 hover:text-rose-400 transition-colors ml-2"
                              title="Remove from saved"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
                            {product.subtitle}
                          </p>
                          <span className="inline-block mt-2 font-mono text-xs font-bold text-[#c5a46d]">
                            {formatPrice(product.price)}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            addToCart(product);
                            toggleWishlist(product.id);
                          }}
                          className="mt-3 flex items-center justify-center gap-2 py-2 border border-[#c5a46d]/40 bg-[#c5a46d]/10 hover:bg-[#c5a46d] hover:text-black text-xs font-bold tracking-wider uppercase text-[#c5a46d] transition-all"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Move to Bag</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Close Footer */}
              <div className="p-6 border-t border-white/10">
                <button
                  onClick={() => setIsWishlistOpen(false)}
                  className="w-full py-3 border border-white/20 text-xs font-bold tracking-widest uppercase text-neutral-300 hover:text-white hover:border-white transition-colors"
                >
                  Continue Browsing
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
