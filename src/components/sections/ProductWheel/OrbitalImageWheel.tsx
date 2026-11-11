"use client";

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Product } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import { WHEEL_SECTION_COPY, getResponsiveWheelParams, ResponsiveWheelParams } from "./constants";
import { ArrowUpRight } from "lucide-react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface OrbitalImageWheelProps {
  products: Product[];
}

interface WheelSlot {
  slotId: string;
  product: Product;
  originalIndex: number;
  isRepeated: boolean;
}

export default function OrbitalImageWheel({ products }: OrbitalImageWheelProps) {
  const router = useRouter();

  // Root wrapper and section refs
  const rootRef = useRef<HTMLDivElement>(null);
  const pinSectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  // Caption element refs for direct DOM updates (0 React re-renders during scroll)
  const captionLinkRef = useRef<HTMLButtonElement>(null);
  const captionTitleRef = useRef<HTMLSpanElement>(null);
  const captionPriceRef = useRef<HTMLSpanElement>(null);

  // Active product tracker for caption updates
  const lastActiveIdxRef = useRef<number>(0);
  const [activeProduct, setActiveProduct] = useState<Product>(() => products[0]);

  const [viewportDims, setViewportDims] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1440,
    height: typeof window !== "undefined" ? window.innerHeight : 900,
  }));

  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Register GSAP ScrollTrigger plugin safely on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }
  }, []);

  // Update viewport dimensions on mount & resize
  const handleResize = useCallback(() => {
    if (typeof window !== "undefined") {
      setViewportDims({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  // Generate slots: repeat real products with prefix/suffix so both left and right arcs are always populated
  const { slots, startIndex } = useMemo(() => {
    const K = products.length;
    if (K === 0) return { slots: [], startIndex: 0 };

    const prefixCount = 2; // Cards populated to the left of slot 0
    const suffixCount = Math.max(3, 8 - K); // Cards populated to the right after last slot

    const generated: WheelSlot[] = [];

    // Prefix repeated slots (left arc fill)
    for (let i = 0; i < prefixCount; i++) {
      const prodIdx = (K - prefixCount + i + K * 10) % K;
      generated.push({
        slotId: `prefix-${i}-${products[prodIdx].id}`,
        product: products[prodIdx],
        originalIndex: prodIdx,
        isRepeated: true,
      });
    }

    // Main original slots (accessible, in tab order)
    for (let i = 0; i < K; i++) {
      generated.push({
        slotId: `orig-${products[i].id}-${i}`,
        product: products[i],
        originalIndex: i,
        isRepeated: false,
      });
    }

    // Suffix repeated slots (right arc fill)
    for (let i = 0; i < suffixCount; i++) {
      const prodIdx = i % K;
      generated.push({
        slotId: `suffix-${i}-${products[prodIdx].id}`,
        product: products[prodIdx],
        originalIndex: prodIdx,
        isRepeated: true,
      });
    }

    return { slots: generated, startIndex: prefixCount };
  }, [products]);

  // Responsive geometry parameters for current viewport
  const params: ResponsiveWheelParams = useMemo(() => {
    return getResponsiveWheelParams(viewportDims.width, viewportDims.height);
  }, [viewportDims.width, viewportDims.height]);

  const K = products.length;
  const N = slots.length;

  // Function to apply GPU-accelerated card transforms directly in the DOM
  // ZERO React re-renders during scroll -> 120 FPS buttery smooth & ZERO removeChild errors!
  const updateWheelTransforms = useCallback(
    (progress: number) => {
      if (!stageRef.current || N === 0 || K === 0) return;

      const stageWidth = stageRef.current.clientWidth || (viewportDims.width < 640 ? viewportDims.width - 32 : 1200);
      const cx = stageWidth / 2;
      const cy = params.focusY + params.radius + params.itemHeight / 2;

      // Progress target advances smoothly from startIndex to startIndex + K - 1
      const progressTarget = startIndex + progress * (K - 1);
      const activeProductIdx = Math.min(K - 1, Math.max(0, Math.round(progress * (K - 1))));
      const activeSlotIdx = startIndex + activeProductIdx;

      for (let i = 0; i < N; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        const theta = (i - progressTarget) * params.spacingAngle;
        const absTheta = Math.abs(theta);

        // Normalized distance from center [0 = center apex, 1 = out of focus]
        const focusLimit = Math.PI * 0.36;
        const u = Math.min(1, Math.max(0, absTheta / focusLimit));

        // Position along the circular orbit
        const x = cx + params.radius * Math.sin(theta) - params.itemWidth / 2;
        const y = cy - params.radius * Math.cos(theta) - params.itemHeight / 2;

        // Subtle architectural tilt: damped for calm luxury movement
        const deg = theta * (180 / Math.PI) * 0.35;

        // Scale & focus metrics
        const scale = 1.08 - 0.16 * u;
        const blurPx = Math.min(2, u * 2.5);
        const opacity = Math.max(0.40, 1.0 - u * 0.55);
        const isMiddle = i === activeSlotIdx;

        // Direct hardware-accelerated transform (Zero layout reflows)
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${deg.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        el.style.opacity = `${opacity.toFixed(2)}`;
        el.style.filter = blurPx > 0.05 ? `blur(${blurPx.toFixed(1)}px)` : "none";
        el.style.zIndex = isMiddle ? "50" : `${Math.max(1, Math.round((1 - u) * 40))}`;

        // Highlight active middle card with 1.5px cobalt outline and soft shadow
        if (isMiddle) {
          el.style.outline = "1.5px solid #1A3B8B";
          el.style.outlineOffset = "-1.5px";
          el.style.borderColor = "#1A3B8B";
          el.style.boxShadow =
            "0 25px 50px -12px rgba(26, 59, 139, 0.32), 0 12px 28px -6px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(26, 59, 139, 0.45)";
        } else {
          el.style.outline = "none";
          el.style.outlineOffset = "0";
          el.style.borderColor = "#E5E0D8";
          el.style.boxShadow = "0 4px 12px -2px rgba(0, 0, 0, 0.04)";
        }

        // Toggle 'IN FOCUS' badge on middle card
        const focusBadge = el.querySelector(".middle-spotlight-badge") as HTMLElement | null;
        if (focusBadge) {
          focusBadge.style.display = isMiddle ? "block" : "none";
        }
      }

      // Update caption pill content directly when middle product changes
      if (activeProductIdx !== lastActiveIdxRef.current) {
        lastActiveIdxRef.current = activeProductIdx;
        const currentProd = products[activeProductIdx];
        if (currentProd) {
          setActiveProduct(currentProd);
          if (captionTitleRef.current) {
            captionTitleRef.current.textContent = currentProd.name;
          }
          if (captionPriceRef.current) {
            captionPriceRef.current.textContent = formatPrice(currentProd.price);
          }
        }
      }
    },
    [K, N, startIndex, params, products, viewportDims.width]
  );

  // GSAP ScrollTrigger Pinned Orbit
  useIsomorphicLayoutEffect(() => {
    if (!pinSectionRef.current || !stageRef.current || slots.length === 0 || K === 0) return;

    // Set initial card positions immediately
    updateWheelTransforms(0);

    const ctx = gsap.context(() => {
      const scrollDist = (params.scrollLength / 100) * window.innerHeight;

      const st = ScrollTrigger.create({
        trigger: pinSectionRef.current,
        start: "top top",
        end: `+=${scrollDist}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        snap: K > 1 ? {
          snapTo: 1 / (K - 1),
          duration: { min: 0.18, max: 0.38 },
          delay: 0.05,
          ease: "power2.out",
        } : undefined,
        onUpdate: (self) => {
          updateWheelTransforms(self.progress);
        },
      });

      scrollTriggerRef.current = st;
    }, rootRef);

    return () => {
      // Revert pin spacer cleanly and immediately before React Fiber unmounts
      ctx.revert();
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill(true);
        scrollTriggerRef.current = null;
      }
    };
  }, [slots.length, K, params.scrollLength, updateWheelTransforms]);

  // Refresh ScrollTrigger when images load or window resizes
  useEffect(() => {
    const t = setTimeout(() => {
      ScrollTrigger.refresh();
      if (scrollTriggerRef.current) {
        updateWheelTransforms(scrollTriggerRef.current.progress);
      } else {
        updateWheelTransforms(0);
      }
    }, 120);

    return () => clearTimeout(t);
  }, [imagesLoaded, viewportDims, updateWheelTransforms]);

  // Handle card click navigation
  const handleSelectProduct = useCallback(
    (product: Product) => {
      router.push(`/product/${product.id}`);
    },
    [router]
  );

  return (
    <div ref={rootRef} id="orbital-wheel-root" className="relative w-full">
      <section
        ref={pinSectionRef}
        id="orbital-product-wheel"
        className="relative z-20 w-full bg-[#F4F0E8] text-[#161616] overflow-hidden select-none border-t border-[#E5E0D8]"
        style={{ height: "100dvh" }}
        aria-label="New this month orbital product gallery"
      >
        {/* Container aligned with the exact same left/right container edge as the rest of the page */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex flex-col h-full">
          {/* 
            1. DEDICATED HEADING BLOCK:
            Positioned strictly ABOVE the wheel stage in document flow.
            Reserved height and spacing (pt-28/32 clears the fixed navbar, pb-6/12 gives min 32px/56px clearance).
            No card, shadow, or caption can ever enter this area.
          */}
          <div className="pt-28 sm:pt-32 pb-6 sm:pb-12 shrink-0">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-normal tracking-tight text-[#161616]">
              {WHEEL_SECTION_COPY.heading}
            </h2>
          </div>

          {/* 
            2. WHEEL VIEWPORT STAGE:
            Starts strictly below the heading block (flex-1).
            Top of the active card (focusY) is placed cleanly within the stage.
          */}
          <div
            ref={stageRef}
            className="relative w-full flex-1 min-h-0 overflow-hidden"
          >
            {/* Orbital Cards Canvas */}
            {slots.map((slot, i) => {
              const primaryImg =
                slot.product.images?.[0] ||
                slot.product.thumbnail ||
                "/images/placeholder-silhouette.png";

              return (
                <div
                  key={slot.slotId}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  tabIndex={slot.isRepeated ? -1 : 0}
                  aria-hidden={slot.isRepeated ? "true" : undefined}
                  role="button"
                  aria-label={slot.isRepeated ? undefined : `View silhouette: ${slot.product.name}`}
                  onClick={() => handleSelectProduct(slot.product)}
                  onFocus={() => {
                    // When keyboard Tab focuses a real product, smooth scroll to bring it to center
                    if (!slot.isRepeated && scrollTriggerRef.current && K > 1) {
                      const st = scrollTriggerRef.current;
                      const cardProgress = slot.originalIndex / (K - 1);
                      const targetScroll = st.start + cardProgress * (st.end - st.start);
                      window.scrollTo({
                        top: targetScroll,
                        behavior: "smooth",
                      });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!slot.isRepeated && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleSelectProduct(slot.product);
                    }
                  }}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: `${params.itemWidth}px`,
                    height: `${params.itemHeight}px`,
                    transformOrigin: "center center",
                    willChange: "transform, opacity, filter",
                    borderRadius: "2px",
                    outline: "none",
                    boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.04)",
                  }}
                  className="cursor-pointer bg-[#EFECE6] border border-[#E5E0D8] overflow-hidden transition-[outline,box-shadow,border-color] duration-200 focus:outline focus:outline-[2px] focus:outline-[#1A3B8B]"
                >
                  {/* 4:5 Aspect Ratio Card Image */}
                  <div className="relative w-full h-full aspect-[4/5] overflow-hidden">
                    <Image
                      src={primaryImg}
                      alt={slot.product.name}
                      fill
                      unoptimized={primaryImg.startsWith("http")}
                      sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 240px"
                      className="object-cover pointer-events-none"
                      priority={i < 4}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = "/images/placeholder-silhouette.png";
                      }}
                      onLoad={() => {
                        if (i === slots.length - 1) {
                          setImagesLoaded(true);
                        }
                      }}
                    />

                    {/* Badges: Top-Left ONLY with consistent padding */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none z-10">
                      {slot.product.isNew && (
                        <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-[#161616] text-[#F4F0E8] font-medium rounded-[1px] shadow-xs">
                          New
                        </span>
                      )}
                      {slot.product.category && (
                        <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-white/95 text-[#161616] font-medium border border-[#E5E0D8] rounded-[1px] shadow-xs">
                          {slot.product.category}
                        </span>
                      )}
                    </div>

                    {/* Middle Spotlight Badge: Shows 'IN FOCUS' when this card is in the center */}
                    <div
                      className="middle-spotlight-badge absolute top-2.5 right-2.5 pointer-events-none z-10"
                      style={{ display: "none" }}
                    >
                      <span className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-[#1A3B8B] text-white font-semibold rounded-[1px] shadow-sm">
                        IN FOCUS
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 
              CAPTION PILL:
              Sits below the active card only.
              Safely spaced from neighbouring cards to prevent any overlap.
              #161616 background, cream text, DM Sans, sentence case, no letter-spacing,
              price in ₹ (DM Mono), small arrow icon on the right.
            */}
            {activeProduct && (
              <div
                className="absolute z-40 inset-x-0 flex justify-center pointer-events-none"
                style={{
                  top: `${params.focusY + params.itemHeight + (viewportDims.width < 640 ? 16 : 22)}px`,
                }}
              >
                <button
                  ref={captionLinkRef}
                  type="button"
                  onClick={() => handleSelectProduct(activeProduct)}
                  className="pointer-events-auto inline-flex items-center gap-2.5 px-4 py-2 min-h-[44px] bg-[#161616] text-[#F4F0E8] hover:bg-[#262626] transition-all rounded-full shadow-[0_12px_30px_-5px_rgba(26,59,139,0.35)] border border-[#1A3B8B]/60 group cursor-pointer"
                  title={`View ${activeProduct.name}`}
                  aria-label={`Open product ${activeProduct.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A3B8B] animate-pulse shrink-0" />
                  <span
                    ref={captionTitleRef}
                    className="text-xs font-body font-medium normal-case tracking-normal text-[#F4F0E8]"
                  >
                    {activeProduct.name}
                  </span>
                  <span
                    ref={captionPriceRef}
                    className="text-[11px] font-mono text-[#c5a46d] font-semibold"
                  >
                    {formatPrice(activeProduct.price)}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#c5a46d] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
