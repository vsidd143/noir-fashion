"use client";

import React, { useState, useEffect } from "react";
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

  const currentColor = quickViewProduct ? (selectedColor || quickViewProduct.colors[0]) : null;
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
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 shadow-2xl my-auto z-10 p-6 md:p-8"
          >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 border border-white/10 text-white hover:border-[#c5a46d] hover:text-[#c5a46d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Gallery Column */}
            <div className="relative bg-neutral-950 flex flex-col justify-between p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-4">
                {quickViewProduct.isNew && (
                  <span className="px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase bg-[#c5a46d] text-black font-mono">
                    NEW DROP
                  </span>
                )}
                {quickViewProduct.threeDType && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase bg-white/10 text-white font-mono border border-white/20">
                    <Box className="w-3 h-3 text-[#c5a46d]" />
                    3D ATELIER READY
                  </span>
                )}
              </div>

              {/* Main Image */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-900 border border-white/5">
                <img
                  src={quickViewProduct.images[selectedImageIndex] || quickViewProduct.thumbnail}
                  alt={quickViewProduct.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                />
              </div>

              {/* Thumbnails */}
              {quickViewProduct.images.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
                  {quickViewProduct.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-16 h-20 shrink-0 border overflow-hidden transition-all ${
                        selectedImageIndex === idx
                          ? "border-[#c5a46d] opacity-100"
                          : "border-white/10 opacity-50 hover:opacity-80"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info & Options Column */}
            <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div>
                {/* Category & Rating */}
                <div className="flex items-center justify-between text-xs text-[#a0a0a0] uppercase tracking-wider mb-2 font-mono">
                  <span>{quickViewProduct.category}</span>
                  <div className="flex items-center gap-1 text-[#c5a46d]">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="font-bold text-white">{quickViewProduct.rating}</span>
                    <span className="text-neutral-500">({quickViewProduct.reviewsCount})</span>
                  </div>
                </div>

                {/* Title & Price */}
                <h3 className="text-2xl font-black tracking-wider text-white uppercase font-display">
                  {quickViewProduct.name}
                </h3>
                <p className="text-xs text-[#a0a0a0] mt-1">{quickViewProduct.subtitle}</p>

                <div className="flex items-baseline gap-3 mt-4">
                  <span className="text-2xl font-mono font-bold text-[#c5a46d]">
                    {formatPrice(quickViewProduct.price)}
                  </span>
                  {quickViewProduct.originalPrice && (
                    <span className="text-sm font-mono text-neutral-500 line-through">
                      {formatPrice(quickViewProduct.originalPrice)}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                    (INCL. GST)
                  </span>
                </div>

                {/* Color Selector */}
                <div className="mt-6">
                  <label className="text-[11px] uppercase tracking-widest text-[#a0a0a0] font-mono block mb-2">
                    Color // <span className="text-white">{currentColor.name}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {quickViewProduct.colors.map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => setSelectedColor(color)}
                        className={`relative w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                          currentColor.hex === color.hex
                            ? "border-[#c5a46d] scale-110"
                            : "border-white/20 hover:border-white"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {currentColor.hex === color.hex && (
                          <Check className="w-4 h-4 text-white mix-blend-difference" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Selector */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#a0a0a0] font-mono">
                      {quickViewProduct.category === "footwear" ? "Size Selection (UK / India)" : "Size Selection"}
                    </label>
                    <span className="text-[10px] text-neutral-500 underline uppercase tracking-wider cursor-pointer hover:text-white">
                      Fit Guide
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {quickViewProduct.sizes.map((size) => {
                      const cleanSize = size.replace(/\s*\/\s*US\s*\d+/gi, "").trim();
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`py-2 text-xs font-mono font-bold tracking-wider transition-all border ${
                            currentSize === size
                              ? "bg-[#c5a46d] text-black border-[#c5a46d]"
                              : "bg-black border-white/15 text-white hover:border-white"
                          }`}
                        >
                          {cleanSize}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description & Details */}
                <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {quickViewProduct.description}
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-neutral-400 font-mono">
                    <li>• <span className="text-neutral-200">Material:</span> {quickViewProduct.material}</li>
                    <li>• <span className="text-neutral-200">Fit:</span> {quickViewProduct.fit}</li>
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4">
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-4 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-[0.25em] uppercase transition-all flex items-center justify-center gap-2 group shadow-lg shadow-[#c5a46d]/15"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Bag · {formatPrice(quickViewProduct.price)}</span>
                  </button>

                  <button
                    onClick={() => toggleWishlist(quickViewProduct.id)}
                    className={`p-4 border transition-colors ${
                      isSaved
                        ? "border-rose-500/60 bg-rose-500/15 text-rose-400"
                        : "border-white/20 hover:border-white text-white"
                    }`}
                    title={isSaved ? "Saved to Wishlist" : "Save to Wishlist"}
                  >
                    <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 py-2 px-3 border border-white/10 bg-black/40 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c5a46d] animate-pulse" />
                  <span>Limited Vault Serialized Batch · Hand Finished</span>
                </div>

                <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500 tracking-wider font-mono">
                  <ShieldCheck className="w-3 h-3 text-neutral-400" />
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
