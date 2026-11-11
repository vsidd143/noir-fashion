import React from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | NOIR",
  description: "Answers to common questions regarding NOIR ordering, delivery, sizing, and Cash on Delivery.",
};

const FAQS = [
  {
    q: "How does Cash on Delivery (COD) work?",
    a: "When placing your order, select Cash on Delivery at checkout. You will pay the courier in cash when the parcel is delivered to your address. No advance payment or card is required.",
  },
  {
    q: "Where does NOIR deliver?",
    a: "We deliver across all serviceable PIN codes throughout India with complimentary standard delivery.",
  },
  {
    q: "How long does delivery take?",
    a: "Orders are processed within 24–48 hours. Typical transit time to most major Indian cities is 3 to 5 business days.",
  },
  {
    q: "How can I track my order?",
    a: "Once dispatched, you can view your real-time tracking number and live status under 'My Orders' in your account dashboard.",
  },
  {
    q: "Can I cancel an order after placing it?",
    a: "Yes. You can cancel your order directly from your account dashboard as long as the status is 'Placed' or 'Packed'. Orders that are already in transit cannot be cancelled online.",
  },
  {
    q: "What is your return and exchange policy?",
    a: "We accept returns and size exchanges within 7 calendar days of delivery for items that are unworn, undamaged, and have all original tags intact.",
  },
];

export default function FAQPage() {
  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-32 sm:pt-40 pb-24 text-[#161616]">
        {/* Header */}
        <div className="border-b border-[#E5E0D8] pb-8 mb-12">
          <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-2">
            Help & Guidance
          </span>
          <h1 className="text-4xl sm:text-5xl font-headline font-normal tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-sm font-body text-[#6E6D68] mt-3 max-w-xl">
            Everything you need to know about shopping, shipping, sizing, and order fulfillment at NOIR.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-6">
          {FAQS.map((item, idx) => (
            <div key={idx} className="p-6 bg-white border border-[#E5E0D8] space-y-2">
              <h3 className="text-base font-headline font-normal text-[#161616]">
                {item.q}
              </h3>
              <p className="text-sm font-body text-[#6E6D68] leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

