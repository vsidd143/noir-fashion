"use client";

import React, { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { usePageTransition } from "@/context/PageTransitionContext";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/sections/Footer";
import CustomCursor from "@/components/ui/CustomCursor";
import AudioAmbiance from "@/components/ui/AudioAmbiance";
import ToastContainer from "@/components/ui/ToastContainer";
import AuthModal from "@/components/ui/AuthModal";
import CartDrawer from "@/components/ui/CartDrawer";
import WishlistDrawer from "@/components/ui/WishlistDrawer";
import QuickViewModal from "@/components/ui/QuickViewModal";
import CheckoutModal from "@/components/ui/CheckoutModal";

interface PageShellProps {
  children: React.ReactNode;
}

export default function PageShell({ children }: PageShellProps) {
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
      {/* Global Interface Systems */}
      <CustomCursor />
      <AudioAmbiance />
      <ToastContainer />
      <AuthModal />

      {/* Main Responsive Application Shell */}
      <div className="relative min-h-screen bg-[#050505] text-[#FFFFFF] flex flex-col justify-between overflow-x-hidden">
        {/* Navigation Bar with Active Route Tracking & Page Transitions */}
        <Suspense fallback={<div className="h-24 w-full bg-[#050505]" />}>
          <Navbar />
        </Suspense>

        {/* Animated Page Content with Dual-Directional Exit & Entrance Choreography */}
        <motion.main
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.995 }}
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : transitionStage === "covering"
              ? { opacity: 0.3, y: -6, scale: 0.99 }
              : { opacity: 1, y: 0, scale: 1 }
          }
          transition={{
            duration: prefersReducedMotion ? 0.15 : 0.35,
            ease: [0.16, 1, 0.3, 1], // Fluid high-end cubic easing
          }}
          className="flex-1 w-full"
        >
          {children}
        </motion.main>

        {/* Global Luxury Footer */}
        <Footer />

        {/* E-Commerce Drawers & Modals */}
        <CartDrawer />
        <WishlistDrawer />
        <QuickViewModal />
        <CheckoutModal />
      </div>
    </>
  );
}
