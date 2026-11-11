"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Loader2, AlertCircle, Banknote, ShieldCheck } from "lucide-react";
import { InstagramIcon, FacebookIcon } from "@/components/ui/SocialIcons";

interface FooterProps {
  socialLinks?: {
    instagram?: string;
    facebook?: string;
  };
  hideNewsletter?: boolean;
  theme?: "light" | "dark";
}

export default function Footer({ socialLinks, hideNewsletter = false, theme = "light" }: FooterProps = {}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const instagramUrl =
    socialLinks?.instagram ||
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
    "";

  const facebookUrl =
    socialLinks?.facebook ||
    process.env.NEXT_PUBLIC_FACEBOOK_URL ||
    "";

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading" || status === "success") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "footer" }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Subscription failed. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  };

  const isDark = theme === "dark";

  return (
    <footer
      className={`w-full select-none ${isDark
        ? "bg-[#0a0a0a] text-white border-t border-white/10"
        : "bg-[#EFECE6] text-[#161616] border-t border-[#E5E0D8]"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-16 sm:pt-20 pb-12">
        {/* Main Columns Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${hideNewsletter ? "lg:grid-cols-3" : "lg:grid-cols-12"} gap-10 lg:gap-12 pb-14`}>
          {/* 1. Brand Column */}
          <div className={`${hideNewsletter ? "lg:col-span-1" : "lg:col-span-4"} space-y-4`}>
            <Link href="/" className="inline-block group focus:outline-none">
              <span
                className={`text-3xl sm:text-4xl font-headline font-normal tracking-[0.2em] transition-colors block ${isDark
                  ? "text-white group-hover:text-white/80"
                  : "text-[#161616] group-hover:text-[#1A3B8B]"
                  }`}
              >
                NOIR
              </span>
            </Link>
            <p className={`text-sm font-body leading-relaxed max-w-sm ${isDark ? "text-neutral-400" : "text-[#6E6D68]"}`}>
              Thoughtfully designed clothing for everyday wear. Delivery across India with Cash on Delivery.
            </p>

            {/* Cash on Delivery Badge */}
            <div className="pt-2">
              <div
                className={`inline-flex items-center gap-3 px-3.5 py-2.5 text-xs font-body ${isDark
                  ? "bg-white/5 border border-white/15 text-white"
                  : "bg-white border border-[#E5E0D8] text-[#161616]"
                  }`}
              >
                <Banknote className="w-4 h-4 text-[#1A3B8B] shrink-0" />
                <div className="flex flex-col">
                  <span className={`font-medium ${isDark ? "text-white" : "text-[#161616]"}`}>Cash on Delivery</span>
                  <span className={`text-[11px] ${isDark ? "text-neutral-400" : "text-[#6E6D68]"}`}>Pay when your order arrives</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Collections */}
          <div className={`${hideNewsletter ? "lg:col-span-1" : "lg:col-span-2"} space-y-3.5`}>
            <h4 className={`text-xs font-body font-semibold uppercase tracking-wider ${isDark ? "text-white" : "text-[#161616]"}`}>
              Collections
            </h4>
            <ul className="space-y-2.5 text-sm font-body">
              <li>
                <Link href="/men" className={`transition-colors block ${isDark ? "text-neutral-400 hover:text-white" : "text-[#6E6D68] hover:text-[#1A3B8B]"}`}>
                  Men
                </Link>
              </li>
              <li>
                <Link href="/women" className={`transition-colors block ${isDark ? "text-neutral-400 hover:text-white" : "text-[#6E6D68] hover:text-[#1A3B8B]"}`}>
                  Women
                </Link>
              </li>
              <li>
                <Link href="/kids" className={`transition-colors block ${isDark ? "text-neutral-400 hover:text-white" : "text-[#6E6D68] hover:text-[#1A3B8B]"}`}>
                  Kids
                </Link>
              </li>
              <li>
                <Link href="/new-arrivals" className={`transition-colors block ${isDark ? "text-neutral-400 hover:text-white" : "text-[#6E6D68] hover:text-[#1A3B8B]"}`}>
                  New Arrivals
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. Customer Care & Assistance */}
          <div className={`${hideNewsletter ? "lg:col-span-1" : "lg:col-span-3"} space-y-3.5`}>
            <h4 className={`text-xs font-body font-semibold uppercase tracking-wider ${isDark ? "text-white" : "text-[#161616]"}`}>
              Customer Care
            </h4>
            <ul className="space-y-2.5 text-sm font-body">
              <li>
                <Link href="/user" className={`transition-colors block ${isDark ? "text-neutral-400 hover:text-white" : "text-[#6E6D68] hover:text-[#1A3B8B]"}`}>
                  My Orders & Tracking
                </Link>
              </li>
              <li>
                <Link href="/shipping" className={`transition-colors block ${isDark ? "text-neutral-400 hover:text-white" : "text-[#6E6D68] hover:text-[#1A3B8B]"}`}>
                  Shipping & COD Policy
                </Link>
              </li>
              <li>
                <Link href="/returns" className={`transition-colors block ${isDark ? "text-neutral-400 hover:text-white" : "text-[#6E6D68] hover:text-[#1A3B8B]"}`}>
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link href="/contact" className={`transition-colors block ${isDark ? "text-neutral-400 hover:text-white" : "text-[#6E6D68] hover:text-[#1A3B8B]"}`}>
                  Contact & Support
                </Link>
              </li>
              <li>
                <Link href="/faq" className={`transition-colors block ${isDark ? "text-neutral-400 hover:text-white" : "text-[#6E6D68] hover:text-[#1A3B8B]"}`}>
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* 4. Newsletter */}
          {!hideNewsletter && (
            <div className="lg:col-span-3 space-y-3.5">
              <h4 className={`text-xs font-body font-semibold uppercase tracking-wider ${isDark ? "text-white" : "text-[#161616]"}`}>
                Newsletter
              </h4>
              <p className="text-sm text-[#6E6D68] font-body leading-relaxed">
                Receive updates on new collection drops and additions.
              </p>

              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-2.5 text-xs font-body"
                  >
                    <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Subscription Confirmed</p>
                      <p className="text-emerald-700 text-[11px] mt-0.5">Thank you for subscribing to NOIR updates.</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubscribe}
                    className="space-y-2.5 pt-1"
                  >
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (status === "error") setStatus("idle");
                        }}
                        placeholder="Enter your email"
                        disabled={status === "loading"}
                        className="flex-1 bg-white border border-[#E5E0D8] focus:border-[#1A3B8B] px-3.5 py-2.5 text-sm font-body text-[#161616] placeholder-[#A09D96] focus:outline-none transition-colors disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={status === "loading" || !email.trim()}
                        className="px-5 py-2.5 bg-[#1A3B8B] hover:bg-[#142E6D] disabled:bg-neutral-300 disabled:text-neutral-500 text-white font-body text-xs font-medium tracking-wide uppercase transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {status === "loading" ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending</span>
                          </>
                        ) : (
                          <>
                            <span>Subscribe</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {status === "error" && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5 text-rose-600 text-xs font-body pt-1"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errorMessage}</span>
                      </motion.div>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Bottom Bar: Copyright & Socials */}
        <div className={`border-t ${isDark ? "border-white/10 text-neutral-400" : "border-[#E5E0D8] text-[#6E6D68]"} pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-body`}>
          <div className="flex items-center gap-3">
            <span>© 2026 NOIR. All rights reserved.</span>
            <span>•</span>
            <Link href="/privacy-policy" className={`hover:underline ${isDark ? "hover:text-white" : "hover:text-[#1A3B8B]"}`}>
              Privacy
            </Link>
            <span>•</span>
            <Link href="/terms" className={`hover:underline ${isDark ? "hover:text-white" : "hover:text-[#1A3B8B]"}`}>
              Terms
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span>Delivery across India</span>
            <span>•</span>
            <span>Cash on delivery</span>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="NOIR Official Instagram"
                className="text-[#6E6D68] hover:text-[#1A3B8B] transition-colors"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
            ) : null}

            {facebookUrl ? (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="NOIR Official Facebook"
                className="text-[#6E6D68] hover:text-[#1A3B8B] transition-colors"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
