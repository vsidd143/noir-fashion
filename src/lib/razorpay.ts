/**
 * Razorpay Client Utilities for NOIR Studio
 */

export interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
  close?: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/**
 * Dynamically loads the official Razorpay checkout script (https://checkout.razorpay.com/v1/checkout.js)
 * Includes a strict timeout failsafe so the checkout button never hangs indefinitely.
 */
export function loadRazorpayScript(timeoutMs = 3500): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn(`Razorpay checkout.js load timed out after ${timeoutMs}ms, using fallback modal.`);
        resolve(false);
      }
    }, timeoutMs);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(true);
      }
    };
    script.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        console.warn("Failed to load official Razorpay SDK script from CDN.");
        resolve(false);
      }
    };
    document.body.appendChild(script);
  });
}

