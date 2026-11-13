"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { Product, ProductColor, CartItem } from "@/types/fashion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { mapDbProductToFashion, DbProduct } from "@/lib/products-service";

type ToastNotification = {
  id: string;
  message: string;
  type: "cart" | "wishlist" | "coupon" | "info";
};

type CartContextType = {
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartTotal: number;
  discountAmount: number;
  couponCode: string;
  applyCoupon: (code: string) => Promise<boolean> | boolean;
  addToCart: (product: Product, color?: ProductColor, size?: string, quantity?: number) => void;
  buyNow: (product: Product, color?: ProductColor, size?: string, quantity?: number) => void;
  removeFromCart: (productId: string, colorHex: string, size: string) => void;
  updateQuantity: (productId: string, colorHex: string, size: string, delta: number) => void;
  clearCart: () => void;

  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  wishlist: string[];
  toggleWishlist: (productId: string, productObj?: Product) => void;
  isInWishlist: (productId: string) => boolean;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;

  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;

  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;

  isAudioPlaying: boolean;
  toggleAudio: () => void;

  toasts: ToastNotification[];
  removeToast: (id: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [couponCode, setCouponCode] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    product_id?: string | null;
    product_name?: string | null;
    min_order_amount?: number;
  } | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const knownProductsRef = useRef<Map<string, Product>>(new Map());

  // 1. Initial Guest Hydration from localStorage
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedCart = localStorage.getItem("noir_cart");
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
        const savedWishlist = localStorage.getItem("noir_wishlist");
        if (savedWishlist) {
          setWishlist(JSON.parse(savedWishlist));
        }
      } catch {
        // safe fallback
      } finally {
        setIsHydrated(true);
      }
    });
  }, []);

  // 2. Persist Guest Cart & Wishlist to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("noir_cart", JSON.stringify(cart));
    } catch {}
  }, [cart, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("noir_wishlist", JSON.stringify(wishlist));
    } catch {}
  }, [wishlist, isHydrated]);

  // Helper to resolve Product DB UUID
  const resolveProductUuid = useCallback(async (productOrId: Product | string): Promise<string | null> => {
    if (typeof productOrId === "object") {
      if (productOrId.dbId) return productOrId.dbId;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productOrId.id)) {
        return productOrId.id;
      }
    }
    const idOrSlug = typeof productOrId === "object" ? productOrId.id : productOrId;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)) {
      return idOrSlug;
    }
    try {
      const { data } = await supabase
        .from("products")
        .select("id")
        .or(`slug.eq.${idOrSlug},id.eq.${idOrSlug}`)
        .maybeSingle();
      return data?.id || null;
    } catch {
      return null;
    }
  }, []);

  // 3. Synchronize Cart & Wishlist with Supabase upon User Login
  useEffect(() => {
    if (!user || !isHydrated) return;

    let isMounted = true;

    async function syncUserData() {
      if (!user) return;
      try {
        // --- SYNC CART ---
        // Fetch remote cart items
        const { data: remoteCartData } = await supabase
          .from("cart_items")
          .select(`
            id,
            quantity,
            color_name,
            size,
            product:products (
              *,
              category:categories(slug, name),
              images:product_images(id, url, is_primary, display_order),
              variants:product_variants(id, color_name, color_hex, size, stock_quantity, sku)
            )
          `)
          .eq("user_id", user.id);

        const remoteCartItems: CartItem[] = (remoteCartData || [])
          .filter((row) => row.product)
          .map((row) => {
            const product = mapDbProductToFashion(row.product as unknown as DbProduct);
            const variantColor = product.colors.find(
              (c) => c.name.toLowerCase() === (row.color_name || "").toLowerCase()
            ) || product.colors[0] || { name: row.color_name || "Standard", hex: "#0a0a0a", bgClass: "" };
            return {
              product,
              selectedColor: variantColor,
              selectedSize: row.size || product.sizes[0] || "M",
              quantity: row.quantity || 1,
            };
          });

        // Merge local guest cart into remote Supabase cart
        const localCart = [...cart];
        for (const localItem of localCart) {
          const prodUuid = await resolveProductUuid(localItem.product);
          if (prodUuid) {
            const existingRemote = remoteCartItems.find(
              (rc) =>
                (rc.product.dbId === prodUuid || rc.product.id === localItem.product.id) &&
                rc.selectedSize === localItem.selectedSize &&
                rc.selectedColor.hex === localItem.selectedColor.hex
            );

            if (!existingRemote) {
              await supabase.from("cart_items").insert({
                user_id: user.id,
                product_id: prodUuid,
                color_name: localItem.selectedColor.name,
                size: localItem.selectedSize,
                quantity: localItem.quantity,
              });
              remoteCartItems.push(localItem);
            }
          }
        }

        if (isMounted) {
          setCart(remoteCartItems);
        }

        // --- SYNC WISHLIST ---
        const { data: remoteWishlistData } = await supabase
          .from("wishlist_items")
          .select("product_id, product:products(slug)")
          .eq("user_id", user.id);

        const remoteIds = (remoteWishlistData || []).map((row) => {
          const prodRecord = row.product as unknown as { slug?: string } | null;
          return prodRecord?.slug || row.product_id;
        });

        // Merge local wishlist to remote
        const mergedWishlist = Array.from(new Set([...wishlist, ...remoteIds]));
        for (const localWishlistId of wishlist) {
          if (!remoteIds.includes(localWishlistId)) {
            const prodUuid = await resolveProductUuid(localWishlistId);
            if (prodUuid) {
              await supabase.from("wishlist_items").insert({
                user_id: user.id,
                product_id: prodUuid,
              });
            }
          }
        }

        if (isMounted) {
          setWishlist(mergedWishlist);
        }
      } catch (err) {
        console.warn("Could not sync user cart/wishlist with Supabase:", err);
      }
    }

    syncUserData();

    return () => {
      isMounted = false;
    };
  }, [user, isHydrated, resolveProductUuid]);

  const addToast = (message: string, type: ToastNotification["type"] = "cart") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToCart = (
    product: Product,
    color?: ProductColor,
    size?: string,
    quantity: number = 1
  ) => {
    if (product?.id) {
      knownProductsRef.current.set(product.id, product);
    }
    const chosenColor = color || product.colors[0] || { name: "Obsidian Black", hex: "#0a0a0a", bgClass: "" };
    const chosenSize = size || product.sizes[0] || "M";

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor.hex === chosenColor.hex &&
          item.selectedSize === chosenSize
      );

      let newCart: CartItem[];
      if (existingIndex > -1) {
        newCart = [...prevCart];
        newCart[existingIndex].quantity += quantity;
      } else {
        newCart = [
          ...prevCart,
          {
            product,
            selectedColor: chosenColor,
            selectedSize: chosenSize,
            quantity,
          },
        ];
      }
      return newCart;
    });

    // Remote sync for authenticated customers
    if (user) {
      resolveProductUuid(product).then((prodUuid) => {
        if (!prodUuid) return;
        supabase
          .from("cart_items")
          .upsert(
            {
              user_id: user.id,
              product_id: prodUuid,
              color_name: chosenColor.name,
              size: chosenSize,
              quantity,
            },
            { onConflict: "user_id,product_id,color_name,size" }
          )
          .then(null, () => {});
      });
    }

    addToast(`Added ${product.name} (${chosenSize}) to your Bag`, "cart");
    setIsCartOpen(true);
  };

  const buyNow = (
    product: Product,
    color?: ProductColor,
    size?: string,
    quantity: number = 1
  ) => {
    if (product?.id) {
      knownProductsRef.current.set(product.id, product);
    }
    const chosenColor = color || product.colors[0] || { name: "Classic White", hex: "#FFFFFF", bgClass: "bg-white" };
    const chosenSize = size || product.sizes[0] || "M";

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor.hex === chosenColor.hex &&
          item.selectedSize === chosenSize
      );

      let newCart: CartItem[];
      if (existingIndex > -1) {
        newCart = [...prevCart];
        newCart[existingIndex].quantity += quantity;
      } else {
        newCart = [
          ...prevCart,
          {
            product,
            selectedColor: chosenColor,
            selectedSize: chosenSize,
            quantity,
          },
        ];
      }
      return newCart;
    });

    if (user) {
      resolveProductUuid(product).then((prodUuid) => {
        if (!prodUuid) return;
        supabase
          .from("cart_items")
          .upsert(
            {
              user_id: user.id,
              product_id: prodUuid,
              color_name: chosenColor.name,
              size: chosenSize,
              quantity,
            },
            { onConflict: "user_id,product_id,color_name,size" }
          )
          .then(null, () => {});
      });
    }

    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const removeFromCart = (productId: string, colorHex: string, size: string) => {
    const targetItem = cart.find(
      (item) =>
        item.product.id === productId &&
        item.selectedColor.hex === colorHex &&
        item.selectedSize === size
    );

    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.selectedColor.hex === colorHex &&
            item.selectedSize === size
          )
      )
    );

    if (user && targetItem) {
      resolveProductUuid(targetItem.product).then((prodUuid) => {
        if (!prodUuid) return;
        supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", prodUuid)
          .eq("size", size)
          .then(null, () => {});
      });
    }
  };

  const updateQuantity = (
    productId: string,
    colorHex: string,
    size: string,
    delta: number
  ) => {
    let targetUpdatedQty = 0;
    let targetProduct: Product | null = null;

    setCart((prev) =>
      prev
        .map((item) => {
          if (
            item.product.id === productId &&
            item.selectedColor.hex === colorHex &&
            item.selectedSize === size
          ) {
            const newQty = item.quantity + delta;
            targetUpdatedQty = newQty;
            targetProduct = item.product;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );

    if (user && targetProduct) {
      resolveProductUuid(targetProduct).then((prodUuid) => {
        if (!prodUuid) return;
        if (targetUpdatedQty > 0) {
          supabase
            .from("cart_items")
            .update({ quantity: targetUpdatedQty })
            .eq("user_id", user.id)
            .eq("product_id", prodUuid)
            .eq("size", size)
            .then(null, () => {});
        } else {
          supabase
            .from("cart_items")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", prodUuid)
            .eq("size", size)
            .then(null, () => {});
        }
      });
    }
  };

  const clearCart = () => {
    setCart([]);
    if (user) {
      supabase.from("cart_items").delete().eq("user_id", user.id).then(null, () => {});
    }
  };

  const toggleWishlist = (productId: string, productObj?: Product) => {
    if (productObj) {
      knownProductsRef.current.set(productId, productObj);
    }
    const exists = wishlist.includes(productId);
    const product = productObj || knownProductsRef.current.get(productId);

    if (exists) {
      setWishlist((prev) => prev.filter((id) => id !== productId));
      addToast(`Removed ${product?.name || "piece"} from Wishlist`, "wishlist");

      if (user) {
        resolveProductUuid(productId).then((prodUuid) => {
          if (!prodUuid) return;
          supabase
            .from("wishlist_items")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", prodUuid)
            .then(null, () => {});
        });
      }
    } else {
      setWishlist((prev) => [...prev, productId]);
      addToast(`Saved ${product?.name || "piece"} to Wishlist`, "wishlist");

      if (user) {
        resolveProductUuid(productId).then((prodUuid) => {
          if (!prodUuid) return;
          supabase
            .from("wishlist_items")
            .insert({
              user_id: user.id,
              product_id: prodUuid,
            })
            .then(null, () => {});
        });
      }
    }
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const applyCoupon = async (code: string): Promise<boolean> => {
    const formatted = code.trim().toUpperCase();
    if (!formatted) return false;

    // 1. Validate using Supabase validate_coupon RPC
    try {
      const { data, error } = await supabase.rpc("validate_coupon", {
        p_code: formatted,
        p_subtotal: cartSubtotal,
      });

      if (!error && data) {
        if (data.valid) {
          setCouponCode(data.code);
          setAppliedCoupon({
            code: data.code,
            discount_type: data.discount_type || "percentage",
            discount_value: Number(data.discount_value) || 0,
            min_order_amount: 0,
          });
          if (data.discount_type === "percentage") {
            setDiscountPercent(Number(data.discount_value) || 0);
          }
          addToast(data.message || `Coupon ${data.code} applied`, "coupon");
          return true;
        } else {
          addToast(data.message || "Invalid coupon code", "info");
          return false;
        }
      }
    } catch (rpcErr) {
      console.warn("validate_coupon RPC note:", rpcErr);
    }

    // 2. Fallback: Query coupons table directly from Supabase
    try {
      const { data: couponRow, error: tableErr } = await supabase
        .from("coupons")
        .select("*")
        .ilike("code", formatted)
        .eq("is_active", true)
        .maybeSingle();

      if (!tableErr && couponRow) {
        if (couponRow.expires_at && new Date(couponRow.expires_at) < new Date()) {
          addToast("This coupon has expired.", "info");
          return false;
        }
        if (couponRow.usage_limit && couponRow.times_used >= couponRow.usage_limit) {
          addToast("This coupon has reached its maximum usage limit.", "info");
          return false;
        }
        if (couponRow.min_order_amount && cartSubtotal < couponRow.min_order_amount) {
          addToast(`Minimum order of ₹${couponRow.min_order_amount.toLocaleString("en-IN")} required`, "info");
          return false;
        }

        setCouponCode(couponRow.code.toUpperCase());
        setAppliedCoupon({
          code: couponRow.code.toUpperCase(),
          discount_type: couponRow.discount_type || "percentage",
          discount_value: Number(couponRow.discount_value) || 10,
          min_order_amount: Number(couponRow.min_order_amount) || 0,
        });
        if (couponRow.discount_type === "percentage") {
          setDiscountPercent(Number(couponRow.discount_value) || 10);
        }
        const label = couponRow.discount_type === "percentage" ? `${couponRow.discount_value}% OFF` : `₹${couponRow.discount_value} OFF`;
        addToast(`Coupon ${couponRow.code.toUpperCase()} applied: ${label}`, "coupon");
        return true;
      }
    } catch (queryErr) {
      console.warn("Direct coupon query note:", queryErr);
    }

    addToast("Invalid or inactive coupon code", "info");
    return false;
  };

  const toggleAudio = () => {
    setIsAudioPlaying((prev) => !prev);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.product_id) {
      const targetItems = cart.filter((i) => i.product.id === appliedCoupon.product_id);
      if (targetItems.length > 0) {
        const productSubtotal = targetItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        if (appliedCoupon.discount_type === "percentage") {
          discountAmount = (productSubtotal * appliedCoupon.discount_value) / 100;
        } else {
          discountAmount = Math.min(productSubtotal, appliedCoupon.discount_value);
        }
      }
    } else {
      if (appliedCoupon.discount_type === "percentage") {
        discountAmount = (cartSubtotal * appliedCoupon.discount_value) / 100;
      } else {
        discountAmount = Math.min(cartSubtotal, appliedCoupon.discount_value);
      }
    }
  } else if (discountPercent > 0) {
    discountAmount = (cartSubtotal * discountPercent) / 100;
  }

  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartSubtotal,
        cartTotal,
        discountAmount,
        couponCode,
        applyCoupon,
        addToCart,
        buyNow,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        wishlist,
        toggleWishlist,
        isInWishlist,
        isWishlistOpen,
        setIsWishlistOpen,
        quickViewProduct,
        setQuickViewProduct,
        isCheckoutOpen,
        setIsCheckoutOpen,
        isAudioPlaying,
        toggleAudio,
        toasts,
        removeToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
