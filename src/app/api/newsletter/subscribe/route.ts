import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Standard RFC-compliant email regex
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, source } = body;

    // 1. Validate email presence & type
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Validate email structure
    if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 254) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 3. Insert into Supabase newsletter_subscribers table
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({
        email: normalizedEmail,
        source: typeof source === "string" ? source.slice(0, 50) : "footer",
      });

    if (error) {
      // 4. Handle unique constraint violation (duplicate subscription)
      if (error.code === "23505" || error.message?.includes("duplicate key")) {
        return NextResponse.json(
          {
            success: false,
            error: "This email is already subscribed to the NOIR world.",
          },
          { status: 409 }
        );
      }

      // 5. Handle missing table error
      if (error.code === "42P01" || error.message?.includes("relation") && error.message?.includes("does not exist")) {
        console.error("Supabase error: newsletter_subscribers table does not exist.", error);
        return NextResponse.json(
          {
            success: false,
            error:
              "Subscription service is initializing. Please apply the newsletter_subscribers database migration in Supabase.",
          },
          { status: 500 }
        );
      }

      console.error("Supabase newsletter insertion error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to process subscription. Please try again.",
        },
        { status: 500 }
      );
    }

    // 6. Return verified success
    return NextResponse.json({
      success: true,
      message: "Thank you for joining the NOIR world.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    console.error("Newsletter API unexpected error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

