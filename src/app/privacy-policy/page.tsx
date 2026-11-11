import React from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | NOIR",
  description: "Privacy policy and personal data management principles for NOIR patrons.",
};

export default function PrivacyPolicyPage() {
  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-32 sm:pt-40 pb-24 text-[#161616]">
        {/* Header */}
        <div className="border-b border-[#E5E0D8] pb-8 mb-12">
          <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-2">
            Legal
          </span>
          <h1 className="text-4xl sm:text-5xl font-headline font-normal tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-[#6E6D68] mt-2">
            Last Updated: November 2026
          </p>
        </div>

        <div className="space-y-8 text-sm font-body text-[#4A4944] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-headline font-normal text-[#161616]">
              1. Information We Collect
            </h2>
            <p>
              When you purchase or register an account with NOIR, we collect your name, email address, phone number, and delivery address to facilitate order fulfillment, delivery verification, and order tracking.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-headline font-normal text-[#161616]">
              2. Use of Information
            </h2>
            <p>
              Your contact details are strictly used to coordinate delivery across India, confirm Cash on Delivery orders, and provide real-time tracking updates. We do not sell or rent personal information to third parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-headline font-normal text-[#161616]">
              3. Data Security
            </h2>
            <p>
              All customer sessions and database communications are encrypted using modern TLS encryption and industry-standard security protocols.
            </p>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

