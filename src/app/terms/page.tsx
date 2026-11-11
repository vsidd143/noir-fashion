import React from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Terms & Conditions | NOIR",
  description: "Terms and conditions governing the use of the NOIR platform and purchasing of apparel.",
};

export default function TermsPage() {
  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-32 sm:pt-40 pb-24 text-[#161616]">
        {/* Header */}
        <div className="border-b border-[#E5E0D8] pb-8 mb-12">
          <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-2">
            Legal
          </span>
          <h1 className="text-4xl sm:text-5xl font-headline font-normal tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs font-mono text-[#6E6D68] mt-2">
            Effective Date: November 2026
          </p>
        </div>

        <div className="space-y-8 text-sm font-body text-[#4A4944] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-headline font-normal text-[#161616]">
              1. General
            </h2>
            <p>
              By accessing and placing orders on NOIR, you agree to these Terms of Service. All orders placed on our website are subject to availability and confirmation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-headline font-normal text-[#161616]">
              2. Cash on Delivery & Fulfillment
            </h2>
            <p>
              Prices shown on product pages include applicable GST. Payment for Cash on Delivery orders is due upon physical presentation of the parcel by the courier partner.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-headline font-normal text-[#161616]">
              3. Governing Law
            </h2>
            <p>
              These Terms and any contracts for the purchase of goods from NOIR shall be governed by and construed in accordance with the laws of India.
            </p>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

