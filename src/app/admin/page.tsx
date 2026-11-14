"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/currency";
import { uploadProductMedia, deleteProductMedia } from "@/lib/storage-service";
import {
  getAllAdminProducts,
  createProductInDb,
  updateProductInDb,
  archiveProductInDb,
  toggleProductPublishInDb,
  DbProduct,
} from "@/lib/products-service";
import { exportOrdersToCSV, calculateCustomerStats } from "@/lib/csv-export";
import { isOnlineOrder, computeRevenueBreakdown } from "@/lib/orders-service";
import { AnalyticsOrder } from "@/lib/analytics-engine";
import SalesAnalyticsDashboard from "@/components/admin/SalesAnalyticsDashboard";
import ProductManagementSection from "@/components/admin/ProductManagementSection";
import CustomCursor from "@/components/ui/CustomCursor";
import ToastContainer from "@/components/ui/ToastContainer";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  PlusCircle,
  Layers,
  FolderTree,
  Sparkles,
  ShoppingBag,
  Users,
  Boxes,
  Tag,
  Megaphone,
  Settings,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  Image as ImageIcon,
  Menu,
  RefreshCw,
  ExternalLink,
  Banknote,
  FileText,
  Download,
  Filter,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  ChevronDown,
  Clock,
  CreditCard,
  Truck,
} from "lucide-react";

type AdminSection =
  | "dashboard"
  | "analytics"
  | "products"
  | "add-product"
  | "categories"
  | "product-types"
  | "collections"
  | "orders"
  | "customers"
  | "inventory"
  | "coupons"
  | "content"
  | "settings"
  | "create-admin";

type OrderItem = {
  id: string;
  order_number: string;
  user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  total_amount: number;
  payment_method: string;
  payment_status: string;
  tracking_number?: string;
  courier_name?: string;
  customer_confirmed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  updated_at?: string;
  shipping_address?: {
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  created_at: string;
  items?: { product_name: string; size?: string; color_name?: string; quantity: number; unit_price: number }[];
};

type UserRecord = {
  id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  role: "admin" | "customer";
  is_blocked: boolean;
  created_at: string;
};

type CouponRecord = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  is_active: boolean;
  product_id?: string | null;
  product_name?: string | null;
  created_at?: string;
};

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_id?: string | null;
  is_active?: boolean;
  display_order?: number;
};

type ProductTypeRecord = {
  id: string;
  name: string;
  slug: string;
  category_id?: string | null;
  description?: string;
  is_active: boolean;
  display_order: number;
};

