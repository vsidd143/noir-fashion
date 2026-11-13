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
  ChevronLeft,
  Eye,
  ArrowRight,
  AlertCircle,
  Zap,
} from "lucide-react";
import ProductReviewModal from "@/components/ui/ProductReviewModal";

export default function ProductDetailClient({ slug }: { slug: string }) {
  const { addToCart, buyNow, isInWishlist, toggleWishlist } = useCart();
  const { navigateTo } = usePageTransition();

  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
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
    (p) => p.id === slug || p.dbId === slug || p.name.toLowerCase().replace(/\s+/g, "-") === slug
  );

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [sizeError, setSizeError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);
  const [addedLookSuccess, setAddedLookSuccess] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  // Customer Reviews State (Real-time and genuine)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewsStats, setReviewsStats] = useState<{ rating: number; count: number } | null>(null);

  // Fetch verified reviews for this product
  useEffect(() => {
    if (!product?.id) return;
    let isMounted = true;

    (async () => {
      try {
        const res = await fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`);
        const data = await res.json();
        if (data.success && isMounted) {
          let count = data.count || 0;
          let avg = data.averageRating || 0;

          // Merge local cache if available
          try {
            const localSaved = localStorage.getItem(`noir_reviews_${product.id}`);
            if (localSaved) {
              const localList = JSON.parse(localSaved);
              if (Array.isArray(localList) && localList.length > count) {
                count = localList.length;
                avg = Number(
                  (localList.reduce((acc: number, r: { rating?: number }) => acc + (r.rating || 5), 0) / count).toFixed(1)
                );
              }
            }
          } catch {}

          setReviewsStats({ rating: avg, count });
        }
      } catch (err) {
        console.warn("Could not query product reviews:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  // Update selected color/size when product changes
  useEffect(() => {
    if (product) {
      let viewedObjs: Product[] = [];
      try {
        const stored = localStorage.getItem("noir_viewed_products");
        const list: string[] = stored ? JSON.parse(stored) : [];
        const updated = [product.id, ...list.filter((id) => id !== product.id)].slice(0, 8);
        localStorage.setItem("noir_viewed_products", JSON.stringify(updated));

        viewedObjs = updated
          .filter((id) => id !== product.id)
          .map((id) => liveProducts.find((p) => p.id === id))
          .filter(Boolean) as Product[];
      } catch { }

      queueMicrotask(() => {
        const rawFirstColor = product.colors[0];
        setSelectedColor(
          rawFirstColor || { name: "Classic White", hex: "#FFFFFF", bgClass: "bg-white" }
        );
        setSelectedSize("");
        setSizeError(false);
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
          <div className="w-8 h-8 rounded-full border-2 border-[#1A3B8B] border-t-transparent animate-spin mb-4" />
          <p className="text-xs font-mono text-[#6E6D68] uppercase tracking-wider">
            Loading Product Details...
          </p>
        </div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full border border-[#E5E0D8] bg-white flex items-center justify-center text-[#6E6D68] mb-4">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-headline font-normal text-[#161616]">Product Not Available</h2>
          <p className="text-sm text-[#6E6D68] font-body mt-2 mb-6 leading-relaxed">
            This item is currently unavailable or has not yet been published to the storefront.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/new-arrivals"
              className="px-6 py-3 bg-[#161616] hover:bg-[#1A3B8B] text-white font-body text-xs font-medium uppercase tracking-wider transition-colors"
            >
              Browse New Arrivals
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const stockQuantity = product.stock_quantity ?? 10;
  const isOutOfStock = stockQuantity <= 0;
  const maxAllowedQty = Math.max(1, Math.min(10, stockQuantity));

  const activeReviewsCount =
    reviewsStats !== null ? reviewsStats.count : (product.reviewsCount || 0);
  const activeRating =
    reviewsStats !== null
      ? reviewsStats.rating
      : activeReviewsCount > 0
      ? Number(product.rating) || 0
      : 0;

  const activeColor = selectedColor || product.colors[0] || { name: "Standard", hex: "#161616", bgClass: "" };

  const outfit = getCompleteTheLook(product, liveProducts);
  const frequentlyBought = getFrequentlyBoughtTogether(product, liveProducts, 4);
  const related = getRelatedProducts(product, liveProducts, 4);
  const youMayLike = getYouMayAlsoLike(product, liveProducts, 4);
  const trending = getTrendingProducts(liveProducts, 4);

  const outfitTotal = outfit.reduce((sum, item) => sum + item.price, 0) + product.price;

  const handleSelectSize = (size: string) => {
    setSelectedSize(size);
    setSizeError(false);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (!selectedSize) {
      setSizeError(true);
      return;
    }
    addToCart(product, activeColor, selectedSize, quantity);
    setAddedToCartSuccess(true);
    setSizeError(false);
    setTimeout(() => setAddedToCartSuccess(false), 2500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    if (!selectedSize && product.sizes.length > 0) {
      setSizeError(true);
      return;
    }
    const chosenSize = selectedSize || product.sizes[0] || "M";
    buyNow(product, activeColor, chosenSize, quantity);
  };

  const handleAddEntireLook = () => {
    if (!selectedSize && product.sizes.length > 0) {
      setSizeError(true);
      return;
    }
    addToCart(product, activeColor, selectedSize || product.sizes[0] || "M", 1);
    outfit.forEach((item) => {
      addToCart(item, item.colors[0], item.sizes[0] || "M", 1);
    });
    setAddedLookSuccess(true);
    setTimeout(() => setAddedLookSuccess(false), 3000);
  };

  const isSaved = isInWishlist(product.id);

  // Schema.org JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images,
    description: product.description,
    category: product.category,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability: isOutOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "NOIR",
      },
    },
  };

  return (
    <PageShell>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pt-28 sm:pt-36 pb-20 sm:pb-24 px-4 sm:px-8 md:px-14 max-w-7xl mx-auto text-[#161616]">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-body uppercase tracking-wider text-[#6E6D68] mb-8 overflow-x-auto whitespace-nowrap no-scrollbar">
          <Link href="/" className="hover:text-[#1A3B8B] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#A09D96]" />
          <Link
            href={
              product.department === "women"
                ? "/women"
                : product.department === "kids"
                  ? "/kids"
                  : "/men"
            }
            className="hover:text-[#1A3B8B] transition-colors capitalize"
          >
            {product.department || product.category}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#A09D96]" />
          <span className="text-[#161616] font-medium truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        {/* Main Product Stage: Gallery + Buy Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* LEFT: Multi-Angle Gallery (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[3/4] bg-white border border-[#E5E0D8] rounded-[3px] overflow-hidden group shadow-xs flex items-center justify-center">
              <img
                src={product.images[selectedImageIndex] || product.thumbnail}
                alt={product.name}
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-102"
              />

              {/* Angle Navigation Arrows */}
              {product.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : product.images.length - 1));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#161616] flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-[#E5E0D8] cursor-pointer"
                    title="Previous angle"
                    aria-label="Previous angle"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((prev) => (prev < product.images.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#161616] flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-[#E5E0D8] cursor-pointer"
                    title="Next angle"
                    aria-label="Next angle"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-3 right-3 px-2.5 py-0.5 text-[11px] font-mono font-medium bg-black/60 text-white rounded-[2px] backdrop-blur-xs select-none">
                    {selectedImageIndex + 1} / {product.images.length}
                  </span>
                </>
              )}

              {/* Wishlist Button */}
              <button
                onClick={() => toggleWishlist(product.id)}
                className="absolute top-4 right-4 p-3 rounded-full bg-white/90 backdrop-blur-md border border-[#E5E0D8] text-[#161616] hover:text-rose-500 hover:border-rose-300 transition-colors shadow-xs"
                title="Save to Wishlist"
                aria-label="Save to Wishlist"
              >
                <Heart className={`w-5 h-5 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
              </button>
            </div>

            {/* Thumbnail Selectors: Edge-to-Edge & Perfectly Fitted */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 pt-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative aspect-[3/4] bg-white border-2 overflow-hidden rounded-[2px] transition-all cursor-pointer ${
                      selectedImageIndex === idx
                        ? "border-[#1A3B8B] ring-2 ring-[#1A3B8B]/20 opacity-100 scale-102 shadow-sm"
                        : "border-[#E5E0D8] opacity-75 hover:opacity-100 hover:border-[#A09D96]"
                    }`}
                    title={`View angle ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-top"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Buy Box & Specs (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* Category & Department */}
              <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
                <span className="text-xs font-mono tracking-wider uppercase text-[#1A3B8B] font-medium">
                  {product.department ? `${product.department.toUpperCase()} • ` : ""}
                  {(product.category || "").replace(/-/g, " ").toUpperCase()}
                </span>
                {/* Genuine Customer Reviews Option (Clickable to read or write) */}
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-mono text-[#6E6D68] hover:text-[#1A3B8B] transition-colors cursor-pointer group"
                  title={
                    activeReviewsCount > 0
                      ? "Read verified customer reviews or write one"
                      : "Write the first review for this product"
                  }
                >
                  <Star
                    className={`w-3.5 h-3.5 transition-colors ${
                      activeReviewsCount > 0
                        ? "fill-[#1A3B8B] text-[#1A3B8B]"
                        : "text-[#8C887E] group-hover:text-[#1A3B8B]"
                    }`}
                  />
                  {activeReviewsCount > 0 ? (
                    <>
                      <span className="font-semibold text-[#161616]">{activeRating.toFixed(1)}</span>
                      <span className="underline decoration-[#E5E0D8] group-hover:decoration-[#1A3B8B]">
                        ({activeReviewsCount} {activeReviewsCount === 1 ? "review" : "reviews"})
                      </span>
                      <span className="text-[#1A3B8B] font-medium ml-1">· Write a review</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#8C887E]">0</span>
                      <span>(0 reviews)</span>
                      <span className="text-[#1A3B8B] font-medium underline decoration-[#1A3B8B]/40 group-hover:decoration-[#1A3B8B] ml-1">
                        · Write a review
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h1 className="text-3xl sm:text-4xl font-headline font-normal tracking-tight text-[#161616] leading-tight">
                  {product.name}
                </h1>
                {product.subtitle && (
                  <p className="text-sm font-body text-[#6E6D68] mt-1">
                    {product.subtitle}
                  </p>
                )}
              </div>

              {/* Price Structure — Luxury Reference Style */}
              <div className="py-3.5 border-b border-[#E5E0D8] space-y-1.5">
                {/* Main Price Row with Discount % */}
                <div className="flex items-baseline gap-3">
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-3xl sm:text-4xl font-normal text-[#CC0C39] tracking-tight font-headline">
                      -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </span>
                  )}
                  <div className="flex items-baseline">
                    <span className="text-lg sm:text-xl font-medium text-[#161616] mr-0.5 align-super">
                      ₹
                    </span>
                    <span className="text-3xl sm:text-4xl font-bold font-headline tracking-tight text-[#161616]">
                      {product.price.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* M.R.P. & Savings Row */}
                {product.originalPrice && product.originalPrice > product.price && (
                  <div className="flex items-center gap-1.5 text-xs text-[#565959] font-body">
                    <span>M.R.P.:</span>
                    <span className="line-through text-[#6E6D68] font-mono">
                      {formatPrice(product.originalPrice)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 font-semibold ml-1.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                      Save ₹{(product.originalPrice - product.price).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {/* Tax Note */}
                <p className="text-xs text-[#161616] font-medium font-body pt-0.5">
                  Inclusive of all taxes
                </p>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm font-body text-[#4A4944] leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Color Selection */}
              {product.colors && product.colors.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between text-xs font-body">
                    <span className="text-[#6E6D68] uppercase tracking-wider text-[11px] font-semibold">
                      Color
                    </span>
                    <span className="text-[#161616] font-medium">
                      {selectedColor?.name || "Classic White"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {product.colors.map((color) => {
                      const isSelected =
                        selectedColor?.hex?.toLowerCase() === color.hex?.toLowerCase() &&
                        selectedColor?.name?.toLowerCase() === color.name?.toLowerCase();

                      return (
                        <button
                          key={color.hex + color.name}
                          onClick={() => setSelectedColor(color)}
                          style={{ backgroundColor: color.hex }}
                          className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                            isSelected
                              ? "border-[#1A3B8B] scale-110 shadow-md ring-2 ring-[#1A3B8B]/30"
                              : "border-[#D5D0C8] hover:scale-105 shadow-xs"
                          }`}
                          title={`${color.name} (${color.hex})`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between items-center text-xs font-body">
                    <span className="text-[#6E6D68] uppercase tracking-wider text-[11px] font-semibold">
                      Size
                    </span>
                    {sizeError && (
                      <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Please select a size
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {product.sizes.map((size) => {
                      const cleanSize = size.replace(/\s*\/\s*US\s*\d+/gi, "").trim();
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          onClick={() => handleSelectSize(size)}
                          className={`py-3 text-xs font-mono font-medium tracking-wider uppercase transition-all border ${isSelected
                              ? "bg-[#1A3B8B] text-white border-[#1A3B8B] shadow-xs"
                              : sizeError
                                ? "bg-white border-rose-400 text-[#161616] hover:border-rose-600"
                                : "bg-white border-[#E5E0D8] text-[#161616] hover:border-[#1A3B8B]"
                            }`}
                        >
                          {cleanSize}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock Status Indicator */}
              <div className="pt-1">
                {isOutOfStock ? (
                  <div className="flex items-center gap-2 text-xs font-body text-rose-600">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-medium">Currently Out of Stock</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-body text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>In stock · Ready to dispatch</span>
                    {stockQuantity > 0 && stockQuantity < 5 && (
                      <span className="font-semibold text-amber-700">
                        (Only {stockQuantity} left)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity and Primary Buy Actions */}
              <div className="space-y-3 pt-4 border-t border-[#E5E0D8]">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* Quantity selector */}
                    {!isOutOfStock && (
                      <div className="flex items-center border border-[#E5E0D8] bg-white h-12 shrink-0">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          className="px-3.5 h-full text-sm text-[#6E6D68] hover:text-[#161616] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-3.5 text-xs font-mono font-medium text-[#161616]">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(Math.min(maxAllowedQty, quantity + 1))}
                          disabled={quantity >= maxAllowedQty}
                          className="px-3.5 h-full text-sm text-[#6E6D68] hover:text-[#161616] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Primary Add to Bag */}
                    <button
                      disabled={isOutOfStock}
                      onClick={handleAddToCart}
                      className={`flex-1 h-12 px-4 border-2 font-body text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer rounded-[2px] ${
                        isOutOfStock
                          ? "border-[#D5D0C8] bg-[#FAF8F5] text-[#8C887E] cursor-not-allowed"
                          : "border-[#1A3B8B] text-[#1A3B8B] bg-white hover:bg-[#1A3B8B]/5 active:scale-[0.99]"
                      }`}
                    >
                      {isOutOfStock ? (
                        <span>Sold Out</span>
                      ) : addedToCartSuccess ? (
                        <>
                          <Check className="w-4 h-4 text-[#1A3B8B]" />
                          <span>Added to Bag</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4 text-[#1A3B8B]" />
                          <span>Add to Bag</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* High-Converting BUY NOW (Instant Checkout) */}
                  {!isOutOfStock && (
                    <button
                      onClick={handleBuyNow}
                      className="w-full h-12 px-6 bg-[#1A3B8B] hover:bg-[#142e6d] active:scale-[0.99] text-white font-body text-xs font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg cursor-pointer rounded-[2px]"
                      title="Buy Now with 1-Click Instant Checkout"
                    >
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Buy Now · {formatPrice(product.price * quantity)}</span>
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Guarantees */}
              <div className="pt-4 border-t border-[#E5E0D8] space-y-2 text-xs font-body text-[#6E6D68]">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#1A3B8B] shrink-0" />
                  <span>Delivery across India</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#1A3B8B] shrink-0" />
                  <span>Cash on delivery</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-[#1A3B8B] shrink-0" />
                  <span>7-day returns & exchanges</span>
                </div>
              </div>
            </div>

            {/* Specifications */}
            <div className="bg-white border border-[#E5E0D8] p-5 space-y-3 mt-6">
              <span className="text-xs font-body font-semibold tracking-wider text-[#161616] uppercase block">
                Product Specifications
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs font-body">
                <div>
                  <span className="text-[#6E6D68] block text-[11px]">Material</span>
                  <span className="text-[#161616] font-medium">
                    {(product.material || "Quality Fabric").replace(/silhouette/gi, "Product").replace(/atelier/gi, "Studio")}
                  </span>
                </div>
                <div>
                  <span className="text-[#6E6D68] block text-[11px]">Fit</span>
                  <span className="text-[#161616] font-medium">
                    {(product.fit || "Standard Fit").replace(/\bsilhouette\b/gi, "Fit").replace(/\bBoxy Product\b/gi, "Boxy Fit").replace(/\batelier\b/gi, "Studio")}
                  </span>
                </div>
                {product.weightGsm && (
                  <div>
                    <span className="text-[#6E6D68] block text-[11px]">Textile Weight</span>
                    <span className="text-[#161616] font-medium">{product.weightGsm} GSM</span>
                  </div>
                )}
                <div>
                  <span className="text-[#6E6D68] block text-[11px]">Care</span>
                  <span className="text-[#161616] font-medium">
                    {(product.care || "Machine wash cold").replace(/silhouette/gi, "Product").replace(/atelier/gi, "Studio")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* MODULE 1: COMPLETE THE LOOK                                          */}
        {/* ==================================================================== */}
        {outfit.length > 0 && (
          <section className="mt-20 pt-16 border-t border-[#E5E0D8]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-1">
                  Styling Suggestion
                </span>
                <h3 className="text-2xl sm:text-3xl font-headline font-normal text-[#161616]">
                  Complete the Look
                </h3>
                <p className="text-sm text-[#6E6D68] font-body mt-1">
                  Complementary pieces selected to pair with this product.
                </p>
              </div>

              <button
                onClick={handleAddEntireLook}
                className="py-3 px-6 bg-[#161616] hover:bg-[#1A3B8B] text-white font-body text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-xs"
              >
                {addedLookSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Entire Look Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-white" />
                    <span>Add Entire Look · {formatPrice(outfitTotal)}</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Current Product Card */}
              <div className="bg-white border border-[#1A3B8B]/40 p-4 flex flex-col justify-between relative group">
                <span className="absolute top-3 left-3 px-2 py-0.5 bg-[#1A3B8B] text-white text-[9px] font-body font-semibold uppercase z-10">
                  Current Item
                </span>
                <div className="relative aspect-[3/4] bg-[#EFECE6] overflow-hidden mb-3">
                  <img
                    src={product.thumbnail}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#6E6D68] uppercase block truncate">{product.category}</span>
                  <h4 className="text-sm font-headline font-normal text-[#161616] truncate">{product.name}</h4>
                  <span className="text-xs font-mono font-medium text-[#161616] block">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>

              {/* Matching Complementary Items */}
              {outfit.map((item) => (
                <ProductRecommendationCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* MODULE 2: RELATED PRODUCTS                                           */}
        {/* ==================================================================== */}
        {related.length > 0 && (
          <section className="mt-20 pt-16 border-t border-[#E5E0D8]">
            <div className="mb-6">
              <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-1">
                More In This Department
              </span>
              <h3 className="text-2xl sm:text-3xl font-headline font-normal text-[#161616]">
                Related product
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
        {/* MODULE 3: RECENTLY VIEWED                                            */}
        {/* ==================================================================== */}
        {recentlyViewed.length > 0 && (
          <section className="mt-20 pt-16 border-t border-[#E5E0D8]">
            <div className="mb-6">
              <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-1">
                Your Browsing History
              </span>
              <h3 className="text-2xl sm:text-3xl font-headline font-normal text-[#161616]">
                Recently Viewed
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentlyViewed.map((item) => (
                <ProductRecommendationCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Verified Customer Reviews & Rating Modal */}
      <ProductReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        productId={product.id}
        productName={product.name}
        onReviewSubmitted={(updatedRating, updatedCount) => {
          setReviewsStats({ rating: updatedRating, count: updatedCount });
        }}
      />
    </PageShell>
  );
}

/**
 * Reusable Product Recommendation Card Component (Editorial Canvas)
 */
function ProductRecommendationCard({ product }: { product: Product }) {
  const { navigateTo } = usePageTransition();
  const { toggleWishlist, isInWishlist } = useCart();
  const isSaved = isInWishlist(product.id);

  return (
    <div
      onClick={() => navigateTo(`/product/${product.id}`)}
      className="bg-white border border-[#E5E0D8] hover:border-[#1A3B8B] p-4 flex flex-col justify-between group transition-all cursor-pointer shadow-xs hover:shadow-md"
    >
      <div className="relative aspect-[3/4] bg-[#EFECE6] overflow-hidden mb-3">
        <img
          src={product.thumbnail}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
        />

        {/* Wishlist Heart */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-[#161616] hover:text-rose-500 transition-colors shadow-xs"
          aria-label="Save to Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-[#6E6D68] uppercase block truncate">
          {product.category}
        </span>
        <h4 className="text-sm font-headline font-normal text-[#161616] group-hover:text-[#1A3B8B] transition-colors truncate">
          {product.name}
        </h4>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-mono font-medium text-[#161616]">
            {formatPrice(product.price)}
          </span>
          <span className="text-xs font-body font-medium text-[#1A3B8B] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>View</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
