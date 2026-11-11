"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { usePageTransition } from "@/context/PageTransitionContext";
import {
  ShoppingBag,
  Heart,
  Search,
  User as UserIcon,
  Menu,
  X,
} from "lucide-react";
import MobileDrawer from "./MobileDrawer";
import SearchModal from "./SearchModal";

export const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Men", href: "/men" },
  { name: "Women", href: "/women" },
  { name: "Kids", href: "/kids" },
  { name: "New Arrivals", href: "/new-arrivals" },
];

interface NavbarProps {
  theme?: "light" | "dark";
}

export default function Navbar({ theme = "light" }: NavbarProps) {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const isDark = theme === "dark";
  const { navigateTo } = usePageTransition();
  const { cartCount, setIsCartOpen, wishlist, setIsWishlistOpen } = useCart();
  const { user, openAuthModal } = useAuth();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Close search when changing routes
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsSearchOpen(false);
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAccountClick = () => {
    if (user) {
      navigateTo("/user");
    } else {
      openAuthModal("login");
    }
  };

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    navigateTo(href);
  };

  const isTransparent = isHomepage && !isScrolled;

  return (
    <>
      {/* Top Reassurance Bar — non-homepage only */}
      {!isHomepage && (
        <div className="fixed top-0 left-0 right-0 z-[110] bg-[#161616] text-[#F4F0E8] border-b border-[#E5E0D8]/15 py-1.5 px-4 text-center text-[11px] sm:text-xs font-body flex items-center justify-center gap-2 sm:gap-3">
          <span>Delivery across India</span>
          <span className="text-[#A09D96]">•</span>
          <span>Cash on delivery</span>
        </div>
      )}

      {/* Main Navigation Bar */}
      <header
        className={`fixed left-0 right-0 z-[100] transition-all duration-300 ${
          isHomepage ? "top-0" : "top-[29px]"
        } ${
          isTransparent
            ? "bg-transparent py-5 sm:py-6 border-b border-transparent"
            : isDark
            ? "bg-[#050505]/95 backdrop-blur-md border-b border-white/10 py-3.5 sm:py-4 shadow-sm"
            : "bg-[#F4F0E8]/95 backdrop-blur-md border-b border-[#E5E0D8] py-3.5 sm:py-4 shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 flex items-center justify-between">
          {/* Brand Wordmark (Fraunces Display) */}
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="group flex items-center focus:outline-none"
            aria-label="NOIR Homepage"
          >
            <span
              className={`text-2xl sm:text-3xl font-headline font-normal tracking-[0.2em] transition-colors ${
                isTransparent || isDark
                  ? "text-white group-hover:text-white/80"
                  : "text-[#161616] group-hover:text-[#1A3B8B]"
              }`}
            >
              NOIR
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative text-[14px] font-body tracking-normal py-1.5 transition-colors group flex items-center ${
                    isTransparent || isDark
                      ? isActive
                        ? "text-white font-medium"
                        : "text-white/70 hover:text-white"
                      : isActive
                      ? "text-[#161616] font-medium"
                      : "text-[#161616]/70 hover:text-[#161616]"
                  }`}
                >
                  <span>{link.name}</span>

                  {/* Active Indicator Line */}
                  {isActive ? (
                    <motion.span
                      layoutId="activeNavbarIndicator"
                      className={`absolute -bottom-1 left-0 right-0 h-[2px] rounded-full ${
                        isTransparent || isDark ? "bg-white" : "bg-[#1A3B8B]"
                      }`}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : (
                    <span
                      className={`absolute -bottom-1 left-0 w-0 h-[1.5px] rounded-full group-hover:w-full transition-all duration-200 ${
                        isTransparent || isDark ? "bg-white/40" : "bg-[#1A3B8B]/40"
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action Icons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isTransparent || isDark
                  ? isSearchOpen
                    ? "border-white bg-white/10 text-white"
                    : "border-white/20 bg-white/5 hover:border-white/60 text-white"
                  : isSearchOpen
                  ? "border-[#1A3B8B] bg-[#1A3B8B]/10 text-[#1A3B8B]"
                  : "border-[#E5E0D8] bg-white/50 hover:border-[#1A3B8B] text-[#161616] hover:text-[#1A3B8B]"
              }`}
              aria-label="Search Collection"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Wishlist */}
            <button
              onClick={() => setIsWishlistOpen(true)}
              className={`relative p-2 rounded-full border transition-all cursor-pointer ${
                isTransparent || isDark
                  ? "border-white/20 bg-white/5 hover:border-white/60 text-white"
                  : "border-[#E5E0D8] bg-white/50 hover:border-[#1A3B8B] text-[#161616] hover:text-[#1A3B8B]"
              }`}
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#1A3B8B] ring-2 ring-white" />
              )}
            </button>

            {/* Shopping Bag */}
            <button
              onClick={() => setIsCartOpen(true)}
              className={`relative p-2 rounded-full border transition-all cursor-pointer ${
                isTransparent || isDark
                  ? "border-white/20 bg-white/5 hover:border-white/60 text-white"
                  : "border-[#E5E0D8] bg-white/50 hover:border-[#1A3B8B] text-[#161616] hover:text-[#1A3B8B]"
              }`}
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#1A3B8B] text-white text-[10px] font-mono font-medium flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Account */}
            <button
              onClick={handleAccountClick}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isTransparent || isDark
                  ? "border-white/20 bg-white/5 hover:border-white/60 text-white"
                  : "border-[#E5E0D8] bg-white/50 hover:border-[#1A3B8B] text-[#161616] hover:text-[#1A3B8B]"
              }`}
              aria-label="Account"
            >
              <UserIcon className="w-4 h-4" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden p-2 rounded-full border transition-colors cursor-pointer ${
                isTransparent || isDark
                  ? "border-white/20 bg-white/5 text-white hover:border-white/60"
                  : "border-[#E5E0D8] bg-white/50 text-[#161616] hover:border-[#1A3B8B] hover:text-[#1A3B8B]"
              }`}
              aria-label="Toggle Mobile Menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

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
