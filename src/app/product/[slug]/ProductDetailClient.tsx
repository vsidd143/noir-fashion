"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { Product, ProductColor } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/context/CartContext";
import { usePageTransition } from "@/context/PageTransitionContext";
import { getLiveProducts } from "@/lib/products-service";
import {
  getCompleteTheLook,
  getFrequentlyBoughtTogether,
  getRelatedProducts,
  getYouMayAlsoLike,
  getTrendingProducts,
} from "@/lib/recommendations";
import {
  Sparkles,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  Star,
  Check,
  ChevronRight,
  Eye,
  ArrowRight,
} from "lucide-react";

export default function ProductDetailClient({ slug }: { slug: string }) {
  const { addToCart, isInWishlist, toggleWishlist, setQuickViewProduct } = useCart();
  const { navigateTo } = usePageTransition();

  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const live = await getLiveProducts();
        setLiveProducts(live);
      } catch (err) {
        console.warn("Could not query live product details:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Find product by slug or id from live database
  const product: Product | undefined = liveProducts.find(
    (p) => p.id === slug || p.name.toLowerCase().replace(/\s+/g, "-") === slug
  );

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [quantity, setQuantity] = useState(1);
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);
  const [addedLookSuccess, setAddedLookSuccess] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  // Update selected color/size when product changes
  useEffect(() => {
    if (product) {
      // Track browsing history dynamically
      let viewedObjs: Product[] = [];
      try {
        const stored = localStorage.getItem("noir_viewed_products");
        const list: string[] = stored ? JSON.parse(stored) : [];
        const updated = [product.id, ...list.filter((id) => id !== product.id)].slice(0, 8);
        localStorage.setItem("noir_viewed_products", JSON.stringify(updated));

        // Load recently viewed objects from live database
        viewedObjs = updated
          .filter((id) => id !== product.id)
          .map((id) => liveProducts.find((p) => p.id === id))
          .filter(Boolean) as Product[];
      } catch {}

      queueMicrotask(() => {
        setSelectedColor(product.colors[0] || { name: "Standard", hex: "#0a0a0a", bgClass: "" });
        setSelectedSize(product.sizes[0] || "M");
        setSelectedImageIndex(0);
        setQuantity(1);
        if (viewedObjs.length > 0) {
          setRecentlyViewed(viewedObjs);
        }
      });
    }
  }, [product, liveProducts]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-12 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#c5a46d] border-t-transparent animate-spin mb-4" />
          <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
            Querying Atelier Vault Silhouette...
          </p>
        </div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full border border-white/10 bg-neutral-950 flex items-center justify-center text-neutral-500 mb-4">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold uppercase font-display text-white">Silhouette Not Available</h2>
          <p className="text-xs text-neutral-400 font-mono mt-2 mb-6 leading-relaxed">
            This runway piece is currently in private curation or has not yet been published by the atelier admin.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/collection"
              className="px-6 py-3 bg-[#c5a46d] text-black font-extrabold text-xs uppercase font-mono hover:bg-[#d6b77e] transition-colors"
            >
              Browse Runway Collection
            </Link>
            <Link
              href="/admin"
              className="px-6 py-3 border border-white/15 text-neutral-300 font-mono text-xs uppercase hover:border-white transition-colors"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // Active color fallback
  const activeColor = selectedColor || product.colors[0] || { name: "Standard", hex: "#0a0a0a", bgClass: "" };

  // Recommendation computations using live database products
  const outfit = getCompleteTheLook(product, liveProducts);
  const frequentlyBought = getFrequentlyBoughtTogether(product, liveProducts, 4);
  const related = getRelatedProducts(product, liveProducts, 4);
  const youMayLike = getYouMayAlsoLike(product, liveProducts, 4);
  const trending = getTrendingProducts(liveProducts, 4);

  const outfitTotal = outfit.reduce((sum, item) => sum + item.price, 0) + product.price;

  const handleAddToCart = () => {
    addToCart(product, activeColor, selectedSize, quantity);
    setAddedToCartSuccess(true);
    setTimeout(() => setAddedToCartSuccess(false), 2500);
  };

  const handleAddEntireLook = () => {
    addToCart(product, activeColor, selectedSize, 1);
    outfit.forEach((item) => {
      addToCart(item, item.colors[0], item.sizes[0] || "M", 1);
    });
    setAddedLookSuccess(true);
    setTimeout(() => setAddedLookSuccess(false), 3000);
  };

  const isSaved = isInWishlist(product.id);

  return (
    <PageShell>
      <div className="pt-32 pb-24 px-6 md:px-14 max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-neutral-500 mb-8 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-white transition-colors">
            Atelier
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
          <Link href="/collection" className="hover:text-white transition-colors">
            Collection
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
          <span className="text-neutral-400">{product.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
          <span className="text-[#c5a46d] font-bold truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        {/* Main Product Stage: Gallery + Buy Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* LEFT: Multi-Angle High-Resolution Editorial Gallery (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Primary Main Visual */}
            <div className="relative aspect-[3/4] bg-neutral-950 border border-white/10 overflow-hidden group">
              <img
                src={product.images[selectedImageIndex] || product.thumbnail}
                alt={product.name}
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Status Tags */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="px-3 py-1 bg-black/80 backdrop-blur-md border border-[#c5a46d]/40 text-[10px] font-mono tracking-widest text-[#c5a46d] uppercase font-bold">
                  EDITION 07 RUNWAY
                </span>
                {product.isLimited && (
                  <span className="px-3 py-1 bg-[#c5a46d] text-black text-[10px] font-mono tracking-widest uppercase font-bold">
                    SERIALIZED BATCH
                  </span>
                )}
              </div>

              {/* Wishlist Button */}
              <button
                onClick={() => toggleWishlist(product.id)}
                className="absolute top-4 right-4 p-3 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white hover:text-rose-400 transition-colors"
                title="Save to Private Wishlist"
              >
                <Heart className={`w-5 h-5 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
              </button>
            </div>

            {/* Thumbnail Selectors */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative aspect-[3/4] bg-neutral-950 border overflow-hidden transition-all ${
                      selectedImageIndex === idx
                        ? "border-[#c5a46d] ring-1 ring-[#c5a46d]"
                        : "border-white/10 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`View ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Buy Box & Specs (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* Category & Rating */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#c5a46d]">
                  {product.category} {"//"} SERIAL NOIR
                </span>
                <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-300">
                  <Star className="w-3.5 h-3.5 fill-[#c5a46d] text-[#c5a46d]" />
                  <span className="font-bold">{product.rating}</span>
                  <span className="text-neutral-500">({product.reviewsCount} reviews)</span>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h1 className="text-3xl sm:text-4xl font-black uppercase font-display tracking-tight text-white leading-tight">
                  {product.name}
                </h1>
                <p className="text-xs font-mono text-neutral-400 mt-1 uppercase tracking-wider">
                  {product.subtitle}
                </p>
              </div>

              {/* Price & GST Disclosures */}
              <div className="flex items-baseline gap-4 py-2">
                <span className="text-3xl font-black font-mono text-white">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-lg font-mono line-through text-neutral-500">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                <span className="px-2.5 py-0.5 text-[9px] font-mono uppercase bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-bold">
                  INCL. 18% GST
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-neutral-300 leading-relaxed font-light">
                {product.description}
              </p>

              {/* Color Selection */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-400 uppercase tracking-widest text-[10px]">Color Palette</span>
                  <span className="text-white font-bold">{selectedColor?.name || product.colors[0]?.name || "Obsidian"}</span>
                </div>
                <div className="flex items-center gap-3">
                  {product.colors.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color.hex }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        selectedColor?.hex === color.hex
                          ? "border-[#c5a46d] scale-110 shadow-lg shadow-[#c5a46d]/30"
                          : "border-white/20 hover:scale-105"
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-400 uppercase tracking-widest text-[10px]">
                    {product.category === "footwear" ? "Select Size (UK / India)" : "Select Size"}
                  </span>
                  <span className="text-[#c5a46d] text-[10px] uppercase font-bold tracking-widest">
                    True to Brutalist Fit
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {product.sizes.map((size) => {
                    const cleanSize = size.replace(/\s*\/\s*US\s*\d+/gi, "").trim();
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`py-3 text-xs font-mono font-bold tracking-wider uppercase transition-all border ${
                          selectedSize === size
                            ? "bg-[#c5a46d] text-black border-[#c5a46d]"
                            : "bg-neutral-950 border-white/15 text-white hover:border-white"
                        }`}
                      >
                        {cleanSize}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock Status Indicator */}
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 pt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>IN STOCK — Immediate Dispatch from Mumbai & Delhi Vaults</span>
              </div>

              {/* Quantity and Primary Buy Actions */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-white/20 bg-neutral-950">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3.5 py-3 text-sm text-neutral-400 hover:text-white"
                    >
                      -
                    </button>
                    <span className="px-4 py-3 text-xs font-mono font-bold text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3.5 py-3 text-sm text-neutral-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>

                  {/* Primary Add to Cart */}
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-4 px-6 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs font-mono uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#c5a46d]/20"
                  >
                    {addedToCartSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-black" />
                        <span>Added to Shopping Bag</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 text-black" />
                        <span>Acquire Piece · {formatPrice(product.price * quantity)}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Value Guarantees */}
              <div className="pt-4 border-t border-white/10 space-y-2.5 text-[11px] font-mono text-neutral-400">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#c5a46d]" />
                  <span>Pan-India Complimentary Express Delivery (2–4 Days)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#c5a46d]" />
                  <span>100% Cash on Delivery (COD) Enabled Pan-India</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-[#c5a46d]" />
                  <span>15-Day Doorstep Exchange Guarantee</span>
                </div>
              </div>
            </div>

            {/* Specifications & Craft */}
            <div className="bg-neutral-950 border border-white/10 p-5 space-y-3 mt-8">
              <span className="text-[10px] font-mono tracking-widest text-[#c5a46d] uppercase block">
                ATELIER FABRICATION SPECS
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-neutral-500 block text-[9px] uppercase">Material</span>
                  <span className="text-white">{product.material}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[9px] uppercase">Silhouette Fit</span>
                  <span className="text-white">{product.fit}</span>
                </div>
                {product.weightGsm && (
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase">Textile Weight</span>
                    <span className="text-white">{product.weightGsm} GSM Custom Spun</span>
                  </div>
                )}
                <div>
                  <span className="text-neutral-500 block text-[9px] uppercase">Batch Run</span>
                  <span className="text-white">&lt; 250 Units Serialized</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* MODULE 1: COMPLETE THE LOOK (Curated Silhouette Bundle Engine)        */}
        {/* ==================================================================== */}
        {outfit.length > 0 && (
          <section className="mt-24 pt-16 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Algorithmic Atelier Ensemble</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase font-display text-white">
                  COMPLETE THE LOOK
                </h3>
                <p className="text-xs text-neutral-400 font-mono mt-1">
                  Engineered proportion pairing developed to complete this architectural silhouette.
                </p>
              </div>

              <button
                onClick={handleAddEntireLook}
                className="py-3 px-6 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs font-mono uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 self-start sm:self-auto shrink-0"
              >
                {addedLookSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>Entire Look Added to Bag</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-black" />
                    <span>Acquire Complete Look · {formatPrice(outfitTotal)}</span>
                  </>
                )}
              </button>
            </div>

            {/* Look Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Current Product Card */}
              <div className="bg-neutral-950 border border-[#c5a46d]/40 p-4 flex flex-col justify-between relative group">
                <span className="absolute top-3 left-3 px-2 py-0.5 bg-[#c5a46d] text-black text-[9px] font-mono font-bold uppercase z-10">
                  CURRENT PIECE
                </span>
                <div className="relative aspect-[3/4] bg-neutral-900 overflow-hidden mb-3">
                  <img
                    src={product.thumbnail}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-[#c5a46d] uppercase">{product.category}</span>
                  <h4 className="text-xs font-bold uppercase text-white truncate">{product.name}</h4>
                  <span className="text-xs font-mono font-bold text-white block">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>

              {/* Matching Complementary Items */}
              {outfit.map((item) => (
                <div
                  key={item.id}
                  className="bg-neutral-950 border border-white/10 hover:border-[#c5a46d]/50 p-4 flex flex-col justify-between group transition-colors"
                >
                  <div className="relative aspect-[3/4] bg-neutral-900 overflow-hidden mb-3">
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      onClick={() => setQuickViewProduct(item)}
                      className="absolute bottom-2 right-2 p-2 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Quick View"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-neutral-400 uppercase">{item.category}</span>
                    <h4 className="text-xs font-bold uppercase text-white truncate">{item.name}</h4>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-mono font-bold text-[#c5a46d]">
                        {formatPrice(item.price)}
                      </span>
                      <button
                        onClick={() => navigateTo(`/product/${item.id}`)}
                        className="text-[10px] font-mono text-neutral-400 hover:text-white uppercase flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* MODULE 2: FREQUENTLY BOUGHT TOGETHER                                */}
        {/* ==================================================================== */}
        {frequentlyBought.length > 0 && (
          <section className="mt-20 pt-16 border-t border-white/10">
            <div className="mb-6">
              <span className="text-[10px] font-mono tracking-widest text-[#c5a46d] uppercase block mb-1">
                Client Collective Pairings
              </span>
              <h3 className="text-xl sm:text-2xl font-black uppercase font-display text-white">
                FREQUENTLY BOUGHT TOGETHER
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {frequentlyBought.map((item) => (
                <ProductRecommendationCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* MODULE 3: RELATED PRODUCTS                                           */}
        {/* ==================================================================== */}
        {related.length > 0 && (
          <section className="mt-20 pt-16 border-t border-white/10">
            <div className="mb-6">
              <span className="text-[10px] font-mono tracking-widest text-[#c5a46d] uppercase block mb-1">
                Same Department Silhouette
              </span>
              <h3 className="text-xl sm:text-2xl font-black uppercase font-display text-white">
                RELATED RUNWAY PIECES
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((item) => (
                <ProductRecommendationCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* MODULE 4: YOU MAY ALSO LIKE                                          */}
        {/* ==================================================================== */}
        {youMayLike.length > 0 && (
          <section className="mt-20 pt-16 border-t border-white/10">
            <div className="mb-6">
              <span className="text-[10px] font-mono tracking-widest text-[#c5a46d] uppercase block mb-1">
                Curated Aesthetics
              </span>
              <h3 className="text-xl sm:text-2xl font-black uppercase font-display text-white">
                YOU MAY ALSO LIKE
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {youMayLike.map((item) => (
                <ProductRecommendationCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* MODULE 5: RECENTLY VIEWED (Dynamically Tracked, Zero Fake Filler)     */}
        {/* ==================================================================== */}
        {recentlyViewed.length > 0 && (
          <section className="mt-20 pt-16 border-t border-white/10">
            <div className="mb-6">
              <span className="text-[10px] font-mono tracking-widest text-[#c5a46d] uppercase block mb-1">
                Your Browsing History
              </span>
              <h3 className="text-xl sm:text-2xl font-black uppercase font-display text-white">
                RECENTLY VIEWED
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentlyViewed.map((item) => (
                <ProductRecommendationCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* MODULE 6: TRENDING PRODUCTS                                         */}
        {/* ==================================================================== */}
        <section className="mt-20 pt-16 border-t border-white/10">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#c5a46d] uppercase block mb-1">
                High-Frequency Demand
              </span>
              <h3 className="text-xl sm:text-2xl font-black uppercase font-display text-white">
                TRENDING ATELIER SILHOUETTES
              </h3>
            </div>
            <Link
              href="/collection"
              className="text-xs font-mono uppercase tracking-widest text-[#c5a46d] hover:text-white flex items-center gap-1.5"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trending.map((item) => (
              <ProductRecommendationCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

/**
 * Reusable Product Recommendation Card Component
 */
function ProductRecommendationCard({ product }: { product: Product }) {
  const { navigateTo } = usePageTransition();
  const { toggleWishlist, isInWishlist } = useCart();
  const isSaved = isInWishlist(product.id);

  return (
    <div className="bg-neutral-950 border border-white/10 hover:border-[#c5a46d]/50 p-4 flex flex-col justify-between group transition-all">
      <div className="relative aspect-[3/4] bg-neutral-900 overflow-hidden mb-3">
        <img
          src={product.thumbnail}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Wishlist Heart */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:text-rose-400 transition-colors"
        >
          <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </div>

      <div className="space-y-2">
        <span className="text-[9px] font-mono text-neutral-400 uppercase block truncate">
          {product.category}
        </span>
        <h4 className="text-xs font-bold uppercase text-white truncate">
          {product.name}
        </h4>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-mono font-bold text-[#c5a46d]">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={() => navigateTo(`/product/${product.id}`)}
            className="text-[10px] font-mono text-neutral-400 hover:text-white uppercase flex items-center gap-1 group-hover:text-[#c5a46d] transition-colors"
          >
            <span>View</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
