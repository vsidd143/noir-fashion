import { NextResponse } from "next/server";
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

// GET /api/admin/products - List all products for Admin
export async function GET(request: Request) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        category:categories(slug, name),
        product_type:product_types(slug, name),
        images:product_images(id, url, is_primary, display_order),
        variants:product_variants(id, color_name, color_hex, size, stock_quantity, sku)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/products - Create a new product with full validation
export async function POST(request: Request) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      name,
      subtitle,
      description,
      department,
      category_id,
      product_type_id,
      price,
      regular_price,
      discounted_price,
      cost_price,
      material,
      fit,
      sku,
      stock_quantity = 10,
      is_published = true,
      is_new_arrival = true,
      is_featured = false,
      is_best_seller = false,
      is_limited = false,
      sizes = ["S", "M", "L", "XL"],
      colors = [{ name: "Obsidian Black", hex: "#0a0a0a" }],
      tags = [],
      details = [],
      images = [],
    } = body;

    // Server-side validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Product name must be at least 2 characters." }, { status: 400 });
    }

    const validDepartments = ["men", "women", "kids"];
    const rawDept = department ? String(department).toLowerCase().trim() : "";
    if (!rawDept || !validDepartments.includes(rawDept)) {
      return NextResponse.json(
        { error: "A valid department (men, women, kids) must be explicitly selected." },
        { status: 400 }
      );
    }
    const cleanDept = rawDept as "men" | "women" | "kids";

    const numPrice = Number(price);
    const numRegularPrice = Number(regular_price || price);

    if (isNaN(numPrice) || numPrice <= 0) {
      return NextResponse.json({ error: "Selling price must be a positive number." }, { status: 400 });
    }

    if (isNaN(numRegularPrice) || numRegularPrice <= 0) {
      return NextResponse.json({ error: "Regular price must be a positive number." }, { status: 400 });
    }

    if (numPrice > numRegularPrice) {
      return NextResponse.json(
        { error: "Selling price cannot exceed the regular MRP price." },
        { status: 400 }
      );
    }

    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    const finalSku = (sku || `${cleanDept.toUpperCase()}-${baseSlug.substring(0, 4)}-${Math.floor(100 + Math.random() * 900)}`).toUpperCase();

    // Consolidated tags ensuring department & new arrival searchability
    const finalTags = Array.from(
      new Set([
        ...(tags || []),
        cleanDept,
        ...(is_new_arrival ? ["new", "new arrival"] : []),
        ...(is_best_seller ? ["best seller", "bestseller"] : []),
        ...(is_limited ? ["limited edition"] : []),
      ])
    );

    // 1. Insert product
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        slug: uniqueSlug,
        subtitle: subtitle?.trim() || null,
        description: description?.trim() || null,
        department: cleanDept,
        category_id: category_id || null,
        product_type_id: product_type_id || null,
        price: numPrice,
        regular_price: numRegularPrice,
        original_price: numRegularPrice,
        discounted_price: Number(discounted_price || numPrice),
        cost_price: cost_price ? Number(cost_price) : null,
        material: material?.trim() || null,
        fit: fit?.trim() || null,
        sku: finalSku,
        stock_quantity: Math.max(0, Number(stock_quantity)),
        is_published: Boolean(is_published),
        is_archived: false,
        is_new_arrival: Boolean(is_new_arrival),
        is_featured: Boolean(is_featured),
        is_best_seller: Boolean(is_best_seller),
        is_limited: Boolean(is_limited),
        rating: 0,
        reviews_count: 0,
        tags: finalTags,
        details: details.length > 0 ? details : ["Hand-finished construction", "Pre-shrunk architectural drape"],
      })
      .select()
      .single();

    if (prodErr || !product) {
      return NextResponse.json({ error: prodErr?.message || "Failed to create product record in Supabase." }, { status: 500 });
    }

    const productId = product.id;

    // 2. Insert Images
    if (Array.isArray(images) && images.length > 0) {
      const imageRecords = images.map((img: { url: string; is_primary?: boolean }, idx: number) => ({
        product_id: productId,
        url: typeof img === "string" ? img : img.url,
        is_primary: typeof img === "object" ? Boolean(img.is_primary || idx === 0) : idx === 0,
        display_order: idx + 1,
      }));
      await supabase.from("product_images").insert(imageRecords);
    }

    // 3. Insert Variants for selected sizes
    const activeSizes = Array.isArray(sizes) && sizes.length > 0 ? sizes : ["M"];
    const activeColors = Array.isArray(colors) && colors.length > 0 ? colors : [{ name: "Obsidian Black", hex: "#0a0a0a" }];
    const perSizeStock = Math.max(1, Math.floor(Number(stock_quantity) / activeSizes.length));

    const variantRecords = activeSizes.flatMap((sizeStr: string) =>
      activeColors.map((col: { name: string; hex: string }) => ({
        product_id: productId,
        color_name: col.name || "Obsidian Black",
        color_hex: col.hex || "#0a0a0a",
        size: sizeStr,
        stock_quantity: perSizeStock,
        sku: `${finalSku}-${(col.name || "BLK").substring(0, 3)}-${sizeStr}`.toUpperCase(),
      }))
    );

    await supabase.from("product_variants").insert(variantRecords);

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal product creation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

