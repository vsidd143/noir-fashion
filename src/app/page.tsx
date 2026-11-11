"use client";

import React from "react";
import PageShell from "@/components/layout/PageShell";
import HeroSection from "@/components/sections/HeroSection";
import EditorialSplit from "@/components/sections/EditorialSplit";
import ProductWheelSection from "@/components/sections/ProductWheel";
import BrandValues from "@/components/sections/BrandValues";

export default function HomePage() {
  return (
    <PageShell hideFooterNewsletter={false}>
      {/* SECTION 01 — CINEMATIC HERO (UNTOUCHED) */}
      <HeroSection />

      {/* SECTION 02 — CONCEPT A: 55/45 EDITORIAL SPLIT */}
      <EditorialSplit />

      {/* SECTION 03 — ORBITAL IMAGE WHEEL ("New this month") */}
      <ProductWheelSection />

      {/* SECTION 04 — BRAND VALUES & CRAFT PILLARS */}
      <BrandValues />

      {/* SECTION 05 — GLOBAL FOOTER (RENDERED BY PAGESHELL) */}
    </PageShell>
  );
}
