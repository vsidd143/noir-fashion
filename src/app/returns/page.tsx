import React from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Returns & Exchanges | NOIR",
  description: "Policy and instructions for returning or exchanging items purchased from NOIR.",
};

export default function ReturnsPage() {
  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-32 sm:pt-40 pb-24 text-[#161616]">
        {/* Header */}
        <div className="border-b border-[#E5E0D8] pb-8 mb-12">
          <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-2">
            Customer Care
          </span>
          <h1 className="text-4xl sm:text-5xl font-headline font-normal tracking-tight">
            Returns & Exchanges
          </h1>
          <p className="text-sm font-body text-[#6E6D68] mt-3 max-w-xl">
            Simple 7-day return and exchange policy for unworn items in original condition with tags attached.
          </p>
        </div>

        {/* Process Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-white border border-[#E5E0D8] space-y-2.5">
            <span className="text-xs font-mono font-semibold text-[#1A3B8B]">STEP 01</span>
            <h3 className="text-base font-headline font-normal">Initiate Request</h3>
            <p className="text-xs text-[#6E6D68] leading-relaxed">
              Submit your request within 7 calendar days of delivery via your account or by contacting customer support.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#E5E0D8] space-y-2.5">
            <span className="text-xs font-mono font-semibold text-[#1A3B8B]">STEP 02</span>
            <h3 className="text-base font-headline font-normal">Doorstep Pickup</h3>
            <p className="text-xs text-[#6E6D68] leading-relaxed">
              Our courier will schedule a complimentary pickup from your registered delivery address.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#E5E0D8] space-y-2.5">
            <span className="text-xs font-mono font-semibold text-[#1A3B8B]">STEP 03</span>
            <h3 className="text-base font-headline font-normal">Inspection & Resolution</h3>
            <p className="text-xs text-[#6E6D68] leading-relaxed">
              Following standard quality verification, your replacement size is dispatched or payment credited.
            </p>
          </div>
        </div>

        {/* Conditions */}
        <div className="space-y-8 text-sm font-body text-[#4A4944] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-headline font-normal text-[#161616]">
              Eligibility Criteria
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-[#4A4944]">
              <li>Items must be unworn, unwashed, and undamaged.</li>
              <li>Original brand tags, packaging, and labels must be fully intact.</li>
              <li>Footwear must be tried on carpeted surfaces and returned with original protective boxes.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-headline font-normal text-[#161616]">
              Size Exchanges
            </h2>
            <p>
              If a silhouette does not fit as desired, you can request an alternate size at no additional delivery fee, subject to stock availability in the catalog.
            </p>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

