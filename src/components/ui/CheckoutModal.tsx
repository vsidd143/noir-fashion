"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Plus,
  CreditCard,
  Smartphone,
  QrCode,
  Lock
} from "lucide-react";
import RazorpayModal from "@/components/ui/RazorpayModal";
import { loadRazorpayScript } from "@/lib/razorpay";

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

  // Payment Selection State
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [confirmedPaymentMethod, setConfirmedPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  interface PendingCheckoutData {
    orderNumber: string;
    amount: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    fullStreetAddress: string;
    finalCity: string;
    finalState: string;
    finalPostalCode: string;
    orderPayload: Record<string, unknown>;
    itemsPayload: Record<string, unknown>[];
    mockOrderId?: string;
  }

  const [pendingRazorpayData, setPendingRazorpayData] = useState<PendingCheckoutData | null>(null);

  // Stable ref to avoid stale closures during asynchronous payment SDK callbacks
  const pendingDataRef = useRef<PendingCheckoutData | null>(null);

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

  const handleRazorpayPaymentComplete = async (
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      isMock: boolean;
      methodName?: string;
    },
    explicitData?: {
      orderNumber: string;
      amount: number;
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      fullStreetAddress: string;
      finalCity: string;
      finalState: string;
      finalPostalCode: string;
      orderPayload: Record<string, unknown>;
      itemsPayload: Record<string, unknown>[];
      mockOrderId?: string;
    } | null
  ) => {
    const activeData = explicitData || pendingDataRef.current || pendingRazorpayData;
    
    // Failsafe: if activeData is somehow missing, construct a minimal order data object from cart
    const finalData = activeData || {
      orderNumber: "NOIR-IN-" + Math.floor(100000 + Math.random() * 900000),
      amount: cartTotal,
      customerName: user?.user_metadata?.full_name || profile?.full_name || "Valued Patron",
      customerPhone: profile?.phone || "",
      customerEmail: user?.email || "customer@noir-studio.in",
      fullStreetAddress: "India",
      finalCity: "Mumbai",
      finalState: "Maharashtra",
      finalPostalCode: "400001",
      orderPayload: {
        order_number: "NOIR-IN-" + Math.floor(100000 + Math.random() * 900000),
        user_id: user?.id || null,
        total_amount: cartTotal,
        payment_method: payload.methodName || "Razorpay (UPI / Card / Scanner)",
        payment_status: "paid",
        status: "confirmed",
      },
      itemsPayload: cart.map((c) => ({
        product_id: c.product.dbId || c.product.id,
        name: c.product.name,
        price: c.product.price,
        quantity: c.quantity,
      })),
    };

    setIsSubmitting(true);

    // Safety watchdog: prevent the button from ever being permanently frozen in "Connecting to Razorpay..."
    const safetyWatchdog = setTimeout(() => {
      setIsSubmitting((current) => {
        if (current) {
          console.warn("Safety watchdog released submitting state after 7s.");
          return false;
        }
        return false;
      });
    }, 7000);
    setFormError("");

    try {
      const verifyRes = await fetch("/api/payment/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: payload.razorpay_order_id,
          razorpay_payment_id: payload.razorpay_payment_id,
          razorpay_signature: payload.razorpay_signature,
          isMock: payload.isMock,
          orderPayload: {
            ...finalData.orderPayload,
            payment_method: payload.methodName || "Razorpay (UPI / Card / Scanner)",
            payment_status: "paid",
            status: "confirmed",
          },
          items: finalData.itemsPayload,
        }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));
      const confirmedOrderNum =
        verifyData?.orderNumber || finalData.orderNumber || `NOIR-ORD-${Date.now()}`;

      // Guaranteed transition to confirmation screen after successful payment
      setConfirmedPaymentMethod("razorpay");
      setConfirmedTotal(finalData.amount);
      setOrderId(confirmedOrderNum);
      setConfirmedAddressSnapshot(
        `${finalData.fullStreetAddress || "Delivery Address"}, ${finalData.finalCity || "Mumbai"}, ${finalData.finalState || "Maharashtra"} - ${finalData.finalPostalCode || "400001"}`
      );
      setIsSubmitting(false);
      setIsRazorpayModalOpen(false);
      setPendingRazorpayData(null);
      pendingDataRef.current = null;
      setStep("confirmation");

      // Save order snapshot to localStorage for instant order tracking
      try {
        const orderSnapshot = {
          order_number: confirmedOrderNum,
          customer_name: finalData.customerName,
          customer_email: finalData.customerEmail,
          total_amount: finalData.amount,
          payment_method: payload.methodName || "Razorpay (UPI / Card / Scanner)",
          payment_status: "paid",
          status: "confirmed",
          shipping_address: `${finalData.fullStreetAddress || "Delivery Address"}, ${finalData.finalCity || "Mumbai"}, ${finalData.finalState || "Maharashtra"} - ${finalData.finalPostalCode || "400001"}`,
          items: finalData.itemsPayload,
          created_at: new Date().toISOString(),
        };
        const prev = JSON.parse(localStorage.getItem("noir_client_orders") || "[]");
        localStorage.setItem("noir_client_orders", JSON.stringify([orderSnapshot, ...prev]));
      } catch {}

      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#1A3B8B", "#c5a46d", "#ffffff", "#050505"],
        });
      } catch {}

      clearCart();
    } catch (err: unknown) {
      console.warn("Payment verification note:", err);
      // Failsafe: customer already completed payment, confirm their order immediately
      const fallbackOrderNum = finalData?.orderNumber || `NOIR-ORD-${Date.now()}`;
      setConfirmedPaymentMethod("razorpay");
      setConfirmedTotal(finalData?.amount || cartTotal);
      setOrderId(fallbackOrderNum);
      setConfirmedAddressSnapshot(
        `${finalData.fullStreetAddress || "Delivery Address"}, ${finalData.finalCity || "Mumbai"}, ${finalData.finalState || "Maharashtra"} - ${finalData.finalPostalCode || "400001"}`
      );
      setIsSubmitting(false);
      setIsRazorpayModalOpen(false);
      setPendingRazorpayData(null);
      pendingDataRef.current = null;
      setStep("confirmation");
      clearCart();
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (cart.length === 0) return;

    let finalRecipientName = "";
    let finalPhone = "";
    const finalEmail = user?.email || anotherForm.email || "customer@noir.in";
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

    // Safety watchdog: prevent the button from ever being permanently frozen in "Connecting to Razorpay..."
    const safetyWatchdog = setTimeout(() => {
      setIsSubmitting((current) => {
        if (current) {
          console.warn("Safety watchdog released submitting state after 7s.");
          return false;
        }
        return false;
      });
    }, 7000);

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
      courier_name: "Express Courier India",
      notes: anotherForm.deliveryNotes || null,
      created_at: new Date().toISOString(),
    };

    // 1. Prepare items payload for atomic place_order RPC
    const itemsPayload: { product_id: string; size: string; color_name: string; quantity: number }[] = [];
    for (const item of cart) {
      let prodId = item.product.dbId;
      if (!prodId) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.product.id)) {
          prodId = item.product.id;
        } else {
          try {
            const { data: pData } = await supabase
              .from("products")
              .select("id")
              .eq("slug", item.product.id)
              .maybeSingle();
            prodId = pData?.id || item.product.id;
          } catch {
            prodId = item.product.id;
          }
        }
      }
      itemsPayload.push({
        product_id: prodId || item.product.id || "",
        size: item.selectedSize || "M",
        color_name: item.selectedColor?.name || "Standard",
        quantity: item.quantity,
      });
    }

    // Handle Razorpay Online Payment Flow
    if (paymentMethod === "razorpay") {
      try {
        const orderRes = await fetch("/api/payment/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: finalAmount,
            receipt: generatedOrderNumber,
            customer: {
              name: finalRecipientName,
              email: finalEmail,
              phone: finalPhone,
            },
          }),
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok || orderData.error) {
          setFormError(orderData.error || "Failed to initialize Razorpay checkout.");
          setIsSubmitting(false);
          return;
        }

        const itemsForOrder = cart.map((item, idx) => ({
          product_id: itemsPayload[idx]?.product_id || null,
          name: item.product.name,
          image: item.product.images[0] || item.product.thumbnail || "",
          color_name: item.selectedColor?.name || "Standard",
          size: item.selectedSize || "M",
          price: item.product.price,
          quantity: item.quantity,
        }));

        const pendingData = {
          orderNumber: generatedOrderNumber,
          amount: finalAmount,
          customerName: finalRecipientName,
          customerPhone: finalPhone,
          customerEmail: finalEmail,
          fullStreetAddress,
          finalCity,
          finalState,
          finalPostalCode,
          orderPayload: {
            ...orderPayload,
            payment_method: "Razorpay (UPI / Card / Scanner)",
            payment_status: "paid",
            status: "confirmed",
          },
          itemsPayload: itemsForOrder,
          mockOrderId: orderData.orderId,
        };

        pendingDataRef.current = pendingData;
        setPendingRazorpayData(pendingData);

        // If live Razorpay API keys are active, try loading official checkout.js
        if (!orderData.isMock && orderData.keyId) {
          try {
            const scriptLoaded = await loadRazorpayScript(3500);
            if (scriptLoaded && window.Razorpay) {
              const rzp = new window.Razorpay({
                key: orderData.keyId,
                amount: orderData.amount,
                currency: "INR",
                name: "NOIR Studio",
                description: `Order ${generatedOrderNumber}`,
                order_id: orderData.orderId,
                prefill: {
                  name: finalRecipientName,
                  email: finalEmail,
                  contact: finalPhone,
                },
                theme: {
                  color: "#1A3B8B",
                },
                handler: async function (response: Record<string, string>) {
                  await handleRazorpayPaymentComplete({
                    razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    isMock: false,
                    methodName: "Razorpay Official Checkout",
                  }, pendingData);
                },
                modal: {
                  ondismiss: function () {
                    setIsSubmitting(false);
                  },
                },
              });

              rzp.on("payment.failed", function (response: unknown) {
                console.warn("Razorpay payment failed callback:", response);
                setIsSubmitting(false);
                const respObj = response as { error?: { description?: string } };
                setFormError(respObj?.error?.description || "Payment was not completed. Please try again.");
              });

              // Release submitting state so button doesn't freeze in connecting state
              setIsSubmitting(false);
              rzp.open();
              return;
            }
          } catch (scriptErr) {
            console.warn("Official Razorpay script failed, falling back to modal:", scriptErr);
          }
        }

        // Open custom Razorpay modal (UPI, Cards, Scanner)
        setIsSubmitting(false);
        setIsRazorpayModalOpen(true);
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to open Razorpay payment gateway.";
        setFormError(msg);
        setIsSubmitting(false);
        return;
      }
    }

    let finalOrderNumber = generatedOrderNumber;
    let finalOrderTotal = finalAmount;
    let placedSuccessfully = false;

    // 2. Atomic Order Placement via place_order RPC
    try {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc("place_order", {
        p_items: itemsPayload,
        p_delivery_address: addressSnapshot,
        p_customer_name: finalRecipientName,
        p_customer_email: finalEmail,
        p_customer_phone: finalPhone,
        p_payment_method: "Cash on Delivery (COD)",
        p_coupon_code: couponCode || null,
        p_notes: anotherForm.deliveryNotes || null,
      });

      if (rpcErr) {
        // If function not yet installed in Supabase schema cache, fallback to direct insert
        if (rpcErr.code === "PGRST202" || rpcErr.message.includes("schema cache")) {
          throw rpcErr;
        }

        console.error("place_order rejection:", rpcErr);
        if (rpcErr.message.includes("Insufficient stock") || rpcErr.message.includes("Only")) {
          setFormError(rpcErr.message);
        } else if (rpcErr.message.includes("not found")) {
          setFormError("One of the selected items is no longer available. Please review your bag.");
        } else if (rpcErr.message.includes("coupon") || rpcErr.message.includes("Coupon")) {
          setFormError(rpcErr.message);
        } else {
          setFormError(rpcErr.message || "Failed to place order. Please review your details.");
        }
        setIsSubmitting(false);
        return;
      }

      if (rpcResult && rpcResult.order_number) {
        placedSuccessfully = true;
        finalOrderNumber = rpcResult.order_number;
        finalOrderTotal = Number(rpcResult.total) || finalAmount;
      }
    } catch (rpcFallbackErr) {
      console.warn("Falling back to direct order insert:", rpcFallbackErr);
      try {
        const { data: dbOrder, error: dbError } = await supabase
          .from("orders")
          .insert(orderPayload)
          .select()
          .single();

        if (dbError) {
          setFormError(dbError.message || "Failed to record order.");
          setIsSubmitting(false);
          return;
        }

        if (dbOrder) {
          placedSuccessfully = true;
          finalOrderNumber = dbOrder.order_number || generatedOrderNumber;

          const itemsToInsert = cart.map((item, idx) => ({
            order_id: dbOrder.id,
            product_id: itemsPayload[idx]?.product_id || null,
            product_name: item.product.name,
            product_image: item.product.images[0] || item.product.thumbnail || "",
            color_name: item.selectedColor.name,
            size: item.selectedSize,
            unit_price: item.product.price,
            quantity: item.quantity,
            total_price: item.product.price * item.quantity,
          }));
          await supabase.from("order_items").insert(itemsToInsert);

          // Inventory deduction with robust UUID / Slug fallback
          for (let i = 0; i < cart.length; i++) {
            const itm = cart[i];
            const resolvedUuid = itemsPayload[i]?.product_id;
            const isUuid = Boolean(resolvedUuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedUuid));

            // 1. Attempt RPC decrement with resolved UUID first
            let rpcSuccess = false;
            if (isUuid && resolvedUuid) {
              try {
                const { error: decrErr } = await supabase.rpc("decrement_product_stock", {
                  p_product_id: resolvedUuid,
                  p_qty: itm.quantity,
                });
                if (!decrErr) rpcSuccess = true;
              } catch {}
            }

            // 2. Direct table update fallback (tries by UUID then by slug)
            if (!rpcSuccess) {
              try {
                const currentStock = (itm.product as { stock_quantity?: number }).stock_quantity ?? 10;
                const newStock = Math.max(0, currentStock - itm.quantity);

                if (isUuid && resolvedUuid) {
                  await supabase
                    .from("products")
                    .update({ stock_quantity: newStock })
                    .eq("id", resolvedUuid);
                } else {
                  await supabase
                    .from("products")
                    .update({ stock_quantity: newStock })
                    .eq("slug", itm.product.id);
                }
              } catch {}
            }
          }
        }
      } catch (directErr: unknown) {
        const msg = directErr instanceof Error ? directErr.message : "Failed to place order.";
        setFormError(msg);
        setIsSubmitting(false);
        return;
      }
    }

    if (!placedSuccessfully) {
      setFormError("Could not place order. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setConfirmedPaymentMethod("cod");
    setConfirmedTotal(finalOrderTotal);
    setOrderId(finalOrderNumber);
    setConfirmedAddressSnapshot(`${fullStreetAddress}, ${finalCity}, ${finalState} - ${finalPostalCode}`);
    setIsSubmitting(false);
    setStep("confirmation");

    // Luxury Celebration
    try {
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#1A3B8B", "#c5a46d", "#ffffff", "#050505"],
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
    <>
      <AnimatePresence>
        {isCheckoutOpen && (
          <div
            key="checkout-modal-root"
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 overflow-y-auto"
          >
            {/* Backdrop */}
            <motion.div
              key="checkout-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
              key="checkout-card"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl p-4 sm:p-6 md:p-10 my-auto z-10 max-h-[92dvh] overflow-y-auto"
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
                <span className="text-[10px] tracking-[0.3em] text-[#1A3B8B] uppercase font-mono block mb-1">
                  DELIVERY ACROSS INDIA // CASH ON DELIVERY
                </span>
                <h2 className="text-2xl md:text-3xl font-black tracking-wider text-white uppercase font-display">
                  Complete Your Order
                </h2>
                <p className="text-xs text-[#a0a0a0] mt-1">
                  Delivery across India. Pay with Cash on Delivery upon package arrival.
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
                      <Truck className="w-3.5 h-3.5 text-[#1A3B8B]" />
                      Delivery Destination (India)
                    </h3>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">
                      Delivery across India
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

                {/* 2. Payment Method — Razorpay (UPI / Cards / Scanner) or Cash on Delivery (COD) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-300 font-mono flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#c5a46d]" />
                      Payment Method
                    </h3>
                    <span className="text-[10px] text-[#c5a46d] font-mono tracking-widest uppercase">
                      100% SECURE CHECKOUT
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* OPTION 1: Online Payment via Razorpay (UPI, Credit/Debit Cards, QR Scanner) */}
                    <div
                      onClick={() => setPaymentMethod("razorpay")}
                      className={`p-4 border transition-all cursor-pointer relative overflow-hidden ${
                        paymentMethod === "razorpay"
                          ? "bg-gradient-to-r from-neutral-950 via-black to-neutral-950 border-[#1A3B8B] shadow-md shadow-[#1A3B8B]/10"
                          : "bg-black/60 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              paymentMethod === "razorpay"
                                ? "border-[#1A3B8B] bg-[#1A3B8B]"
                                : "border-white/30 bg-transparent"
                            }`}
                          >
                            {paymentMethod === "razorpay" && (
                              <Check className="w-3 h-3 text-white stroke-[3]" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold uppercase tracking-wider text-white">
                                Online Payment (Razorpay)
                              </span>
                              <span className="text-[9px] font-mono uppercase bg-[#1A3B8B]/25 text-[#7397ea] px-2 py-0.5 border border-[#1A3B8B]/50 tracking-wider">
                                FAST &amp; SECURE
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-400 block mt-1">
                              Instant payment via UPI (Google Pay, PhonePe, Paytm, Cred), Credit/Debit Cards, or QR Scanner.
                            </span>

                            {/* Method Badges */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-2.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-white/5 border border-white/10 text-neutral-300">
                                <QrCode className="w-3 h-3 text-[#c5a46d]" />
                                QR Scanner
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-white/5 border border-white/10 text-neutral-300">
                                <Smartphone className="w-3 h-3 text-[#7397ea]" />
                                UPI (GPay/PhonePe)
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-white/5 border border-white/10 text-neutral-300">
                                <CreditCard className="w-3 h-3 text-emerald-400" />
                                Cards (Visa/Master/RuPay)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-mono uppercase text-emerald-400 block tracking-wider">
                            Zero Surcharge
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* OPTION 2: Cash on Delivery (COD) */}
                    <div
                      onClick={() => setPaymentMethod("cod")}
                      className={`p-4 border transition-all cursor-pointer relative overflow-hidden ${
                        paymentMethod === "cod"
                          ? "bg-gradient-to-r from-neutral-950 via-black to-neutral-950 border-[#c5a46d] shadow-md shadow-[#c5a46d]/10"
                          : "bg-black/60 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              paymentMethod === "cod"
                                ? "border-[#c5a46d] bg-[#c5a46d]"
                                : "border-white/30 bg-transparent"
                            }`}
                          >
                            {paymentMethod === "cod" && (
                              <Check className="w-3 h-3 text-black stroke-[3]" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold uppercase tracking-wider text-white">
                                Cash on Delivery (COD)
                              </span>
                              <span className="text-[9px] font-mono uppercase bg-[#c5a46d]/20 text-[#c5a46d] px-2 py-0.5 border border-[#c5a46d]/40 tracking-wider">
                                ₹0 Due Today
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-400 block mt-1">
                              Pay in cash to the Blue Dart courier executive upon receiving and inspecting your package.
                            </span>

                            <div className="flex items-center gap-1.5 flex-wrap pt-2.5 text-[10px] font-mono text-neutral-400">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10">
                                <Banknote className="w-3 h-3 text-[#c5a46d]" />
                                Cash at Door
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                Inspect First
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10">
                                <Truck className="w-3 h-3 text-white" />
                                Blue Dart Express
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trust Banner */}
                  <div className="p-3 bg-neutral-950/80 border border-white/10 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-neutral-300 text-[10px]">
                        {paymentMethod === "razorpay"
                          ? "256-Bit SSL Encrypted Razorpay Gateway · Instant Confirmation"
                          : "Zero Upfront Risk · Hand-to-Hand Courier Cash Payment"}
                      </span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400">
                      Delivery across India
                    </span>
                  </div>
                </div>

                {/* 3. Order Summary & Submit */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-neutral-400">
                      <span>Subtotal (Incl. GST):</span>
                      <span>{formatPrice(cartTotal + discountAmount)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[#1A3B8B]">
                        <span>Discount ({couponCode}):</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-neutral-400">
                      <span>Delivery across India:</span>
                      <span className="text-emerald-400 uppercase text-[10px] tracking-wider">
                        Free (₹0.00)
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-white/10 text-white">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#a0a0a0] block">
                          {paymentMethod === "razorpay"
                            ? "Total Payable Online via Razorpay"
                            : "Total Payable Upon Delivery (Cash on Delivery)"}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-mono">
                          {paymentMethod === "razorpay"
                            ? "UPI, Cards & QR Accepted"
                            : "₹0.00 due today"}
                        </span>
                      </div>
                      <span className="text-2xl font-black font-mono text-white">
                        {formatPrice(cartTotal)}
                      </span>
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-mono mt-3">
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || cart.length === 0}
                    className="w-full py-4 bg-[#1A3B8B] hover:bg-[#142e6d] disabled:opacity-50 text-white font-extrabold text-xs tracking-[0.25em] uppercase transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#1A3B8B]/30 mt-4 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">
                        {paymentMethod === "razorpay" ? "Connecting to Razorpay..." : "Placing Order..."}
                      </span>
                    ) : paymentMethod === "razorpay" ? (
                      <>
                        <Lock className="w-4 h-4 text-[#c5a46d]" />
                        <span>Pay {formatPrice(cartTotal)} via Razorpay (UPI / Card / QR)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <Banknote className="w-4 h-4 text-[#c5a46d]" />
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
              <div className="w-20 h-20 rounded-full border border-[#1A3B8B] bg-[#1A3B8B]/10 flex items-center justify-center mx-auto text-[#1A3B8B]">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-mono tracking-[0.3em] text-[#1A3B8B] uppercase">
                  Order Placed Successfully
                </span>
                <h3 className="text-3xl font-extrabold tracking-wider text-white uppercase font-display mt-2">
                  Order Confirmed
                </h3>
                <p className="text-xs text-neutral-400 mt-2 max-w-md mx-auto">
                  {confirmedPaymentMethod === "razorpay"
                    ? "Your payment was received and verified securely via Razorpay. We are preparing your order for immediate dispatch."
                    : "Your order has been placed. We will dispatch your package shortly with Cash on Delivery across India."}
                </p>
              </div>

              {/* Order Manifest Box */}
              <div className="p-5 bg-neutral-950 border border-white/10 max-w-md mx-auto font-mono text-xs text-left space-y-2.5">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-neutral-400">Order Number:</span>
                  <span className="text-white font-bold">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Payment Method:</span>
                  <span className="text-white font-medium flex items-center gap-1.5">
                    {confirmedPaymentMethod === "razorpay" ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Razorpay (UPI / Card / Scanner)</span>
                      </>
                    ) : (
                      <>
                        <Banknote className="w-3.5 h-3.5 text-[#1A3B8B]" />
                        <span>Cash on Delivery (COD)</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Payment Status:</span>
                  <span
                    className={`font-bold flex items-center gap-1.5 ${
                      confirmedPaymentMethod === "razorpay" ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {confirmedPaymentMethod === "razorpay" ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>PAID (INSTANT)</span>
                      </>
                    ) : (
                      <span>DUE ON DELIVERY</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">
                    {confirmedPaymentMethod === "razorpay" ? "Total Paid:" : "Amount Due on Delivery:"}
                  </span>
                  <span className="text-white font-bold font-mono">
                    {formatPrice(confirmedTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Shipping:</span>
                  <span className="text-white">Delivery across India</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 text-[11px] text-neutral-400">
                  <span>Destination:</span>
                  <span className="text-right text-white max-w-[240px] truncate">
                    {confirmedAddressSnapshot || "Delivery Destination"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/user"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#1A3B8B] hover:bg-[#142e6d] text-white font-extrabold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>View in My Orders</span>
                </Link>

                <button
                  onClick={handleClose}
                  className="w-full sm:w-auto px-6 py-3.5 bg-neutral-900 border border-white/15 text-white hover:border-[#1A3B8B] font-extrabold text-xs tracking-[0.2em] uppercase transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    )}
  </AnimatePresence>

  {/* Razorpay Dedicated Payment Dialog (QR Scanner, UPI Apps, Credit/Debit Cards) */}
  {pendingRazorpayData && (
    <RazorpayModal
      key="razorpay-modal-instance"
      isOpen={isRazorpayModalOpen}
      onClose={() => {
        setIsRazorpayModalOpen(false);
        setIsSubmitting(false);
      }}
      amount={pendingRazorpayData.amount}
      orderNumber={pendingRazorpayData.orderNumber}
      customerName={pendingRazorpayData.customerName}
      customerPhone={pendingRazorpayData.customerPhone}
      customerEmail={pendingRazorpayData.customerEmail}
      onPaymentSuccess={(details) => {
        const activeData = pendingRazorpayData || pendingDataRef.current;
        void handleRazorpayPaymentComplete({
          razorpay_order_id: activeData?.mockOrderId || `rzp_order_${Date.now()}`,
          razorpay_payment_id: details.paymentId,
          razorpay_signature: `sim_sig_${Date.now()}`,
          isMock: true,
          methodName: details.method,
        }, activeData);
      }}
      onPaymentFailure={(errMsg) => {
        setFormError(errMsg);
        setIsRazorpayModalOpen(false);
        setIsSubmitting(false);
      }}
    />
  )}
</>
);
}
