/**
 * NOIR Luxury Studio - Enterprise Sales Analytics & Profit Engine
 * Comprehensive calculations for metrics, profit margins, COGS,
 * customer cohort segmentation, and date-range comparisons in Asia/Kolkata.
 */

import {
  ReportingPeriod,
  SalesAnalyticsMetrics,
  ProfitBreakdown,
  CustomerLossMetrics,
  CustomerCohortInsight,
  OperatingExpense,
  OperatingExpenseCategory,
  AnalyticsDateRange,
  MetricComparison,
  CANCELLATION_REASONS,
} from "@/types/analytics";

export interface AnalyticsOrder {
  id: string;
  order_number: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  payment_method: string;
  payment_status: string;
  subtotal?: number;
  discount_amount?: number;
  shipping_fee?: number;
  tax_amount?: number;
  total_amount: number;
  tracking_number?: string;
  created_at: string;
  updated_at?: string;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancellation_notes?: string | null;
  shipping_address?: Record<string, unknown>;
  items?: {
    product_id?: string;
    product_name: string;
    product_image?: string;
    color_name?: string;
    size?: string;
    quantity: number;
    unit_price: number;
    cost_price?: number | null;
  }[];
}

export interface AnalyticsProduct {
  id: string;
  name: string;
  price: number;
  cost_price?: number | null;
  stock_quantity?: number;
  is_published?: boolean;
  category?: string;
}

// -------------------------------------------------------------
// TIMEZONE & DATE RANGE CALCULATOR (Asia/Kolkata: UTC+05:30)
// -------------------------------------------------------------
export function getDateRangeForPeriod(
  period: ReportingPeriod,
  customStart?: string,
  customEnd?: string
): AnalyticsDateRange {
  const now = new Date();

  // Calculate current date in IST (UTC+5.5)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  if (period === "weekly") {
    // Current week: Past 7 days up to end of today
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    prevStart.setHours(0, 0, 0, 0);

    return {
      start,
      end,
      prevStart,
      prevEnd,
      label: "Current Week (7 Days)",
    };
  }

  if (period === "monthly") {
    // Current month: 1st day of month to today/end of month
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Previous month
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
    return {
      start,
      end,
      prevStart,
      prevEnd,
      label: `Current Month (${monthName})`,
    };
  }

  if (period === "yearly") {
    // Current year: Jan 1 to Dec 31
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    const prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    return {
      start,
      end,
      prevStart,
      prevEnd,
      label: `Current Year (${now.getFullYear()})`,
    };
  }

  // Custom Date Range
  const start = customStart ? new Date(customStart) : new Date(now.getTime() - 30 * 86400000);
  start.setHours(0, 0, 0, 0);

  const end = customEnd ? new Date(customEnd) : new Date();
  end.setHours(23, 59, 59, 999);

  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  prevStart.setHours(0, 0, 0, 0);

  const startStr = start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const endStr = end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return {
    start,
    end,
    prevStart,
    prevEnd,
    label: `${startStr} - ${endStr}`,
  };
}

// -------------------------------------------------------------
// FILTER ORDERS BY DATE BOUNDARY
// -------------------------------------------------------------
export function filterOrdersByDate(orders: AnalyticsOrder[], start: Date, end: Date): AnalyticsOrder[] {
  const sTime = start.getTime();
  const eTime = end.getTime();
  return orders.filter((o) => {
    const oTime = new Date(o.created_at).getTime();
    return oTime >= sTime && oTime <= eTime;
  });
}

// -------------------------------------------------------------
// METRIC COMPARISON HELPER
// -------------------------------------------------------------
export function createComparison(current: number, previous: number): MetricComparison {
  const diff = current - previous;
  let percentageChange = 0;
  if (previous > 0) {
    percentageChange = Number(((diff / previous) * 100).toFixed(1));
  } else if (previous === 0 && current > 0) {
    percentageChange = 100;
  } else if (previous === 0 && current === 0) {
    percentageChange = 0;
  }

  const trend: "up" | "down" | "flat" = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return { current, previous, diff, percentageChange, trend };
}

