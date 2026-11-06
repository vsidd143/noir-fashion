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
    // 1. Authenticate Supabase caller
    const auth = await authenticateOrderRequest(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { orderId, orderNumber } = body;

    if (!orderId && !orderNumber) {
      return NextResponse.json(
        { error: "Order identifier (orderId or orderNumber) is required." },
        { status: 400 }
      );
    }

    // 2. Fetch current order state to validate lifecycle and ownership
    let query = supabase.from("orders").select("*");
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
        { error: "Forbidden: You are not authorized to modify another patron's order." },
        { status: 403 }
      );
    }

    // 4. Validate state machine
    if (existingOrder.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot confirm an already cancelled order." },
        { status: 400 }
      );
    }

    if (existingOrder.status === "confirmed") {
      return NextResponse.json(
        { success: true, message: "Order is already confirmed.", order: existingOrder },
        { status: 200 }
      );
    }

    if (["shipped", "delivered"].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: "Order is already in delivery pipeline and cannot be re-confirmed." },
        { status: 400 }
      );
    }

    // 5. Update status in Supabase
    const now = new Date().toISOString();
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "confirmed",
        customer_confirmed_at: now,
        updated_at: now,
      })
      .eq("id", existingOrder.id)
      .select("*, items:order_items(*)")
      .single();

    if (updateError) {
      // Fallback if customer_confirmed_at column is not yet present
      const { data: fallbackOrder, error: fallbackError } = await supabase
        .from("orders")
        .update({
          status: "confirmed",
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
        message: "Order confirmed successfully.",
        order: fallbackOrder,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Order confirmed successfully.",
      order: updatedOrder,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
