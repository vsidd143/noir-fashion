
import React, { Suspense } from "react";
import ProductDetailClient from "./ProductDetailClient";
import { PRODUCTS } from "@/data/products";

export function generateStaticParams() {
  if (PRODUCTS.length > 0) {
    return PRODUCTS.map((product) => ({
      slug: product.id,
    }));
  }

  return [{ slug: "noir-product" }];
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Resolve URL params inside Suspense
async function ProductPageContent({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  return <ProductDetailClient slug={slug} />;
}

// Main page component
export default function ProductPage({
  params,
}: ProductPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-mono text-xs tracking-widest uppercase">
          Loading Product...
        </div>
      }
    >
      <ProductPageContent params={params} />
    </Suspense>
  );
}
