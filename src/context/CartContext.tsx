"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, ProductColor, CartItem } from "@/types/fashion";
import { PRODUCTS } from "@/data/products";

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
  applyCoupon: (code: string) => boolean;
  addToCart: (product: Product, color?: ProductColor, size?: string, quantity?: number) => void;
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
  const knownProductsRef = React.useRef<Map<string, Product>>(new Map());

  // Load cart and wishlist from localStorage safely after mount
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

  // Save cart changes to localStorage only after hydration to avoid clobbering stored cart
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("noir_cart", JSON.stringify(cart));
    } catch {}
  }, [cart, isHydrated]);

  // Save wishlist changes to localStorage only after hydration
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("noir_wishlist", JSON.stringify(wishlist));
    } catch {}
  }, [wishlist, isHydrated]);

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
    const chosenColor = color || product.colors[0];
    const chosenSize = size || product.sizes[0] || "M";

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor.hex === chosenColor.hex &&
          item.selectedSize === chosenSize
      );

      if (existingIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += quantity;
        return newCart;
      } else {
        return [
          ...prevCart,
          {
            product,
            selectedColor: chosenColor,
            selectedSize: chosenSize,
            quantity,
          },
        ];
      }
    });

    addToast(`Added ${product.name} (${chosenSize}) to your Bag`, "cart");
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, colorHex: string, size: string) => {
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
  };

  const updateQuantity = (
    productId: string,
    colorHex: string,
    size: string,
    delta: number
  ) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (
            item.product.id === productId &&
            item.selectedColor.hex === colorHex &&
            item.selectedSize === size
          ) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (productId: string, productObj?: Product) => {
    if (productObj) {
      knownProductsRef.current.set(productId, productObj);
    }
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      const product = productObj || knownProductsRef.current.get(productId) || PRODUCTS.find((p) => p.id === productId);
      if (exists) {
        addToast(`Removed ${product?.name || "item"} from Wishlist`, "wishlist");
        return prev.filter((id) => id !== productId);
      } else {
        addToast(`Saved ${product?.name || "item"} to Wishlist`, "wishlist");
        return [...prev, productId];
      }
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const applyCoupon = (code: string) => {
    const formatted = code.trim().toUpperCase();
    if (!formatted) return false;

    // 1. Check dynamic coupons configured in Admin Dashboard
    let customCoupons: {
      id?: string;
      code: string;
      discount_type: "percentage" | "fixed";
      discount_value: number;
      min_order_amount?: number;
      is_active?: boolean;
      product_id?: string | null;
      product_name?: string | null;
    }[] = [];

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("noir_coupons");
        if (stored) {
          customCoupons = JSON.parse(stored);
        }
      } catch {}
    }

    const matchedCoupon = customCoupons.find(
      (c) => c.code.toUpperCase() === formatted && c.is_active !== false
    );

    if (matchedCoupon) {
      // Check minimum order amount
      if (matchedCoupon.min_order_amount && cartSubtotal < matchedCoupon.min_order_amount) {
        addToast(
          `Minimum order of ₹${matchedCoupon.min_order_amount.toLocaleString("en-IN")} required for coupon ${formatted}`,
          "info"
        );
        return false;
      }

      // Check product-specific attachment
      if (matchedCoupon.product_id) {
        const productInCart = cart.some((i) => i.product.id === matchedCoupon.product_id);
        if (!productInCart) {
          addToast(
            `Coupon ${formatted} is only valid for ${matchedCoupon.product_name || "a specific product"}`,
            "info"
          );
          return false;
        }
      }

      setCouponCode(formatted);
      setAppliedCoupon({
        code: formatted,
        discount_type: matchedCoupon.discount_type || "percentage",
        discount_value: Number(matchedCoupon.discount_value) || 10,
        product_id: matchedCoupon.product_id || null,
        product_name: matchedCoupon.product_name || null,
        min_order_amount: Number(matchedCoupon.min_order_amount) || 0,
      });

      const label =
        matchedCoupon.discount_type === "percentage"
          ? `${matchedCoupon.discount_value}% OFF`
          : `₹${matchedCoupon.discount_value} OFF`;
      addToast(`Promo code ${formatted} applied: ${label}`, "coupon");
      return true;
    }

    // 2. Built-in promo codes fallback
    if (formatted === "NOIR10") {
      setCouponCode(formatted);
      setAppliedCoupon({
        code: formatted,
        discount_type: "percentage",
        discount_value: 10,
      });
      setDiscountPercent(10);
      addToast("Coupon NOIR10 applied: 10% OFF", "coupon");
      return true;
    } else if (formatted === "VIP20") {
      setCouponCode(formatted);
      setAppliedCoupon({
        code: formatted,
        discount_type: "percentage",
        discount_value: 20,
      });
      setDiscountPercent(20);
      addToast("Coupon VIP20 applied: 20% OFF", "coupon");
      return true;
    } else {
      addToast("Invalid coupon code", "info");
      return false;
    }
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
      // Product-specific discount
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
      // Storewide discount
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
