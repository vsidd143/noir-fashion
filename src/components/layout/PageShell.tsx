"use client";

import React, { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { usePageTransition } from "@/context/PageTransitionContext";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/sections/Footer";
import ToastContainer from "@/components/ui/ToastContainer";
import AuthModal from "@/components/ui/AuthModal";
import CartDrawer from "@/components/ui/CartDrawer";
import WishlistDrawer from "@/components/ui/WishlistDrawer";
import CheckoutModal from "@/components/ui/CheckoutModal";

interface PageShellProps {
  children: React.ReactNode;
  hideFooter?: boolean;
  hideFooterNewsletter?: boolean;
  theme?: "light" | "dark";
}

export default function PageShell({
  children,
  hideFooter,
  hideFooterNewsletter,
  theme = "light",
}: PageShellProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { transitionStage } = usePageTransition();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) {
        queueMicrotask(() => setPrefersReducedMotion(true));
      }

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  return (
    <>
      <ToastContainer />
      <AuthModal />

      {/* Main Responsive Application Shell */}
      <div
        className={`relative min-h-screen flex flex-col justify-between overflow-x-hidden ${
          theme === "dark"
            ? "bg-[#050505] text-white selection:bg-white/20 selection:text-white"
            : "bg-[#F4F0E8] text-[#161616] selection:bg-[#1A3B8B]/15 selection:text-[#161616]"
        }`}
      >
        {/* Navigation Bar with Active Route Tracking & Page Transitions */}
        <Suspense fallback={<div className="h-20 w-full bg-transparent" />}>
          <Navbar theme={theme} />
        </Suspense>

        {/* Animated Page Content */}
        <motion.main
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.998 }}
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : transitionStage === "covering"
              ? { opacity: 0.35, y: -4, scale: 0.995 }
              : { opacity: 1, y: 0, scale: 1 }
          }
          transition={{
            duration: prefersReducedMotion ? 0.15 : 0.3,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="flex-1 w-full"
        >
          {children}
        </motion.main>

        {/* Global Luxury Footer */}
        {!hideFooter && <Footer hideNewsletter={hideFooterNewsletter} theme={theme} />}

        {/* E-Commerce Drawers & Modals */}
        <CartDrawer />
        <WishlistDrawer />
        <CheckoutModal />
      </div>
    </>
  );
}
