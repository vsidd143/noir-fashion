"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag } from "lucide-react";

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
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
    if (!inputCoupon) return;
    applyCoupon(inputCoupon);
    setInputCoupon("");
  };

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-[200] overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Slide-out Drawer */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="w-screen max-w-md bg-[#0a0a0a] border-l border-white/10 flex flex-col justify-between shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-widest text-white uppercase font-display">
                    Shopping Bag
                  </h2>
                  <p className="text-[11px] tracking-wider text-[#a0a0a0] uppercase font-mono mt-0.5">
                    {cart.length} {cart.length === 1 ? "Style Selected" : "Styles Selected"}
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-[#c5a46d] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16">
                    <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-neutral-600 mb-4">
                      <Tag className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold tracking-wider text-white uppercase font-display">
                      Your shopping bag is empty.
                    </h3>
                    <p className="text-xs text-neutral-500 mt-2 max-w-xs">
                      Explore our collection and add premium streetwear to your bag.
                    </p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="mt-6 px-6 py-3 border border-[#c5a46d] text-xs font-bold tracking-[0.2em] text-[#c5a46d] hover:bg-[#c5a46d] hover:text-black transition-all uppercase"
                    >
                      Explore Collection
                    </button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={`${item.product.id}-${item.selectedColor.hex}-${item.selectedSize}`}
                      className="flex gap-4 pb-6 border-b border-white/5 group"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative w-20 h-24 bg-neutral-900 border border-white/10 shrink-0 overflow-hidden">
                        <img
                          src={item.product.thumbnail}
                          alt={item.product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold tracking-wider text-white uppercase line-clamp-1">
                              {item.product.name}
                            </h4>
                            <button
                              onClick={() =>
                                removeFromCart(
                                  item.product.id,
                                  item.selectedColor.hex,
                                  item.selectedSize
                                )
                              }
                              className="text-neutral-500 hover:text-red-400 transition-colors ml-2"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-400">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-white/20"
                                style={{ backgroundColor: item.selectedColor.hex }}
                              />
                              {item.selectedColor.name}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-neutral-300">
                              Size {item.selectedSize}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          {/* Quantity stepper */}
                          <div className="flex items-center border border-white/15 bg-neutral-950">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.selectedColor.hex,
                                  item.selectedSize,
                                  -1
                                )
                              }
                              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-3 text-xs font-mono font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.selectedColor.hex,
                                  item.selectedSize,
                                  1
                                )
                              }
                              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-[#c5a46d]">
                              {formatPrice(item.product.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Summary & Checkout */}
              {cart.length > 0 && (
                <div className="p-6 md:p-8 bg-[#070707] border-t border-white/10 space-y-4">
                  {/* Coupon Input */}
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="TRY 'NOIR10' OR 'VIP20'"
                      value={inputCoupon}
                      onChange={(e) => setInputCoupon(e.target.value)}
                      className="flex-1 bg-black border border-white/15 px-3 py-2 text-xs font-mono uppercase text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 border border-white/20 text-xs font-bold tracking-wider uppercase text-neutral-300 hover:border-[#c5a46d] hover:text-[#c5a46d] transition-all"
                    >
                      Apply
                    </button>
                  </form>

                  {couponCode && (
                    <div className="flex items-center justify-between text-[11px] text-[#c5a46d] bg-[#c5a46d]/10 px-3 py-1.5 border border-[#c5a46d]/30">
                      <span>Voucher Applied: {couponCode}</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  {/* Calculations */}
                  <div className="space-y-1.5 text-xs text-neutral-400 font-mono">
                    <div className="flex justify-between">
                      <span>Subtotal (Incl. GST)</span>
                      <span className="text-white">{formatPrice(cartSubtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[#c5a46d]">
                        <span>VIP Privilege</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Pan-India Courier (Blue Dart / Delhivery)</span>
                      <span className="text-emerald-400 uppercase font-bold text-[10px]">Complimentary</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between text-base font-bold text-white font-display">
                      <div>
                        <span className="tracking-widest uppercase block">Total</span>
                        <span className="text-[9px] text-neutral-500 font-mono font-normal">All Indian Taxes & GST Included</span>
                      </div>
                      <span className="text-[#c5a46d] font-mono text-xl">{formatPrice(cartTotal)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleProceedToCheckout}
                    className="w-full py-4 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-[0.25em] uppercase transition-all flex items-center justify-center gap-3 group shadow-lg shadow-[#c5a46d]/10 cursor-pointer"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </button>

                  {/* Continue Shopping Button */}
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="w-full py-2 text-center text-xs font-mono tracking-widest text-neutral-400 hover:text-white uppercase transition-colors cursor-pointer"
                  >
                    ← Continue Shopping
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest font-mono pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Secure Checkout · Pan-India Express Delivery</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
