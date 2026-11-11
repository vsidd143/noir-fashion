"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight, Loader2, Tag, Sparkles } from "lucide-react";
import { Product } from "@/types/fashion";
import { getLiveProducts } from "@/lib/products-service";
import { formatPrice } from "@/lib/currency";
import { usePageTransition } from "@/context/PageTransitionContext";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_CATEGORIES = [
  { label: "Men's Collection", href: "/men" },
  { label: "Women's Collection", href: "/women" },
  { label: "Kids Collection", href: "/kids" },
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Heavy Hoodies", query: "hoodie" },
  { label: "Technical Jackets", query: "jacket" },
  { label: "Cargo Trousers", query: "cargo" },
];

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigateTo } = usePageTransition();

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setQuery("");
    }
  }

  // Fetch products and focus input on open
  useEffect(() => {
    if (isOpen) {
      let active = true;
      getLiveProducts()
        .then((live) => {
          if (active) {
            setProducts(live);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (active) setIsLoading(false);
        });

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter products by query
  const filteredProducts = React.useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    return products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(trimmed);
      const subMatch = (p.subtitle || "").toLowerCase().includes(trimmed);
      const catMatch = (p.category || "").toLowerCase().includes(trimmed);
      const descMatch = (p.description || "").toLowerCase().includes(trimmed);
      const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(trimmed)) || false;
      const matMatch = (p.material || "").toLowerCase().includes(trimmed);
      return nameMatch || subMatch || catMatch || descMatch || tagMatch || matMatch;
    });
  }, [query, products]);

  const handleSelectProduct = (href: string) => {
    onClose();
    navigateTo(href);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] overflow-y-auto overflow-x-hidden select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
          />

          {/* Modal Container */}
          <div className="relative min-h-screen px-4 sm:px-6 md:px-12 py-8 md:py-16 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-4xl bg-[#090909] border border-white/10 shadow-2xl relative my-auto overflow-hidden"
            >
              {/* Top Search Input Bar */}
              <div className="p-4 sm:p-6 border-b border-white/10 flex items-center gap-3 bg-black/50">
                <Search className="w-5 h-5 text-[#c5a46d] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SEARCH GARMENTS, FABRICS, product..."
                  className="w-full bg-transparent text-white placeholder-neutral-500 font-mono text-xs sm:text-sm tracking-[0.2em] uppercase focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 border border-white/10 hover:border-[#c5a46d] text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 sm:p-8 max-h-[65vh] overflow-y-auto">
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400 font-mono text-xs uppercase tracking-widest">
                    <Loader2 className="w-5 h-5 animate-spin text-[#c5a46d]" />
                    <span>Querying Atelier Archive...</span>
                  </div>
                ) : !query.trim() ? (
                  /* Empty Search State: Popular Recommendations */
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#c5a46d] uppercase">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Popular Departments & Garments</span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {QUICK_CATEGORIES.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => {
                            if (item.href) {
                              handleSelectProduct(item.href);
                            } else if (item.query) {
                              setQuery(item.query);
                            }
                          }}
                          className="px-4 py-2 bg-neutral-900 border border-white/10 hover:border-[#c5a46d] text-white hover:text-[#c5a46d] font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Tag className="w-3 h-3 text-[#c5a46d]" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>

                    {products.length > 0 && (
                      <div className="pt-6 border-t border-white/5 space-y-3">
                        <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 block">
                          Featured Runway Highlights
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {products.slice(0, 4).map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectProduct(`/product/${p.id}`)}
                              className="group cursor-pointer space-y-2"
                            >
                              <div className="aspect-[3/4] bg-neutral-900 overflow-hidden border border-white/5 group-hover:border-[#c5a46d]/40 transition-colors">
                                <img
                                  src={p.thumbnail}
                                  alt={p.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold font-display uppercase text-white group-hover:text-[#c5a46d] truncate">
                                  {p.name}
                                </p>
                                <p className="text-[10px] font-mono text-[#c5a46d]">
                                  {formatPrice(p.price)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  /* No Results State */
                  <div className="py-16 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full border border-white/10 bg-neutral-900 flex items-center justify-center mx-auto text-neutral-500">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-display uppercase text-white">
                        No Pieces Found For &ldquo;{query}&rdquo;
                      </h4>
                      <p className="text-xs font-mono text-neutral-400 mt-1 max-w-sm mx-auto">
                        Verify your spelling or explore the primary departments.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={() => handleSelectProduct("/new-arrivals")}
                        className="px-6 py-2.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-mono text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        New Arrivals
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Live Results Grid */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono text-neutral-400 uppercase tracking-widest pb-2 border-b border-white/5">
                      <span>Matches Found ({filteredProducts.length})</span>
                      <span>Instant Archive Lookup</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleSelectProduct(`/product/${product.id}`)}
                          className="flex items-center gap-3.5 p-3 bg-neutral-950/80 border border-white/10 hover:border-[#c5a46d] transition-all group cursor-pointer"
                        >
                          <div className="w-16 h-20 bg-neutral-900 shrink-0 overflow-hidden border border-white/5">
                            <img
                              src={product.thumbnail}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block">
                              {product.category}
                            </span>
                            <h5 className="text-xs font-bold uppercase font-display text-white group-hover:text-[#c5a46d] transition-colors truncate">
                              {product.name}
                            </h5>
                            <span className="text-xs font-mono font-bold text-[#c5a46d] block">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#c5a46d] group-hover:translate-x-1 transition-all shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Bar */}
              <div className="p-4 bg-black/60 border-t border-white/10 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                <span>Direct Supabase Query System</span>
                <Link
                  href={`/new-arrivals?search=${encodeURIComponent(query)}`}
                  onClick={onClose}
                  className="text-[#c5a46d] hover:underline"
                >
                  View Full Results Grid →
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
