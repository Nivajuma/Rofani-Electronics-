import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Layers,
  ChevronDown,
  Tag,
  Percent,
  Filter,
  X,
  Check,
} from 'lucide-react';
import { Expense } from '../../types';

export interface MonthlyExpenseCategoryChartProps {
  expenses: Expense[];
  activeCategoryFilter?: string;
  onCategoryFilterChange?: (category: string) => void;
}

export const CATEGORY_PALETTE: Record<
  string,
  { fill: string; badgeBg: string; badgeText: string; borderColor: string }
> = {
  Rent: { fill: '#3b82f6', badgeBg: 'bg-blue-950/70', badgeText: 'text-blue-300', borderColor: 'border-blue-700/60' },
  Utilities: { fill: '#06b6d4', badgeBg: 'bg-cyan-950/70', badgeText: 'text-cyan-300', borderColor: 'border-cyan-700/60' },
  Salaries: { fill: '#8b5cf6', badgeBg: 'bg-purple-950/70', badgeText: 'text-purple-300', borderColor: 'border-purple-700/60' },
  Transport: { fill: '#f59e0b', badgeBg: 'bg-amber-950/70', badgeText: 'text-amber-300', borderColor: 'border-amber-700/60' },
  Restock: { fill: '#10b981', badgeBg: 'bg-emerald-950/70', badgeText: 'text-emerald-300', borderColor: 'border-emerald-700/60' },
  Maintenance: { fill: '#f97316', badgeBg: 'bg-orange-950/70', badgeText: 'text-orange-300', borderColor: 'border-orange-700/60' },
  Miscellaneous: { fill: '#ec4899', badgeBg: 'bg-pink-950/70', badgeText: 'text-pink-300', borderColor: 'border-pink-700/60' },
};

const DEFAULT_COLOR = '#94a3b8';

