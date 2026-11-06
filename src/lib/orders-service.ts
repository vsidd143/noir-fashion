import { supabase } from "@/lib/supabase";

export interface OrderItemRecord {
  product_name: string;
  product_image?: string;
  color_name?: string;
  size?: string;
  quantity: number;
  unit_price: number;
}

export interface CustomerOrder {
  id: string;
  order_number: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    addressType?: string;
  };
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  payment_method: string;
  payment_status: string;
  subtotal?: number;
  discount_amount?: number;
  shipping_fee?: number;
  tax_amount?: number;
  total_amount: number;
  coupon_code?: string | null;
  tracking_number?: string;
  courier_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  customer_confirmed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancellation_notes?: string | null;
  items?: OrderItemRecord[];
}

/**
 * Confirms a customer order in Supabase.
 * Updates status to 'confirmed' and sets 'customer_confirmed_at'.
 */
export async function confirmCustomerOrder(
  orderId: string,
  orderNumber?: string
): Promise<{ success: boolean; order?: CustomerOrder; error?: string }> {
  const now = new Date().toISOString();

  // 1. Primary: Next.js Secure Server API with Bearer token authentication
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const res = await fetch("/api/orders/confirm", {
      method: "POST",
      headers,
      body: JSON.stringify({ orderId, orderNumber }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.order) {
        syncOrderToLocalStorage(orderId, orderNumber, {
          status: "confirmed",
          customer_confirmed_at: now,
          updated_at: now,
        });
        return { success: true, order: data.order as CustomerOrder };
      }
    } else if (res.status === 401 || res.status === 403 || res.status === 400) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `HTTP error ${res.status}` };
    }
  } catch (apiErr) {
    console.warn("API confirm order note:", apiErr);
  }

  // 2. Direct Supabase RPC function fallback if available
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("confirm_customer_order", {
      p_order_id: orderId,
    });

    if (!rpcError && rpcData) {
      syncOrderToLocalStorage(orderId, orderNumber, {
        status: "confirmed",
        customer_confirmed_at: now,
        updated_at: now,
      });
      return { success: true, order: rpcData as CustomerOrder };
    }
  } catch (err) {
    console.warn("RPC confirm_customer_order note:", err);
  }

  // 2. Direct Supabase update fallback (handles standard table schema)
  try {
    let query = supabase
      .from("orders")
      .update({
        status: "confirmed",
        customer_confirmed_at: now,
        updated_at: now,
      });

    // Check if UUID vs text order_number
    if (orderId && orderId.length === 36 && orderId.includes("-")) {
      query = query.eq("id", orderId);
    } else if (orderNumber) {
      query = query.eq("order_number", orderNumber);
    } else {
      query = query.eq("order_number", orderId);
    }

    const { data, error } = await query.select("*, items:order_items(*)").maybeSingle();

    if (!error && data) {
      syncOrderToLocalStorage(orderId, orderNumber, {
        status: "confirmed",
        customer_confirmed_at: now,
        updated_at: now,
      });
      return { success: true, order: data as CustomerOrder };
    }

    // If customer_confirmed_at column is not yet migrated, fallback to updating status only
    if (error && (error.message.includes("column") || error.code === "42703")) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("orders")
        .update({ status: "confirmed", updated_at: now })
        .eq(orderNumber ? "order_number" : "id", orderNumber || orderId)
        .select()
        .maybeSingle();

      if (!fallbackError && fallbackData) {
        syncOrderToLocalStorage(orderId, orderNumber, {
          status: "confirmed",
          customer_confirmed_at: now,
          updated_at: now,
        });
        return { success: true, order: fallbackData as CustomerOrder };
      }
    }

    if (error) {
      // Local storage fallback for offline/demo orders
      const updatedLocal = syncOrderToLocalStorage(orderId, orderNumber, {
        status: "confirmed",
        customer_confirmed_at: now,
        updated_at: now,
      });
      if (updatedLocal) {
        return { success: true, order: updatedLocal };
      }
      return { success: false, error: error.message };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to confirm order";
    // Sync local storage
    const updatedLocal = syncOrderToLocalStorage(orderId, orderNumber, {
      status: "confirmed",
      customer_confirmed_at: now,
      updated_at: now,
    });
    if (updatedLocal) return { success: true, order: updatedLocal };
    return { success: false, error: message };
  }

  return { success: false, error: "Order could not be confirmed" };
}

/**
 * Cancels a customer order in Supabase.
 * Updates status to 'cancelled', records 'cancelled_at' and 'cancellation_reason'.
 */
