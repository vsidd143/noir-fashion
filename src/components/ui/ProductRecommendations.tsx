"use client";

import React, { useState } from "react";
import { Product } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import {
  getCompleteTheLook,
  getFrequentlyBoughtTogether,
  getYouMayAlsoLike,
  getCustomersAlsoViewed,
} from "@/lib/recommendations";
import { useCart } from "@/context/CartContext";
import { Sparkles, ShoppingBag, Eye, Plus, Check } from "lucide-react";

interface ProductRecommendationsProps {
  currentProduct: Product;
  allProducts: Product[];
  onSelectProduct?: (product: Product) => void;
}

export default function ProductRecommendations({
  currentProduct,
  allProducts,
  onSelectProduct,
}: ProductRecommendationsProps) {
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState<"outfit" | "frequently" | "similar" | "viewed">("outfit");
  const [addedAllSuccess, setAddedAllSuccess] = useState(false);

  const outfit = getCompleteTheLook(currentProduct, allProducts);
  const frequentlyBought = getFrequentlyBoughtTogether(currentProduct, allProducts, 3);
  const similarProducts = getYouMayAlsoLike(currentProduct, allProducts, 4);
  const alsoViewed = getCustomersAlsoViewed(currentProduct, allProducts, 4);

  const handleAddEntireLook = () => {
    outfit.forEach((item) => {
      addToCart(item, item.colors[0], item.sizes[0] || "M");
    });
    setAddedAllSuccess(true);
    setTimeout(() => setAddedAllSuccess(false), 3000);
  };

  const outfitTotal = outfit.reduce((sum, item) => sum + item.price, 0) + currentProduct.price;

  return (
    <div className="w-full mt-10 border-t border-white/10 pt-8">
      {/* Header and Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#c5a46d]" />
          <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white font-display">
            Algorithmic Atelier Styling
          </h4>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-white/10 p-1 bg-black/60">
          <button
            onClick={() => setActiveTab("outfit")}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === "outfit"
                ? "bg-[#c5a46d] text-black font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Complete The Look
          </button>
          <button
            onClick={() => setActiveTab("frequently")}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === "frequently"
                ? "bg-[#c5a46d] text-black font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Pairing Accents
          </button>
          <button
            onClick={() => setActiveTab("similar")}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === "similar"
                ? "bg-[#c5a46d] text-black font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            You May Also Like
          </button>
          <button
            onClick={() => setActiveTab("viewed")}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === "viewed"
                ? "bg-[#c5a46d] text-black font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Also Viewed
          </button>
        </div>
      </div>

      {/* Tab 1: Complete The Look */}
      {activeTab === "outfit" && (
        <div className="space-y-4">
          <div className="p-4 bg-neutral-950 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#c5a46d] uppercase block">
                CURATED ATELIER ENSEMBLE
              </span>
              <p className="text-xs text-neutral-300 mt-0.5">
                Engineered silhouette pairing with matching proportion, tech fabric, and color harmony.
              </p>
            </div>

            <button
              onClick={handleAddEntireLook}
              className="py-2.5 px-5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-[10px] tracking-[0.2em] uppercase font-mono transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg"
            >
              {addedAllSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black" />
                  <span>Ensemble Added to Bag!</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Acquire Full Look · {formatPrice(outfitTotal)}</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {outfit.map((item) => (
              <RecommendationCard
                key={item.id}
                product={item}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Frequently Bought Together */}
      {activeTab === "frequently" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {frequentlyBought.map((item) => (
            <RecommendationCard
              key={item.id}
              product={item}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}

      {/* Tab 3: You May Also Like */}
      {activeTab === "similar" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {similarProducts.map((item) => (
            <RecommendationCard
              key={item.id}
              product={item}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}

      {/* Tab 4: Customers Also Viewed */}
      {activeTab === "viewed" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {alsoViewed.map((item) => (
            <RecommendationCard
              key={item.id}
              product={item}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  product,
  onSelectProduct,
}: {
  product: Product;
  onSelectProduct?: (product: Product) => void;
}) {
  const { addToCart } = useCart();

  return (
    <div className="bg-[#080808] border border-white/10 p-2.5 flex flex-col justify-between group hover:border-[#c5a46d]/50 transition-all">
      <div
        onClick={() => onSelectProduct?.(product)}
        className="relative aspect-[3/4] w-full bg-neutral-900 overflow-hidden cursor-pointer"
      >
        <img
          src={product.thumbnail}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="p-2 bg-black/80 rounded-full text-[#c5a46d] border border-[#c5a46d]/40">
            <Eye className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      <div className="pt-2 flex flex-col justify-between flex-1">
        <div>
          <span className="text-[9px] font-mono uppercase text-[#a0a0a0] block truncate">
            {product.category}
          </span>
          <h5
            onClick={() => onSelectProduct?.(product)}
            className="text-[11px] font-bold uppercase text-white truncate cursor-pointer hover:text-[#c5a46d] transition-colors"
          >
            {product.name}
          </h5>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
          <span className="text-xs font-mono font-bold text-[#c5a46d]">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={() => addToCart(product, product.colors[0], product.sizes[0] || "M")}
            className="p-1.5 bg-neutral-900 hover:bg-[#c5a46d] text-neutral-400 hover:text-black transition-colors"
            title="Add to Bag"
          >
            <ShoppingBag className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