// -------------------------------------------------------------
// CALCULATE 16 CORE SALES METRICS
// -------------------------------------------------------------
export function calculateSalesMetrics(
  allOrders: AnalyticsOrder[],
  dateRange: AnalyticsDateRange,
  products: AnalyticsProduct[] = [],
  expenses: OperatingExpense[] = []
): SalesAnalyticsMetrics {
  const curOrders = filterOrdersByDate(allOrders, dateRange.start, dateRange.end);
  const prevOrders = filterOrdersByDate(allOrders, dateRange.prevStart, dateRange.prevEnd);

  // Status Counts - Current
  const curAll = curOrders.length;
  const curDelivered = curOrders.filter((o) => o.status === "delivered").length;
  const curCancelled = curOrders.filter((o) => o.status === "cancelled").length;
  const curPending = curOrders.filter((o) => o.status === "pending").length;
  const curProcessing = curOrders.filter((o) => o.status === "processing").length;
  const curShipped = curOrders.filter((o) => o.status === "shipped").length;
  const curConfirmed = curOrders.filter((o) => o.status === "confirmed").length;

  // Status Counts - Previous
  const prevAll = prevOrders.length;
  const prevDelivered = prevOrders.filter((o) => o.status === "delivered").length;
  const prevCancelled = prevOrders.filter((o) => o.status === "cancelled").length;
  const prevPending = prevOrders.filter((o) => o.status === "pending").length;
  const prevProcessing = prevOrders.filter((o) => o.status === "processing").length;
  const prevShipped = prevOrders.filter((o) => o.status === "shipped").length;
  const prevConfirmed = prevOrders.filter((o) => o.status === "confirmed").length;

  // Total Revenue (exclusively DELIVERED orders)
  const curRevenue = curOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const prevRevenue = prevOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Profit calculation for current & previous
  const curProfit = calculateProfitBreakdown(curOrders, products, expenses, dateRange.start, dateRange.end).netProfit;
  const prevProfit = calculateProfitBreakdown(prevOrders, products, expenses, dateRange.prevStart, dateRange.prevEnd).netProfit;

  // Total Customers in period
  const curCustomerEmails = new Set(curOrders.map((o) => (o.customer_email || "").toLowerCase().trim()).filter(Boolean));
  const prevCustomerEmails = new Set(prevOrders.map((o) => (o.customer_email || "").toLowerCase().trim()).filter(Boolean));

  // Historical customers prior to current period
  const historicalOrdersPriorToCur = allOrders.filter(
    (o) => new Date(o.created_at).getTime() < dateRange.start.getTime()
  );
  const historicalCustomerEmailsPriorToCur = new Set(
    historicalOrdersPriorToCur.map((o) => (o.customer_email || "").toLowerCase().trim()).filter(Boolean)
  );

  let curNewCustCount = 0;
  let curReturningCustCount = 0;
  for (const email of curCustomerEmails) {
    if (historicalCustomerEmailsPriorToCur.has(email)) {
      curReturningCustCount++;
    } else {
      curNewCustCount++;
    }
  }

  // Previous period new vs returning
  const historicalOrdersPriorToPrev = allOrders.filter(
    (o) => new Date(o.created_at).getTime() < dateRange.prevStart.getTime()
  );
  const historicalCustomerEmailsPriorToPrev = new Set(
    historicalOrdersPriorToPrev.map((o) => (o.customer_email || "").toLowerCase().trim()).filter(Boolean)
  );

  let prevNewCustCount = 0;
  let prevReturningCustCount = 0;
  for (const email of prevCustomerEmails) {
    if (historicalCustomerEmailsPriorToPrev.has(email)) {
      prevReturningCustCount++;
    } else {
      prevNewCustCount++;
    }
  }

  // Cancelled Order Value
  const curCancelledValue = curOrders
    .filter((o) => o.status === "cancelled")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const prevCancelledValue = prevOrders
    .filter((o) => o.status === "cancelled")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Average Order Value (AOV) = Delivered Total / Delivered Count
  const curAOV = curDelivered > 0 ? Math.round(curRevenue / curDelivered) : 0;
  const prevAOV = prevDelivered > 0 ? Math.round(prevRevenue / prevDelivered) : 0;

  // Customer Cancellation Rate = (Cancelled Orders / All Orders) * 100
  const curCancelRate = curAll > 0 ? Number(((curCancelled / curAll) * 100).toFixed(1)) : 0;
  const prevCancelRate = prevAll > 0 ? Number(((prevCancelled / prevAll) * 100).toFixed(1)) : 0;

  // Repeat Purchase Rate = (Customers with >1 order / Total customers in period) * 100
  const curOrdersPerCustomer: Record<string, number> = {};
  curOrders.forEach((o) => {
    const email = (o.customer_email || "").toLowerCase().trim();
    if (email) curOrdersPerCustomer[email] = (curOrdersPerCustomer[email] || 0) + 1;
  });
  const curRepeatCustCount = Object.values(curOrdersPerCustomer).filter((c) => c > 1).length;
  const curRepeatRate = curCustomerEmails.size > 0 ? Number(((curRepeatCustCount / curCustomerEmails.size) * 100).toFixed(1)) : 0;

  const prevOrdersPerCustomer: Record<string, number> = {};
  prevOrders.forEach((o) => {
    const email = (o.customer_email || "").toLowerCase().trim();
    if (email) prevOrdersPerCustomer[email] = (prevOrdersPerCustomer[email] || 0) + 1;
  });
  const prevRepeatCustCount = Object.values(prevOrdersPerCustomer).filter((c) => c > 1).length;
  const prevRepeatRate = prevCustomerEmails.size > 0 ? Number(((prevRepeatCustCount / prevCustomerEmails.size) * 100).toFixed(1)) : 0;

  return {
    allOrders: createComparison(curAll, prevAll),
    deliveredOrders: createComparison(curDelivered, prevDelivered),
    cancelledOrders: createComparison(curCancelled, prevCancelled),
    pendingOrders: createComparison(curPending, prevPending),
    processingOrders: createComparison(curProcessing, prevProcessing),
    shippedOrders: createComparison(curShipped, prevShipped),
    confirmedOrders: createComparison(curConfirmed, prevConfirmed),
    totalRevenue: createComparison(curRevenue, prevRevenue),
    netProfit: createComparison(curProfit, prevProfit),
    totalCustomers: createComparison(curCustomerEmails.size, prevCustomerEmails.size),
    newCustomers: createComparison(curNewCustCount, prevNewCustCount),
    returningCustomers: createComparison(curReturningCustCount, prevReturningCustCount),
    cancelledOrderValue: createComparison(curCancelledValue, prevCancelledValue),
    averageOrderValue: createComparison(curAOV, prevAOV),
    customerCancellationRate: createComparison(curCancelRate, prevCancelRate),
    repeatPurchaseRate: createComparison(curRepeatRate, prevRepeatRate),
  };
}

