import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Package,
  Award,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Boxes,
  Tag,
  BarChart3,
  Sparkles,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Transaction, Product } from '../../types';

interface TopSellingProductsCardProps {
  transactions: Transaction[];
  products?: Product[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  presetLabel?: string;
}

interface ProductSalesAggregate {
  id: string;
  name: string;
  displayName: string;
  sku: string;
  category: string;
  unit: string;
  quantitySold: number;
  revenue: number;
  ordersCount: number;
  currentStock: number;
}

// Color palette for ranking bars
const RANK_COLORS = [
  '#f59e0b', // 1st - Gold / Amber
  '#0ea5e9', // 2nd - Sky Blue
  '#10b981', // 3rd - Emerald
  '#8b5cf6', // 4th - Violet
  '#ec4899', // 5th - Pink
  '#6366f1', // 6th - Indigo
  '#14b8a6', // 7th - Teal
  '#f97316', // 8th - Orange
  '#06b6d4', // 9th - Cyan
  '#a855f7', // 10th - Purple
];

// Helper to format Date to YYYY-MM-DD
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatReadableDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const TopSellingProductsCard: React.FC<TopSellingProductsCardProps> = ({
  transactions,
  products = [],
  startDate,
  endDate,
  presetLabel,
}) => {
  const [metricMode, setMetricMode] = useState<'quantity' | 'revenue'>('quantity');
  const [topLimit, setTopLimit] = useState<number>(10);

  // Map product inventory stocks for quick lookup
  const productStockMap = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      map[p.id] = p.stockQuantity ?? p.stock ?? 0;
    });
    return map;
  }, [products]);

  // Filter transactions within the selected date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return false;
      const txDateStr = toDateStr(txDate);
      return txDateStr >= startDate && txDateStr <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Aggregate item sales
  const { topProducts, totalUnitsSold, totalRevenueFromItems, uniqueProductsCount, topCategory } =
    useMemo(() => {
      const aggMap: Record<string, ProductSalesAggregate> = {};
      let totalQty = 0;
      let totalRev = 0;
      const categoryQtyMap: Record<string, number> = {};

      filteredTransactions.forEach((tx) => {
        if (!tx.items) return;
        tx.items.forEach((item) => {
          const prod = item.product;
          if (!prod) return;

          const key = prod.id || prod.name;
          const qty = item.quantity || 1;
          const itemTotal = item.total || qty * (item.unitPrice || prod.sellingPrice || 0);

          if (!aggMap[key]) {
            const rawName = prod.name || 'Unnamed Product';
            // Truncate long names for chart Y-axis cleanliness
            const truncatedName = rawName.length > 20 ? rawName.slice(0, 18) + '…' : rawName;

            aggMap[key] = {
              id: prod.id || key,
              name: rawName,
              displayName: truncatedName,
              sku: prod.sku || 'N/A',
              category: prod.category || 'General',
              unit: prod.unit || 'pcs',
              quantitySold: 0,
              revenue: 0,
              ordersCount: 0,
              currentStock: productStockMap[prod.id] ?? (prod.stockQuantity ?? 0),
            };
          }

          aggMap[key].quantitySold += qty;
          aggMap[key].revenue += itemTotal;
          aggMap[key].ordersCount += 1;

          totalQty += qty;
          totalRev += itemTotal;

          const cat = prod.category || 'General';
          categoryQtyMap[cat] = (categoryQtyMap[cat] || 0) + qty;
        });
      });

      // Find top category
      let bestCat = 'None';
      let bestCatQty = 0;
      Object.entries(categoryQtyMap).forEach(([cat, q]) => {
        if (q > bestCatQty) {
          bestCatQty = q;
          bestCat = cat;
        }
      });

      // Convert to array and sort according to active metric
      const sorted = Object.values(aggMap).sort((a, b) => {
        if (metricMode === 'quantity') {
          return b.quantitySold - a.quantitySold;
        }
        return b.revenue - a.revenue;
      });

      return {
        topProducts: sorted,
        totalUnitsSold: totalQty,
        totalRevenueFromItems: totalRev,
        uniqueProductsCount: sorted.length,
        topCategory: bestCat,
      };
    }, [filteredTransactions, productStockMap, metricMode]);

  // Sliced dataset for display
  const chartData = useMemo(() => {
    return topProducts.slice(0, topLimit);
  }, [topProducts, topLimit]);

  const isSingleDay = startDate === endDate;
  const periodLabel = isSingleDay
    ? formatReadableDate(startDate)
    : `${formatReadableDate(startDate)} – ${formatReadableDate(endDate)}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/20 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Top Selling Products
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {periodLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Highest volume and revenue items sold in the selected date range
            </p>
          </div>
        </div>

        {/* View Mode & Limit Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Toggle: By Quantity vs By Revenue */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setMetricMode('quantity')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                metricMode === 'quantity'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>By Quantity Sold</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('revenue')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                metricMode === 'revenue'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>By Revenue (KSh)</span>
            </button>
          </div>

          {/* Top Limit Selector: Top 5 / 10 / 15 */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {[5, 10, 15].map((lim) => (
              <button
                key={lim}
                type="button"
                onClick={() => setTopLimit(lim)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  topLimit === lim
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Top {lim}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards for Product Velocity */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl relative overflow-hidden">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Units Sold
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
            {totalUnitsSold.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">items</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Across all completed orders</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl relative overflow-hidden">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Unique Items Sold
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono mt-1">
            {uniqueProductsCount}{' '}
            <span className="text-xs font-normal text-slate-400">products</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Distinct product catalogue items</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl relative overflow-hidden">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Item Sales Revenue
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
            KSh {totalRevenueFromItems.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Gross sales from product items</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl relative overflow-hidden">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Top Category
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-300 truncate mt-1">
            {topCategory}
          </div>
          <div className="text-[10px] text-purple-400/80 mt-1">Highest sales volume sector</div>
        </div>
      </div>

      {/* Recharts Horizontal Bar Chart */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-200">
              {metricMode === 'quantity'
                ? `Product Sales Volume (Ranked by Quantity Sold)`
                : `Product Sales Turnover (Ranked by Revenue Generated)`}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Showing top {chartData.length} of {uniqueProductsCount}
          </span>
        </div>

        {/* Chart Viewport */}
        <div className="w-full pt-2" style={{ height: Math.max(280, chartData.length * 36 + 60) }}>
          {chartData.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/40 min-h-[220px]">
              <Package className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                No Item Sales in Selected Period
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Completed transactions with items in this date range will populate the top products chart.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 25, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    metricMode === 'revenue'
                      ? v >= 1000
                        ? `${(v / 1000).toFixed(0)}k`
                        : `${v}`
                      : `${v}`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="displayName"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <Tooltip content={<CustomProductTooltip metricMode={metricMode} />} />
                <Bar
                  dataKey={metricMode === 'quantity' ? 'quantitySold' : 'revenue'}
                  name={metricMode === 'quantity' ? 'Quantity Sold' : 'Revenue (KSh)'}
                  radius={[0, 6, 6, 0]}
                  barSize={20}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={RANK_COLORS[index % RANK_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top 3 Best Seller Podium Cards */}
      {topProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {topProducts.slice(0, 3).map((prod, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
            const badgeColor =
              idx === 0
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : idx === 1
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';

            return (
              <div
                key={prod.id}
                className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{medal}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
                  >
                    Rank #{idx + 1}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-white truncate" title={prod.name}>
                    {prod.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    SKU: {prod.sku} • {prod.category}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Units Sold</span>
                    <span className="font-mono font-bold text-amber-400">
                      {prod.quantitySold} {prod.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Gross Revenue</span>
                    <span className="font-mono font-bold text-sky-400">
                      KSh {prod.revenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Custom Tooltip component for Recharts Product Bar Chart
const CustomProductTooltip: React.FC<{ active?: boolean; payload?: any[]; metricMode: 'quantity' | 'revenue' }> = ({
  active,
  payload,
  metricMode,
}) => {
  if (active && payload && payload.length) {
    const data: ProductSalesAggregate = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[220px]">
        <div className="border-b border-slate-800 pb-1">
          <div className="font-bold text-white truncate">{data.name}</div>
          <div className="text-[10px] text-slate-400 font-mono">
            {data.category} • SKU: {data.sku}
          </div>
        </div>

        <div className="flex justify-between py-0.5 text-slate-300">
          <span className="text-slate-400">Quantity Sold:</span>
          <span className="font-mono font-bold text-amber-400">
            {data.quantitySold} {data.unit}
          </span>
        </div>

        <div className="flex justify-between py-0.5 text-slate-300">
          <span className="text-slate-400">Gross Revenue:</span>
          <span className="font-mono font-bold text-sky-400">
            KSh {data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between py-0.5 text-slate-300">
          <span className="text-slate-400">Orders Frequency:</span>
          <span className="font-mono text-slate-200">{data.ordersCount} receipts</span>
        </div>

        <div className="flex justify-between py-0.5 text-slate-300 border-t border-slate-800/80 pt-1">
          <span className="text-slate-400">Current Stock:</span>
          <span
            className={`font-mono font-bold ${
              data.currentStock <= 5 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {data.currentStock} {data.unit} in store
          </span>
        </div>
      </div>
    );
  }
  return null;
};
