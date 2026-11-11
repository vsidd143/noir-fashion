import React from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import StorefrontCollection from "@/components/sections/StorefrontCollection";

export const metadata: Metadata = {
  title: "New Arrivals | NOIR",
  description:
    "Discover the latest additions and contemporary product from NOIR.",
};

const NEW_ARRIVALS_SUBCATEGORIES = [
  { label: "All Drops", value: "all" },
  { label: "Hoodies", value: "hoodies" },
  { label: "Jackets", value: "jackets" },
  { label: "T-Shirts", value: "t-shirts" },
  { label: "Trousers", value: "trousers" },
  { label: "Footwear", value: "footwear" },
];

export default function NewArrivalsPage() {
  return (
    <PageShell>
      <StorefrontCollection
        department="new-arrivals"
        title="New Arrivals"
        subtitle="The latest additions, contemporary product, and newly released garments from NOIR."
        badge="New Additions"
        subcategories={NEW_ARRIVALS_SUBCATEGORIES}
        defaultSort="newest"
      />
    </PageShell>
  );
}