export const MonthlyExpenseCategoryChart: React.FC<MonthlyExpenseCategoryChartProps> = ({
  expenses,
  activeCategoryFilter = 'All',
  onCategoryFilterChange,
}) => {
  // 1. Determine all unique months in the dataset (format: YYYY-MM)
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach((e) => {
      if (e.date) {
        const ym = e.date.slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(ym)) {
          monthSet.add(ym);
        }
      }
    });

    // Also include current month if not in dataset
    const currentYm = new Date().toISOString().slice(0, 7);
    monthSet.add(currentYm);

    // Sort chronologically descending
    return Array.from(monthSet).sort().reverse();
  }, [expenses]);

  // Selected month state (defaults to the most recent month or current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths[0] || new Date().toISOString().slice(0, 7);
  });

  // Chart visualization mode: 'distribution' (Donut + Ranked List) vs 'trend' (Month-by-month Stacked Bar)
  const [chartMode, setChartMode] = useState<'distribution' | 'trend'>('distribution');

  // Helper to format YYYY-MM into human-friendly string (e.g., "October 2026")
  const formatMonthLabel = (ym: string): string => {
    if (ym === 'all') return 'All Time (Total History)';
    try {
      const [year, month] = ym.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch {
      return ym;
    }
  };

  // 2. Filter expenses for the chosen month (or all if selectedMonth === 'all')
  const monthExpenses = useMemo(() => {
    if (selectedMonth === 'all') return expenses;
    return expenses.filter((e) => e.date && e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // 3. Category Breakdown for the active month
  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, { amount: number; count: number }> = {};
    let grandTotal = 0;

    monthExpenses.forEach((e) => {
      const cat = e.category || 'Miscellaneous';
      if (!totals[cat]) {
        totals[cat] = { amount: 0, count: 0 };
      }
      totals[cat].amount += e.amount;
      totals[cat].count += 1;
      grandTotal += e.amount;
    });

    const entries = Object.entries(totals).map(([category, data]) => {
      const percentage = grandTotal > 0 ? (data.amount / grandTotal) * 100 : 0;
      const palette = CATEGORY_PALETTE[category] || {
        fill: DEFAULT_COLOR,
        badgeBg: 'bg-slate-800',
        badgeText: 'text-slate-300',
        borderColor: 'border-slate-700',
      };
      return {
        name: category,
        category,
        amount: data.amount,
        count: data.count,
        percentage,
        fill: palette.fill,
        badgeBg: palette.badgeBg,
        badgeText: palette.badgeText,
        borderColor: palette.borderColor,
      };
    });

    // Sort by amount descending
    entries.sort((a, b) => b.amount - a.amount);

    return {
      items: entries,
      grandTotal,
      topCategory: entries[0] || null,
      count: monthExpenses.length,
    };
  }, [monthExpenses]);

  // 4. Monthly Trend Data across recent months (up to 6 months)
  const monthlyTrendData = useMemo(() => {
    const sortedMonths = [...availableMonths].reverse().slice(-6); // last 6 months in chronological order
    const categories = Object.keys(CATEGORY_PALETTE);

    return sortedMonths.map((ym) => {
      const [year, month] = ym.split('-').map(Number);
      const shortName = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit',
      });

      const entry: Record<string, string | number> = {
        monthKey: ym,
        monthName: shortName,
        total: 0,
      };

      categories.forEach((cat) => {
        entry[cat] = 0;
      });

      expenses.forEach((e) => {
        if (e.date && e.date.startsWith(ym)) {
          const cat = e.category || 'Miscellaneous';
          const currentVal = (entry[cat] as number) || 0;
          entry[cat] = currentVal + e.amount;
          entry.total = ((entry.total as number) || 0) + e.amount;
        }
      });

      return entry;
    });
  }, [expenses, availableMonths]);

  // Category click handler: filters the expense list below to show only items belonging to that category
  const handleCategoryClick = (categoryName?: string) => {
    if (!categoryName || !onCategoryFilterChange) return;
    if (activeCategoryFilter === categoryName) {
      // Toggle back to All if already filtered by this category
      onCategoryFilterChange('All');
    } else {
      onCategoryFilterChange(categoryName);
      // Smoothly bring the filtered expense audit table into view
      setTimeout(() => {
        const tableEl = document.getElementById('expense-audit-records-table');
        if (tableEl) {
          const rect = tableEl.getBoundingClientRect();
          if (rect.top < 0 || rect.bottom > window.innerHeight) {
            tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 50);
    }
  };

  const selectedCategoryItem = useMemo(() => {
    if (activeCategoryFilter === 'All') return null;
    return categoryBreakdown.items.find((item) => item.category === activeCategoryFilter) || null;
  }, [categoryBreakdown.items, activeCategoryFilter]);

  // Custom Tooltip for Donut Chart
  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: data.fill }}
            />
            <span className="font-extrabold text-white text-sm">{data.name}</span>
          </div>
          <div className="text-slate-300 font-mono text-xs">
            Spent:{' '}
            <strong className="text-emerald-400 font-bold">
              KSh {data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div className="text-slate-400 text-[11px] flex items-center justify-between gap-4">
            <span>Share of Monthly Total:</span>
            <span className="font-mono text-sky-400 font-bold">{data.percentage.toFixed(1)}%</span>
          </div>
          <div className="text-slate-500 text-[10px]">
            {data.count} transaction {data.count === 1 ? 'record' : 'records'}
          </div>
          <div className="text-[10px] text-sky-400 font-semibold pt-1 border-t border-slate-800 flex items-center gap-1">
            <span>👆 Click slice to filter expense list below</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Trend Stacked Bar Chart
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => sum + (Number(p.value) || 0), 0);
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-black text-white">{label}</span>
            <span className="font-mono font-bold text-emerald-400">
              Total: KSh {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {payload
              .filter((p: any) => Number(p.value) > 0)
              .map((p: any) => (
                <div key={p.dataKey} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-300">{p.dataKey}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-100">
                    KSh {Number(p.value).toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
          <div className="text-[10px] text-sky-400 font-semibold pt-1 border-t border-slate-800 flex items-center gap-1">
            <span>👆 Click bar or legend to filter expense list</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-sky-950 to-indigo-950 border border-sky-800 text-sky-400 rounded-2xl shadow-inner">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-slate-100">
                Monthly Expense Breakdown by Category
              </h3>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                Recharts Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Visualize spending distribution, compare overhead categories, and track where cash is allocated
            </p>
          </div>
        </div>

        {/* View Controls & Month Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Chart View Toggle: Distribution Donut vs Monthly Trend */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('distribution')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'distribution'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>Category Share</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('trend')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'trend'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Monthly Trend</span>
            </button>
          </div>

          {/* Month Selector Pill */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-xs py-2 px-3.5 pr-8 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500 transition cursor-pointer"
            >
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  📅 {formatMonthLabel(ym)}
                </option>
              ))}
              <option value="all">🌐 All Months (Lifetime Total)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Monthly Summary KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
        <div className="space-y-0.5">
          <span className="text-[11px] text-slate-400 font-medium">
            {selectedMonth === 'all' ? 'All-Time Outflow' : 'Selected Month Spend'}
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
            KSh {categoryBreakdown.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 block">
            Across {categoryBreakdown.count} recorded entries
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] text-slate-400 font-medium">Largest Cost Driver</span>
          <div className="text-lg font-extrabold text-white truncate">
            {categoryBreakdown.topCategory ? categoryBreakdown.topCategory.name : 'None'}
          </div>
          <span className="text-[10px] font-mono text-amber-400 block">
            {categoryBreakdown.topCategory
              ? `KSh ${categoryBreakdown.topCategory.amount.toLocaleString()} (${categoryBreakdown.topCategory.percentage.toFixed(1)}%)`
              : '0.00'}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] text-slate-400 font-medium">Active Categories</span>
          <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
            {categoryBreakdown.items.length}{' '}
            <span className="text-xs text-slate-400 font-normal">/ 7 categories</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Operating overhead types</span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] text-slate-400 font-medium">Active Timeline Period</span>
          <div className="text-sm font-bold text-indigo-300 truncate mt-1">
            {formatMonthLabel(selectedMonth)}
          </div>
          <span className="text-[10px] text-slate-500 block">
            {selectedMonth === 'all' ? 'Consolidated records' : 'Single monthly accounting cycle'}
          </span>
        </div>
      </div>

      {/* Main Charts Area */}
      {categoryBreakdown.items.length === 0 ? (
        <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-2">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="font-bold text-slate-300 text-sm">
            No expenses logged for {formatMonthLabel(selectedMonth)}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Switch to a different month or choose &quot;All Months&quot; in the dropdown above to view historical category spending.
          </p>
        </div>
      ) : chartMode === 'distribution' ? (
        /* MODE 1: DONUT PIE CHART & CATEGORY SPENDING LEADERBOARD */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Donut Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[300px]">
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown.items}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    cursor="pointer"
                    onClick={(entry: any) => {
                      const cat =
                        entry?.category ||
                        entry?.name ||
                        entry?.payload?.category ||
                        entry?.payload?.name;
                      if (cat) {
                        handleCategoryClick(cat);
                      }
                    }}
                  >
                    {categoryBreakdown.items.map((entry) => {
                      const isSelected = activeCategoryFilter === entry.category;
                      const isFiltered = activeCategoryFilter !== 'All';
                      return (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={entry.fill}
                          fillOpacity={!isFiltered || isSelected ? 1 : 0.28}
                          stroke={isSelected ? '#38bdf8' : '#0f172a'}
                          strokeWidth={isSelected ? 3.5 : 2}
                          className="cursor-pointer transition-all duration-300"
                          onClick={(e: any) => {
                            e?.stopPropagation?.();
                            handleCategoryClick(entry.category);
                          }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<CustomDonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Center Label in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-3 text-center">
              {selectedCategoryItem ? (
                <>
                  <span className="text-[10px] text-sky-400 uppercase tracking-widest font-black flex items-center gap-1">
                    <Filter className="w-2.5 h-2.5" /> Filtering
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-white truncate max-w-[130px]">
                    {selectedCategoryItem.name}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                    KSh {Math.round(selectedCategoryItem.amount).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono text-sky-300 font-bold">
                    {selectedCategoryItem.percentage.toFixed(1)}% of month
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5">
                    Click slice to reset
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Total
                  </span>
                  <span className="text-base sm:text-lg font-black font-mono text-white">
                    KSh {Math.round(categoryBreakdown.grandTotal).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {categoryBreakdown.items.length} categories
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Ranked Category Distribution List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold border-b border-slate-800 pb-2">
              <span>Category & Allocation (Click to filter)</span>
              <span>Amount & Share</span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {categoryBreakdown.items.map((cat) => {
                const isSelected = activeCategoryFilter === cat.category;
                return (
                  <div
                    key={cat.category}
                    onClick={() => handleCategoryClick(cat.category)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/30 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                    }`}
                    title={
                      isSelected
                        ? `Click to clear filter`
                        : `Click to filter expenses table below to ${cat.category}`
                    }
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-3 h-3 rounded-full shrink-0 shadow-sm transition-transform ${
                            isSelected ? 'scale-125 ring-2 ring-sky-400' : ''
                          }`}
                          style={{ backgroundColor: cat.fill }}
                        />
                        <span
                          className={`font-extrabold truncate ${
                            isSelected ? 'text-sky-300' : 'text-slate-100 group-hover:text-white'
                          }`}
                        >
                          {cat.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-sky-500 text-slate-950 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Filtered
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${cat.badgeBg} ${cat.badgeText} ${cat.borderColor}`}
                        >
                          {cat.count} {cat.count === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-100">
                          KSh {cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-sky-400 font-mono text-[11px] font-bold ml-2">
                          ({cat.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar showing percentage */}
                    <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(cat.percentage, 2)}%`,
                          backgroundColor: cat.fill,
                          opacity: isSelected || activeCategoryFilter === 'All' ? 1 : 0.4,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2: MONTH-OVER-MONTH STACKED BAR CHART */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Historical Monthly Trend (Stacked by Category - Click segment to filter)</span>
            <span className="font-mono text-slate-500">Last 6 Months Outflow</span>
          </div>

          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis
                  dataKey="monthName"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) =>
                    val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toString()
                  }
                />
                <Tooltip content={<CustomTrendTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ paddingTop: 16 }}
                  iconSize={10}
                  iconType="circle"
                  onClick={(e: any) => {
                    const clickedCat = e?.dataKey || e?.value;
                    if (clickedCat) {
                      handleCategoryClick(clickedCat);
                    }
                  }}
                  formatter={(val) => {
                    const isSelected = activeCategoryFilter === val;
                    return (
                      <span
                        className={`text-[11px] font-medium mr-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'text-sky-300 font-bold underline'
                            : activeCategoryFilter !== 'All'
                            ? 'text-slate-500 hover:text-slate-300'
                            : 'text-slate-300 hover:text-white'
                        }`}
                        title={`Click to filter expense records by ${val}`}
                      >
                        {val} {isSelected && '✓'}
                      </span>
                    );
                  }}
                />
                {Object.keys(CATEGORY_PALETTE).map((cat) => {
                  const isSelected = activeCategoryFilter === cat;
                  const isFiltered = activeCategoryFilter !== 'All';
                  return (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId="monthlyStack"
                      fill={CATEGORY_PALETTE[cat].fill}
                      fillOpacity={!isFiltered || isSelected ? 1 : 0.25}
                      radius={cat === 'Miscellaneous' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      cursor="pointer"
                      onClick={() => handleCategoryClick(cat)}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Footer hint & active filter indicator */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            {activeCategoryFilter === 'All'
              ? 'Click any pie slice, category card, or trend bar to filter the expense records table below'
              : `Currently filtering expense list below to only show "${activeCategoryFilter}" overheads`}
          </span>
        </span>
        {activeCategoryFilter !== 'All' && (
          <button
            type="button"
            onClick={() => handleCategoryClick(activeCategoryFilter)}
            className="text-sky-400 hover:text-sky-300 font-bold underline cursor-pointer flex items-center gap-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filter (Show All Categories)</span>
          </button>
        )}
      </div>
    </div>
  );
};
