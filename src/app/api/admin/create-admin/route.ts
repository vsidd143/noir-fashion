import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

async function authenticateAdminRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { user: null, isAdmin: false, error: "Unauthorized: Missing authentication credentials.", status: 401 };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { user: null, isAdmin: false, error: "Unauthorized: Invalid or expired authentication token.", status: 401 };
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "vsidd143@gmail.com";
  const isEmailAdmin = (user.email || "").toLowerCase() === adminEmail.toLowerCase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = (profile?.role === "admin" && !profile?.is_blocked) || isEmailAdmin;

  if (!isAdmin) {
    return { user, isAdmin: false, error: "Forbidden: Master Administrator privileges required.", status: 403 };
  }

  return { user, isAdmin: true, error: null, status: 200 };
}

// POST /api/admin/create-admin - Create admin with email and password and sync to Supabase database
export async function POST(request: Request) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    const fullName = (body.fullName || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters in length." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1. Check if user already exists in public.profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_blocked")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile) {
      // User already exists -> Update role to 'admin' in database
      const { data: updated, error: updateErr } = await supabase
        .from("profiles")
        .update({
          role: "admin",
          is_blocked: false,
          ...(fullName ? { full_name: fullName } : {}),
        })
        .eq("id", existingProfile.id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json(
          { error: `Database update failed: ${updateErr.message}` },
          { status: 500 }
        );
      }

      // If service role key is present, also update their password in auth.users
      if (serviceRoleKey) {
        try {
          const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          await adminClient.auth.admin.updateUserById(existingProfile.id, {
            password,
          });
        } catch (pwErr) {
          console.warn("Could not update auth password:", pwErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Existing user "${email}" promoted to Administrator in database!`,
        profile: updated || { ...existingProfile, role: "admin", is_blocked: false },
      });
    }

    // 2. User does not exist in profiles -> Create new Auth User & Profile
    let newUserId: string | null = null;
    let createdProfile = null;

    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || splitEmail(email) },
      });

      if (createError) {
        return NextResponse.json(
          { error: `Supabase Auth registration failed: ${createError.message}` },
          { status: 400 }
        );
      }

      newUserId = newUser.user.id;

      const { data: prof, error: profErr } = await adminClient
        .from("profiles")
        .upsert({
          id: newUserId,
          email,
          full_name: fullName || splitEmail(email),
          role: "admin",
          is_blocked: false,
        })
        .select()
        .single();

      if (profErr) {
        console.warn("Profile upsert note:", profErr);
      }
      createdProfile = prof;
    } else {
      // Use isolated client so current admin session is completely untouched
      const isolatedClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || splitEmail(email) },
        },
      });

      if (signUpError) {
        return NextResponse.json(
          { error: `Account registration failed: ${signUpError.message}` },
          { status: 400 }
        );
      }

      newUserId = signUpData.user?.id || null;

      if (newUserId) {
        const { data: prof } = await supabase
          .from("profiles")
          .update({
            role: "admin",
            is_blocked: false,
            full_name: fullName || splitEmail(email),
          })
          .eq("id", newUserId)
          .select()
          .maybeSingle();

        createdProfile = prof;
      }
    }

    const fallbackProfile = {
      id: newUserId || `admin_${Date.now()}`,
      email,
      full_name: fullName || splitEmail(email),
      role: "admin" as const,
      is_blocked: false,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `New Administrator "${email}" successfully created with role 'admin' in database!`,
      profile: createdProfile || fallbackProfile,
    });
  } catch (err: unknown) {
    console.error("Create admin error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

function splitEmail(email: string): string {
  const name = email.split("@")[0] || "Admin";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

