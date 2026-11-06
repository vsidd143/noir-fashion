"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/currency";
import confetti from "canvas-confetti";
import Link from "next/link";
import { 
  X, 
  CheckCircle, 
  ShieldCheck, 
  Banknote, 
  ArrowRight, 
  Truck, 
  Phone, 
  Check, 
  ShoppingBag,
  Star,
  MapPin,
  Plus
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

type SavedAddress = {
  id: string;
  user_id?: string;
  title: string;
  recipient_name: string;
  phone?: string;
  house_number?: string;
  street_address: string;
  locality?: string;
  landmark?: string;
  city: string;
  state?: string;
  country: string;
  postal_code: string;
  is_default: boolean;
};

export default function CheckoutModal() {
  const { isCheckoutOpen, setIsCheckoutOpen, cart, cartTotal, discountAmount, couponCode, clearCart } = useCart();
  const { user, profile } = useAuth();
  
  const [step, setStep] = useState<"details" | "confirmation">("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [confirmedAddressSnapshot, setConfirmedAddressSnapshot] = useState<string>("");
  const [formError, setFormError] = useState("");

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressSelectionMode, setAddressSelectionMode] = useState<"default" | "saved" | "another">("default");
  const [showSavedListSelector, setShowSavedListSelector] = useState(false);

  // Another Address Form State
  const [anotherForm, setAnotherForm] = useState({
    recipientName: "",
    phone: "",
    email: "",
    houseFlat: "",
    streetLocality: "",
    areaLandmark: "",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "",
    country: "India",
    addressType: "Home",
    choice: "order_only" as "order_only" | "save_to_book",
    makeDefault: false,
    deliveryNotes: "",
  });

  useEffect(() => {
    if (!isCheckoutOpen) return;

    let isMounted = true;
    const fetchAddresses = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("addresses")
          .select("*")
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });

        if (!isMounted) return;
        if (!error && data && data.length > 0) {
          setSavedAddresses(data as SavedAddress[]);
          const def = (data as SavedAddress[]).find((a) => a.is_default) || data[0];
          setSelectedAddressId(def.id);
          setAddressSelectionMode("default");
        } else {
          setSavedAddresses([]);
          setAddressSelectionMode("another");
        }
      } catch {
        if (!isMounted) return;
        setSavedAddresses([]);
        setAddressSelectionMode("another");
      }
    };

    void fetchAddresses();

    if (profile || user) {
      queueMicrotask(() => {
        setAnotherForm((prev) => ({
          ...prev,
          recipientName: profile?.full_name || prev.recipientName,
          phone: profile?.phone || prev.phone,
          email: user?.email || prev.email,
          houseFlat: profile?.house_number || prev.houseFlat,
          streetLocality: profile?.street_address || prev.streetLocality,
          city: profile?.city || prev.city,
          state: profile?.state || prev.state,
          postalCode: profile?.postal_code || prev.postalCode,
        }));
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isCheckoutOpen, user, profile]);

  const defaultAddress = savedAddresses.find((a) => a.is_default) || savedAddresses[0] || null;
  const currentSelectedSaved = savedAddresses.find((a) => a.id === selectedAddressId) || defaultAddress;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (cart.length === 0) return;

    let finalRecipientName = "";
    let finalPhone = "";
    const finalEmail = user?.email || anotherForm.email || "patron@noir.in";
    let finalHouse = "";
    let finalStreet = "";
    let finalLocality = "";
    let finalLandmark = "";
    let finalCity = "Mumbai";
    let finalState = "Maharashtra";
    let finalPostalCode = "400001";
    let finalCountry = "India";
    let finalAddressType = "Home";

    if (addressSelectionMode === "default" && defaultAddress) {
      finalRecipientName = defaultAddress.recipient_name;
      finalPhone = defaultAddress.phone || profile?.phone || "";
      finalHouse = defaultAddress.house_number || "";
      finalStreet = defaultAddress.street_address;
      finalLocality = defaultAddress.locality || "";
      finalLandmark = defaultAddress.landmark || "";
      finalCity = defaultAddress.city;
      finalState = defaultAddress.state || "Maharashtra";
      finalPostalCode = defaultAddress.postal_code;
      finalCountry = defaultAddress.country || "India";
      finalAddressType = defaultAddress.title || "Home";
    } else if (addressSelectionMode === "saved" && currentSelectedSaved) {
      finalRecipientName = currentSelectedSaved.recipient_name;
      finalPhone = currentSelectedSaved.phone || profile?.phone || "";
      finalHouse = currentSelectedSaved.house_number || "";
      finalStreet = currentSelectedSaved.street_address;
      finalLocality = currentSelectedSaved.locality || "";
      finalLandmark = currentSelectedSaved.landmark || "";
      finalCity = currentSelectedSaved.city;
      finalState = currentSelectedSaved.state || "Maharashtra";
      finalPostalCode = currentSelectedSaved.postal_code;
      finalCountry = currentSelectedSaved.country || "India";
      finalAddressType = currentSelectedSaved.title || "Home";
    } else {
      // "another" mode: validate input fields
      if (!anotherForm.recipientName.trim()) {
        setFormError("Please enter recipient's full name.");
        return;
      }
      const cleanPhone = anotherForm.phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        setFormError("Please enter a valid 10-digit Indian mobile number.");
        return;
      }
      const cleanPin = anotherForm.postalCode.replace(/\D/g, "");
      if (cleanPin.length !== 6) {
        setFormError("Please enter a valid 6-digit Indian PIN code.");
        return;
      }
      if (!anotherForm.streetLocality.trim()) {
        setFormError("Please enter street address or locality.");
        return;
      }

      finalRecipientName = anotherForm.recipientName.trim();
      finalPhone = anotherForm.phone.trim();
      finalHouse = anotherForm.houseFlat.trim();
      finalStreet = anotherForm.streetLocality.trim();
      finalLocality = anotherForm.streetLocality.trim();
      finalLandmark = anotherForm.areaLandmark.trim();
      finalCity = anotherForm.city.trim() || "Mumbai";
      finalState = anotherForm.state.trim() || "Maharashtra";
      finalPostalCode = cleanPin;
      finalCountry = "India";
      finalAddressType = anotherForm.addressType || "Home";
    }

    setIsSubmitting(true);

    const generatedOrderNumber = "NOIR-IN-" + Math.floor(100000 + Math.random() * 900000);
    const generatedTracking = "BLUEDART-" + Math.floor(100000 + Math.random() * 900000);
    const finalAmount = cartTotal;

    const fullStreetAddress = [finalHouse, finalStreet, finalLandmark ? `Near: ${finalLandmark}` : ""]
      .filter(Boolean)
      .join(", ");

    // Immutable Address Snapshot for the Order Record
    const addressSnapshot = {
      recipient_name: finalRecipientName,
      phone: finalPhone,
      address: fullStreetAddress,
      house_number: finalHouse || null,
      locality: finalLocality || null,
      landmark: finalLandmark || null,
      city: finalCity,
      state: finalState,
      country: finalCountry,
      postalCode: finalPostalCode,
      addressType: finalAddressType,
    };

    // If customer selected "SAVE THIS ADDRESS TO MY ADDRESS BOOK"
    if (addressSelectionMode === "another" && anotherForm.choice === "save_to_book" && user) {
      try {
        await supabase.from("addresses").insert({
          user_id: user.id,
          title: anotherForm.addressType || "Delivery Destination",
          recipient_name: finalRecipientName,
          phone: finalPhone,
          house_number: finalHouse || null,
          street_address: fullStreetAddress,
          locality: finalLocality || null,
          landmark: finalLandmark || null,
          city: finalCity,
          state: finalState,
          postal_code: finalPostalCode,
          country: "India",
          is_default: anotherForm.makeDefault || savedAddresses.length === 0,
        });
      } catch (err) {
        console.warn("Could not save address to address book:", err);
      }
    }

    const orderPayload = {
      order_number: generatedOrderNumber,
      user_id: user?.id || null,
      customer_name: finalRecipientName,
      customer_email: finalEmail,
      customer_phone: finalPhone,
      shipping_address: addressSnapshot,
      status: "pending",
      payment_method: "Cash on Delivery (COD)",
      payment_status: "pending",
      subtotal: cartTotal + discountAmount,
      discount_amount: discountAmount,
      shipping_fee: 0,
      tax_amount: 0,
      total_amount: finalAmount,
      coupon_code: couponCode || null,
      tracking_number: generatedTracking,
      courier_name: "Blue Dart Express India",
      notes: anotherForm.deliveryNotes || null,
      created_at: new Date().toISOString(),
    };

    // 1. Persist to Supabase Database
    try {
      const { data: dbOrder, error: dbError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      if (!dbError && dbOrder) {
        // Insert itemized order silhouettes
        const itemsToInsert = cart.map((item) => ({
          order_id: dbOrder.id,
          product_name: item.product.name,
          product_image: item.product.images[0] || item.product.thumbnail || "",
          color_name: item.selectedColor.name,
          size: item.selectedSize,
          unit_price: item.product.price,
          quantity: item.quantity,
          total_price: item.product.price * item.quantity,
        }));
        await supabase.from("order_items").insert(itemsToInsert);

        // Atomic inventory deduction
        for (const itm of cart) {
          try {
            await supabase.rpc("decrement_product_stock", {
              p_product_id: itm.product.id,
              p_qty: itm.quantity,
            });
          } catch {
            // fallback direct update if RPC is missing
            try {
              const currentStock = (itm.product as { stock_quantity?: number }).stock_quantity ?? 10;
              await supabase
                .from("products")
                .update({ stock_quantity: Math.max(0, currentStock - itm.quantity) })
                .eq("id", itm.product.id);
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn("Supabase order insert note:", err);
    }

    // 2. Persist to local storage for instant zero-latency UI fallback
    try {
      const existing = localStorage.getItem("noir_local_orders");
      const list = existing ? JSON.parse(existing) : [];
      const localFullOrder = {
        ...orderPayload,
        id: "ord-" + Math.random().toString(36).substring(2, 9),
        items: cart.map((item) => ({
          product_name: item.product.name,
          product_image: item.product.images[0] || "",
          color_name: item.selectedColor.name,
          size: item.selectedSize,
          quantity: item.quantity,
          unit_price: item.product.price,
        })),
      };
      localStorage.setItem("noir_local_orders", JSON.stringify([localFullOrder, ...list]));
    } catch {
      // safe fallback
    }

    setConfirmedTotal(finalAmount);
    setOrderId(generatedOrderNumber);
    setConfirmedAddressSnapshot(`${fullStreetAddress}, ${finalCity}, ${finalState} - ${finalPostalCode}`);
    setIsSubmitting(false);
    setStep("confirmation");

    // Luxury Golden Confetti Celebration
    try {
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#c5a46d", "#ffffff", "#e5d0a1", "#050505"],
      });
    } catch {}

    clearCart();
  };

  const handleClose = () => {
    setIsCheckoutOpen(false);
    setTimeout(() => {
      setStep("details");
      setShowSavedListSelector(false);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/90 backdrop-blur-xl"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl p-6 md:p-10 my-auto z-10 max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-[#c5a46d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {step === "details" ? (
            <div>
              <div className="border-b border-white/10 pb-6 mb-8">
                <span className="text-[10px] tracking-[0.3em] text-[#c5a46d] uppercase font-mono block mb-1">
                  ATELIER INDIA // PAN-INDIA CASH ON DELIVERY
                </span>
                <h2 className="text-2xl md:text-3xl font-black tracking-wider text-white uppercase font-display">
                  Complete Your Acquisition
                </h2>
                <p className="text-xs text-[#a0a0a0] mt-1">
                  Complimentary Blue Dart express courier across all Indian PIN codes. Pay exclusively in cash upon package delivery.
                </p>
              </div>

              {formError && (
                <div className="mb-6 p-3.5 bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono">
                  {formError}
                </div>
              )}

              <form onSubmit={handlePlaceOrder} className="space-y-6">
                {/* 1. Delivery Destination */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-300 font-mono flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-[#c5a46d]" />
                      Delivery Destination (India)
                    </h3>
                    <span className="text-[10px] font-mono text-[#c5a46d] uppercase">
                      Pan-India Express
                    </span>
                  </div>

                  {/* Address Selection Options (Option 1: Default, Option 2: Another) */}
                  {savedAddresses.length > 0 ? (
                    <div className="space-y-3">
                      {/* OPTION 1: USE DEFAULT ADDRESS */}
                      <div
                        onClick={() => {
                          setAddressSelectionMode("default");
                          setShowSavedListSelector(false);
                        }}
                        className={`p-4 border transition-all cursor-pointer relative ${
                          addressSelectionMode === "default"
                            ? "border-[#c5a46d] bg-gradient-to-r from-[#c5a46d]/10 via-black to-[#c5a46d]/5 shadow-lg"
                            : "border-white/10 bg-neutral-950/60 hover:border-white/25"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="addressSelectionOption"
                              checked={addressSelectionMode === "default"}
                              onChange={() => {
                                setAddressSelectionMode("default");
                                setShowSavedListSelector(false);
                              }}
                              className="mt-0.5 accent-[#c5a46d] cursor-pointer"
                            />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-mono uppercase text-white">
                                  {defaultAddress?.title || "Primary Residence"}
                                </span>
                                <span className="px-2 py-0.5 bg-[#c5a46d] text-black text-[9px] font-mono font-bold tracking-widest uppercase flex items-center gap-1 shadow">
                                  <Star className="w-2.5 h-2.5 fill-black" />
                                  DEFAULT ADDRESS
                                </span>
                              </div>
                              <p className="text-xs font-mono text-white font-medium">
                                {defaultAddress?.recipient_name}
                              </p>
                              <p className="text-xs font-mono text-neutral-300 leading-relaxed">
                                {defaultAddress?.house_number && `${defaultAddress.house_number}, `}
                                {defaultAddress?.street_address}
                                {defaultAddress?.locality && `, ${defaultAddress.locality}`}
                                {defaultAddress?.landmark && ` (Near: ${defaultAddress.landmark})`}
                                <br />
                                {defaultAddress?.city}, {defaultAddress?.state || "Maharashtra"} - {defaultAddress?.postal_code}
                              </p>
                              {defaultAddress?.phone && (
                                <p className="text-[11px] font-mono text-[#c5a46d] pt-0.5">
                                  Phone: {defaultAddress.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Switch between multiple saved addresses */}
                        {savedAddresses.length > 1 && (
                          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-neutral-400">
                              {savedAddresses.length} saved addresses in vault
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowSavedListSelector(!showSavedListSelector);
                              }}
                              className="text-[#c5a46d] hover:underline uppercase text-[10px] tracking-wider font-bold"
                            >
                              {showSavedListSelector ? "Hide other addresses" : "Choose different saved address →"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Alternate Saved Address Grid Selector */}
                      {showSavedListSelector && savedAddresses.length > 1 && (
                        <div className="p-3 bg-black/80 border border-white/10 space-y-2 animate-in fade-in">
                          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-2">
                            Select Saved Destination:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {savedAddresses.map((addr) => (
                              <div
                                key={addr.id}
                                onClick={() => {
                                  setSelectedAddressId(addr.id);
                                  setAddressSelectionMode(addr.is_default ? "default" : "saved");
                                }}
                                className={`p-3 border text-xs font-mono transition-all cursor-pointer ${
                                  selectedAddressId === addr.id
                                    ? "border-[#c5a46d] bg-[#c5a46d]/10 text-white"
                                    : "border-white/10 text-neutral-400 hover:text-white hover:border-white/30"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <strong className="text-white uppercase text-[11px]">{addr.title}</strong>
                                  {addr.is_default && (
                                    <span className="text-[9px] text-[#c5a46d] font-bold">DEFAULT</span>
                                  )}
                                </div>
                                <p className="truncate text-white">{addr.recipient_name}</p>
                                <p className="truncate text-[10px] text-neutral-400">
                                  {addr.street_address}, {addr.city} - {addr.postal_code}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* OPTION 2: ANOTHER ADDRESS */}
                      <div
                        onClick={() => {
                          setAddressSelectionMode("another");
                          setShowSavedListSelector(false);
                        }}
                        className={`p-4 border transition-all cursor-pointer ${
                          addressSelectionMode === "another"
                            ? "border-[#c5a46d] bg-neutral-950"
                            : "border-white/10 bg-neutral-950/40 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="addressSelectionOption"
                            checked={addressSelectionMode === "another"}
                            onChange={() => {
                              setAddressSelectionMode("another");
                              setShowSavedListSelector(false);
                            }}
                            className="accent-[#c5a46d] cursor-pointer"
                          />
                          <span className="text-xs font-mono uppercase font-bold text-white tracking-wider flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-[#c5a46d]" />
                            Deliver to Another Address
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Form fields for "another" address or if no saved addresses */}
                  {(addressSelectionMode === "another" || savedAddresses.length === 0) && (
                    <div className="p-4 sm:p-5 bg-black border border-white/15 space-y-4 animate-in fade-in">
                      <span className="text-[10px] font-mono tracking-widest uppercase text-[#c5a46d] block">
                        Enter Delivery Address Details:
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Recipient Full Name *"
                          value={anotherForm.recipientName}
                          onChange={(e) => setAnotherForm({ ...anotherForm, recipientName: e.target.value })}
                          required
                          className="bg-black border border-white/15 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                        />
                        <div className="relative">
                          <input
                            type="tel"
                            placeholder="Mobile (10 digits) *"
                            value={anotherForm.phone}
                            onChange={(e) => setAnotherForm({ ...anotherForm, phone: e.target.value })}
                            required
                            className="w-full bg-black border border-white/15 pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                          />
                          <Phone className="w-3.5 h-3.5 text-[#c5a46d] absolute left-2.5 top-2.5" />
                        </div>
                        <input
                          type="text"
                          placeholder="House / Flat / Suite No. *"
                          value={anotherForm.houseFlat}
                          onChange={(e) => setAnotherForm({ ...anotherForm, houseFlat: e.target.value })}
                          required
                          className="bg-black border border-white/15 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                        />
                        <input
                          type="text"
                          placeholder="Street, Building, Locality, Area *"
                          value={anotherForm.streetLocality}
                          onChange={(e) => setAnotherForm({ ...anotherForm, streetLocality: e.target.value })}
                          required
                          className="bg-black border border-white/15 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                        />
                        <input
                          type="text"
                          placeholder="Landmark (Optional)"
                          value={anotherForm.areaLandmark}
                          onChange={(e) => setAnotherForm({ ...anotherForm, areaLandmark: e.target.value })}
                          className="bg-black border border-white/15 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                        />
                        <input
                          type="text"
                          placeholder="City *"
                          value={anotherForm.city}
                          onChange={(e) => setAnotherForm({ ...anotherForm, city: e.target.value })}
                          required
                          className="bg-black border border-white/15 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                        />
                        <select
                          value={anotherForm.state}
                          onChange={(e) => setAnotherForm({ ...anotherForm, state: e.target.value })}
                          required
                          className="bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st} className="bg-neutral-900 text-white">
                              {st}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="6-Digit PIN Code *"
                          maxLength={6}
                          value={anotherForm.postalCode}
                          onChange={(e) => setAnotherForm({ ...anotherForm, postalCode: e.target.value.replace(/\D/g, "") })}
                          required
                          className="bg-black border border-white/15 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                        />
                      </div>

                      {/* Choices: Use for this order only vs Save to Address Book */}
                      {user && (
                        <div className="pt-2 border-t border-white/10 space-y-2 font-mono text-xs">
                          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                            Address Book Preferences:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className={`p-2.5 border flex items-center gap-2 cursor-pointer transition-all ${
                              anotherForm.choice === "order_only"
                                ? "border-[#c5a46d] bg-[#c5a46d]/10 text-white"
                                : "border-white/10 text-neutral-400 hover:text-white"
                            }`}>
                              <input
                                type="radio"
                                name="addressSaveChoice"
                                checked={anotherForm.choice === "order_only"}
                                onChange={() => setAnotherForm({ ...anotherForm, choice: "order_only", makeDefault: false })}
                                className="accent-[#c5a46d]"
                              />
                              <span className="text-[11px] uppercase">Use for this order only</span>
                            </label>

                            <label className={`p-2.5 border flex items-center gap-2 cursor-pointer transition-all ${
                              anotherForm.choice === "save_to_book"
                                ? "border-[#c5a46d] bg-[#c5a46d]/10 text-white"
                                : "border-white/10 text-neutral-400 hover:text-white"
                            }`}>
                              <input
                                type="radio"
                                name="addressSaveChoice"
                                checked={anotherForm.choice === "save_to_book"}
                                onChange={() => setAnotherForm({ ...anotherForm, choice: "save_to_book" })}
                                className="accent-[#c5a46d]"
                              />
                              <span className="text-[11px] uppercase">Save to my address book</span>
                            </label>
                          </div>

                          {anotherForm.choice === "save_to_book" && (
                            <div className="flex items-center gap-2 pt-1 pl-1">
                              <input
                                type="checkbox"
                                id="makeDefaultCheckoutCheck"
                                checked={anotherForm.makeDefault}
                                onChange={(e) => setAnotherForm({ ...anotherForm, makeDefault: e.target.checked })}
                                className="accent-[#c5a46d] cursor-pointer"
                              />
                              <label htmlFor="makeDefaultCheckoutCheck" className="text-[11px] text-[#c5a46d] cursor-pointer">
                                Set this address as my new primary default address
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delivery Instructions */}
                  <div>
                    <textarea
                      placeholder="Delivery instructions (e.g. Call before arrival, leave at security desk)"
                      value={anotherForm.deliveryNotes}
                      onChange={(e) => setAnotherForm({ ...anotherForm, deliveryNotes: e.target.value })}
                      rows={2}
                      className="w-full bg-black border border-white/15 px-3.5 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d] font-mono"
                    />
                  </div>
                </div>

                {/* 2. Payment Method — Strictly Cash on Delivery (COD) */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-300 font-mono mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Banknote className="w-3.5 h-3.5 text-[#c5a46d]" />
                      Payment Method
                    </span>
                    <span className="text-[10px] text-[#c5a46d] font-mono tracking-widest">
                      PURE CASH ON DELIVERY (COD)
                    </span>
                  </h3>

                  {/* COD Exclusive Box */}
                  <div className="p-4 bg-gradient-to-r from-neutral-950 via-black to-neutral-950 border-2 border-[#c5a46d] space-y-3 relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-[#c5a46d] flex items-center justify-center bg-[#c5a46d]">
                          <Check className="w-3 h-3 text-black stroke-[3]" />
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                            <span>Cash on Delivery (COD)</span>
                          </span>
                          <span className="text-[11px] text-neutral-400 block mt-0.5">
                            Pay in cash to the Blue Dart courier executive upon receiving and inspecting your package.
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono uppercase bg-[#c5a46d]/20 text-[#c5a46d] px-2 py-0.5 border border-[#c5a46d]/40 tracking-wider">
                        ₹0 Due Today
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[10px] font-mono text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Banknote className="w-3 h-3 text-[#c5a46d] shrink-0" />
                        <span>Cash at Door</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Inspect Package First</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3 h-3 text-white shrink-0" />
                        <span>Blue Dart Express</span>
                      </div>
                    </div>
                  </div>

                  {/* Verified Delivery Note */}
                  <div className="mt-2.5 p-3 bg-neutral-950/80 border border-white/10 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-neutral-300 text-[10px]">
                        Zero Upfront Risk · Hand-to-Hand Courier Cash Payment
                      </span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-[#c5a46d]">
                      Pan-India Dispatch
                    </span>
                  </div>
                </div>

                {/* 3. Acquisition Summary & Submit */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-neutral-400">
                      <span>Acquisition Subtotal (Incl. GST):</span>
                      <span>{formatPrice(cartTotal + discountAmount)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[#c5a46d]">
                        <span>VIP Privilege Discount ({couponCode}):</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-neutral-400">
                      <span>Pan-India Blue Dart Express Courier:</span>
                      <span className="text-emerald-400 uppercase text-[10px] tracking-wider">
                        Complimentary (₹0.00)
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-white/10 text-white">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#a0a0a0] block">
                          Total Payable Upon Delivery (Cash on Delivery)
                        </span>
                        <span className="text-[11px] text-emerald-400 font-mono">
                          ₹0.00 due today
                        </span>
                      </div>
                      <span className="text-2xl font-black font-mono text-[#c5a46d]">
                        {formatPrice(cartTotal)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || cart.length === 0}
                    className="w-full py-4 bg-[#c5a46d] hover:bg-[#d6b77e] disabled:opacity-50 text-black font-extrabold text-xs tracking-[0.25em] uppercase transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#c5a46d]/20 mt-4 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">Registering Order Acquisition...</span>
                    ) : (
                      <>
                        <Banknote className="w-4 h-4" />
                        <span>Confirm Order (Cash on Delivery)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-center py-6 space-y-6">
              <div className="w-20 h-20 rounded-full border border-[#c5a46d] bg-[#c5a46d]/10 flex items-center justify-center mx-auto text-[#c5a46d]">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-mono tracking-[0.3em] text-[#c5a46d] uppercase">
                  Acquisition Successfully Registered
                </span>
                <h3 className="text-3xl font-extrabold tracking-wider text-white uppercase font-display mt-2">
                  Welcome to The Atelier
                </h3>
                <p className="text-xs text-neutral-400 mt-2 max-w-md mx-auto">
                  Your bespoke pieces are currently being inspected and serialized in our Mumbai Vault. Our courier executive will contact you prior to delivery.
                </p>
              </div>

              {/* Order Manifest Box */}
              <div className="p-5 bg-neutral-950 border border-[#c5a46d]/30 max-w-md mx-auto font-mono text-xs text-left space-y-2.5">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-neutral-400">Order Acquisition ID:</span>
                  <span className="text-[#c5a46d] font-bold">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Payment Method:</span>
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-[#c5a46d]" />
                    Cash on Delivery (COD)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Amount Due on Delivery:</span>
                  <span className="text-[#c5a46d] font-bold font-mono">
                    {formatPrice(confirmedTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Courier Dispatch:</span>
                  <span className="text-white">Blue Dart Express India</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 text-[11px] text-neutral-400">
                  <span>Destination:</span>
                  <span className="text-right text-white max-w-[240px] truncate">
                    {confirmedAddressSnapshot || "Direct Delivery Destination"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/user"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>View in Client Vault</span>
                </Link>

                <button
                  onClick={handleClose}
                  className="w-full sm:w-auto px-6 py-3.5 bg-neutral-900 border border-white/15 text-white hover:border-[#c5a46d] font-extrabold text-xs tracking-[0.2em] uppercase transition-colors cursor-pointer"
                >
                  Return to Runway
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
}
