import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function authenticateOrderRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { user: null, isAdmin: false, error: "Unauthorized: Missing authentication credentials.", status: 401 };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { user: null, isAdmin: false, error: "Unauthorized: Invalid or expired authentication token.", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" && !profile?.is_blocked;

  return { user, isAdmin, error: null, status: 200 };
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller
    const auth = await authenticateOrderRequest(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { orderId, orderNumber, reason, notes } = body;

    if (!orderId && !orderNumber) {
      return NextResponse.json(
        { error: "Order identifier (orderId or orderNumber) is required." },
        { status: 400 }
      );
    }

    const cleanReason = (reason && typeof reason === "string" ? reason.trim() : "") || "Customer requested cancellation";
    const cleanNotes = notes && typeof notes === "string" ? notes.trim() : null;

    // 2. Fetch current order state to validate cancellation eligibility and ownership
    let query = supabase.from("orders").select("*, items:order_items(*)");
    if (orderId && orderId.length === 36 && orderId.includes("-")) {
      query = query.eq("id", orderId);
    } else {
      query = query.eq("order_number", orderNumber || orderId);
    }

    const { data: existingOrder, error: fetchError } = await query.maybeSingle();

    if (fetchError || !existingOrder) {
      return NextResponse.json(
        { error: "Order not found in database." },
        { status: 404 }
      );
    }

    // 3. Verify Ownership or Admin Override
    const isOwner =
      (existingOrder.user_id && existingOrder.user_id === auth.user.id) ||
      (existingOrder.customer_email &&
        existingOrder.customer_email.toLowerCase() === (auth.user.email || "").toLowerCase());

    if (!auth.isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to cancel another patron's order." },
        { status: 403 }
      );
    }

    // 4. Validate eligibility
    if (existingOrder.status === "cancelled") {
      return NextResponse.json(
        { success: true, message: "Order is already cancelled.", order: existingOrder },
        { status: 200 }
      );
    }

    if (["shipped", "out_for_delivery", "delivered"].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: "Orders that are already shipped or delivered cannot be cancelled." },
        { status: 400 }
      );
    }

    // 5. Update status in Supabase
    const now = new Date().toISOString();
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: cleanReason,
        cancellation_notes: cleanNotes,
        previous_status: existingOrder.status,
        updated_at: now,
      })
      .eq("id", existingOrder.id)
      .select("*, items:order_items(*)")
      .single();

    if (!updateError && updatedOrder) {
      // Record in audit log tables if present
      try {
        await supabase.from("order_cancellations").insert({
          order_id: existingOrder.id,
          customer_id: existingOrder.user_id || auth.user.id,
          customer_email: existingOrder.customer_email,
          cancellation_reason: cleanReason,
          additional_explanation: cleanNotes,
          previous_status: existingOrder.status,
          new_status: "cancelled",
          cancelled_at: now,
        });

        await supabase.from("order_status_history").insert({
          order_id: existingOrder.id,
          previous_status: existingOrder.status,
          new_status: "cancelled",
          changed_by: auth.user.id,
          notes: cleanReason + (cleanNotes ? ` - ${cleanNotes}` : ""),
          created_at: now,
        });
      } catch {}

      // Inventory Rollback: Restore stock quantity for cancelled items
      if (existingOrder.items && Array.isArray(existingOrder.items)) {
        for (const item of existingOrder.items) {
          if (item.product_id && item.quantity) {
            try {
              await supabase.rpc("increment_product_stock", {
                p_product_id: item.product_id,
                p_qty: item.quantity,
              });
            } catch {
              try {
                const { data: prod } = await supabase
                  .from("products")
                  .select("stock_quantity")
                  .eq("id", item.product_id)
                  .single();
                if (prod) {
                  await supabase
                    .from("products")
                    .update({ stock_quantity: (prod.stock_quantity || 0) + item.quantity })
                    .eq("id", item.product_id);
                }
              } catch {}
            }
          }
        }
      }
    }

    if (updateError) {
      // Fallback if extra columns not yet present in schema
      const { data: fallbackOrder, error: fallbackError } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          updated_at: now,
        })
        .eq("id", existingOrder.id)
        .select()
        .single();

      if (fallbackError) {
        return NextResponse.json(
          { error: fallbackError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Order cancelled successfully.",
        order: fallbackOrder,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully.",
      order: updatedOrder,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
