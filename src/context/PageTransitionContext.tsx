"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type PageTransitionContextType = {
  isTransitioning: boolean;
  transitionStage: "idle" | "covering" | "uncovering";
  navigateTo: (href: string) => void;
  targetPath: string | null;
};

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStage, setTransitionStage] = useState<"idle" | "covering" | "uncovering">("idle");
  const [targetPath, setTargetPath] = useState<string | null>(null);

  const prevPathnameRef = useRef(pathname);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const prefersReducedMotion = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const navigateTo = useCallback(
    (href: string) => {
      if (!href) return;

      const target = href.split("?")[0].split("#")[0];
      const current = pathname.split("?")[0].split("#")[0];

      // If already on this page, scroll smoothly to top
      if (target === current) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // If user prefers reduced motion, navigate immediately without animation
      if (prefersReducedMotion()) {
        router.push(href);
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
      }

      // Clear any pending timers
      clearAllTimers();

      setTargetPath(href);
      setIsTransitioning(true);
      setTransitionStage("covering");

      // CRITICAL: Call router.push immediately!
      // Never gate route navigation behind a setTimeout that can be canceled or blocked.
      router.push(href);

      // Automatic safety progression (target duration 350-450ms)
      // Ensures the overlay unveils and resets to idle even if route response is instant or delayed
      const uncoverTimer = setTimeout(() => {
        setTransitionStage("uncovering");
      }, 180);

      const idleTimer = setTimeout(() => {
        setTransitionStage("idle");
        setIsTransitioning(false);
        setTargetPath(null);
      }, 400);

      timersRef.current.push(uncoverTimer, idleTimer);
    },
    [pathname, router, prefersReducedMotion]
  );

  // When pathname changes (via Link click, router.push, or browser back/forward)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });

      if (!prefersReducedMotion()) {
        queueMicrotask(() => {
          setIsTransitioning(true);
          setTransitionStage("uncovering");
        });

        clearAllTimers();
        const finishTimer = setTimeout(() => {
          setTransitionStage("idle");
          setIsTransitioning(false);
          setTargetPath(null);
        }, 300);

        timersRef.current.push(finishTimer);
      } else {
        queueMicrotask(() => {
          setTransitionStage("idle");
          setIsTransitioning(false);
          setTargetPath(null);
        });
      }
    }
  }, [pathname, prefersReducedMotion]);

  // Handle browser back and forward navigation
  useEffect(() => {
    const handlePopState = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      clearAllTimers();
    };
  }, []);

  return (
    <PageTransitionContext.Provider
      value={{
        isTransitioning,
        transitionStage,
        navigateTo,
        targetPath,
      }}
    >
      {children}
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) {
    return {
      isTransitioning: false,
      transitionStage: "idle" as const,
      navigateTo: (href: string) => {
        if (typeof window !== "undefined") {
          window.location.href = href;
        }
      },
      targetPath: null,
    };
  }
  return context;
}
