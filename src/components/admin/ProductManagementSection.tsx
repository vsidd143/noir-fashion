"use client";

import React, { useState, useMemo, useRef } from "react";
import { DbProduct, createProductInDb, updateProductInDb, archiveProductInDb, deleteProductInDb, toggleProductPublishInDb } from "@/lib/products-service";
import { uploadProductMedia, deleteProductMedia } from "@/lib/storage-service";
import { formatPrice } from "@/lib/currency";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Archive,
  Upload,
  X,
  Check,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Boxes,
  Clock,
  ShieldCheck,
  Star,
  ArrowLeft,
  ArrowRight,
  Eye,
  Tag,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

export type ProductMgmtTab = "all-products" | "add-product" | "categories" | "inventory" | "recently-added";

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

interface ProductTypeRecord {
  id: string;
  name: string;
  slug: string;
  category_id?: string | null;
  description?: string;
  is_active?: boolean;
  display_order?: number;
}

interface ProductManagementSectionProps {
  products: DbProduct[];
  categories: CategoryRecord[];
  productTypes?: ProductTypeRecord[];
  onRefresh: () => Promise<void>;
  showNotification: (type: "success" | "error", text: string) => void;
  initialTab?: ProductMgmtTab;
}

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const FOOTWEAR_SIZES = ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"];

const DEFAULT_CATEGORIES: { id: string; name: string; slug: string }[] = [
  { id: "cat-kurtis", name: "Kurtis & Ethnic Sets", slug: "kurtis" },
  { id: "cat-dresses", name: "Dresses & Gowns", slug: "dresses" },
  { id: "cat-hoodies", name: "Hoodies & Sweatshirts", slug: "hoodies" },
  { id: "cat-jackets", name: "Jackets & Outerwear", slug: "jackets" },
  { id: "cat-tshirts", name: "T-Shirts & Box Tops", slug: "t-shirts" },
  { id: "cat-shirts", name: "Shirts & Over-shirts", slug: "shirts" },
  { id: "cat-pants", name: "Trousers & Combat Cargos", slug: "pants" },
  { id: "cat-jeans", name: "Denim & Jeans", slug: "jeans" },
  { id: "cat-footwear", name: "Footwear & Boots", slug: "footwear" },
  { id: "cat-accessories", name: "Accessories & Leather", slug: "accessories" },
];

const DEFAULT_PRODUCT_TYPES: { id: string; name: string; slug: string }[] = [
  { id: "pt-apparel", name: "Apparel", slug: "apparel" },
  { id: "pt-ethnic", name: "Ethnic Wear", slug: "ethnic-wear" },
  { id: "pt-outerwear", name: "Outerwear", slug: "outerwear" },
  { id: "pt-tops", name: "Tops", slug: "tops" },
  { id: "pt-bottoms", name: "Bottoms", slug: "bottoms" },
  { id: "pt-footwear", name: "Footwear", slug: "footwear" },
  { id: "pt-accessories", name: "Accessories", slug: "accessories" },
];

