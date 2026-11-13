import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // 1. Fetch all products marked as archived
    const { data: archivedProds, error: fetchErr } = await supabase
      .from("products")
      .select("id, name, slug")
      .or("is_archived.eq.true,slug.in.(noir-phantom-hoodie,noir-shadow-sneaker,noir-exoskeleton-jacket,noir-atelier-cargo-pant,noir-monolith-heavy-tee,noir-solstice-leather-bomber,noir-cipher-vest,noir-cyber-mask)");

    if (fetchErr) {
      console.warn("Could not query archived products:", fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!archivedProds || archivedProds.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No archived or demo products found to purge.",
      });
    }

    const ids = archivedProds.map((p) => p.id);

    // 2. Delete any demo order_items referencing these products or demo names
    await supabase.from("order_items").delete().in("product_id", ids);
    await supabase
      .from("order_items")
      .delete()
      .or("product_name.ilike.%phantom%,product_name.ilike.%solstice%,product_name.ilike.%monolith%,product_name.ilike.%shadow runner%,product_name.ilike.%atelier%");

    // 2.1 Also remove any orders created with demo DHL-EXP waybill or Atelier courier
    await supabase
      .from("orders")
      .delete()
      .or("courier_name.ilike.%atelier%,tracking_number.ilike.%DHL-EXP%");

    // 3. Delete dependent product variants
    await supabase.from("product_variants").delete().in("product_id", ids);

    // 4. Delete dependent product images
    await supabase.from("product_images").delete().in("product_id", ids);

    // 5. Permanently delete the archived products
    const { error: delErr } = await supabase.from("products").delete().in("id", ids);

    if (delErr) {
      console.warn("Error deleting products:", delErr.message);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: ids.length,
      purgedProducts: archivedProds.map((p) => p.name),
      message: `Successfully purged ${ids.length} archived/demo product(s) permanently.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error purging archived products";
    console.error("Purge archived products exception:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

