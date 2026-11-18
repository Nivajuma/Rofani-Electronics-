import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import { Transaction, Product, Expense } from '../../types';

interface DailyOverviewCardProps {
  transactions: Transaction[];
  products: Product[];
  expenses: Expense[];
}

interface DailyTrendPoint {
  dateKey: string;
  dateLabel: string;
  sales: number;
  netProfit: number;
  turnoverRate: number;
  txCount: number;
  units: number;
}

function getLocalDateKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) {
    return String(input || '').slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DailyOverviewCard: React.FC<DailyOverviewCardProps> = ({
  transactions,
  products,
  expenses,
}) => {
  const [trendWindowDays, setTrendWindowDays] = useState<7 | 14 | 30>(14);

  const analytics = useMemo(() => {
    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterdayDate);

    // Inventory base value & stock units
    let totalInventoryCostValue = 0;
    let totalStockUnits = 0;
    products.forEach((p) => {
      const qty = Math.max(0, p.stockQuantity ?? p.stock ?? 0);
      const unitCost = Math.max(0, p.costPrice ?? p.buyingPrice ?? 0);
      totalStockUnits += qty;
      totalInventoryCostValue += unitCost * qty;
    });

    // Aggregate transactions & expenses by local YYYY-MM-DD key
    const txByDay = new Map<
      string,
      { sales: number; cogs: number; units: number; txCount: number }
    >();

    transactions.forEach((tx) => {
      const key = getLocalDateKey(tx.date);
      const prev = txByDay.get(key) || { sales: 0, cogs: 0, units: 0, txCount: 0 };
      let txCogs = 0;
      let txUnits = 0;
      (tx.items || []).forEach((it) => {
        const unitCost = it.product?.costPrice ?? it.product?.buyingPrice ?? 0;
        const qty = it.quantity || 0;
        txCogs += unitCost * qty;
        txUnits += qty;
      });
      txByDay.set(key, {
        sales: prev.sales + (tx.grandTotal || 0),
        cogs: prev.cogs + txCogs,
        units: prev.units + txUnits,
        txCount: prev.txCount + 1,
      });
    });

    const expensesByDay = new Map<string, number>();
    expenses.forEach((exp) => {
      const key = getLocalDateKey(exp.date);
      expensesByDay.set(key, (expensesByDay.get(key) || 0) + (exp.amount || 0));
    });

    // Today's exact metrics
    const todayBucket = txByDay.get(todayKey) || { sales: 0, cogs: 0, units: 0, txCount: 0 };
    const yesterdayBucket = txByDay.get(yesterdayKey) || {
      sales: 0,
      cogs: 0,
      units: 0,
      txCount: 0,
    };

    const todaySales = todayBucket.sales;
    const yesterdaySales = yesterdayBucket.sales;
    const todayCogs = todayBucket.cogs;
    const todayUnitsSold = todayBucket.units;
    const todayTxCount = todayBucket.txCount;

    const todayExpensesTotal = expensesByDay.get(todayKey) || 0;
    const todayGrossProfit = todaySales - todayCogs;
    const todayKraTot = todaySales * 0.015;
    const todayNetProfit =
      todaySales === 0 ? 0 : todayGrossProfit - todayExpensesTotal - todayKraTot;
    const netMarginPct = todaySales > 0 ? (todayNetProfit / todaySales) * 100 : 0;

    const turnoverRate =
      totalInventoryCostValue > 0
        ? todayCogs / totalInventoryCostValue
        : totalStockUnits > 0
        ? todayUnitsSold / totalStockUnits
        : 0;
    const turnoverPct = turnoverRate * 100;

    const salesDeltaPct =
      yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : null;

    // Multi-day daily trend series ending today
    const dailyTrendData: DailyTrendPoint[] = [];
    for (let offset = trendWindowDays - 1; offset >= 0; offset--) {
      const d = new Date(now);
      d.setDate(now.getDate() - offset);
      const key = getLocalDateKey(d);
      const bucket = txByDay.get(key) || { sales: 0, cogs: 0, units: 0, txCount: 0 };
      const dayExpenses = expensesByDay.get(key) || 0;
      const dayKra = bucket.sales * 0.015;
      const dayNetProfit =
        bucket.sales === 0 ? 0 : bucket.sales - bucket.cogs - dayExpenses - dayKra;
      const dayTurnover =
        totalInventoryCostValue > 0
          ? bucket.cogs / totalInventoryCostValue
          : totalStockUnits > 0
          ? bucket.units / totalStockUnits
          : 0;

      dailyTrendData.push({
        dateKey: key,
        dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        sales: Math.round(bucket.sales),
        netProfit: Math.round(dayNetProfit),
        turnoverRate: Number(dayTurnover.toFixed(4)),
        txCount: bucket.txCount,
        units: bucket.units,
      });
    }

    const periodTotalSales = dailyTrendData.reduce((s, pt) => s + pt.sales, 0);
    const periodAvgDailySales =
      dailyTrendData.length > 0 ? periodTotalSales / dailyTrendData.length : 0;
    const peakDay = dailyTrendData.reduce<DailyTrendPoint | null>(
      (best, cur) => (!best || cur.sales > best.sales ? cur : best),
      null
    );

    const formattedDate = now.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      formattedDate,
      todaySales,
      todayTxCount,
      todayUnitsSold,
      todayNetProfit,
      netMarginPct,
      todayExpensesTotal,
      turnoverRate,
      turnoverPct,
      totalStockUnits,
      salesDeltaPct,
      dailyTrendData,
      periodTotalSales,
      periodAvgDailySales,
      peakDay,
    };
  }, [transactions, products, expenses, trendWindowDays]);

  const profitIsNegative = analytics.todayNetProfit < 0;

  return (
    <section
      aria-label="Daily Overview"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Activity className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Daily Overview
            </h2>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>{analytics.formattedDate}</span>
              <span className="text-slate-600">•</span>
              <span>{analytics.todayTxCount} receipts today</span>
            </p>
          </div>
        </div>

        {/* Trend Window Switcher */}
        <div className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-semibold">
          {([7, 14, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setTrendWindowDays(days)}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                trendWindowDays === days
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* 3 Metric Cards with Recharts Daily Trend Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 1. Day's Total Sales */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Total Sales (Today)
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-white tabular-nums mt-0.5">
                KSh {analytics.todaySales.toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="h-14 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.dailyTrendData}
                margin={{ top: 4, right: 2, left: 2, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="daily-overview-sales-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dateLabel" hide />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    color: '#f8fafc',
                    padding: '6px 8px',
                  }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  formatter={(value: any) => [
                    `KSh ${Number(value || 0).toLocaleString()}`,
                    'Daily Sales',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#daily-overview-sales-grad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>{analytics.todayUnitsSold} units sold</span>
            {analytics.salesDeltaPct !== null ? (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${
                  analytics.salesDeltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {analytics.salesDeltaPct >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(analytics.salesDeltaPct).toFixed(1)}% vs yest.
              </span>
            ) : (
              <span className="text-slate-500">{trendWindowDays}-day sparkline</span>
            )}
          </div>
        </div>

        {/* 2. Day's Net Profit */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Net Profit (Today)
              </p>
              <p
                className={`text-lg sm:text-xl font-extrabold tabular-nums mt-0.5 ${
                  profitIsNegative ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {profitIsNegative ? '-' : ''}KSh{' '}
                {Math.abs(Math.round(analytics.todayNetProfit)).toLocaleString()}
              </p>
            </div>
            <div
              className={`p-2 rounded-lg border shrink-0 ${
                profitIsNegative
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="h-14 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.dailyTrendData}
                margin={{ top: 4, right: 2, left: 2, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="daily-overview-profit-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={profitIsNegative ? '#fb7185' : '#34d399'}
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="95%"
                      stopColor={profitIsNegative ? '#fb7185' : '#34d399'}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dateLabel" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    color: '#f8fafc',
                    padding: '6px 8px',
                  }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  formatter={(value: any) => [
                    `KSh ${Number(value || 0).toLocaleString()}`,
                    'Daily Net Profit',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="netProfit"
                  stroke={profitIsNegative ? '#fb7185' : '#34d399'}
                  strokeWidth={2}
                  fill="url(#daily-overview-profit-grad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>After COGS, exp &amp; 1.5% TOT</span>
            <span
              className={`font-semibold tabular-nums ${
                profitIsNegative ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {analytics.netMarginPct.toFixed(1)}% margin
            </span>
          </div>
        </div>

        {/* 3. Inventory Turnover Rate */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Inventory Turnover Rate
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-violet-300 tabular-nums mt-0.5">
                {analytics.turnoverRate.toFixed(2)}x
                <span className="text-xs font-semibold text-slate-400 ml-1.5">
                  ({analytics.turnoverPct.toFixed(1)}%)
                </span>
              </p>
            </div>
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>

          <div className="h-14 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.dailyTrendData}
                margin={{ top: 4, right: 2, left: 2, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="daily-overview-turnover-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dateLabel" hide />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    color: '#f8fafc',
                    padding: '6px 8px',
                  }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  formatter={(value: any) => [
                    `${Number(value || 0).toFixed(3)}x`,
                    'Daily Turnover Rate',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="turnoverRate"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  fill="url(#daily-overview-turnover-grad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>COGS / Stock Cost Value</span>
            <span className="font-semibold text-slate-300 tabular-nums">
              {analytics.todayUnitsSold} / {analytics.totalStockUnits} units
            </span>
          </div>
        </div>
      </div>

      {/* Dedicated Daily Sales Trend Sparkline Chart */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-slate-200">
              Daily Sales Trend ({trendWindowDays}-Day Sparkline)
            </p>
            <p className="text-[11px] text-slate-400">
              Avg: <span className="text-slate-200 font-semibold tabular-nums">KSh {Math.round(analytics.periodAvgDailySales).toLocaleString()}/day</span>
              {analytics.peakDay && analytics.peakDay.sales > 0 && (
                <>
                  <span className="text-slate-600 mx-1.5">•</span>
                  Peak: <span className="text-sky-300 font-semibold tabular-nums">{analytics.peakDay.dateLabel} (KSh {analytics.peakDay.sales.toLocaleString()})</span>
                </>
              )}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
            {trendWindowDays}D Total: <span className="text-white">KSh {analytics.periodTotalSales.toLocaleString()}</span>
          </span>
        </div>

        <div className="h-24 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={analytics.dailyTrendData}
              margin={{ top: 6, right: 6, left: 6, bottom: 0 }}
            >
              <defs>
                <linearGradient id="daily-sales-trend-main-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={18}
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '11px',
                  color: '#f8fafc',
                  padding: '6px 10px',
                }}
                labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}
                formatter={(value: any) => [
                  `KSh ${Number(value || 0).toLocaleString()}`,
                  'Daily Sales',
                ]}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#38bdf8"
                strokeWidth={2.25}
                fill="url(#daily-sales-trend-main-grad)"
                dot={{ r: 2, fill: '#38bdf8', strokeWidth: 0 }}
                activeDot={{ r: 4, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
