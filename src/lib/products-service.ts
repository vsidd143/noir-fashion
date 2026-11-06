import { supabase } from "@/lib/supabase";
import { Product, ProductCategory, ProductColor } from "@/types/fashion";
import { PRODUCTS } from "@/data/products";

export type DbProduct = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  category_id: string | null;
  category?: { slug: string; name: string } | null;
  product_type_id?: string | null;
  product_type?: string | null;
  collection_id?: string | null;
  collection?: { slug: string; name: string } | null;
  price: number;
  original_price: number | null;
  regular_price?: number | null;
  discounted_price?: number | null;
  material: string | null;
  fit: string | null;
  weight_gsm: number | null;
  is_published: boolean;
  is_archived: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_limited: boolean;
  edition_count: number | null;
  stock_quantity: number;
  cost_price?: number | null;
  sku: string | null;
  rating: number;
  reviews_count: number;
  details: string[];
  tags: string[];
  images?: { id?: string; url: string; is_primary: boolean; display_order?: number }[];
  variants?: { id: string; color_name: string; color_hex: string; size: string; stock_quantity: number; sku: string }[];
  created_at: string;
};

/**
 * Maps Supabase DB Product to the frontend Product interface
 */
export function mapDbProductToFashion(dbProd: DbProduct): Product {
  const images =
    dbProd.images && dbProd.images.length > 0
      ? dbProd.images
          .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
          .map((img) => img.url)
      : ["/images/placeholder-silhouette.png"];

  // Aggregate colors from variants
  const colorMap = new Map<string, ProductColor>();
  if (dbProd.variants && dbProd.variants.length > 0) {
    dbProd.variants.forEach((v) => {
      if (!colorMap.has(v.color_hex)) {
        colorMap.set(v.color_hex, {
          name: v.color_name,
          hex: v.color_hex,
          bgClass: "",
        });
      }
    });
  }

  const colors = Array.from(colorMap.values());
  const fallbackColors = [
    { name: "Obsidian Black", hex: "#0a0a0a", bgClass: "bg-neutral-950" },
  ];

  // Aggregate unique sizes
  const sizes =
    dbProd.variants && dbProd.variants.length > 0
      ? Array.from(new Set(dbProd.variants.map((v) => v.size)))
      : ["S", "M", "L", "XL"];

  return {
    id: dbProd.slug || dbProd.id,
    name: dbProd.name,
    subtitle: dbProd.subtitle || "",
    category: (dbProd.category?.slug as ProductCategory) || "hoodies",
    price: Number(dbProd.price || dbProd.discounted_price || dbProd.regular_price || 0),
    originalPrice: dbProd.original_price
      ? Number(dbProd.original_price)
      : dbProd.regular_price
      ? Number(dbProd.regular_price)
      : undefined,
    images: images,
    thumbnail: images[0],
    colors: colors.length > 0 ? colors : fallbackColors,
    sizes: sizes,
    description: dbProd.description || "",
    details: dbProd.details || [],
    material: dbProd.material || "Premium Atelier Fabric",
    fit: dbProd.fit || "Standard Fit",
    weightGsm: dbProd.weight_gsm || undefined,
    isNew: dbProd.is_new_arrival ?? true,
    isLimited: dbProd.is_limited ?? false,
    editionCount: dbProd.edition_count || undefined,
    rating: Number(dbProd.rating) || 5.0,
    reviewsCount: dbProd.reviews_count || 0,
  };
}

// Cache Store & In-Flight Request Deduplication for Instant Navigation
let cachedLiveProducts: Product[] | null = null;
let cacheTimestamp = 0;
let pendingLiveProductsPromise: Promise<Product[]> | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function invalidateProductsCache() {
  cachedLiveProducts = null;
  cacheTimestamp = 0;
  pendingLiveProductsPromise = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("noir_cached_products");
    } catch {}
  }
}

/**
 * Synchronously retrieves initial products for instant zero-delay rendering.
 * Checks in-memory cache -> localStorage -> static catalog.
 */
export function getInitialProducts(): Product[] {
  if (cachedLiveProducts && cachedLiveProducts.length > 0) {
    return cachedLiveProducts;
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("noir_cached_products");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedLiveProducts = parsed;
          cacheTimestamp = Date.now();
          return parsed;
        }
      }
    } catch {}
  }

  return PRODUCTS;
}

