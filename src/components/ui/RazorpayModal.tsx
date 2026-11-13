"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/currency";
import {
  X,
  QrCode,
  CreditCard,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  Lock,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react";

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  onPaymentSuccess: (details: { paymentId: string; method: string }) => void;
  onPaymentFailure: (errMsg: string) => void;
}

export default function RazorpayModal({
  isOpen,
  onClose,
  amount,
  orderNumber,
  customerName,
  customerPhone,
  customerEmail,
  onPaymentSuccess,
  onPaymentFailure,
}: RazorpayModalProps) {
  const [activeTab, setActiveTab] = useState<"scanner" | "upi" | "card">("scanner");
  const [isProcessing, setIsProcessing] = useState(false);

  // UPI State
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>("gpay");
  const [customVpa, setCustomVpa] = useState<string>("");

  // Card State
  const [cardNumber, setCardNumber] = useState<string>("4532 8921 7843 9021");
  const [cardExpiry, setCardExpiry] = useState<string>("08/29");
  const [cardCvv, setCardCvv] = useState<string>("784");
  const [cardHolder, setCardHolder] = useState<string>(customerName || "NOIR PATRON");

  const handleSimulatePayment = (methodName: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const generatedPayId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      onPaymentSuccess({
        paymentId: generatedPayId,
        method: methodName,
      });
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="razorpay-overlay" className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            key="razorpay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isProcessing) onClose();
            }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Razorpay Gateway Modal Dialog */}
          <motion.div
            key="razorpay-dialog"
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-lg bg-[#FAF8F5] border border-[#E5E0D8] shadow-2xl rounded-[4px] overflow-hidden my-auto z-10 text-[#161616]"
          >
          {/* Header Bar */}
          <div className="bg-[#1A3B8B] text-white p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#1A3B8B] font-bold font-mono text-sm shadow-xs">
                RZP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-headline font-semibold uppercase tracking-wider text-white">
                    Razorpay Secure Checkout
                  </h3>
                  <span className="text-[9px] font-mono uppercase bg-white/20 text-white px-1.5 py-0.5 rounded-[2px]">
                    256-Bit SSL
                  </span>
                </div>
                <p className="text-[11px] font-mono text-white/80">
                  NOIR Studio · Order #{orderNumber}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
              title="Cancel payment"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Amount Ribbon */}
          <div className="bg-[#EFECE6] px-5 py-3 border-b border-[#E5E0D8] flex items-center justify-between text-xs font-mono">
            <span className="text-[#6E6D68] uppercase">Total Payable:</span>
            <span className="text-base font-bold text-[#1A3B8B]">
              {formatPrice(amount)}
            </span>
          </div>

          {/* Payment Method Tabs */}
          <div className="grid grid-cols-3 border-b border-[#E5E0D8] bg-white text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab("scanner")}
              className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
                activeTab === "scanner"
                  ? "border-[#1A3B8B] text-[#1A3B8B] font-bold bg-[#FAF8F5]"
                  : "border-transparent text-[#6E6D68] hover:text-[#161616]"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QR Scanner</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("upi")}
              className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
                activeTab === "upi"
                  ? "border-[#1A3B8B] text-[#1A3B8B] font-bold bg-[#FAF8F5]"
                  : "border-transparent text-[#6E6D68] hover:text-[#161616]"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>UPI Apps</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("card")}
              className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
                activeTab === "card"
                  ? "border-[#1A3B8B] text-[#1A3B8B] font-bold bg-[#FAF8F5]"
                  : "border-transparent text-[#6E6D68] hover:text-[#161616]"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Cards</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-5 sm:p-6 space-y-5">
            {/* 1. QR CODE SCANNER TAB */}
            {activeTab === "scanner" && (
              <div className="space-y-4 text-center">
                <div className="space-y-1">
                  <h4 className="text-sm font-headline font-semibold text-[#161616]">
                    Scan QR Code with any UPI App
                  </h4>
                  <p className="text-xs font-body text-[#6E6D68]">
                    Google Pay, PhonePe, Paytm, BHIM, Cred or your bank app
                  </p>
                </div>

                {/* Interactive QR Code Frame */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto p-3 bg-white border-2 border-[#1A3B8B] rounded-[4px] shadow-sm flex items-center justify-center overflow-hidden group">
                  {/* Visual QR Code SVG Pattern */}
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full text-[#161616]"
                    fill="currentColor"
                  >
                    {/* Top-Left Finder Marker */}
                    <rect x="5" y="5" width="28" height="28" fill="#161616" />
                    <rect x="9" y="9" width="20" height="20" fill="white" />
                    <rect x="13" y="13" width="12" height="12" fill="#161616" />

                    {/* Top-Right Finder Marker */}
                    <rect x="67" y="5" width="28" height="28" fill="#161616" />
                    <rect x="71" y="9" width="20" height="20" fill="white" />
                    <rect x="75" y="13" width="12" height="12" fill="#161616" />

                    {/* Bottom-Left Finder Marker */}
                    <rect x="5" y="67" width="28" height="28" fill="#161616" />
                    <rect x="9" y="71" width="20" height="20" fill="white" />
                    <rect x="13" y="75" width="12" height="12" fill="#161616" />

                    {/* Decorative Authenticity Data Matrix Blocks */}
                    <rect x="38" y="8" width="8" height="8" fill="#1A3B8B" />
                    <rect x="50" y="8" width="12" height="8" fill="#161616" />
                    <rect x="38" y="20" width="14" height="6" fill="#161616" />
                    <rect x="54" y="20" width="8" height="12" fill="#1A3B8B" />

                    <rect x="8" y="38" width="8" height="8" fill="#161616" />
                    <rect x="20" y="38" width="12" height="12" fill="#1A3B8B" />
                    <rect x="8" y="50" width="8" height="12" fill="#161616" />

                    {/* Center Core */}
                    <rect x="38" y="38" width="24" height="24" fill="#EFECE6" />
                    <circle cx="50" cy="50" r="8" fill="#1A3B8B" />
                    <rect x="47" y="45" width="6" height="10" fill="white" />

                    {/* Bottom-Right Data Payload Area */}
                    <rect x="38" y="67" width="10" height="10" fill="#161616" />
                    <rect x="52" y="67" width="10" height="10" fill="#1A3B8B" />
                    <rect x="67" y="38" width="10" height="10" fill="#1A3B8B" />
                    <rect x="81" y="38" width="12" height="10" fill="#161616" />
                    <rect x="67" y="52" width="26" height="8" fill="#161616" />
                    <rect x="67" y="65" width="12" height="12" fill="#161616" />
                    <rect x="82" y="65" width="11" height="12" fill="#1A3B8B" />
                    <rect x="67" y="80" width="26" height="13" fill="#161616" />
                    <rect x="38" y="81" width="24" height="12" fill="#1A3B8B" />
                  </svg>

                  {/* Animated Scanner Laser Beam */}
                  <div className="absolute inset-x-2 top-0 h-1 bg-gradient-to-r from-transparent via-[#1A3B8B] to-transparent shadow-[0_0_8px_#1A3B8B] animate-[scan_2.5s_ease-in-out_infinite]" />
                </div>

                {/* Verified Apps Icons Strip */}
                <div className="flex items-center justify-center gap-2 pt-1 text-[10px] font-mono text-[#6E6D68]">
                  <span className="px-2 py-0.5 bg-white border border-[#E5E0D8] rounded-[2px]">GPay</span>
                  <span className="px-2 py-0.5 bg-white border border-[#E5E0D8] rounded-[2px]">PhonePe</span>
                  <span className="px-2 py-0.5 bg-white border border-[#E5E0D8] rounded-[2px]">Paytm</span>
                  <span className="px-2 py-0.5 bg-white border border-[#E5E0D8] rounded-[2px]">BHIM</span>
                  <span className="px-2 py-0.5 bg-white border border-[#E5E0D8] rounded-[2px]">Cred</span>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => handleSimulatePayment("Razorpay (UPI QR Scanner)")}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-[#1A3B8B] hover:bg-[#153070] text-white font-medium text-xs tracking-wider uppercase font-mono transition-all rounded-[2px] shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="animate-pulse">Authorizing Scanner Payment...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm QR Payment · {formatPrice(amount)}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 2. UPI APPS & VPA TAB */}
            {activeTab === "upi" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-headline font-semibold text-[#161616]">
                    Pay with UPI App or ID
                  </h4>
                  <p className="text-xs font-body text-[#6E6D68]">
                    Direct instant authorization from your mobile banking app
                  </p>
                </div>

                {/* Quick App Selectors */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "gpay", label: "Google Pay" },
                    { id: "phonepe", label: "PhonePe" },
                    { id: "paytm", label: "Paytm UPI" },
                    { id: "cred", label: "Cred UPI" },
                  ].map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedUpiApp(app.id)}
                      className={`p-3 border rounded-[2px] text-xs font-mono text-center transition-all cursor-pointer ${
                        selectedUpiApp === app.id
                          ? "border-[#1A3B8B] bg-[#1A3B8B]/10 text-[#1A3B8B] font-bold shadow-xs"
                          : "border-[#E5E0D8] bg-white text-[#161616] hover:border-[#1A3B8B]"
                      }`}
                    >
                      {app.label}
                    </button>
                  ))}
                </div>

                {/* Custom VPA Input */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] font-mono uppercase text-[#6E6D68] block">
                    Or Enter your UPI ID (VPA):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. mobile@upi or name@okhdfcbank"
                      value={customVpa}
                      onChange={(e) => setCustomVpa(e.target.value)}
                      className="flex-1 bg-white border border-[#E5E0D8] px-3.5 py-2.5 text-xs text-[#161616] placeholder-[#A09D96] focus:outline-none focus:border-[#1A3B8B] font-mono rounded-[2px]"
                    />
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() =>
                    handleSimulatePayment(
                      `Razorpay (UPI: ${customVpa ? customVpa : selectedUpiApp.toUpperCase()})`
                    )
                  }
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-[#1A3B8B] hover:bg-[#153070] text-white font-medium text-xs tracking-wider uppercase font-mono transition-all rounded-[2px] shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
                >
                  {isProcessing ? (
                    <span className="animate-pulse">Connecting to UPI Network...</span>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      <span>Authorize UPI Payment · {formatPrice(amount)}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 3. CREDIT / DEBIT CARDS TAB */}
            {activeTab === "card" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-headline font-semibold text-[#161616]">
                    Credit or Debit Card
                  </h4>
                  <p className="text-xs font-body text-[#6E6D68]">
                    Visa, MasterCard, RuPay, Diners Club & American Express
                  </p>
                </div>

                {/* Visual Card Form */}
                <div className="p-4 bg-gradient-to-br from-[#161616] to-[#262626] text-white rounded-[4px] shadow-md space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#c5a46d] font-bold">NOIR PLATINUM</span>
                    <span className="text-white/60">DEBIT / CREDIT</span>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono uppercase text-white/50 block">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      maxLength={19}
                      className="w-full bg-transparent border-b border-white/20 py-1 text-sm font-mono tracking-widest text-white focus:outline-none focus:border-[#1A3B8B]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[9px] font-mono uppercase text-white/50 block">
                        Valid Thru
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        maxLength={5}
                        className="w-full bg-transparent border-b border-white/20 py-1 text-xs font-mono tracking-wider text-white focus:outline-none focus:border-[#1A3B8B]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono uppercase text-white/50 block">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        maxLength={4}
                        className="w-full bg-transparent border-b border-white/20 py-1 text-xs font-mono tracking-widest text-white focus:outline-none focus:border-[#1A3B8B]"
                      />
                    </div>
                  </div>
                </div>

                {/* Cardholder Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-[#6E6D68] block">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] px-3.5 py-2.5 text-xs text-[#161616] uppercase font-mono focus:outline-none focus:border-[#1A3B8B] rounded-[2px]"
                  />
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => handleSimulatePayment("Razorpay (Card Payment)")}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-[#1A3B8B] hover:bg-[#153070] text-white font-medium text-xs tracking-wider uppercase font-mono transition-all rounded-[2px] shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
                >
                  {isProcessing ? (
                    <span className="animate-pulse">Processing Card Payment...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay {formatPrice(amount)} with Card</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Footer Trust Indicators */}
            <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between text-[10px] font-mono text-[#6E6D68]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>PCI-DSS Level 1 Certified</span>
              </div>
              <span className="text-[#1A3B8B] font-semibold">Razorpay India</span>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
}

