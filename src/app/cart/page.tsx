"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PageShell from "@/components/layout/PageShell";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ArrowLeft } from "lucide-react";

export default function CartPage() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    cartTotal,
    discountAmount,
    couponCode,
    applyCoupon,
    setIsCheckoutOpen,
  } = useCart();

  const [inputCoupon, setInputCoupon] = useState("");

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    applyCoupon(inputCoupon.trim());
    setInputCoupon("");
  };

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 pt-36 pb-24">
        {/* Header */}
        <div className="border-b border-white/10 pb-8 mb-10">
          <div className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-2">
            <ShoppingBag className="w-4 h-4" />
            <span>Order Review // Shopping Bag</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase font-display tracking-tight text-white">
            YOUR SHOPPING BAG {cart.length > 0 && <span className="text-[#c5a46d]">({cart.length})</span>}
          </h1>
        </div>

        {cart.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-16 bg-neutral-950 border border-white/10 text-center max-w-lg mx-auto space-y-6 my-12"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#c5a46d]">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase font-display text-white">
                Your Bag is Currently Empty
              </h3>
              <p className="text-xs text-neutral-400 font-mono mt-2 leading-relaxed">
                Explore the Autumn-Winter runway collection to discover serialized garments engineered for longevity.
              </p>
            </div>
            <Link
              href="/collection"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-widest uppercase font-mono transition-all"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Cart Items List */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {cart.map((item) => (
                <motion.div
                  key={`${item.product.id}-${item.selectedSize}-${item.selectedColor.hex}`}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-[#0a0a0a] border border-white/10 gap-5"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Link href={`/product/${item.product.id}`} className="shrink-0">
                      <img
                        src={item.product.images[0] || item.product.thumbnail}
                        alt={item.product.name}
                        className="w-20 h-24 sm:w-24 sm:h-28 object-cover bg-neutral-950 border border-white/10"
                      />
                    </Link>
                    <div className="space-y-1 min-w-0">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block">
                        {item.product.category}
                      </span>
                      <Link
                        href={`/product/${item.product.id}`}
                        className="text-sm font-bold uppercase text-white hover:text-[#c5a46d] transition-colors block truncate"
                      >
                        {item.product.name}
                      </Link>
                      <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
                        <span>Size: <strong className="text-white">{item.selectedSize}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: item.selectedColor.hex }}
                          />
                          {item.selectedColor.name}
                        </span>
                      </div>
                      <div className="text-sm font-mono font-bold text-[#c5a46d] pt-1">
                        {formatPrice(item.product.price)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-white/20 bg-neutral-950">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.selectedColor.hex, item.selectedSize, -1)}
                        className="p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-mono font-bold text-white min-w-[28px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.selectedColor.hex, item.selectedSize, 1)}
                        className="p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Total & Remove */}
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-white">
                        {formatPrice(item.product.price * item.quantity)}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id, item.selectedColor.hex, item.selectedSize)}
                        className="text-[10px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 mt-1 transition-colors cursor-pointer ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              <div className="pt-4">
                <Link
                  href="/collection"
                  className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors uppercase tracking-wider"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Continue Browsing Runway</span>
                </Link>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="p-6 sm:p-8 bg-[#0a0a0a] border border-white/15 space-y-6 sticky top-32">
                <h3 className="text-lg font-bold uppercase font-display text-white border-b border-white/10 pb-4">
                  Order Summary
                </h3>

                {/* Coupon Box */}
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputCoupon}
                      onChange={(e) => setInputCoupon(e.target.value.toUpperCase())}
                      placeholder="NOIR10 or VIP20"
                      className="flex-1 bg-neutral-950 border border-white/20 px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-[#c5a46d]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-white/10 hover:bg-[#c5a46d] hover:text-black text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {couponCode && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-3 py-1.5">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        Code <strong className="uppercase">{couponCode}</strong> applied
                      </span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                </form>

                {/* Totals Breakdown */}
                <div className="space-y-3 text-xs font-mono border-t border-white/10 pt-4 text-neutral-300">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-white">{formatPrice(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Pan-India Express Delivery</span>
                    <span>COMPLIMENTARY</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#c5a46d]">
                      <span>Promotional Discount</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-400 text-[10px]">
                    <span>Goods & Services Tax (GST 12%)</span>
                    <span>INCLUDED</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white border-t border-white/15 pt-3">
                    <span>Estimated Total</span>
                    <span className="text-[#c5a46d]">{formatPrice(cartTotal)}</span>
                  </div>
                </div>

                {/* Checkout Trigger */}
                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-4 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-widest uppercase font-mono flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(197,164,109,0.3)]"
                >
                  <span>Proceed to Secure Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Trust Badges */}
                <div className="space-y-2 text-[10px] font-mono text-neutral-500 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#c5a46d]" />
                    <span>Complimentary Pan-India Returns within 7 Days</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#c5a46d]" />
                    <span>Cash on Delivery (COD) & UPI / Cards Accepted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
