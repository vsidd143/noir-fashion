"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { NAV_LINKS } from "./Navbar";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
  currentPath: string;
}

export default function MobileDrawer({ isOpen, onClose, currentPath }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[150] lg:hidden bg-[#F4F0E8]/98 backdrop-blur-xl flex flex-col justify-between p-6 sm:p-10"
        >
          {/* Header: NOIR wordmark and Close button */}
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-5">
            <Link href="/" onClick={onClose} className="block">
              <span className="text-2xl font-headline font-normal tracking-[0.2em] text-[#161616]">
                NOIR
              </span>
            </Link>
            <button
              onClick={onClose}
              className="p-2 rounded-full border border-[#E5E0D8] text-[#161616] hover:border-[#1A3B8B] hover:text-[#1A3B8B] transition-colors cursor-pointer"
              aria-label="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Clean Navigation Links */}
          <div className="flex flex-col space-y-3 my-auto py-8">
            {NAV_LINKS.map((item, index) => {
              const isActive =
                item.href === "/"
                  ? currentPath === "/"
                  : currentPath === item.href || currentPath.startsWith(`${item.href}/`);

              return (
                <motion.div
                  key={item.name}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.04 + 0.04 }}
                >
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between py-3.5 px-4 border transition-all ${
                      isActive
                        ? "border-[#1A3B8B] bg-[#1A3B8B]/5 text-[#1A3B8B] font-medium"
                        : "border-[#E5E0D8] bg-white/60 hover:bg-white text-[#161616]"
                    }`}
                  >
                    <span className="text-lg font-headline">
                      {item.name}
                    </span>
                    <ArrowRight
                      className={`w-4 h-4 transition-transform ${
                        isActive ? "text-[#1A3B8B]" : "text-[#6E6D68]"
                      }`}
                    />
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions & Bottom Info */}
          <div className="pt-6 border-t border-[#E5E0D8] space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm font-body">
              <Link
                href="/user"
                onClick={onClose}
                className="py-2.5 px-4 border border-[#E5E0D8] bg-white/70 hover:border-[#1A3B8B] text-center text-[#161616] hover:text-[#1A3B8B] transition-colors rounded-none"
              >
                My Account
              </Link>
              <Link
                href="/wishlist"
                onClick={onClose}
                className="py-2.5 px-4 border border-[#E5E0D8] bg-white/70 hover:border-[#1A3B8B] text-center text-[#161616] hover:text-[#1A3B8B] transition-colors rounded-none"
              >
                Wishlist
              </Link>
            </div>
            <div className="text-center">
              <span className="text-xs font-body text-[#6E6D68]">
                Delivery across India · Cash on delivery
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