// -------------------------------------------------------------
// REAL PROFIT & REVENUE CALCULATION (Accounting Principles)
// -------------------------------------------------------------
export function calculateProfitBreakdown(
  ordersInPeriod: AnalyticsOrder[],
  products: AnalyticsProduct[] = [],
  expenses: OperatingExpense[] = [],
  startDate?: Date,
  endDate?: Date
): ProfitBreakdown {
  // Classify realized orders:
  // 1. Online Paid Orders (Razorpay: UPI, Card, Scanner, Netbanking)
  // 2. Offline Delivered COD Orders
  const isOnline = (o: AnalyticsOrder) => {
    const pm = (o.payment_method || "").toLowerCase();
    const ps = (o.payment_status || "").toLowerCase();
    return (
      pm.includes("razorpay") ||
      pm.includes("online") ||
      pm.includes("card") ||
      pm.includes("upi") ||
      pm.includes("scanner") ||
      pm.includes("netbanking") ||
      (ps === "paid" && !pm.includes("cash") && !pm.includes("cod"))
    );
  };

  const onlineOrders = ordersInPeriod.filter(
    (o) =>
      o.status !== "cancelled" &&
      isOnline(o) &&
      (o.payment_status === "paid" || ["confirmed", "processing", "shipped", "delivered"].includes(o.status))
  );

  const offlineOrders = ordersInPeriod.filter(
    (o) =>
      o.status !== "cancelled" &&
      !isOnline(o) &&
      (o.status === "delivered" || o.payment_status === "paid")
  );

  const realizedOrders = Array.from(new Set([...onlineOrders, ...offlineOrders]));

  const onlineSalesRevenue = onlineOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const offlineSalesRevenue = offlineOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const grossSalesRevenue = onlineSalesRevenue + offlineSalesRevenue;
  const discountsTotal = realizedOrders.reduce((sum, o) => sum + Number(o.discount_amount || 0), 0);

  // Net sales
  const netSales = grossSalesRevenue;

  // 12% GST liability estimate included in delivered selling price (Prices are GST-inclusive in luxury fashion)
  // GST = NetSales * (12 / 112)
  const taxLiabilityGst = Math.round(netSales * (12 / 112));

  // Product cost map
  const productCostMap = new Map<string, number>();
  products.forEach((p) => {
    if (p.cost_price !== undefined && p.cost_price !== null && p.cost_price > 0) {
      productCostMap.set(p.id, Number(p.cost_price));
      productCostMap.set(p.name.toLowerCase().trim(), Number(p.cost_price));
    }
  });

  let cogsTotal = 0;
  let cogsKnownCount = 0;
  let cogsMissingCount = 0;

  realizedOrders.forEach((o) => {
    if (o.items && o.items.length > 0) {
      o.items.forEach((item) => {
        const qty = item.quantity || 1;
        // 1. check if item has direct recorded cost_price
        if (item.cost_price && item.cost_price > 0) {
          cogsTotal += Number(item.cost_price) * qty;
          cogsKnownCount += qty;
        } else if (item.product_id && productCostMap.has(item.product_id)) {
          // 2. check product cost map by id
          const cost = productCostMap.get(item.product_id)!;
          cogsTotal += cost * qty;
          cogsKnownCount += qty;
        } else if (productCostMap.has(item.product_name.toLowerCase().trim())) {
          // 3. check product cost map by name
          const cost = productCostMap.get(item.product_name.toLowerCase().trim())!;
          cogsTotal += cost * qty;
          cogsKnownCount += qty;
        } else {
          // Missing cost price - do NOT invent or fabricate
          cogsMissingCount += qty;
        }
      });
    }
  });

  const isCogsEstimated = cogsMissingCount > 0;

  // Operating Expenses filtered to date range
  let filteredExpenses = expenses;
  if (startDate && endDate) {
    const sTime = startDate.getTime();
    const eTime = endDate.getTime();
    filteredExpenses = expenses.filter((e) => {
      const expTime = new Date(e.expense_date).getTime();
      return expTime >= sTime && expTime <= eTime;
    });
  }

  const operatingExpensesByCategory: Record<OperatingExpenseCategory, number> = {
    shipping: 0,
    packaging: 0,
    payment_gateway: 0,
    marketing: 0,
    operations: 0,
    salaries: 0,
    other: 0,
  };

  let totalOperatingExpenses = 0;
  filteredExpenses.forEach((e) => {
    const amt = Number(e.amount || 0);
    totalOperatingExpenses += amt;
    if (operatingExpensesByCategory[e.category] !== undefined) {
      operatingExpensesByCategory[e.category] += amt;
    } else {
      operatingExpensesByCategory.other += amt;
    }
  });

  // Gross Profit = Net Sales - COGS
  const grossProfit = Math.max(0, netSales - cogsTotal);

  // Net Profit = Gross Profit - Operating Expenses
  const netProfit = grossProfit - totalOperatingExpenses;

  // Profit Margin % = (Net Profit / Net Sales) * 100
  const profitMarginPercent = netSales > 0 ? Number(((netProfit / netSales) * 100).toFixed(1)) : 0;

  return {
    grossSalesRevenue,
    onlineSalesRevenue,
    offlineSalesRevenue,
    discountsTotal,
    netSales,
    cogsTotal,
    cogsKnownCount,
    cogsMissingCount,
    isCogsEstimated,
    totalOperatingExpenses,
    operatingExpensesByCategory,
    grossProfit,
    netProfit,
    profitMarginPercent,
    taxLiabilityGst,
  };
}