type CollectionRecord = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string | null;
  is_active: boolean;
  display_order: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [authStatus, setAuthStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");
  const [unauthorizedReason, setUnauthorizedReason] = useState<string>("");
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>("");

  // Create Admin Section State
  const [createAdminEmail, setCreateAdminEmail] = useState("");
  const [createAdminPassword, setCreateAdminPassword] = useState("");
  const [createAdminConfirmPassword, setCreateAdminConfirmPassword] = useState("");
  const [createAdminFullName, setCreateAdminFullName] = useState("");
  const [showCreateAdminPassword, setShowCreateAdminPassword] = useState(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function verifyAdminAuth() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          if (isMounted) {
            setAuthStatus("unauthorized");
            router.replace("/admin/login");
          }
          return;
        }

        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "vsidd143@gmail.com";

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_blocked")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Admin dashboard profile query error:", profileError);
          if (isMounted) {
            setAuthStatus("unauthorized");
            setUnauthorizedReason(
              `Database Error (${profileError.code || "UNKNOWN"}): ${profileError.message}`
            );
          }
          return;
        }

        const hasAdminRole = profile?.role === "admin" && !profile?.is_blocked;

        if (!hasAdminRole) {
          if (isMounted) {
            setAuthStatus("unauthorized");
            setUnauthorizedReason(
              "Access Denied: Your account is registered as a customer and does not possess administrator privileges."
            );
          }
          return;
        }

        if (isMounted) {
          setCurrentAdminEmail(user.email || adminEmail);
          setAuthStatus("authorized");
        }
      } catch {
        if (isMounted) {
          setAuthStatus("unauthorized");
          router.replace("/admin/login");
        }
      }
    }

    verifyAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Live Data Lists (100% Supabase Synchronized)
  const [productsList, setProductsList] = useState<DbProduct[]>([]);
  const [ordersList, setOrdersList] = useState<OrderItem[]>([]);
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryRecord[]>([]);
  const [productTypesList, setProductTypesList] = useState<ProductTypeRecord[]>([]);
  const [collectionsList, setCollectionsList] = useState<CollectionRecord[]>([]);
  const [couponsList, setCouponsList] = useState<CouponRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Selected for View / Edit Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);

  // Add Product Form State
  const [newProdName, setNewProdName] = useState("");
  const [newProdSubtitle, setNewProdSubtitle] = useState("");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("hoodies");
  const [newProdDepartment, setNewProdDepartment] = useState<"men" | "women" | "kids">("men");
  const [newProdType, setNewProdType] = useState("");
  const [newProdCollection, setNewProdCollection] = useState("");
  const [newProdPrice, setNewProdPrice] = useState<number>(7999);
  const [newProdRegularPrice, setNewProdRegularPrice] = useState<number>(9999);
  const [newProdMaterial, setNewProdMaterial] = useState("480 GSM Loopback French Terry Cotton");
  const [newProdFit, setNewProdFit] = useState("Oversized Boxy Fit");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdStock, setNewProdStock] = useState<number>(15);
  const [newProdSizes, setNewProdSizes] = useState("S, M, L, XL, XXL");
  const [newProdColors, setNewProdColors] = useState("Obsidian Black:#0a0a0a, Imperial Gold:#c5a46d");
  const [newProdTags, setNewProdTags] = useState("heavyweight, oversized, luxury streetwear");
  const [newProdIsNew, setNewProdIsNew] = useState(true);
  const [newProdIsBestSeller, setNewProdIsBestSeller] = useState(false);
  const [newProdIsFeatured, setNewProdIsFeatured] = useState(false);
  const [newProdIsPublished, setNewProdIsPublished] = useState(true);

  // Image Upload State
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Orders Management & Search State
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<"all" | "online" | "cod">("all");
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");

  // Executive Revenue View Mode (Total, Online Razorpay, Offline COD)
  const [revenueView, setRevenueView] = useState<"total" | "online" | "offline">("total");

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Product Type Modal State
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [typeSlug, setTypeSlug] = useState("");
  const [typeDesc, setTypeDesc] = useState("");

  // Collection Modal State
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionModalMode, setCollectionModalMode] = useState<"create" | "edit">("create");
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [collName, setCollName] = useState("");
  const [collSlug, setCollSlug] = useState("");
  const [collDesc, setCollDesc] = useState("");
  const [collImage, setCollImage] = useState("");

  // Coupon Modal State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponModalMode, setCouponModalMode] = useState<"create" | "edit">("create");
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [coupCode, setCoupCode] = useState("");
  const [coupType, setCoupType] = useState<"percentage" | "fixed">("percentage");
  const [coupValue, setCoupValue] = useState<number>(10);
  const [coupMinOrder, setCoupMinOrder] = useState<number>(0);
  const [coupProductId, setCoupProductId] = useState<string>("");
  const [coupIsActive, setCoupIsActive] = useState<boolean>(true);

  // Website Content State
  const [announcementText, setAnnouncementText] = useState(
    "PAN-INDIA COMPLIMENTARY EXPRESS DELIVERY + CASH ON DELIVERY (COD) AVAILABLE + ALL PRICES INCL. GST"
  );
  const [heroHeading, setHeroHeading] = useState("WEAR YOUR IDENTITY");
  const [heroSubheading, setHeroSubheading] = useState(
    "Luxury modern streetwear designed in India. Handcrafted heavyweight cotton product."
  );

  // Store Settings State
  const [storeSettings, setStoreSettings] = useState({
    storeName: "NOIR STUDIO // INDIA",
    supportEmail: "care@noir-studio.in",
    enableCod: true,
    gstPercentage: 12,
    freeShippingThreshold: 0,
    courierPartner: "Blue Dart Express India",
  });

  const showNotification = (type: "success" | "error", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Load All Live Supabase Data
  const refreshAllData = async () => {
    setIsLoadingData(true);
    try {
      // 1. Live Products
      const prods = await getAllAdminProducts();
      setProductsList(prods);

      // 2. Live Categories
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (cats && cats.length > 0) {
        setCategoriesList(cats as CategoryRecord[]);
      }

      // 3. Live Product Types
      const { data: pTypes } = await supabase
        .from("product_types")
        .select("*")
        .order("display_order", { ascending: true });
      if (pTypes && pTypes.length > 0) {
        setProductTypesList(pTypes as ProductTypeRecord[]);
      }

      // 4. Live Collections
      let remoteColls: CollectionRecord[] = [];
      const { data: colls } = await supabase
        .from("collections")
        .select("*")
        .order("display_order", { ascending: true });
      if (colls && colls.length > 0) {
        remoteColls = colls as CollectionRecord[];
      }
      let localColls: CollectionRecord[] = [];
      if (typeof window !== "undefined") {
        try {
          const storedColls = localStorage.getItem("noir_collections");
          if (storedColls) localColls = JSON.parse(storedColls);
        } catch { }
      }
      if (remoteColls.length > 0) {
        const remoteIds = new Set(remoteColls.map((c) => c.id));
        const mergedColls = [...remoteColls, ...localColls.filter((c) => !remoteIds.has(c.id))];
        setCollectionsList(mergedColls);
      } else if (localColls.length > 0) {
        setCollectionsList(localColls);
      } else {
        setCollectionsList([
          { id: "col-1", name: "Autumn-Winter Runway", slug: "runway-edition-07", description: "Our headline autumn collection featuring heavyweight product.", is_active: true, display_order: 1 },
          { id: "col-2", name: "Essential Streetwear", slug: "essentials", description: "Everyday luxury staples crafted from 480 GSM dense cotton.", is_active: true, display_order: 2 }
        ]);
      }

      // 5. Live Orders (No dummy fake orders)
      const { data: ords } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      let localOrds: OrderItem[] = [];
      try {
        const stored = localStorage.getItem("noir_local_orders");
        if (stored) {
          localOrds = JSON.parse(stored);
        }
      } catch { }

      if (ords && ords.length > 0) {
        const remoteIds = new Set(ords.map((o) => o.order_number));
        const cleanLocal = localOrds.filter((l) => !remoteIds.has(l.order_number));
        setOrdersList([...ords, ...cleanLocal]);
      } else {
        setOrdersList(localOrds);
      }

      // 6. Live Customers from profiles (No hardcoded demo accounts)
      const { data: profs } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      let localCusts: UserRecord[] = [];
      try {
        const storedClients = localStorage.getItem("noir_registered_clients");
        if (storedClients) {
          localCusts = JSON.parse(storedClients);
        }
      } catch { }

      if (profs && profs.length > 0) {
        const remoteEmails = new Set(profs.map((p) => p.email.toLowerCase()));
        const cleanLocalCusts = localCusts.filter((c) => !remoteEmails.has(c.email.toLowerCase()));
        setUsersList([...profs, ...cleanLocalCusts]);
      } else {
        setUsersList(localCusts);
      }

      // 7. Coupons
      let remoteCoupons: CouponRecord[] = [];
      const { data: cData } = await supabase.from("coupons").select("*");
      if (cData && cData.length > 0) {
        remoteCoupons = cData as CouponRecord[];
      }
      let localCoupons: CouponRecord[] = [];
      if (typeof window !== "undefined") {
        try {
          const storedC = localStorage.getItem("noir_coupons");
          if (storedC) localCoupons = JSON.parse(storedC);
        } catch { }
      }
      if (remoteCoupons.length > 0) {
        const remoteCodes = new Set(remoteCoupons.map((c) => c.code.toUpperCase()));
        const mergedCoupons = [...remoteCoupons, ...localCoupons.filter((c) => !remoteCodes.has(c.code.toUpperCase()))];
        setCouponsList(mergedCoupons);
      } else if (localCoupons.length > 0) {
        setCouponsList(localCoupons);
      } else {
        const defaultCoupons: CouponRecord[] = [
          { id: "c-1", code: "NOIR10", discount_type: "percentage", discount_value: 10, min_order_amount: 0, is_active: true },
          { id: "c-2", code: "VIP20", discount_type: "percentage", discount_value: 20, min_order_amount: 10000, is_active: true },
        ];
        setCouponsList(defaultCoupons);
        if (typeof window !== "undefined") {
          localStorage.setItem("noir_coupons", JSON.stringify(defaultCoupons));
        }
      }
    } catch (err) {
      console.warn("Data refresh note:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (authStatus !== "authorized") return;

    queueMicrotask(() => {
      refreshAllData();
    });

    // Supabase Realtime channel subscription for instant Order synchronization
    const ordersChannel = supabase
      .channel("admin_orders_realtime_stream")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as OrderItem;
            setOrdersList((prev) => {
              const exists = prev.some(
                (o) => o.id === newOrder.id || o.order_number === newOrder.order_number
              );
              if (exists) {
                return prev.map((o) =>
                  o.id === newOrder.id || o.order_number === newOrder.order_number
                    ? { ...o, ...newOrder }
                    : o
                );
              }
              return [newOrder, ...prev];
            });
            showNotification(
              "success",
              `New order #${newOrder.order_number} received from ${newOrder.customer_name || "customer"}!`
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Partial<OrderItem>;
            setOrdersList((prev) =>
              prev.map((o) => {
                if (o.id === updated.id || (updated.order_number && o.order_number === updated.order_number)) {
                  return {
                    ...o,
                    ...updated,
                    items: o.items,
                  };
                }
                return o;
              })
            );
            setSelectedOrder((prev) => {
              if (prev && (prev.id === updated.id || (updated.order_number && prev.order_number === updated.order_number))) {
                return {
                  ...prev,
                  ...updated,
                  items: prev.items,
                };
              }
              return prev;
            });

            if (updated.status === "confirmed") {
              showNotification(
                "success",
                `Order #${updated.order_number} was confirmed by customer.`
              );
            } else if (updated.status === "cancelled") {
              showNotification(
                "error",
                `Order #${updated.order_number} was cancelled: ${updated.cancellation_reason || "Customer requested cancellation"}`
              );
            }
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) {
              setOrdersList((prev) => prev.filter((o) => o.id !== oldId));
              setSelectedOrder((prev) => (prev?.id === oldId ? null : prev));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [authStatus]);

  // -------------------------------------------------------------
  // PRODUCT MANAGEMENT (CRUD with Supabase)
  // -------------------------------------------------------------
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    const tempProdId = "prod-" + Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadProductMedia(file, tempProdId);
      if (result.url) {
        setUploadedImageUrls((prev) => [...prev, result.url]);
      } else {
        // Fallback to local object URL if storage blocked
        const localUrl = URL.createObjectURL(file);
        setUploadedImageUrls((prev) => [...prev, localUrl]);
      }
    }
    setIsUploadingImage(false);
  };

  const handleRemoveImage = async (urlToRemove: string) => {
    await deleteProductMedia(urlToRemove);
    setUploadedImageUrls((prev) => prev.filter((u) => u !== urlToRemove));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      showNotification("error", "Product name is required.");
      return;
    }

    const parsedColors = newProdColors.split(",").map((c) => {
      const parts = c.trim().split(":");
      return {
        color_name: parts[0]?.trim() || "Obsidian Black",
        color_hex: parts[1]?.trim() || "#0a0a0a",
        size: "M",
        stock_quantity: Math.floor(newProdStock / 3) || 5,
        sku: `${newProdSku || newProdName.substring(0, 4)}-BLK-M`.toUpperCase(),
      };
    });

    const parsedSizes = newProdSizes.split(",").map((s) => s.trim());
    const variantList = parsedSizes.flatMap((sz) =>
      parsedColors.map((col) => ({
        color_name: col.color_name,
        color_hex: col.color_hex,
        size: sz,
        stock_quantity: Math.max(1, Math.floor(newProdStock / parsedSizes.length)),
        sku: `${newProdSku || newProdName.substring(0, 4)}-${col.color_name.substring(0, 3)}-${sz}`.toUpperCase(),
      }))
    );

    const imagesToSave = uploadedImageUrls.length > 0
      ? uploadedImageUrls.map((url, idx) => ({ url, is_primary: idx === 0, display_order: idx + 1 }))
      : [{ url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85", is_primary: true, display_order: 1 }];

    const matchedCat = categoriesList.find((c) => c.slug === newProdCategory);

    const payload = {
      name: newProdName.trim(),
      subtitle: newProdSubtitle.trim() || undefined,
      description: newProdDescription.trim() || undefined,
      department: newProdDepartment,
      category_id: matchedCat?.id || null,
      product_type_id: newProdType || null,
      collection_id: newProdCollection || null,
      price: Number(newProdPrice),
      regular_price: Number(newProdRegularPrice) || Number(newProdPrice),
      discounted_price: Number(newProdPrice),
      material: newProdMaterial,
      fit: newProdFit,
      sku: newProdSku.trim() || undefined,
      stock_quantity: Number(newProdStock),
      is_published: newProdIsPublished,
      is_featured: newProdIsFeatured,
      is_new_arrival: newProdIsNew,
      is_best_seller: newProdIsBestSeller,
      tags: newProdTags.split(",").map((t) => t.trim()).filter(Boolean),
      details: ["Hand finished in Mumbai Studio", "Pre-shrunk structural weave", "Articulated anatomical cut"],
      images: imagesToSave,
      variants: variantList,
    };

    const res = await createProductInDb(payload);
    if (res.data) {
      if (res.isRlsRestricted) {
        showNotification("success", `Product "${newProdName}" saved! Run the 5-line RLS unlock query in Supabase SQL editor to sync permanently.`);
      } else {
        showNotification("success", `Product "${newProdName}" successfully registered to Supabase!`);
      }
      // Reset form
      setNewProdName("");
      setNewProdSubtitle("");
      setNewProdDescription("");
      setNewProdSku("");
      setNewProdType("");
      setNewProdCollection("");
      setUploadedImageUrls([]);
      await refreshAllData();
      setActiveSection("products");
    } else {
      showNotification("error", res.error || "Failed to create product in database.");
    }
  };

  const handleTogglePublish = async (prodId: string, currentStatus: boolean) => {
    const success = await toggleProductPublishInDb(prodId, !currentStatus);
    if (success) {
      setProductsList((prev) =>
        prev.map((p) => (p.id === prodId ? { ...p, is_published: !currentStatus } : p))
      );
      showNotification("success", `Product ${!currentStatus ? "published to storefront" : "unpublished to draft"}.`);
    } else {
      showNotification("error", "Failed to update publish state in Supabase.");
    }
  };

  const handleArchiveProduct = async (prodId: string, prodName: string) => {
    if (!confirm(`Are you sure you want to remove "${prodName}" from active storefront?`)) return;
    const success = await archiveProductInDb(prodId);
    if (success) {
      setProductsList((prev) => prev.filter((p) => p.id !== prodId));
      showNotification("success", `Product "${prodName}" archived safely.`);
    } else {
      showNotification("error", "Failed to archive product.");
    }
  };

  const handleSaveEditedProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const res = await updateProductInDb(editingProduct.id, {
      name: editingProduct.name,
      subtitle: editingProduct.subtitle,
      department: editingProduct.department ? (editingProduct.department.toLowerCase() as "men" | "women" | "kids") : undefined,
      price: Number(editingProduct.price),
      regular_price: Number(editingProduct.regular_price || editingProduct.original_price || editingProduct.price),
      stock_quantity: Number(editingProduct.stock_quantity),
      is_published: editingProduct.is_published,
      category_id: editingProduct.category_id,
    });

    if (res.success) {
      setProductsList((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? { ...p, ...editingProduct } : p))
      );
      showNotification("success", `Product "${editingProduct.name}" updated successfully.`);
      setEditingProduct(null);
    } else {
      showNotification("error", res.error || "Failed to update product.");
    }
  };

  // -------------------------------------------------------------
  // ORDER MANAGEMENT (Online & COD Pipeline)
  // -------------------------------------------------------------
  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: OrderItem["status"]
  ) => {
    const isDelivered = newStatus === "delivered";
    const paymentStatusUpdate = isDelivered ? "paid" : newStatus === "cancelled" ? "cancelled" : undefined;

    // 1. Update local storage orders if stored locally
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("noir_local_orders");
        if (stored) {
          const ords: OrderItem[] = JSON.parse(stored);
          const updated = ords.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: newStatus,
                  ...(paymentStatusUpdate ? { payment_status: paymentStatusUpdate } : {}),
                }
              : o
          );
          localStorage.setItem("noir_local_orders", JSON.stringify(updated));
        }
      } catch { }
    }

    try {
      const dbUpdates: Record<string, string> = { status: newStatus };
      if (paymentStatusUpdate) {
        dbUpdates.payment_status = paymentStatusUpdate;
      }
      await supabase.from("orders").update(dbUpdates).eq("id", orderId);
      setOrdersList((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: newStatus,
                ...(paymentStatusUpdate ? { payment_status: paymentStatusUpdate } : {}),
              }
            : o
        )
      );
      showNotification("success", `Order status updated to ${newStatus.toUpperCase()}`);
    } catch {
      showNotification("error", "Could not update order status in database.");
    }
  };

  const handleAssignTracking = async (orderId: string, trackingNumber: string) => {
    // 1. Update local storage orders if stored locally
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("noir_local_orders");
        if (stored) {
          const ords: OrderItem[] = JSON.parse(stored);
          const updated = ords.map((o) =>
            o.id === orderId
              ? { ...o, tracking_number: trackingNumber, status: "shipped" }
              : o
          );
          localStorage.setItem("noir_local_orders", JSON.stringify(updated));
        }
      } catch { }
    }

    try {
      await supabase
        .from("orders")
        .update({ tracking_number: trackingNumber, status: "shipped" })
        .eq("id", orderId);
      setOrdersList((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, tracking_number: trackingNumber, status: "shipped" }
            : o
        )
      );
      showNotification("success", `Blue Dart tracking ID assigned.`);
    } catch {
      showNotification("error", "Failed to assign tracking.");
    }
  };

  // -------------------------------------------------------------
  // CUSTOMER MANAGEMENT
  // -------------------------------------------------------------
  const handleToggleBlockCustomer = async (userId: string, isBlocked: boolean) => {
    try {
      await supabase.from("profiles").update({ is_blocked: !isBlocked }).eq("id", userId);
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_blocked: !isBlocked } : u))
      );
      showNotification("success", `Client ${!isBlocked ? "blocked from checkout" : "re-activated"}.`);
    } catch {
      showNotification("error", "Failed to update client status.");
    }
  };

  // -------------------------------------------------------------
  // ADMINISTRATOR CREATION & ROLE MANAGEMENT
  // -------------------------------------------------------------
  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAdminEmail || !createAdminEmail.includes("@")) {
      showNotification("error", "Please provide a valid email address.");
      return;
    }
    if (!createAdminPassword || createAdminPassword.length < 6) {
      showNotification("error", "Password must be at least 6 characters.");
      return;
    }
    if (createAdminPassword !== createAdminConfirmPassword) {
      showNotification("error", "Passwords do not match.");
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: createAdminEmail.trim().toLowerCase(),
          password: createAdminPassword.trim(),
          fullName: createAdminFullName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create administrator");
      }

      if (data.profile) {
        setUsersList((prev) => {
          const exists = prev.some((u) => u.email.toLowerCase() === data.profile.email.toLowerCase());
          if (exists) {
            return prev.map((u) =>
              u.email.toLowerCase() === data.profile.email.toLowerCase()
                ? { ...u, ...data.profile, role: "admin", is_blocked: false }
                : u
            );
          }
          return [data.profile, ...prev];
        });
      }

      showNotification("success", data.message || "Administrator created and synchronized to database!");
      setCreateAdminEmail("");
      setCreateAdminPassword("");
      setCreateAdminConfirmPassword("");
      setCreateAdminFullName("");
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Failed to create administrator.");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleDemoteAdmin = async (userId: string) => {
    try {
      const target = usersList.find((u) => u.id === userId);
      const { error } = await supabase
        .from("profiles")
        .update({ role: "customer", is_blocked: false })
        .eq("id", userId);

      if (error) {
        showNotification("error", `Failed to demote administrator: ${error.message}`);
        return;
      }

      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: "customer" } : u))
      );
      showNotification(
        "success",
        `${target?.email || "User"} demoted to customer role in database.`
      );
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Demote action failed.");
    }
  };

  // -------------------------------------------------------------
  // CATEGORIES & TYPES & COLLECTIONS CRUD
  // -------------------------------------------------------------
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const slug = catSlug.trim() || catName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: catName.trim(),
        slug,
        description: catDesc.trim(),
        parent_id: null,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      setCategoriesList((prev) => [...prev, data as CategoryRecord]);
      setIsCategoryModalOpen(false);
      setCatName("");
      setCatSlug("");
      setCatDesc("");
      showNotification("success", `Category "${catName}" added.`);
    } else {
      showNotification("error", error?.message || "Failed to create category");
    }
  };

  const handleSaveProductType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;

    const slug = typeSlug.trim() || typeName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data, error } = await supabase
      .from("product_types")
      .insert({
        name: typeName.trim(),
        slug,
        description: typeDesc.trim(),
        is_active: true,
        display_order: productTypesList.length + 1,
      })
      .select()
      .single();

    if (!error && data) {
      setProductTypesList((prev) => [...prev, data as ProductTypeRecord]);
      setIsTypeModalOpen(false);
      setTypeName("");
      setTypeSlug("");
      setTypeDesc("");
      showNotification("success", `Product type "${typeName}" added.`);
    } else {
      showNotification("error", error?.message || "Failed to create product type");
    }
  };

  // -------------------------------------------------------------
  // COLLECTION MANAGEMENT (Create, Edit, Delete)
  // -------------------------------------------------------------
  const handleOpenCreateCollection = () => {
    setCollectionModalMode("create");
    setEditingCollectionId(null);
    setCollName("");
    setCollSlug("");
    setCollDesc("");
    setCollImage("");
    setIsCollectionModalOpen(true);
  };

  const handleOpenEditCollection = (col: CollectionRecord) => {
    setCollectionModalMode("edit");
    setEditingCollectionId(col.id);
    setCollName(col.name);
    setCollSlug(col.slug);
    setCollDesc(col.description || "");
    setCollImage(col.image_url || "");
    setIsCollectionModalOpen(true);
  };

  const handleDeleteCollection = async (colId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete collection "${name}"?`)) return;
    try {
      await supabase.from("collections").delete().eq("id", colId);
    } catch { }

    setCollectionsList((prev) => {
      const updated = prev.filter((c) => c.id !== colId);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("noir_collections", JSON.stringify(updated));
        } catch { }
      }
      return updated;
    });

    showNotification("success", `Collection "${name}" deleted.`);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collName.trim()) return;

    const slug = collSlug.trim() || collName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (collectionModalMode === "edit" && editingCollectionId) {
      try {
        await supabase
          .from("collections")
          .update({
            name: collName.trim(),
            slug,
            description: collDesc.trim(),
            image_url: collImage.trim() || null,
          })
          .eq("id", editingCollectionId);
      } catch { }

      setCollectionsList((prev) => {
        const updated = prev.map((c) =>
          c.id === editingCollectionId
            ? {
              ...c,
              name: collName.trim(),
              slug,
              description: collDesc.trim(),
              image_url: collImage.trim() || null,
            }
            : c
        );
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("noir_collections", JSON.stringify(updated));
          } catch { }
        }
        return updated;
      });

      setIsCollectionModalOpen(false);
      showNotification("success", `Collection "${collName}" updated.`);
    } else {
      const newCol: CollectionRecord = {
        id: "col-" + Date.now(),
        name: collName.trim(),
        slug,
        description: collDesc.trim(),
        image_url: collImage.trim() || null,
        is_active: true,
        display_order: collectionsList.length + 1,
      };

      try {
        const { data } = await supabase
          .from("collections")
          .insert({
            name: collName.trim(),
            slug,
            description: collDesc.trim(),
            image_url: collImage.trim() || null,
            is_active: true,
            display_order: collectionsList.length + 1,
          })
          .select()
          .single();
        if (data) {
          newCol.id = data.id;
        }
      } catch { }

      setCollectionsList((prev) => {
        const updated = [...prev, newCol];
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("noir_collections", JSON.stringify(updated));
          } catch { }
        }
        return updated;
      });

      setIsCollectionModalOpen(false);
      setCollName("");
      setCollSlug("");
      setCollDesc("");
      setCollImage("");
      showNotification("success", `Collection "${collName}" created.`);
    }
  };

  // -------------------------------------------------------------
  // COUPON MANAGEMENT (Create, Edit, Delete, Product-Specific)
  // -------------------------------------------------------------
  const handleOpenCreateCoupon = () => {
    setCouponModalMode("create");
    setEditingCouponId(null);
    setCoupCode("");
    setCoupType("percentage");
    setCoupValue(10);
    setCoupMinOrder(0);
    setCoupProductId("");
    setCoupIsActive(true);
    setIsCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (c: CouponRecord) => {
    setCouponModalMode("edit");
    setEditingCouponId(c.id);
    setCoupCode(c.code);
    setCoupType(c.discount_type);
    setCoupValue(c.discount_value);
    setCoupMinOrder(c.min_order_amount);
    setCoupProductId(c.product_id || "");
    setCoupIsActive(c.is_active);
    setIsCouponModalOpen(true);
  };

  const handleDeleteCoupon = async (cId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon code "${code}"?`)) return;
    try {
      await supabase.from("coupons").delete().eq("id", cId);
    } catch { }

    setCouponsList((prev) => {
      const updated = prev.filter((c) => c.id !== cId);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("noir_coupons", JSON.stringify(updated));
        } catch { }
      }
      return updated;
    });

    showNotification("success", `Coupon code "${code}" deleted.`);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = coupCode.trim().toUpperCase();
    if (!formattedCode) return;

    const matchedProd = productsList.find((p) => p.id === coupProductId);
    const prodName = matchedProd ? matchedProd.name : null;

    if (couponModalMode === "edit" && editingCouponId) {
      try {
        await supabase
          .from("coupons")
          .update({
            code: formattedCode,
            discount_type: coupType,
            discount_value: coupValue,
            min_order_amount: coupMinOrder,
            is_active: coupIsActive,
          })
          .eq("id", editingCouponId);
      } catch { }

      setCouponsList((prev) => {
        const updated = prev.map((c) =>
          c.id === editingCouponId
            ? {
              ...c,
              code: formattedCode,
              discount_type: coupType,
              discount_value: coupValue,
              min_order_amount: coupMinOrder,
              is_active: coupIsActive,
              product_id: coupProductId || null,
              product_name: prodName,
            }
            : c
        );
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("noir_coupons", JSON.stringify(updated));
          } catch { }
        }
        return updated;
      });

      setIsCouponModalOpen(false);
      showNotification("success", `Coupon "${formattedCode}" updated.`);
    } else {
      const newCoupon: CouponRecord = {
        id: "c-" + Date.now(),
        code: formattedCode,
        discount_type: coupType,
        discount_value: coupValue,
        min_order_amount: coupMinOrder,
        is_active: coupIsActive,
        product_id: coupProductId || null,
        product_name: prodName,
      };

      try {
        const { data } = await supabase
          .from("coupons")
          .insert({
            code: formattedCode,
            discount_type: coupType,
            discount_value: coupValue,
            min_order_amount: coupMinOrder,
            is_active: coupIsActive,
          })
          .select()
          .single();
        if (data) {
          newCoupon.id = data.id;
        }
      } catch { }

      setCouponsList((prev) => {
        const updated = [...prev, newCoupon];
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("noir_coupons", JSON.stringify(updated));
          } catch { }
        }
        return updated;
      });

      setIsCouponModalOpen(false);
      showNotification("success", `Coupon "${formattedCode}" created and active.`);
    }
  };

  // -------------------------------------------------------------
  // PROFESSIONAL CSV EXPORT HANDLER
  // -------------------------------------------------------------
  const handleDownloadCSV = (status: string = "all") => {
    if (ordersList.length === 0) {
      showNotification("error", "No orders available to export.");
      return;
    }
    exportOrdersToCSV(ordersList as unknown as AnalyticsOrder[], status);
    showNotification("success", `NOIR ${status.toUpperCase()} Orders CSV exported successfully.`);
  };

  // -------------------------------------------------------------
  // INVENTORY ADJUSTER
  // -------------------------------------------------------------
  const handleUpdateStock = async (prodId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    const { error } = await supabase
      .from("products")
      .update({ stock_quantity: newStock })
      .eq("id", prodId);

    if (!error) {
      setProductsList((prev) =>
        prev.map((p) => (p.id === prodId ? { ...p, stock_quantity: newStock } : p))
      );
      showNotification("success", `Stock updated to ${newStock} units.`);
    } else {
      showNotification("error", "Failed to update stock quantity.");
    }
  };

  // -------------------------------------------------------------
  // 13 SIDEBAR ITEMS DEFINITION
  // -------------------------------------------------------------
  const SIDEBAR_ITEMS: { id: AdminSection; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Sales & Analytics", icon: BarChart3 },
    { id: "products", label: "Product Management", icon: Package, badge: productsList.length },
    { id: "add-product", label: "Add Product", icon: PlusCircle },
    { id: "categories", label: "Categories", icon: Layers, badge: categoriesList.length },
    { id: "product-types", label: "Product Types", icon: FolderTree, badge: productTypesList.length },
    { id: "orders", label: "Customer Orders", icon: ShoppingBag, badge: ordersList.length },
    { id: "customers", label: "Customers", icon: Users, badge: usersList.length },
    { id: "create-admin", label: "Create Admin", icon: ShieldCheck, badge: usersList.filter((u) => u.role === "admin").length },
    { id: "inventory", label: "Inventory", icon: Boxes },
    { id: "coupons", label: "Coupons", icon: Tag, badge: couponsList.length },
    { id: "content", label: "Website Content", icon: Megaphone },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Comprehensive Revenue & Fulfillment Breakdown (Online Razorpay vs. Offline COD)
  const revMetrics = computeRevenueBreakdown(ordersList);
  const totalRevenue = revMetrics.totalRevenue;
  const onlineRevenue = revMetrics.onlineRevenue;
  const offlineRevenue = revMetrics.offlineRevenue;

  const pendingCodOrders = ordersList.filter(
    (o) => !isOnlineOrder(o) && (o.status === "pending" || o.status === "confirmed")
  );
  const pendingOnlineOrders = ordersList.filter(
    (o) => isOnlineOrder(o) && (o.status === "confirmed" || o.status === "processing")
  );

  const lowStockProducts = productsList.filter((p) => (p.stock_quantity ?? 0) <= 5);

  if (authStatus === "checking") {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative">
        <CustomCursor />
        <div className="w-10 h-10 border-2 border-[#c5a46d]/20 border-t-[#c5a46d] rounded-full animate-spin mb-4" />
        <span className="text-xl font-display font-black tracking-[0.3em] text-white uppercase">NOIR</span>
        <span className="text-[10px] font-mono tracking-widest text-[#c5a46d] uppercase mt-2">
          AUTHENTICATING STUDIO ACCESS...
        </span>
      </div>
    );
  }

  if (authStatus === "unauthorized") {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center relative">
        <CustomCursor />
        <div className="max-w-md p-8 border border-red-500/30 bg-[#0a0a0a] shadow-2xl">
          <div className="w-12 h-12 mx-auto mb-4 border border-red-500/40 bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-display uppercase tracking-widest text-white mb-2">ACCESS RESTRICTED</h2>
          <p className="text-xs text-neutral-400 font-sans mb-6">
            {unauthorizedReason || "Master Administrator privileges required to access the Studio Command Center."}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/admin/login"
              className="w-full py-3 bg-[#c5a46d] text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-[#d4b57e] transition-colors"
            >
              Switch to Master Administrator Account
            </Link>
            <Link
              href="/"
              className="w-full py-3 border border-white/20 text-neutral-300 font-mono text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
            >
              Return to Boutique
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <CustomCursor />
      <ToastContainer />

      {/* Floating Status Notification */}
      {feedbackMsg && (
        <div
          className={`fixed top-6 right-6 z-[300] px-5 py-3 border text-xs font-mono flex items-center gap-3 shadow-2xl backdrop-blur-md transition-all ${feedbackMsg.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/90 border-red-500/40 text-red-200"
            }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 13-ITEM PROFESSIONAL SIDEBAR (Fixed Left) */}
      {/* ========================================================= */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-[150] w-64 bg-[#0a0a0a] border-r border-white/10 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Brand & Terminal Header */}
        <div>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl font-black tracking-[0.25em] text-white uppercase font-display">
                  NOIR
                </span>
                <span className="text-[9px] font-mono bg-[#c5a46d] text-black px-1.5 py-0.5 font-bold uppercase tracking-wider">
                  ADMIN
                </span>
              </Link>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="md:hidden text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate">Connected: {currentAdminEmail || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "vsidd143@gmail.com"}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${isActive
                      ? "bg-[#c5a46d] text-black font-extrabold shadow-lg shadow-[#c5a46d]/15"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-black" : "text-neutral-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 font-bold ${isActive
                          ? "bg-black text-[#c5a46d]"
                          : "bg-white/10 text-neutral-300"
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Quick Actions & Sign Out (Item 13) */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-white/5 border border-white/10"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[#c5a46d]" />
              <span>Live Storefront</span>
            </div>
          </Link>
          <button
            onClick={async () => {
              await signOut();
              router.push("/admin/login");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-500/20 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 ml-0 md:ml-64 flex flex-col min-w-0"
      >
        {/* Top Navbar */}
        <header className="sticky top-0 z-[100] h-16 bg-[#050505]/95 backdrop-blur-xl border-b border-white/10 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-neutral-400 hover:text-white border border-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-neutral-500 uppercase">Console //</span>
              <span className="text-[#c5a46d] font-bold uppercase tracking-wider">
                {activeSection.replace("-", " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={refreshAllData}
              disabled={isLoadingData}
              title="Refresh live Supabase tables"
              className="p-2 border border-white/15 hover:border-white text-neutral-400 hover:text-white text-xs font-mono flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync Supabase</span>
            </button>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-mono text-neutral-500 block">Currency</span>
              <span className="text-xs font-mono text-[#c5a46d] font-bold">INR (₹) COD ONLY</span>
            </div>
          </div>
        </header>

        {/* Dynamic Section Renderer */}
        <main className="p-6 md:p-10 max-w-7xl w-full mx-auto space-y-8 flex-1">
          {/* ===================================================== */}
          {/* 1. DASHBOARD */}
          {/* ===================================================== */}
          {activeSection === "dashboard" && (
            <div className="space-y-8">
              {/* Header */}
              <div>
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#c5a46d] block mb-1">
                  EXECUTIVE SUMMARY // REAL-TIME METRICS
                </span>
                <h2 className="text-3xl font-black uppercase tracking-tight font-display">
                  Platform Overview
                </h2>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[10px] font-mono uppercase tracking-widest">Active Catalogue</span>
                    <Package className="w-4 h-4 text-[#c5a46d]" />
                  </div>
                  <div className="text-3xl font-black font-mono text-white">
                    {productsList.filter((p) => p.is_published).length}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 block">
                    {productsList.length} Total product Registered
                  </span>
                </div>

                <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[10px] font-mono uppercase tracking-widest">Pending Fulfillment</span>
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-black font-mono text-amber-400">
                    {revMetrics.pendingCodCount + revMetrics.pendingOnlineCount}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 block">
                    {revMetrics.pendingCodCount} COD · {revMetrics.pendingOnlineCount} Online Paid ({ordersList.length} Total)
                  </span>
                </div>

                {/* Realized Revenue Card with Online, Offline (COD), and Total options */}
                <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 relative group">
                  {/* Header Row with Label & Option Switcher */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white font-bold">
                        Realized Revenue
                      </span>
                    </div>

                    {/* Interactive Selector Pills: Total | Online | Offline */}
                    <div className="flex items-center bg-black p-0.5 border border-white/15 rounded text-[9px] font-mono uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => setRevenueView("total")}
                        className={`px-2 py-0.5 transition-all cursor-pointer rounded-xs ${
                          revenueView === "total"
                            ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                            : "text-neutral-400 hover:text-white"
                        }`}
                        title="Show Combined Total Realized Revenue"
                      >
                        Total
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevenueView("online")}
                        className={`px-2 py-0.5 transition-all cursor-pointer rounded-xs ${
                          revenueView === "online"
                            ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                            : "text-neutral-400 hover:text-white"
                        }`}
                        title="Show Razorpay Online Gateway Revenue"
                      >
                        Online
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevenueView("offline")}
                        className={`px-2 py-0.5 transition-all cursor-pointer rounded-xs ${
                          revenueView === "offline"
                            ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                            : "text-neutral-400 hover:text-white"
                        }`}
                        title="Show Cash on Delivery (COD) Realized Revenue"
                      >
                        Offline
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Bold Value Display */}
                  <div>
                    <div
                      className={`text-3xl font-black font-mono transition-colors ${
                        revenueView === "total"
                          ? "text-emerald-400"
                          : revenueView === "online"
                          ? "text-cyan-400"
                          : "text-amber-400"
                      }`}
                    >
                      {formatPrice(
                        revenueView === "total"
                          ? revMetrics.totalRevenue
                          : revenueView === "online"
                          ? revMetrics.onlineRevenue
                          : revMetrics.offlineRevenue
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                      {revenueView === "total" &&
                        `Total Realized (${revMetrics.totalRealizedCount} Paid & Delivered)`}
                      {revenueView === "online" &&
                        `Razorpay Online Gateway (${revMetrics.onlineOrdersCount} Completed Payments)`}
                      {revenueView === "offline" &&
                        `Delivered Cash on Delivery (${revMetrics.offlineOrdersCount} Delivered Orders)`}
                    </span>
                  </div>

                  {/* Dual Breakdown Summary Bar: Online vs Offline COD */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setRevenueView("online")}
                      className={`p-2 text-left rounded border transition-all cursor-pointer ${
                        revenueView === "online"
                          ? "bg-cyan-950/40 border-cyan-500/50 shadow-xs"
                          : "bg-white/5 border-transparent hover:border-white/20"
                      }`}
                      title="Click to view Online Revenue"
                    >
                      <div className="flex items-center gap-1.5 text-neutral-400 text-[9px] uppercase tracking-wider">
                        <CreditCard className="w-3 h-3 text-cyan-400" />
                        <span>Online (Razorpay)</span>
                      </div>
                      <div className="text-sm font-bold text-cyan-400 mt-0.5">
                        {formatPrice(revMetrics.onlineRevenue)}
                      </div>
                      <span className="text-[9px] text-neutral-500 block">
                        {revMetrics.onlineOrdersCount} paid orders
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRevenueView("offline")}
                      className={`p-2 text-left rounded border transition-all cursor-pointer ${
                        revenueView === "offline"
                          ? "bg-amber-950/40 border-amber-500/50 shadow-xs"
                          : "bg-white/5 border-transparent hover:border-white/20"
                      }`}
                      title="Click to view Offline COD Revenue"
                    >
                      <div className="flex items-center gap-1.5 text-neutral-400 text-[9px] uppercase tracking-wider">
                        <Truck className="w-3 h-3 text-amber-400" />
                        <span>Offline (COD)</span>
                      </div>
                      <div className="text-sm font-bold text-amber-400 mt-0.5">
                        {formatPrice(revMetrics.offlineRevenue)}
                      </div>
                      <span className="text-[9px] text-neutral-500 block">
                        {revMetrics.offlineOrdersCount} delivered
                      </span>
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[10px] font-mono uppercase tracking-widest">Registered Clients</span>
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-3xl font-black font-mono text-cyan-400">
                    {usersList.length}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 block">
                    Direct Supabase Profiles
                  </span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-6 bg-gradient-to-r from-neutral-950 via-[#0a0a0a] to-neutral-950 border border-[#c5a46d]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#c5a46d] block mb-1">
                    STARTING CATALOGUE STATUS
                  </span>
                  <h3 className="text-lg font-bold text-white uppercase font-display">
                    {productsList.length === 0
                      ? "Clean Fresh Catalogue · Ready for New Products"
                      : `${productsList.length} Active product Synced to Storefront`}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    All demo pieces have been archived. You have complete 100% control over additions, edits, and stock.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection("add-product")}
                  className="px-5 py-3 bg-[#c5a46d] hover:bg-[#d4b57e] text-black font-extrabold text-xs font-mono uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#c5a46d]/20 shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Register First Piece</span>
                </button>
              </div>

              {/* BI Analytics Promotion Banner */}
              <div className="p-6 bg-[#0a0a0a] border border-[#c5a46d]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#c5a46d] block mb-1">
                    ENTERPRISE BUSINESS INTELLIGENCE
                  </span>
                  <h3 className="text-lg font-bold text-white uppercase font-display">
                    Advanced Sales Analytics & Profit Engine
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                    Audit real net profit margins, weekly/monthly/yearly trajectories, customer loss reasoning, and download 14 specialized CSV reports.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection("analytics")}
                  className="px-5 py-3 bg-black border border-[#c5a46d] hover:bg-[#c5a46d] text-[#c5a46d] hover:text-black font-extrabold text-xs font-mono uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-lg"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Open Analytics BI Hub &rarr;</span>
                </button>
              </div>

              {/* Studio Access & Administrator Management Banner */}
              <div className="p-6 bg-gradient-to-r from-neutral-950 via-[#0a0a0a] to-neutral-950 border border-[#c5a46d]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-[#c5a46d]" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#c5a46d] font-bold">
                      ADMINISTRATOR ACCESS & CREDENTIALS
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase font-display">
                    Create Administrator & Grant Database Access
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                    Add new administrator email and password. Details automatically synchronize to Supabase database with full master privileges.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection("create-admin")}
                  className="px-5 py-3 bg-[#c5a46d] hover:bg-[#d4b57e] text-black font-extrabold text-xs font-mono uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-lg shadow-[#c5a46d]/20"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Create Admin &rarr;</span>
                </button>
              </div>

              {/* Recent Orders & Low Stock */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Orders Pending Fulfillment */}
                <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#c5a46d]" />
                      Orders Pending Fulfillment ({pendingCodOrders.length + pendingOnlineOrders.length})
                    </h3>
                    <button
                      onClick={() => setActiveSection("orders")}
                      className="text-[10px] font-mono text-[#c5a46d] hover:underline uppercase cursor-pointer"
                    >
                      View All
                    </button>
                  </div>
                  {pendingCodOrders.length + pendingOnlineOrders.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-neutral-500">
                      No pending orders at this time.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...pendingOnlineOrders, ...pendingCodOrders].slice(0, 4).map((ord) => {
                        const isOnline = isOnlineOrder(ord);
                        return (
                          <div
                            key={ord.id}
                            className="p-3 bg-black border border-white/10 flex items-center justify-between text-xs font-mono"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[#c5a46d] font-bold">{ord.order_number}</span>
                                {isOnline ? (
                                  <span className="text-[9px] font-mono px-1 py-0.2 bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 uppercase font-bold">
                                    Online
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-950/80 text-amber-400 border border-amber-500/30 uppercase font-bold">
                                    COD
                                  </span>
                                )}
                              </div>
                              <span className="text-neutral-400 text-[11px] block mt-0.5">{ord.customer_name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-white font-bold block">{formatPrice(ord.total_amount)}</span>
                              <span className="text-[10px] text-amber-400 uppercase tracking-wider">{ord.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Low Stock Alerts */}
                <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-red-400" />
                      Low Stock Alerts ({lowStockProducts.length})
                    </h3>
                    <button
                      onClick={() => setActiveSection("inventory")}
                      className="text-[10px] font-mono text-[#c5a46d] hover:underline uppercase"
                    >
                      Manage Stock
                    </button>
                  </div>
                  {lowStockProducts.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-neutral-500">
                      All products have healthy inventory levels.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lowStockProducts.slice(0, 4).map((p) => (
                        <div
                          key={p.id}
                          className="p-3 bg-black border border-red-500/20 flex items-center justify-between text-xs font-mono"
                        >
                          <div>
                            <span className="text-white font-bold block">{p.name}</span>
                            <span className="text-neutral-500 text-[10px]">SKU: {p.sku || "N/A"}</span>
                          </div>
                          <span className="text-red-400 font-bold bg-red-950/40 px-2 py-1 border border-red-500/30 text-[10px]">
                            {p.stock_quantity ?? 0} UNITS LEFT
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* 1.1 SALES ANALYTICS & PROFIT ENGINE (BI PLATFORM) */}
          {/* ===================================================== */}
          {activeSection === "analytics" && (
            <SalesAnalyticsDashboard
              orders={ordersList as unknown as AnalyticsOrder[]}
              products={productsList}
              onRefreshData={refreshAllData}
              onNavigateToOrder={(id) => {
                const ord = ordersList.find((o) => o.id === id);
                if (ord) {
                  setSelectedOrder(ord);
                  setActiveSection("orders");
                }
              }}
            />
          )}

          {/* ===================================================== */}
          {/* 2 & 3. COMPREHENSIVE PRODUCT MANAGEMENT SYSTEM */}
          {/* ===================================================== */}
          {(activeSection === "products" || activeSection === "add-product") && (
            <ProductManagementSection
              products={productsList}
              categories={categoriesList}
              productTypes={productTypesList}
              onRefresh={refreshAllData}
              showNotification={showNotification}
              initialTab={activeSection === "add-product" ? "add-product" : "all-products"}
            />
          )}

          {/* ===================================================== */}
          {/* 4. CATEGORIES */}
          {/* ===================================================== */}
          {activeSection === "categories" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight font-display">
                    Categories & Departments ({categoriesList.length})
                  </h2>
                  <p className="text-xs font-mono text-neutral-400">
                    Two-tier hierarchy for storefront navigation and product grouping.
                  </p>
                </div>
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-4 py-2 bg-[#c5a46d] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoriesList.map((cat) => (
                  <div key={cat.id} className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase text-[#c5a46d] tracking-widest">
                        {cat.parent_id ? "Subcategory" : "Top Department"}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white uppercase">{cat.name}</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">{cat.description}</p>
                    <div className="pt-2 border-t border-white/10 text-[10px] text-neutral-500">
                      slug: <span className="text-neutral-300">/{cat.slug}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* 5. PRODUCT TYPES */}
          {/* ===================================================== */}
          {activeSection === "product-types" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight font-display">
                    Product Types ({productTypesList.length})
                  </h2>
                  <p className="text-xs font-mono text-neutral-400">
                    Specific garment classifications (T-Shirts, Hoodies, Tactical Trousers, Architectural Sneakers).
                  </p>
                </div>
                <button
                  onClick={() => setIsTypeModalOpen(true)}
                  className="px-4 py-2 bg-[#c5a46d] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product Type</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {productTypesList.map((pt) => (
                  <div key={pt.id} className="p-5 bg-[#0a0a0a] border border-white/10 space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500 uppercase">Classification</span>
                      <span className="text-[9px] text-[#c5a46d]">ORDER: #{pt.display_order}</span>
                    </div>
                    <h3 className="text-base font-bold text-white uppercase">{pt.name}</h3>
                    <p className="text-xs text-neutral-400">{pt.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* 7. ORDERS & CUSTOMER TRACKING (CSV & Status Sections) */}
          {/* ===================================================== */}
          {activeSection === "orders" && (
            <div className="space-y-6">
              {/* Header with Title and CSV Export Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0a0a0a] border border-white/10 p-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#c5a46d] mb-1">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Order Management & Customer Tracking</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight font-display text-white">
                    Customer Orders ({ordersList.length})
                  </h2>
                  <p className="text-xs font-mono text-neutral-400 mt-1 max-w-xl">
                    Live customer order tracking, products ordered vs. cancelled metrics, separate status sections, and export to CSV.
                  </p>
                </div>

                {/* CSV & Excel Export Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
                  {/* Primary Download CSV (All Orders Organized by Status) */}
                  <button
                    onClick={() => handleDownloadCSV("all")}
                    className="px-4 py-2.5 bg-[#c5a46d] hover:bg-[#d4b57e] text-black font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg cursor-pointer"
                    title="Download complete CSV with all customer orders organized by order status"
                  >
                    <Download className="w-4 h-4 text-black" />
                    <span>Download CSV (All Orders)</span>
                  </button>

                  {/* Contextual Status CSV Download Button */}
                  {orderStatusFilter !== "all" && (
                    <button
                      onClick={() => handleDownloadCSV(orderStatusFilter)}
                      className="px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold uppercase tracking-wider flex items-center gap-2 border border-[#c5a46d]/40 transition-colors cursor-pointer"
                      title={`Download only ${orderStatusFilter.toUpperCase()} orders as CSV`}
                    >
                      <FileText className="w-4 h-4 text-[#c5a46d]" />
                      <span>Download {orderStatusFilter.toUpperCase()} CSV</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Section Tabs (Delivered, Cancelled, Pending, Processing, Shipped, Confirmed) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">
                    Order Status Sections
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Click any status section to view & export its specific orders
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10 font-mono text-xs">
                  {(
                    [
                      { id: "all", label: "All Orders", count: ordersList.length, color: "text-white" },
                      {
                        id: "delivered",
                        label: "Delivered",
                        count: ordersList.filter((o) => o.status === "delivered").length,
                        color: "text-emerald-400",
                      },
                      {
                        id: "cancelled",
                        label: "Cancelled",
                        count: ordersList.filter((o) => o.status === "cancelled").length,
                        color: "text-red-400",
                      },
                      {
                        id: "pending",
                        label: "Pending",
                        count: ordersList.filter((o) => o.status === "pending").length,
                        color: "text-[#c5a46d]",
                      },
                      {
                        id: "processing",
                        label: "Processing",
                        count: ordersList.filter((o) => o.status === "processing").length,
                        color: "text-purple-400",
                      },
                      {
                        id: "shipped",
                        label: "Shipped",
                        count: ordersList.filter((o) => o.status === "shipped").length,
                        color: "text-blue-400",
                      },
                      {
                        id: "confirmed",
                        label: "Confirmed",
                        count: ordersList.filter((o) => o.status === "confirmed").length,
                        color: "text-amber-400",
                      },
                    ] as const
                  ).map((tab) => {
                    const isActive = orderStatusFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setOrderStatusFilter(tab.id)}
                        className={`px-3.5 py-2 whitespace-nowrap uppercase tracking-wider text-[11px] font-bold flex items-center gap-2 transition-all cursor-pointer border ${isActive
                            ? "bg-[#c5a46d] text-black border-[#c5a46d] shadow-md shadow-[#c5a46d]/20"
                            : "bg-[#0a0a0a] text-neutral-400 border-white/10 hover:border-white/30 hover:text-white"
                          }`}
                      >
                        <span className={isActive ? "text-black" : tab.color}>{tab.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? "bg-black text-white font-black" : "bg-white/10 text-neutral-300"
                            }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Section Info Banner & Quick Status CSV Download */}
              <div className="p-4 bg-[#0a0a0a] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${orderStatusFilter === "delivered"
                        ? "bg-emerald-400 ring-4 ring-emerald-500/20"
                        : orderStatusFilter === "cancelled"
                          ? "bg-red-400 ring-4 ring-red-500/20"
                          : orderStatusFilter === "pending"
                            ? "bg-[#c5a46d] ring-4 ring-[#c5a46d]/20"
                            : orderStatusFilter === "processing"
                              ? "bg-purple-400 ring-4 ring-purple-500/20"
                              : orderStatusFilter === "shipped"
                                ? "bg-blue-400 ring-4 ring-blue-500/20"
                                : orderStatusFilter === "confirmed"
                                  ? "bg-amber-400 ring-4 ring-amber-500/20"
                                  : "bg-white ring-4 ring-white/20"
                      }`}
                  />
                  <div>
                    <span className="text-white font-bold uppercase tracking-wider">
                      {orderStatusFilter === "all" ? "All Status Sections" : `${orderStatusFilter.toUpperCase()} Orders Section`}
                    </span>
                    <span className="text-neutral-400 text-[11px] ml-2">
                      ({ordersList.filter((o) => orderStatusFilter === "all" || o.status === orderStatusFilter).length} orders ·{" "}
                      {formatPrice(
                        ordersList
                          .filter((o) => orderStatusFilter === "all" || o.status === orderStatusFilter)
                          .reduce((sum, o) => sum + (o.total_amount || 0), 0)
                      )}{" "}
                      total value)
                    </span>
                  </div>
                </div>

                {/* Status-specific CSV Download Quick Link */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadCSV(orderStatusFilter)}
                    className="text-[11px] text-[#c5a46d] hover:text-[#d4b57e] hover:underline font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {orderStatusFilter === "all"
                        ? "Download All Orders CSV"
                        : `Download ${orderStatusFilter.toUpperCase()} CSV`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Quick Status CSV Export Bar (Allows downloading separate CSV for each status with 1 click) */}
              <div className="p-3 bg-black/60 border border-white/5 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="text-neutral-500 uppercase text-[10px] mr-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-neutral-400" />
                  <span>Download by Status:</span>
                </span>
                {(
                  [
                    { id: "delivered", label: "Delivered CSV", color: "text-emerald-400 hover:border-emerald-500/40" },
                    { id: "cancelled", label: "Cancelled CSV", color: "text-red-400 hover:border-red-500/40" },
                    { id: "pending", label: "Pending CSV", color: "text-[#c5a46d] hover:border-[#c5a46d]/40" },
                    { id: "processing", label: "Processing CSV", color: "text-purple-400 hover:border-purple-500/40" },
                    { id: "shipped", label: "Shipped CSV", color: "text-blue-400 hover:border-blue-500/40" },
                    { id: "confirmed", label: "Confirmed CSV", color: "text-amber-400 hover:border-amber-500/40" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleDownloadCSV(item.id)}
                    className={`px-2 py-1 bg-[#0a0a0a] border border-white/10 ${item.color} uppercase font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1`}
                    title={`Download ${item.label}`}
                  >
                    <Download className="w-2.5 h-2.5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Search & Filter Toolbar with Payment Method Filter */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search by Order ID, Client, Email, Waybill..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/15 pl-9 pr-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#c5a46d]"
                  />
                  {orderSearchQuery && (
                    <button
                      onClick={() => setOrderSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Payment Method Switcher Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center bg-black p-0.5 border border-white/15 rounded text-[10px]">
                    <span className="text-neutral-500 uppercase px-2 font-bold text-[9px]">Payment:</span>
                    <button
                      type="button"
                      onClick={() => setOrderPaymentFilter("all")}
                      className={`px-2.5 py-1 uppercase font-bold transition-all cursor-pointer rounded-xs ${
                        orderPaymentFilter === "all"
                          ? "bg-white text-black"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      All ({ordersList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderPaymentFilter("online")}
                      className={`px-2.5 py-1 uppercase font-bold transition-all cursor-pointer rounded-xs flex items-center gap-1 ${
                        orderPaymentFilter === "online"
                          ? "bg-cyan-500 text-black font-extrabold"
                          : "text-cyan-400 hover:text-cyan-300"
                      }`}
                      title="Filter for Online Razorpay orders"
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>Online ({revMetrics.onlineOrdersCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderPaymentFilter("cod")}
                      className={`px-2.5 py-1 uppercase font-bold transition-all cursor-pointer rounded-xs flex items-center gap-1 ${
                        orderPaymentFilter === "cod"
                          ? "bg-amber-500 text-black font-extrabold"
                          : "text-amber-400 hover:text-amber-300"
                      }`}
                      title="Filter for Cash on Delivery (COD) orders"
                    >
                      <Truck className="w-3 h-3" />
                      <span>COD ({ordersList.length - revMetrics.onlineOrdersCount})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Orders Table with Customer Tracking & Complete Details */}
              <div className="bg-[#0a0a0a] border border-white/10 overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] text-neutral-400 uppercase tracking-widest bg-black/60">
                      <th className="p-4">Order ID & Date</th>
                      <th className="p-4">Customer Details & Tracking</th>
                      <th className="p-4">Ordered Products</th>
                      <th className="p-4">Payment & Revenue</th>
                      <th className="p-4">Status Workflow</th>
                      <th className="p-4">Tracking Waybill</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      const filtered = ordersList.filter((ord) => {
                        const matchesStatus = orderStatusFilter === "all" || ord.status === orderStatusFilter;
                        const isOnline = isOnlineOrder(ord);
                        const matchesPayment =
                          orderPaymentFilter === "all" ||
                          (orderPaymentFilter === "online" && isOnline) ||
                          (orderPaymentFilter === "cod" && !isOnline);
                        const matchesSearch =
                          !orderSearchQuery ||
                          ord.order_number.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          ord.customer_name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          ord.customer_email.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          (ord.tracking_number &&
                            ord.tracking_number.toLowerCase().includes(orderSearchQuery.toLowerCase()));
                        return matchesStatus && matchesPayment && matchesSearch;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="p-12 text-center text-neutral-500">
                              <ShoppingBag className="w-10 h-10 mx-auto text-neutral-700 mb-3" />
                              <p className="text-sm uppercase font-bold text-neutral-400">No Orders in this Section</p>
                              <p className="text-xs text-neutral-600 mt-1">
                                {orderSearchQuery
                                  ? "No orders match your search criteria."
                                  : `No orders match status "${orderStatusFilter}" and payment filter "${orderPaymentFilter}".`}
                              </p>
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((ord) => {
                        const totalUnits = ord.items
                          ? ord.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
                          : 0;

                        // Customer Tracking Metrics
                        const custStats = calculateCustomerStats(ord.customer_email, ordersList);

                        return (
                          <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                            {/* Order ID & Date */}
                            <td className="p-4">
                              <button
                                onClick={() => setSelectedOrder(ord)}
                                className="text-[#c5a46d] font-bold block hover:underline text-left cursor-pointer"
                              >
                                {ord.order_number}
                              </button>
                              <span className="text-[10px] text-neutral-500">
                                {new Date(ord.created_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </td>

                            {/* Customer Information & Tracking Metrics */}
                            <td className="p-4">
                              <span className="text-white font-medium block">{ord.customer_name}</span>
                              <span className="text-[11px] text-neutral-400 block">{ord.customer_email}</span>
                              {ord.customer_phone && (
                                <span className="text-[10px] text-neutral-500 block">{ord.customer_phone}</span>
                              )}

                              {/* Customer Tracking Stats: Products Ordered vs Cancelled */}
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span
                                  className="text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded-none"
                                  title="Total products ordered by this customer"
                                >
                                  ✓ {custStats.totalOrdered} Ordered
                                </span>
                                <span
                                  className={`font-bold border px-1.5 py-0.5 rounded-none ${custStats.totalCancelled > 0
                                      ? "text-red-400 bg-red-950/70 border-red-500/30"
                                      : "text-neutral-500 bg-black/40 border-white/10"
                                    }`}
                                  title="Total products cancelled by this customer"
                                >
                                  ✕ {custStats.totalCancelled} Cancelled
                                </span>
                              </div>
                            </td>

                            {/* Ordered Products Breakdown */}
                            <td className="p-4 max-w-xs">
                              {ord.items && ord.items.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-white font-medium text-[11px]">
                                    <span className="text-[#c5a46d] font-bold">{totalUnits} {totalUnits === 1 ? "unit" : "units"}</span>
                                    <span className="text-neutral-500">•</span>
                                    <span className="truncate">{ord.items[0]?.product_name}</span>
                                    {ord.items.length > 1 && (
                                      <span className="text-neutral-500 text-[10px]">
                                        +{ord.items.length - 1} more
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-neutral-400 truncate">
                                    {ord.items.map((it) => `${it.product_name} (${it.size || "M"} x${it.quantity})`).join(", ")}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-neutral-500 text-[11px]">Standard Item (x1)</span>
                              )}
                            </td>

                            {/* Payment Method, Status & Amount */}
                            <td className="p-4 whitespace-nowrap">
                              <div className="font-bold text-white text-sm">
                                {formatPrice(ord.total_amount)}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                {isOnlineOrder(ord) ? (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-bold uppercase inline-flex items-center gap-1">
                                    <CreditCard className="w-2.5 h-2.5" />
                                    <span>Online</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-950/60 text-amber-300 border border-amber-500/30 font-bold uppercase inline-flex items-center gap-1">
                                    <Truck className="w-2.5 h-2.5" />
                                    <span>COD</span>
                                  </span>
                                )}
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.5 font-bold uppercase rounded-xs border ${
                                    ord.payment_status === "paid" || ord.status === "delivered"
                                      ? "text-emerald-400 bg-emerald-950/50 border-emerald-500/30"
                                      : "text-amber-400 bg-amber-950/50 border-amber-500/30"
                                  }`}
                                >
                                  {ord.payment_status === "paid" || ord.status === "delivered" ? "Paid" : "Pending"}
                                </span>
                              </div>
                            </td>

                            {/* Status Workflow Selector */}
                            <td className="p-4">
                              <select
                                value={ord.status}
                                onChange={(e) =>
                                  handleUpdateOrderStatus(ord.id, e.target.value as OrderItem["status"])
                                }
                                className={`bg-black border px-2.5 py-1 text-[11px] uppercase font-bold focus:outline-none cursor-pointer ${ord.status === "delivered"
                                    ? "border-emerald-500/50 text-emerald-400"
                                    : ord.status === "cancelled"
                                      ? "border-red-500/50 text-red-400"
                                      : ord.status === "shipped"
                                        ? "border-blue-500/50 text-blue-400"
                                        : ord.status === "processing"
                                          ? "border-purple-500/50 text-purple-400"
                                          : ord.status === "confirmed"
                                            ? "border-[#c5a46d] text-[#c5a46d]"
                                            : "border-amber-500/50 text-amber-400"
                                  }`}
                              >
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="confirmed">Confirmed</option>
                              </select>

                              {/* Customer Lifecycle Indicator */}
                              {ord.status === "confirmed" && ord.customer_confirmed_at && (
                                <div className="text-[9px] text-[#c5a46d] font-mono mt-1 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-[#c5a46d] shrink-0" />
                                  <span>Client confirmed</span>
                                </div>
                              )}
                              {ord.status === "cancelled" && (
                                <div
                                  className="text-[9px] text-red-400 font-mono mt-1 max-w-[130px] truncate"
                                  title={ord.cancellation_reason || "Customer cancelled"}
                                >
                                  Reason: {ord.cancellation_reason || "Cancelled"}
                                </div>
                              )}
                              {ord.status === "pending" && (
                                <div className="text-[9px] text-amber-400 font-mono mt-1 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                  <span>Awaiting client</span>
                                </div>
                              )}
                            </td>

                            {/* Tracking Waybill */}
                            <td className="p-4">
                              <span className="text-neutral-300 block text-[11px] font-mono">
                                {ord.tracking_number || "Awaiting Courier"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => setSelectedOrder(ord)}
                                className="px-2.5 py-1 border border-white/15 hover:border-[#c5a46d] text-[10px] text-neutral-300 hover:text-white uppercase tracking-wider mr-2 cursor-pointer transition-colors"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => {
                                  const newTrack = prompt(
                                    "Enter Blue Dart Waybill Number:",
                                    ord.tracking_number || "BLUEDART-"
                                  );
                                  if (newTrack) handleAssignTracking(ord.id, newTrack);
                                }}
                                className="px-2.5 py-1 border border-white/15 hover:border-white text-[10px] text-neutral-300 uppercase tracking-wider cursor-pointer transition-colors"
                              >
                                Assign Waybill
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Order Inspection Modal (Comprehensive breakdown of customer & products) */}
              {selectedOrder && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                  <div className="bg-[#0a0a0a] border border-white/20 p-6 md:p-8 max-w-2xl w-full space-y-6 max-h-[90vh] overflow-y-auto font-mono text-xs">
                    <div className="flex justify-between items-start border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#c5a46d] tracking-widest uppercase font-bold">
                            Complete Order Details
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${selectedOrder.status === "delivered"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                                : selectedOrder.status === "cancelled"
                                  ? "bg-red-950 text-red-400 border border-red-500/30"
                                  : selectedOrder.status === "shipped"
                                    ? "bg-blue-950 text-blue-400 border border-blue-500/30"
                                    : selectedOrder.status === "processing"
                                      ? "bg-purple-950 text-purple-400 border border-purple-500/30"
                                      : "bg-amber-950 text-amber-400 border border-amber-500/30"
                              }`}
                          >
                            {selectedOrder.status}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold uppercase font-display text-white mt-1">
                          {selectedOrder.order_number}
                        </h3>
                        <span className="text-[10px] text-neutral-400">
                          Placed on: {new Date(selectedOrder.created_at).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Customer Information Grid with Lifetime Tracking Metrics */}
                    {(() => {
                      const modalCustStats = calculateCustomerStats(selectedOrder.customer_email, ordersList);
                      return (
                        <div className="space-y-3 bg-black/40 p-4 border border-white/10">
                          <div className="text-[10px] text-[#c5a46d] font-bold uppercase tracking-wider">
                            Customer Information & Lifetime Tracking
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase block">Client Name</span>
                              <span className="text-white font-bold block">{selectedOrder.customer_name}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase block">Email Address</span>
                              <span className="text-neutral-300 block truncate">{selectedOrder.customer_email}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase block">Contact Phone</span>
                              <span className="text-neutral-300 block">{selectedOrder.customer_phone || "Not provided"}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase block">Products Ordered</span>
                              <span className="text-emerald-400 font-bold block text-sm">
                                {modalCustStats.totalOrdered} items
                              </span>
                              <span className="text-[10px] text-neutral-500">
                                Across {modalCustStats.activeOrdersCount} orders
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase block">Products Cancelled</span>
                              <span
                                className={`font-bold block text-sm ${modalCustStats.totalCancelled > 0 ? "text-red-400" : "text-neutral-400"
                                  }`}
                              >
                                {modalCustStats.totalCancelled} items
                              </span>
                              <span className="text-[10px] text-neutral-500">
                                Across {modalCustStats.cancelledOrdersCount} cancellations
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase block">Lifetime Orders</span>
                              <span className="text-white font-bold block text-sm">{modalCustStats.totalOrders}</span>
                              <span className="text-[10px] text-neutral-500">Total placed orders</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Order Status & Payment Meta */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b border-white/10 bg-black/20 p-4">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase block">Payment Method & Status</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`font-bold block text-xs ${isOnlineOrder(selectedOrder) ? "text-cyan-400" : "text-amber-400"}`}>
                            {selectedOrder.payment_method || (isOnlineOrder(selectedOrder) ? "Razorpay Online" : "Cash on Delivery")}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 font-mono uppercase rounded-xs border font-bold ${
                              selectedOrder.payment_status === "paid" || selectedOrder.status === "delivered"
                                ? "bg-emerald-950/70 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-950/70 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {selectedOrder.payment_status === "paid" || selectedOrder.status === "delivered" ? "Paid" : "Pending"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase block">Courier Tracking</span>
                        <span className="text-neutral-300 block font-mono">
                          {selectedOrder.tracking_number || "Awaiting Waybill"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase block">Update Status</span>
                        <select
                          value={selectedOrder.status}
                          onChange={(e) => {
                            const newSt = e.target.value as OrderItem["status"];
                            handleUpdateOrderStatus(selectedOrder.id, newSt);
                            setSelectedOrder((prev) => (prev ? { ...prev, status: newSt } : null));
                          }}
                          className="mt-1 bg-black border border-white/20 px-2 py-0.5 text-[10px] text-[#c5a46d] uppercase font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="confirmed">Confirmed</option>
                        </select>
                      </div>
                    </div>

                    {/* Client Lifecycle Tracking (Confirmation & Cancellation Details) */}
                    <div className="pb-4 border-b border-white/10 space-y-3">
                      <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-bold font-mono">
                        Client Lifecycle & Verification Details
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Confirmation info */}
                        <div className="p-3 bg-neutral-950 border border-white/10 space-y-1">
                          <span className="text-[10px] text-neutral-500 uppercase block font-mono">Customer Confirmation</span>
                          {selectedOrder.status === "confirmed" || selectedOrder.customer_confirmed_at ? (
                            <div className="space-y-0.5">
                              <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs font-mono">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Confirmed by Client
                              </span>
                              {selectedOrder.customer_confirmed_at && (
                                <span className="text-[10px] text-neutral-400 block font-mono">
                                  Confirmed: {new Date(selectedOrder.customer_confirmed_at).toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          ) : selectedOrder.status === "cancelled" ? (
                            <span className="text-neutral-500 text-xs font-mono">N/A (Order Cancelled)</span>
                          ) : (
                            <span className="text-amber-400 font-medium text-xs flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5" /> Awaiting Customer Confirmation
                            </span>
                          )}
                        </div>

                        {/* Cancellation info */}
                        <div className="p-3 bg-neutral-950 border border-white/10 space-y-1">
                          <span className="text-[10px] text-neutral-500 uppercase block font-mono">Cancellation Details</span>
                          {selectedOrder.status === "cancelled" || selectedOrder.cancelled_at ? (
                            <div className="space-y-1">
                              <span className="text-red-400 font-bold flex items-center gap-1 text-xs font-mono">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Cancelled Order
                              </span>
                              {selectedOrder.cancelled_at && (
                                <span className="text-[10px] text-neutral-400 block font-mono">
                                  Cancelled: {new Date(selectedOrder.cancelled_at).toLocaleString("en-IN")}
                                </span>
                              )}
                              {selectedOrder.cancellation_reason && (
                                <div className="text-[11px] text-red-300 bg-red-950/30 border border-red-500/30 p-2 font-mono">
                                  <strong className="text-red-200">Reason:</strong> {selectedOrder.cancellation_reason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-neutral-500 text-xs font-mono">Active Order (Not Cancelled)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Shipping Destination */}
                    {selectedOrder.shipping_address && (
                      <div className="pb-4 border-b border-white/10">
                        <span className="text-[10px] text-neutral-500 uppercase block mb-1">
                          Delivery Destination (Pan-India)
                        </span>
                        <p className="text-neutral-200 leading-relaxed bg-black/40 p-3 border border-white/5">
                          {selectedOrder.shipping_address.address}, {selectedOrder.shipping_address.city},{" "}
                          {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.postalCode}
                        </p>
                      </div>
                    )}

                    {/* Complete Itemized Product List */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold">
                          Ordered Products ({selectedOrder.items?.length || 1} distinct items)
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          Total Units:{" "}
                          {selectedOrder.items
                            ? selectedOrder.items.reduce((s, it) => s + (it.quantity || 1), 0)
                            : 1}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedOrder.items && selectedOrder.items.length > 0 ? (
                          selectedOrder.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center p-3 bg-black border border-white/10"
                            >
                              <div>
                                <span className="text-white font-bold block">{item.product_name}</span>
                                <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                                  <span>Size: <strong className="text-neutral-200">{item.size || "M"}</strong></span>
                                  {item.color_name && (
                                    <>
                                      <span>•</span>
                                      <span>Color: <strong className="text-neutral-200">{item.color_name}</strong></span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>Qty: <strong className="text-[#c5a46d]">{item.quantity}</strong></span>
                                  <span>•</span>
                                  <span>Unit: {formatPrice(item.unit_price)}</span>
                                </div>
                              </div>
                              <span className="text-[#c5a46d] font-bold text-sm">
                                {formatPrice(item.unit_price * item.quantity)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 bg-black border border-white/10 text-neutral-400">
                            No product details recorded for this legacy order.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Total */}
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <div>
                        <span className="text-neutral-400 uppercase block text-[10px]">Total Order Amount</span>
                        <span className="text-[10px] text-neutral-500">Payable via Cash on Delivery</span>
                      </div>
                      <span className="text-xl font-bold text-[#c5a46d] font-mono">
                        {formatPrice(selectedOrder.total_amount)}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => exportOrdersToCSV([selectedOrder], "single_order")}
                        className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-[#c5a46d] border border-[#c5a46d]/40 font-bold uppercase tracking-widest text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Order CSV</span>
                      </button>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-widest text-[11px] transition-colors cursor-pointer"
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================== */}
          {/* 8. CUSTOMERS (Ordered & Cancelled Tracking) */}
          {/* ===================================================== */}
          {activeSection === "customers" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight font-display text-white">
                    Client Directory & Tracking ({usersList.length})
                  </h2>
                  <p className="text-xs font-mono text-neutral-400">
                    Track client ordering history: products ordered, products cancelled, contact info, and activity status.
                  </p>
                </div>
                <div className="relative max-w-xs w-full font-mono text-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search client by name, email, city..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/15 pl-9 pr-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#c5a46d]"
                  />
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-white/10 overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] text-neutral-400 uppercase tracking-widest bg-black/60">
                      <th className="p-4">Client Name & Email</th>
                      <th className="p-4">Contact / City</th>
                      <th className="p-4">Products Ordered</th>
                      <th className="p-4">Products Cancelled</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      const filteredUsers = usersList.filter((usr) => {
                        if (!customerSearchQuery) return true;
                        const q = customerSearchQuery.toLowerCase();
                        return (
                          (usr.full_name && usr.full_name.toLowerCase().includes(q)) ||
                          (usr.email && usr.email.toLowerCase().includes(q)) ||
                          (usr.city && usr.city.toLowerCase().includes(q)) ||
                          (usr.phone && usr.phone.toLowerCase().includes(q))
                        );
                      });

                      if (filteredUsers.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="p-12 text-center text-neutral-500">
                              <Users className="w-10 h-10 mx-auto text-neutral-700 mb-3" />
                              <p className="text-sm uppercase font-bold text-neutral-400">No Clients Found</p>
                              <p className="text-xs text-neutral-600 mt-1">
                                {customerSearchQuery
                                  ? "No registered clients match your search query."
                                  : "Zero registered clients currently in the database."}
                              </p>
                            </td>
                          </tr>
                        );
                      }

                      return filteredUsers.map((usr) => {
                        // Calculate orders and items for this customer
                        const customerOrders = ordersList.filter(
                          (o) =>
                            (o.user_id && o.user_id === usr.id) ||
                            (o.customer_email &&
                              usr.email &&
                              o.customer_email.toLowerCase() === usr.email.toLowerCase())
                        );

                        const activeOrders = customerOrders.filter((o) => o.status !== "cancelled");
                        const cancelledOrders = customerOrders.filter((o) => o.status === "cancelled");

                        const itemsOrdered = activeOrders.reduce(
                          (sum, o) =>
                            sum +
                            (o.items && o.items.length > 0
                              ? o.items.reduce((iSum, it) => iSum + (it.quantity || 1), 0)
                              : 1),
                          0
                        );

                        const itemsCancelled = cancelledOrders.reduce(
                          (sum, o) =>
                            sum +
                            (o.items && o.items.length > 0
                              ? o.items.reduce((iSum, it) => iSum + (it.quantity || 1), 0)
                              : 1),
                          0
                        );

                        return (
                          <tr key={usr.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4">
                              <span className="font-bold text-white block">{usr.full_name || "Guest Client"}</span>
                              <span className="text-[11px] text-neutral-400 block">{usr.email}</span>
                            </td>
                            <td className="p-4 text-neutral-400">
                              <span className="text-neutral-300 block">{usr.phone || "No phone"}</span>
                              <span className="text-[10px] text-neutral-500 block">{usr.city || "India"}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-emerald-400 font-bold text-sm">{itemsOrdered}</span>
                                <span className="text-[10px] text-neutral-400">
                                  {itemsOrdered === 1 ? "product" : "products"}
                                </span>
                              </div>
                              <span className="text-[10px] text-neutral-500 block">
                                Across {activeOrders.length} {activeOrders.length === 1 ? "order" : "orders"}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-bold text-sm ${itemsCancelled > 0 ? "text-red-400" : "text-neutral-500"
                                    }`}
                                >
                                  {itemsCancelled}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  {itemsCancelled === 1 ? "product" : "products"}
                                </span>
                              </div>
                              <span className="text-[10px] text-neutral-500 block">
                                Across {cancelledOrders.length}{" "}
                                {cancelledOrders.length === 1 ? "cancellation" : "cancellations"}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${usr.role === "admin"
                                    ? "bg-[#c5a46d] text-black"
                                    : "bg-neutral-800 text-neutral-300"
                                  }`}
                              >
                                {usr.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 text-[9px] font-bold uppercase ${usr.is_blocked
                                    ? "bg-red-950/60 text-red-400 border border-red-500/30"
                                    : "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                                  }`}
                              >
                                {usr.is_blocked ? "BLOCKED" : "ACTIVE"}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setOrderSearchQuery(usr.email);
                                  setOrderStatusFilter("all");
                                  setActiveSection("orders");
                                }}
                                className="px-2.5 py-1 text-[10px] uppercase font-bold border border-white/20 hover:border-[#c5a46d] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                title="View all orders placed by this customer"
                              >
                                View Orders
                              </button>
                              {usr.role !== "admin" && (
                                <button
                                  onClick={() => handleToggleBlockCustomer(usr.id, usr.is_blocked)}
                                  className={`px-2.5 py-1 text-[10px] uppercase font-bold border cursor-pointer transition-colors ${usr.is_blocked
                                      ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-950"
                                      : "border-red-500/40 text-red-400 hover:bg-red-950"
                                    }`}
                                >
                                  {usr.is_blocked ? "Unblock" : "Block"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* 9. INVENTORY ADJUSTER */}
          {/* ===================================================== */}
          {activeSection === "inventory" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight font-display">
                  Live Stock Manager ({productsList.length} product)
                </h2>
                <p className="text-xs font-mono text-neutral-400">
                  Instant real-time stock adjustments. Out-of-stock items will automatically show sold-out indicators.
                </p>
              </div>

              <div className="bg-[#0a0a0a] border border-white/10 overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] text-neutral-400 uppercase tracking-widest bg-black/60">
                      <th className="p-4">Product</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Current Stock</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Quick Stock Adjustment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {productsList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-neutral-500">
                          Catalogue is empty. Register products first to manage stock.
                        </td>
                      </tr>
                    ) : (
                      productsList.map((prod) => (
                        <tr key={prod.id} className="hover:bg-white/[0.02]">
                          <td className="p-4 font-bold text-white">{prod.name}</td>
                          <td className="p-4 text-neutral-400 uppercase">{prod.category?.name || "Outerwear"}</td>
                          <td className="p-4 font-bold text-lg text-white">
                            {prod.stock_quantity ?? 0}
                          </td>
                          <td className="p-4">
                            {(prod.stock_quantity ?? 0) <= 0 ? (
                              <span className="text-[10px] text-red-400 bg-red-950/60 px-2 py-0.5 border border-red-500/30">
                                OUT OF STOCK
                              </span>
                            ) : (prod.stock_quantity ?? 0) <= 5 ? (
                              <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 border border-amber-500/30">
                                LOW STOCK
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 border border-emerald-500/30">
                                HEALTHY
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleUpdateStock(prod.id, prod.stock_quantity ?? 0, -1)}
                              className="px-2.5 py-1 border border-white/15 hover:border-white text-xs font-bold text-white"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleUpdateStock(prod.id, prod.stock_quantity ?? 0, 5)}
                              className="px-2.5 py-1 border border-[#c5a46d]/40 text-[#c5a46d] hover:bg-[#c5a46d]/10 text-xs font-bold"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => handleUpdateStock(prod.id, prod.stock_quantity ?? 0, 20)}
                              className="px-2.5 py-1 bg-[#c5a46d] text-black text-xs font-bold"
                            >
                              +20
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* 10. COUPONS */}
          {/* ===================================================== */}
          {activeSection === "coupons" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight font-display text-white">
                    Coupon & Discount Management ({couponsList.length})
                  </h2>
                  <p className="text-xs font-mono text-neutral-400">
                    Create, edit, or delete promo codes. Attach coupons to specific products or offer storewide discounts.
                  </p>
                </div>
                <button
                  onClick={handleOpenCreateCoupon}
                  className="px-4 py-2.5 bg-[#c5a46d] hover:bg-[#d4b57e] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Coupon</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {couponsList.length === 0 ? (
                  <div className="col-span-full p-12 text-center text-neutral-500 bg-[#0a0a0a] border border-white/10 font-mono">
                    <Tag className="w-10 h-10 mx-auto text-neutral-700 mb-3" />
                    <p className="text-sm uppercase font-bold text-neutral-400">No Coupons Registered</p>
                    <p className="text-xs text-neutral-600 mt-1">
                      Click &ldquo;Create New Coupon&rdquo; to launch promotional codes for customers.
                    </p>
                  </div>
                ) : (
                  couponsList.map((c) => {
                    const attachedProduct = c.product_id
                      ? productsList.find((p) => p.id === c.product_id)
                      : null;
                    return (
                      <div
                        key={c.id}
                        className="p-5 bg-[#0a0a0a] border border-white/10 space-y-4 font-mono flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-black text-[#c5a46d] tracking-widest bg-black px-2.5 py-1 border border-[#c5a46d]/30">
                              {c.code}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded ${c.is_active
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                                  : "bg-neutral-800 text-neutral-400 border border-white/10"
                                }`}
                            >
                              {c.is_active ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>

                          <div className="text-2xl font-black text-white">
                            {c.discount_type === "percentage"
                              ? `${c.discount_value}% OFF`
                              : `₹${c.discount_value} OFF`}
                          </div>

                          <div className="space-y-1 text-[11px] text-neutral-400 pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500 uppercase text-[10px]">Scope</span>
                              <span className="text-neutral-200 font-bold truncate max-w-[180px]">
                                {c.product_id ? (
                                  <span className="text-[#c5a46d]">
                                    Product: {attachedProduct?.name || c.product_name || "Specific item"}
                                  </span>
                                ) : (
                                  <span className="text-neutral-300">Storewide (All Items)</span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500 uppercase text-[10px]">Min. Order</span>
                              <span className="text-neutral-300">
                                {c.min_order_amount > 0 ? formatPrice(c.min_order_amount) : "No minimum"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                          <button
                            onClick={() => handleOpenEditCoupon(c)}
                            className="px-3 py-1.5 border border-white/20 hover:border-[#c5a46d] text-[10px] text-neutral-300 hover:text-white uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-[#c5a46d]" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(c.id, c.code)}
                            className="px-3 py-1.5 border border-red-500/30 hover:border-red-500 text-[10px] text-red-400 hover:text-red-300 uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* 11. WEBSITE CONTENT */}
          {/* ===================================================== */}
          {activeSection === "content" && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight font-display">
                  Website Content Management
                </h2>
                <p className="text-xs font-mono text-neutral-400">
                  Update promotional announcement banners and runway headlines.
                </p>
              </div>

              <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-5 font-mono text-xs">
                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase mb-1">
                    Top Announcement Bar (Pan-India Header)
                  </label>
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="w-full bg-black border border-white/15 px-3 py-2.5 text-white focus:outline-none focus:border-[#c5a46d]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase mb-1">
                    Hero Section Headline
                  </label>
                  <input
                    type="text"
                    value={heroHeading}
                    onChange={(e) => setHeroHeading(e.target.value)}
                    className="w-full bg-black border border-white/15 px-3 py-2.5 text-white focus:outline-none focus:border-[#c5a46d]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase mb-1">
                    Hero Section Subheading
                  </label>
                  <textarea
                    rows={2}
                    value={heroSubheading}
                    onChange={(e) => setHeroSubheading(e.target.value)}
                    className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => showNotification("success", "Website content configuration saved.")}
                  className="px-6 py-3 bg-[#c5a46d] text-black font-extrabold text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-[#c5a46d]/15"
                >
                  Save Content Changes
                </button>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* 12. STORE SETTINGS */}
          {/* ===================================================== */}
          {activeSection === "settings" && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight font-display">
                  Store Logistics & Payment Settings
                </h2>
                <p className="text-xs font-mono text-neutral-400">
                  Pure Indian operations configuration (Cash on Delivery exclusively, Blue Dart shipping).
                </p>
              </div>

              <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-5 font-mono text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase mb-1">Store Legal Name</label>
                    <input
                      type="text"
                      value={storeSettings.storeName}
                      onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                      className="w-full bg-black border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase mb-1">Client Care Email</label>
                    <input
                      type="email"
                      value={storeSettings.supportEmail}
                      onChange={(e) => setStoreSettings({ ...storeSettings, supportEmail: e.target.value })}
                      className="w-full bg-black border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase mb-1">Courier Logistics Partner</label>
                    <input
                      type="text"
                      value={storeSettings.courierPartner}
                      disabled
                      className="w-full bg-neutral-900 border border-white/10 px-3 py-2 text-neutral-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase mb-1">GST Applicable (%)</label>
                    <input
                      type="number"
                      value={storeSettings.gstPercentage}
                      onChange={(e) => setStoreSettings({ ...storeSettings, gstPercentage: Number(e.target.value) })}
                      className="w-full bg-black border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="p-4 bg-black border border-[#c5a46d]/40 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white uppercase block">
                        Cash on Delivery (COD) Only Mode
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Online gateways (Stripe, Razorpay, card processing) are completely stripped.
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#c5a46d] bg-[#c5a46d]/15 px-3 py-1 border border-[#c5a46d]/40">
                      ENFORCED PAN-INDIA
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => showNotification("success", "Store logistics configuration saved.")}
                  className="px-6 py-3 bg-[#c5a46d] text-black font-extrabold text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-[#c5a46d]/15"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* 13. CREATE ADMINISTRATOR & ACCESS CONTROL */}
          {/* ===================================================== */}
          {activeSection === "create-admin" && (
            <div className="space-y-8 max-w-5xl">
              <div>
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#c5a46d] block mb-1">
                  SECURITY GATEWAY // ACCESS PROVISIONING
                </span>
                <h2 className="text-3xl font-black uppercase tracking-tight font-display text-white">
                  Create Administrator
                </h2>
                <p className="text-xs font-mono text-neutral-400 mt-1">
                  Enter the email address and password of the new administrator. Credentials and roles synchronize automatically with your Supabase database.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Column (7 cols) */}
                <div className="lg:col-span-7 bg-[#0a0a0a] border border-white/10 p-6 sm:p-8 space-y-6 font-mono text-xs shadow-2xl">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
                    <div className="p-2 bg-[#c5a46d]/10 border border-[#c5a46d]/30 text-[#c5a46d] rounded">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                        New Administrator Credentials
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Create credentials and grant master access to the studio.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateAdminSubmit} className="space-y-5">
                    {/* Admin Email */}
                    <div>
                      <label className="block text-[10px] text-neutral-400 uppercase tracking-wider mb-1.5 font-bold">
                        Administrator Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. successor@noir-atelier.com"
                        value={createAdminEmail}
                        onChange={(e) => setCreateAdminEmail(e.target.value)}
                        className="w-full bg-black border border-white/15 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-[#c5a46d] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-[10px] text-neutral-400 uppercase tracking-wider mb-1.5 font-bold">
                        Full Name / Alias (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Julian Vance"
                        value={createAdminFullName}
                        onChange={(e) => setCreateAdminFullName(e.target.value)}
                        className="w-full bg-black border border-white/15 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-[#c5a46d] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Password Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase tracking-wider mb-1.5 font-bold">
                          Password (min 6 chars) *
                        </label>
                        <div className="relative">
                          <input
                            type={showCreateAdminPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={createAdminPassword}
                            onChange={(e) => setCreateAdminPassword(e.target.value)}
                            className="w-full bg-black border border-white/15 px-3.5 py-2.5 pr-10 text-white placeholder-neutral-600 focus:border-[#c5a46d] focus:outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreateAdminPassword(!showCreateAdminPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                          >
                            {showCreateAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase tracking-wider mb-1.5 font-bold">
                          Confirm Password *
                        </label>
                        <input
                          type={showCreateAdminPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={createAdminConfirmPassword}
                          onChange={(e) => setCreateAdminConfirmPassword(e.target.value)}
                          className="w-full bg-black border border-white/15 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-[#c5a46d] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Database Access Notice Box */}
                    <div className="p-4 bg-black border border-[#c5a46d]/30 space-y-2">
                      <div className="flex items-center gap-2 text-[#c5a46d] font-bold text-[11px] uppercase tracking-wider">
                        <Check className="w-4 h-4" />
                        <span>Database Synchronization Active</span>
                      </div>
                      <ul className="text-[10px] text-neutral-400 space-y-1 list-disc list-inside">
                        <li>Directly updates Supabase Auth and sets profile role to <span className="text-[#c5a46d] font-bold">&apos;admin&apos;</span>.</li>
                        <li>The new administrator can immediately log in at <span className="text-white underline">/admin/login</span>.</li>
                        <li>Grants full master privileges: Inventory, Orders, Stock, and Revenue reports.</li>
                      </ul>
                    </div>

                    {/* Action Button */}
                    <button
                      type="submit"
                      disabled={isSubmittingAdmin}
                      className="w-full py-3.5 bg-[#c5a46d] hover:bg-[#d6b77e] text-black font-extrabold text-xs uppercase tracking-[0.2em] font-mono transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c5a46d]/20 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isSubmittingAdmin ? "Synchronizing with Database..." : "Create & Grant Administrator Access"}</span>
                    </button>
                  </form>
                </div>

                {/* Right Column: Active Administrators List (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-4 font-mono text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-[11px]">
                        <Users className="w-4 h-4 text-[#c5a46d]" />
                        <span>Active Administrators ({usersList.filter((u) => u.role === "admin").length})</span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 uppercase font-bold">
                        Database Live
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {usersList
                        .filter((u) => u.role === "admin")
                        .map((adminUser) => {
                          const isSelf =
                            currentAdminEmail &&
                            adminUser.email &&
                            currentAdminEmail.toLowerCase() === adminUser.email.toLowerCase();

                          return (
                            <div
                              key={adminUser.id}
                              className="p-3 bg-black border border-white/10 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-xs">
                                      {adminUser.full_name || "Administrator"}
                                    </span>
                                    {isSelf && (
                                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-neutral-400 font-mono block mt-0.5">
                                    {adminUser.email}
                                  </span>
                                </div>
                                <span className="text-[9px] font-bold text-[#c5a46d] bg-[#c5a46d]/15 border border-[#c5a46d]/30 px-2 py-0.5 uppercase shrink-0">
                                  MASTER
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-2 border-t border-white/5">
                                <span>Role: profiles.role = &apos;admin&apos;</span>
                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleDemoteAdmin(adminUser.id)}
                                    className="text-neutral-400 hover:text-amber-400 underline cursor-pointer"
                                    title="Demote this administrator to customer"
                                  >
                                    Revoke Access
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </motion.div>

      {/* ========================================================= */}
      {/* MODAL: ADD CATEGORY */}
      {/* ========================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/15 p-6 space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-sm font-bold uppercase text-white">Add New Category</span>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outerwear"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="outerwear"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Department details..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-white/15 text-neutral-400"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[#c5a46d] text-black font-bold">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD PRODUCT TYPE */}
      {/* ========================================================= */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/15 p-6 space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-sm font-bold uppercase text-white">Add Product Type</span>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProductType} className="space-y-3">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tactical Cargo Trousers"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Classification details..."
                  value={typeDesc}
                  onChange={(e) => setTypeDesc(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 border border-white/15 text-neutral-400"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[#c5a46d] text-black font-bold">
                  Save Product Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT COUPON */}
      {/* ========================================================= */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/15 p-6 space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-sm font-bold uppercase text-white">
                {couponModalMode === "edit" ? "Edit Coupon" : "Create New Coupon"}
              </span>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCoupon} className="space-y-3">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NOIRVIP15"
                  value={coupCode}
                  onChange={(e) => setCoupCode(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white font-bold tracking-widest placeholder-neutral-500 focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase mb-1">Discount Type *</label>
                  <select
                    value={coupType}
                    onChange={(e) => setCoupType(e.target.value as "percentage" | "fixed")}
                    className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d] cursor-pointer"
                  >
                    <option value="percentage">Percentage (% Off)</option>
                    <option value="fixed">Flat Amount (₹ Off)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase mb-1">
                    Discount Value ({coupType === "percentage" ? "%" : "₹"}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={coupType === "percentage" ? 100 : undefined}
                    required
                    value={coupValue}
                    onChange={(e) => setCoupValue(Number(e.target.value))}
                    className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">
                  Minimum Order Amount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0 for no minimum"
                  value={coupMinOrder}
                  onChange={(e) => setCoupMinOrder(Number(e.target.value))}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase mb-1">
                  Attach to Specific Product (Optional)
                </label>
                <select
                  value={coupProductId}
                  onChange={(e) => setCoupProductId(e.target.value)}
                  className="w-full bg-black border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#c5a46d] cursor-pointer"
                >
                  <option value="">Storewide (Applies to All Products)</option>
                  {productsList.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (₹{prod.price})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-500 mt-1">
                  If selected, this coupon discount will only apply to this specific product in the cart.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="coupon_active_checkbox"
                  checked={coupIsActive}
                  onChange={(e) => setCoupIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#c5a46d] cursor-pointer"
                />
                <label htmlFor="coupon_active_checkbox" className="text-white text-xs cursor-pointer">
                  Coupon is Active and usable at checkout
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 border border-white/15 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a46d] hover:bg-[#d4b57e] text-black font-bold uppercase transition-colors cursor-pointer"
                >
                  {couponModalMode === "edit" ? "Update Coupon" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
