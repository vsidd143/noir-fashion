/**
 * NOIR Luxury Atelier - Sales Analytics & Business Intelligence Types
 */

export type ReportingPeriod = "weekly" | "monthly" | "yearly" | "custom";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export const CANCELLATION_REASONS = [
  "Price too high",
  "Delivery taking too long",
  "Ordered by mistake",
  "Changed my mind",
  "Found a better product",
  "Payment or COD issue",
  "Wrong size or product",
  "Duplicate order",
  "Other",
] as const;

export type CancellationReasonType = (typeof CANCELLATION_REASONS)[number];

export type OperatingExpenseCategory =
  | "shipping"
  | "packaging"
  | "payment_gateway"
  | "marketing"
  | "operations"
  | "salaries"
  | "other";

export interface OperatingExpense {
  id: string;
  title: string;
  category: OperatingExpenseCategory;
  amount: number;
  expense_date: string;
  receipt_url?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MetricComparison<T = number> {
  current: T;
  previous: T;
  diff: number;
  percentageChange: number; // positive = increase, negative = decrease
  trend: "up" | "down" | "flat";
}

export interface SalesAnalyticsMetrics {
  allOrders: MetricComparison;
  deliveredOrders: MetricComparison;
  cancelledOrders: MetricComparison;
  pendingOrders: MetricComparison;
  processingOrders: MetricComparison;
  shippedOrders: MetricComparison;
  confirmedOrders: MetricComparison;
  totalRevenue: MetricComparison;
  netProfit: MetricComparison;
  totalCustomers: MetricComparison;
  newCustomers: MetricComparison;
  returningCustomers: MetricComparison;
  cancelledOrderValue: MetricComparison;
  averageOrderValue: MetricComparison;
  customerCancellationRate: MetricComparison;
  repeatPurchaseRate: MetricComparison;
}

export interface ProfitBreakdown {
  grossSalesRevenue: number; // delivered order values
  discountsTotal: number;
  netSales: number; // grossSales - discounts (if not already factored)
  cogsTotal: number; // total product cost
  cogsKnownCount: number;
  cogsMissingCount: number;
  isCogsEstimated: boolean;
  totalOperatingExpenses: number;
  operatingExpensesByCategory: Record<OperatingExpenseCategory, number>;
  grossProfit: number; // netSales - cogsTotal
  netProfit: number; // grossProfit - totalOperatingExpenses
  profitMarginPercent: number; // (netProfit / netSales) * 100
  taxLiabilityGst: number; // 12% GST collected (liability, excluded from profit)
}

export interface CustomerLossMetrics {
  totalCancelledOrders: number;
  uniqueCustomersCancelled: number;
  customersWithMultipleCancellations: number;
  cancellationRate: number; // %
  totalCancelledValue: number;
  reasonBreakdown: { reason: string; count: number; percentage: number; totalValue: number }[];
  productWiseCancellations: {
    productId?: string;
    productName: string;
    cancelledCount: number;
    cancelledValue: number;
    cancellationRate: number;
  }[];
  monthlyTrends: { month: string; cancelledOrders: number; cancelledValue: number; rate: number }[];
  retentionAfterCancellation: {
    totalCancelledCustomers: number;
    customersWhoReturned: number;
    retentionRate: number; // %
  };
}

export interface CustomerCohortInsight {
  email: string;
  name: string;
  phone?: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  firstOrderDate: string;
  lastOrderDate: string;
  segment: "New" | "Repeat" | "At-Risk" | "Inactive" | "Frequent Canceller";
  daysSinceLastOrder: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  tertiaryValue?: number;
  date?: string;
  tooltip?: string;
}

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
  label: string;
  prevStart: Date;
  prevEnd: Date;
}

