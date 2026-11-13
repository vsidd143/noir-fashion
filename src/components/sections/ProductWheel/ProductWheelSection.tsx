"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Product } from "@/types/fashion";
import { getLiveProducts } from "@/lib/products-service";
import ProductSnapStrip from "./ProductSnapStrip";
import ProductSimpleGrid from "./ProductSimpleGrid";

// Lazy-load the GSAP ScrollTrigger orbital wheel code near the viewport
const DynamicOrbitalWheel = dynamic(() => import("./OrbitalImageWheel"), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: "100dvh" }}
      className="w-full bg-[#F4F0E8] border-t border-[#E5E0D8] flex items-center justify-center font-mono text-xs uppercase tracking-widest text-[#6E6D68]"
    >
      Loading Product Showcase...
    </div>
  ),
});

export default function ProductWheelSection() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [scrollTriggerFailed, setScrollTriggerFailed] = useState(false);
  const [isInViewportOrNear, setIsInViewportOrNear] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch real NOIR products from Supabase
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const live = await getLiveProducts();
        if (isMounted) {
          setAllProducts(live);
        }
      } catch (err) {
        console.warn("Could not load products for wheel section:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Motion preference detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      queueMicrotask(() => setPrefersReducedMotion(true));
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  // IntersectionObserver to lazy-load GSAP code near viewport
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) {
      queueMicrotask(() => setIsInViewportOrNear(true));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInViewportOrNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" } // trigger 400px before scrolling into section
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Filter ONLY new arrival products, newest first (up to 10)
  const newArrivals = useMemo(() => {
    const filtered = allProducts.filter(
      (p) => p.isNew || p.tags?.some((t) => t.toLowerCase().includes("new")) || p.department === "new-arrivals"
    );

    // If new arrival products exist, use them; otherwise gracefully display available products
    const source = filtered.length > 0 ? filtered : allProducts;
    return source.slice(0, 10);
  }, [allProducts]);

  const rawCount = newArrivals.length;

  return (
    <div ref={containerRef} className="relative w-full">
      {isLoading ? (
        // Reserved skeleton height avoiding layout shift (CLS = 0)
        <div
          style={{ minHeight: "100dvh" }}
          className="w-full bg-[#F4F0E8] border-t border-[#E5E0D8] p-8 sm:p-12 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-56 h-8 bg-[#E5E0D8] animate-pulse" />
          </div>
          <div className="flex gap-4 overflow-hidden pt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-60 h-75 bg-[#E5E0D8] shrink-0 animate-pulse rounded-[2px]"
              />
            ))}
          </div>
        </div>
      ) : rawCount < 3 ? (
        // If fewer than 3 new arrivals exist: render simple non-cropped grid
        <ProductSimpleGrid products={newArrivals} />
      ) : prefersReducedMotion || scrollTriggerFailed ? (
        // Fallback for prefers-reduced-motion or ScrollTrigger failure
        <ProductSnapStrip products={newArrivals} />
      ) : (
        // Wheel on EVERY device (Desktop, Tablet, Mobile) with slot-repeating for < 8 items
        <DynamicOrbitalWheel products={newArrivals} />
      )}
    </div>
  );
}