/**
 * Fetches all active, published products from Supabase for customer-facing views.
 * Excludes archived or unpublished products.
 * Includes in-memory caching and request deduplication for 0ms page-to-page navigation.
 */
export async function getLiveProducts(forceRefresh = false): Promise<Product[]> {
  if (!forceRefresh && cachedLiveProducts && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedLiveProducts;
  }

  if (!forceRefresh && pendingLiveProductsPromise) {
    return pendingLiveProductsPromise;
  }

  pendingLiveProductsPromise = (async () => {
    let remoteList: Product[] = [];

    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(slug, name),
          images:product_images(id, url, is_primary, display_order),
          variants:product_variants(id, color_name, color_hex, size, stock_quantity, sku)
        `)
        .eq("is_archived", false)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        remoteList = data.map((d) => mapDbProductToFashion(d as unknown as DbProduct));
      }
    } catch (err) {
      console.warn("Could not query Supabase products:", err);
    }

    // Merge any locally registered products from Admin terminal
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("noir_local_products");
        if (stored) {
          const localProds: DbProduct[] = JSON.parse(stored);
          const remoteSlugs = new Set(remoteList.map((p) => p.id));
          const activeLocal = localProds
            .filter((lp) => !lp.is_archived && lp.is_published && !remoteSlugs.has(lp.slug || lp.id))
            .map((lp) => mapDbProductToFashion(lp));
          const combined = [...activeLocal, ...remoteList];
          cachedLiveProducts = combined;
          cacheTimestamp = Date.now();
          return combined;
        }
      } catch {}
    }

    cachedLiveProducts = remoteList;
    cacheTimestamp = Date.now();
    return remoteList;
  })().finally(() => {
    pendingLiveProductsPromise = null;
  });

  return pendingLiveProductsPromise;
}

/**
 * Fetches ALL products for the Admin Dashboard (including drafts & out-of-stock).
 */
export async function getAllAdminProducts(): Promise<DbProduct[]> {
  let remoteList: DbProduct[] = [];

  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        category:categories(slug, name),
        product_type:product_types(slug, name),
        collection:collections(slug, name),
        images:product_images(id, url, is_primary, display_order),
        variants:product_variants(id, color_name, color_hex, size, stock_quantity, sku)
      `)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      remoteList = data as unknown as DbProduct[];
    }
  } catch (err) {
    console.warn("Could not query Admin products:", err);
  }

  // Merge any locally registered products
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("noir_local_products");
      if (stored) {
        const localProds: DbProduct[] = JSON.parse(stored);
        const remoteIds = new Set(remoteList.map((p) => p.slug || p.id));
        const nonDup = localProds.filter((lp) => !remoteIds.has(lp.slug || lp.id));
        return [...nonDup, ...remoteList];
      }
    } catch {}
  }

  return remoteList;
}

/**
 * Inserts a new product and its variants/images into Supabase.
 */
