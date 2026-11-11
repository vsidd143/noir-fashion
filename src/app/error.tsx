"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error boundary caught:", error);
  }, [error]);

  return (
    <PageShell>
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-24 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-[#1A3B8B]/10 border border-[#1A3B8B]/20 flex items-center justify-center text-[#1A3B8B] mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <span className="text-xs font-mono font-medium tracking-widest text-[#1A3B8B] uppercase mb-2">
          Notice
        </span>
        <h1 className="text-3xl sm:text-4xl font-headline font-normal text-[#161616] tracking-tight mb-3">
          Something Went Wrong
        </h1>
        <p className="text-sm font-body text-[#6E6D68] leading-relaxed mb-8 max-w-md">
          An unexpected issue occurred while rendering this page. You can try refreshing or return to the main storefront.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#1A3B8B] hover:bg-[#142e6d] text-white font-body text-xs font-medium uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 bg-white border border-[#E5E0D8] hover:border-[#1A3B8B] text-[#161616] font-body text-xs font-medium uppercase tracking-wider transition-colors inline-flex items-center justify-center"
          >
            <span>Back to Storefront</span>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

