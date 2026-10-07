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
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Transaction } from '../../types';

export interface DailySalesPerformanceCardProps {
  transactions: Transaction[];
  initialDate?: string; // YYYY-MM-DD format (defaults to current local date)
  startDate?: string;
  endDate?: string;
  rangePreset?: DateRangePreset;
  onRangeChange?: (range: { startDate: string; endDate: string; preset: DateRangePreset }) => void;
}

export type DateRangePreset = 'today' | '7days' | 'custom';

export interface ChartDataPoint {
  type: 'hourly' | 'daily';
  label: string;
  hour?: number;
  timeRange?: string;
  dateStr?: string;
  dayName?: string;
  revenue: number;
  transactions: number;
  itemsSold: number;
  averageOrder: number;
  isPeakRevenue: boolean;
  isPeakOrders: boolean;
}

type HourlyDataPoint = ChartDataPoint;
type DailyDataPoint = ChartDataPoint;

// Helper to format Date to YYYY-MM-DD
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format human-readable date label (e.g. "Oct 6, 2026")
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

export const DailySalesPerformanceCard: React.FC<DailySalesPerformanceCardProps> = ({
  transactions,
  initialDate,
  startDate: propStartDate,
  endDate: propEndDate,
  rangePreset: propRangePreset,
  onRangeChange,
}) => {
  // Today's local date string
  const todayStr = useMemo(() => toDateStr(new Date()), []);

  // Internal Date Range State Fallback
  const [internalPreset, setInternalPreset] = useState<DateRangePreset>('today');
  const [internalStartDate, setInternalStartDate] = useState<string>(initialDate || todayStr);
  const [internalEndDate, setInternalEndDate] = useState<string>(initialDate || todayStr);

  const rangePreset = propRangePreset !== undefined ? propRangePreset : internalPreset;
  const startDate = propStartDate !== undefined ? propStartDate : internalStartDate;
  const endDate = propEndDate !== undefined ? propEndDate : internalEndDate;

  const updateRange = (newStart: string, newEnd: string, newPreset: DateRangePreset) => {
    setInternalStartDate(newStart);
    setInternalEndDate(newEnd);
    setInternalPreset(newPreset);
    onRangeChange?.({ startDate: newStart, endDate: newEnd, preset: newPreset });
  };

  // Chart view mode
  const [chartViewMode, setChartViewMode] = useState<'revenue' | 'orders' | 'combined'>('combined');
  // For multi-day ranges: toggle between Daily Trend vs Consolidated Hourly Pattern
  const [multiDayAggregation, setMultiDayAggregation] = useState<'daily' | 'hourly_aggregate'>('daily');
  // Operational store hours filter (for hourly view)
  const [filterActiveHoursOnly, setFilterActiveHoursOnly] = useState<boolean>(false);

  // Set Range Preset Handler
  const handleSelectPreset = (preset: DateRangePreset) => {
    const now = new Date();

    if (preset === 'today') {
      const today = toDateStr(now);
      updateRange(today, today, 'today');
    } else if (preset === '7days') {
      const sevenAgo = new Date();
      sevenAgo.setDate(now.getDate() - 6);
      updateRange(toDateStr(sevenAgo), toDateStr(now), '7days');
    } else if (preset === 'custom') {
      if (startDate === endDate && startDate === todayStr) {
        const sevenAgo = new Date();
        sevenAgo.setDate(now.getDate() - 6);
        updateRange(toDateStr(sevenAgo), toDateStr(now), 'custom');
      } else {
        updateRange(startDate, endDate, 'custom');
      }
    }
  };

  // Quick Preset Helper for Custom Range
  const handleApplyCustomPreset = (daysBack: number) => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - (daysBack - 1));
    updateRange(toDateStr(past), toDateStr(now), 'custom');
  };

  const handleApplyThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    updateRange(toDateStr(firstDay), toDateStr(now), 'custom');
  };

  // Determine if viewing a single day vs multi-day
  const isSingleDay = startDate === endDate;

  // Filter transactions strictly for the active date range [startDate, endDate]
  const rangeTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return false;
      const txDateStr = toDateStr(txDate);
      return txDateStr >= startDate && txDateStr <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Aggregate stats & chart datasets
  const {
    hourlyData,
    dailyData,
    totalRevenue,
    totalOrders,
    totalItems,
    averageOrderValue,
    peakRevenueItem,
    paymentBreakdown,
    activeDaysCount,
  } = useMemo(() => {
    // 1. Initialize 24-hour spine
    const hourBins: HourlyDataPoint[] = Array.from({ length: 24 }, (_, h) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const nextHour = (h + 1) % 24;
      const nextAmpm = nextHour >= 12 ? 'PM' : 'AM';
      const nextDisplayHour = nextHour % 12 === 0 ? 12 : nextHour % 12;

      return {
        type: 'hourly',
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

    // 2. Initialize Day-by-day spine if multi-day
    const dayMap: Record<string, DailyDataPoint> = {};
    const dateList: string[] = [];

    if (!isSingleDay) {
      try {
        const startParts = startDate.split('-').map(Number);
        const endParts = endDate.split('-').map(Number);
        const curr = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);

        // Safety limit to 365 days max
        let iterations = 0;
        while (curr <= end && iterations < 366) {
          const dStr = toDateStr(curr);
          dateList.push(dStr);
          const dayName = curr.toLocaleDateString(undefined, { weekday: 'short' });
          const monthDay = curr.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

          dayMap[dStr] = {
            type: 'daily',
            dateStr: dStr,
            label: `${monthDay}`,
            dayName: dayName,
            revenue: 0,
            transactions: 0,
            itemsSold: 0,
            averageOrder: 0,
            isPeakRevenue: false,
            isPeakOrders: false,
          };
          curr.setDate(curr.getDate() + 1);
          iterations++;
        }
      } catch (err) {
        console.warn('[DailySalesPerformanceCard] Date sequence error:', err);
      }
    }

    let sumRevenue = 0;
    let sumItems = 0;
    const paymentMap: Record<string, number> = {};

    rangeTransactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const h = txDate.getHours();
      const txDateStr = toDateStr(txDate);
      const revenue = tx.grandTotal || tx.total || 0;
      const itemsCount = tx.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 0;

      // Hourly accumulation
      if (h >= 0 && h < 24) {
        hourBins[h].revenue += revenue;
        hourBins[h].transactions += 1;
        hourBins[h].itemsSold += itemsCount;
      }

      // Daily accumulation
      if (dayMap[txDateStr]) {
        dayMap[txDateStr].revenue += revenue;
        dayMap[txDateStr].transactions += 1;
        dayMap[txDateStr].itemsSold += itemsCount;
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

    // Compute hourly averages and peak
    let maxHourRev = 0;
    let peakHourObj: HourlyDataPoint | null = null;
    hourBins.forEach((bin) => {
      if (bin.transactions > 0) {
        bin.averageOrder = Math.round(bin.revenue / bin.transactions);
      }
      if (bin.revenue > maxHourRev) {
        maxHourRev = bin.revenue;
        peakHourObj = bin;
      }
    });
    if (peakHourObj && maxHourRev > 0) {
      (peakHourObj as HourlyDataPoint).isPeakRevenue = true;
    }

    // Compute daily averages and peak
    const dailyBins: DailyDataPoint[] = dateList.map((dStr) => dayMap[dStr]);
    let maxDayRev = 0;
    let peakDayObj: DailyDataPoint | null = null;
    dailyBins.forEach((bin) => {
      if (bin.transactions > 0) {
        bin.averageOrder = Math.round(bin.revenue / bin.transactions);
      }
      if (bin.revenue > maxDayRev) {
        maxDayRev = bin.revenue;
        peakDayObj = bin;
      }
    });
    if (peakDayObj && maxDayRev > 0) {
      (peakDayObj as DailyDataPoint).isPeakRevenue = true;
    }

    const aov = rangeTransactions.length > 0 ? Math.round(sumRevenue / rangeTransactions.length) : 0;
    const peakItem = isSingleDay || multiDayAggregation === 'hourly_aggregate' ? peakHourObj : peakDayObj;

    return {
      hourlyData: hourBins,
      dailyData: dailyBins,
      totalRevenue: sumRevenue,
      totalOrders: rangeTransactions.length,
      totalItems: sumItems,
      averageOrderValue: aov,
      peakRevenueItem: peakItem,
      paymentBreakdown: paymentMap,
      activeDaysCount: Math.max(1, dateList.length),
    };
  }, [rangeTransactions, isSingleDay, multiDayAggregation, startDate, endDate]);

  // Determine active chart dataset
  const chartData = useMemo(() => {
    if (isSingleDay || multiDayAggregation === 'hourly_aggregate') {
      if (filterActiveHoursOnly) {
        const activeIndices = hourlyData
          .map((d, idx) => (d.transactions > 0 ? idx : -1))
          .filter((idx) => idx !== -1);
        if (activeIndices.length > 0) {
          const start = Math.max(0, Math.min(...activeIndices) - 1);
          const end = Math.min(23, Math.max(...activeIndices) + 1);
          return hourlyData.slice(start, end + 1);
        }
        return hourlyData.slice(6, 22);
      }
      return hourlyData;
    }
    return dailyData;
  }, [isSingleDay, multiDayAggregation, hourlyData, dailyData, filterActiveHoursOnly]);

  const isTodayActive = isSingleDay && startDate === todayStr;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Top Header & Date Range Picker */}
      <div className="space-y-4 border-b border-slate-800 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-sky-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-sky-600/20 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Sales Performance & Historical Analytics
                </h3>
                {isTodayActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Today
                  </span>
                )}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {isSingleDay
                    ? formatReadableDate(startDate)
                    : `${formatReadableDate(startDate)} – ${formatReadableDate(endDate)} (${activeDaysCount} days)`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSingleDay
                  ? `Hourly transaction and revenue breakdown for ${formatReadableDate(startDate)}`
                  : `Historical transaction trends across ${activeDaysCount} days (${formatReadableDate(startDate)} to ${formatReadableDate(endDate)})`}
              </p>
            </div>
          </div>

          {/* DATE RANGE PRESET BUTTONS (Today | Last 7 Days | Custom Range) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => handleSelectPreset('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                rangePreset === 'today'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('7days')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                rangePreset === '7days'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Last 7 Days</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('custom')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                rangePreset === 'custom'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Custom Range</span>
            </button>
          </div>
        </div>

        {/* CUSTOM DATE RANGE CONTROLS (EXPANDS WHEN CUSTOM IS SELECTED OR MODIFIED) */}
        {rangePreset === 'custom' && (
          <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                Select Period:
              </span>

              {/* Start Date */}
              <div className="flex items-center gap-1.5">
                <label className="text-slate-400 text-[11px]">From</label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => e.target.value && updateRange(e.target.value, endDate, 'custom')}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-1.5">
                <label className="text-slate-400 text-[11px]">To</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => e.target.value && updateRange(startDate, e.target.value, 'custom')}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Quick Presets within Custom */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              <span className="text-[10px] text-slate-500 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyCustomPreset(14)}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-medium transition cursor-pointer whitespace-nowrap"
              >
                14 Days
              </button>
              <button
                type="button"
                onClick={() => handleApplyCustomPreset(30)}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-medium transition cursor-pointer whitespace-nowrap"
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={handleApplyThisMonth}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-medium transition cursor-pointer whitespace-nowrap"
              >
                This Month
              </button>
            </div>
          </div>
        )}

        {/* MULTI-DAY TIMELINE vs HOURLY BREAKDOWN & METRICS TOGGLES */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          {/* Sub-view switcher for multi-day periods */}
          {!isSingleDay ? (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMultiDayAggregation('daily')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  multiDayAggregation === 'daily'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Daily Timeline (By Date)
              </button>
              <button
                type="button"
                onClick={() => setMultiDayAggregation('hourly_aggregate')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  multiDayAggregation === 'hourly_aggregate'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Peak Hours Pattern (Aggregated)
              </button>
            </div>
          ) : (
            <div className="text-slate-400 text-xs flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Displaying 24-Hour Time Series for {formatReadableDate(startDate)}</span>
            </div>
          )}

          {/* Metric View Mode Toggle (Combined | Revenue | Orders) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setChartViewMode('combined')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
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
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
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
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
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
            {isSingleDay ? "Today's Revenue" : `Total Period Revenue (${activeDaysCount}d)`}
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono mt-1">
            KSh {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{totalOrders} completed receipts</span>
            {!isSingleDay && (
              <span className="text-slate-400 ml-1">
                (~KSh {Math.round(totalRevenue / activeDaysCount).toLocaleString()}/day)
              </span>
            )}
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
            {totalItems} total items sold {!isSingleDay && `(~${Math.round(totalOrders / activeDaysCount)} orders/day)`}
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

        {/* Peak Performance KPI (Peak Day vs Peak Hour) */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {isSingleDay || multiDayAggregation === 'hourly_aggregate'
              ? 'Peak Selling Hour'
              : 'Highest Sales Day'}
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-300 truncate mt-1">
            {peakRevenueItem && peakRevenueItem.revenue > 0
              ? (peakRevenueItem as any).timeRange || (peakRevenueItem as any).label
              : 'No Peak Yet'}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-1 truncate">
            {peakRevenueItem && peakRevenueItem.revenue > 0
              ? `KSh ${peakRevenueItem.revenue.toLocaleString()} (${peakRevenueItem.transactions} orders)`
              : 'Waiting for orders'}
          </div>
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-slate-200">
              {isSingleDay || multiDayAggregation === 'hourly_aggregate'
                ? 'Hourly Transaction & Revenue Trend'
                : `Daily Sales Trend (${activeDaysCount} Days)`}
            </span>
            <span className="text-[11px] text-slate-500">
              {isSingleDay
                ? '(24-Hour Distribution)'
                : multiDayAggregation === 'hourly_aggregate'
                ? '(Aggregated Hourly Peak Pattern)'
                : '(Day-by-Day Historical Flow)'}
            </span>
          </div>

          {(isSingleDay || multiDayAggregation === 'hourly_aggregate') && (
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => setFilterActiveHoursOnly(!filterActiveHoursOnly)}
                className="text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer"
              >
                {filterActiveHoursOnly ? 'Show All 24 Hours' : 'Focus Operating Hours'}
              </button>
            </div>
          )}
        </div>

        {/* Chart View Area */}
        <div className="h-72 sm:h-80 w-full pt-2">
          {totalRevenue === 0 && rangeTransactions.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
              <Clock className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                No Sales Recorded for Selected Period
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                There are no transaction records matching the date range ({formatReadableDate(startDate)} to {formatReadableDate(endDate)}).
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
                    maxBarSize={30}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Highlights & Payment Breakdown */}
      {rangeTransactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
          {/* Top Selling Slots / Days Ranking */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Award className="w-4 h-4 text-amber-400" />
              <span>
                {isSingleDay || multiDayAggregation === 'hourly_aggregate'
                  ? 'Top Peak Selling Hours'
                  : 'Top Sales Days in Period'}
              </span>
            </div>
            <div className="space-y-1.5">
              {chartData
                .filter((b) => b.transactions > 0)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 3)
                .map((peak, idx) => (
                  <div
                    key={idx}
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
                      <span className="font-semibold text-slate-200">
                        {(peak as any).timeRange || (peak as any).label}
                      </span>
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
              <span>Payment Methods in Period</span>
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
    const data: ChartDataPoint = payload[0].payload;
    const isHourly = data.type === 'hourly';

    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[210px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="font-bold text-white flex items-center gap-1.5">
            {isHourly ? (
              <>
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                {(data as HourlyDataPoint).timeRange}
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                {(data as DailyDataPoint).label}
              </>
            )}
          </span>
          {data.isPeakRevenue && (
            <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold">
              Peak Slot
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