export async function createProductInDb(payload: {
  name: string;
  subtitle?: string;
  description?: string;
  category_id?: string | null;
  product_type_id?: string | null;
  collection_id?: string | null;
  price: number;
  original_price?: number;
  regular_price?: number;
  discounted_price?: number;
  material?: string;
  fit?: string;
  sku?: string;
  stock_quantity?: number;
  cost_price?: number;
  is_published?: boolean;
  is_featured?: boolean;
  is_new_arrival?: boolean;
  is_best_seller?: boolean;
  is_limited?: boolean;
  tags?: string[];
  details?: string[];
  images: { url: string; is_primary: boolean; display_order: number }[];
  variants: { color_name: string; color_hex: string; size: string; stock_quantity: number; sku: string }[];
}): Promise<{ data: DbProduct | null; error: string | null; isRlsRestricted?: boolean }> {
  const baseSlug = payload.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

  try {
    // 1. Insert product record to Supabase
    const { data: newProd, error: prodErr } = await supabase
      .from("products")
      .insert({
        name: payload.name,
        slug: uniqueSlug,
        subtitle: payload.subtitle || null,
        description: payload.description || null,
        category_id: payload.category_id || null,
        product_type_id: payload.product_type_id || null,
        collection_id: payload.collection_id || null,
        price: payload.price,
        original_price: payload.original_price || payload.regular_price || null,
        regular_price: payload.regular_price || payload.original_price || payload.price,
        discounted_price: payload.discounted_price || payload.price,
        material: payload.material || null,
        fit: payload.fit || null,
        sku: payload.sku || null,
        stock_quantity: payload.stock_quantity || 10,
        cost_price: payload.cost_price || null,
        is_published: payload.is_published ?? true,
        is_archived: false,
        is_featured: payload.is_featured ?? false,
        is_new_arrival: payload.is_new_arrival ?? true,
        is_best_seller: payload.is_best_seller ?? false,
        is_limited: payload.is_limited ?? false,
        tags: payload.tags || [],
        details: payload.details || [],
      })
      .select()
      .single();

    if (prodErr || !newProd) {
      // If RLS blocked insert, persist locally as fail-safe
      if (typeof window !== "undefined") {
        const fallbackProduct: DbProduct = {
          id: "prod-" + Math.random().toString(36).substring(2, 9),
          slug: uniqueSlug,
          name: payload.name,
          subtitle: payload.subtitle || null,
          description: payload.description || null,
          category_id: payload.category_id || null,
          price: payload.price,
          original_price: payload.regular_price || null,
          regular_price: payload.regular_price || null,
          discounted_price: payload.discounted_price || null,
          material: payload.material || null,
          fit: payload.fit || null,
          weight_gsm: null,
          is_published: payload.is_published ?? true,
          is_archived: false,
          is_featured: payload.is_featured ?? false,
          is_new_arrival: payload.is_new_arrival ?? true,
          is_best_seller: payload.is_best_seller ?? false,
          is_limited: payload.is_limited ?? false,
          edition_count: null,
          stock_quantity: payload.stock_quantity || 10,
          sku: payload.sku || `${uniqueSlug}-SKU`.toUpperCase(),
          rating: 5.0,
          reviews_count: 0,
          details: payload.details || [],
          tags: payload.tags || [],
          images: payload.images,
          variants: payload.variants.map((v) => ({ ...v, id: "var-" + Math.random().toString(36).substring(2, 7) })),
          created_at: new Date().toISOString(),
        };

        try {
          const stored = localStorage.getItem("noir_local_products");
          const list = stored ? JSON.parse(stored) : [];
          localStorage.setItem("noir_local_products", JSON.stringify([fallbackProduct, ...list]));
        } catch {}

        invalidateProductsCache();
        return { data: fallbackProduct, error: null, isRlsRestricted: true };
      }

      return { data: null, error: prodErr?.message || "Failed to create product" };
    }

    const productId = newProd.id;

    // 2. Insert Images
    if (payload.images && payload.images.length > 0) {
      const imageRecords = payload.images.map((img, idx) => ({
        product_id: productId,
        url: img.url,
        is_primary: img.is_primary || idx === 0,
        display_order: img.display_order || idx + 1,
      }));
      await supabase.from("product_images").insert(imageRecords);
    }

    // 3. Insert Variants
    if (payload.variants && payload.variants.length > 0) {
      const variantRecords = payload.variants.map((v) => ({
        product_id: productId,
        color_name: v.color_name,
        color_hex: v.color_hex,
        size: v.size,
        stock_quantity: v.stock_quantity,
        sku: v.sku || `${uniqueSlug}-${v.color_name.substring(0, 3)}-${v.size}`.toUpperCase(),
      }));
      await supabase.from("product_variants").insert(variantRecords);
    }

    invalidateProductsCache();
    return { data: newProd as unknown as DbProduct, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Product creation error";
    return { data: null, error: msg };
  }
}

/**
 * Updates an existing product, updating images and variants.
 */
export async function updateProductInDb(
  productId: string,
  payload: Partial<DbProduct> & {
    images?: { url: string; is_primary: boolean; display_order: number }[];
    variants?: { color_name: string; color_hex: string; size: string; stock_quantity: number; sku: string }[];
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error: updateErr } = await supabase
      .from("products")
      .update({
        name: payload.name,
        subtitle: payload.subtitle,
        description: payload.description,
        category_id: payload.category_id,
        product_type_id: payload.product_type_id,
        collection_id: payload.collection_id,
        price: payload.price,
        original_price: payload.original_price,
        regular_price: payload.regular_price,
        discounted_price: payload.discounted_price,
        material: payload.material,
        fit: payload.fit,
        sku: payload.sku,
        stock_quantity: payload.stock_quantity,
        cost_price: payload.cost_price,
        is_published: payload.is_published,
        is_featured: payload.is_featured,
        is_new_arrival: payload.is_new_arrival,
        is_best_seller: payload.is_best_seller,
        is_limited: payload.is_limited,
        tags: payload.tags,
        details: payload.details,
      })
      .eq("id", productId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Refresh images if provided
    if (payload.images && payload.images.length > 0) {
      await supabase.from("product_images").delete().eq("product_id", productId);
      const imageRecords = payload.images.map((img, idx) => ({
        product_id: productId,
        url: img.url,
        is_primary: img.is_primary || idx === 0,
        display_order: img.display_order || idx + 1,
      }));
      await supabase.from("product_images").insert(imageRecords);
    }

    // Refresh variants if provided
    if (payload.variants && payload.variants.length > 0) {
      await supabase.from("product_variants").delete().eq("product_id", productId);
      const variantRecords = payload.variants.map((v) => ({
        product_id: productId,
        color_name: v.color_name,
        color_hex: v.color_hex,
        size: v.size,
        stock_quantity: v.stock_quantity,
        sku: v.sku,
      }));
      await supabase.from("product_variants").insert(variantRecords);
    }

    // Update in local fallback storage as well
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("noir_local_products");
        if (stored) {
          const prods: DbProduct[] = JSON.parse(stored);
          const updated = prods.map((p) =>
            p.id === productId || p.slug === productId
              ? { ...p, ...payload }
              : p
          );
          localStorage.setItem("noir_local_products", JSON.stringify(updated));
        }
      } catch {}
    }

    invalidateProductsCache();
    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Product update error";
    return { success: false, error: msg };
  }
}

