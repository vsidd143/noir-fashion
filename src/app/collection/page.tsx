"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageShell from "@/components/layout/PageShell";
import FeaturedCollection from "@/components/sections/FeaturedCollection";
import ProductRecommendations from "@/components/ui/ProductRecommendations";
import NewsletterSection from "@/components/sections/NewsletterSection";
import { getLiveProducts } from "@/lib/products-service";
import { Product } from "@/types/fashion";
import { Sparkles, ShieldCheck, Truck, RotateCcw } from "lucide-react";

export default function CollectionPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      const live = await getLiveProducts();
      setProducts(live);
    })();
  }, []);

  return (
    <PageShell>
      {/* Editorial Collection Hero Header with Staggered Entrance */}
      <section className="relative pt-36 pb-16 px-6 md:px-14 bg-[#050505] border-b border-white/[0.06] overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="pointer-events-none absolute -top-40 right-1/4 w-96 h-96 bg-[#c5a46d]/10 rounded-full blur-[140px]" />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-4"
          >
            <Sparkles className="w-4 h-4" />
            <span>Edition 07 // Autumn-Winter Runway</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black uppercase font-display tracking-tight text-white max-w-4xl leading-[0.95]"
          >
            THE RUNWAY <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f0e6d2] to-[#c5a46d]">COLLECTION</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-xs sm:text-sm text-neutral-400 font-mono max-w-2xl leading-relaxed"
          >
            Modern luxury streetwear crafted with relaxed proportions. Made from 480 GSM heavy loopback cotton, durable matte hardware, and clean tailoring. Available in limited numbered editions.
          </motion.p>

          {/* Value Badges */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/10 text-xs font-mono"
          >
            <div className="flex items-center gap-3 text-neutral-300">
              <Truck className="w-4 h-4 text-[#c5a46d]" />
              <span>Complimentary Pan-India Express Delivery</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <ShieldCheck className="w-4 h-4 text-[#c5a46d]" />
              <span>Cash on Delivery (COD) Available Pan-India</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <RotateCcw className="w-4 h-4 text-[#c5a46d]" />
              <span>All Prices Inclusive of GST & Taxes</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Interactive Collection Grid & Filters */}
      <FeaturedCollection />

      {/* Recommended Full Looks Styling Engine — only if products exist */}
      {products.length > 0 && (
        <div className="bg-[#080808] border-t border-white/[0.06] py-16 px-6 md:px-14">
          <div className="max-w-7xl mx-auto">
            <ProductRecommendations currentProduct={products[0]} allProducts={products} />
          </div>
        </div>
      )}

      {/* VIP Access Newsletter */}
      <NewsletterSection />
    </PageShell>
  );
}
