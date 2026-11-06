import { supabase } from "@/lib/supabase";

export const PRODUCT_MEDIA_BUCKET = "product-media";

export type UploadedMediaResult = {
  url: string;
  path: string;
  error?: string;
};

/**
 * Uploads a local File to Supabase Storage under the product-media bucket.
 * Returns the public accessible URL and file path for storage cleanup.
 */
export async function uploadProductMedia(
  file: File,
  productId: string
): Promise<UploadedMediaResult> {
  try {
    const fileExt = file.name.split(".").pop() || "jpg";
    const cleanFileName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    const timestamp = Date.now();
    const filePath = `${productId}/${timestamp}_${cleanFileName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      return { url: "", path: "", error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(PRODUCT_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    return {
      url: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown upload error";
    return { url: "", path: "", error: message };
  }
}

/**
 * Removes a file from Supabase Storage by its path or public URL.
 */
export async function deleteProductMedia(pathOrUrl: string): Promise<boolean> {
  try {
    let filePath = pathOrUrl;
    if (pathOrUrl.includes(PRODUCT_MEDIA_BUCKET)) {
      const parts = pathOrUrl.split(`${PRODUCT_MEDIA_BUCKET}/`);
      if (parts[1]) {
        filePath = parts[1].split("?")[0];
      }
    }

    const { error } = await supabase.storage
      .from(PRODUCT_MEDIA_BUCKET)
      .remove([filePath]);

    if (error) {
      console.warn("Could not delete file from Supabase storage:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Storage deletion error:", err);
    return false;
  }
}
