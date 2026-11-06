"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ShieldCheck, Award } from "lucide-react";
import confetti from "canvas-confetti";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [memberId, setMemberId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const id = "NOIR-" + Math.floor(10000 + Math.random() * 90000);
    setMemberId(id);
    setIsSubscribed(true);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#c5a46d", "#ffffff", "#050505"],
      });
    } catch {
      // fallback
    }
  };

  return (
    <section className="relative w-full py-24 md:py-36 px-6 md:px-14 bg-[#080808] border-t border-white/[0.06] overflow-hidden">
      {/* Background Decorative Ambient Radial Glow */}
      <div className="absolute inset-0 bg-radial-gradient from-[#c5a46d]/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-4">
          <Award className="w-3.5 h-3.5" />
          <span>Private Access // The Noir Circle</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-black tracking-tight uppercase font-display text-white">
          JOIN THE ATELIER ARCHIVE
        </h2>

        <p className="mt-4 text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
          Receive private invitations 48 hours before public drops, exclusive lookbooks, and early access to seasonal runway collections.
        </p>

        <div className="mt-10 max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            {!isSubscribed ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="email"
                  required
                  placeholder="ENTER YOUR EMAIL (E.G. YOU@DOMAIN.COM)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-black border border-white/15 px-5 py-4 text-xs font-mono uppercase text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-[0.25em] uppercase transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#c5a46d]/15"
                >
                  <span>Get Early Access</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="confirmation"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-8 bg-[#0a0a0a] border border-[#c5a46d] text-left space-y-4 shadow-2xl relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#c5a46d]">
                    <Check className="w-4 h-4" />
                    <span>PRIVATE ACCESS GRANTED</span>
                  </div>
                  <span className="font-mono text-xs text-neutral-400">STATUS: ACTIVE</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 block">
                      VIP Serial Pass
                    </span>
                    <span className="text-2xl font-bold font-mono text-white tracking-wider">
                      {memberId}
                    </span>
                  </div>
                  <div className="text-right sm:text-right">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 block">
                      Accreditation
                    </span>
                    <span className="text-xs font-mono text-[#c5a46d]">FIRST-DROP PRIVILEGE</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 pt-2 border-t border-white/5">
                  A verification confirmation with your secret key has been dispatched to{" "}
                  <span className="text-white font-mono">{email}</span>. Use voucher{" "}
                  <span className="text-[#c5a46d] font-bold font-mono">NOIR10</span> for 10% off your inaugural acquisition.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-neutral-500 tracking-wider font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
          <span>Zero Spam · Strictly Serialized Drop Notifications Only</span>
        </div>
      </div>
    </section>
  );
}
