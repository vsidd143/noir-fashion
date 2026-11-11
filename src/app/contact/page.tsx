import React from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import { Mail, Phone, Clock, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact & Support | NOIR",
  description: "Get in touch with the NOIR customer support team for inquiries, order tracking, and assistance.",
};

export default function ContactPage() {
  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-32 sm:pt-40 pb-24 text-[#161616]">
        {/* Header */}
        <div className="border-b border-[#E5E0D8] pb-8 mb-12">
          <span className="text-xs font-body font-semibold uppercase tracking-wider text-[#1A3B8B] block mb-2">
            Customer Care
          </span>
          <h1 className="text-4xl sm:text-5xl font-headline font-normal tracking-tight">
            Contact & Support
          </h1>
          <p className="text-sm font-body text-[#6E6D68] mt-3 max-w-xl">
            Our team is available Monday through Saturday to assist with inquiries, sizing guidance, and order tracking.
          </p>
        </div>

        {/* Contact Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="p-6 bg-white border border-[#E5E0D8] space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#1A3B8B]/10 flex items-center justify-center text-[#1A3B8B]">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-headline font-normal">Email Support</h3>
            <p className="text-xs sm:text-sm font-body text-[#6E6D68]">
              Reach our customer care team at:
            </p>
            <a
              href="mailto:support@noir.in"
              className="inline-block text-sm font-mono text-[#1A3B8B] font-semibold hover:underline"
            >
              support@noir.in
            </a>
            <p className="text-[11px] text-[#A09D96]">Response time within 24 business hours</p>
          </div>

          <div className="p-6 bg-white border border-[#E5E0D8] space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#1A3B8B]/10 flex items-center justify-center text-[#1A3B8B]">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-headline font-normal">Operating Hours</h3>
            <p className="text-xs sm:text-sm font-body text-[#6E6D68] leading-relaxed">
              Monday to Saturday: 10:00 AM – 7:00 PM IST<br />
              Sunday: Closed for order dispatch and maintenance
            </p>
            <p className="text-[11px] text-[#A09D96]">Indian Standard Time (IST)</p>
          </div>
        </div>

        {/* Quick Help Guidance */}
        <div className="p-6 bg-[#EFECE6] border border-[#E5E0D8] space-y-3 text-sm font-body text-[#4A4944]">
          <h3 className="text-base font-headline font-normal text-[#161616]">
            Order Tracking & Account Self-Service
          </h3>
          <p>
            For instant status updates on recently placed Cash on Delivery orders, visit the{" "}
            <a href="/user" className="text-[#1A3B8B] underline font-medium">
              My Orders
            </a>{" "}
            dashboard. You can track courier dispatch status, review acquired items, and manage delivery addresses directly.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

