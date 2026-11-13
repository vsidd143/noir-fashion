import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  try {
    // 1. Find demo items in order_items
    const { data: demoItems, error: itemsErr } = await supabase
      .from("order_items")
      .select("id, order_id, product_name")
      .or("product_name.ilike.%phantom%,product_name.ilike.%solstice%,product_name.ilike.%monolith%,product_name.ilike.%shadow runner%,product_name.ilike.%atelier%");

    let purgedOrderCount = 0;

    if (demoItems && demoItems.length > 0) {
      const orderIds = Array.from(new Set(demoItems.map((i) => i.order_id).filter(Boolean)));
      
      // Delete demo order items
      await supabase
        .from("order_items")
        .delete()
        .in("id", demoItems.map((i) => i.id));

      // Delete the parent orders that contained these demo items
      if (orderIds.length > 0) {
        const { error: orderDelErr } = await supabase
          .from("orders")
          .delete()
          .in("id", orderIds);

        if (!orderDelErr) {
          purgedOrderCount += orderIds.length;
        }
      }
    }

    // 2. Also purge any orders that have "Atelier" or "DHL-EXP" in courier or tracking
    const { data: atelierOrders } = await supabase
      .from("orders")
      .select("id")
      .or("courier_name.ilike.%atelier%,tracking_number.ilike.%DHL-EXP%");

    if (atelierOrders && atelierOrders.length > 0) {
      const ids = atelierOrders.map((o) => o.id);
      await supabase.from("order_items").delete().in("order_id", ids);
      await supabase.from("orders").delete().in("id", ids);
      purgedOrderCount += ids.length;
    }

    return NextResponse.json({
      success: true,
      purgedCount: purgedOrderCount,
      message: `Successfully purged ${purgedOrderCount} demo/archive orders.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to purge demo orders";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

