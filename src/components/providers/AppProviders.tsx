"use client";

import React, { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CursorProvider } from "@/context/CursorContext";
import { PageTransitionProvider } from "@/context/PageTransitionContext";
import PageTransitionOverlay from "@/components/ui/PageTransitionOverlay";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <CursorProvider>
          <Suspense fallback={<>{children}</>}>
            <PageTransitionProvider>
              {children}
              <PageTransitionOverlay />
            </PageTransitionProvider>
          </Suspense>
        </CursorProvider>
      </CartProvider>
    </AuthProvider>
  );
}
