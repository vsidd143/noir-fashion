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
    <div className="w-full mt-10 border-t border-[#E5E0D8] pt-8 text-[#161616]">
      {/* Header and Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#1A3B8B]" />
          <h4 className="text-sm font-headline uppercase tracking-wider text-[#161616]">
            Algorithmic Atelier Styling
          </h4>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-[#E5E0D8] p-1 bg-white rounded-[1px]">
          <button
            onClick={() => setActiveTab("outfit")}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "outfit"
                ? "bg-[#1A3B8B] text-white font-medium"
                : "text-[#6E6D68] hover:text-[#161616]"
            }`}
          >
            Complete The Look
          </button>
          <button
            onClick={() => setActiveTab("frequently")}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "frequently"
                ? "bg-[#1A3B8B] text-white font-medium"
                : "text-[#6E6D68] hover:text-[#161616]"
            }`}
          >
            Pairing Accents
          </button>
          <button
            onClick={() => setActiveTab("similar")}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "similar"
                ? "bg-[#1A3B8B] text-white font-medium"
                : "text-[#6E6D68] hover:text-[#161616]"
            }`}
          >
            You May Also Like
          </button>
          <button
            onClick={() => setActiveTab("viewed")}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "viewed"
                ? "bg-[#1A3B8B] text-white font-medium"
                : "text-[#6E6D68] hover:text-[#161616]"
            }`}
          >
            Also Viewed
          </button>
        </div>
      </div>

      {/* Tab 1: Complete The Look */}
      {activeTab === "outfit" && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-[#E5E0D8] flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[2px]">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#1A3B8B] uppercase block font-semibold">
                CURATED ATELIER ENSEMBLE
              </span>
              <p className="text-xs text-[#4A4944] mt-0.5">
                Engineered silhouette pairing with matching proportion, tech fabric, and color harmony.
              </p>
            </div>

            <button
              onClick={handleAddEntireLook}
              className="py-2.5 px-5 bg-[#1A3B8B] hover:bg-[#153070] text-white font-medium text-[10px] tracking-[0.2em] uppercase font-mono transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm rounded-[2px] cursor-pointer"
            >
              {addedAllSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
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
    <div className="bg-white border border-[#E5E0D8] p-2.5 flex flex-col justify-between group hover:border-[#1A3B8B] transition-all rounded-[2px]">
      <div
        onClick={() => onSelectProduct?.(product)}
        className="relative aspect-[3/4] w-full bg-[#EFECE6] overflow-hidden cursor-pointer rounded-[1px]"
      >
        <img
          src={product.thumbnail}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="p-2 bg-white rounded-full text-[#1A3B8B] border border-[#E5E0D8] shadow-xs">
            <Eye className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      <div className="pt-2 flex flex-col justify-between flex-1">
        <div>
          <span className="text-[9px] font-mono uppercase text-[#6E6D68] block truncate">
            {product.category}
          </span>
          <h5
            onClick={() => onSelectProduct?.(product)}
            className="text-[11px] font-headline font-normal uppercase text-[#161616] truncate cursor-pointer hover:text-[#1A3B8B] transition-colors"
          >
            {product.name}
          </h5>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#E5E0D8] mt-2">
          <span className="text-xs font-mono font-medium text-[#161616]">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={() => addToCart(product, product.colors[0], product.sizes[0] || "M")}
            className="p-1.5 bg-[#FAF8F5] hover:bg-[#1A3B8B] text-[#161616] hover:text-white border border-[#E5E0D8] transition-colors rounded-[1px] cursor-pointer"
            title="Add to Bag"
          >
            <ShoppingBag className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