export async function cancelCustomerOrder(
  orderId: string,
  reason: string,
  orderNumber?: string,
  notes?: string
): Promise<{ success: boolean; order?: CustomerOrder; error?: string }> {
  const now = new Date().toISOString();
  const cleanReason = reason.trim() || "Customer requested cancellation";
  const cleanNotes = notes ? notes.trim() : null;

  // 1. Primary: Next.js Secure Server API with Bearer token authentication
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const res = await fetch("/api/orders/cancel", {
      method: "POST",
      headers,
      body: JSON.stringify({ orderId, orderNumber, reason: cleanReason, notes: cleanNotes }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.order) {
        syncOrderToLocalStorage(orderId, orderNumber, {
          status: "cancelled",
          cancelled_at: now,
          cancellation_reason: cleanReason,
          cancellation_notes: cleanNotes,
          updated_at: now,
        });
        return { success: true, order: data.order as CustomerOrder };
      }
    } else if (res.status === 401 || res.status === 403 || res.status === 400) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `HTTP error ${res.status}` };
    }
  } catch (apiErr) {
    console.warn("API cancel order note:", apiErr);
  }

  // 2. Direct Supabase RPC function fallback if available
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("record_order_cancellation", {
      p_order_id: orderId,
      p_reason: cleanReason,
      p_notes: cleanNotes,
    });

    if (!rpcError && rpcData) {
      syncOrderToLocalStorage(orderId, orderNumber, {
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: cleanReason,
        cancellation_notes: cleanNotes,
        updated_at: now,
      });
      return { success: true, order: rpcData as CustomerOrder };
    }
  } catch (err) {
    console.warn("RPC record_order_cancellation note:", err);
  }

  // 2. Fallback to cancel_customer_order RPC
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("cancel_customer_order", {
      p_order_id: orderId,
      p_reason: cleanReason,
    });

    if (!rpcError && rpcData) {
      syncOrderToLocalStorage(orderId, orderNumber, {
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: cleanReason,
        cancellation_notes: cleanNotes,
        updated_at: now,
      });
      return { success: true, order: rpcData as CustomerOrder };
    }
  } catch (err) {
    console.warn("RPC cancel_customer_order note:", err);
  }

  // 3. Direct Supabase update fallback
  try {
    let query = supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: cleanReason,
        cancellation_notes: cleanNotes,
        updated_at: now,
      });

    if (orderId && orderId.length === 36 && orderId.includes("-")) {
      query = query.eq("id", orderId);
    } else if (orderNumber) {
      query = query.eq("order_number", orderNumber);
    } else {
      query = query.eq("order_number", orderId);
    }

    const { data, error } = await query.select("*, items:order_items(*)").maybeSingle();

    if (!error && data) {
      // Also record into order_cancellations table if it exists
      try {
        await supabase.from("order_cancellations").insert({
          order_id: data.id,
          customer_id: data.user_id,
          customer_email: data.customer_email,
          cancellation_reason: cleanReason,
          additional_explanation: cleanNotes,
          previous_status: data.previous_status || "pending",
          new_status: "cancelled",
          cancelled_at: now,
        });
      } catch {}

      syncOrderToLocalStorage(orderId, orderNumber, {
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: cleanReason,
        cancellation_notes: cleanNotes,
        updated_at: now,
      });
      return { success: true, order: data as CustomerOrder };
    }

    // Fallback if extra columns not in DB schema yet
    if (error && (error.message.includes("column") || error.code === "42703")) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("orders")
        .update({ status: "cancelled", updated_at: now })
        .eq(orderNumber ? "order_number" : "id", orderNumber || orderId)
        .select()
        .maybeSingle();

      if (!fallbackError && fallbackData) {
        syncOrderToLocalStorage(orderId, orderNumber, {
          status: "cancelled",
          cancelled_at: now,
          cancellation_reason: cleanReason,
          updated_at: now,
        });
        return { success: true, order: fallbackData as CustomerOrder };
      }
    }

    if (error) {
      const updatedLocal = syncOrderToLocalStorage(orderId, orderNumber, {
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: cleanReason,
        updated_at: now,
      });
      if (updatedLocal) return { success: true, order: updatedLocal };
      return { success: false, error: error.message };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to cancel order";
    const updatedLocal = syncOrderToLocalStorage(orderId, orderNumber, {
      status: "cancelled",
      cancelled_at: now,
      cancellation_reason: cleanReason,
      updated_at: now,
    });
    if (updatedLocal) return { success: true, order: updatedLocal };
    return { success: false, error: message };
  }

  return { success: false, error: "Order could not be cancelled" };
}

/**
 * Updates an order in local storage (mirrors database changes for zero-latency UI).
 */
function syncOrderToLocalStorage(
  orderId: string,
  orderNumber: string | undefined,
  fieldsToUpdate: Partial<CustomerOrder>
): CustomerOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("noir_local_orders");
    if (!stored) return null;
    const list: CustomerOrder[] = JSON.parse(stored);
    let matched: CustomerOrder | null = null;

    const updatedList = list.map((ord) => {
      if (
        (ord.id && ord.id === orderId) ||
        (orderNumber && ord.order_number === orderNumber) ||
        ord.order_number === orderId
      ) {
        matched = { ...ord, ...fieldsToUpdate };
        return matched;
      }
      return ord;
    });

    if (matched) {
      localStorage.setItem("noir_local_orders", JSON.stringify(updatedList));
      return matched;
    }
  } catch (e) {
    console.warn("Failed to update local storage orders:", e);
  }
  return null;
}

