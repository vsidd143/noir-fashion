"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { ProductColor, Product } from "@/types/fashion";
import { X, ShoppingBag, Heart, Box, Check, Star, ShieldCheck } from "lucide-react";
import ProductRecommendations from "@/components/ui/ProductRecommendations";
import { getLiveProducts } from "@/lib/products-service";
import { formatPrice } from "@/lib/currency";

export default function QuickViewModal() {
  const { quickViewProduct, setQuickViewProduct, addToCart, isInWishlist, toggleWishlist } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      const live = await getLiveProducts();
      setLiveProducts(live);
    })();
  }, []);

  // Map colors cleanly: replace any black color with Atelier White (#FFFFFF)
  const availableColors = useMemo(() => {
    if (!quickViewProduct) return [];
    return quickViewProduct.colors.map((rawColor) => {
      const isBlack =
        rawColor.name?.toLowerCase().includes("black") ||
        rawColor.hex?.toLowerCase() === "#0a0a0a" ||
        rawColor.hex?.toLowerCase() === "#000000" ||
        rawColor.hex?.toLowerCase() === "#161616";
      return isBlack
        ? { name: "Atelier White", hex: "#FFFFFF", bgClass: "bg-white" }
        : rawColor;
    });
  }, [quickViewProduct]);

  const currentColor = quickViewProduct
    ? selectedColor || availableColors[0] || { name: "Atelier White", hex: "#FFFFFF", bgClass: "bg-white" }
    : null;
  const currentSize = quickViewProduct ? (selectedSize || quickViewProduct.sizes[0] || "M") : "M";
  const isSaved = quickViewProduct ? isInWishlist(quickViewProduct.id) : false;

  const handleClose = () => {
    setQuickViewProduct(null);
    setSelectedImageIndex(0);
    setSelectedColor(null);
    setSelectedSize("");
  };

  const handleAddToCart = () => {
    if (quickViewProduct && currentColor) {
      addToCart(quickViewProduct, currentColor, currentSize, 1);
    }
  };

  return (
    <AnimatePresence>
      {quickViewProduct && currentColor && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Dialog: Luxury White/Cream Aesthetic matching Product Details Page */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#FAF8F5] border border-[#E5E0D8] shadow-2xl my-auto z-10 p-6 md:p-8 rounded-[2px] text-[#161616]"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white border border-[#E5E0D8] text-[#161616] hover:bg-[#1A3B8B] hover:text-white transition-colors shadow-xs cursor-pointer"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Gallery Column */}
              <div className="relative bg-[#EFECE6] flex flex-col justify-between p-6 md:p-8 border-b md:border-b-0 md:border-r border-[#E5E0D8] rounded-[2px]">
                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                  {quickViewProduct.isNew && (
                    <span className="px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase bg-[#1A3B8B] text-white font-mono rounded-[1px] shadow-xs">
                      NEW DROP
                    </span>
                  )}
                  {quickViewProduct.threeDType && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase bg-white text-[#161616] font-mono border border-[#E5E0D8] rounded-[1px] shadow-xs">
                      <Box className="w-3 h-3 text-[#1A3B8B]" />
                      3D ATELIER READY
                    </span>
                  )}
                </div>

                {/* Main Image */}
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-white border border-[#E5E0D8] rounded-[2px] shadow-xs">
                  <img
                    src={quickViewProduct.images[selectedImageIndex] || quickViewProduct.thumbnail}
                    alt={quickViewProduct.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-all duration-700 hover:scale-103"
                  />
                </div>

                {/* Thumbnails */}
                {quickViewProduct.images.length > 1 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
                    {quickViewProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-16 h-20 shrink-0 border overflow-hidden rounded-[1px] transition-all cursor-pointer ${
                          selectedImageIndex === idx
                            ? "border-[#1A3B8B] ring-2 ring-[#1A3B8B]/20 opacity-100"
                            : "border-[#E5E0D8] opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info & Options Column */}
              <div className="p-2 md:p-4 flex flex-col justify-between space-y-6">
                <div>
                  {/* Category & Rating */}
                  <div className="flex items-center justify-between text-xs text-[#6E6D68] uppercase tracking-wider mb-2 font-mono">
                    <span className="text-[#1A3B8B] font-medium">{quickViewProduct.category}</span>
                    <div className="flex items-center gap-1 text-[#1A3B8B]">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-[#161616]">{quickViewProduct.rating || 5}</span>
                      <span className="text-[#6E6D68]">({quickViewProduct.reviewsCount || 0})</span>
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-2xl sm:text-3xl font-headline font-normal tracking-tight text-[#161616] uppercase">
                    {quickViewProduct.name}
                  </h3>
                  {quickViewProduct.subtitle && (
                    <p className="text-xs font-body text-[#6E6D68] mt-1">{quickViewProduct.subtitle}</p>
                  )}

                  {/* Price & Taxes */}
                  <div className="flex items-baseline gap-3 mt-4 border-b border-[#E5E0D8] pb-4">
                    <span className="text-2xl font-mono font-medium text-[#161616]">
                      {formatPrice(quickViewProduct.price)}
                    </span>
                    {quickViewProduct.originalPrice && quickViewProduct.originalPrice > quickViewProduct.price && (
                      <span className="text-sm font-mono text-[#6E6D68] line-through">
                        {formatPrice(quickViewProduct.originalPrice)}
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-[#1A3B8B]/10 border border-[#1A3B8B]/20 text-[#1A3B8B] font-semibold rounded-[1px]">
                      INCLUSIVE OF ALL TAXES
                    </span>
                  </div>

                  {/* Color Selector: White in place of black */}
                  <div className="mt-6">
                    <label className="text-[11px] uppercase tracking-wider text-[#6E6D68] font-body font-semibold block mb-2">
                      Color // <span className="text-[#161616] font-medium">{currentColor.name}</span>
                    </label>
                    <div className="flex items-center gap-3">
                      {availableColors.map((color) => {
                        const isSelected = currentColor.hex === color.hex;
                        return (
                          <button
                            key={color.hex + color.name}
                            onClick={() => setSelectedColor(color)}
                            className={`relative w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                              isSelected
                                ? "border-[#1A3B8B] scale-110 shadow-xs ring-2 ring-[#1A3B8B]/20"
                                : "border-[#D5D0C8] hover:border-[#1A3B8B] shadow-xs"
                            }`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          >
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#1A3B8B]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Size Selector */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[11px] uppercase tracking-wider text-[#6E6D68] font-body font-semibold">
                        {quickViewProduct.category === "footwear" ? "Size Selection (UK / India)" : "Size Selection"}
                      </label>
                      <span className="text-[10px] text-[#1A3B8B] underline uppercase tracking-wider cursor-pointer hover:text-[#153070]">
                        Fit Guide
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {quickViewProduct.sizes.map((size) => {
                        const cleanSize = size.replace(/\s*\/\s*US\s*\d+/gi, "").trim();
                        const isSelected = currentSize === size;
                        return (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`py-2 text-xs font-mono font-medium tracking-wider transition-all border cursor-pointer ${
                              isSelected
                                ? "bg-[#1A3B8B] text-white border-[#1A3B8B] shadow-xs"
                                : "bg-white border-[#E5E0D8] text-[#161616] hover:border-[#1A3B8B]"
                            }`}
                          >
                            {cleanSize}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description & Details */}
                  <div className="mt-6 pt-6 border-t border-[#E5E0D8] space-y-3">
                    <p className="text-xs text-[#4A4944] leading-relaxed">
                      {quickViewProduct.description}
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-[#6E6D68] font-mono">
                      {quickViewProduct.material && (
                        <li>• <span className="text-[#161616] font-medium">Material:</span> {quickViewProduct.material}</li>
                      )}
                      {quickViewProduct.fit && (
                        <li>• <span className="text-[#161616] font-medium">Fit:</span> {quickViewProduct.fit}</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4">
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 py-4 bg-[#1A3B8B] hover:bg-[#153070] text-white font-medium text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 group shadow-sm rounded-[2px] cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Bag · {formatPrice(quickViewProduct.price)}</span>
                    </button>

                    <button
                      onClick={() => toggleWishlist(quickViewProduct.id)}
                      className={`p-4 border transition-colors rounded-[2px] cursor-pointer ${
                        isSaved
                          ? "border-rose-400 bg-rose-50 text-rose-600"
                          : "border-[#E5E0D8] bg-white hover:border-rose-300 hover:text-rose-500 text-[#161616]"
                      }`}
                      title={isSaved ? "Saved to Wishlist" : "Save to Wishlist"}
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-2 px-3 border border-[#E5E0D8] bg-white text-[10px] font-mono uppercase tracking-widest text-[#6E6D68] rounded-[1px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A3B8B] animate-pulse" />
                    <span>Limited Vault Serialized Batch · Hand Finished</span>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-[#6E6D68] tracking-wider font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1A3B8B]" />
                    <span>Complimentary Blue Dart Express Delivery across India & 7-Day Returns</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Product Recommendations Engine */}
            <ProductRecommendations
              currentProduct={quickViewProduct}
              allProducts={liveProducts}
              onSelectProduct={(prod) => {
                setQuickViewProduct(prod);
                setSelectedImageIndex(0);
                setSelectedColor(null);
                setSelectedSize("");
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
