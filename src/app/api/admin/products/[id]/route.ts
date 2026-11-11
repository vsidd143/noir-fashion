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
    return { user, isAdmin: false, error: "Forbidden: Master Atelier Administrator privileges required.", status: 403 };
  }

  return { user, isAdmin: true, error: null, status: 200 };
}

// PUT /api/admin/products/[id] - Update existing product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
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
      stock_quantity,
      is_published,
      is_archived,
      is_new_arrival,
      is_featured,
      is_best_seller,
      is_limited,
      sizes,
      colors,
      tags,
      details,
      images,
    } = body;

    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateFields.name = String(name).trim();
    if (subtitle !== undefined) updateFields.subtitle = subtitle ? String(subtitle).trim() : null;
    if (description !== undefined) updateFields.description = description ? String(description).trim() : null;
    if (department !== undefined) {
      const validDepartments = ["men", "women", "kids"];
      const rawDept = String(department).toLowerCase().trim();
      if (!validDepartments.includes(rawDept)) {
        return NextResponse.json(
          { error: "A valid department (men, women, kids) must be selected." },
          { status: 400 }
        );
      }
      updateFields.department = rawDept;
    }
    if (category_id !== undefined) updateFields.category_id = category_id || null;
    if (product_type_id !== undefined) updateFields.product_type_id = product_type_id || null;
    if (price !== undefined) updateFields.price = Number(price);
    if (regular_price !== undefined) updateFields.regular_price = Number(regular_price);
    if (discounted_price !== undefined) updateFields.discounted_price = Number(discounted_price);
    if (cost_price !== undefined) updateFields.cost_price = cost_price ? Number(cost_price) : null;
    if (material !== undefined) updateFields.material = material ? String(material).trim() : null;
    if (fit !== undefined) updateFields.fit = fit ? String(fit).trim() : null;
    if (sku !== undefined) updateFields.sku = sku ? String(sku).trim() : null;
    if (stock_quantity !== undefined) updateFields.stock_quantity = Math.max(0, Number(stock_quantity));
    if (is_published !== undefined) updateFields.is_published = Boolean(is_published);
    if (is_archived !== undefined) updateFields.is_archived = Boolean(is_archived);
    if (is_new_arrival !== undefined) updateFields.is_new_arrival = Boolean(is_new_arrival);
    if (is_featured !== undefined) updateFields.is_featured = Boolean(is_featured);
    if (is_best_seller !== undefined) updateFields.is_best_seller = Boolean(is_best_seller);
    if (is_limited !== undefined) updateFields.is_limited = Boolean(is_limited);
    if (tags !== undefined) updateFields.tags = Array.isArray(tags) ? tags : [];
    if (details !== undefined) updateFields.details = Array.isArray(details) ? details : [];

    // 1. Update main product row
    const { error: updateErr } = await supabase
      .from("products")
      .update(updateFields)
      .eq("id", productId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 2. Refresh Images if supplied
    if (Array.isArray(images) && images.length > 0) {
      await supabase.from("product_images").delete().eq("product_id", productId);
      const imageRecords = images.map((img: { url: string; is_primary?: boolean }, idx: number) => ({
        product_id: productId,
        url: typeof img === "string" ? img : img.url,
        is_primary: typeof img === "object" ? Boolean(img.is_primary || idx === 0) : idx === 0,
        display_order: idx + 1,
      }));
      await supabase.from("product_images").insert(imageRecords);
    }

    // 3. Refresh Variants if sizes supplied
    if (Array.isArray(sizes) && sizes.length > 0) {
      await supabase.from("product_variants").delete().eq("product_id", productId);
      const activeColors = Array.isArray(colors) && colors.length > 0 ? colors : [{ name: "Obsidian Black", hex: "#0a0a0a" }];
      const totalStock = typeof stock_quantity === "number" ? stock_quantity : 10;
      const perSizeStock = Math.max(1, Math.floor(totalStock / sizes.length));

      const variantRecords = sizes.flatMap((sizeStr: string) =>
        activeColors.map((col: { name: string; hex: string }) => ({
          product_id: productId,
          color_name: col.name || "Obsidian Black",
          color_hex: col.hex || "#0a0a0a",
          size: sizeStr,
          stock_quantity: perSizeStock,
          sku: `${updateFields.sku || "NOIR"}-${(col.name || "BLK").substring(0, 3)}-${sizeStr}`.toUpperCase(),
        }))
      );
      await supabase.from("product_variants").insert(variantRecords);
    }

    return NextResponse.json({ success: true, message: "Product silhouette updated successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal product update error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id] - Safe deletion workflow
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    // Check whether product is referenced by historical orders
    const { count: orderItemsCount } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);

    if (orderItemsCount && orderItemsCount > 0) {
      // Safely archive the product to preserve historical customer orders
      const { error: archiveErr } = await supabase
        .from("products")
        .update({
          is_archived: true,
          is_published: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (archiveErr) {
        return NextResponse.json({ error: archiveErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "archived",
        message: `Product is referenced by ${orderItemsCount} historical order(s). It has been safely archived and unpublished from the storefront without damaging order history.`,
      });
    }

    // No historical orders reference this product -> safe to delete row
    const { error: deleteErr } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteErr) {
      // Fallback to archive if any unexpected foreign key blocks deletion
      await supabase
        .from("products")
        .update({ is_archived: true, is_published: false })
        .eq("id", productId);

      return NextResponse.json({
        success: true,
        action: "archived",
        message: "Product safely archived to prevent relational constraint issues.",
      });
    }

    return NextResponse.json({
      success: true,
      action: "deleted",
      message: "Product silhouette permanently deleted from Supabase.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal product deletion error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

