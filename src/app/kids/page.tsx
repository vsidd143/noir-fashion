import React from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import StorefrontCollection from "@/components/sections/StorefrontCollection";

export const metadata: Metadata = {
  title: "Kids' Collection | NOIR",
  description:
    "Explore the NOIR Kids' Collection. Everyday luxury scaled for comfort and daily play.",
};

const KIDS_SUBCATEGORIES = [
  { label: "All Items", value: "all" },
  { label: "T-Shirts", value: "t-shirts" },
  { label: "Shirts", value: "shirts" },
  { label: "Hoodies", value: "hoodies" },
  { label: "Jackets", value: "jackets" },
  { label: "Bottomwear", value: "bottomwear" },
];

export default function KidsPage() {
  return (
    <PageShell>
      <StorefrontCollection
        department="kids"
        title="Kids' Collection"
        subtitle="Everyday luxury scaled for comfort and daily play."
        badge="Kids"
        subcategories={KIDS_SUBCATEGORIES}
      />
    </PageShell>
  );
}

