import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, receipt, customer } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
    }

    const keyId =
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

    const amountInPaise = Math.round(Number(amount) * 100);

    // If live or test keys are present in environment variables, call official Razorpay API
    if (keyId && keySecret) {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: receipt || `rcpt_${Date.now()}`,
          notes: {
            customer_name: customer?.name || "Customer",
            customer_email: customer?.email || "",
            customer_phone: customer?.phone || "",
          },
        }),
      });

      const rzpData = await rzpRes.json();

      if (!rzpRes.ok) {
        console.error("Razorpay API order error:", rzpData);
        return NextResponse.json(
          { error: rzpData.error?.description || "Failed to create Razorpay order." },
          { status: rzpRes.status }
        );
      }

      return NextResponse.json({
        success: true,
        orderId: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        keyId: keyId,
        isMock: false,
      });
    }

    // Dev/Sandbox simulation fallback when keys are not yet configured in .env.local
    const mockOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return NextResponse.json({
      success: true,
      orderId: mockOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: keyId || "rzp_test_simulated",
      isMock: true,
      message: "Razorpay Test/Simulation mode active. Configure RAZORPAY_KEY_SECRET in .env.local for production gateway.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Razorpay order creation exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

