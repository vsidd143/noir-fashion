import React, { Suspense } from "react";
import ProductDetailClient from "./ProductDetailClient";
import { PRODUCTS } from "@/data/products";

export function generateStaticParams() {
  if (PRODUCTS.length > 0) {
    return PRODUCTS.map((product) => ({
      slug: product.id,
    }));
  }
  return [{ slug: "atelier" }];
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-mono text-xs tracking-widest uppercase">
          Loading Atelier Piece...
        </div>
      }
    >
      <ProductDetailClient slug={slug} />
    </Suspense>
  );
}
