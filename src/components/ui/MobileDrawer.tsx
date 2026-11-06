"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { InstagramIcon, TwitterIcon } from "@/components/ui/SocialIcons";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
  currentPath: string;
}

const NAV_ITEMS = [
  { label: "Home", href: "/", tag: "01", subtitle: "3D Kinetic Monolith" },
  { label: "Collection", href: "/collection", tag: "02", subtitle: "Autumn-Winter Runway" },
  { label: "Lookbook", href: "/lookbook", tag: "03", subtitle: "Chapters 01 - 04" },
  { label: "Atelier", href: "/atelier", tag: "04", subtitle: "Craftsmanship & Pillars" },
  { label: "Campaign", href: "/campaign", tag: "05", subtitle: "Monochrome Metropolis" },
];

export default function MobileDrawer({ isOpen, onClose, currentPath }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] lg:hidden bg-[#050505]/98 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <Link href="/" onClick={onClose} className="block">
              <span className="text-2xl font-black tracking-[0.3em] font-display text-white">
                NOIR
              </span>
              <span className="block text-[9px] tracking-[0.3em] text-[#c5a46d] uppercase font-mono mt-0.5">
                MUMBAI // DELHI // BENGALURU
              </span>
            </Link>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full border border-white/15 text-white hover:border-[#c5a46d] hover:text-[#c5a46d] transition-colors cursor-pointer"
              aria-label="Close Mobile Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links */}
          <div className="flex flex-col space-y-3 my-auto py-6">
            {NAV_ITEMS.map((item, index) => {
              const isActive =
                item.href === "/"
                  ? currentPath === "/"
                  : currentPath === item.href || currentPath.startsWith(`${item.href}/`);

              return (
                <motion.div
                  key={item.href}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 + 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between text-left group py-3 px-3.5 border transition-all block ${
                      isActive
                        ? "border-[#c5a46d]/60 bg-[#c5a46d]/10 text-white"
                        : "border-white/5 hover:border-white/20 hover:bg-neutral-900/40 text-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`font-mono text-xs font-bold ${
                          isActive ? "text-[#c5a46d]" : "text-neutral-500 group-hover:text-[#c5a46d]"
                        }`}
                      >
                        {item.tag}
                      </span>
                      <div>
                        <span className="text-xl sm:text-2xl font-black tracking-wider uppercase font-display block">
                          {item.label}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="px-2 py-0.5 text-[8px] font-mono font-bold tracking-widest uppercase bg-[#c5a46d] text-black">
                          ACTIVE
                        </span>
                      )}
                      <ArrowRight
                        className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                          isActive ? "text-[#c5a46d]" : "text-neutral-600 group-hover:text-white"
                        }`}
                      />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Footer of Drawer */}
          <div className="border-t border-white/10 pt-6 flex flex-col gap-4 text-xs text-neutral-400">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-[#c5a46d]">PAN-INDIA EXPRESS DELIVERY</span>
              <div className="flex gap-4">
                <a href="#instagram" className="hover:text-[#c5a46d]"><InstagramIcon className="w-4 h-4" /></a>
                <a href="#twitter" className="hover:text-[#c5a46d]"><TwitterIcon className="w-4 h-4" /></a>
              </div>
            </div>
            <p className="text-[9px] tracking-widest uppercase text-neutral-600 font-mono">
              © 2026 NOIR ATELIER. BEYOND FASHION. BEYOND ORDINARY.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
