"use client";

import React, { useState } from "react";
import { formatPrice } from "@/lib/currency";

// -------------------------------------------------------------
// 1. AREA / LINE CHART (Weekly, Monthly, Yearly Revenue & Profit Trends)
// -------------------------------------------------------------
interface AreaChartProps {
  data: { label: string; value: number; secondaryValue?: number; tooltip?: string }[];
  title: string;
  subtitle?: string;
  height?: number;
  currency?: boolean;
  valueLabel?: string;
  secondaryLabel?: string;
  accentColor?: string;
  secondaryColor?: string;
}

export function TrendAreaChart({
  data,
  title,
  subtitle,
  height = 240,
  currency = true,
  valueLabel = "Revenue",
  secondaryLabel,
  accentColor = "#c5a46d",
  secondaryColor = "#10b981",
}: AreaChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-6 bg-[#0a0a0a] border border-white/10 rounded flex flex-col justify-center items-center h-64 text-neutral-500 font-mono text-xs">
        No trend records available for this cycle
      </div>
    );
  }

  const padding = { top: 25, right: 30, bottom: 35, left: 55 };
  const width = 640;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.value, d.secondaryValue || 0)),
    1000
  );

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - (d.value / maxValue) * chartHeight;
    return { x, y, ...d };
  });

  const secondaryPoints = data
    .filter((d) => d.secondaryValue !== undefined)
    .map((d, i) => {
      const x = padding.left + (i / Math.max(1, data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.secondaryValue || 0) / maxValue) * chartHeight;
      return { x, y, ...d };
    });

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ""
  );

  const areaD = `${pathD} L ${points[points.length - 1].x} ${
    padding.top + chartHeight
  } L ${points[0].x} ${padding.top + chartHeight} Z`;

  const secPathD = secondaryPoints.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ""
  );

  return (
    <div className="p-5 bg-[#0a0a0a] border border-white/10 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 block">
            {subtitle || "TRAJECTORY OVERVIEW"}
          </span>
          <h4 className="text-sm font-bold text-white uppercase font-display tracking-wide">{title}</h4>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="text-neutral-400">{valueLabel}</span>
          </div>
          {secondaryLabel && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
              <span className="text-neutral-400">{secondaryLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
            const y = padding.top + chartHeight * r;
            const val = Math.round(maxValue * (1 - r));
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="2 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.3)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {currency ? (val >= 1000 ? `₹${Math.round(val / 1000)}k` : `₹${val}`) : val}
                </text>
              </g>
            );
          })}

          {/* Fill Area */}
          <path d={areaD} fill={`url(#grad-${title.replace(/\s+/g, "")})`} />

          {/* Primary Trend Line */}
          <path d={pathD} fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" />

          {/* Secondary Trend Line (if any) */}
          {secondaryPoints.length > 0 && (
            <path
              d={secPathD}
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* Data Points & Interactivity */}
          {points.map((p, i) => (
            <g
              key={i}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Invisible touch target */}
              <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
              
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIdx === i ? "5" : "3"}
                fill="#050505"
                stroke={accentColor}
                strokeWidth={hoveredIdx === i ? "2.5" : "1.5"}
              />

              {/* X Axis Labels */}
              <text
                x={p.x}
                y={padding.top + chartHeight + 18}
                textAnchor="middle"
                fill={hoveredIdx === i ? "#c5a46d" : "rgba(255,255,255,0.4)"}
                fontSize="9"
                fontFamily="monospace"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-neutral-900/95 border border-[#c5a46d]/40 text-xs font-mono shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-3"
          >
            <span className="text-neutral-400">{points[hoveredIdx].label}:</span>
            <span className="text-[#c5a46d] font-bold">
              {currency ? formatPrice(points[hoveredIdx].value) : points[hoveredIdx].value}
            </span>
            {points[hoveredIdx].secondaryValue !== undefined && (
              <span className="text-emerald-400 font-bold border-l border-white/20 pl-2">
                {currency
                  ? formatPrice(points[hoveredIdx].secondaryValue!)
                  : points[hoveredIdx].secondaryValue}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. DONUT / PIE DISTRIBUTION (Order Statuses & Cohorts)
// -------------------------------------------------------------
interface DonutChartProps {
  title: string;
  subtitle?: string;
  data: { label: string; count: number; color: string; value?: number }[];
  totalLabel?: string;
}

export function DistributionDonutChart({
  title,
  subtitle,
  data,
  totalLabel = "Total Units",
}: DonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  const slices = data
    .filter((d) => d.count > 0)
    .reduce<
      Array<(typeof data)[number] & { percent: number; startAngle: number; endAngle: number }>
    >((acc, d) => {
      const percent = total > 0 ? (d.count / total) * 100 : 0;
      const prevEnd = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
      const startAngle = prevEnd;
      const endAngle = prevEnd + (percent / 100) * 360;
      acc.push({
        ...d,
        percent,
        startAngle,
        endAngle,
      });
      return acc;
    }, []);

  const radius = 65;
  const strokeWidth = 24;
  const center = 90;

  return (
    <div className="p-5 bg-[#0a0a0a] border border-white/10 flex flex-col justify-between">
      <div className="mb-3">
        <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 block">
          {subtitle || "PORTFOLIO ALLOCATION"}
        </span>
        <h4 className="text-sm font-bold text-white uppercase font-display tracking-wide">{title}</h4>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 180 180" className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={strokeWidth}
            />

            {slices.map((slice, i) => {
              const circumference = 2 * Math.PI * radius;
              const strokeDasharray = `${(slice.percent / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((slice.startAngle / 360) * circumference);

              return (
                <circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={hoveredIdx === i ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Central Counter */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl font-black font-mono text-white">
              {hoveredIdx !== null ? slices[hoveredIdx]?.count : total}
            </span>
            <span className="text-[9px] font-mono tracking-widest uppercase text-neutral-400 max-w-[80px] truncate">
              {hoveredIdx !== null ? slices[hoveredIdx]?.label : totalLabel}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full space-y-2 font-mono text-xs">
          {data.map((item, idx) => {
            const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between p-1.5 transition-colors cursor-pointer border ${
                  hoveredIdx === idx
                    ? "bg-white/5 border-white/20 text-white"
                    : "border-transparent text-neutral-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] truncate max-w-[120px]">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">{item.count}</span>
                  <span className="text-neutral-500 text-[10px] w-10 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. HORIZONTAL BAR CHART (Cancellation Reasons & Leaderboards)
// -------------------------------------------------------------
interface BarItem {
  label: string;
  value: number;
  secondaryText?: string;
  color?: string;
}

interface HorizontalBarChartProps {
  title: string;
  subtitle?: string;
  items: BarItem[];
  emptyMessage?: string;
}

export function HorizontalBarRankingChart({
  title,
  subtitle,
  items,
  emptyMessage = "No categorical metrics recorded yet",
}: HorizontalBarChartProps) {
  if (!items || items.length === 0) {
    return (
      <div className="p-6 bg-[#0a0a0a] border border-white/10 flex flex-col justify-center items-center h-64 text-neutral-500 font-mono text-xs">
        {emptyMessage}
      </div>
    );
  }

  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="p-5 bg-[#0a0a0a] border border-white/10 flex flex-col justify-between">
      <div className="mb-4">
        <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 block">
          {subtitle || "RELATIVE FREQUENCY"}
        </span>
        <h4 className="text-sm font-bold text-white uppercase font-display tracking-wide">{title}</h4>
      </div>

      <div className="space-y-3 font-mono">
        {items.slice(0, 8).map((it, idx) => {
          const percent = Math.round((it.value / maxVal) * 100);
          const barColor = it.color || (idx === 0 ? "#c5a46d" : idx === 1 ? "#d6b77e" : "rgba(255,255,255,0.4)");

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 truncate max-w-[200px] text-[11px]">{it.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{it.value}</span>
                  {it.secondaryText && (
                    <span className="text-[10px] text-neutral-500">({it.secondaryText})</span>
                  )}
                </div>
              </div>
              <div className="w-full h-2 bg-neutral-900 border border-white/5 overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${percent}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. COMPARATIVE BAR CHART (Monthly Revenue vs Cost vs Expenses vs Profit)
// -------------------------------------------------------------
interface GroupedBarProps {
  title: string;
  subtitle?: string;
  data: {
    category: string;
    revenue: number;
    cogs: number;
    expenses: number;
    netProfit: number;
  }[];
}

export function FinancialComparisonBarChart({
  title,
  subtitle,
  data,
}: GroupedBarProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-6 bg-[#0a0a0a] border border-white/10 flex flex-col justify-center items-center h-64 text-neutral-500 font-mono text-xs">
        No comparative financial cycles recorded
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.revenue, d.cogs, d.expenses, d.netProfit]),
    1000
  );

  return (
    <div className="p-5 bg-[#0a0a0a] border border-white/10 flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 block">
            {subtitle || "AUDITED FINANCIAL MARGINS"}
          </span>
          <h4 className="text-sm font-bold text-white uppercase font-display tracking-wide">{title}</h4>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#c5a46d]" />
            <span className="text-neutral-400">Gross Sales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-600" />
            <span className="text-neutral-400">COGS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-500/80" />
            <span className="text-neutral-400">Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500" />
            <span className="text-neutral-400">Net Profit</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {data.map((item, idx) => (
          <div key={idx} className="p-3 bg-black border border-white/10 space-y-2 font-mono">
            <span className="text-[11px] font-bold text-white uppercase block pb-1 border-b border-white/10">
              {item.category}
            </span>

            {/* Bars */}
            <div className="space-y-1.5 text-[10px]">
              <div>
                <div className="flex justify-between text-neutral-400 mb-0.5">
                  <span>Sales</span>
                  <span className="text-[#c5a46d] font-bold">{formatPrice(item.revenue)}</span>
                </div>
                <div className="h-1.5 bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full bg-[#c5a46d]"
                    style={{ width: `${Math.round((item.revenue / maxVal) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-0.5">
                  <span>Product Cost (COGS)</span>
                  <span className="text-amber-500 font-bold">{formatPrice(item.cogs)}</span>
                </div>
                <div className="h-1.5 bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full bg-amber-600"
                    style={{ width: `${Math.round((item.cogs / maxVal) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-0.5">
                  <span>Operating Expenses</span>
                  <span className="text-red-400 font-bold">{formatPrice(item.expenses)}</span>
                </div>
                <div className="h-1.5 bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full bg-red-500/80"
                    style={{ width: `${Math.round((item.expenses / maxVal) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-0.5">
                  <span>Net Profit</span>
                  <span className="text-emerald-400 font-bold">{formatPrice(item.netProfit)}</span>
                </div>
                <div className="h-1.5 bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.round((Math.max(0, item.netProfit) / maxVal) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

