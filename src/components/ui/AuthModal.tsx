"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Phone, 
  MapPin 
} from "lucide-react";

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authView,
    setAuthView,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithMagicLink,
    resetPasswordForEmail,
  } = useAuth();

  // Clean form state — no pre-filled test emails or names
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [houseFlat, setHouseFlat] = useState("");
  const [streetLocality, setStreetLocality] = useState("");
  const [areaLandmark, setAreaLandmark] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [state, setState] = useState("Maharashtra");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFormFields = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setPhone("");
    setHouseFlat("");
    setStreetLocality("");
    setAreaLandmark("");
    setCity("Mumbai");
    setState("Maharashtra");
    setPostalCode("");
    setCountry("India");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSwitchView = (view: "login" | "register" | "forgot" | "magic") => {
    setErrorMsg("");
    setSuccessMsg("");
    setAuthView(view);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Validate registration fields
    if (authView === "register") {
      if (password.length < 6) {
        setErrorMsg("Password must contain at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match. Please re-enter.");
        return;
      }
      const digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        setErrorMsg("Please provide a valid 10-digit Indian mobile number.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (authView === "login") {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          closeAuthModal();
          resetFormFields();
        }
      } else if (authView === "register") {
        const { error } = await signUpWithEmail(email.trim(), password, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          houseFlat: houseFlat.trim(),
          streetLocality: streetLocality.trim(),
          areaLandmark: areaLandmark.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
        });

        if (error) {
          if (error.message.toLowerCase().includes("database error saving new user")) {
            setErrorMsg("Database trigger update required: Run the quick fix SQL script in your Supabase SQL Editor to activate customer registration.");
          } else {
            setErrorMsg(error.message);
          }
        } else {
          setSuccessMsg("Account successfully registered! You can now sign in.");
          setTimeout(() => {
            setAuthView("login");
          }, 1800);
        }
      } else if (authView === "magic") {
        const { error } = await signInWithMagicLink(email.trim());
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Magic encrypted login link dispatched to your email.");
        }
      } else if (authView === "forgot") {
        const { error } = await resetPasswordForEmail(email.trim());
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Password reset link has been dispatched to your email.");
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            closeAuthModal();
            resetFormFields();
          }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className={`relative w-full ${
            authView === "register" ? "max-w-xl" : "max-w-md"
          } bg-[#0a0a0a] border border-white/10 p-6 md:p-8 shadow-2xl z-10 my-auto max-h-[92vh] overflow-y-auto transition-all`}
        >
          {/* Close Button */}
          <button
            onClick={() => {
              closeAuthModal();
              resetFormFields();
            }}
            className="absolute top-5 right-5 p-2 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-[#c5a46d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#c5a46d] block mb-1">
              NOIR STUDIO // ACCESS
            </span>
            <h3 className="text-2xl font-black uppercase tracking-wider text-white font-display">
              {authView === "login" && "Client Sign In"}
              {authView === "register" && "Create Account"}
              {authView === "magic" && "Magic Link Access"}
              {authView === "forgot" && "Recover Password"}
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              {authView === "login" && "Sign in with your email and password to access your acquisitions and vault."}
              {authView === "register" && "Register your client profile for private runway access, saved addresses, and white-glove delivery."}
              {authView === "magic" && "Receive an encrypted one-time login link in your email."}
              {authView === "forgot" && "Enter your email to receive password reset instructions."}
            </p>
          </div>

          {/* Error & Success Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google OAuth Quick Button */}
          {(authView === "login" || authView === "register") && (
            <div className="mb-6">
              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full py-3 px-4 bg-neutral-900 border border-white/15 hover:border-white text-xs font-mono tracking-wider uppercase text-white transition-all flex items-center justify-center gap-3 group"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-5">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0a0a0a] px-3 text-[10px] font-mono text-neutral-500 uppercase tracking-widest absolute">
                  OR WITH CREDENTIALS
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* VIEW: REGISTER */}
            {authView === "register" && (
              <>
                {/* 1. Full Name */}
                <div>
                  <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aditya Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-black border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                    />
                  </div>
                </div>

                {/* 2. Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="client@noir-studio.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                      Mobile Phone (India) *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile (e.g. 9876543210)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-black border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. House / Flat & Street / Locality */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                      House / Flat / Building No. *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Flat 402, Signature Tower"
                      value={houseFlat}
                      onChange={(e) => setHouseFlat(e.target.value)}
                      className="w-full bg-black border border-white/15 px-3 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                      Street / Road / Locality *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Linking Road, Bandra West"
                      value={streetLocality}
                      onChange={(e) => setStreetLocality(e.target.value)}
                      className="w-full bg-black border border-white/15 px-3 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                    />
                  </div>
                </div>

                {/* 4. Area / Landmark */}
                <div>
                  <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                    Area / Landmark (Optional)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Near Shoppers Stop"
                      value={areaLandmark}
                      onChange={(e) => setAreaLandmark(e.target.value)}
                      className="w-full bg-black border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                    />
                  </div>
                </div>

                {/* 5. City, State, PIN Code, Country */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-black border border-white/15 px-3 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                      State *
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-black border border-white/15 px-2 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d] cursor-pointer"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="400050"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-black border border-white/15 px-3 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      disabled
                      value="India"
                      className="w-full bg-neutral-900 border border-white/10 px-3 py-2.5 text-xs text-neutral-400 font-mono cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* 5. Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                      Password (min 6 chars) *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-black border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* VIEW: LOGIN */}
            {authView === "login" && (
              <>
                <div>
                  <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="client@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSwitchView("forgot")}
                      className="text-[10px] font-mono text-[#c5a46d] hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                    />
                  </div>
                </div>
              </>
            )}

            {/* VIEW: MAGIC LINK / FORGOT PASSWORD */}
            {(authView === "magic" || authView === "forgot") && (
              <div>
                <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="client@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#c5a46d] hover:bg-[#d4b57e] disabled:opacity-50 text-black font-extrabold text-xs tracking-[0.25em] uppercase transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-[#c5a46d]/15 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="animate-pulse">Authorizing...</span>
              ) : (
                <>
                  <span>
                    {authView === "login" && "Sign In to Vault"}
                    {authView === "register" && "Create Client Account"}
                    {authView === "magic" && "Dispatch Magic Link"}
                    {authView === "forgot" && "Reset Password"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center space-y-2 text-xs font-mono">
            {authView === "login" ? (
              <>
                <p className="text-neutral-400">
                  New to NOIR?{" "}
                  <button
                    onClick={() => handleSwitchView("register")}
                    className="text-[#c5a46d] hover:underline font-bold"
                  >
                    Create Account
                  </button>
                </p>
                <button
                  onClick={() => handleSwitchView("magic")}
                  className="text-neutral-500 hover:text-white text-[11px]"
                >
                  Sign in with Magic Link
                </button>
              </>
            ) : (
              <p className="text-neutral-400">
                Already have an account?{" "}
                <button
                  onClick={() => handleSwitchView("login")}
                  className="text-[#c5a46d] hover:underline font-bold"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
}
