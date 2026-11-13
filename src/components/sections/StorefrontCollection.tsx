"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Product, ProductColor } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/context/CartContext";
import { useCursor } from "@/context/CursorContext";
import { getLiveProducts } from "@/lib/products-service";
import { ProductGridSkeleton } from "@/components/ui/ProductCardSkeleton";
import {
  Search,
  SlidersHorizontal,
  Eye,
  ShoppingBag,
  Heart,
  Tag,
  X,
  RotateCcw,
} from "lucide-react";

export interface SubCategoryFilter {
  label: string;
  value: string;
}

interface StorefrontCollectionProps {
  department: "men" | "women" | "kids" | "new-arrivals";
  title: string;
  subtitle: string;
  badge: string;
  subcategories: SubCategoryFilter[];
  defaultSort?: "curated" | "newest" | "price-asc" | "price-desc";
}

export default function StorefrontCollection({
  department,
  title,
  subtitle,
  badge,
  subcategories,
  defaultSort = "curated",
}: StorefrontCollectionProps) {
  const { addToCart, isInWishlist, toggleWishlist } = useCart();
  const { setCursor, resetCursor } = useCursor();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubcat, setActiveSubcat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"curated" | "newest" | "price-asc" | "price-desc">(defaultSort);
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>("all");
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string>("all");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, ProductColor>>({});

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const live = await getLiveProducts();
        setProducts(live);
      } catch (err) {
        console.warn("Could not query live storefront products:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // 1. Department Filter
  const departmentProducts = useMemo(() => {
    return products.filter((p) => {
      const pName = p.name.toLowerCase();
      const pCat = (p.category || "").toLowerCase();
      const pDesc = (p.description || "").toLowerCase();
      const pTags = (p.tags || []).map((t) => t.toLowerCase());
      const pDept = (p.department || p.gender || "").toLowerCase();

      if (department === "new-arrivals") {
        return Boolean(p.isNew || pTags.includes("new") || pTags.includes("new arrival"));
      }

      if (department === "kids") {
        if (pDept === "kids") return true;
        if (pDept === "men" || pDept === "women") return false;
        return (
          pCat.includes("kids") ||
          pTags.includes("kids") ||
          pName.includes("kids") ||
          pDesc.includes("kids") ||
          p.sizes?.some((s) => s.toUpperCase().includes("Y"))
        );
      }

      if (department === "women") {
        if (pDept === "women") return true;
        if (pDept === "men" || pDept === "kids") return false;
        return (
          pCat.includes("women") ||
          pTags.includes("women") ||
          pName.includes("women")
        );
      }

      if (department === "men") {
        if (pDept === "men") return true;
        if (pDept === "women" || pDept === "kids") return false;
        return (
          pCat.includes("men") ||
          pTags.includes("men") ||
          (!pCat.includes("women") && !pCat.includes("kids") && !pTags.includes("women") && !pTags.includes("kids"))
        );
      }

      return true;
    });
  }, [products, department]);

  // 2. Subcategory, Search, Size, Price Filters
  const filteredProducts = useMemo(() => {
    return departmentProducts
      .filter((p) => {
        // Subcategory match
        if (activeSubcat !== "all") {
          const sub = activeSubcat.toLowerCase();
          const pName = p.name.toLowerCase();
          const pCat = (p.category || "").toLowerCase();
          const pTags = (p.tags || []).map((t) => t.toLowerCase());

          const matchesSubcat =
            pCat === sub ||
            pCat.includes(sub) ||
            pTags.includes(sub) ||
            pName.includes(sub) ||
            (sub === "t-shirts" && (pCat.includes("tee") || pName.includes("tee"))) ||
            (sub === "hoodies" && (pCat.includes("hoodie") || pName.includes("hoodie"))) ||
            (sub === "jackets" && (pCat.includes("jacket") || pName.includes("jacket") || pName.includes("bomber") || pName.includes("puffer"))) ||
            (sub === "trousers" && (pCat.includes("pant") || pCat.includes("cargo") || pName.includes("cargo") || pName.includes("trouser"))) ||
            (sub === "jeans" && (pCat.includes("denim") || pName.includes("jeans") || pName.includes("denim"))) ||
            (sub === "bottomwear" && (pCat.includes("pant") || pCat.includes("bottom") || pName.includes("pant") || pName.includes("short"))) ||
            (sub === "tops" && (pCat.includes("top") || pCat.includes("tee") || pCat.includes("shirt") || pName.includes("top")));

          if (!matchesSubcat) return false;
        }

        // Search match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = p.name.toLowerCase().includes(q);
          const subMatch = (p.subtitle || "").toLowerCase().includes(q);
          const descMatch = (p.description || "").toLowerCase().includes(q);
          const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q));
          if (!nameMatch && !subMatch && !descMatch && !tagMatch) return false;
        }

        // Size filter
        if (selectedSizeFilter !== "all") {
          const hasSize = (p.sizes || []).some(
            (s) => s.toUpperCase().trim() === selectedSizeFilter.toUpperCase().trim()
          );
          if (!hasSize) return false;
        }

        // Price filter
        if (selectedPriceFilter === "under-2000") {
          if (p.price >= 2000) return false;
        } else if (selectedPriceFilter === "2000-4000") {
          if (p.price < 2000 || p.price > 4000) return false;
        } else if (selectedPriceFilter === "above-4000") {
          if (p.price <= 4000) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "newest") return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        return 0; // Curated order
      });
  }, [departmentProducts, activeSubcat, searchQuery, selectedSizeFilter, selectedPriceFilter, sortBy]);

  const handleSizeSelect = (productId: string, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: size }));
  };

  const handleColorSelect = (productId: string, color: ProductColor) => {
    setSelectedColors((prev) => ({ ...prev, [productId]: color }));
  };

  const handleQuickAdd = (product: Product) => {
    const chosenSize = selectedSizes[product.id] || product.sizes[0] || "M";
    const chosenColor = selectedColors[product.id] || product.colors[0];
    addToCart(product, chosenColor, chosenSize, 1);
  };

  const hasActiveFilters =
    activeSubcat !== "all" ||
    searchQuery.trim() !== "" ||
    selectedSizeFilter !== "all" ||
    selectedPriceFilter !== "all";

  const clearAllFilters = () => {
    setActiveSubcat("all");
    setSearchQuery("");
    setSelectedSizeFilter("all");
    setSelectedPriceFilter("all");
    setSortBy("curated");
  };

  return (
    <section className="relative w-full pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-8 lg:px-12 bg-[#F4F0E8] text-[#161616] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        {/* Header & Department Title */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E5E0D8]">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block">
              {badge}
            </span>
            <h1 className="text-3xl sm:text-5xl font-headline font-normal tracking-tight text-[#161616] leading-tight">
              {title}
            </h1>
            <p className="text-sm text-[#6E6D68] font-body max-w-xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#6E6D68] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#E5E0D8] focus:border-[#1A3B8B] pl-10 pr-4 py-2.5 text-xs font-body text-[#161616] placeholder-[#A09D96] focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6D68] hover:text-[#161616]"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "curated" | "newest" | "price-asc" | "price-desc")}
                className="w-full bg-white border border-[#E5E0D8] focus:border-[#1A3B8B] px-4 py-2.5 text-xs font-body text-[#161616] focus:outline-none pr-9 cursor-pointer appearance-none transition-colors"
              >
                <option value="curated">Sort: Featured</option>
                <option value="newest">Sort: Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#6E6D68] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter Controls Row: Category Pills + Size & Price Filter Dropdowns */}
        <div className="space-y-4">
          {/* Subcategory Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {subcategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveSubcat(cat.value)}
                className={`px-4 py-2 text-xs font-body uppercase tracking-wider whitespace-nowrap transition-all border cursor-pointer ${
                  activeSubcat === cat.value
                    ? "bg-[#1A3B8B] text-white font-medium border-[#1A3B8B] shadow-xs"
                    : "bg-white text-[#6E6D68] border-[#E5E0D8] hover:border-[#1A3B8B] hover:text-[#161616]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Secondary Quick Filter Bars (Size + Price + Clear) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E0D8]/60 text-xs font-body">
            <div className="flex flex-wrap items-center gap-3">
              {/* Size Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[#6E6D68] font-medium text-[11px] uppercase tracking-wider">Size:</span>
                {["all", "S", "M", "L", "XL"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSizeFilter(s)}
                    className={`px-2.5 py-1 text-[11px] font-mono border uppercase transition-colors ${
                      selectedSizeFilter === s
                        ? "bg-[#161616] text-white border-[#161616]"
                        : "bg-white text-[#6E6D68] border-[#E5E0D8] hover:border-[#1A3B8B]"
                    }`}
                  >
                    {s === "all" ? "All" : s}
                  </button>
                ))}
              </div>

              {/* Price Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[#6E6D68] font-medium text-[11px] uppercase tracking-wider">Price:</span>
                <select
                  value={selectedPriceFilter}
                  onChange={(e) => setSelectedPriceFilter(e.target.value)}
                  className="bg-white border border-[#E5E0D8] text-xs px-2.5 py-1 text-[#161616] focus:outline-none focus:border-[#1A3B8B]"
                >
                  <option value="all">All Prices</option>
                  <option value="under-2000">Under ₹2,000</option>
                  <option value="2000-4000">₹2,000 – ₹4,000</option>
                  <option value="above-4000">Above ₹4,000</option>
                </select>
              </div>
            </div>

            {/* Clear All Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#1A3B8B] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : filteredProducts.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-6 bg-white border border-[#E5E0D8] text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#EFECE6] border border-[#E5E0D8] flex items-center justify-center mx-auto text-[#6E6D68]">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-headline font-normal text-[#161616]">
                No Products Found
              </h3>
              <p className="text-xs text-[#6E6D68] font-body mt-2 leading-relaxed">
                No items match your active filters in this department. Try adjusting or clearing your filters.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={clearAllFilters}
                className="px-6 py-2.5 bg-[#161616] hover:bg-[#1A3B8B] text-white font-body text-xs uppercase tracking-wider transition-colors shadow-xs"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const currentSize = selectedSizes[product.id] || product.sizes[0] || "M";
              const currentColor = selectedColors[product.id] || product.colors[0];
              const isSaved = isInWishlist(product.id);

              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="group bg-white border border-[#E5E0D8] hover:border-[#1A3B8B] transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md"
                >
                  {/* Top Image Container */}
                  <div className="relative aspect-[3/4] w-full bg-[#EFECE6] overflow-hidden">
                    <Link
                      href={`/product/${product.id}`}
                      onMouseEnter={() => setCursor("hover")}
                      onMouseLeave={resetCursor}
                      className="block w-full h-full"
                    >
                      <img
                        src={product.images[0] || product.thumbnail}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-500 ease-out"
                      />
                    </Link>

                    {/* Top Action Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      {product.isNew && (
                        <span className="px-2.5 py-0.5 bg-[#1A3B8B] text-white font-body text-[10px] font-semibold uppercase tracking-wider shadow-xs">
                          NEW
                        </span>
                      )}
                      <div className="ml-auto pointer-events-auto flex items-center gap-1.5">
                        <button
                          onClick={() => toggleWishlist(product.id, product)}
                          className={`p-2 rounded-full border transition-all cursor-pointer shadow-xs ${
                            isSaved
                              ? "bg-rose-50 border-rose-300 text-rose-600"
                              : "bg-white/90 border-[#E5E0D8] text-[#161616] hover:text-rose-500"
                          }`}
                          aria-label="Save to Wishlist"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Product Details Section */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#6E6D68] uppercase">
                        <span>{product.category}</span>
                        {product.material && <span className="truncate max-w-[120px]">{product.material}</span>}
                      </div>

                      <Link
                        href={`/product/${product.id}`}
                        onMouseEnter={() => setCursor("hover")}
                        onMouseLeave={resetCursor}
                        className="block group/link"
                      >
                        <h3 className="text-base font-headline font-normal text-[#161616] group-hover/link:text-[#1A3B8B] transition-colors truncate">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span className="text-base font-mono font-medium text-[#161616]">
                          {formatPrice(product.price)}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-xs font-mono text-[#6E6D68] line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Color Swatches & Size Options & Add to Bag */}
                    <div className="space-y-2.5 pt-2 border-t border-[#E5E0D8]">
                      {/* Sizes */}
                      {product.sizes && product.sizes.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                          {product.sizes.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleSizeSelect(product.id, s)}
                              className={`px-2 py-0.5 text-[10px] font-mono uppercase transition-all cursor-pointer border ${
                                currentSize === s
                                  ? "bg-[#1A3B8B] text-white font-bold border-[#1A3B8B]"
                                  : "bg-white text-[#6E6D68] border-[#E5E0D8] hover:border-[#1A3B8B] hover:text-[#161616]"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Add to Bag CTA */}
                      <button
                        onClick={() => handleQuickAdd(product)}
                        onMouseEnter={() => setCursor("hover")}
                        onMouseLeave={resetCursor}
                        className="w-full py-2.5 bg-[#161616] hover:bg-[#1A3B8B] text-white font-body text-xs font-medium uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
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
