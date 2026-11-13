"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowUpLeft, CornerDownLeft } from "lucide-react";
import { Product } from "@/types/fashion";
import { getLiveProducts } from "@/lib/products-service";
import { usePageTransition } from "@/context/PageTransitionContext";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SuggestionEntry {
  id: string;
  text: string;
  href: string;
  isDirectProduct?: boolean;
}

/**
 * Formats suggestion text to match the autocomplete design:
 * The typed query characters are regular/lighter font weight,
 * and the suggested/completed extensions are bold.
 */
function SuggestionText({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();

  const idx = lower.indexOf(q);
  if (idx === -1) {
    return <span className="font-bold text-white">{text}</span>;
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <span className="text-[14px] sm:text-[15px] font-mono tracking-wide leading-none select-none">
      {before && <span className="font-bold text-white">{before}</span>}
      <span className="font-normal text-neutral-400">{match}</span>
      {after && <span className="font-bold text-white">{after}</span>}
    </span>
  );
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigateTo } = usePageTransition();

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(-1);
    }
  }

  // Fetch real database products only
  useEffect(() => {
    if (isOpen) {
      let active = true;
      getLiveProducts()
        .then((live) => {
          if (active && live.length > 0) setProducts(live);
        })
        .catch(() => {});

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSelectedIndex(-1);
  };

  // Generate intelligent autocomplete search suggestions tailored strictly to real store inventory
  const suggestions = useMemo<SuggestionEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const candidates: SuggestionEntry[] = [];
    const seen = new Set<string>();

    const addCandidate = (text: string, href: string, isDirectProduct = false) => {
      const clean = text.trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      candidates.push({
        id: `sug-${lower.replace(/\s+/g, "-")}`,
        text: clean,
        href,
        isDirectProduct,
      });
    };

    // 1. Department & category queries
    const departments = [
      { name: "men's collection", href: "/men", keywords: ["men", "mens", "men's", "male"] },
      { name: "women's collection", href: "/women", keywords: ["women", "womens", "women's", "female"] },
      { name: "kids collection", href: "/kids", keywords: ["kid", "kids", "baby", "children"] },
      { name: "new arrivals", href: "/new-arrivals", keywords: ["new", "arrival", "arrivals", "drop", "latest"] },
    ];

    for (const d of departments) {
      if (d.name.includes(q) || d.keywords.some((k) => k.startsWith(q) || q.startsWith(k))) {
        addCandidate(d.name, d.href);
      }
    }

    // 2. Real products from database & natural search completions
    for (const p of products) {
      const pName = p.name.toLowerCase();
      const pDept = (p.department || "").toLowerCase();
      const pCat = (p.category || "").toLowerCase();

      // Direct exact product match
      if (pName.includes(q)) {
        addCandidate(p.name, `/product/${p.id}`, true);
      }

      // Department-augmented completions (e.g. "hoodies for men", "peplum tops for women")
      if (pDept) {
        const withDept = `${pName} for ${pDept}`;
        if (withDept.includes(q)) {
          addCandidate(withDept, `/${pDept}?search=${encodeURIComponent(p.name)}`);
        }
      }

      // Category matches
      if (pCat && pCat !== pName && pCat.includes(q)) {
        addCandidate(pCat, `/new-arrivals?search=${encodeURIComponent(pCat)}`);
        if (pDept) {
          addCandidate(`${pCat} for ${pDept}`, `/${pDept}?search=${encodeURIComponent(pCat)}`);
        }
      }

      // Attribute / style completions for real items
      if (pName.includes("hoodie")) {
        ["hoodie", "hoodies for men", "hoodies for women", "hoodies in new arrivals", "hoodies casual", "hoodies oversized"].forEach((term) => {
          if (term.includes(q)) {
            const dest = term.includes("men") ? "/men?search=hoodie" : term.includes("women") ? "/women?search=hoodie" : "/new-arrivals?search=hoodie";
            addCandidate(term, dest);
          }
        });
      }

      if (pName.includes("peplum") || pName.includes("top")) {
        ["peplum top", "peplum tops for women", "peplum top floral", "peplum top in new arrivals", "women's top's"].forEach((term) => {
          if (term.includes(q)) {
            addCandidate(term, "/women?search=peplum");
          }
        });
      }

      if (pName.includes("shirt")) {
        ["shirts", "shirts for men", "men's casual shirt", "kid's shirt", "shirts in new arrivals"].forEach((term) => {
          if (term.includes(q)) {
            const dest = term.includes("kid") ? "/kids?search=shirt" : "/men?search=shirt";
            addCandidate(term, dest);
          }
        });
      }

      if (pName.includes("kurti")) {
        ["kurti's", "kurti for women", "red kurti", "kurti in new arrivals"].forEach((term) => {
          if (term.includes(q)) {
            addCandidate(term, "/women?search=kurti");
          }
        });
      }

      if (pName.includes("dress")) {
        ["baby dress", "dresses for kids", "dresses for women", "dress in new arrivals"].forEach((term) => {
          if (term.includes(q)) {
            const dest = term.includes("baby") || term.includes("kid") ? "/kids?search=dress" : "/women?search=dress";
            addCandidate(term, dest);
          }
        });
      }
    }

    // Sort: prefix matches first, then substring matches
    const prefixMatches = candidates.filter((c) => c.text.toLowerCase().startsWith(q));
    const otherMatches = candidates.filter((c) => !c.text.toLowerCase().startsWith(q));

    return [...prefixMatches, ...otherMatches].slice(0, 10);
  }, [query, products]);

  // Default suggestions when query is empty
  const defaultSuggestions = useMemo<SuggestionEntry[]>(() => {
    const list: SuggestionEntry[] = [];
    const seen = new Set<string>();

    for (const p of products) {
      if (!seen.has(p.name.toLowerCase())) {
        seen.add(p.name.toLowerCase());
        list.push({
          id: `def-${p.id}`,
          text: p.name,
          href: `/product/${p.id}`,
          isDirectProduct: true,
        });
      }
      if (list.length >= 6) break;
    }

    if (list.length === 0) {
      return [
        { id: "d-1", text: "hoodies for men", href: "/men?search=hoodie" },
        { id: "d-2", text: "women's peplum top", href: "/women?search=peplum" },
        { id: "d-3", text: "kurti's", href: "/women?search=kurti" },
        { id: "d-4", text: "men's casual shirt", href: "/men?search=shirt" },
        { id: "d-5", text: "women's collection", href: "/women" },
        { id: "d-6", text: "men's collection", href: "/men" },
      ];
    }

    return list;
  }, [products]);

  const displayedList = query.trim() ? suggestions : defaultSuggestions;

  const handleSelect = (href: string) => {
    onClose();
    navigateTo(href);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedIndex >= 0 && displayedList[selectedIndex]) {
      handleSelect(displayedList[selectedIndex].href);
      return;
    }

    if (query.trim()) {
      handleSelect(`/new-arrivals?search=${encodeURIComponent(query.trim())}`);
    }
  };

  // Keyboard navigation: ArrowDown, ArrowUp, Enter, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (displayedList.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < displayedList.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayedList.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSearchSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, displayedList, selectedIndex, query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="search-autocomplete-portal" className="fixed inset-0 z-[250] overflow-y-auto select-none">
          {/* Obsidian Frosted Backdrop */}
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Search Stage Container (Centered Top) */}
          <div className="relative w-full max-w-2xl mx-auto px-4 pt-14 sm:pt-20 pb-12 flex flex-col items-center">
            <motion.div
              key="search-panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full relative shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
            >
              {/* Search Bar Input */}
              <form
                onSubmit={handleSearchSubmit}
                className={`w-full bg-[#0e0e0e] flex items-center border border-white/15 transition-all ${
                  displayedList.length > 0 ? "rounded-t-md border-b-0" : "rounded-md"
                }`}
              >
                {/* Search Icon */}
                <div className="pl-4 pr-2 text-neutral-400 flex items-center justify-center">
                  <Search className="w-4 h-4 text-neutral-400" />
                </div>

                {/* Input Text Box */}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search NOIR garments, hoodies, peplum, shirts..."
                  className="flex-1 py-3.5 px-2 bg-transparent text-[15px] font-mono text-white placeholder-neutral-500 focus:outline-none font-normal"
                />

                {/* Clear 'X' Button */}
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      handleQueryChange("");
                      inputRef.current?.focus();
                    }}
                    className="p-1.5 text-neutral-400 hover:text-white transition-colors mr-1 cursor-pointer"
                    aria-label="Clear query"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  className="h-11 px-4 bg-[#1A3B8B] hover:bg-[#142e6d] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 rounded-r-[3px] font-mono text-xs font-bold tracking-wider"
                  title="Search"
                >
                  <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">SEARCH</span>
                </button>
              </form>

              {/* Single-Column Autocomplete Suggestions Dropdown Panel */}
              {displayedList.length > 0 ? (
                <div className="w-full bg-[#0e0e0e] border-x border-b border-white/15 rounded-b-md shadow-2xl overflow-hidden divide-y divide-white/5">
                  {/* Subtle heading when query is empty */}
                  {!query.trim() && (
                    <div className="px-4 py-2 bg-black/40 text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 flex items-center justify-between">
                      <span>Trending Searches</span>
                      <span>Real Inventory</span>
                    </div>
                  )}

                  {displayedList.map((item, index) => {
                    const isSelected = selectedIndex === index;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item.href)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`flex items-center justify-between px-4 py-3 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-white/[0.08] text-white pl-5"
                            : "bg-transparent text-neutral-300 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        {/* Left magnifying glass + suggestion text */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <Search
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isSelected ? "text-[#c5a46d]" : "text-neutral-500"
                            }`}
                          />
                          <div className="truncate">
                            <SuggestionText text={item.text} query={query} />
                          </div>
                        </div>

                        {/* Right Action Hint */}
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <ArrowUpLeft
                            className={`w-3.5 h-3.5 -rotate-90 transition-all ${
                              isSelected ? "text-[#c5a46d] translate-x-0.5" : "text-neutral-600"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                /* No Suggestions Found */
                <div className="w-full bg-[#0e0e0e] border-x border-b border-white/15 rounded-b-md p-6 text-center space-y-1 font-mono">
                  <p className="text-xs text-neutral-300">
                    No suggestions matching &ldquo;<span className="font-bold text-white">{query}</span>&rdquo;
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Try searching for <span className="underline cursor-pointer text-[#c5a46d]" onClick={() => handleQueryChange("hoodie")}>hoodie</span>, <span className="underline cursor-pointer text-[#c5a46d]" onClick={() => handleQueryChange("peplum")}>peplum</span>, or <span className="underline cursor-pointer text-[#c5a46d]" onClick={() => handleQueryChange("shirt")}>shirt</span>
                  </p>
                </div>
              ) : null}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
