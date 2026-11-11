import React from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import StorefrontCollection from "@/components/sections/StorefrontCollection";

export const metadata: Metadata = {
  title: "Women's Collection | NOIR",
  description:
    "Explore the NOIR Women's Collection. Tailored jackets, relaxed dresses, and contemporary sets.",
};

const WOMEN_SUBCATEGORIES = [
  { label: "All Items", value: "all" },
  { label: "Tops", value: "tops" },
  { label: "Dresses", value: "dresses" },
  { label: "Jackets", value: "jackets" },
  { label: "Hoodies", value: "hoodies" },
  { label: "Trousers", value: "trousers" },
  { label: "Jeans", value: "jeans" },
];

export default function WomenPage() {
  return (
    <PageShell>
      <StorefrontCollection
        department="women"
        title="Women's Collection"
        subtitle="Tailored jackets, relaxed dresses, and contemporary sets."
        badge="Women's"
        subcategories={WOMEN_SUBCATEGORIES}
      />
    </PageShell>
  );
}