import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderPayload,
      items,
      isMock,
    } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

    // If real keys are present and not mock, verify cryptographic HMAC signature
    if (!isMock && keySecret) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json(
          { error: "Missing required Razorpay signature parameters." },
          { status: 400 }
        );
      }

      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        console.error("Razorpay signature mismatch:", {
          generated: generatedSignature,
          received: razorpay_signature,
        });
        return NextResponse.json(
          { error: "Payment verification failed: Invalid transaction signature." },
          { status: 400 }
        );
      }
    }

    // Prepare confirmed database order payload
    const paymentId = razorpay_payment_id || `pay_sim_${Date.now()}`;
    const confirmedOrderPayload = {
      ...orderPayload,
      payment_method: "Razorpay (UPI / Card / Scanner)",
      payment_status: "paid",
      status: "confirmed",
      notes: `${orderPayload?.notes ? orderPayload.notes + " • " : ""}Razorpay ID: ${paymentId}`,
      updated_at: new Date().toISOString(),
    };

    // 1. Insert order into public.orders
    const { data: dbOrder, error: dbErr } = await supabase
      .from("orders")
      .insert(confirmedOrderPayload)
      .select()
      .single();

    if (dbErr) {
      console.error("Failed to record Razorpay confirmed order in database:", dbErr);
      return NextResponse.json(
        { error: dbErr.message || "Failed to persist order in database." },
        { status: 500 }
      );
    }

    // 2. Insert order items if present
    if (dbOrder && Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        order_id: dbOrder.id,
        product_id: item.product_id || null,
        product_name: item.name || item.product_name,
        product_image: item.image || item.product_image || "",
        color_name: item.color_name || "Standard",
        size: item.size || "M",
        unit_price: item.price || item.unit_price,
        quantity: item.quantity,
        total_price: (item.price || item.unit_price) * item.quantity,
      }));

      await supabase.from("order_items").insert(itemsToInsert);

      // Decrement stock in database with resilient fallback
      for (const item of items) {
        if (!item.product_id) continue;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.product_id);
        let rpcSuccess = false;

        if (isUuid) {
          try {
            const { error: decrErr } = await supabase.rpc("decrement_product_stock", {
              p_product_id: item.product_id,
              p_qty: item.quantity,
            });
            if (!decrErr) rpcSuccess = true;
          } catch {}
        }

        if (!rpcSuccess) {
          try {
            const { data: pData } = await supabase
              .from("products")
              .select("stock_quantity")
              .eq(isUuid ? "id" : "slug", item.product_id)
              .maybeSingle();

            if (pData) {
              const newQty = Math.max(0, (pData.stock_quantity ?? 10) - item.quantity);
              await supabase
                .from("products")
                .update({ stock_quantity: newQty })
                .eq(isUuid ? "id" : "slug", item.product_id);
            }
          } catch {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      orderNumber: dbOrder.order_number,
      orderId: dbOrder.id,
      paymentId: paymentId,
      message: "Payment successfully verified and order confirmed.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal payment verification error";
    console.error("Razorpay verify exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
