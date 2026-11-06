"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCategory, Product } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/context/CartContext";
import { useCursor } from "@/context/CursorContext";
import { usePageTransition } from "@/context/PageTransitionContext";
import { useGsapScrollTrigger } from "@/hooks/useGsapScrollTrigger";
import { supabase } from "@/lib/supabase";
import { getLiveProducts } from "@/lib/products-service";
import { ProductGridSkeleton } from "@/components/ui/ProductCardSkeleton";
import {
  Search,
  SlidersHorizontal,
  Eye,
  ShoppingBag,
  Heart,
  Star,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const CATEGORIES: { label: string; value: ProductCategory }[] = [
  { label: "All Items", value: "all" },
  { label: "Hoodies", value: "hoodies" },
  { label: "Jackets", value: "jackets" },
  { label: "Cargo Pants", value: "pants" },
  { label: "T-Shirts", value: "t-shirts" },
  { label: "Footwear", value: "footwear" },
  { label: "Accessories", value: "accessories" },
];

export default function FeaturedCollection() {
  const { addToCart, setQuickViewProduct, isInWishlist, toggleWishlist } = useCart();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [categoriesList, setCategoriesList] = useState<{ label: string; value: string }[]>(CATEGORIES);
  const [productList, setProductList] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const [categoriesRes, productsRes] = await Promise.all([
          supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
          getLiveProducts(),
        ]);

        if (categoriesRes.data && categoriesRes.data.length > 0) {
          const remoteCategories = [
            { label: "All Items", value: "all" },
            ...categoriesRes.data.map((c: { name: string; slug: string }) => ({
              label: c.name,
              value: c.slug,
            })),
          ];
          setCategoriesList(remoteCategories);
        }

        setProductList(productsRes);
      } catch (err) {
        console.warn("Could not query live storefront products:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    return productList.filter((product) => {
      const matchesCategory =
        activeCategory === "all" ||
        product.category === activeCategory ||
        product.category.toLowerCase().replace(/\s+/g, "-") === activeCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });
  }, [productList, activeCategory, searchQuery, sortBy]);

  const containerRef = useGsapScrollTrigger([filteredProducts.length, isLoading]);

  return (
    <section ref={containerRef} id="collection" className="relative w-full py-24 md:py-36 px-6 md:px-14 bg-[#050505] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Section 02 // Autumn-Winter Drop</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.02em] uppercase font-display text-white">
              FEATURED RUNWAY
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-lg">
              Limited editions crafted from heavy loopback cotton, durable matte hardware, and premium leather accents.
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="SEARCH PIECES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-56 bg-[#0a0a0a] border border-white/10 pl-10 pr-4 py-2.5 text-xs font-mono uppercase text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
              />
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "featured" | "price-asc" | "price-desc")}
                className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs font-mono uppercase text-white focus:outline-none focus:border-[#c5a46d] appearance-none pr-8 cursor-pointer"
              >
                <option value="featured">Sort: Curated</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar border-b border-white/10">
          {categoriesList.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-5 py-2.5 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all border ${
                activeCategory === cat.value
                  ? "bg-[#c5a46d] text-black font-bold border-[#c5a46d]"
                  : "bg-transparent text-neutral-400 border-white/10 hover:border-white/30 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center border border-white/10 bg-[#0a0a0a] px-6">
            <div className="w-12 h-12 rounded-full border border-[#c5a46d]/40 bg-[#c5a46d]/10 flex items-center justify-center mx-auto text-[#c5a46d] mb-4">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold uppercase font-display text-white mb-2">
              {productList.length === 0
                ? "The Atelier Archive is in Private Curation"
                : `No Pieces Found for "${searchQuery || activeCategory}"`}
            </h3>
            <p className="text-xs font-mono text-neutral-400 max-w-md mx-auto leading-relaxed">
              {productList.length === 0
                ? "Limited serialized drops are currently being crafted. Use the Master Admin Terminal to publish new garments to the live storefront."
                : "Try selecting another department or resetting your search filter."}
            </p>
            {productList.length === 0 ? (
              <Link
                href="/admin"
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-[#c5a46d] text-xs font-bold font-mono tracking-widest text-black uppercase hover:bg-[#d6b77e] transition-colors"
              >
                <span>Open Admin Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className="mt-6 px-6 py-2.5 border border-[#c5a46d] text-xs font-bold font-mono tracking-widest text-[#c5a46d] uppercase hover:bg-[#c5a46d] hover:text-black transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 gsap-product-grid">
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={() => setQuickViewProduct(product)}
                  onAddToCart={() => addToCart(product)}
                  isSaved={isInWishlist(product.id)}
                  onToggleWishlist={() => toggleWishlist(product.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  onQuickView,
  onAddToCart,
  isSaved,
  onToggleWishlist,
}: {
  product: Product;
  onQuickView: () => void;
  onAddToCart: () => void;
  isSaved: boolean;
  onToggleWishlist: () => void;
}) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const { setCursor, resetCursor } = useCursor();
  const { navigateTo } = usePageTransition();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      onMouseEnter={() => {
        setCursor("view", "VIEW");
      }}
      onMouseLeave={() => {
        resetCursor();
      }}
      className="gsap-product-card group relative flex flex-col justify-between bg-[#0a0a0a] border border-white/[0.08] hover:border-[#c5a46d]/60 transition-all duration-500 overflow-hidden"
    >
      {/* Top Media Area */}
      <div 
        onClick={() => navigateTo(`/product/${product.id}`)}
        className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-950 cursor-pointer"
      >
        {/* Primary Product Image */}
        <img
          src={product.images[0] || product.thumbnail}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105 ${
            product.images[1] ? "group-hover:opacity-0" : ""
          }`}
        />

        {/* Secondary Editorial Angle (Preloaded, Crossfades on Hover) */}
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt={`${product.name} alternate`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out group-hover:scale-105"
          />
        )}

        {/* Ambient Dark Gradient on bottom of image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none" />

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
          {product.isNew && (
            <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-[#c5a46d] text-black font-mono">
              NEW DROP
            </span>
          )}
          {product.threeDType && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-black/70 backdrop-blur-md text-white font-mono border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a46d]" />
              ATELIER EDITION
            </span>
          )}
        </div>

        {/* Wishlist Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist();
          }}
          className={`absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-md transition-all ${
            isSaved
              ? "bg-rose-500 text-white"
              : "bg-black/50 text-white hover:bg-black hover:text-rose-400 border border-white/10"
          }`}
          title={isSaved ? "Saved" : "Save to Wishlist"}
        >
          <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
        </button>

        {/* Hover Quick Action Overlay */}
        <div className="absolute inset-x-3 bottom-3 z-10 flex gap-2 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <button
            onClick={onQuickView}
            className="flex-1 py-2.5 bg-black/80 hover:bg-black text-white border border-white/20 hover:border-white text-[10px] font-bold tracking-[0.2em] uppercase font-mono transition-colors flex items-center justify-center gap-1.5 backdrop-blur-md"
          >
            <Eye className="w-3 h-3" />
            <span>Quick View</span>
          </button>

          <button
            onClick={onAddToCart}
            className="py-2.5 px-3.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black text-[10px] font-bold tracking-wider uppercase font-mono transition-colors flex items-center justify-center shadow-lg"
            title="Add to Cart"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Product Details Section */}
      <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
        <div>
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#a0a0a0] mb-1">
            <span>{product.category}</span>
            <div className="flex items-center gap-1 text-[#c5a46d]">
              <Star className="w-3 h-3 fill-current" />
              <span>{product.rating}</span>
            </div>
          </div>

          {/* Title */}
          <h3
            onClick={() => navigateTo(`/product/${product.id}`)}
            className="text-sm font-bold tracking-wider text-white uppercase font-display line-clamp-1 group-hover:text-[#c5a46d] transition-colors cursor-pointer"
          >
            {product.name}
          </h3>

          <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
            {product.subtitle}
          </p>
        </div>

        {/* Colors & Price */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
          {/* Swatches */}
          <div className="flex items-center gap-1.5">
            {product.colors.map((color) => (
              <button
                key={color.hex}
                onClick={() => setSelectedColor(color)}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  selectedColor.hex === color.hex
                    ? "border-[#c5a46d] scale-125"
                    : "border-white/20 hover:scale-110"
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-base font-mono font-bold text-[#c5a46d]">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs font-mono text-neutral-500 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
