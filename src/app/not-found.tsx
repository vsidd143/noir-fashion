import React from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { ArrowRight, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <PageShell>
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-24 text-center max-w-lg mx-auto">
        <span className="text-xs font-mono font-medium tracking-widest text-[#1A3B8B] uppercase mb-3">
          Error 404
        </span>
        <h1 className="text-4xl sm:text-5xl font-headline font-normal text-[#161616] tracking-tight mb-4">
          Page Not Found
        </h1>
        <p className="text-sm font-body text-[#6E6D68] leading-relaxed mb-8 max-w-md">
          The requested page or collection does not exist or may have been relocated.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 bg-[#161616] hover:bg-[#1A3B8B] text-white font-body text-xs font-medium uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Return Home</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/new-arrivals"
            className="w-full sm:w-auto px-6 py-3.5 bg-white border border-[#E5E0D8] hover:border-[#1A3B8B] text-[#161616] hover:text-[#1A3B8B] font-body text-xs font-medium uppercase tracking-wider transition-colors inline-flex items-center justify-center"
          >
            <span>Explore New Arrivals</span>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

