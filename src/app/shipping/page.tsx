import React from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import { Truck, ShieldCheck, Clock, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Shipping & COD Policy | NOIR",
  description: "Information regarding order dispatch, shipping timelines, and Cash on Delivery across India.",
};

export default function ShippingPage() {
  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-32 sm:pt-40 pb-24 text-[#161616]">
        {/* Header */}
        <div className="border-b border-[#E5E0D8] pb-8 mb-12">
          <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-2">
            Customer Care
          </span>
          <h1 className="text-4xl sm:text-5xl font-headline font-normal tracking-tight">
            Shipping & COD Policy
          </h1>
          <p className="text-sm font-body text-[#6E6D68] mt-3 max-w-xl">
            Complimentary shipping and reliable Cash on Delivery available for addresses across India.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="p-6 bg-white border border-[#E5E0D8] space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#1A3B8B]/10 flex items-center justify-center text-[#1A3B8B]">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-headline font-normal">Delivery Across India</h3>
            <p className="text-xs sm:text-sm font-body text-[#6E6D68] leading-relaxed">
              We ship to all serviceable PIN codes throughout India. Typical transit time is 3 to 5 business days after order confirmation.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#E5E0D8] space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#1A3B8B]/10 flex items-center justify-center text-[#1A3B8B]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-headline font-normal">Cash on Delivery (COD)</h3>
            <p className="text-xs sm:text-sm font-body text-[#6E6D68] leading-relaxed">
              Pay with cash when your package arrives at your doorstep. No prepayment or credit card required.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-10 text-sm font-body text-[#4A4944] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-headline font-normal text-[#161616]">
              1. Order Processing & Dispatch
            </h2>
            <p>
              Every order is processed and packed within 24 to 48 hours of placement. Once packed, your package is handed over to our courier partners for prompt transit.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-headline font-normal text-[#161616]">
              2. Real-Time Tracking
            </h2>
            <p>
              Upon dispatch, a unique tracking number is generated. You can track your order status in real time directly from your NOIR account dashboard under &ldquo;My Orders&rdquo;.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-headline font-normal text-[#161616]">
              3. Verification & Delivery Guidelines
            </h2>
            <p>
              For Cash on Delivery orders, please ensure the recipient is available at the provided delivery address with the exact total amount due. Our courier executive will reach out to you via call or SMS prior to attempted delivery.
            </p>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

