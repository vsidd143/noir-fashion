"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ReportingPeriod,
  OperatingExpense,
  OperatingExpenseCategory,
  CANCELLATION_REASONS,
} from "@/types/analytics";
import {
  AnalyticsOrder,
  AnalyticsProduct,
  getDateRangeForPeriod,
  calculateSalesMetrics,
  calculateProfitBreakdown,
  calculateCustomerLossAnalytics,
  calculateCustomerCohorts,
  calculateProductPerformance,
  generateBusinessAlerts,
  filterOrdersByDate,
} from "@/lib/analytics-engine";
import {
  TrendAreaChart,
  DistributionDonutChart,
  HorizontalBarRankingChart,
  FinancialComparisonBarChart,
} from "./AnalyticsCharts";
import {
  exportOrdersCSV,
  exportPeriodicSalesReportCSV,
  exportRevenueAndProfitCSV,
  exportCustomerLossCSV,
  exportProductPerformanceCSV,
  exportCustomerInsightsCSV,
} from "@/lib/csv-export";
import { formatPrice } from "@/lib/currency";
import {
  updateProductCostPrice,
  DbProduct,
} from "@/lib/products-service";
import {
  fetchOperatingExpenses,
  createOperatingExpense,
  deleteOperatingExpense,
} from "@/lib/expenses-service";
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Users,
  AlertTriangle,
  Package,
  Layers,
  ArrowRight,
  PlusCircle,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

interface SalesAnalyticsDashboardProps {
  orders: AnalyticsOrder[];
  products: DbProduct[];
  onRefreshData?: () => void;
  onNavigateToOrder?: (orderId: string) => void;
}

type AnalyticsSubSection =
  | "overview"
  | "orders"
  | "sales"
  | "profit"
  | "customers"
  | "loss"
  | "products"
  | "inventory"
  | "reports";