export default function ProductManagementSection({
  products,
  categories,
  productTypes = [],
  onRefresh,
  showNotification,
  initialTab = "all-products",
}: ProductManagementSectionProps) {
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const [activeTab, setActiveTab] = useState<ProductMgmtTab>(initialTab);

  if (prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all, active, draft, archived
  const [stockFilter, setStockFilter] = useState<string>("all"); // all, in-stock, low-stock, out-of-stock
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "price-asc" | "price-desc" | "name-asc">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<DbProduct | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  // Form State for Add Product
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState<"men" | "women" | "kids" | "">("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProductTypeId, setSelectedProductTypeId] = useState("");

  const availableCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      const hasKurtis = categories.some(
        (c) => c.slug === "kurtis" || c.name.toLowerCase().includes("kurti")
      );
      const merged = [...categories];
      if (!hasKurtis) {
        merged.unshift({
          id: "cat-kurtis",
          name: "Kurtis & Ethnic Sets",
          slug: "kurtis",
          description: "Traditional and contemporary designer Kurtis and ethnic sets",
          is_active: true,
        });
      }
      return merged;
    }
    return DEFAULT_CATEGORIES;
  }, [categories]);

  const availableProductTypes = useMemo(() => {
    if (productTypes && productTypes.length > 0) {
      return productTypes;
    }
    return DEFAULT_PRODUCT_TYPES;
  }, [productTypes]);
  const [brand, setBrand] = useState("NOIR Atelier");
  const [sku, setSku] = useState("");
  const [regularPrice, setRegularPrice] = useState<number>(9999);
  const [salePrice, setSalePrice] = useState<number>(7999);
  const [costPrice, setCostPrice] = useState<number>(3200);
  const [material, setMaterial] = useState("480 GSM Loopback French Terry Cotton");
  const [fit, setFit] = useState("Oversized Boxy Silhouette");
  const [enabledSizes, setEnabledSizes] = useState<string[]>(["S", "M", "L", "XL"]);
  const [stockQuantity, setStockQuantity] = useState<number>(20);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [isPublished, setIsPublished] = useState(true);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const [tagsInput, setTagsInput] = useState("heavyweight, luxury streetwear, bespoke");

  // Images Staging
  const [images, setImages] = useState<{ url: string; is_primary: boolean }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Metrics Computation for Dashboard
  const metrics = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.is_published && !p.is_archived).length;
    const draft = products.filter((p) => !p.is_published && !p.is_archived).length;
    const outOfStock = products.filter((p) => (p.stock_quantity ?? 0) === 0 && !p.is_archived).length;
    const lowStock = products.filter((p) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5 && !p.is_archived).length;
    const newArrivals = products.filter((p) => p.is_new_arrival && !p.is_archived).length;
    return { total, active, draft, outOfStock, lowStock, newArrivals };
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = p.name.toLowerCase().includes(q);
          const skuMatch = (p.sku || "").toLowerCase().includes(q);
          const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q));
          if (!nameMatch && !skuMatch && !tagMatch) return false;
        }

        // Department
        if (departmentFilter !== "all") {
          const pDept = (p.department || (p.tags?.includes("women") ? "women" : p.tags?.includes("kids") ? "kids" : "men")).toLowerCase();
          if (pDept !== departmentFilter) return false;
        }

        // Status
        if (statusFilter === "active" && (!p.is_published || p.is_archived)) return false;
        if (statusFilter === "draft" && (p.is_published || p.is_archived)) return false;
        if (statusFilter === "archived" && !p.is_archived) return false;

        // Stock
        const qty = p.stock_quantity ?? 0;
        if (stockFilter === "in-stock" && qty <= 0) return false;
        if (stockFilter === "low-stock" && (qty <= 0 || qty > 5)) return false;
        if (stockFilter === "out-of-stock" && qty > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [products, searchQuery, departmentFilter, statusFilter, stockFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Image Upload Handler with Validation
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const tempId = "prod-" + Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate MIME type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
      if (!validTypes.includes(file.type.toLowerCase())) {
        showNotification("error", `File "${file.name}" is not a supported format (JPG, PNG, WEBP, AVIF only).`);
        continue;
      }

      // Validate size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showNotification("error", `File "${file.name}" exceeds the 10MB limit.`);
        continue;
      }

      const res = await uploadProductMedia(file, tempId);
      if (res.url) {
        setImages((prev) => [...prev, { url: res.url, is_primary: prev.length === 0 }]);
      } else {
        // Safe object URL fallback for preview
        const localUrl = URL.createObjectURL(file);
        setImages((prev) => [...prev, { url: localUrl, is_primary: prev.length === 0 }]);
      }
    }
    setIsUploading(false);
  };

  const setPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, idx) => ({
        ...img,
        is_primary: idx === index,
      }))
    );
  };

  const removeImage = async (index: number) => {
    const imgToRemove = images[index];
    if (imgToRemove && imgToRemove.url.startsWith("http")) {
      await deleteProductMedia(imgToRemove.url);
    }
    setImages((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length > 0 && !next.some((img) => img.is_primary)) {
        next[0].is_primary = true;
      }
      return next;
    });
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    setImages((prev) => {
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Toggle Size in Form
  const toggleSize = (sz: string) => {
    setEnabledSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    );
  };

  // Add Product Submit Handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showNotification("error", "Product name is required.");
      return;
    }

    if (salePrice <= 0 || regularPrice <= 0) {
      showNotification("error", "Prices must be positive values.");
      return;
    }

    if (salePrice > regularPrice) {
      showNotification("error", "Selling price cannot exceed the regular MRP price.");
      return;
    }

    if (enabledSizes.length === 0) {
      showNotification("error", "Please select at least one available size.");
      return;
    }

    const cleanDept = department ? (String(department).toLowerCase().trim() as "men" | "women" | "kids") : null;
    if (!cleanDept || !["men", "women", "kids"].includes(cleanDept)) {
      showNotification("error", "Please explicitly select a department (Men, Women, or Kids).");
      return;
    }

    setIsSaving(true);

    const baseSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const generatedSku = (sku || `${cleanDept.toUpperCase()}-${baseSlug.substring(0, 4)}-${Math.floor(100 + Math.random() * 900)}`).toUpperCase();

    const matchedCat = availableCategories.find(
      (c) => c.id === selectedCategoryId || c.slug === selectedCategoryId
    );
    const matchedType = availableProductTypes.find(
      (pt) => pt.id === selectedProductTypeId || pt.slug === selectedProductTypeId
    );

    // Fallback if not explicitly selected: smartly infer category from product name
    let finalCategoryId = matchedCat?.id || null;
    if (!finalCategoryId) {
      const lowerName = name.toLowerCase();
      if (lowerName.includes("kurti") || lowerName.includes("kurta")) {
        finalCategoryId = availableCategories.find((c) => c.slug === "kurtis")?.id || null;
      } else if (lowerName.includes("dress") || lowerName.includes("gown")) {
        finalCategoryId = availableCategories.find((c) => c.slug === "dresses")?.id || null;
      }
    }

    const imagesToSave =
      images.length > 0
        ? images.map((img, idx) => ({
          url: img.url,
          is_primary: img.is_primary,
          display_order: idx + 1,
        }))
        : [
          {
            url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85",
            is_primary: true,
            display_order: 1,
          },
        ];

    const perSizeStock = Math.max(1, Math.floor(stockQuantity / enabledSizes.length));
    const variantList = enabledSizes.map((sz) => ({
      color_name: "Obsidian Black",
      color_hex: "#0a0a0a",
      size: sz,
      stock_quantity: perSizeStock,
      sku: `${generatedSku}-BLK-${sz}`.toUpperCase(),
    }));

    const cleanTags = Array.from(
      new Set([
        ...tagsInput.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        cleanDept,
        ...(isNewArrival ? ["new", "new arrival"] : []),
        ...(isBestSeller ? ["best seller"] : []),
        ...(isLimited ? ["limited edition"] : []),
      ])
    );

    const payload = {
      name: name.trim(),
      subtitle: subtitle.trim() || undefined,
      description: description.trim() || undefined,
      department: cleanDept,
      category_id: finalCategoryId,
      product_type_id: matchedType?.id || null,
      price: salePrice,
      regular_price: regularPrice,
      discounted_price: salePrice,
      cost_price: costPrice || undefined,
      material: material.trim(),
      fit: fit.trim(),
      sku: generatedSku,
      stock_quantity: stockQuantity,
      is_published: isPublished,
      is_new_arrival: isNewArrival,
      is_featured: isFeatured,
      is_best_seller: isBestSeller,
      is_limited: isLimited,
      tags: cleanTags,
      details: ["Hand finished in Mumbai Atelier", "Pre-shrunk architectural weave", "Articulated anatomical cut"],
      images: imagesToSave,
      variants: variantList,
    };

    const res = await createProductInDb(payload);
    setIsSaving(false);

    if (res.data) {
      showNotification("success", `Silhouette "${name}" successfully registered! Live on ${cleanDept.toUpperCase()} and ${isNewArrival ? "NEW ARRIVALS" : "storefront"}.`);
      // Reset form
      setName("");
      setSlug("");
      setSubtitle("");
      setDescription("");
      setSku("");
      setDepartment("");
      setSelectedCategoryId("");
      setSelectedProductTypeId("");
      setImages([]);
      await onRefresh();
      setActiveTab("all-products");
    } else {
      showNotification("error", res.error || "Failed to create product in database.");
    }
  };

  // Quick Publish Toggle
  const handleTogglePublish = async (prodId: string, currentStatus: boolean) => {
    const success = await toggleProductPublishInDb(prodId, !currentStatus);
    if (success) {
      showNotification("success", `Product ${!currentStatus ? "published to storefront" : "unpublished to draft"}.`);
      await onRefresh();
    } else {
      showNotification("error", "Failed to update publish state in Supabase.");
    }
  };

  // Quick New Arrival Toggle
  const handleToggleNewArrival = async (prod: DbProduct) => {
    const nextVal = !prod.is_new_arrival;
    const res = await updateProductInDb(prod.id, {
      is_new_arrival: nextVal,
      tags: nextVal
        ? Array.from(new Set([...(prod.tags || []), "new", "new arrival"]))
        : (prod.tags || []).filter((t) => t !== "new" && t !== "new arrival"),
    });

    if (res.success) {
      showNotification("success", `Product marked as ${nextVal ? "NEW ARRIVAL (Active on /new-arrivals)" : "Standard Catalogue"}.`);
      await onRefresh();
    } else {
      showNotification("error", "Failed to update New Arrival flag.");
    }
  };

  // Save Edit Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (editingProduct.price <= 0 || (editingProduct.regular_price && editingProduct.regular_price <= 0)) {
      showNotification("error", "Prices must be positive numbers.");
      return;
    }

    if (editingProduct.regular_price && editingProduct.price > editingProduct.regular_price) {
      showNotification("error", "Selling price cannot exceed the regular MRP price.");
      return;
    }

    const cleanDept = editingProduct.department ? String(editingProduct.department).toLowerCase().trim() : "";
    if (!cleanDept || !["men", "women", "kids"].includes(cleanDept)) {
      showNotification("error", "Please select a valid department (Men, Women, or Kids).");
      return;
    }

    setIsSaving(true);
    const res = await updateProductInDb(editingProduct.id, {
      name: editingProduct.name,
      subtitle: editingProduct.subtitle,
      description: editingProduct.description,
      department: cleanDept as "men" | "women" | "kids",
      price: Number(editingProduct.price),
      regular_price: Number(editingProduct.regular_price || editingProduct.original_price || editingProduct.price),
      cost_price: editingProduct.cost_price ? Number(editingProduct.cost_price) : undefined,
      sku: editingProduct.sku,
      stock_quantity: Number(editingProduct.stock_quantity ?? 0),
      is_published: editingProduct.is_published,
      is_new_arrival: editingProduct.is_new_arrival,
      is_featured: editingProduct.is_featured,
      is_best_seller: editingProduct.is_best_seller,
      is_limited: editingProduct.is_limited,
      material: editingProduct.material,
      fit: editingProduct.fit,
      category_id: editingProduct.category_id || null,
      product_type_id: editingProduct.product_type_id || null,
    });

    setIsSaving(false);
    if (res.success) {
      showNotification("success", `Silhouette "${editingProduct.name}" updated successfully (Department: ${cleanDept.toUpperCase()}).`);
      setEditingProduct(null);
      await onRefresh();
    } else {
      showNotification("error", res.error || "Failed to update product in database.");
    }
  };

  // Delete / Archive Confirmation Execution
  const executeSafeDelete = async () => {
    if (!deletingProduct) return;
    setIsDeletingLoading(true);

    try {
      // Calls server API or safe deletion workflow
      const res = await fetch(`/api/admin/products/${deletingProduct.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      setIsDeletingLoading(false);
      setDeletingProduct(null);

      if (res.ok && data.success) {
        showNotification("success", data.message || "Product silhouette removed.");
        await onRefresh();
      } else {
        // Fallback to client service archive
        const fallbackSuccess = await archiveProductInDb(deletingProduct.id);
        if (fallbackSuccess) {
          showNotification("success", `Silhouette "${deletingProduct.name}" safely archived.`);
          await onRefresh();
        } else {
          showNotification("error", data.error || "Failed to delete product.");
        }
      }
    } catch {
      setIsDeletingLoading(false);
      await archiveProductInDb(deletingProduct.id);
      showNotification("success", `Silhouette "${deletingProduct.name}" safely archived.`);
      setDeletingProduct(null);
      await onRefresh();
    }
  };

  return (
    <div className="space-y-8">
      {/* Product Management Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#c5a46d] uppercase tracking-widest mb-1">
            <Package className="w-3.5 h-3.5" />
            <span>ATELIER COMMERCE COMMAND // PRODUCT MANAGEMENT</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight font-display text-white">
            Product Administration
          </h2>
          <p className="text-xs font-mono text-neutral-400 mt-1 max-w-xl">
            Live catalog control across MEN, WOMEN, KIDS and NEW ARRIVALS. Changes sync directly to the public storefront.
          </p>
        </div>

        {/* 5 Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/60 border border-white/10">
          <button
            onClick={() => setActiveTab("all-products")}
            className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "all-products"
              ? "bg-[#c5a46d] text-black font-extrabold shadow-lg"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>All Products ({metrics.total})</span>
          </button>

          <button
            onClick={() => setActiveTab("add-product")}
            className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "add-product"
              ? "bg-[#c5a46d] text-black font-extrabold shadow-lg"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "categories"
              ? "bg-[#c5a46d] text-black font-extrabold shadow-lg"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "inventory"
              ? "bg-[#c5a46d] text-black font-extrabold shadow-lg"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Inventory ({metrics.lowStock + metrics.outOfStock})</span>
          </button>

          <button
            onClick={() => setActiveTab("recently-added")}
            className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "recently-added"
              ? "bg-[#c5a46d] text-black font-extrabold shadow-lg"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Recently Added</span>
          </button>
        </div>
      </div>

      {/* ===================================================== */}
      {/* SUB-VIEW 1: ALL PRODUCTS / PRODUCT DASHBOARD */}
      {/* ===================================================== */}
      {activeTab === "all-products" && (
        <div className="space-y-6">
          {/* Top 6 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">Total product</span>
              <div className="text-2xl font-black font-mono text-white">{metrics.total}</div>
            </div>

            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">Active / Published</span>
              <div className="text-2xl font-black font-mono text-emerald-400">{metrics.active}</div>
            </div>

            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block">Draft Pieces</span>
              <div className="text-2xl font-black font-mono text-amber-400">{metrics.draft}</div>
            </div>

            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 block">Out of Stock</span>
              <div className="text-2xl font-black font-mono text-rose-400">{metrics.outOfStock}</div>
            </div>

            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 block">Low Stock (≤5)</span>
              <div className="text-2xl font-black font-mono text-amber-300">{metrics.lowStock}</div>
            </div>

            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#c5a46d] block">New Arrivals</span>
              <div className="text-2xl font-black font-mono text-[#c5a46d]">{metrics.newArrivals}</div>
            </div>
          </div>

          {/* Search, Department, Status, Stock & Sort Bar */}
          <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by products name, SKU, or tags..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-black border border-white/15 pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              {/* Department Filter (MEN, WOMEN, KIDS) */}
              <div>
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#c5a46d]"
                >
                  <option value="all">All Departments</option>
                  <option value="men">MEN Only</option>
                  <option value="women">WOMEN Only</option>
                  <option value="kids">KIDS Only</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#c5a46d]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active (Published)</option>
                  <option value="draft">Drafts Only</option>
                  <option value="archived">Archived Pieces</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "price-asc" | "price-desc" | "name-asc")}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#c5a46d]"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* Sub-Filters: Stock Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Stock Filter:</span>
                {(["all", "in-stock", "low-stock", "out-of-stock"] as const).map((stk) => (
                  <button
                    key={stk}
                    onClick={() => {
                      setStockFilter(stk);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider border transition-all ${stockFilter === stk
                      ? "bg-[#c5a46d] text-black border-[#c5a46d]"
                      : "bg-black/50 text-neutral-400 border-white/10 hover:border-white/30"
                      }`}
                  >
                    {stk.replace("-", " ")}
                  </button>
                ))}
              </div>

              <div className="text-neutral-500 text-[11px]">
                Showing {filteredProducts.length} of {products.length} product
              </div>
            </div>
          </div>

          {/* Product Table */}
          <div className="bg-[#0a0a0a] border border-white/10 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-[10px] text-neutral-400 uppercase tracking-widest bg-black/70">
                  <th className="p-4">Piece / Silhouette</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Price (INR ₹)</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">New Arrival</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-neutral-500 space-y-3">
                      <Package className="w-10 h-10 mx-auto text-neutral-700" />
                      <p className="text-sm uppercase font-bold text-neutral-300">No product Found</p>
                      <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                        No products match the selected filters. Clear your search or add a new luxury piece.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setDepartmentFilter("all");
                          setStatusFilter("all");
                          setStockFilter("all");
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((prod) => {
                    const primaryImg = prod.images?.[0]?.url || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=150&q=80";
                    const isOutOfStock = (prod.stock_quantity ?? 0) === 0;
                    const isLowStock = (prod.stock_quantity ?? 0) > 0 && (prod.stock_quantity ?? 0) <= 5;
                    const dept = (prod.department || (prod.tags?.includes("women") ? "women" : prod.tags?.includes("kids") ? "kids" : "men")).toUpperCase();

                    return (
                      <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors group">
                        {/* 1. Image + Name + SKU */}
                        <td className="p-4 flex items-center gap-3 min-w-[220px]">
                          <div className="relative w-12 h-14 bg-black border border-white/15 overflow-hidden shrink-0">
                            <img src={primaryImg} alt={prod.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="space-y-0.5 truncate max-w-[240px]">
                            <span className="font-bold text-white block truncate group-hover:text-[#c5a46d] transition-colors">
                              {prod.name}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono block">
                              SKU: {prod.sku || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* 2. Department Category */}
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border ${dept === "WOMEN"
                              ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                              : dept === "KIDS"
                                ? "bg-sky-950/40 text-sky-300 border-sky-500/30"
                                : "bg-amber-950/40 text-amber-300 border-amber-500/30"
                              }`}
                          >
                            {dept}
                          </span>
                        </td>

                        {/* 3. Price */}
                        <td className="p-4 space-y-0.5">
                          <div className="font-bold text-white">{formatPrice(prod.price)}</div>
                          {prod.regular_price && prod.regular_price > prod.price && (
                            <div className="text-[10px] text-neutral-500 line-through">
                              {formatPrice(prod.regular_price)}
                            </div>
                          )}
                        </td>

                        {/* 4. Stock */}
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold border inline-block ${isOutOfStock
                              ? "bg-rose-950/60 text-rose-400 border-rose-500/30"
                              : isLowStock
                                ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                                : "bg-emerald-950/60 text-emerald-400 border-emerald-500/30"
                              }`}
                          >
                            {isOutOfStock ? "Out of Stock" : `${prod.stock_quantity ?? 0} in stock`}
                          </span>
                        </td>

                        {/* 5. Status Toggle */}
                        <td className="p-4">
                          <button
                            onClick={() => handleTogglePublish(prod.id, prod.is_published)}
                            className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider border cursor-pointer transition-all ${prod.is_published
                              ? "bg-emerald-950/50 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/50"
                              : "bg-neutral-900 text-neutral-400 border-white/10 hover:border-white/30"
                              }`}
                          >
                            {prod.is_published ? "PUBLISHED" : "DRAFT"}
                          </button>
                        </td>

                        {/* 6. New Arrival Flag Toggle */}
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleNewArrival(prod)}
                            className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider border cursor-pointer transition-all flex items-center gap-1.5 ${prod.is_new_arrival
                              ? "bg-[#c5a46d]/20 text-[#c5a46d] border-[#c5a46d]/60 shadow-[0_0_12px_rgba(197,164,109,0.15)]"
                              : "bg-black/50 text-neutral-500 border-white/10 hover:border-white/20"
                              }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{prod.is_new_arrival ? "NEW ARRIVAL" : "STANDARD"}</span>
                          </button>
                        </td>

                        {/* 7. Edit & Delete Actions */}
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setEditingProduct(prod)}
                            title="Edit silhouette specifications"
                            className="p-2 border border-white/10 hover:border-[#c5a46d] hover:text-[#c5a46d] transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(prod)}
                            title="Safely remove or archive product"
                            className="p-2 border border-white/10 hover:border-red-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400 pt-2">
              <div>
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-white/15 disabled:opacity-30 hover:border-white text-white flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-white/15 disabled:opacity-30 hover:border-white text-white flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================== */}
      {/* SUB-VIEW 2: ADD NEW PRODUCT FORM */}
      {/* ===================================================== */}
      {activeTab === "add-product" && (
        <form onSubmit={handleCreateSubmit} className="space-y-8 text-xs font-mono max-w-4xl">
          {/* Section 1: Media Management */}
          <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#c5a46d]" />
                <span>Product Images (Supabase Storage: product-media)</span>
              </h3>
              <span className="text-[10px] text-neutral-500">JPG, PNG, WEBP, AVIF (Max 10MB)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-[3/4] bg-black border border-white/15 group overflow-hidden">
                  <img src={img.url} alt="Staged upload" className="w-full h-full object-cover" />

                  {/* Primary Badge */}
                  {img.is_primary ? (
                    <span className="absolute bottom-2 left-2 bg-[#c5a46d] text-black px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      PRIMARY
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(idx)}
                      className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 bg-black/80 hover:bg-[#c5a46d] hover:text-black text-white text-[9px] px-1.5 py-0.5 border border-white/20 transition-all uppercase"
                    >
                      Make Primary
                    </button>
                  )}

                  {/* Actions: Reorder & Remove */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => moveImage(idx, "left")}
                        className="p-1 bg-black/80 hover:bg-white text-white hover:text-black border border-white/20"
                        title="Move Left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    )}
                    {idx < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveImage(idx, "right")}
                        className="p-1 bg-black/80 hover:bg-white text-white hover:text-black border border-white/20"
                        title="Move Right"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="p-1 bg-black/80 text-rose-400 hover:bg-rose-500 hover:text-black border border-rose-500/30"
                      title="Remove Image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Upload Trigger Box */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="aspect-[3/4] border-2 border-dashed border-white/20 hover:border-[#c5a46d] flex flex-col items-center justify-center p-4 text-center text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <Upload className={`w-6 h-6 mb-2 ${isUploading ? "animate-bounce text-[#c5a46d]" : ""}`} />
                <span className="text-[11px] uppercase font-bold">
                  {isUploading ? "Uploading..." : "Upload Photos"}
                </span>
                <span className="text-[9px] text-neutral-500 mt-1">Multi-file supported</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Section 2: Core Specifications */}
          <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Silhouette Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PHANTOM BOX HOODIE"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }
                  }}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Custom Slug / URL</label>
                <input
                  type="text"
                  placeholder="e.g. phantom-box-hoodie"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">SKU (Serial Code)</label>
                <input
                  type="text"
                  placeholder="e.g. NOIR-MN-HD-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Brand Name</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Short Description / Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. 480 GSM Loopback French Terry Cotton Silhouette"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Full Editorial Description</label>
                <textarea
                  rows={3}
                  placeholder="Complete fabric weight breakdown, drape specifications, and atelier finishing notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Department Selection & New Arrival Flag */}
          <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Department & Storefront Routing
            </h3>

            {/* Department Radio Pills (MEN, WOMEN, KIDS) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] text-neutral-400 uppercase">Primary Department *</label>
                {department ? (
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                    ✓ Selected: {department}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400 font-bold animate-pulse">
                    ● Explicit selection required
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["men", "women", "kids"] as const).map((dept) => {
                  const isSelected = department === dept;
                  return (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => setDepartment(dept)}
                      className={`py-3 px-4 text-center font-bold font-mono uppercase tracking-widest text-xs border transition-all cursor-pointer ${isSelected
                        ? "bg-[#c5a46d] text-black border-[#c5a46d] shadow-lg shadow-[#c5a46d]/20 ring-1 ring-[#c5a46d]"
                        : "bg-black/60 text-neutral-400 border-white/15 hover:border-white/30 hover:text-white"
                        }`}
                    >
                      {dept}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-neutral-500 font-mono mt-1">
                Published product will automatically synchronize and route to the selected department page.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Category Selector */}
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1 font-mono">
                  Category *
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#c5a46d]"
                >
                  <option value="">Select Category...</option>
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                  Storefront category grouping (e.g. Kurtis, Hoodies, Dresses).
                </span>
              </div>

              {/* Product Type Selector */}
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1 font-mono">
                  Product Type *
                </label>
                <select
                  value={selectedProductTypeId}
                  onChange={(e) => setSelectedProductTypeId(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#c5a46d]"
                >
                  <option value="">Select Product Type...</option>
                  {availableProductTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                  Garment silhouette classification (Apparel, Footwear, etc.).
                </span>
              </div>

              {/* Independent New Arrival Checkbox */}
              <div className="flex items-center pt-5 md:pt-0">
                <label className="flex items-start gap-3 p-3 bg-black border border-white/15 hover:border-[#c5a46d] cursor-pointer w-full transition-colors h-full">
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                    className="w-4 h-4 accent-[#c5a46d] mt-0.5"
                  />
                  <div>
                    <span className="text-white uppercase font-bold text-xs block">
                      Mark as New Arrival
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Also features this piece on the /new-arrivals page without duplicating the product.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Pricing (INR ₹) */}
          <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Pricing Structure (INR ₹ Incl. GST)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Regular Price (MRP ₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={regularPrice}
                  onChange={(e) => setRegularPrice(Number(e.target.value))}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Sale / Selling Price (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Internal Cost Price (₹)</label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>
            </div>

            {regularPrice > salePrice && (
              <div className="text-[11px] text-[#c5a46d] font-mono">
                ✓ Promotional discount: {Math.round(((regularPrice - salePrice) / regularPrice) * 100)}% OFF regular MRP.
              </div>
            )}
          </div>

          {/* Section 5: Clothing Sizes & Inventory */}
          <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Sizes & Inventory Matrix
            </h3>

            {/* Sizes Checkboxes */}
            <div className="space-y-2">
              <label className="block text-[10px] text-neutral-400 uppercase">
                Available Clothing Sizes (Click to toggle) *
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SIZES.map((sz) => {
                  const isChecked = enabledSizes.includes(sz);
                  return (
                    <button
                      type="button"
                      key={sz}
                      onClick={() => toggleSize(sz)}
                      className={`px-4 py-2 border font-mono font-bold text-xs uppercase tracking-wider transition-all ${isChecked
                        ? "bg-[#c5a46d] text-black border-[#c5a46d]"
                        : "bg-black/60 text-neutral-500 border-white/15 hover:border-white/30"
                        }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Total Stock Quantity *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Low-Stock Alert Threshold</label>
                <input
                  type="number"
                  min={1}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Status & Publication */}
          <div className="p-6 bg-[#0a0a0a] border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status_choice"
                  checked={isPublished}
                  onChange={() => setIsPublished(true)}
                  className="accent-[#c5a46d]"
                />
                <span className="text-white text-xs uppercase font-bold">Active / Published</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status_choice"
                  checked={!isPublished}
                  onChange={() => setIsPublished(false)}
                  className="accent-[#c5a46d]"
                />
                <span className="text-neutral-400 text-xs uppercase">Save as Draft</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("all-products")}
                className="px-5 py-2.5 border border-white/20 text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-2.5 bg-[#c5a46d] hover:bg-[#d6b77e] disabled:opacity-50 text-black font-extrabold uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-[#c5a46d]/20"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isPublished ? "Publish PRODUCT" : "Save Draft"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ===================================================== */}
      {/* SUB-VIEW 3: CATEGORIES OVERVIEW */}
      {/* ===================================================== */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="p-4 bg-[#0a0a0a] border border-white/10">
            <h3 className="text-sm font-bold uppercase font-display text-white mb-2">
              Primary Department Classification
            </h3>
            <p className="text-xs font-mono text-neutral-400">
              NOIR organizes fashion product into three dedicated customer-facing departments. Products assigned to these departments automatically appear in the respective storefront catalog.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black uppercase font-display text-white">MEN</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-amber-950/60 text-amber-300 border border-amber-500/30">
                  {products.filter((p) => (p.department || (p.tags?.includes("men") ? "men" : "")).toLowerCase() === "men").length} Pieces
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Structured streetwear, heavyweight 480 GSM hoodies, modular combat trousers, and architectural outerwear.
              </p>
              <button
                onClick={() => {
                  setDepartmentFilter("men");
                  setActiveTab("all-products");
                }}
                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono uppercase text-white"
              >
                View Men&apos;s Catalog
              </button>
            </div>

            <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black uppercase font-display text-white">WOMEN</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-purple-950/60 text-purple-300 border border-purple-500/30">
                  {products.filter((p) => (p.department || (p.tags?.includes("women") ? "women" : "")).toLowerCase() === "women").length} Pieces
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Fluid contours, sculptural outerwear, minimal luxury tailoring, and draped evening product.
              </p>
              <button
                onClick={() => {
                  setDepartmentFilter("women");
                  setActiveTab("all-products");
                }}
                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono uppercase text-white"
              >
                View Women&apos;s Catalog
              </button>
            </div>

            <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black uppercase font-display text-white">KIDS</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-sky-950/60 text-sky-300 border border-sky-500/30">
                  {products.filter((p) => (p.department || (p.tags?.includes("kids") ? "kids" : "")).toLowerCase() === "kids").length} Pieces
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Scaled-down luxury street product crafted with custom organic cotton and comfortable construction.
              </p>
              <button
                onClick={() => {
                  setDepartmentFilter("kids");
                  setActiveTab("all-products");
                }}
                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono uppercase text-white"
              >
                View Kids&apos; Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* SUB-VIEW 4: INVENTORY SURVEILLANCE */}
      {/* ===================================================== */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="p-4 bg-[#0a0a0a] border border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase font-display text-white">
                Inventory & Stock Surveillance
              </h3>
              <p className="text-xs font-mono text-neutral-400">
                Track out-of-stock and low-stock pieces. Real-time updates prevent overselling on Cash on Delivery orders.
              </p>
            </div>
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 border border-white/15 text-xs font-mono hover:text-[#c5a46d] flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Stock</span>
            </button>
          </div>

          <div className="bg-[#0a0a0a] border border-white/10 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-[10px] text-neutral-400 uppercase tracking-widest bg-black/70">
                  <th className="p-4">Silhouette</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Selling Price</th>
                  <th className="p-4">Available Units</th>
                  <th className="p-4">Stock Alert</th>
                  <th className="p-4 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products
                  .filter((p) => (p.stock_quantity ?? 0) <= 5 && !p.is_archived)
                  .map((prod) => (
                    <tr key={prod.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-bold text-white">{prod.name}</td>
                      <td className="p-4 text-neutral-500">{prod.sku || "N/A"}</td>
                      <td className="p-4 text-neutral-300 uppercase">{prod.department || "MEN"}</td>
                      <td className="p-4 text-white">{formatPrice(prod.price)}</td>
                      <td className="p-4 font-bold text-amber-300">{prod.stock_quantity ?? 0}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold border ${(prod.stock_quantity ?? 0) === 0
                            ? "bg-rose-950/60 text-rose-400 border-rose-500/30"
                            : "bg-amber-950/60 text-amber-300 border-amber-500/30"
                            }`}
                        >
                          {(prod.stock_quantity ?? 0) === 0 ? "DEPLETED (0)" : "LOW (≤5)"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setEditingProduct(prod)}
                          className="px-3 py-1 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-bold uppercase text-[10px]"
                        >
                          Adjust Units
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* SUB-VIEW 5: RECENTLY ADDED */}
      {/* ===================================================== */}
      {activeTab === "recently-added" && (
        <div className="space-y-6">
          <div className="p-4 bg-[#0a0a0a] border border-white/10">
            <h3 className="text-sm font-bold uppercase font-display text-white">
              Recently Registered product
            </h3>
            <p className="text-xs font-mono text-neutral-400">
              The latest fashion product registered to Supabase.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.slice(0, 8).map((prod) => (
              <div key={prod.id} className="bg-[#0a0a0a] border border-white/10 p-4 space-y-3">
                <div className="aspect-[3/4] bg-black border border-white/10 overflow-hidden relative">
                  <img
                    src={prod.images?.[0]?.url || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=300&q=80"}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-[#c5a46d] text-black font-mono text-[9px] font-bold px-1.5 py-0.5 uppercase">
                    {prod.department || "MEN"}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-white truncate">{prod.name}</h4>
                  <p className="text-xs text-[#c5a46d] font-mono font-bold mt-1">{formatPrice(prod.price)}</p>
                </div>
                <div className="pt-2 border-t border-white/5 flex gap-2">
                  <button
                    onClick={() => setEditingProduct(prod)}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] uppercase text-center"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* MODAL: COMPREHENSIVE PRODUCT EDITING */}
      {/* ===================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-white/20 p-6 md:p-8 max-w-2xl w-full space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#c5a46d] block">
                  SILHOUETTE SPECIFICATIONS
                </span>
                <h3 className="text-xl font-bold uppercase font-display text-white">
                  Edit &ldquo;{editingProduct.name}&rdquo;
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-black border border-white/20 px-3 py-2 text-white"
                />
              </div>

              {/* Department Selection in Edit Modal */}
              <div className="space-y-2 p-3 bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] text-neutral-400 uppercase font-mono">Department *</label>
                  <span className="text-[10px] font-mono uppercase text-[#c5a46d] font-bold">
                    Active: {editingProduct.department ? editingProduct.department.toUpperCase() : "UNASSIGNED"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(["men", "women", "kids"] as const).map((dept) => {
                    const isSelected = (editingProduct.department || "").toLowerCase() === dept;
                    return (
                      <button
                        type="button"
                        key={dept}
                        onClick={() => setEditingProduct({ ...editingProduct, department: dept })}
                        className={`py-2.5 px-3 text-center font-bold font-mono uppercase tracking-wider text-xs border transition-all cursor-pointer ${isSelected
                          ? "bg-[#c5a46d] text-black border-[#c5a46d] shadow-md shadow-[#c5a46d]/20 ring-1 ring-[#c5a46d]"
                          : "bg-black/60 text-neutral-400 border-white/15 hover:border-white/30 hover:text-white"
                          }`}
                      >
                        {dept}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category & Product Type Selection in Edit Modal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white/[0.02] border border-white/10">
                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase font-mono mb-1">
                    Category *
                  </label>
                  <select
                    value={editingProduct.category_id || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value || null })}
                    className="w-full bg-black border border-white/20 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#c5a46d]"
                  >
                    <option value="">Select Category...</option>
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase font-mono mb-1">
                    Product Type
                  </label>
                  <select
                    value={editingProduct.product_type_id || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, product_type_id: e.target.value || null })}
                    className="w-full bg-black border border-white/20 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#c5a46d]"
                  >
                    <option value="">Select Product Type...</option>
                    {availableProductTypes.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">SKU</label>
                <input
                  type="text"
                  value={editingProduct.sku || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  className="w-full bg-black border border-white/20 px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase mb-1">Regular MRP (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingProduct.regular_price || editingProduct.original_price || editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, regular_price: Number(e.target.value) })}
                    className="w-full bg-black border border-white/20 px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full bg-black border border-white/20 px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase mb-1">Stock Units</label>
                  <input
                    type="number"
                    min={0}
                    value={editingProduct.stock_quantity ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: Number(e.target.value) })}
                    className="w-full bg-black border border-white/20 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Short Description</label>
                <input
                  type="text"
                  value={editingProduct.subtitle || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, subtitle: e.target.value })}
                  className="w-full bg-black border border-white/20 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-black border border-white/20 px-3 py-2 text-white"
                />
              </div>

              {/* Badges Toggles */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-white/10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_published}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_published: e.target.checked })}
                    className="accent-[#c5a46d]"
                  />
                  <span className="text-white text-xs">Published to Storefront</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_new_arrival}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_new_arrival: e.target.checked })}
                    className="accent-[#c5a46d]"
                  />
                  <span className="text-white text-xs">New Arrival Flag</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-white/20 text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-[#c5a46d] hover:bg-[#d6b77e] disabled:opacity-50 text-black font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* MODAL: SAFE DELETION / ARCHIVAL CONFIRMATION */}
      {/* ===================================================== */}
      {deletingProduct && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-red-500/30 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold uppercase font-display text-white">
                Delete Product Silhouette?
              </h3>
            </div>

            <p className="text-xs font-mono text-neutral-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">&ldquo;{deletingProduct.name}&rdquo;</strong>?
            </p>

            <div className="p-3 bg-black border border-white/10 text-[11px] font-mono text-neutral-400 space-y-1">
              <div><strong>SKU:</strong> {deletingProduct.sku || "N/A"}</div>
              <div><strong>Department:</strong> {(deletingProduct.department || "MEN").toUpperCase()}</div>
              <div><strong>Price:</strong> {formatPrice(deletingProduct.price)}</div>
            </div>

            <p className="text-[10px] font-mono text-neutral-500">
              Safety notice: If this product is linked to customer orders, it will be automatically <strong>archived</strong> to preserve order and invoice records.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 border border-white/20 text-neutral-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSafeDelete}
                disabled={isDeletingLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              >
                {isDeletingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirm Removal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
