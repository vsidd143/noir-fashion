/**
 * Indian Rupee (INR) currency formatting and localization utilities for NOIR Atelier
 */

export const CURRENCY_SYMBOL = "₹";
export const CURRENCY_CODE = "INR";

/**
 * Formats a numeric price into localized Indian Rupees with proper comma grouping (Lakhs / Thousands).
 * Example: 6999 -> "₹6,999", 12499 -> "₹12,499"
 */
export function formatPrice(amount: number): string {
  const rounded = Math.round(amount);
  return `${CURRENCY_SYMBOL}${rounded.toLocaleString("en-IN")}`;
}

/**
 * Formats a numeric amount with decimals if needed
 */
export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
