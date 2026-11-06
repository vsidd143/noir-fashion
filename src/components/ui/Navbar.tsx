"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useCursor } from "@/context/CursorContext";
import { useAuth } from "@/context/AuthContext";
import { usePageTransition } from "@/context/PageTransitionContext";
import {
  ShoppingBag,
  Heart,
  Volume2,
  VolumeX,
  Menu,
  X,
  User as UserIcon,
  ShieldCheck,
  Package,
  LogOut,
  ChevronDown,
} from "lucide-react";
import MobileDrawer from "./MobileDrawer";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Collection", href: "/collection" },
  { name: "Lookbook", href: "/lookbook" },
  { name: "Atelier", href: "/atelier" },
  { name: "Campaign", href: "/campaign" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { navigateTo } = usePageTransition();
  const { cartCount, setIsCartOpen, wishlist, setIsWishlistOpen, isAudioPlaying, toggleAudio } = useCart();
  const { user, profile, isAdmin, openAuthModal, signOut } = useAuth();
  const { setCursor, resetCursor } = useCursor();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    navigateTo(href);
  };

  return (
    <>
      {/* Pan-India Express Banner */}
      <div className="fixed top-0 left-0 right-0 z-[110] bg-black/95 border-b border-[#c5a46d]/20 py-1.5 px-3 sm:px-4 text-center text-[9px] sm:text-[10px] font-mono tracking-[0.15em] sm:tracking-[0.25em] text-[#c5a46d] uppercase flex items-center justify-center gap-2 sm:gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
        <span className="flex items-center gap-1.5 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate">PAN-INDIA COMPLIMENTARY EXPRESS DELIVERY</span>
        </span>
        <span className="hidden sm:inline text-neutral-600">•</span>
        <span className="hidden sm:inline text-neutral-300">CASH ON DELIVERY (COD)</span>
        <span className="hidden md:inline text-neutral-600">•</span>
        <span className="hidden md:inline text-neutral-400">ALL PRICES INCL. GST</span>
      </div>

      <header
        className={`fixed top-[28px] left-0 right-0 z-[100] transition-all duration-500 ${
          isScrolled
            ? "bg-[#050505]/95 backdrop-blur-xl border-b border-white/[0.08] py-4 shadow-2xl"
            : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Brand Logo with Native Next.js Link */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              onMouseEnter={() => setCursor("hover")}
              onMouseLeave={resetCursor}
              className="group flex flex-col items-start text-left focus:outline-none"
            >
              <span className="text-2xl md:text-3xl font-black tracking-[0.3em] font-display text-white group-hover:text-[#c5a46d] transition-colors">
                NOIR
              </span>
              <span className="text-[9px] tracking-[0.3em] text-[#a0a0a0] uppercase font-mono">
                MUMBAI // DELHI // BENGALURU
              </span>
            </Link>

            {/* Desktop Navigation Links with Next.js Link & Animated Active Indicator */}
            <nav className="hidden lg:flex items-center space-x-8 ml-6">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onMouseEnter={() => setCursor("hover")}
                    onMouseLeave={resetCursor}
                    className={`relative text-xs uppercase tracking-[0.25em] font-mono py-1.5 transition-all duration-200 group flex items-center ${
                      isActive
                        ? "text-white font-bold"
                        : "text-[#a0a0a0] hover:text-white hover:-translate-y-0.5"
                    }`}
                  >
                    <span>{link.name}</span>

                    {/* Active Sliding Gold Pill / Line */}
                    {isActive ? (
                      <motion.span
                        layoutId="activeNavbarIndicator"
                        className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#c5a46d] shadow-[0_0_12px_rgba(197,164,109,0.9)]"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    ) : (
                      /* Hover Preview Underline */
                      <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#c5a46d]/40 group-hover:w-full transition-all duration-300" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3 md:space-x-5">
            {/* Audio Ambiance Toggle */}
            <button
              onClick={toggleAudio}
              onMouseEnter={() => setCursor("hover")}
              onMouseLeave={resetCursor}
              className="flex items-center gap-2 p-2 rounded-full border border-white/10 hover:border-[#c5a46d]/60 text-[#a0a0a0] hover:text-[#c5a46d] transition-all text-xs cursor-pointer"
              title={isAudioPlaying ? "Mute Atmospheric Audio" : "Play Atmospheric Audio"}
            >
              {isAudioPlaying ? (
                <>
                  <Volume2 className="w-4 h-4 text-[#c5a46d] animate-pulse" />
                  <span className="hidden xl:inline text-[10px] tracking-widest uppercase font-mono text-[#c5a46d]">
                    AUDIO ON
                  </span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="hidden xl:inline text-[10px] tracking-widest uppercase font-mono">
                    SOUND
                  </span>
                </>
              )}
            </button>

            {/* User Account Button / Dropdown */}
            <div className="relative" ref={userMenuRef}>
              {user ? (
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  onMouseEnter={() => setCursor("hover")}
                  onMouseLeave={resetCursor}
                  className={`flex items-center gap-2 py-1.5 px-3 rounded-full border transition-all text-xs font-mono uppercase cursor-pointer ${
                    isAdmin
                      ? "border-[#c5a46d] bg-[#c5a46d]/10 text-white"
                      : "border-white/15 bg-neutral-900 text-neutral-300 hover:border-white"
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#c5a46d]" />
                  <span className="hidden sm:inline font-bold">
                    {profile?.full_name?.split(" ")[0] || "Account"}
                  </span>
                  {isAdmin && (
                    <span className="hidden md:inline px-1.5 py-0.2 text-[8px] font-bold bg-[#c5a46d] text-black">
                      ADMIN
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-neutral-400" />
                </button>
              ) : (
                <button
                  onClick={() => openAuthModal("login")}
                  onMouseEnter={() => setCursor("hover")}
                  onMouseLeave={resetCursor}
                  className="flex items-center gap-2 py-1.5 px-3.5 rounded-full border border-white/15 hover:border-[#c5a46d] bg-neutral-950 text-xs font-mono uppercase tracking-wider text-neutral-300 hover:text-white transition-all cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

              {/* User Dropdown Menu with Smooth Animation */}
              <AnimatePresence>
                {isUserMenuOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-64 bg-[#0a0a0a] border border-white/15 shadow-2xl p-3 z-50 text-xs font-mono space-y-1"
                  >
                    <div className="p-3 bg-neutral-950 border-b border-white/10 mb-2">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
                        Signed in as
                      </span>
                      <span className="text-white font-bold block truncate mt-0.5">
                        {user.email}
                      </span>
                      {isAdmin && (
                        <span className="inline-block mt-1 text-[9px] text-[#c5a46d] font-bold tracking-widest uppercase">
                          Master Administrator
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 p-2.5 bg-[#c5a46d]/15 border border-[#c5a46d]/40 text-[#c5a46d] hover:bg-[#c5a46d] hover:text-black transition-all font-bold uppercase tracking-wider text-left block"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}

                    <Link
                      href="/user"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 p-2 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors uppercase tracking-wider text-left block"
                    >
                      <Package className="w-4 h-4 text-neutral-400" />
                      <span>My Profile & Orders</span>
                    </Link>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsWishlistOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 p-2 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors uppercase tracking-wider text-left cursor-pointer"
                    >
                      <Heart className="w-4 h-4 text-neutral-400" />
                      <span>Saved Wishlist ({wishlist.length})</span>
                    </button>

                    <div className="border-t border-white/10 pt-2 mt-2">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2.5 p-2 text-red-400 hover:bg-red-950/30 transition-colors uppercase tracking-wider text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Wishlist Button */}
            <button
              onClick={() => setIsWishlistOpen(true)}
              onMouseEnter={() => setCursor("hover")}
              onMouseLeave={resetCursor}
              className="relative p-2 rounded-full border border-white/10 hover:border-[#c5a46d] text-white transition-colors cursor-pointer"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center font-mono">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              onMouseEnter={() => setCursor("hover")}
              onMouseLeave={resetCursor}
              className="relative p-2 rounded-full border border-white/10 hover:border-[#c5a46d] text-white transition-colors flex items-center gap-2 cursor-pointer"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 text-[#c5a46d]" />
              {cartCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#c5a46d] text-black text-[9px] font-bold flex items-center justify-center font-mono">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onMouseEnter={() => setCursor("hover")}
              onMouseLeave={resetCursor}
              className="lg:hidden p-2 rounded-full border border-white/10 text-white hover:border-white transition-colors cursor-pointer"
              aria-label="Toggle Mobile Navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleNavClick}
        currentPath={pathname}
      />
    </>
  );
}
