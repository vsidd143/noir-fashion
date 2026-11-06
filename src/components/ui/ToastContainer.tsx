"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, Heart, Tag, Info, X } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useCart();

  return (
    <div className="fixed bottom-6 right-6 z-[9990] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-none bg-[#0d0d0d]/95 backdrop-blur-md border border-[#c5a46d]/40 shadow-2xl text-white"
          >
            <div className="flex items-center gap-3">
              {toast.type === "cart" && (
                <div className="p-2 bg-[#c5a46d]/15 text-[#c5a46d]">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              )}
              {toast.type === "wishlist" && (
                <div className="p-2 bg-rose-500/15 text-rose-400">
                  <Heart className="w-4 h-4 fill-current" />
                </div>
              )}
              {toast.type === "coupon" && (
                <div className="p-2 bg-amber-500/15 text-amber-300">
                  <Tag className="w-4 h-4" />
                </div>
              )}
              {toast.type === "info" && (
                <div className="p-2 bg-neutral-800 text-neutral-300">
                  <Info className="w-4 h-4" />
                </div>
              )}
              <p className="text-xs font-medium tracking-wide text-neutral-200">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-neutral-500 hover:text-white transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