export default function SalesAnalyticsDashboard({
  orders,
  products,
  onRefreshData,
  onNavigateToOrder,
}: SalesAnalyticsDashboardProps) {
  // Navigation & Period State
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubSection>("overview");
  const [period, setPeriod] = useState<ReportingPeriod>("monthly");

  const [customStart, setCustomStart] = useState<string>(() =>
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Operating Expenses State
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState("");
  const [newExpCategory, setNewExpCategory] = useState<OperatingExpenseCategory>("shipping");
  const [newExpAmount, setNewExpAmount] = useState<string>("");
  const [newExpDate, setNewExpDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [newExpNotes, setNewExpNotes] = useState("");

  // Product Cost Price Inline Edit State
  const [editingCostProdId, setEditingCostProdId] = useState<string | null>(null);
  const [editCostValue, setEditCostValue] = useState<string>("");
  const [isUpdatingCost, setIsUpdatingCost] = useState(false);

  // Orders Table Filter State inside Order Analytics Tab
  const [orderTableStatus, setOrderTableStatus] = useState<string>("all");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderSortBy, setOrderSortBy] = useState<"date" | "amount" | "items">("date");
  const [orderSortDir, setOrderSortDir] = useState<"asc" | "desc">("desc");
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 12;

  // Notification Banner
  const [bannerFeedback, setBannerFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (type: "success" | "error", text: string) => {
    setBannerFeedback({ type, text });
    setTimeout(() => setBannerFeedback(null), 4000);
  };

  // Load Expenses on Mount
  useEffect(() => {
    const loadExpenses = async () => {
      setIsLoadingExpenses(true);
      const data = await fetchOperatingExpenses();
      setExpenses(data);
      setIsLoadingExpenses(false);
    };
    loadExpenses();
  }, []);

  // -------------------------------------------------------------
  // ANALYTICS COMPUTATIONS (Asia/Kolkata Timezone)
  // -------------------------------------------------------------
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(period, customStart, customEnd);
  }, [period, customStart, customEnd]);

  // Convert DbProduct to AnalyticsProduct format
  const analyticsProducts: AnalyticsProduct[] = useMemo(() => {
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      cost_price: p.cost_price,
      stock_quantity: p.stock_quantity,
      is_published: p.is_published,
      category: p.category?.name || "Apparel",
    }));
  }, [products]);

  // 16 Core KPI metrics
  const metrics = useMemo(() => {
    return calculateSalesMetrics(orders, dateRange, analyticsProducts, expenses);
  }, [orders, dateRange, analyticsProducts, expenses]);

  // Orders in selected period
  const ordersInPeriod = useMemo(() => {
    return filterOrdersByDate(orders, dateRange.start, dateRange.end);
  }, [orders, dateRange]);

  // Profit breakdown
  const profit = useMemo(() => {
    return calculateProfitBreakdown(ordersInPeriod, analyticsProducts, expenses, dateRange.start, dateRange.end);
  }, [ordersInPeriod, analyticsProducts, expenses, dateRange]);

  // Customer loss metrics
  const lossMetrics = useMemo(() => {
    return calculateCustomerLossAnalytics(orders, dateRange);
  }, [orders, dateRange]);

  // Customer cohort insights
  const cohorts = useMemo(() => {
    return calculateCustomerCohorts(orders);
  }, [orders]);

  // Product performance rankings
  const productPerformance = useMemo(() => {
    return calculateProductPerformance(ordersInPeriod, analyticsProducts);
  }, [ordersInPeriod, analyticsProducts]);

  // Business Alerts
  const alerts = useMemo(() => {
    return generateBusinessAlerts(metrics, profit, analyticsProducts, lossMetrics);
  }, [metrics, profit, analyticsProducts, lossMetrics]);

  // -------------------------------------------------------------
  // CHART DATA GENERATORS
  // -------------------------------------------------------------
  // 1. Weekly Sales & Revenue Trend (last 7 days or weeks)
  const salesTrendData = useMemo(() => {
    const buckets: Record<string, { value: number; secondaryValue: number }> = {};
    const dIter = new Date(dateRange.start);

    // Initialize daily or periodic slots
    while (dIter.getTime() <= dateRange.end.getTime()) {
      const key = dIter.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      buckets[key] = { value: 0, secondaryValue: 0 };
      dIter.setDate(dIter.getDate() + 1);
    }

    ordersInPeriod.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      if (buckets[key]) {
        if (o.status === "delivered") {
          buckets[key].value += Number(o.total_amount || 0);
        } else if (o.status === "cancelled") {
          buckets[key].secondaryValue += Number(o.total_amount || 0);
        }
      }
    });

    return Object.entries(buckets).map(([label, val]) => ({
      label,
      value: val.value,
      secondaryValue: val.secondaryValue,
    }));
  }, [dateRange, ordersInPeriod]);

  // 2. Order Status Distribution Donut
  const orderStatusDonutData = [
    { label: "Delivered", count: metrics.deliveredOrders.current, color: "#10b981" },
    { label: "Confirmed", count: metrics.confirmedOrders.current, color: "#f59e0b" },
    { label: "Processing", count: metrics.processingOrders.current, color: "#a855f7" },
    { label: "Shipped", count: metrics.shippedOrders.current, color: "#3b82f6" },
    { label: "Pending", count: metrics.pendingOrders.current, color: "#c5a46d" },
    { label: "Cancelled", count: metrics.cancelledOrders.current, color: "#ef4444" },
  ];

  // 3. Cancellation Reasons Ranking Bar Data
  const cancellationReasonsBarData = useMemo(() => {
    return lossMetrics.reasonBreakdown.map((r) => ({
      label: r.reason,
      value: r.count,
      secondaryText: `${r.percentage}% · ₹${r.totalValue.toLocaleString("en-IN")}`,
      color: r.reason === "Price too high" ? "#ef4444" : "#c5a46d",
    }));
  }, [lossMetrics]);

  // 4. Financial Margins Comparison (Delivered Sales vs COGS vs Expenses vs Net Profit)
  const financialComparisonData = useMemo(() => {
    return [
      {
        category: dateRange.label,
        revenue: profit.grossSalesRevenue,
        cogs: profit.cogsTotal,
        expenses: profit.totalOperatingExpenses,
        netProfit: profit.netProfit,
      },
    ];
  }, [dateRange, profit]);

  // -------------------------------------------------------------
  // ORDERS TABLE FILTERING & PAGINATION (Sub-Tab: Orders)
  // -------------------------------------------------------------
  const filteredTableOrders = useMemo(() => {
    let result = [...ordersInPeriod];

    if (orderTableStatus !== "all") {
      result = result.filter((o) => o.status === orderTableStatus);
    }

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_email.toLowerCase().includes(q) ||
          (o.customer_phone && o.customer_phone.includes(q))
      );
    }

    result.sort((a, b) => {
      if (orderSortBy === "date") {
        const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return orderSortDir === "asc" ? -diff : diff;
      }
      if (orderSortBy === "amount") {
        const diff = Number(b.total_amount || 0) - Number(a.total_amount || 0);
        return orderSortDir === "asc" ? -diff : diff;
      }
      const aItems = (a.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
      const bItems = (b.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
      return orderSortDir === "asc" ? aItems - bItems : bItems - aItems;
    });

    return result;
  }, [ordersInPeriod, orderTableStatus, orderSearchQuery, orderSortBy, orderSortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredTableOrders.length / ordersPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * ordersPerPage;
    return filteredTableOrders.slice(start, start + ordersPerPage);
  }, [filteredTableOrders, orderPage]);

  // -------------------------------------------------------------
  // ACTIONS: ADD OPERATING EXPENSE
  // -------------------------------------------------------------
  const handleCreateExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle.trim() || !newExpAmount || Number(newExpAmount) <= 0) {
      showNotification("error", "Please provide a valid expense title and amount.");
      return;
    }

    const res = await createOperatingExpense({
      title: newExpTitle,
      category: newExpCategory,
      amount: Number(newExpAmount),
      expense_date: newExpDate,
      notes: newExpNotes,
    });

    if (res.success && res.data) {
      setExpenses((prev) => [res.data!, ...prev]);
      setShowAddExpenseModal(false);
      setNewExpTitle("");
      setNewExpAmount("");
      setNewExpNotes("");
      showNotification("success", `Expense of ₹${Number(newExpAmount).toLocaleString("en-IN")} recorded.`);
    } else {
      showNotification("error", res.error || "Failed to record operating expense.");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const res = await deleteOperatingExpense(id);
    if (res.success) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      showNotification("success", "Expense record deleted.");
    } else {
      showNotification("error", res.error || "Could not delete expense.");
    }
  };

  // -------------------------------------------------------------
  // ACTIONS: INLINE PRODUCT COST UPDATE
  // -------------------------------------------------------------
  const handleSaveProductCost = async (productId: string) => {
    const cost = Number(editCostValue);
    if (isNaN(cost) || cost < 0) {
      showNotification("error", "Please enter a valid numeric cost price.");
      return;
    }

    setIsUpdatingCost(true);
    const res = await updateProductCostPrice(productId, cost);
    setIsUpdatingCost(false);

    if (res.success) {
      const targetProd = products.find((p) => p.id === productId);
      if (targetProd) {
        targetProd.cost_price = cost;
      }
      setEditingCostProdId(null);
      setEditCostValue("");
      showNotification("success", "Manufacturing cost price updated in database.");
    } else {
      showNotification("error", res.error || "Could not update product cost price.");
    }
  };

  // -------------------------------------------------------------
  // 16 STATISTIC CARDS CONFIGURATION
  // -------------------------------------------------------------
  const STAT_CARDS = [
    {
      id: "all-orders",
      title: "All Orders",
      value: metrics.allOrders.current,
      comparison: metrics.allOrders,
      isCurrency: false,
      targetTab: "orders" as const,
      statusFilter: "all",
      badgeColor: "text-white",
    },
    {
      id: "delivered-orders",
      title: "Delivered Orders",
      value: metrics.deliveredOrders.current,
      comparison: metrics.deliveredOrders,
      isCurrency: false,
      targetTab: "orders" as const,
      statusFilter: "delivered",
      badgeColor: "text-emerald-400",
    },
    {
      id: "confirmed-orders",
      title: "Confirmed Orders",
      value: metrics.confirmedOrders.current,
      comparison: metrics.confirmedOrders,
      isCurrency: false,
      targetTab: "orders" as const,
      statusFilter: "confirmed",
      badgeColor: "text-amber-400",
    },
    {
      id: "processing-orders",
      title: "Processing Orders",
      value: metrics.processingOrders.current,
      comparison: metrics.processingOrders,
      isCurrency: false,
      targetTab: "orders" as const,
      statusFilter: "processing",
      badgeColor: "text-purple-400",
    },
    {
      id: "shipped-orders",
      title: "Shipped Orders",
      value: metrics.shippedOrders.current,
      comparison: metrics.shippedOrders,
      isCurrency: false,
      targetTab: "orders" as const,
      statusFilter: "shipped",
      badgeColor: "text-blue-400",
    },
    {
      id: "pending-orders",
      title: "Pending Orders",
      value: metrics.pendingOrders.current,
      comparison: metrics.pendingOrders,
      isCurrency: false,
      targetTab: "orders" as const,
      statusFilter: "pending",
      badgeColor: "text-[#c5a46d]",
    },
    {
      id: "cancelled-orders",
      title: "Cancelled Orders",
      value: metrics.cancelledOrders.current,
      comparison: metrics.cancelledOrders,
      isCurrency: false,
      targetTab: "loss" as const,
      statusFilter: "cancelled",
      badgeColor: "text-red-400",
    },
    {
      id: "total-revenue",
      title: "Total Revenue",
      value: metrics.totalRevenue.current,
      comparison: metrics.totalRevenue,
      isCurrency: true,
      targetTab: "sales" as const,
      badgeColor: "text-emerald-400",
    },
    {
      id: "net-profit",
      title: "Net Profit",
      value: metrics.netProfit.current,
      comparison: metrics.netProfit,
      isCurrency: true,
      targetTab: "profit" as const,
      badgeColor: profit.netProfit >= 0 ? "text-emerald-400" : "text-red-400",
    },
    {
      id: "total-customers",
      title: "Total Customers",
      value: metrics.totalCustomers.current,
      comparison: metrics.totalCustomers,
      isCurrency: false,
      targetTab: "customers" as const,
      badgeColor: "text-cyan-400",
    },
    {
      id: "new-customers",
      title: "New Customers",
      value: metrics.newCustomers.current,
      comparison: metrics.newCustomers,
      isCurrency: false,
      targetTab: "customers" as const,
      badgeColor: "text-teal-400",
    },
    {
      id: "returning-customers",
      title: "Returning Customers",
      value: metrics.returningCustomers.current,
      comparison: metrics.returningCustomers,
      isCurrency: false,
      targetTab: "customers" as const,
      badgeColor: "text-indigo-400",
    },
    {
      id: "cancelled-value",
      title: "Cancelled Order Value",
      value: metrics.cancelledOrderValue.current,
      comparison: metrics.cancelledOrderValue,
      isCurrency: true,
      targetTab: "loss" as const,
      badgeColor: "text-red-400",
    },
    {
      id: "aov",
      title: "Average Order Value",
      value: metrics.averageOrderValue.current,
      comparison: metrics.averageOrderValue,
      isCurrency: true,
      targetTab: "sales" as const,
      badgeColor: "text-[#c5a46d]",
    },
    {
      id: "cancel-rate",
      title: "Cancellation Rate",
      value: `${metrics.customerCancellationRate.current}%`,
      comparison: metrics.customerCancellationRate,
      isCurrency: false,
      targetTab: "loss" as const,
      badgeColor: metrics.customerCancellationRate.current > 15 ? "text-red-400" : "text-neutral-400",
    },
    {
      id: "repeat-rate",
      title: "Repeat Purchase Rate",
      value: `${metrics.repeatPurchaseRate.current}%`,
      comparison: metrics.repeatPurchaseRate,
      isCurrency: false,
      targetTab: "customers" as const,
      badgeColor: "text-[#c5a46d]",
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Floating Status Notification */}
      {bannerFeedback && (
        <div
          className={`fixed top-6 right-6 z-[300] px-5 py-3 border text-xs font-mono flex items-center gap-3 shadow-2xl backdrop-blur-md transition-all ${bannerFeedback.type === "success"
            ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
            : "bg-red-950/90 border-red-500/40 text-red-200"
            }`}
        >
          {bannerFeedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{bannerFeedback.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* HEADER & REPORTING PERIOD SELECTOR */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#c5a46d] animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#c5a46d]">
              NOIR ENTERPRISE BUSINESS INTELLIGENCE // ASIA/KOLKATA (IST)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight font-display text-white">
            Sales Analytics & Profit Hub
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            Audited financial calculations, live Supabase synchronization, customer loss intelligence, and CSV exports.
          </p>
        </div>

        {/* Period Selector & Custom Pickers */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Period Tabs */}
          <div className="flex items-center bg-black border border-white/15 p-1 font-mono text-xs">
            {(["weekly", "monthly", "yearly", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 uppercase tracking-wider text-[11px] font-bold transition-all cursor-pointer ${period === p
                  ? "bg-[#c5a46d] text-black shadow-md shadow-[#c5a46d]/20"
                  : "text-neutral-400 hover:text-white"
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {period === "custom" && (
            <div className="flex items-center gap-2 bg-black border border-white/15 px-3 py-1.5 font-mono text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#c5a46d]" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-white text-[11px] focus:outline-none"
              />
              <span className="text-neutral-500">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-white text-[11px] focus:outline-none"
              />
            </div>
          )}

          {/* Quick Refresh */}
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              title="Synchronize live Supabase database"
              className="p-2.5 bg-black border border-white/15 hover:border-[#c5a46d] text-neutral-400 hover:text-[#c5a46d] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cycle Indicator Badge */}
      <div className="flex items-center justify-between text-xs font-mono bg-neutral-950 px-4 py-2.5 border border-white/10">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#c5a46d]" />
          <span className="text-neutral-400">Current Cycle:</span>
          <span className="text-white font-bold">{dateRange.label}</span>
          <span className="text-neutral-500 hidden sm:inline">
            (vs prior period {dateRange.prevStart.toLocaleDateString("en-IN")} - {dateRange.prevEnd.toLocaleDateString("en-IN")})
          </span>
        </div>
        <span className="text-[10px] text-[#c5a46d] uppercase tracking-wider">
          {ordersInPeriod.length} Orders in Scope
        </span>
      </div>

      {/* ========================================================= */}
      {/* 9 SUB-NAVIGATION TABS (Part 11) */}
      {/* ========================================================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10 font-mono text-xs">
        {(
          [
            { id: "overview", label: "Executive Overview" },
            { id: "orders", label: "Order Status Analytics" },
            { id: "sales", label: "Sales & Revenue" },
            { id: "profit", label: "Profit & Expenses" },
            { id: "customers", label: "Customer Insights" },
            { id: "loss", label: "Customer Loss Analysis" },
            { id: "products", label: "Product Performance" },
            { id: "inventory", label: "Inventory Valuation" },
            { id: "reports", label: "Reports & CSV Downloads" },
          ] as const
        ).map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2.5 whitespace-nowrap uppercase tracking-wider text-[11px] font-bold transition-all cursor-pointer border ${isActive
                ? "bg-[#c5a46d] text-black border-[#c5a46d] shadow-md shadow-[#c5a46d]/20"
                : "bg-[#0a0a0a] text-neutral-400 border-white/10 hover:border-white/30 hover:text-white"
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW (Part 1) */}
      {/* ========================================================= */}
      {activeSubTab === "overview" && (
        <div className="space-y-8">
          {/* Active Business Alerts Banner */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                ACTIVE BUSINESS ALERTS ({alerts.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-3.5 border font-mono text-xs flex items-start justify-between gap-3 ${alt.type === "danger"
                      ? "bg-red-950/30 border-red-500/40 text-red-200"
                      : alt.type === "warning"
                        ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                        : "bg-blue-950/30 border-blue-500/40 text-blue-200"
                      }`}
                  >
                    <div>
                      <div className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{alt.title}</span>
                      </div>
                      <p className="text-[11px] text-neutral-300 leading-relaxed">{alt.description}</p>
                    </div>
                    {alt.metric && (
                      <span className="px-2 py-1 bg-black/60 border border-white/10 text-[10px] font-bold uppercase shrink-0">
                        {alt.metric}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 16 Metric Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#c5a46d] font-bold">
                16 CORE SALES & PROFIT INDICATORS // CLICK ANY CARD TO INSPECT
              </span>
              <span className="text-[10px] font-mono text-neutral-500">
                vs prior equivalent cycle
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STAT_CARDS.map((card) => {
                const cmp = card.comparison;
                const isPositive = cmp.percentageChange > 0;
                const isNeutral = cmp.percentageChange === 0;

                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      setActiveSubTab(card.targetTab);
                      if ("statusFilter" in card && card.statusFilter) {
                        setOrderTableStatus(card.statusFilter);
                      }
                    }}
                    className="p-4 bg-[#0a0a0a] border border-white/10 hover:border-[#c5a46d] transition-all cursor-pointer group space-y-2 relative"
                  >
                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="text-[10px] font-mono uppercase tracking-widest group-hover:text-white transition-colors">
                        {card.title}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-[#c5a46d] group-hover:translate-x-0.5 transition-all" />
                    </div>

                    <div className="text-2xl font-black font-mono tracking-tight text-white">
                      {card.isCurrency ? formatPrice(Number(card.value)) : card.value}
                    </div>

                    {/* Period-Over-Period Comparison */}
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        {isNeutral ? (
                          <span className="text-neutral-500 font-bold">0.0%</span>
                        ) : isPositive ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />
                            +{cmp.percentageChange}%
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" />
                            {cmp.percentageChange}%
                          </span>
                        )}
                        <span className="text-neutral-500">
                          ({card.isCurrency ? formatPrice(cmp.previous) : cmp.previous})
                        </span>
                      </div>
                      <span className="text-neutral-600 group-hover:text-[#c5a46d] text-[9px] uppercase tracking-widest">
                        Details &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TrendAreaChart
                title="Revenue vs Lost Cancellation Trajectory"
                subtitle="SALES VOLUME & ATTRITION IN SELECTED CYCLE"
                data={salesTrendData}
                valueLabel="Delivered Sales"
                secondaryLabel="Cancelled Losses"
                accentColor="#c5a46d"
                secondaryColor="#ef4444"
              />
            </div>
            <div>
              <DistributionDonutChart
                title="Order Status Portfolio"
                subtitle="FULL ORDER LIFECYCLE RATIOS"
                data={orderStatusDonutData}
                totalLabel="Total Orders"
              />
            </div>
          </div>

          {/* Secondary Visual Charts: Reasons & Margins */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HorizontalBarRankingChart
              title="Top Cancellation Drivers"
              subtitle="STANDARDIZED REASONING DISTRIBUTION"
              items={cancellationReasonsBarData}
              emptyMessage="Zero cancellations recorded in this cycle."
            />
            <FinancialComparisonBarChart
              title="Audited Financial Realization"
              subtitle="GROSS REVENUE VS COGS VS EXPENSES VS NET PROFIT"
              data={financialComparisonData}
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ORDER STATUS ANALYTICS (Part 3) */}
      {/* ========================================================= */}
      {activeSubTab === "orders" && (
        <div className="space-y-6">
          {/* Status Breakdown Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
            {(
              [
                { id: "all", label: "All Orders", count: metrics.allOrders.current },
                { id: "delivered", label: "Delivered", count: metrics.deliveredOrders.current, color: "text-emerald-400" },
                { id: "confirmed", label: "Confirmed", count: metrics.confirmedOrders.current, color: "text-amber-400" },
                { id: "processing", label: "Processing", count: metrics.processingOrders.current, color: "text-purple-400" },
                { id: "shipped", label: "Shipped", count: metrics.shippedOrders.current, color: "text-blue-400" },
                { id: "pending", label: "Pending", count: metrics.pendingOrders.current, color: "text-[#c5a46d]" },
                { id: "cancelled", label: "Cancelled", count: metrics.cancelledOrders.current, color: "text-red-400" },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setOrderTableStatus(st.id);
                  setOrderPage(1);
                }}
                className={`px-3.5 py-2 border uppercase tracking-wider text-[11px] font-bold flex items-center gap-2 transition-all cursor-pointer ${orderTableStatus === st.id
                  ? "bg-[#c5a46d] text-black border-[#c5a46d]"
                  : "bg-[#0a0a0a] text-neutral-400 border-white/10 hover:border-white/30 hover:text-white"
                  }`}
              >
                <span>{st.label}</span>
                <span className="px-1.5 py-0.2 bg-black/40 text-[10px] rounded">{st.count}</span>
              </button>
            ))}
          </div>

          {/* Controls: Search, Sort, Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[#0a0a0a] border border-white/10 font-mono text-xs">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Order ID, Client Name, Email, Phone..."
                value={orderSearchQuery}
                onChange={(e) => {
                  setOrderSearchQuery(e.target.value);
                  setOrderPage(1);
                }}
                className="w-full bg-black border border-white/15 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a46d]"
              />
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 text-[11px]">Sort:</span>
              <select
                value={orderSortBy}
                onChange={(e) => setOrderSortBy(e.target.value as "date" | "amount" | "items")}
                className="bg-black border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#c5a46d] cursor-pointer"
              >
                <option value="date">Order Date</option>
                <option value="amount">Total Amount</option>
                <option value="items">Item Count</option>
              </select>
              <button
                onClick={() => setOrderSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="px-2.5 py-1.5 bg-black border border-white/15 text-neutral-400 hover:text-white cursor-pointer"
              >
                {orderSortDir === "desc" ? "DESC ↓" : "ASC ↑"}
              </button>

              {/* Direct CSV Export for currently filtered status */}
              <button
                onClick={() => exportOrdersCSV(ordersInPeriod, orderTableStatus, dateRange.label)}
                className="px-3.5 py-1.5 bg-[#c5a46d] text-black font-extrabold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#d4b57e] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto border border-white/10 bg-[#0a0a0a]">
            <table className="w-full text-left font-mono text-xs text-neutral-300">
              <thead className="bg-black border-b border-white/10 text-[10px] text-neutral-400 uppercase tracking-widest">
                <tr>
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Patron / Client</th>
                  <th className="p-3.5">Date (IST)</th>
                  <th className="p-3.5">product</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Delivery Destination</th>
                  <th className="p-3.5">Cancellation Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-neutral-500 font-mono text-xs">
                      No matching orders found in the selected date cycle.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((ord) => {
                    const addr = ord.shipping_address as Record<string, string> | undefined;
                    const destination = addr
                      ? `${addr.city || ""}, ${addr.state || ""} ${addr.postal_code || addr.postalCode || ""}`
                      : "Direct Delivery";

                    const itemsCount = (ord.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
                    const itemsPreview = (ord.items || []).map((it) => it.product_name).join(", ");

                    return (
                      <tr
                        key={ord.id}
                        className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => onNavigateToOrder && onNavigateToOrder(ord.id)}
                      >
                        <td className="p-3.5 font-bold text-[#c5a46d]">
                          {ord.order_number}
                        </td>
                        <td className="p-3.5">
                          <span className="text-white block font-bold">{ord.customer_name}</span>
                          <span className="text-[11px] text-neutral-500 block truncate max-w-[160px]">
                            {ord.customer_email}
                          </span>
                        </td>
                        <td className="p-3.5 text-neutral-400 whitespace-nowrap text-[11px]">
                          {new Date(ord.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-3.5">
                          <span className="text-white font-bold block">{itemsCount} units</span>
                          <span className="text-[10px] text-neutral-500 block truncate max-w-[160px]">
                            {itemsPreview || "Custom Piece"}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-white whitespace-nowrap">
                          {formatPrice(ord.total_amount)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider inline-block border ${ord.status === "delivered"
                              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                              : ord.status === "cancelled"
                                ? "bg-red-950/60 border-red-500/40 text-red-400"
                                : ord.status === "confirmed"
                                  ? "bg-amber-950/60 border-amber-500/40 text-amber-400"
                                  : ord.status === "shipped"
                                    ? "bg-blue-950/60 border-blue-500/40 text-blue-400"
                                    : ord.status === "processing"
                                      ? "bg-purple-950/60 border-purple-500/40 text-purple-400"
                                      : "bg-neutral-900 border-white/20 text-[#c5a46d]"
                              }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-[11px] text-neutral-400 whitespace-nowrap">
                          {ord.payment_method || "COD"}
                        </td>
                        <td className="p-3.5 text-[11px] text-neutral-400 truncate max-w-[180px]">
                          {destination}
                        </td>
                        <td className="p-3.5 text-[11px]">
                          {ord.status === "cancelled" ? (
                            <div>
                              <span className="text-red-400 block font-bold">
                                {ord.cancellation_reason || "Unrecorded"}
                              </span>
                              {ord.cancellation_notes && (
                                <span className="text-neutral-500 text-[10px] block truncate max-w-[140px]">
                                  {ord.cancellation_notes}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-neutral-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>
              Showing {(orderPage - 1) * ordersPerPage + 1} -{" "}
              {Math.min(orderPage * ordersPerPage, filteredTableOrders.length)} of {filteredTableOrders.length} orders
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={orderPage <= 1}
                onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                className="p-1.5 bg-black border border-white/15 disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#c5a46d] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white font-bold px-2">
                Page {orderPage} of {totalPages}
              </span>
              <button
                disabled={orderPage >= totalPages}
                onClick={() => setOrderPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 bg-black border border-white/15 disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#c5a46d] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SALES & REVENUE DEEP DIVE (Part 2) */}
      {/* ========================================================= */}
      {activeSubTab === "sales" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1 font-mono">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Gross Sales Realized</span>
              <span className="text-2xl font-black text-emerald-400">{formatPrice(profit.grossSalesRevenue)}</span>
              <span className="text-[10px] text-neutral-400 block truncate">
                Online: {formatPrice(profit.onlineSalesRevenue || 0)} · COD: {formatPrice(profit.offlineSalesRevenue || 0)}
              </span>
            </div>

            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1 font-mono">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Discounts Applied</span>
              <span className="text-2xl font-black text-amber-400">{formatPrice(profit.discountsTotal)}</span>
              <span className="text-[10px] text-neutral-400 block">Promotions & VIP concessions</span>
            </div>

            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1 font-mono">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Average Order Value (AOV)</span>
              <span className="text-2xl font-black text-[#c5a46d]">{formatPrice(metrics.averageOrderValue.current)}</span>
              <span className="text-[10px] text-neutral-400 block">Per fulfilled delivery run</span>
            </div>

            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1 font-mono">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">GST Liability (12% Incl.)</span>
              <span className="text-2xl font-black text-cyan-400">{formatPrice(profit.taxLiabilityGst)}</span>
              <span className="text-[10px] text-neutral-400 block">Government tax (excluded from profit)</span>
            </div>
          </div>

          <TrendAreaChart
            title="Sales Revenue Trajectory"
            subtitle="CUMULATIVE INCOME IN SELECTED REPORTING CYCLE"
            data={salesTrendData}
            valueLabel="Delivered Sales"
            accentColor="#c5a46d"
          />

          <div className="flex justify-end">
            <button
              onClick={() =>
                exportPeriodicSalesReportCSV(period, dateRange.label, ordersInPeriod, profit, lossMetrics)
              }
              className="px-4 py-2.5 bg-[#c5a46d] hover:bg-[#d4b57e] text-black font-extrabold text-xs uppercase font-mono tracking-widest flex items-center gap-2 cursor-pointer shadow-lg shadow-[#c5a46d]/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Complete {period.toUpperCase()} Sales Report CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: PROFIT & EXPENSES ENGINE (Part 4) */}
      {/* ========================================================= */}
      {activeSubTab === "profit" && (
        <div className="space-y-8 font-mono">
          {/* Missing COGS Warning */}
          {profit.isCogsEstimated && (
            <div className="p-4 bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider block">Profit Incomplete / Estimated</span>
                  <span className="text-xs text-neutral-300">
                    {profit.cogsMissingCount} delivered garments do not have an internal production cost price recorded. Update cost prices below to verify 100% audited margins.
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 bg-black border border-amber-500/50 text-[10px] font-bold uppercase shrink-0">
                COGS Partial
              </span>
            </div>
          )}

          {/* Audited Accounting Waterfall */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest">1. Gross Realized Sales</span>
              <div className="text-2xl font-black text-white">{formatPrice(profit.grossSalesRevenue)}</div>
              <span className="text-[10px] text-neutral-500">
                Online ({formatPrice(profit.onlineSalesRevenue || 0)}) + COD ({formatPrice(profit.offlineSalesRevenue || 0)})
              </span>
            </div>

            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-amber-400 uppercase tracking-widest">2. Total COGS (Product Cost)</span>
              <div className="text-2xl font-black text-amber-400">-{formatPrice(profit.cogsTotal)}</div>
              <span className="text-[10px] text-neutral-500">Cost of goods manufactured</span>
            </div>

            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-red-400 uppercase tracking-widest">3. Operating Expenses</span>
              <div className="text-2xl font-black text-red-400">-{formatPrice(profit.totalOperatingExpenses)}</div>
              <span className="text-[10px] text-neutral-500">Shipping, packaging & operations</span>
            </div>

            <div className="p-5 bg-[#0a0a0a] border border-[#c5a46d]/40 space-y-1 bg-gradient-to-br from-neutral-950 to-[#0a0a0a]">
              <span className="text-[10px] text-[#c5a46d] uppercase tracking-widest font-bold">4. Realized Net Profit</span>
              <div className={`text-2xl font-black ${profit.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatPrice(profit.netProfit)}
              </div>
              <span className="text-[10px] text-neutral-400">
                Margin: <strong className="text-white">{profit.profitMarginPercent}%</strong>
              </span>
            </div>
          </div>

          {/* Product Cost Price Manager Section */}
          <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Internal Product Manufacturing Cost Manager
                </h3>
                <span className="text-[11px] text-neutral-400">
                  Manage confidential internal cost prices. Selling prices remain customer-facing.
                </span>
              </div>
              <span className="text-[10px] text-[#c5a46d] uppercase tracking-widest">
                {analyticsProducts.length} Products in Database
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black text-[10px] text-neutral-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Selling Price (Retail)</th>
                    <th className="p-3">Cost Price (COGS)</th>
                    <th className="p-3">Gross Margin</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {analyticsProducts.map((p) => {
                    const isEditing = editingCostProdId === p.id;
                    const costVal = p.cost_price ?? 0;
                    const marginAmt = p.price - costVal;
                    const marginPct = p.price > 0 ? ((marginAmt / p.price) * 100).toFixed(1) : "0";

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-bold text-white">{p.name}</td>
                        <td className="p-3 text-neutral-400">{p.category}</td>
                        <td className="p-3 font-bold text-[#c5a46d]">{formatPrice(p.price)}</td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-neutral-500">₹</span>
                              <input
                                type="number"
                                autoFocus
                                value={editCostValue}
                                onChange={(e) => setEditCostValue(e.target.value)}
                                className="w-24 bg-black border border-[#c5a46d] px-2 py-1 text-xs text-white focus:outline-none"
                              />
                            </div>
                          ) : p.cost_price !== null && p.cost_price !== undefined && p.cost_price > 0 ? (
                            <span className="text-white font-bold">{formatPrice(p.cost_price)}</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-950/60 border border-red-500/40 text-red-300 text-[10px]">
                              Missing
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {p.cost_price ? (
                            <span className="text-emerald-400 font-bold">
                              {marginPct}% (₹{marginAmt.toLocaleString("en-IN")})
                            </span>
                          ) : (
                            <span className="text-neutral-600">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={isUpdatingCost}
                                onClick={() => handleSaveProductCost(p.id)}
                                className="px-2.5 py-1 bg-[#c5a46d] text-black font-bold text-[10px] uppercase cursor-pointer"
                              >
                                {isUpdatingCost ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingCostProdId(null)}
                                className="px-2 py-1 bg-neutral-800 text-neutral-400 hover:text-white text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingCostProdId(p.id);
                                setEditCostValue(String(p.cost_price || ""));
                              }}
                              className="px-2.5 py-1 bg-black border border-white/20 hover:border-[#c5a46d] text-white hover:text-[#c5a46d] text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                            >
                              Edit Cost
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operating Expenses Manager Section */}
          <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Operating Expenses & Studio Overhead
                </h3>
                <span className="text-[11px] text-neutral-400">
                  Record logistics, packaging, and operating costs for accurate net profit accounting.
                </span>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="px-3.5 py-2 bg-[#c5a46d] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#d4b57e] cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Record New Expense</span>
              </button>
            </div>

            {/* Expenses Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black text-[10px] text-neutral-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-3">Title / Description</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Expense Date</th>
                    <th className="p-3">Amount (INR)</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-neutral-500 font-mono text-xs">
                        No operating expenses recorded yet. Click &quot;Record New Expense&quot; above to log studio overhead.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-bold text-white">{exp.title}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-neutral-900 border border-white/10 text-neutral-300 text-[10px] uppercase">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-3 text-neutral-400">{exp.expense_date}</td>
                        <td className="p-3 font-bold text-red-400">{formatPrice(exp.amount)}</td>
                        <td className="p-3 text-neutral-500 truncate max-w-[200px]">{exp.notes || "-"}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => exportRevenueAndProfitCSV(dateRange.label, ordersInPeriod, profit, expenses)}
                className="px-4 py-2.5 bg-black border border-white/20 text-[#c5a46d] hover:border-[#c5a46d] font-bold text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Revenue & Profit Report CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: CUSTOMER INSIGHTS & COHORTS (Part 10 B) */}
      {/* ========================================================= */}
      {activeSubTab === "customers" && (
        <div className="space-y-6 font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Total Patrons Active</span>
              <span className="text-2xl font-black text-white">{metrics.totalCustomers.current}</span>
              <span className="text-[10px] text-neutral-400 block">Placed orders in this cycle</span>
            </div>
            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">New Patrons Acquired</span>
              <span className="text-2xl font-black text-teal-400">{metrics.newCustomers.current}</span>
              <span className="text-[10px] text-neutral-400 block">First ever purchase on NOIR</span>
            </div>
            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Returning Patrons</span>
              <span className="text-2xl font-black text-indigo-400">{metrics.returningCustomers.current}</span>
              <span className="text-[10px] text-neutral-400 block">Previously registered buyers</span>
            </div>
            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Repeat Purchase Rate</span>
              <span className="text-2xl font-black text-[#c5a46d]">{metrics.repeatPurchaseRate.current}%</span>
              <span className="text-[10px] text-neutral-400 block">Placed multiple orders</span>
            </div>
          </div>

          {/* Cohorts Table */}
          <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Client Cohort Segmentation & Lifetime Value
                </h3>
                <span className="text-[11px] text-neutral-400">
                  Classified into New, Repeat, At-Risk, Inactive, and Frequent Cancellers based on ordering cadence.
                </span>
              </div>
              <button
                onClick={() => exportCustomerInsightsCSV(dateRange.label, cohorts)}
                className="px-3.5 py-1.5 bg-[#c5a46d] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#d4b57e] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Client CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black text-[10px] text-neutral-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-3">Patron Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Segment</th>
                    <th className="p-3">Total Orders</th>
                    <th className="p-3">Fulfilled</th>
                    <th className="p-3">Cancelled</th>
                    <th className="p-3">Total Realized Spend</th>
                    <th className="p-3">Last Order Date</th>
                    <th className="p-3">Days Inactive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cohorts.map((c, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-bold text-white">{c.name}</td>
                      <td className="p-3 text-neutral-400 truncate max-w-[180px]">{c.email}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${c.segment === "Repeat"
                            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                            : c.segment === "New"
                              ? "bg-teal-950/60 border-teal-500/40 text-teal-300"
                              : c.segment === "At-Risk"
                                ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                                : c.segment === "Frequent Canceller"
                                  ? "bg-red-950/60 border-red-500/40 text-red-300"
                                  : "bg-neutral-900 border-white/10 text-neutral-400"
                            }`}
                        >
                          {c.segment}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">{c.totalOrders}</td>
                      <td className="p-3 text-emerald-400 font-bold">{c.deliveredOrders}</td>
                      <td className="p-3 text-red-400 font-bold">{c.cancelledOrders}</td>
                      <td className="p-3 font-bold text-[#c5a46d]">{formatPrice(c.totalSpent)}</td>
                      <td className="p-3 text-neutral-400">
                        {new Date(c.lastOrderDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3 text-neutral-500">{c.daysSinceLastOrder} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: CUSTOMER LOSS & CANCELLATION ANALYSIS (Part 5) */}
      {/* ========================================================= */}
      {activeSubTab === "loss" && (
        <div className="space-y-8 font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Cancelled Orders</span>
              <span className="text-2xl font-black text-red-400">{lossMetrics.totalCancelledOrders}</span>
              <span className="text-[10px] text-neutral-400 block">{lossMetrics.cancellationRate}% Cancellation Rate</span>
            </div>
            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Lost Gross Value</span>
              <span className="text-2xl font-black text-red-400">{formatPrice(lossMetrics.totalCancelledValue)}</span>
              <span className="text-[10px] text-neutral-400 block">Total potential revenue forfeited</span>
            </div>
            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Unique Cancellers</span>
              <span className="text-2xl font-black text-white">{lossMetrics.uniqueCustomersCancelled}</span>
              <span className="text-[10px] text-neutral-400 block">
                {lossMetrics.customersWithMultipleCancellations} multiple cancellers
              </span>
            </div>
            <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Post-Cancel Retention</span>
              <span className="text-2xl font-black text-[#c5a46d]">
                {lossMetrics.retentionAfterCancellation.retentionRate}%
              </span>
              <span className="text-[10px] text-neutral-400 block">
                {lossMetrics.retentionAfterCancellation.customersWhoReturned} patrons re-ordered
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HorizontalBarRankingChart
              title="Cancellation Reasons Breakdown"
              subtitle="STANDARDIZED RETURN REASONS"
              items={cancellationReasonsBarData}
              emptyMessage="Zero cancellations logged in this period."
            />

            {/* Product-Wise Cancellation Loss Table */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3">
              <div className="mb-2">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
                  GARMENT ATTRITION LEADERBOARD
                </span>
                <h4 className="text-sm font-bold text-white uppercase font-display tracking-wide">
                  Most Frequently Cancelled Product
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black text-[10px] text-neutral-400 uppercase tracking-widest">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">Cancelled Units</th>
                      <th className="p-2.5">Lost Value</th>
                      <th className="p-2.5">Cancel Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {lossMetrics.productWiseCancellations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-neutral-500">
                          No garment cancellations in this period.
                        </td>
                      </tr>
                    ) : (
                      lossMetrics.productWiseCancellations.slice(0, 6).map((p, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold text-white truncate max-w-[160px]">{p.productName}</td>
                          <td className="p-2.5 text-red-400 font-bold">{p.cancelledCount}</td>
                          <td className="p-2.5 text-neutral-300">{formatPrice(p.cancelledValue)}</td>
                          <td className="p-2.5 text-amber-400">{p.cancellationRate}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => exportCustomerLossCSV(dateRange.label, ordersInPeriod, lossMetrics)}
              className="px-4 py-2.5 bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900/60 font-bold text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Full Customer Loss Report CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: PRODUCT PERFORMANCE (Part 10 A) */}
      {/* ========================================================= */}
      {activeSubTab === "products" && (
        <div className="space-y-6 font-mono">
          <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Product Profitability & Unit Sales
                </h3>
                <span className="text-[11px] text-neutral-400">
                  Delivered revenue, production cost, profit margins, and cancellation rate per garment.
                </span>
              </div>
              <button
                onClick={() => exportProductPerformanceCSV(dateRange.label, productPerformance.allProducts)}
                className="px-3.5 py-1.5 bg-[#c5a46d] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#d4b57e] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Product CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black text-[10px] text-neutral-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Retail Price</th>
                    <th className="p-3">Units Sold</th>
                    <th className="p-3">Gross Revenue</th>
                    <th className="p-3">Production COGS</th>
                    <th className="p-3">Gross Profit</th>
                    <th className="p-3">Margin %</th>
                    <th className="p-3">Cancelled Units</th>
                    <th className="p-3">Cancel Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {productPerformance.allProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-neutral-500 font-mono text-xs">
                        No product sales recorded in the selected cycle.
                      </td>
                    </tr>
                  ) : (
                    productPerformance.allProducts.map((p, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-bold text-white">{p.productName}</td>
                        <td className="p-3 text-[#c5a46d]">{formatPrice(p.price)}</td>
                        <td className="p-3 font-bold text-white">{p.unitsSold}</td>
                        <td className="p-3 font-bold text-emerald-400">{formatPrice(p.revenue)}</td>
                        <td className="p-3 text-neutral-400">{formatPrice(p.cost)}</td>
                        <td className="p-3 font-bold text-white">{formatPrice(p.profit)}</td>
                        <td className="p-3">
                          <span
                            className={`font-bold ${p.margin >= 40
                              ? "text-emerald-400"
                              : p.margin >= 20
                                ? "text-[#c5a46d]"
                                : "text-red-400"
                              }`}
                          >
                            {p.margin}%
                          </span>
                        </td>
                        <td className="p-3 text-red-400">{p.cancelledUnits}</td>
                        <td className="p-3 text-neutral-400">{p.cancellationRate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 8: INVENTORY VALUATION & INSIGHTS (Part 10 C) */}
      {/* ========================================================= */}
      {activeSubTab === "inventory" && (
        <div className="space-y-6 font-mono">
          {(() => {
            const totalStockUnits = analyticsProducts.reduce((sum, p) => sum + (p.stock_quantity ?? 0), 0);
            const totalRetailValuation = analyticsProducts.reduce(
              (sum, p) => sum + p.price * (p.stock_quantity ?? 0),
              0
            );
            const totalCostValuation = analyticsProducts.reduce(
              (sum, p) => sum + (p.cost_price ?? 0) * (p.stock_quantity ?? 0),
              0
            );
            const lowStockCount = analyticsProducts.filter((p) => (p.stock_quantity ?? 0) <= 5).length;
            const outOfStockCount = analyticsProducts.filter((p) => (p.stock_quantity ?? 0) === 0).length;

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Total Runway Units</span>
                    <span className="text-2xl font-black text-white">{totalStockUnits}</span>
                    <span className="text-[10px] text-neutral-400 block">{analyticsProducts.length} product Catalogued</span>
                  </div>

                  <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Retail Inventory Value</span>
                    <span className="text-2xl font-black text-[#c5a46d]">{formatPrice(totalRetailValuation)}</span>
                    <span className="text-[10px] text-neutral-400 block">At customer selling prices</span>
                  </div>

                  <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Total Cost Valuation (COGS)</span>
                    <span className="text-2xl font-black text-amber-400">{formatPrice(totalCostValuation)}</span>
                    <span className="text-[10px] text-neutral-400 block">Based on recorded manufacturing cost</span>
                  </div>

                  <div className="p-4 bg-[#0a0a0a] border border-white/10 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Low / Depleted Stock</span>
                    <span className="text-2xl font-black text-red-400">{lowStockCount} Low ({outOfStockCount} Out)</span>
                    <span className="text-[10px] text-neutral-400 block">Threshold &le; 5 units</span>
                  </div>
                </div>

                {/* Stock Table */}
                <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-white/10 pb-3">
                    Store Stock Holdings & Restock Velocity
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black text-[10px] text-neutral-400 uppercase tracking-widest">
                        <tr>
                          <th className="p-3">Product</th>
                          <th className="p-3">Available Units</th>
                          <th className="p-3">Unit Cost</th>
                          <th className="p-3">Total Cost Value</th>
                          <th className="p-3">Retail Price</th>
                          <th className="p-3">Total Retail Value</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {analyticsProducts.map((p) => {
                          const stock = p.stock_quantity ?? 0;
                          const cost = p.cost_price ?? 0;
                          return (
                            <tr key={p.id} className="hover:bg-white/[0.02]">
                              <td className="p-3 font-bold text-white">{p.name}</td>
                              <td className="p-3 font-bold text-white">{stock}</td>
                              <td className="p-3 text-neutral-400">{cost > 0 ? formatPrice(cost) : "Missing"}</td>
                              <td className="p-3 font-bold text-amber-400">{formatPrice(cost * stock)}</td>
                              <td className="p-3 text-[#c5a46d]">{formatPrice(p.price)}</td>
                              <td className="p-3 font-bold text-white">{formatPrice(p.price * stock)}</td>
                              <td className="p-3">
                                {stock === 0 ? (
                                  <span className="px-2 py-0.5 bg-red-950/80 border border-red-500/40 text-red-400 text-[10px] uppercase font-bold">
                                    Depleted
                                  </span>
                                ) : stock <= 5 ? (
                                  <span className="px-2 py-0.5 bg-amber-950/80 border border-amber-500/40 text-amber-400 text-[10px] uppercase font-bold">
                                    Low Stock
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] uppercase font-bold">
                                    In Stock
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 9: REPORTS & CSV DOWNLOADS HUB (Part 7) */}
      {/* ========================================================= */}
      {activeSubTab === "reports" && (
        <div className="space-y-6 font-mono">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#c5a46d] font-bold block mb-1">
              OFFICIAL CSV EXPORT SUITE // UTF-8 BOM ENABLED & FORMULA-SAFE
            </span>
            <h3 className="text-xl font-bold uppercase tracking-tight text-white">
              Instant Business Intelligence & Orders CSV Exports
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              All exports dynamically respect the current reporting cycle ({dateRange.label}) and active database records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. All Orders CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">ORDER LEDGER</span>
                <h4 className="text-sm font-bold text-white uppercase">All Orders CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Complete database export of all orders across every status with customer and product breakdowns.
                </p>
              </div>
              <button
                onClick={() => exportOrdersCSV(ordersInPeriod, "all", dateRange.label)}
                className="w-full py-2.5 bg-black border border-white/20 hover:border-[#c5a46d] text-white hover:text-[#c5a46d] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All Orders CSV</span>
              </button>
            </div>

            {/* 2. Delivered Orders CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest block">FULFILLED ORDERS</span>
                <h4 className="text-sm font-bold text-white uppercase">Delivered Orders CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  All successfully delivered orders (Online & COD) constituting realized business revenue.
                </p>
              </div>
              <button
                onClick={() => exportOrdersCSV(ordersInPeriod, "delivered", dateRange.label)}
                className="w-full py-2.5 bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/40 text-emerald-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Delivered CSV</span>
              </button>
            </div>

            {/* 3. Cancelled Orders CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-red-400 uppercase tracking-widest block">CUSTOMER ATTRITION</span>
                <h4 className="text-sm font-bold text-white uppercase">Cancelled Orders CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Itemized cancelled orders log including customer cancellation reasons and additional explanations.
                </p>
              </div>
              <button
                onClick={() => exportOrdersCSV(ordersInPeriod, "cancelled", dateRange.label)}
                className="w-full py-2.5 bg-red-950/40 border border-red-500/40 hover:bg-red-900/40 text-red-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Cancelled CSV</span>
              </button>
            </div>

            {/* 4. Pending Orders CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#c5a46d] uppercase tracking-widest block">AWAITING CONFIRMATION</span>
                <h4 className="text-sm font-bold text-white uppercase">Pending Orders CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Orders newly placed via Cash on Delivery awaiting customer confirmation.
                </p>
              </div>
              <button
                onClick={() => exportOrdersCSV(ordersInPeriod, "pending", dateRange.label)}
                className="w-full py-2.5 bg-black border border-white/20 hover:border-[#c5a46d] text-white hover:text-[#c5a46d] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Pending CSV</span>
              </button>
            </div>

            {/* 5. Processing Orders CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-purple-400 uppercase tracking-widest block">ORDER PREPARATION</span>
                <h4 className="text-sm font-bold text-white uppercase">Processing Orders CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Confirmed orders currently being tailored, inspected, and packaged for dispatch.
                </p>
              </div>
              <button
                onClick={() => exportOrdersCSV(ordersInPeriod, "processing", dateRange.label)}
                className="w-full py-2.5 bg-black border border-white/20 hover:border-purple-400 text-white hover:text-purple-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Processing CSV</span>
              </button>
            </div>

            {/* 6. Shipped Orders CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-blue-400 uppercase tracking-widest block">IN TRANSIT</span>
                <h4 className="text-sm font-bold text-white uppercase">Shipped Orders CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Dispatched orders in transit with Blue Dart Express India tracking codes.
                </p>
              </div>
              <button
                onClick={() => exportOrdersCSV(ordersInPeriod, "shipped", dateRange.label)}
                className="w-full py-2.5 bg-black border border-white/20 hover:border-blue-400 text-white hover:text-blue-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Shipped CSV</span>
              </button>
            </div>

            {/* 7. Confirmed Orders CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-widest block">VERIFIED ORDERS</span>
                <h4 className="text-sm font-bold text-white uppercase">Confirmed Orders CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Orders officially verified by patron or admin ready for fulfillment queue.
                </p>
              </div>
              <button
                onClick={() => exportOrdersCSV(ordersInPeriod, "confirmed", dateRange.label)}
                className="w-full py-2.5 bg-black border border-white/20 hover:border-amber-400 text-white hover:text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Confirmed CSV</span>
              </button>
            </div>

            {/* 8. Periodic Sales Report CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#c5a46d] uppercase tracking-widest block">PERIODIC AUDIT</span>
                <h4 className="text-sm font-bold text-white uppercase">{period.toUpperCase()} Sales Report CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Consolidated periodic statement with status conversions, cancellation reasons, and net profit.
                </p>
              </div>
              <button
                onClick={() =>
                  exportPeriodicSalesReportCSV(period, dateRange.label, ordersInPeriod, profit, lossMetrics)
                }
                className="w-full py-2.5 bg-[#c5a46d] text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#d4b57e] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {period.toUpperCase()} Report CSV</span>
              </button>
            </div>

            {/* 9. Revenue & Profit Report CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest block">P&L STATEMENT</span>
                <h4 className="text-sm font-bold text-white uppercase">Revenue & Profit Report CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Full profit accounting breakdown: Gross Sales, COGS, Expenses by category, and Net Margin.
                </p>
              </div>
              <button
                onClick={() => exportRevenueAndProfitCSV(dateRange.label, ordersInPeriod, profit, expenses)}
                className="w-full py-2.5 bg-black border border-white/20 hover:border-emerald-400 text-white hover:text-emerald-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Profit CSV</span>
              </button>
            </div>

            {/* 10. Customer Loss Report CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-red-400 uppercase tracking-widest block">CHURN INTELLIGENCE</span>
                <h4 className="text-sm font-bold text-white uppercase">Customer Loss Report CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Cancellation reasons, unique cancellers, product-wise cancellation rates, and patron retention.
                </p>
              </div>
              <button
                onClick={() => exportCustomerLossCSV(dateRange.label, ordersInPeriod, lossMetrics)}
                className="w-full py-2.5 bg-black border border-white/20 hover:border-red-400 text-white hover:text-red-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Loss CSV</span>
              </button>
            </div>

            {/* 11. Product Performance CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-purple-400 uppercase tracking-widest block">CATALOGUE AUDIT</span>
                <h4 className="text-sm font-bold text-white uppercase">Product Performance CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Sales units, gross revenue, product profit margins, and return/cancellation rates per product.
                </p>
              </div>
              <button
                onClick={() => exportProductPerformanceCSV(dateRange.label, productPerformance.allProducts)}
                className="w-full py-2.5 bg-black border border-white/20 hover:border-purple-400 text-white hover:text-purple-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Products CSV</span>
              </button>
            </div>

            {/* 12. Customer Insights CSV */}
            <div className="p-5 bg-[#0a0a0a] border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest block">CLIENT COHORTS</span>
                <h4 className="text-sm font-bold text-white uppercase">Customer Insights CSV</h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Client lifetime ordering stats, segment classifications, days inactive, and contact details.
                </p>
              </div>
              <button
                onClick={() => exportCustomerInsightsCSV(dateRange.label, cohorts)}
                className="w-full py-2.5 bg-black border border-white/20 hover:border-cyan-400 text-white hover:text-cyan-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Clients CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RECORD OPERATING EXPENSE MODAL */}
      {/* ========================================================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-[350] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#c5a46d] max-w-md w-full p-6 space-y-4 font-mono shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#c5a46d]" />
                Record Studio Operating Expense
              </h3>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="text-neutral-500 hover:text-white cursor-pointer text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateExpenseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] uppercase text-neutral-400 block mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Blue Dart Courier Dispatch Invoice #902"
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  className="w-full bg-black border border-white/20 p-2.5 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-neutral-400 block mb-1">Category *</label>
                  <select
                    value={newExpCategory}
                    onChange={(e) => setNewExpCategory(e.target.value as OperatingExpenseCategory)}
                    className="w-full bg-black border border-white/20 p-2.5 text-white focus:outline-none focus:border-[#c5a46d] cursor-pointer"
                  >
                    <option value="shipping">Logistics & Shipping</option>
                    <option value="packaging">Luxury Packaging</option>
                    <option value="payment_gateway">Payment & COD Gateway</option>
                    <option value="marketing">Brand Marketing</option>
                    <option value="operations">Studio Operations</option>
                    <option value="salaries">Artisan Salaries</option>
                    <option value="other">Other Overhead</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-neutral-400 block mb-1">Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 4500"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    className="w-full bg-black border border-white/20 p-2.5 text-white focus:outline-none focus:border-[#c5a46d]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-neutral-400 block mb-1">Expense Date *</label>
                <input
                  type="date"
                  required
                  value={newExpDate}
                  onChange={(e) => setNewExpDate(e.target.value)}
                  className="w-full bg-black border border-white/20 p-2.5 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-neutral-400 block mb-1">Notes / Vendor / Receipt</label>
                <textarea
                  rows={2}
                  placeholder="Optional reference details..."
                  value={newExpNotes}
                  onChange={(e) => setNewExpNotes(e.target.value)}
                  className="w-full bg-black border border-white/20 p-2 text-white focus:outline-none focus:border-[#c5a46d]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 bg-neutral-900 border border-white/10 text-neutral-400 hover:text-white uppercase font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c5a46d] hover:bg-[#d4b57e] text-black uppercase font-extrabold text-xs cursor-pointer shadow-lg shadow-[#c5a46d]/20"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