// -------------------------------------------------------------
// CUSTOMER LOSS & CANCELLATION ANALYTICS
// -------------------------------------------------------------
export function calculateCustomerLossAnalytics(
  allOrders: AnalyticsOrder[],
  dateRange: AnalyticsDateRange
): CustomerLossMetrics {
  const periodOrders = filterOrdersByDate(allOrders, dateRange.start, dateRange.end);
  const cancelledOrders = periodOrders.filter((o) => o.status === "cancelled");

  const totalCancelledOrders = cancelledOrders.length;
  const totalCancelledValue = cancelledOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Unique customers who cancelled
  const customerCancellationsMap: Record<string, number> = {};
  cancelledOrders.forEach((o) => {
    const email = (o.customer_email || "").toLowerCase().trim();
    if (email) {
      customerCancellationsMap[email] = (customerCancellationsMap[email] || 0) + 1;
    }
  });

  const uniqueCustomersCancelled = Object.keys(customerCancellationsMap).length;
  const customersWithMultipleCancellations = Object.values(customerCancellationsMap).filter((c) => c > 1).length;

  const cancellationRate =
    periodOrders.length > 0 ? Number(((totalCancelledOrders / periodOrders.length) * 100).toFixed(1)) : 0;

  // Reason breakdown
  const reasonCounts: Record<string, { count: number; totalValue: number }> = {};
  // Initialize standard 9 reasons
  CANCELLATION_REASONS.forEach((r) => {
    reasonCounts[r] = { count: 0, totalValue: 0 };
  });
  reasonCounts["Unknown / Not Recorded"] = { count: 0, totalValue: 0 };

  cancelledOrders.forEach((o) => {
    const rawReason = (o.cancellation_reason || "").trim();
    let matchedReason = "Unknown / Not Recorded";

    if (rawReason) {
      const found = CANCELLATION_REASONS.find(
        (r) => rawReason.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(rawReason.toLowerCase())
      );
      matchedReason = found || rawReason;
    }

    if (!reasonCounts[matchedReason]) {
      reasonCounts[matchedReason] = { count: 0, totalValue: 0 };
    }

    reasonCounts[matchedReason].count += 1;
    reasonCounts[matchedReason].totalValue += Number(o.total_amount || 0);
  });

  const reasonBreakdown = Object.entries(reasonCounts)
    .filter(([_, data]) => data.count > 0)
    .map(([reason, data]) => ({
      reason,
      count: data.count,
      percentage: totalCancelledOrders > 0 ? Number(((data.count / totalCancelledOrders) * 100).toFixed(1)) : 0,
      totalValue: data.totalValue,
    }))
    .sort((a, b) => b.count - a.count);

  // Product-wise cancellations
  const productCancelMap: Record<
    string,
    { productId?: string; productName: string; cancelledCount: number; cancelledValue: number; totalOrdered: number }
  > = {};

  // Track all products ordered in period to compute cancellation rate per product
  periodOrders.forEach((o) => {
    const isCancelled = o.status === "cancelled";
    if (o.items && o.items.length > 0) {
      o.items.forEach((it) => {
        const pName = it.product_name;
        if (!productCancelMap[pName]) {
          productCancelMap[pName] = {
            productId: it.product_id,
            productName: pName,
            cancelledCount: 0,
            cancelledValue: 0,
            totalOrdered: 0,
          };
        }
        productCancelMap[pName].totalOrdered += it.quantity || 1;
        if (isCancelled) {
          productCancelMap[pName].cancelledCount += it.quantity || 1;
          productCancelMap[pName].cancelledValue += Number(it.unit_price || 0) * (it.quantity || 1);
        }
      });
    }
  });

  const productWiseCancellations = Object.values(productCancelMap)
    .filter((p) => p.cancelledCount > 0)
    .map((p) => ({
      productId: p.productId,
      productName: p.productName,
      cancelledCount: p.cancelledCount,
      cancelledValue: p.cancelledValue,
      cancellationRate: p.totalOrdered > 0 ? Number(((p.cancelledCount / p.totalOrdered) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.cancelledCount - a.cancelledCount);

  // Monthly trends (past 6 months)
  const monthlyTrendsMap: Record<string, { cancelledOrders: number; cancelledValue: number; totalOrders: number }> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  allOrders.forEach((o) => {
    const d = new Date(o.created_at);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (!monthlyTrendsMap[key]) {
      monthlyTrendsMap[key] = { cancelledOrders: 0, cancelledValue: 0, totalOrders: 0 };
    }
    monthlyTrendsMap[key].totalOrders += 1;
    if (o.status === "cancelled") {
      monthlyTrendsMap[key].cancelledOrders += 1;
      monthlyTrendsMap[key].cancelledValue += Number(o.total_amount || 0);
    }
  });

  const monthlyTrends = Object.entries(monthlyTrendsMap)
    .slice(-6)
    .map(([month, data]) => ({
      month,
      cancelledOrders: data.cancelledOrders,
      cancelledValue: data.cancelledValue,
      rate: data.totalOrders > 0 ? Number(((data.cancelledOrders / data.totalOrders) * 100).toFixed(1)) : 0,
    }));

  // Customer retention analysis: customers who cancelled an order and subsequently placed an active order
  const cancelledCustomerEmails = new Set(Object.keys(customerCancellationsMap));
  let returnedAfterCancelCount = 0;

  cancelledCustomerEmails.forEach((email) => {
    const custOrders = allOrders
      .filter((o) => (o.customer_email || "").toLowerCase().trim() === email)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let hadCancel = false;
    let subsequentOrder = false;

    for (const ord of custOrders) {
      if (ord.status === "cancelled") {
        hadCancel = true;
      } else if (hadCancel) {
        subsequentOrder = true;
        break;
      }
    }

    if (subsequentOrder) {
      returnedAfterCancelCount++;
    }
  });

  const retentionAfterCancellation = {
    totalCancelledCustomers: cancelledCustomerEmails.size,
    customersWhoReturned: returnedAfterCancelCount,
    retentionRate:
      cancelledCustomerEmails.size > 0
        ? Number(((returnedAfterCancelCount / cancelledCustomerEmails.size) * 100).toFixed(1))
        : 0,
  };

  return {
    totalCancelledOrders,
    uniqueCustomersCancelled,
    customersWithMultipleCancellations,
    cancellationRate,
    totalCancelledValue,
    reasonBreakdown,
    productWiseCancellations,
    monthlyTrends,
    retentionAfterCancellation,
  };
}

// -------------------------------------------------------------
// CUSTOMER COHORTS & INSIGHTS
// -------------------------------------------------------------
export function calculateCustomerCohorts(allOrders: AnalyticsOrder[]): CustomerCohortInsight[] {
  const customerMap: Record<
    string,
    {
      name: string;
      phone?: string;
      orders: AnalyticsOrder[];
    }
  > = {};

  allOrders.forEach((o) => {
    const email = (o.customer_email || "").toLowerCase().trim();
    if (!email) return;

    if (!customerMap[email]) {
      customerMap[email] = {
        name: o.customer_name || "Client",
        phone: o.customer_phone,
        orders: [],
      };
    }
    customerMap[email].orders.push(o);
  });

  const nowTime = new Date().getTime();

  return Object.entries(customerMap).map(([email, data]) => {
    const sorted = data.orders.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const firstOrderDate = sorted[0].created_at;
    const lastOrderDate = sorted[sorted.length - 1].created_at;
    const daysSinceLastOrder = Math.floor((nowTime - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));

    const totalOrders = sorted.length;
    const deliveredOrders = sorted.filter((o) => o.status === "delivered").length;
    const cancelledOrders = sorted.filter((o) => o.status === "cancelled").length;
    const totalSpent = sorted
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Segmentation Rules:
    // 1. Frequent Canceller: >= 2 cancelled orders and cancelledOrders >= deliveredOrders
    // 2. Inactive: daysSinceLastOrder > 90
    // 3. At-Risk: (daysSinceLastOrder between 45 and 90) OR (cancelledOrders > 0 && deliveredOrders <= 1)
    // 4. Repeat: totalOrders >= 2 && deliveredOrders >= 1
    // 5. New: totalOrders === 1 && daysSinceLastOrder <= 45
    let segment: CustomerCohortInsight["segment"] = "New";

    if (cancelledOrders >= 2 && cancelledOrders >= deliveredOrders) {
      segment = "Frequent Canceller";
    } else if (daysSinceLastOrder > 90) {
      segment = "Inactive";
    } else if (daysSinceLastOrder > 45 || (cancelledOrders > 0 && deliveredOrders <= 1)) {
      segment = "At-Risk";
    } else if (totalOrders >= 2) {
      segment = "Repeat";
    } else {
      segment = "New";
    }

    return {
      email,
      name: data.name,
      phone: data.phone,
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      totalSpent,
      firstOrderDate,
      lastOrderDate,
      segment,
      daysSinceLastOrder,
    };
  });
}

// -------------------------------------------------------------
// PRODUCT PERFORMANCE LEADERBOARDS
// -------------------------------------------------------------
export function calculateProductPerformance(
  ordersInPeriod: AnalyticsOrder[],
  products: AnalyticsProduct[] = []
) {
  const prodMap: Record<
    string,
    {
      productId?: string;
      productName: string;
      unitsSold: number;
      revenue: number;
      cost: number;
      cancelledUnits: number;
      stockQuantity: number;
      price: number;
    }
  > = {};

  const productCatalogMap = new Map<string, AnalyticsProduct>();
  products.forEach((p) => {
    productCatalogMap.set(p.id, p);
    productCatalogMap.set(p.name.toLowerCase().trim(), p);
  });

  ordersInPeriod.forEach((o) => {
    const isDelivered = o.status === "delivered";
    const isCancelled = o.status === "cancelled";

    if (o.items && o.items.length > 0) {
      o.items.forEach((it) => {
        const pName = it.product_name;
        if (!prodMap[pName]) {
          const catalogItem = it.product_id
            ? productCatalogMap.get(it.product_id)
            : productCatalogMap.get(pName.toLowerCase().trim());

          prodMap[pName] = {
            productId: it.product_id || catalogItem?.id,
            productName: pName,
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            cancelledUnits: 0,
            stockQuantity: catalogItem?.stock_quantity ?? 10,
            price: it.unit_price || catalogItem?.price || 0,
          };
        }

        const qty = it.quantity || 1;
        if (isDelivered) {
          prodMap[pName].unitsSold += qty;
          prodMap[pName].revenue += Number(it.unit_price || 0) * qty;

          const unitCost =
            it.cost_price ||
            (it.product_id && productCatalogMap.get(it.product_id)?.cost_price) ||
            productCatalogMap.get(pName.toLowerCase().trim())?.cost_price ||
            0;

          prodMap[pName].cost += Number(unitCost) * qty;
        } else if (isCancelled) {
          prodMap[pName].cancelledUnits += qty;
        }
      });
    }
  });

  const list = Object.values(prodMap).map((p) => {
    const profit = Math.max(0, p.revenue - p.cost);
    const margin = p.revenue > 0 ? Number(((profit / p.revenue) * 100).toFixed(1)) : 0;
    const totalDemanded = p.unitsSold + p.cancelledUnits;
    const cancellationRate = totalDemanded > 0 ? Number(((p.cancelledUnits / totalDemanded) * 100).toFixed(1)) : 0;

    return {
      ...p,
      profit,
      margin,
      cancellationRate,
    };
  });

  const topSelling = [...list].sort((a, b) => b.unitsSold - a.unitsSold);
  const highestRevenue = [...list].sort((a, b) => b.revenue - a.revenue);
  const mostCancelled = [...list].filter((p) => p.cancelledUnits > 0).sort((a, b) => b.cancelledUnits - a.cancelledUnits);

  return {
    allProducts: list,
    topSelling,
    highestRevenue,
    mostCancelled,
  };
}

// -------------------------------------------------------------
// BUSINESS ALERTS GENERATOR
// -------------------------------------------------------------
export interface BusinessAlert {
  id: string;
  type: "warning" | "danger" | "info";
  title: string;
  description: string;
  metric?: string;
  actionText?: string;
}

export function generateBusinessAlerts(
  metrics: SalesAnalyticsMetrics,
  profit: ProfitBreakdown,
  products: AnalyticsProduct[],
  cancellations: CustomerLossMetrics
): BusinessAlert[] {
  const alerts: BusinessAlert[] = [];

  // 1. Cancellation Spike Alert
  if (metrics.customerCancellationRate.current >= 20) {
    alerts.push({
      id: "cancel-spike",
      type: "danger",
      title: "Cancellation Spike Detected",
      description: `Current cancellation rate is at ${metrics.customerCancellationRate.current}% (${metrics.cancelledOrders.current} orders cancelled, valued at ₹${cancellations.totalCancelledValue.toLocaleString("en-IN")}).`,
      metric: `${metrics.customerCancellationRate.current}% Rate`,
      actionText: "Review Loss Reasons",
    });
  }

  // 2. Revenue Drop Alert
  if (metrics.totalRevenue.percentageChange <= -15 && metrics.totalRevenue.previous > 0) {
    alerts.push({
      id: "revenue-drop",
      type: "warning",
      title: "Revenue Dip vs Previous Period",
      description: `Delivered sales revenue has declined by ${Math.abs(metrics.totalRevenue.percentageChange)}% compared to the prior equivalent cycle.`,
      metric: `${metrics.totalRevenue.percentageChange}%`,
      actionText: "Audit Funnel",
    });
  }

  // 3. Low Stock Alerts
  const lowStock = products.filter((p) => (p.stock_quantity ?? 0) <= 5);
  if (lowStock.length > 0) {
    alerts.push({
      id: "low-stock",
      type: "warning",
      title: `${lowStock.length} product Running Low On Stock`,
      description: `Limited inventory remaining for: ${lowStock.slice(0, 3).map((p) => p.name).join(", ")}${lowStock.length > 3 ? ` and ${lowStock.length - 3} others` : ""}.`,
      metric: `${lowStock.length} Low`,
      actionText: "Restock Runway",
    });
  }

  // 4. Missing Product Cost Price Alert
  if (profit.isCogsEstimated) {
    alerts.push({
      id: "missing-cogs",
      type: "info",
      title: "Product Cost Prices Incomplete",
      description: `${profit.cogsMissingCount} delivered units lack internal cost prices. Net profit is currently partial/estimated.`,
      metric: "COGS Partial",
      actionText: "Update Cost Prices",
    });
  }

  // 5. Margin Alert
  if (profit.netSales > 0 && profit.profitMarginPercent < 20 && !profit.isCogsEstimated) {
    alerts.push({
      id: "low-margin",
      type: "warning",
      title: "Profit Margin Compressed",
      description: `Net profit margin is currently ${profit.profitMarginPercent}%, below the target of 25%. Operating expenses and fulfillment overhead should be optimized.`,
      metric: `${profit.profitMarginPercent}% Margin`,
      actionText: "Review Expenses",
    });
  }

  return alerts;
}