/**
 * Safely archives a product (Option B: preserves historical orders while unpublishing).
 */
export async function archiveProductInDb(productId: string): Promise<boolean> {
  invalidateProductsCache();
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("noir_local_products");
      if (stored) {
        const prods: DbProduct[] = JSON.parse(stored);
        const updated = prods.map((p) =>
          p.id === productId || p.slug === productId
            ? { ...p, is_archived: true, is_published: false }
            : p
        );
        localStorage.setItem("noir_local_products", JSON.stringify(updated));
      }
    } catch {}
  }

  try {
    const { error } = await supabase
      .from("products")
      .update({ is_archived: true, is_published: false })
      .eq("id", productId);

    return !error;
  } catch {
    return true;
  }
}

/**
 * Permanently deletes a product if not referenced by historical orders.
 */
export async function deleteProductInDb(productId: string): Promise<boolean> {
  invalidateProductsCache();
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("noir_local_products");
      if (stored) {
        const prods: DbProduct[] = JSON.parse(stored);
        const filtered = prods.filter((p) => p.id !== productId && p.slug !== productId);
        localStorage.setItem("noir_local_products", JSON.stringify(filtered));
      }
    } catch {}
  }

  try {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      // Fallback to safe archiving if foreign key restricts deletion
      return archiveProductInDb(productId);
    }
    return true;
  } catch {
    return archiveProductInDb(productId);
  }
}

/**
 * Toggles product publish/unpublish status.
 */
export async function toggleProductPublishInDb(
  productId: string,
  isPublished: boolean
): Promise<boolean> {
  invalidateProductsCache();
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("noir_local_products");
      if (stored) {
        const prods: DbProduct[] = JSON.parse(stored);
        const updated = prods.map((p) =>
          p.id === productId || p.slug === productId
            ? { ...p, is_published: isPublished }
            : p
        );
        localStorage.setItem("noir_local_products", JSON.stringify(updated));
      }
    } catch {}
  }

  try {
    const { error } = await supabase
      .from("products")
      .update({ is_published: isPublished })
      .eq("id", productId);

    return !error;
  } catch {
    return true;
  }
}

/**
 * Updates the internal manufacturing / purchase cost price for a product silhouette.
 * Persists to Supabase with local-storage fallback for offline resiliency.
 */
export async function updateProductCostPrice(
  productId: string,
  costPrice: number
): Promise<{ success: boolean; error?: string }> {
  const cleanCost = Math.max(0, costPrice);

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("noir_local_products");
      if (stored) {
        const prods: DbProduct[] = JSON.parse(stored);
        const updated = prods.map((p) =>
          p.id === productId || p.slug === productId ? { ...p, cost_price: cleanCost } : p
        );
        localStorage.setItem("noir_local_products", JSON.stringify(updated));
      }
    } catch {}
  }

  try {
    const { error } = await supabase
      .from("products")
      .update({ cost_price: cleanCost, updated_at: new Date().toISOString() })
      .eq("id", productId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update cost price" };
  }
}
