import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  DollarSign,
  ShoppingBag,
  Zap,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Award,
  RefreshCw,
  CreditCard,
  Layers,
} from 'lucide-react';
import { Transaction } from '../../types';

interface DailySalesPerformanceCardProps {
  transactions: Transaction[];
  initialDate?: string; // YYYY-MM-DD format (defaults to current local date)
}

interface HourlyDataPoint {
  hour: number;
  label: string;
  timeRange: string;
  revenue: number;
  transactions: number;
  itemsSold: number;
  averageOrder: number;
  isPeakRevenue: boolean;
  isPeakOrders: boolean;
}

export const DailySalesPerformanceCard: React.FC<DailySalesPerformanceCardProps> = ({
  transactions,
  initialDate,
}) => {
  // Format today's date in local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [chartViewMode, setChartViewMode] = useState<'revenue' | 'orders' | 'combined'>('combined');
  const [filterActiveHoursOnly, setFilterActiveHoursOnly] = useState<boolean>(false);

  // Compute yesterday's date string
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filter transactions strictly for the selected day
  const dayTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return false;
      const y = txDate.getFullYear();
      const m = String(txDate.getMonth() + 1).padStart(2, '0');
      const d = String(txDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}` === selectedDate;
    });
  }, [transactions, selectedDate]);

  // Aggregate hourly data (00:00 to 23:00)
  const { hourlyData, totalRevenue, totalOrders, totalItems, averageOrderValue, peakRevenueHour, peakOrdersHour, paymentBreakdown } = useMemo(() => {
    // Initialize 24-hour spine
    const hourBins: HourlyDataPoint[] = Array.from({ length: 24 }, (_, h) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const nextHour = (h + 1) % 24;
      const nextAmpm = nextHour >= 12 ? 'PM' : 'AM';
      const nextDisplayHour = nextHour % 12 === 0 ? 12 : nextHour % 12;

      return {
        hour: h,
        label: `${displayHour} ${ampm}`,
        timeRange: `${displayHour}:00 ${ampm} - ${nextDisplayHour}:00 ${nextAmpm}`,
        revenue: 0,
        transactions: 0,
        itemsSold: 0,
        averageOrder: 0,
        isPeakRevenue: false,
        isPeakOrders: false,
      };
    });

    let sumRevenue = 0;
    let sumItems = 0;
    const paymentMap: Record<string, number> = {};

    dayTransactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const h = txDate.getHours();
      const revenue = tx.grandTotal || tx.total || 0;
      const itemsCount = tx.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 0;

      if (h >= 0 && h < 24) {
        hourBins[h].revenue += revenue;
        hourBins[h].transactions += 1;
        hourBins[h].itemsSold += itemsCount;
      }

      sumRevenue += revenue;
      sumItems += itemsCount;

      // Track payment methods
      if (tx.payments && tx.payments.length > 0) {
        tx.payments.forEach((p) => {
          const methodKey = p.method || 'cash';
          paymentMap[methodKey] = (paymentMap[methodKey] || 0) + (p.amount || 0);
        });
      } else if (tx.paymentMethod) {
        paymentMap[tx.paymentMethod] = (paymentMap[tx.paymentMethod] || 0) + revenue;
      }
    });

    // Calculate averages and find peaks
    let maxRev = 0;
    let maxOrders = 0;
    let peakRevH: HourlyDataPoint | null = null;
    let peakOrdH: HourlyDataPoint | null = null;

    hourBins.forEach((bin) => {
      if (bin.transactions > 0) {
        bin.averageOrder = Math.round(bin.revenue / bin.transactions);
      }
      if (bin.revenue > maxRev) {
        maxRev = bin.revenue;
        peakRevH = bin;
      }
      if (bin.transactions > maxOrders) {
        maxOrders = bin.transactions;
        peakOrdH = bin;
      }
    });

    if (peakRevH && maxRev > 0) {
      (peakRevH as HourlyDataPoint).isPeakRevenue = true;
    }
    if (peakOrdH && maxOrders > 0) {
      (peakOrdH as HourlyDataPoint).isPeakOrders = true;
    }

    const aov = dayTransactions.length > 0 ? Math.round(sumRevenue / dayTransactions.length) : 0;

    return {
      hourlyData: hourBins,
      totalRevenue: sumRevenue,
      totalOrders: dayTransactions.length,
      totalItems: sumItems,
      averageOrderValue: aov,
      peakRevenueHour: peakRevH,
      peakOrdersHour: peakOrdH,
      paymentBreakdown: paymentMap,
    };
  }, [dayTransactions]);

  // Display data: optionally crop to operational hours (e.g. 6 AM to 10 PM) or hours with activity
  const chartData = useMemo(() => {
    if (filterActiveHoursOnly) {
      // Find first and last active hour
      const activeIndices = hourlyData
        .map((d, idx) => (d.transactions > 0 ? idx : -1))
        .filter((idx) => idx !== -1);
      if (activeIndices.length > 0) {
        const start = Math.max(0, Math.min(...activeIndices) - 1);
        const end = Math.min(23, Math.max(...activeIndices) + 1);
        return hourlyData.slice(start, end + 1);
      }
      return hourlyData.slice(6, 22); // Default operational store hours
    }
    return hourlyData;
  }, [hourlyData, filterActiveHoursOnly]);

  const isToday = selectedDate === todayStr;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-sky-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-sky-600/20 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Daily Sales Performance
              </h3>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Hourly breakdown of revenue and transaction volume for {isToday ? 'Today' : selectedDate}
            </p>
          </div>
        </div>

        {/* Action Controls & Date Picker */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Chips */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                selectedDate === yesterdayStr
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yesterday
            </button>
          </div>

          {/* Date Input */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          {/* Metric View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setChartViewMode('combined')}
              className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer ${
                chartViewMode === 'combined'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Combined
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('revenue')}
              className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer ${
                chartViewMode === 'revenue'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Revenue (KSh)
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('orders')}
              className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer ${
                chartViewMode === 'orders'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Orders Count
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Revenue KPI */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Revenue
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono mt-1">
            KSh {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{totalOrders} completed receipts</span>
          </div>
        </div>

        {/* Transaction Volume KPI */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Orders Completed
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
            {totalOrders} <span className="text-sm font-normal text-slate-400">Sales</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {totalItems} total items sold
          </div>
        </div>

        {/* Average Order Value (AOV) KPI */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Average Order Value
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono mt-1">
            KSh {averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            ~{totalOrders > 0 ? (totalItems / totalOrders).toFixed(1) : 0} items per receipt
          </div>
        </div>

        {/* Peak Selling Hour KPI */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Peak Selling Hour
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-300 truncate mt-1">
            {peakRevenueHour && peakRevenueHour.revenue > 0 ? peakRevenueHour.label : 'No Peak Yet'}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-1 truncate">
            {peakRevenueHour && peakRevenueHour.revenue > 0
              ? `KSh ${peakRevenueHour.revenue.toLocaleString()} (${peakRevenueHour.transactions} orders)`
              : 'Waiting for orders today'}
          </div>
        </div>
      </div>

      {/* Recharts Hourly Visualization */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-slate-200">
              Hourly Transaction & Revenue Trend
            </span>
            <span className="text-[11px] text-slate-500">
              (24-Hour Distribution)
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => setFilterActiveHoursOnly(!filterActiveHoursOnly)}
              className="text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer"
            >
              {filterActiveHoursOnly ? 'Show All 24 Hours' : 'Focus Operating Hours'}
            </button>
          </div>
        </div>

        {/* Chart View Area */}
        <div className="h-72 sm:h-80 w-full pt-2">
          {totalRevenue === 0 && dayTransactions.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
              <Clock className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                No Sales Recorded for {isToday ? 'Today' : selectedDate}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Completed POS sales and receipt transactions for this date will populate the hourly trend chart automatically.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartViewMode === 'revenue' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    interval={chartData.length > 16 ? 1 : 0}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  />
                  <Tooltip content={<CustomSalesTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue (KSh)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="urlColorRevenue"
                  />
                </AreaChart>
              ) : chartViewMode === 'orders' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    interval={chartData.length > 16 ? 1 : 0}
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomSalesTooltip />} />
                  <Bar
                    dataKey="transactions"
                    name="Transactions"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              ) : (
                <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenueCombined" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    interval={chartData.length > 16 ? 1 : 0}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#818cf8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#34d399"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomSalesTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Sales Revenue (KSh)"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="urlColorRevenueCombined"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="transactions"
                    name="Orders Count"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Hourly Activity Highlights & Payment Breakdown */}
      {dayTransactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
          {/* Peak Hours Ranking */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Top Peak Selling Hours Today</span>
            </div>
            <div className="space-y-1.5">
              {hourlyData
                .filter((b) => b.transactions > 0)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 3)
                .map((peak, idx) => (
                  <div
                    key={peak.hour}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                          idx === 0
                            ? 'bg-amber-500 text-slate-950'
                            : idx === 1
                            ? 'bg-slate-700 text-slate-200'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200">{peak.timeRange}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sky-400 font-bold">
                        KSh {peak.revenue.toLocaleString()}
                      </span>
                      <span className="text-slate-500 ml-1.5 text-[11px]">
                        ({peak.transactions} orders)
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Payment Channels Split */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Payment Methods Used Today</span>
            </div>
            <div className="space-y-1.5">
              {Object.keys(paymentBreakdown).length === 0 ? (
                <p className="text-slate-500 text-xs">No payment records available.</p>
              ) : (
                Object.entries(paymentBreakdown).map(([method, amount]) => {
                  const pct = totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={method}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80"
                    >
                      <div className="flex items-center gap-2">
                        <span className="capitalize font-semibold text-slate-200">{method}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                          {pct}%
                        </span>
                      </div>
                      <div className="font-mono text-emerald-400 font-bold">
                        KSh {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Tooltip component for Recharts
const CustomSalesTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data: HourlyDataPoint = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            {data.timeRange}
          </span>
          {data.isPeakRevenue && (
            <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold">
              Peak Revenue
            </span>
          )}
        </div>

        <div className="flex justify-between py-0.5 text-slate-300">
          <span className="text-slate-400">Revenue:</span>
          <span className="font-mono font-bold text-sky-400">
            KSh {data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between py-0.5 text-slate-300">
          <span className="text-slate-400">Transactions:</span>
          <span className="font-mono font-bold text-emerald-400">
            {data.transactions} orders
          </span>
        </div>

        <div className="flex justify-between py-0.5 text-slate-300">
          <span className="text-slate-400">Items Sold:</span>
          <span className="font-mono font-semibold text-slate-200">
            {data.itemsSold} items
          </span>
        </div>

        {data.transactions > 0 && (
          <div className="flex justify-between py-0.5 text-slate-300 border-t border-slate-800/80 pt-1">
            <span className="text-slate-400">Avg. Order:</span>
            <span className="font-mono font-bold text-purple-400">
              KSh {data.averageOrder.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};
