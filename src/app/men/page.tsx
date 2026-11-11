import React from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import StorefrontCollection from "@/components/sections/StorefrontCollection";

export const metadata: Metadata = {
  title: "Men's Collection | NOIR",
  description:
    "Explore the NOIR Men's Collection. Structured outerwear, heavyweight hoodies, and tailored pieces designed for daily wear.",
};

const MEN_SUBCATEGORIES = [
  { label: "All Items", value: "all" },
  { label: "T-Shirts", value: "t-shirts" },
  { label: "Shirts", value: "shirts" },
  { label: "Jackets", value: "jackets" },
  { label: "Hoodies", value: "hoodies" },
  { label: "Trousers", value: "trousers" },
  { label: "Jeans", value: "jeans" },
];

export default function MenPage() {
  return (
    <PageShell>
      <StorefrontCollection
        department="men"
        title="Men's Collection"
        subtitle="Structured outerwear, heavyweight hoodies, and tailored pieces designed for daily wear."
        badge="Men's"
        subcategories={MEN_SUBCATEGORIES}
      />
    </PageShell>
  );
}

