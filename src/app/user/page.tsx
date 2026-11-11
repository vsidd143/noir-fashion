"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { getLiveProducts } from "@/lib/products-service";
import { Product } from "@/types/fashion";
import { formatPrice } from "@/lib/currency";
import PageShell from "@/components/layout/PageShell";
import { confirmCustomerOrder, cancelCustomerOrder } from "@/lib/orders-service";
import {
  User,
  Package,
  Heart,
  MapPin,
  Lock,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  AlertCircle,
  FileText,
  Edit,
  Star,
  ArrowRight,
} from "lucide-react";

type OrderRecord = {
  id: string;
  order_number: string;
  user_id?: string | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  created_at: string;
  updated_at?: string;
  customer_confirmed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  total_amount: number;
  payment_method: string;
  payment_status: string;
  tracking_number?: string;
  courier_name?: string;
  shipping_address?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    addressType?: string;
  };
  items?: { product_name: string; product_image: string; color_name: string; size: string; quantity: number; unit_price: number }[];
};

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

type AddressRecord = {
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
  created_at?: string;
};

export default function UserDashboard() {
  const { user, profile, isAdmin, isLoading, openAuthModal, refreshProfile, signOut } = useAuth();
  const { wishlist, toggleWishlist, addToCart } = useCart();

  const [activeTab, setActiveTab] = useState<"orders" | "profile" | "addresses" | "wishlist" | "security">("orders");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);

  // Order Confirmation & Cancellation Dialog States
  const [confirmModalOrder, setConfirmModalOrder] = useState<OrderRecord | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderRecord | null>(null);
  const [cancelReasonOption, setCancelReasonOption] = useState("Price too high");
  const [cancelCustomNotes, setCancelCustomNotes] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Personal Profile Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [locality, setLocality] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [state, setState] = useState("Maharashtra");
  const [postalCode, setPostalCode] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Form
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Saved Addresses State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);
  const [addressForm, setAddressForm] = useState({
    title: "Home",
    recipient_name: "",
    phone: "",
    house_number: "",
    street_address: "",
    locality: "",
    landmark: "",
    city: "Mumbai",
    state: "Maharashtra",
    postal_code: "",
    country: "India",
    is_default: false,
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressFeedback, setAddressFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      queueMicrotask(() => {
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setHouseNumber(profile.house_number || "");
        setStreetAddress(profile.street_address || "");
        setLocality(profile.locality || "");
        setLandmark(profile.landmark || "");
        setCity(profile.city || "Mumbai");
        setState(profile.state || "Maharashtra");
        setPostalCode(profile.postal_code || "");
      });
    }
  }, [profile]);

  useEffect(() => {
    getLiveProducts().then(setAllProducts);
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function loadUserData() {
      // 1. Load orders
      let localOrders: OrderRecord[] = [];
      try {
        const stored = localStorage.getItem("noir_local_orders");
        if (stored) {
          localOrders = JSON.parse(stored);
        }
      } catch {
        // safe fallback
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            items:order_items(product_name, product_image, color_name, size, quantity, unit_price)
          `)
          .order("created_at", { ascending: false });

        if (!isMounted) return;

        if (!error && data && data.length > 0) {
          const remoteIds = new Set(data.map((d: { order_number: string }) => d.order_number));
          const filteredLocal = localOrders.filter((o) => !remoteIds.has(o.order_number));
          setOrders([...filteredLocal, ...data] as OrderRecord[]);
        } else if (localOrders.length > 0) {
          setOrders(localOrders);
        } else {
          setOrders([]);
        }
      } catch {
        if (isMounted) {
          setOrders(localOrders);
        }
      } finally {
        if (isMounted) {
          setIsOrdersLoading(false);
        }
      }

      // 2. Load addresses
      try {
        const { data, error } = await supabase
          .from("addresses")
          .select("*")
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });

        if (!isMounted) return;

        if (!error && data && data.length > 0) {
          setAddresses(data as AddressRecord[]);
        } else {
          setAddresses([]);
        }
      } catch (err) {
        console.warn("Addresses load notice:", err);
      }
    }

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [user, profile?.full_name]);

  // Real-time synchronization of customer orders & addresses
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_realtime_stream_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as Partial<OrderRecord>;
            setOrders((prev) =>
              prev.map((o) =>
                o.id === updated.id || (updated.order_number && o.order_number === updated.order_number)
                  ? {
                    ...o,
                    ...updated,
                    items: o.items,
                  }
                  : o
              )
            );
          } else if (payload.eventType === "INSERT") {
            const newOrd = payload.new as OrderRecord;
            if (newOrd.user_id === user.id || newOrd.customer_email === user.email) {
              setOrders((prev) => [
                newOrd,
                ...prev.filter((o) => o.id !== newOrd.id && o.order_number !== newOrd.order_number),
              ]);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "addresses",
        },
        async () => {
          // Re-fetch all addresses on any change to guarantee order and default status
          const { data } = await supabase
            .from("addresses")
            .select("*")
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: false });
          if (data) {
            setAddresses(data as AddressRecord[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const showFeedback = (type: "success" | "error", text: string) => {
    setActionFeedback({ type, text });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const handleExecuteConfirm = async () => {
    if (!confirmModalOrder) return;
    setIsConfirming(true);
    try {
      const res = await confirmCustomerOrder(confirmModalOrder.id, confirmModalOrder.order_number);
      if (res.success) {
        const now = new Date().toISOString();
        setOrders((prev) =>
          prev.map((o) =>
            o.id === confirmModalOrder.id || o.order_number === confirmModalOrder.order_number
              ? {
                ...o,
                status: "confirmed",
                customer_confirmed_at: now,
                updated_at: now,
              }
              : o
          )
        );
        showFeedback(
          "success",
          `Order #${confirmModalOrder.order_number} confirmed successfully. Our atelier has queued your order for production & express dispatch.`
        );
        setConfirmModalOrder(null);
      } else {
        showFeedback("error", res.error || "Failed to confirm order. Please try again.");
      }
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Error confirming order.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleExecuteCancel = async () => {
    if (!cancelModalOrder) return;
    setIsCancelling(true);
    const chosenReason = cancelReasonOption;
    const additionalNotes = cancelCustomNotes.trim() || undefined;

    try {
      const res = await cancelCustomerOrder(
        cancelModalOrder.id,
        chosenReason,
        cancelModalOrder.order_number,
        additionalNotes
      );
      if (res.success) {
        const now = new Date().toISOString();
        setOrders((prev) =>
          prev.map((o) =>
            o.id === cancelModalOrder.id || o.order_number === cancelModalOrder.order_number
              ? {
                ...o,
                status: "cancelled",
                cancelled_at: now,
                cancellation_reason: chosenReason,
                cancellation_notes: additionalNotes,
                updated_at: now,
              }
              : o
          )
        );
        showFeedback(
          "success",
          `Order #${cancelModalOrder.order_number} has been cancelled successfully.`
        );
        setCancelModalOrder(null);
        setCancelCustomNotes("");
      } else {
        showFeedback("error", res.error || "Failed to cancel order. Please try again.");
      }
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Error cancelling order.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    setProfileMsg(null);

    // Validate phone
    const cleanPhone = phone.replace(/\D/g, "");
    if (phone && cleanPhone.length < 10) {
      setProfileMsg({ type: "error", text: "Please enter a valid 10-digit Indian mobile number." });
      setIsUpdatingProfile(false);
      return;
    }

    // Validate postal code
    const cleanPin = postalCode.replace(/\D/g, "");
    if (postalCode && cleanPin.length !== 6) {
      setProfileMsg({ type: "error", text: "Please enter a valid 6-digit Indian PIN code." });
      setIsUpdatingProfile(false);
      return;
    }

    try {
      const fullStreet = [houseNumber, streetAddress, locality, landmark]
        .filter(Boolean)
        .join(", ");

      const updatePayload = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        house_number: houseNumber.trim() || null,
        street_address: streetAddress.trim() || fullStreet || null,
        locality: locality.trim() || null,
        landmark: landmark.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        postal_code: postalCode.trim() || null,
        country: "India",
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);

      if (error) {
        setProfileMsg({ type: "error", text: `Database error: ${error.message}` });
      } else {
        setProfileMsg({ type: "success", text: "Atelier patron profile updated and saved to Supabase Vault." });
        await refreshProfile();
      }
    } catch (err: unknown) {
      setProfileMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const refreshAddresses = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAddresses(data as AddressRecord[]);
      }
    } catch (err) {
      console.warn("Address refresh error:", err);
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      title: "Home",
      recipient_name: profile?.full_name || fullName || "",
      phone: profile?.phone || phone || "",
      house_number: "",
      street_address: "",
      locality: "",
      landmark: "",
      city: "Mumbai",
      state: "Maharashtra",
      postal_code: "",
      country: "India",
      is_default: addresses.length === 0,
    });
    setAddressError("");
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr: AddressRecord) => {
    setEditingAddress(addr);
    setAddressForm({
      title: addr.title || "Home",
      recipient_name: addr.recipient_name || "",
      phone: addr.phone || "",
      house_number: addr.house_number || "",
      street_address: addr.street_address || "",
      locality: addr.locality || "",
      landmark: addr.landmark || "",
      city: addr.city || "Mumbai",
      state: addr.state || "Maharashtra",
      postal_code: addr.postal_code || "",
      country: addr.country || "India",
      is_default: addr.is_default || false,
    });
    setAddressError("");
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAddressError("");

    const cleanPhone = addressForm.phone.replace(/\D/g, "");
    if (addressForm.phone && cleanPhone.length < 10) {
      setAddressError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const cleanPin = addressForm.postal_code.replace(/\D/g, "");
    if (cleanPin.length !== 6) {
      setAddressError("Please enter a valid 6-digit Indian PIN code.");
      return;
    }

    setIsSavingAddress(true);

    try {
      const fullStreet = [addressForm.house_number, addressForm.street_address, addressForm.locality, addressForm.landmark]
        .filter(Boolean)
        .join(", ") || addressForm.street_address;

      const payload = {
        user_id: user.id,
        title: addressForm.title,
        recipient_name: addressForm.recipient_name.trim(),
        phone: addressForm.phone.trim(),
        house_number: addressForm.house_number.trim() || null,
        street_address: fullStreet,
        locality: addressForm.locality.trim() || null,
        landmark: addressForm.landmark.trim() || null,
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postal_code: addressForm.postal_code.trim(),
        country: addressForm.country || "India",
        is_default: addresses.length === 0 ? true : addressForm.is_default,
      };

      let saved = false;

      // 1. Attempt Atomic save_customer_address RPC first
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("save_customer_address", {
          p_title: addressForm.title,
          p_recipient_name: addressForm.recipient_name.trim(),
          p_phone: addressForm.phone.trim(),
          p_house_number: addressForm.house_number.trim() || null,
          p_street_address: addressForm.street_address.trim(),
          p_locality: addressForm.locality.trim() || null,
          p_landmark: addressForm.landmark.trim() || null,
          p_city: addressForm.city.trim(),
          p_state: addressForm.state.trim(),
          p_postal_code: addressForm.postal_code.trim(),
          p_country: addressForm.country || "India",
          p_is_default: addresses.length === 0 ? true : addressForm.is_default,
          p_address_id: editingAddress?.id || null,
        });

        if (!rpcError && rpcData?.success) {
          saved = true;
        }
      } catch {
        // RPC fallback to direct table operation
      }

      // 2. Direct Table operation fallback
      if (!saved) {
        // Core payload with universally supported standard columns across all schema variants
        const corePayload: Record<string, unknown> = {
          user_id: user.id,
          title: addressForm.title || "Home",
          recipient_name: addressForm.recipient_name.trim(),
          phone: addressForm.phone.trim(),
          street_address: fullStreet,
          city: addressForm.city.trim(),
          state: addressForm.state.trim(),
          postal_code: addressForm.postal_code.trim(),
          country: addressForm.country || "India",
          is_default: addresses.length === 0 ? true : addressForm.is_default,
        };

        let directError: { message?: string; details?: string; hint?: string } | null = null;

        if (editingAddress) {
          // Attempt update with extended payload first
          const res = await supabase
            .from("addresses")
            .update(payload)
            .eq("id", editingAddress.id);

          if (res.error) {
            // If extended columns do not exist in DB, retry with core payload
            console.warn("Extended columns update failed, retrying with core columns:", res.error.message);
            const retryRes = await supabase
              .from("addresses")
              .update(corePayload)
              .eq("id", editingAddress.id);
            if (retryRes.error) directError = retryRes.error;
          }
        } else {
          // Attempt insert with extended payload first
          const res = await supabase
            .from("addresses")
            .insert(payload);

          if (res.error) {
            // If extended columns do not exist in DB, retry with core payload
            console.warn("Extended columns insert failed, retrying with core columns:", res.error.message);
            const retryRes = await supabase
              .from("addresses")
              .insert(corePayload);
            if (retryRes.error) directError = retryRes.error;
          }
        }

        if (directError) {
          throw directError;
        }
      }

      // If set to default, ensure other addresses for this user are unset
      if (addressForm.is_default || addresses.length === 0) {
        try {
          await supabase
            .from("addresses")
            .update({ is_default: false })
            .eq("user_id", user.id)
            .neq("id", editingAddress?.id || "00000000-0000-0000-0000-000000000000");
        } catch {
          // Non-critical background default sync
        }
      }

      setAddressFeedback({
        type: "success",
        text: editingAddress ? "Address details updated successfully." : "New delivery address added successfully.",
      });

      await refreshAddresses();
      setShowAddressModal(false);
      setTimeout(() => setAddressFeedback(null), 4000);
    } catch (err: unknown) {
      console.error("Save address error:", err);
      const postgrestErr = err as { message?: string; details?: string; hint?: string; error_description?: string };
      const friendlyMsg =
        postgrestErr?.message ||
        postgrestErr?.error_description ||
        postgrestErr?.details ||
        (err instanceof Error ? err.message : "Failed to save address. Please check database permissions.");
      setAddressError(friendlyMsg);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (addrId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addrId);

      if (error) throw error;
      await refreshAddresses();
      setAddressFeedback({ type: "success", text: "Default delivery address updated in Vault." });
      setTimeout(() => setAddressFeedback(null), 4000);
    } catch (err: unknown) {
      const postgrestErr = err as { message?: string };
      setAddressFeedback({
        type: "error",
        text: postgrestErr?.message || (err instanceof Error ? err.message : "Failed to update default address"),
      });
    }
  };

  const handleDeleteAddress = async (addr: AddressRecord) => {
    if (!user) return;
    if (addresses.length <= 1) {
      setAddressFeedback({
        type: "error",
        text: "Your primary delivery address cannot be removed while it is your only saved address.",
      });
      setTimeout(() => setAddressFeedback(null), 5000);
      return;
    }

    if (!confirm(`Are you sure you want to remove address "${addr.title}"?`)) return;

    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", addr.id);

      if (error) throw error;
      await refreshAddresses();
      setAddressFeedback({ type: "success", text: "Address removed from Vault successfully." });
      setTimeout(() => setAddressFeedback(null), 4000);
    } catch (err: unknown) {
      const postgrestErr = err as { message?: string };
      setAddressFeedback({
        type: "error",
        text: postgrestErr?.message || (err instanceof Error ? err.message : "Failed to delete address"),
      });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg("Password must be at least 6 characters.");
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordMsg("");

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMsg(`Error: ${error.message}`);
      } else {
        setPasswordMsg("Password successfully updated in Vault.");
        setNewPassword("");
      }
    } catch (err: unknown) {
      setPasswordMsg(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const wishlistProducts = allProducts.filter((p) => wishlist.includes(p.id));

  const getStatusColor = (status: OrderRecord["status"]) => {
    switch (status) {
      case "delivered":
        return "text-emerald-400 bg-emerald-950/40 border-emerald-500/30";
      case "shipped":
        return "text-cyan-400 bg-cyan-950/40 border-cyan-500/30";
      case "processing":
      case "confirmed":
        return "text-[#c5a46d] bg-[#c5a46d]/10 border-[#c5a46d]/30";
      case "cancelled":
      case "refunded":
        return "text-red-400 bg-red-950/40 border-red-500/30";
      default:
        return "text-amber-400 bg-amber-950/40 border-amber-500/30";
    }
  };

  return (
    <PageShell theme="dark">
      <div className="w-full min-h-screen bg-[#050505] text-white">
        <div className="max-w-7xl mx-auto w-full px-6 md:px-12 pt-32 pb-24">
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-8 mb-10 gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#c5a46d] mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Client Dashboard // Vault</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black uppercase font-display tracking-tight text-white">
                {profile?.full_name || user?.email?.split("@")[0] || "Client"}
              </h1>
              <p className="text-xs font-mono text-neutral-400 mt-1">
                Member ID: {user?.id.substring(0, 8).toUpperCase() || "NOIR-CLIENT"} · {user?.email || "Guest"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="px-5 py-2.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-wider uppercase font-mono transition-all flex items-center gap-2 shadow-lg"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Panel</span>
                </Link>
              )}

              {user ? (
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2.5 border border-white/15 hover:border-red-400 text-xs font-mono text-neutral-400 hover:text-red-400 uppercase tracking-wider transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => openAuthModal("login")}
                  className="px-6 py-2.5 bg-[#c5a46d] text-black font-bold text-xs font-mono uppercase tracking-wider"
                >
                  Sign In to Vault
                </button>
              )}
            </div>
          </div>

          {!user && !isLoading ? (
            <div className="p-12 bg-neutral-950 border border-white/10 text-center max-w-md mx-auto space-y-4 my-12">
              <Lock className="w-10 h-10 text-[#c5a46d] mx-auto" />
              <h3 className="text-xl font-bold uppercase font-display text-white">
                Vault Access Required
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Sign in with your registered email or Google account to view your order tracking, addresses, and private acquisitions.
              </p>
              <button
                onClick={() => openAuthModal("login")}
                className="w-full py-3 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-widest uppercase font-mono transition-all"
              >
                Authorize Client Access
              </button>
            </div>
          ) : (
            /* Dashboard Layout with Sidebar Tabs */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Sidebar Navigation (3 cols) — Horizontal scroll on mobile, vertical sidebar on desktop */}
              <div className="lg:col-span-3 bg-[#0a0a0a] border border-white/10 p-2 sm:p-4 flex lg:flex-col overflow-x-auto gap-1.5 sm:gap-1 no-scrollbar">
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-mono uppercase tracking-wider transition-all text-left whitespace-nowrap shrink-0 lg:w-full ${activeTab === "orders"
                      ? "bg-[#c5a46d] text-black font-bold shadow-md shadow-[#c5a46d]/20"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                    }`}
                >
                  <Package className="w-4 h-4 shrink-0" />
                  <span>My Orders ({orders.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-mono uppercase tracking-wider transition-all text-left whitespace-nowrap shrink-0 lg:w-full ${activeTab === "profile"
                      ? "bg-[#c5a46d] text-black font-bold shadow-md shadow-[#c5a46d]/20"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                    }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span>Personal Profile</span>
                </button>

                <button
                  onClick={() => setActiveTab("addresses")}
                  className={`flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-mono uppercase tracking-wider transition-all text-left whitespace-nowrap shrink-0 lg:w-full ${activeTab === "addresses"
                      ? "bg-[#c5a46d] text-black font-bold shadow-md shadow-[#c5a46d]/20"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                    }`}
                >
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>Saved Addresses ({addresses.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("wishlist")}
                  className={`flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-mono uppercase tracking-wider transition-all text-left whitespace-nowrap shrink-0 lg:w-full ${activeTab === "wishlist"
                      ? "bg-[#c5a46d] text-black font-bold shadow-md shadow-[#c5a46d]/20"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                    }`}
                >
                  <Heart className="w-4 h-4 shrink-0" />
                  <span>Wishlist ({wishlist.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("security")}
                  className={`flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-mono uppercase tracking-wider transition-all text-left whitespace-nowrap shrink-0 lg:w-full ${activeTab === "security"
                      ? "bg-[#c5a46d] text-black font-bold shadow-md shadow-[#c5a46d]/20"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                    }`}
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Security & Password</span>
                </button>
              </div>

              {/* Main Content Area (9 cols) */}
              <div className="lg:col-span-9 bg-[#0a0a0a] border border-white/10 p-6 md:p-8">
                {/* TAB 1: ORDERS & TRACKING */}
                {activeTab === "orders" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <h3 className="text-xl font-bold uppercase font-display text-white">
                          My Orders
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Track live courier dispatch, verify orders, and review past atelier acquisitions.
                        </p>
                      </div>
                    </div>

                    {/* Realtime Action Feedback Notification */}
                    {actionFeedback && (
                      <div
                        className={`p-4 border flex items-center justify-between font-mono text-xs ${actionFeedback.type === "success"
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                            : "bg-red-950/40 border-red-500/50 text-red-300"
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {actionFeedback.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span>{actionFeedback.text}</span>
                        </div>
                        <button
                          onClick={() => setActionFeedback(null)}
                          className="text-neutral-400 hover:text-white p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {isOrdersLoading ? (
                      <div className="py-20 text-center space-y-3 font-mono text-xs text-neutral-400">
                        <div className="w-8 h-8 border-2 border-[#c5a46d] border-t-transparent rounded-full animate-spin mx-auto" />
                        <p>Loading your orders...</p>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mx-auto text-neutral-500">
                          <Package className="w-5 h-5 text-[#c5a46d]" />
                        </div>
                        <p className="text-sm font-display uppercase tracking-widest text-neutral-300">
                          You haven&apos;t placed any orders yet.
                        </p>
                        <p className="text-xs text-neutral-500 font-mono max-w-sm mx-auto">
                          Your acquired runway product, live Blue Dart tracking, and tax invoices will display here once placed.
                        </p>
                        <Link
                          href="/new-arrivals"
                          className="inline-block px-6 py-2.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs font-mono tracking-widest uppercase transition-all shadow-lg"
                        >
                          Explore New Arrivals
                        </Link>
                      </div>
                    ) : (
                      orders.map((order) => {
                        const isPending = order.status === "pending";
                        const isConfirmed = order.status === "confirmed";
                        const isCancelled = order.status === "cancelled" || order.status === "refunded";
                        const isProcessing = order.status === "processing";
                        const isShipped = order.status === "shipped";
                        const isDelivered = order.status === "delivered";
                        const canCancel = ["pending", "confirmed", "processing"].includes(order.status);

                        return (
                          <div
                            key={order.id || order.order_number}
                            className="bg-neutral-950 border border-white/10 p-6 space-y-6 relative transition-colors"
                          >
                            {/* Order Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono font-bold tracking-widest text-[#c5a46d] uppercase">
                                    ORDER #{order.order_number}
                                  </span>
                                  {isConfirmed && (
                                    <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-[#c5a46d]/20 text-[#c5a46d] border border-[#c5a46d]/40">
                                      Verified
                                    </span>
                                  )}
                                </div>
                                <span className="block text-xs font-mono text-neutral-400 mt-1">
                                  Placed on {new Date(order.created_at).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })} · Total: {formatPrice(order.total_amount)} (Cash on Delivery)
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-3 py-1 text-[10px] font-mono font-bold tracking-widest uppercase border ${getStatusColor(
                                    order.status
                                  )}`}
                                >
                                  {order.status}
                                </span>
                              </div>
                            </div>

                            {/* Contextual Status Alert Banner */}
                            {isPending && (
                              <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 flex items-start justify-between gap-3 text-xs font-mono">
                                <div className="flex items-start gap-2.5 text-amber-300">
                                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="block text-amber-200 uppercase tracking-wider text-[11px]">
                                      Awaiting Client Confirmation
                                    </strong>
                                    <span className="text-amber-300/80 text-[11px]">
                                      Please confirm this Cash on Delivery order to authorize fabric cutting and immediate atelier dispatch.
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setConfirmModalOrder(order)}
                                  className="shrink-0 px-3 py-1 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-[10px] uppercase font-mono tracking-wider shadow"
                                >
                                  Confirm Now
                                </button>
                              </div>
                            )}

                            {isConfirmed && (
                              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-2.5 text-xs font-mono text-emerald-300">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div>
                                  <span className="font-bold uppercase tracking-wider text-[11px] text-emerald-200">
                                    Order Confirmed by Patron
                                  </span>
                                  {order.customer_confirmed_at && (
                                    <span className="text-emerald-400/80 text-[10px] ml-1">
                                      on {new Date(order.customer_confirmed_at).toLocaleDateString("en-IN")} at{" "}
                                      {new Date(order.customer_confirmed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  )}
                                  <span className="text-neutral-400 text-[10px] block mt-0.5">
                                    Queued in atelier production queue for quality inspection and courier packing.
                                  </span>
                                </div>
                              </div>
                            )}

                            {isCancelled && (
                              <div className="p-3.5 bg-red-950/30 border border-red-500/40 text-xs font-mono text-red-300 space-y-1">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                  <span className="font-bold uppercase tracking-wider text-[11px] text-red-200">
                                    Order Cancelled
                                  </span>
                                  {order.cancelled_at && (
                                    <span className="text-red-400/80 text-[10px]">
                                      on {new Date(order.cancelled_at).toLocaleDateString("en-IN")}
                                    </span>
                                  )}
                                </div>
                                {order.cancellation_reason && (
                                  <p className="text-[11px] text-red-300/90 pl-6">
                                    Reason: <span className="text-white font-medium">{order.cancellation_reason}</span>
                                  </p>
                                )}
                                <p className="text-[10px] text-neutral-400 pl-6">
                                  The Cash on Delivery invoice has been voided and inventory released.
                                </p>
                              </div>
                            )}

                            {isProcessing && (
                              <div className="p-3 bg-purple-950/20 border border-purple-500/30 flex items-center gap-2.5 text-xs font-mono text-purple-300">
                                <Package className="w-4 h-4 text-purple-400 shrink-0" />
                                <div>
                                  <span className="font-bold uppercase tracking-wider text-[11px] text-purple-200">
                                    Atelier Fabrication in Progress
                                  </span>
                                  <span className="text-neutral-400 text-[10px] block mt-0.5">
                                    product are being handcrafted and prepared for express courier handover.
                                  </span>
                                </div>
                              </div>
                            )}

                            {isShipped && (
                              <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 flex items-center gap-2.5 text-xs font-mono text-cyan-300">
                                <Package className="w-4 h-4 text-cyan-400 shrink-0" />
                                <div>
                                  <span className="font-bold uppercase tracking-wider text-[11px] text-cyan-200">
                                    Dispatched via Express Courier
                                  </span>
                                  <span className="text-neutral-400 text-[10px] block mt-0.5">
                                    Package is in transit with {order.courier_name || "Blue Dart Express"}.
                                  </span>
                                </div>
                              </div>
                            )}

                            {isDelivered && (
                              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-2.5 text-xs font-mono text-emerald-300">
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div>
                                  <span className="font-bold uppercase tracking-wider text-[11px] text-emerald-200">
                                    Delivered to Patron Residence
                                  </span>
                                  <span className="text-neutral-400 text-[10px] block mt-0.5">
                                    Acquisition finalized. Thank you for choosing NOIR Atelier.
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Delivery Address Details */}
                            {order.shipping_address && (
                              <div className="p-3.5 bg-black/50 border border-white/5 flex items-start gap-3 text-xs font-mono">
                                <MapPin className="w-4 h-4 text-[#c5a46d] shrink-0 mt-0.5" />
                                <div className="space-y-0.5 flex-1">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                                    Delivery Destination
                                  </span>
                                  <p className="text-neutral-200 text-xs">
                                    {order.shipping_address.address && `${order.shipping_address.address}, `}
                                    {order.shipping_address.city && `${order.shipping_address.city}, `}
                                    {order.shipping_address.state && `${order.shipping_address.state} `}
                                    {order.shipping_address.postalCode && `- ${order.shipping_address.postalCode}`}
                                    {order.shipping_address.country && ` (${order.shipping_address.country})`}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Tracking Pipeline Visualizer */}
                            <div className="py-2">
                              <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-3">
                                Fulfillment Journey
                              </span>
                              {isCancelled ? (
                                <div className="p-3 bg-black/60 border border-red-500/20 text-center text-xs font-mono text-red-400">
                                  Journey Cancelled · No Dispatch Scheduled
                                </div>
                              ) : (
                                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
                                  {[
                                    { label: "Received", done: true },
                                    {
                                      label: "Confirmed / Prep",
                                      done: ["confirmed", "processing", "shipped", "delivered"].includes(order.status),
                                    },
                                    { label: "In Transit", done: ["shipped", "delivered"].includes(order.status) },
                                    { label: "Delivered", done: order.status === "delivered" },
                                  ].map((step, idx) => (
                                    <div key={idx} className="flex flex-col items-center">
                                      <div
                                        className={`w-6 h-6 rounded-full border flex items-center justify-center mb-1.5 ${step.done
                                            ? "bg-[#c5a46d] text-black border-[#c5a46d]"
                                            : "bg-black text-neutral-600 border-white/15"
                                          }`}
                                      >
                                        {step.done ? "✓" : idx + 1}
                                      </div>
                                      <span className={step.done ? "text-white font-bold" : "text-neutral-500"}>
                                        {step.label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {order.tracking_number && !isCancelled && (
                                <div className="mt-4 p-3 bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono">
                                  <span className="text-neutral-400">
                                    Courier: <span className="text-white">{order.courier_name || "Blue Dart Express"}</span>
                                  </span>
                                  <span className="text-[#c5a46d] font-bold">
                                    Waybill: {order.tracking_number}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Order Items */}
                            <div className="border-t border-white/10 pt-4 space-y-3">
                              <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                                Acquired product ({order.items?.length || 1})
                              </span>
                              {order.items?.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4">
                                  <img
                                    src={item.product_image || "/images/placeholders/hoodie.jpg"}
                                    alt={item.product_name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-12 h-14 object-cover bg-neutral-900 border border-white/10"
                                  />
                                  <div className="flex-1">
                                    <h4 className="text-xs font-bold text-white uppercase">
                                      {item.product_name}
                                    </h4>
                                    <span className="text-[10px] text-neutral-400 font-mono">
                                      {item.color_name} · Size {item.size} · Qty {item.quantity}
                                    </span>
                                  </div>
                                  <span className="text-xs font-mono text-[#c5a46d] font-bold">
                                    {formatPrice(item.unit_price * item.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Action Buttons Bar */}
                            <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                                  Payment: Cash on Delivery (COD)
                                </span>
                                <span className="text-xs font-mono text-white font-bold">
                                  Total: {formatPrice(order.total_amount)}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* 1. Pending: Show Confirm and Cancel buttons */}
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => setCancelModalOrder(order)}
                                      className="px-4 py-2 border border-red-500/40 hover:border-red-400 text-red-400 hover:text-white hover:bg-red-950/30 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Cancel Order</span>
                                    </button>
                                    <button
                                      onClick={() => setConfirmModalOrder(order)}
                                      className="px-5 py-2 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs font-mono uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Confirm Order</span>
                                    </button>
                                  </>
                                )}

                                {/* 2. Confirmed or Processing: Show Cancel Order button */}
                                {(isConfirmed || isProcessing) && canCancel && (
                                  <button
                                    onClick={() => setCancelModalOrder(order)}
                                    className="px-4 py-2 border border-white/20 hover:border-red-400 text-neutral-400 hover:text-red-400 hover:bg-red-950/20 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Cancel Order</span>
                                  </button>
                                )}

                                {/* 3. In-transit / Delivered */}
                                {(isShipped || isDelivered) && (
                                  <span className="text-[11px] font-mono text-neutral-500">
                                    {isDelivered ? "Delivered to patron" : "In transit with Blue Dart Express"}
                                  </span>
                                )}

                                {/* 4. Cancelled */}
                                {isCancelled && (
                                  <span className="text-[11px] font-mono text-red-400 flex items-center gap-1.5">
                                    <X className="w-3.5 h-3.5" />
                                    <span>Order Cancelled</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* TAB 2: PERSONAL PROFILE */}
                {activeTab === "profile" && (
                  <div className="space-y-6 max-w-2xl">
                    <div className="border-b border-white/10 pb-4">
                      <h3 className="text-xl font-bold uppercase font-display text-white">
                        Client Profile & Residence
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Manage your personal identity and delivery destination saved securely in the Supabase Vault.
                      </p>
                    </div>

                    {profileMsg && (
                      <div
                        className={`p-4 border flex items-center justify-between text-xs font-mono ${profileMsg.type === "success"
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                            : "bg-red-950/40 border-red-500/50 text-red-300"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          {profileMsg.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span>{profileMsg.text}</span>
                        </div>
                        <button onClick={() => setProfileMsg(null)} className="text-neutral-400 hover:text-white p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                      {/* Full Name & Phone */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-black border border-white/15 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                            Mobile Phone (10 digits) *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. 9820012345"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-black border border-white/15 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                          Client Email (Primary Vault ID)
                        </label>
                        <input
                          type="email"
                          disabled
                          value={user?.email || ""}
                          className="w-full bg-neutral-900 border border-white/10 px-4 py-2.5 text-xs text-neutral-400 cursor-not-allowed font-mono"
                        />
                        <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                          Account email is protected by Supabase Auth security.
                        </span>
                      </div>

                      {/* House/Flat & Street Address */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                            House / Flat / Building No.
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Flat 402, Signature Towers"
                            value={houseNumber}
                            onChange={(e) => setHouseNumber(e.target.value)}
                            className="w-full bg-black border border-white/15 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                            Street / Road / Locality
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Linking Road, Bandra West"
                            value={streetAddress}
                            onChange={(e) => setStreetAddress(e.target.value)}
                            className="w-full bg-black border border-white/15 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                          />
                        </div>
                      </div>

                      {/* Area / Landmark */}
                      <div>
                        <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                          Area / Landmark
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Opposite National College"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          className="w-full bg-black border border-white/15 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                        />
                      </div>

                      {/* City, State, PIN Code, Country */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-black border border-white/15 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                            State
                          </label>
                          <select
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full bg-black border border-white/15 px-2 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d] cursor-pointer"
                          >
                            {INDIAN_STATES.map((st) => (
                              <option key={st} value={st} className="bg-neutral-900 text-white">
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                            PIN Code (6 digits)
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="400050"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
                            className="w-full bg-black border border-white/15 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
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

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isUpdatingProfile}
                          className="px-8 py-3 bg-[#c5a46d] hover:bg-[#d6b77e] disabled:opacity-50 text-black font-extrabold text-xs tracking-widest uppercase font-mono transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                        >
                          {isUpdatingProfile ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              <span>Saving to Vault...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Save Profile Details</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 3: SAVED ADDRESSES */}
                {activeTab === "addresses" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                      <div>
                        <h3 className="text-xl font-bold uppercase font-display text-white">
                          Saved Delivery Addresses
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Manage your primary delivery residence and additional address destinations.
                        </p>
                      </div>

                      <button
                        onClick={handleOpenAddAddress}
                        className="px-4 py-2 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-mono font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Address</span>
                      </button>
                    </div>

                    {addressFeedback && (
                      <div
                        className={`p-4 border flex items-center justify-between text-xs font-mono ${addressFeedback.type === "success"
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                            : "bg-red-950/40 border-red-500/50 text-red-300"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          {addressFeedback.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span>{addressFeedback.text}</span>
                        </div>
                        <button onClick={() => setAddressFeedback(null)} className="text-neutral-400 hover:text-white p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {addresses.length === 0 ? (
                      <div className="p-12 bg-neutral-950 border border-white/10 text-center space-y-4">
                        <MapPin className="w-10 h-10 text-[#c5a46d] mx-auto opacity-70" />
                        <h4 className="text-sm font-bold uppercase text-white font-mono">
                          No Saved Addresses Found
                        </h4>
                        <p className="text-xs text-neutral-400 font-mono max-w-sm mx-auto">
                          Save your delivery address for one-click express Cash on Delivery checkout.
                        </p>
                        <button
                          onClick={handleOpenAddAddress}
                          className="px-6 py-2.5 bg-[#c5a46d] text-black font-mono font-bold text-xs uppercase tracking-wider"
                        >
                          Add Your First Address
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className={`p-5 bg-neutral-950 border transition-all space-y-3 relative ${addr.is_default
                                ? "border-[#c5a46d]/60 bg-gradient-to-b from-[#c5a46d]/5 to-neutral-950"
                                : "border-white/10 hover:border-white/20"
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                                  {addr.title}
                                </h4>
                                {addr.is_default && (
                                  <span className="px-2 py-0.5 bg-[#c5a46d] text-black text-[9px] font-mono font-bold tracking-widest uppercase flex items-center gap-1 shadow">
                                    <Star className="w-2.5 h-2.5 fill-black" />
                                    DEFAULT ADDRESS
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditAddress(addr)}
                                  className="p-1.5 text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
                                  title="Edit Address"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAddress(addr)}
                                  className="p-1.5 text-neutral-400 hover:text-red-400 border border-white/10 hover:border-red-400/40 transition-colors"
                                  title="Delete Address"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="text-xs text-neutral-300 font-mono space-y-1">
                              <p className="text-white font-bold">{addr.recipient_name}</p>
                              <p className="text-neutral-400 leading-relaxed">
                                {addr.house_number && `${addr.house_number}, `}
                                {addr.street_address}
                                {addr.locality && `, ${addr.locality}`}
                                {addr.landmark && ` (Near: ${addr.landmark})`}
                                <br />
                                {addr.city}, {addr.state || "Maharashtra"} - {addr.postal_code}
                                <br />
                                {addr.country || "India"}
                              </p>
                              {addr.phone && (
                                <p className="text-[#c5a46d] text-[11px] pt-1">
                                  Mobile: {addr.phone}
                                </p>
                              )}
                            </div>

                            {!addr.is_default && (
                              <div className="border-t border-white/10 pt-3">
                                <button
                                  onClick={() => handleSetDefaultAddress(addr.id)}
                                  className="text-[10px] font-mono uppercase tracking-wider text-[#c5a46d] hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Set As Default Address</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add / Edit Address Modal */}
                    {showAddressModal && (
                      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-[#0a0a0a] border border-[#c5a46d]/40 max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                          <button
                            onClick={() => !isSavingAddress && setShowAddressModal(false)}
                            className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
                          >
                            <X className="w-5 h-5" />
                          </button>

                          <div>
                            <span className="text-[10px] font-mono tracking-widest uppercase text-[#c5a46d] block mb-1">
                              ATELIER RESIDENCE VAULT
                            </span>
                            <h3 className="text-xl font-bold uppercase font-display text-white">
                              {editingAddress ? "Edit Saved Address" : "Add New Saved Address"}
                            </h3>
                          </div>

                          {addressError && (
                            <div className="p-3 bg-red-950/40 border border-red-500/40 text-xs font-mono text-red-300">
                              {addressError}
                            </div>
                          )}

                          <form onSubmit={handleSaveAddress} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                                  Address Title *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Home, Office, Loft"
                                  value={addressForm.title}
                                  onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })}
                                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                                  Recipient Full Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Recipient Name"
                                  value={addressForm.recipient_name}
                                  onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                                Mobile Phone (10 digits) *
                              </label>
                              <input
                                type="tel"
                                required
                                placeholder="9820012345"
                                value={addressForm.phone}
                                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                className="w-full bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                                  House / Flat / Suite No.
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. 402, Signature Towers"
                                  value={addressForm.house_number}
                                  onChange={(e) => setAddressForm({ ...addressForm, house_number: e.target.value })}
                                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
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
                                  value={addressForm.street_address}
                                  onChange={(e) => setAddressForm({ ...addressForm, street_address: e.target.value })}
                                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                                Area / Landmark
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Near National College"
                                value={addressForm.landmark}
                                onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                                className="w-full bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                              />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                                  City *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Mumbai"
                                  value={addressForm.city}
                                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                                  State *
                                </label>
                                <select
                                  value={addressForm.state}
                                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                                  className="w-full bg-black border border-white/15 px-2 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                                >
                                  {INDIAN_STATES.map((st) => (
                                    <option key={st} value={st} className="bg-neutral-900 text-white">
                                      {st}
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
                                  value={addressForm.postal_code}
                                  onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value.replace(/\D/g, "") })}
                                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
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
                                  className="w-full bg-neutral-900 border border-white/10 px-3 py-2 text-xs text-neutral-400 font-mono cursor-not-allowed"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="checkbox"
                                id="is_default_check"
                                checked={addressForm.is_default || addresses.length === 0}
                                disabled={addresses.length === 0 || (editingAddress?.is_default && addresses.length > 1)}
                                onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                                className="accent-[#c5a46d] cursor-pointer"
                              />
                              <label htmlFor="is_default_check" className="text-xs font-mono text-neutral-300 cursor-pointer">
                                Set as primary default delivery address
                              </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                              <button
                                type="button"
                                disabled={isSavingAddress}
                                onClick={() => setShowAddressModal(false)}
                                className="px-4 py-2 border border-white/15 text-neutral-300 text-xs font-mono uppercase tracking-wider hover:border-white transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingAddress}
                                className="px-6 py-2 bg-[#c5a46d] hover:bg-[#d6b77e] disabled:opacity-50 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center gap-2"
                              >
                                {isSavingAddress ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    <span>Saving Address...</span>
                                  </>
                                ) : (
                                  <span>Save Address</span>
                                )}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: WISHLIST */}
                {activeTab === "wishlist" && (
                  <div className="space-y-6">
                    <div className="border-b border-white/10 pb-4">
                      <h3 className="text-xl font-bold uppercase font-display text-white">
                        Saved Wishlist Pieces
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Your private archive of saved product ready to acquire.
                      </p>
                    </div>

                    {wishlistProducts.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mx-auto text-neutral-500">
                          <Heart className="w-5 h-5 text-rose-400" />
                        </div>
                        <p className="text-sm font-display uppercase tracking-widest text-neutral-300">
                          Your wishlist is empty.
                        </p>
                        <p className="text-xs text-neutral-500 font-mono max-w-sm mx-auto">
                          Explore our runway collection and tap the heart icon on any silhouette to archive it here.
                        </p>
                        <Link
                          href="/new-arrivals"
                          className="inline-block px-6 py-2.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs font-mono tracking-widest uppercase transition-all shadow-lg"
                        >
                          Explore New Arrivals
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {wishlistProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-neutral-950 border border-white/10 p-3 flex flex-col justify-between group"
                          >
                            <div className="relative aspect-[3/4] bg-neutral-900 overflow-hidden">
                              <img
                                src={prod.thumbnail}
                                alt={prod.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <button
                                onClick={() => toggleWishlist(prod.id)}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-rose-400 hover:text-white"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="pt-3 space-y-2">
                              <h4 className="text-xs font-bold text-white uppercase truncate">
                                {prod.name}
                              </h4>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-[#c5a46d]">
                                  {formatPrice(prod.price)}
                                </span>
                                <button
                                  onClick={() => addToCart(prod)}
                                  className="px-3 py-1 bg-[#c5a46d] text-black text-[10px] font-mono font-bold uppercase"
                                >
                                  Move to Bag
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: SECURITY */}
                {activeTab === "security" && (
                  <div className="space-y-6 max-w-xl">
                    <div className="border-b border-white/10 pb-4">
                      <h3 className="text-xl font-bold uppercase font-display text-white">
                        Security & Password
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Update your account security credentials and manage authentication sessions.
                      </p>
                    </div>

                    {passwordMsg && (
                      <div className="p-3 bg-neutral-900 border border-[#c5a46d]/40 text-xs font-mono text-[#c5a46d]">
                        {passwordMsg}
                      </div>
                    )}

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
                          New Security Password
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-black border border-white/15 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="px-6 py-3 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs tracking-widest uppercase font-mono transition-all"
                      >
                        {isUpdatingPassword ? "Updating..." : "Update Vault Password"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* CUSTOMER ORDER CONFIRMATION DIALOG MODAL                       */}
          {/* ------------------------------------------------------------- */}
          {confirmModalOrder && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0a0a0a] border border-[#c5a46d]/50 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => !isConfirming && setConfirmModalOrder(null)}
                  className="absolute top-4 right-4 text-neutral-500 hover:text-white p-1 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-[#c5a46d]">
                    <CheckCircle2 className="w-4 h-4 text-[#c5a46d]" />
                    <span>Client Order Verification</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold uppercase font-display text-white">
                    Confirm Order
                  </h3>
                  <p className="text-xs font-mono text-neutral-400">
                    Are you sure you want to confirm this order?
                  </p>
                </div>

                {/* Order Summary Box */}
                <div className="p-4 bg-neutral-950 border border-white/10 space-y-3 text-xs font-mono">
                  <div className="flex justify-between items-center text-neutral-300">
                    <span className="text-neutral-400">Order Code:</span>
                    <span className="text-white font-bold">#{confirmModalOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-300">
                    <span className="text-neutral-400">Amount Due (COD):</span>
                    <span className="text-[#c5a46d] font-bold text-sm">
                      {formatPrice(confirmModalOrder.total_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                    <span>Payment Method:</span>
                    <span className="uppercase text-white font-medium">Cash on Delivery</span>
                  </div>
                  {confirmModalOrder.shipping_address?.city && (
                    <div className="flex justify-between items-start text-neutral-400 text-[11px] gap-2">
                      <span className="shrink-0">Destination:</span>
                      <span className="text-white text-right">
                        {confirmModalOrder.shipping_address.address ? `${confirmModalOrder.shipping_address.address}, ` : ""}
                        {confirmModalOrder.shipping_address.city}, {confirmModalOrder.shipping_address.state || "India"} - {confirmModalOrder.shipping_address.postalCode}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2 text-[11px] text-neutral-400">
                    <span className="block mb-1 font-bold text-neutral-300 uppercase text-[10px]">
                      Items ({confirmModalOrder.items?.length || 1}):
                    </span>
                    <span className="text-neutral-300">
                      {confirmModalOrder.items?.map((it) => `${it.product_name} (${it.size || "M"} x${it.quantity})`).join(", ") || "Fashion product"}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#c5a46d]/10 border border-[#c5a46d]/30 text-[11px] font-mono text-[#c5a46d] leading-relaxed">
                  By confirming, you authorize our atelier team to cut fabric, pack your custom box, and dispatch via Blue Dart Express with Cash on Delivery.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isConfirming}
                    onClick={() => setConfirmModalOrder(null)}
                    className="px-4 py-2.5 border border-white/15 hover:border-white text-xs font-mono uppercase tracking-wider text-neutral-300 transition-colors cursor-pointer"
                  >
                    Return
                  </button>
                  <button
                    type="button"
                    disabled={isConfirming}
                    onClick={handleExecuteConfirm}
                    className="px-6 py-2.5 bg-[#c5a46d] hover:bg-[#d6b77e] disabled:opacity-50 text-black font-extrabold text-xs font-mono uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    {isConfirming ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Confirming Order...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Yes, Confirm Order</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* CUSTOMER ORDER CANCELLATION DIALOG MODAL                     */}
          {/* ------------------------------------------------------------- */}
          {cancelModalOrder && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0a0a0a] border border-red-500/40 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => !isCancelling && setCancelModalOrder(null)}
                  className="absolute top-4 right-4 text-neutral-500 hover:text-white p-1 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-red-400">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Order Cancellation Request</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold uppercase font-display text-white">
                    Cancel Order
                  </h3>
                  <p className="text-xs font-mono text-neutral-400">
                    Order #{cancelModalOrder.order_number} · Total: {formatPrice(cancelModalOrder.total_amount)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-2">
                      Reason for Cancellation *
                    </label>
                    <select
                      value={cancelReasonOption}
                      onChange={(e) => setCancelReasonOption(e.target.value)}
                      className="w-full bg-black border border-white/20 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a46d] font-mono cursor-pointer"
                    >
                      <option value="Price too high">Price too high</option>
                      <option value="Delivery taking too long">Delivery taking too long</option>
                      <option value="Ordered by mistake">Ordered by mistake</option>
                      <option value="Changed my mind">Changed my mind</option>
                      <option value="Found a better product">Found a better product</option>
                      <option value="Payment or COD issue">Payment or COD issue</option>
                      <option value="Wrong size or product">Wrong size or product</option>
                      <option value="Duplicate order">Duplicate order</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-2">
                      Additional Details / Feedback (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={cancelCustomNotes}
                      onChange={(e) => setCancelCustomNotes(e.target.value)}
                      placeholder="Provide additional details for the atelier team..."
                      className="w-full bg-black border border-white/15 p-3 text-xs text-white focus:outline-none focus:border-[#c5a46d] font-mono"
                    />
                  </div>

                  <div className="p-3 bg-red-950/20 border border-red-500/30 text-[11px] font-mono text-red-300 leading-relaxed">
                    Warning: Cancelling will immediately release reserved inventory back into our atelier stock and void the Cash on Delivery request. This action cannot be reversed.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => setCancelModalOrder(null)}
                    className="px-4 py-2.5 border border-white/15 hover:border-white text-xs font-mono uppercase tracking-wider text-neutral-300 transition-colors cursor-pointer"
                  >
                    Keep Order
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={handleExecuteCancel}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs font-mono uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    {isCancelling ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Cancelling Order...</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        <span>Confirm Cancellation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
