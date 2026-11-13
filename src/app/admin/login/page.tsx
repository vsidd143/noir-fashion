"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Lock, ArrowRight, AlertTriangle, Eye, EyeOff } from "lucide-react";
import CustomCursor from "@/components/ui/CustomCursor";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        setErrorMsg(authError.message);
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        setErrorMsg("Failed to authenticate administrator credentials.");
        setIsLoading(false);
        return;
      }

      // 2. Strict Database Role Verification with Explicit Error Capture
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_blocked")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        // Log complete PostgREST error details for diagnostic inspection
        console.error("Supabase Admin Role Verification Error:", {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
        });

        const errorDetails = [
          `Code: ${profileError.code || "UNKNOWN"}`,
          `Message: ${profileError.message}`,
          profileError.details ? `Details: ${profileError.details}` : null,
          profileError.hint ? `Hint: ${profileError.hint}` : null,
        ]
          .filter(Boolean)
          .join(" | ");

        setErrorMsg(`DATABASE ERROR: ${errorDetails}`);
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (!profile) {
        await supabase.auth.signOut();
        setErrorMsg("ACCOUNT INCOMPLETE: Profile record returned empty data.");
        setIsLoading(false);
        return;
      }

      // 3. Authorization Verification
      if (profile.is_blocked) {
        await supabase.auth.signOut();
        setErrorMsg("ACCESS SUSPENDED: This administrator account has been disabled.");
        setIsLoading(false);
        return;
      }

      if (profile.role !== "admin") {
        await supabase.auth.signOut();
        setErrorMsg("ACCESS DENIED: Your account does not have Master Administrator privileges.");
        setIsLoading(false);
        return;
      }

      // 4. Grant Access and Redirect to Admin Panel
      router.push("/admin");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected authorization error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      <CustomCursor />

      {/* Atmospheric Vignette & Laser Glow */}
      <div className="pointer-events-none absolute inset-0 bg-radial-gradient from-[#c5a46d]/5 via-transparent to-transparent opacity-50" />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#c5a46d]/40 to-transparent" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <span className="text-2xl font-black tracking-[0.3em] font-display text-white">
            NOIR
          </span>
          <span className="block text-[9px] tracking-[0.3em] text-[#c5a46d] uppercase font-mono mt-0.5">
            SECURITY GATEWAY
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 border border-[#c5a46d]/30 bg-[#c5a46d]/5 text-[9px] font-mono text-[#c5a46d] uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RBAC ENFORCED</span>
        </div>
      </header>

      {/* Center Auth Card */}
      <motion.main
        initial={{ opacity: 0, y: 14, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-md w-full mx-auto my-auto py-12"
      >
        <div className="bg-[#0a0a0a] border border-white/15 p-8 sm:p-10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full border border-[#c5a46d]/40 bg-[#c5a46d]/10 flex items-center justify-center mx-auto text-[#c5a46d] mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black uppercase font-display tracking-tight text-white">
              ADMINISTRATOR ACCESS
            </h1>
            <p className="text-xs text-neutral-400 font-mono">
              Restricted management portal for inventory, catalog, categories, and customer orders.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/50 text-xs font-mono text-red-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 font-mono text-xs">
            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-400 block mb-1.5">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@noir-fashion.com"
                className="w-full bg-black border border-white/15 px-4 py-3 text-white focus:outline-none focus:border-[#c5a46d] transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-400 block mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black border border-white/15 px-4 py-3 text-white focus:outline-none focus:border-[#c5a46d] transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-neutral-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-widest uppercase font-mono transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#c5a46d]/15 mt-6 disabled:opacity-50"
            >
              <span>{isLoading ? "Verifying Credentials..." : "Authorize Admin Session"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 text-center">
            <Link
              href="/"
              className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 hover:text-white transition-colors"
            >
              ← Return to Public Customer Storefront
            </Link>
          </div>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[10px] font-mono tracking-widest uppercase text-neutral-600 border-t border-white/5 pt-6">
        <span>NOIR // ENCRYPTED SESSION · RBAC STRICT ISOLATION</span>
      </footer>
    </div>
  );
}
