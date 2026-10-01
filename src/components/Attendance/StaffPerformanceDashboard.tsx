import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Award,
  Clock,
  UserCheck,
  Calendar,
  Filter,
  ArrowUpRight,
  Printer,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  Percent,
  SlidersHorizontal,
  Sparkles,
  Info,
  Maximize2,
  LayoutGrid,
  FileSpreadsheet,
  X,
  Target,
  Trophy,
  ArrowUpDown,
  Zap,
  HelpCircle
} from 'lucide-react';
import {
  User as Employee,
  Transaction,
  AttendanceRecord,
  StaffCommissionPayout
} from '../../types';

export interface StaffPerformanceDashboardProps {
  allUsers: Employee[];
  transactions: Transaction[];
  attendanceRecords: AttendanceRecord[];
  commissionPayouts?: StaffCommissionPayout[];
  currentUser: Employee;
  onNavigateToTab?: (tab: 'attendance' | 'commission' | 'workers' | 'loans') => void;
}

export type TimeframePreset = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';
export type ChartMetricMode = 'all_grouped' | 'sales' | 'commission' | 'reliability';
export type ChartOrientation = 'vertical' | 'horizontal';
export type SortOption = 'sales_desc' | 'commission_desc' | 'reliability_desc' | 'name_asc';

export interface WorkerPerformanceStat {
  worker: Employee;
  totalSales: number;
  salesCount: number;
  avgTicket: number;
  totalCommission: number;
  commissionModelName: string;
  workerAtt: AttendanceRecord[];
  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  onLeaveDays: number;
  totalLoggedShifts: number;
  totalWorkHours: number;
  reliabilityScore: number; // 0 to 100
  recentTransactions: Transaction[];
}

export const StaffPerformanceDashboard: React.FC<StaffPerformanceDashboardProps> = ({
  allUsers,
  transactions,
  attendanceRecords,
  commissionPayouts = [],
  currentUser,
  onNavigateToTab,
}) => {
  // Filters & State
  const [timeframe, setTimeframe] = useState<TimeframePreset>('all');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('all_grouped');
  const [chartOrientation, setChartOrientation] = useState<ChartOrientation>('vertical');
  const [sortBy, setSortBy] = useState<SortOption>('sales_desc');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAverageBenchmark, setShowAverageBenchmark] = useState<boolean>(true);
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState<WorkerPerformanceStat | null>(null);
  const [hoveredBarInfo, setHoveredBarInfo] = useState<{
    workerName: string;
    metricLabel: string;
    metricValue: string;
    secondaryInfo?: string;
  } | null>(null);

  // Timeframe calculation
  const { startDateStr, endDateStr, timeframeLabel } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (timeframe === 'today') {
      return { startDateStr: todayStr, endDateStr: todayStr, timeframeLabel: `Today (${todayStr})` };
    }
    if (timeframe === 'yesterday') {
      const yest = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
      return { startDateStr: yest, endDateStr: yest, timeframeLabel: `Yesterday (${yest})` };
    }
    if (timeframe === 'week') {
      const past7 = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      return { startDateStr: past7, endDateStr: todayStr, timeframeLabel: `Last 7 Days (${past7} to ${todayStr})` };
    }
    if (timeframe === 'month') {
      const past30 = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      return { startDateStr: past30, endDateStr: todayStr, timeframeLabel: `Last 30 Days (${past30} to ${todayStr})` };
    }
    if (timeframe === 'custom') {
      return { startDateStr: customStartDate, endDateStr: customEndDate, timeframeLabel: `${customStartDate} to ${customEndDate}` };
    }
    // 'all'
    return { startDateStr: '2020-01-01', endDateStr: '2030-12-31', timeframeLabel: 'All Recorded History' };
  }, [timeframe, customStartDate, customEndDate]);

  // Filtered transactions for this period
  const periodTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDateStr = (tx.date || '').slice(0, 10);
      return txDateStr >= startDateStr && txDateStr <= endDateStr;
    });
  }, [transactions, startDateStr, endDateStr]);

  // Filtered attendance records for this period
  const periodAttendance = useMemo(() => {
    return attendanceRecords.filter((att) => {
      const attDateStr = (att.date || '').slice(0, 10);
      return attDateStr >= startDateStr && attDateStr <= endDateStr;
    });
  }, [attendanceRecords, startDateStr, endDateStr]);

  // Calculate stats for all workers
  const workerStatsList = useMemo<WorkerPerformanceStat[]>(() => {
    return allUsers.map((worker) => {
      // Attributed transactions
      const staffTx = periodTransactions.filter((tx) => {
        if (tx.salesRepId) {
          return tx.salesRepId === worker.id;
        }
        return tx.cashierId === worker.id || tx.cashierName === worker.name;
      });

      const totalSales = staffTx.reduce((sum, tx) => sum + (tx.grandTotal || 0), 0);
      const salesCount = staffTx.length;
      const avgTicket = salesCount > 0 ? Math.round(totalSales / salesCount) : 0;

      // Commission calculation
      let totalCommission = 0;
      let commissionModelName = `${worker.commissionRate || 5}% Sales Volume`;
      const commType = worker.commissionType || 'percentage';

      if (commType === 'fixed_per_sale') {
        const fixed = worker.fixedCommissionPerSale || 50;
        totalCommission = salesCount * fixed;
        commissionModelName = `Fixed KSh ${fixed}/sale`;
      } else if (commType === 'tiered' && worker.commissionTiers && worker.commissionTiers.length > 0) {
        let activeTier = worker.commissionTiers[0];
        for (const t of worker.commissionTiers) {
          if (totalSales >= t.minSales && (t.maxSales === undefined || totalSales <= t.maxSales)) {
            activeTier = t;
            break;
          }
        }
        if (totalSales > (worker.commissionTiers[worker.commissionTiers.length - 1].minSales || 0)) {
          activeTier = worker.commissionTiers[worker.commissionTiers.length - 1];
        }
        totalCommission = Math.round(totalSales * (activeTier.rate / 100));
        commissionModelName = `Tiered (${activeTier.rate}%)`;
      } else if (commType === 'profit_share') {
        const profitRate = worker.profitShareRate || 15;
        let totalProfit = 0;
        staffTx.forEach((tx) => {
          (tx.items || []).forEach((item) => {
            const cost = item.product?.costPrice || 0;
            const sell = item.product?.sellingPrice || item.unitPrice || 0;
            totalProfit += Math.max(0, (sell - cost) * (item.quantity || 1));
          });
        });
        totalCommission = Math.round(totalProfit * (profitRate / 100));
        commissionModelName = `${profitRate}% Margin Profit Share`;
      } else {
        const rate = worker.commissionRate !== undefined ? worker.commissionRate : 5;
        totalCommission = Math.round(totalSales * (rate / 100));
        commissionModelName = `${rate}% Sales Volume`;
      }

      // Attendance records for this worker
      const workerAtt = periodAttendance.filter(
        (a) => a.employeeId === worker.id || a.employeeName === worker.name
      );
      const presentDays = workerAtt.filter((a) => a.status === 'Present').length;
      const lateDays = workerAtt.filter((a) => a.status === 'Late').length;
      const halfDays = workerAtt.filter((a) => a.status === 'Half-Day').length;
      const absentDays = workerAtt.filter((a) => a.status === 'Absent').length;
      const onLeaveDays = workerAtt.filter((a) => a.status === 'On Leave').length;
      const totalLoggedShifts = workerAtt.length;

      const totalWorkHours = workerAtt.reduce((sum, a) => {
        if (a.workHours !== undefined && a.workHours !== null) return sum + a.workHours;
        if (a.status === 'Present') return sum + 8;
        if (a.status === 'Late') return sum + 7.5;
        if (a.status === 'Half-Day') return sum + 4;
        return sum;
      }, 0);

      // Attendance Reliability score (0 to 100%)
      const scoredShifts = presentDays + lateDays + halfDays + absentDays;
      let reliabilityScore = 0;
      if (scoredShifts > 0) {
        // Present = 100%, Late = 70%, Half-Day = 50%, Absent = 0%
        const score = (presentDays * 100 + lateDays * 70 + halfDays * 50) / scoredShifts;
        reliabilityScore = Math.min(100, Math.max(0, Math.round(score)));
      } else if (salesCount > 0) {
        // Active sales recorded in period despite missing clock-in record
        reliabilityScore = 85;
      } else {
        reliabilityScore = 0;
      }

      return {
        worker,
        totalSales,
        salesCount,
        avgTicket,
        totalCommission,
        commissionModelName,
        workerAtt,
        presentDays,
        lateDays,
        halfDays,
        absentDays,
        onLeaveDays,
        totalLoggedShifts,
        totalWorkHours,
        reliabilityScore,
        recentTransactions: staffTx.slice(0, 10),
      };
    });
  }, [allUsers, periodTransactions, periodAttendance]);

  // Filtered & Sorted Worker Stats
  const filteredAndSortedStats = useMemo(() => {
    let list = [...workerStatsList];

    // Filter by role
    if (roleFilter !== 'All') {
      list = list.filter((item) => {
        const roles = item.worker.roles || [item.worker.role];
        return roles.includes(roleFilter as any) || item.worker.role === roleFilter;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.worker.name.toLowerCase().includes(q) ||
          item.worker.role.toLowerCase().includes(q) ||
          (item.worker.department && item.worker.department.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'sales_desc') return b.totalSales - a.totalSales;
      if (sortBy === 'commission_desc') return b.totalCommission - a.totalCommission;
      if (sortBy === 'reliability_desc') return b.reliabilityScore - a.reliabilityScore;
      if (sortBy === 'name_asc') return a.worker.name.localeCompare(b.worker.name);
      return 0;
    });

    return list;
  }, [workerStatsList, roleFilter, searchQuery, sortBy]);

  // Overall Store KPI aggregates
  const teamAggregates = useMemo(() => {
    const totalSales = workerStatsList.reduce((sum, s) => sum + s.totalSales, 0);
    const totalCommissions = workerStatsList.reduce((sum, s) => sum + s.totalCommission, 0);
    const totalTransactions = workerStatsList.reduce((sum, s) => sum + s.salesCount, 0);

    const activeReliabilityWorkers = workerStatsList.filter((s) => s.totalLoggedShifts > 0 || s.salesCount > 0);
    const avgReliability =
      activeReliabilityWorkers.length > 0
        ? Math.round(
            activeReliabilityWorkers.reduce((sum, s) => sum + s.reliabilityScore, 0) /
              activeReliabilityWorkers.length
          )
        : 0;

    // Top seller
    const topSeller = [...workerStatsList].sort((a, b) => b.totalSales - a.totalSales)[0];
    // Top earner
    const topEarner = [...workerStatsList].sort((a, b) => b.totalCommission - a.totalCommission)[0];
    // Top attendance
    const topReliable = [...workerStatsList].sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0];

    return {
      totalSales,
      totalCommissions,
      totalTransactions,
      avgReliability,
      topSeller,
      topEarner,
      topReliable,
    };
  }, [workerStatsList]);

  // Max bounds for bar normalization
  const maxSales = useMemo(() => {
    const val = Math.max(...workerStatsList.map((s) => s.totalSales), 1000);
    return Math.ceil(val / 1000) * 1000;
  }, [workerStatsList]);

  const maxCommission = useMemo(() => {
    const val = Math.max(...workerStatsList.map((s) => s.totalCommission), 500);
    return Math.ceil(val / 500) * 500;
  }, [workerStatsList]);

  // Average benchmarks
  const avgSales = useMemo(() => {
    if (workerStatsList.length === 0) return 0;
    return Math.round(teamAggregates.totalSales / workerStatsList.length);
  }, [workerStatsList, teamAggregates.totalSales]);

  const avgCommission = useMemo(() => {
    if (workerStatsList.length === 0) return 0;
    return Math.round(teamAggregates.totalCommissions / workerStatsList.length);
  }, [workerStatsList, teamAggregates.totalCommissions]);

  // Print Handler
  const handlePrintDashboard = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-sky-600/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
                Staff Performance Dashboard
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Visual bar charts tracking sales volume, earned commissions, and attendance reliability across workers
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeframe === 'today'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('yesterday')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeframe === 'yesterday'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeframe === 'week'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeframe === 'month'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeframe === 'all'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handlePrintDashboard}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
            title="Print or save performance report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Sales Generated */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Staff Sales
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              KSh {teamAggregates.totalSales.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
            <span>{teamAggregates.totalTransactions} transactions recorded</span>
            <span>•</span>
            <span className="text-sky-400 font-semibold truncate">
              Top: {teamAggregates.topSeller?.worker.name || 'N/A'}
            </span>
          </div>
        </div>

        {/* Card 2: Commissions Earned */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Commissions Earned
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              KSh {teamAggregates.totalCommissions.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
            <span>Avg: KSh {avgCommission.toLocaleString()}/worker</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold truncate">
              Top: {teamAggregates.topEarner?.worker.name || 'N/A'}
            </span>
          </div>
        </div>

        {/* Card 3: Attendance Reliability */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Team Reliability Score
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300 font-mono">
              {teamAggregates.avgReliability}%
            </span>
            <span className="text-[11px] font-bold text-slate-400">Punctuality index</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
            <span>{periodAttendance.length} shift logs</span>
            <span>•</span>
            <span className="text-amber-400 font-semibold truncate">
              Star: {teamAggregates.topReliable?.worker.name || 'N/A'}
            </span>
          </div>
        </div>

        {/* Card 4: Top All-Round Performer */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950/60 border border-indigo-900/40 p-4 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Leader Performer
            </span>
            <span className="text-[10px] font-mono bg-indigo-950 text-indigo-200 border border-indigo-800 px-2 py-0.5 rounded-full font-bold">
              Rank #1
            </span>
          </div>
          <div className="mt-2">
            <div className="text-base font-extrabold text-white truncate">
              {teamAggregates.topSeller?.worker.name || 'All Active Workers'}
            </div>
            <div className="text-[11px] text-indigo-300 font-mono mt-0.5">
              KSh {(teamAggregates.topSeller?.totalSales || 0).toLocaleString()} Sales • {teamAggregates.topSeller?.reliabilityScore || 0}% Reliability
            </div>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Highest generated volume in {timeframeLabel}</span>
          </div>
        </div>
      </div>

      {/* CHART CONTROLS & DISPLAY SETTINGS */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Metric Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMetricMode('all_grouped')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                metricMode === 'all_grouped'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All 3 Metrics (Grouped Bar Chart)</span>
            </button>
            <button
              onClick={() => setMetricMode('sales')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                metricMode === 'sales'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              <span>Sales Volume</span>
            </button>
            <button
              onClick={() => setMetricMode('commission')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                metricMode === 'commission'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>Commissions</span>
            </button>
            <button
              onClick={() => setMetricMode('reliability')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                metricMode === 'reliability'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>Attendance Reliability %</span>
            </button>
          </div>

          {/* Orientation & Benchmark Toggles */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setChartOrientation('vertical')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  chartOrientation === 'vertical'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vertical Column Chart"
              >
                Columns
              </button>
              <button
                onClick={() => setChartOrientation('horizontal')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  chartOrientation === 'horizontal'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Horizontal Bar Rows"
              >
                Rows
              </button>
            </div>

            <button
              onClick={() => setShowAverageBenchmark(!showAverageBenchmark)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                showAverageBenchmark
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle Team Average Benchmark Lines"
            >
              Benchmark Line: {showAverageBenchmark ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* Secondary Filter Bar: Sort & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort By:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="sales_desc">Sales (High to Low)</option>
              <option value="commission_desc">Commission (High to Low)</option>
              <option value="reliability_desc">Attendance Reliability (High to Low)</option>
              <option value="name_asc">Worker Name (A to Z)</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Cashier">Cashier</option>
              <option value="Inventory Staff">Inventory Staff</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter worker by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl pl-8 pr-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* BAR CHART CANVAS SECTION */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        {/* Chart Header & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span>Worker Performance Bar Chart</span>
              <span className="text-[11px] font-normal text-slate-400">
                ({filteredAndSortedStats.length} worker{filteredAndSortedStats.length === 1 ? '' : 's'})
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Period: {timeframeLabel} • Click any bar to open detailed sales & shift logs
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs flex-wrap font-semibold">
            {(metricMode === 'all_grouped' || metricMode === 'sales') && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-sky-500 shadow-sm shadow-sky-500/30" />
                <span className="text-slate-300">Sales Generated (KSh)</span>
              </div>
            )}
            {(metricMode === 'all_grouped' || metricMode === 'commission') && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 shadow-sm shadow-emerald-500/30" />
                <span className="text-slate-300">Commissions Earned (KSh)</span>
              </div>
            )}
            {(metricMode === 'all_grouped' || metricMode === 'reliability') && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500 shadow-sm shadow-amber-500/30" />
                <span className="text-slate-300">Attendance Reliability (0-100%)</span>
              </div>
            )}
            {showAverageBenchmark && (
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-b-2 border-dashed border-indigo-400" />
                <span className="text-indigo-300 text-[11px]">Benchmark Avg</span>
              </div>
            )}
          </div>
        </div>

        {/* Hovered Bar Floating Indicator */}
        {hoveredBarInfo && (
          <div className="bg-slate-950 border border-sky-500/40 p-2.5 rounded-xl text-xs shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{hoveredBarInfo.workerName}:</span>
              <span className="text-sky-300 font-semibold">{hoveredBarInfo.metricLabel}</span>
              <span className="font-mono font-black text-emerald-400">{hoveredBarInfo.metricValue}</span>
            </div>
            {hoveredBarInfo.secondaryInfo && (
              <span className="text-[11px] text-slate-400">{hoveredBarInfo.secondaryInfo}</span>
            )}
          </div>
        )}

        {/* THE BAR CHART */}
        {filteredAndSortedStats.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
            <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
            <span className="font-bold text-slate-300">No staff matched your filters</span>
            <span className="text-slate-500 mt-1">Try switching timeframe or clearing role filter</span>
          </div>
        ) : chartOrientation === 'vertical' ? (
          /* VERTICAL COLUMN BAR CHART */
          <div className="relative pt-6 pb-2 overflow-x-auto">
            {/* Height container */}
            <div className="min-w-[500px] h-[340px] flex items-end justify-around gap-4 sm:gap-6 px-4 border-b border-slate-800 relative">
              {/* Background Grid Lines & Scale */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between text-[10px] font-mono text-slate-600">
                <div className="border-b border-slate-800/60 w-full flex justify-between pr-2">
                  <span>100% / Max</span>
                  <span>{metricMode === 'reliability' ? '100%' : `Max KSh ${maxSales.toLocaleString()}`}</span>
                </div>
                <div className="border-b border-slate-800/40 w-full flex justify-between pr-2">
                  <span>75%</span>
                  <span>{metricMode === 'reliability' ? '75%' : `KSh ${Math.round(maxSales * 0.75).toLocaleString()}`}</span>
                </div>
                <div className="border-b border-slate-800/40 w-full flex justify-between pr-2">
                  <span>50%</span>
                  <span>{metricMode === 'reliability' ? '50%' : `KSh ${Math.round(maxSales * 0.5).toLocaleString()}`}</span>
                </div>
                <div className="border-b border-slate-800/40 w-full flex justify-between pr-2">
                  <span>25%</span>
                  <span>{metricMode === 'reliability' ? '25%' : `KSh ${Math.round(maxSales * 0.25).toLocaleString()}`}</span>
                </div>
                <div className="w-full flex justify-between pr-2 text-slate-700">
                  <span>0%</span>
                  <span>0</span>
                </div>
              </div>

              {/* Benchmark Reference Line */}
              {showAverageBenchmark && maxSales > 0 && (
                <div
                  style={{
                    bottom: `${Math.min(95, Math.max(5, (avgSales / maxSales) * 100))}%`,
                  }}
                  className="absolute left-0 right-0 border-b-2 border-dashed border-indigo-400/60 z-10 pointer-events-none flex items-center justify-end pr-2"
                >
                  <span className="bg-indigo-950 text-indigo-300 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-indigo-800 shadow">
                    Avg: KSh {avgSales.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Worker Column Groups */}
              {filteredAndSortedStats.map((item, idx) => {
                const salesHeight = maxSales > 0 ? (item.totalSales / maxSales) * 100 : 0;
                const commHeight = maxCommission > 0 ? (item.totalCommission / maxCommission) * 100 : 0;
                const relHeight = item.reliabilityScore; // 0 - 100

                return (
                  <div
                    key={item.worker.id}
                    className="flex-1 max-w-[130px] flex flex-col items-center justify-end h-full z-20 group cursor-pointer"
                    onClick={() => setSelectedWorkerDetail(item)}
                  >
                    {/* The 3 Grouped Bars */}
                    <div className="flex items-end justify-center gap-1.5 w-full h-[260px] pb-2">
                      {/* Bar 1: Sales */}
                      {(metricMode === 'all_grouped' || metricMode === 'sales') && (
                        <div
                          className="w-full max-w-[28px] flex flex-col justify-end items-center h-full relative"
                          onMouseEnter={() =>
                            setHoveredBarInfo({
                              workerName: item.worker.name,
                              metricLabel: 'Sales Generated',
                              metricValue: `KSh ${item.totalSales.toLocaleString()}`,
                              secondaryInfo: `${item.salesCount} sales • Avg Ticket KSh ${item.avgTicket.toLocaleString()}`,
                            })
                          }
                          onMouseLeave={() => setHoveredBarInfo(null)}
                        >
                          {/* Value tag on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-slate-950 text-sky-400 font-mono text-[9px] font-black px-1 py-0.5 rounded shadow pointer-events-none border border-sky-500/30 whitespace-nowrap z-30">
                            KSh {item.totalSales >= 1000 ? `${(item.totalSales / 1000).toFixed(1)}k` : item.totalSales}
                          </div>

                          <div
                            style={{ height: `${Math.max(4, salesHeight)}%` }}
                            className="w-full rounded-t-md bg-gradient-to-t from-sky-700 via-sky-600 to-sky-400 group-hover:from-sky-600 group-hover:to-sky-300 transition-all duration-300 shadow-lg shadow-sky-600/20"
                          />
                        </div>
                      )}

                      {/* Bar 2: Commission */}
                      {(metricMode === 'all_grouped' || metricMode === 'commission') && (
                        <div
                          className="w-full max-w-[28px] flex flex-col justify-end items-center h-full relative"
                          onMouseEnter={() =>
                            setHoveredBarInfo({
                              workerName: item.worker.name,
                              metricLabel: 'Commission Earned',
                              metricValue: `KSh ${item.totalCommission.toLocaleString()}`,
                              secondaryInfo: `Model: ${item.commissionModelName}`,
                            })
                          }
                          onMouseLeave={() => setHoveredBarInfo(null)}
                        >
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-slate-950 text-emerald-400 font-mono text-[9px] font-black px-1 py-0.5 rounded shadow pointer-events-none border border-emerald-500/30 whitespace-nowrap z-30">
                            KSh {item.totalCommission >= 1000 ? `${(item.totalCommission / 1000).toFixed(1)}k` : item.totalCommission}
                          </div>

                          <div
                            style={{ height: `${Math.max(4, commHeight)}%` }}
                            className="w-full rounded-t-md bg-gradient-to-t from-emerald-700 via-emerald-600 to-emerald-400 group-hover:from-emerald-600 group-hover:to-emerald-300 transition-all duration-300 shadow-lg shadow-emerald-600/20"
                          />
                        </div>
                      )}

                      {/* Bar 3: Attendance Reliability */}
                      {(metricMode === 'all_grouped' || metricMode === 'reliability') && (
                        <div
                          className="w-full max-w-[28px] flex flex-col justify-end items-center h-full relative"
                          onMouseEnter={() =>
                            setHoveredBarInfo({
                              workerName: item.worker.name,
                              metricLabel: 'Attendance Reliability',
                              metricValue: `${item.reliabilityScore}%`,
                              secondaryInfo: `${item.presentDays} Present • ${item.lateDays} Late • ${item.absentDays} Absent`,
                            })
                          }
                          onMouseLeave={() => setHoveredBarInfo(null)}
                        >
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-slate-950 text-amber-300 font-mono text-[9px] font-black px-1 py-0.5 rounded shadow pointer-events-none border border-amber-500/30 whitespace-nowrap z-30">
                            {item.reliabilityScore}%
                          </div>

                          <div
                            style={{ height: `${Math.max(4, relHeight)}%` }}
                            className="w-full rounded-t-md bg-gradient-to-t from-amber-700 via-amber-600 to-yellow-400 group-hover:from-amber-600 group-hover:to-yellow-300 transition-all duration-300 shadow-lg shadow-amber-600/20"
                          />
                        </div>
                      )}
                    </div>

                    {/* Worker Label below bars */}
                    <div className="w-full text-center pt-2">
                      <div className="font-extrabold text-xs text-slate-200 group-hover:text-sky-400 truncate max-w-[110px] transition" title={item.worker.name}>
                        {item.worker.name.split(' ')[0]}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate max-w-[110px]">
                        {item.worker.role}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* HORIZONTAL BAR ROWS */
          <div className="space-y-3.5 pt-2">
            {filteredAndSortedStats.map((item, idx) => {
              const salesPct = maxSales > 0 ? (item.totalSales / maxSales) * 100 : 0;
              const commPct = maxCommission > 0 ? (item.totalCommission / maxCommission) * 100 : 0;
              const relPct = item.reliabilityScore;

              return (
                <div
                  key={item.worker.id}
                  onClick={() => setSelectedWorkerDetail(item)}
                  className="bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 p-3.5 rounded-xl transition duration-150 cursor-pointer shadow-sm group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-sky-400 font-black text-xs flex items-center justify-center border border-slate-700">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-100 group-hover:text-sky-300 transition">
                          {item.worker.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.worker.role} • {item.commissionModelName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-sky-400 font-bold">
                        KSh {item.totalSales.toLocaleString()}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-emerald-400 font-bold">
                        KSh {item.totalCommission.toLocaleString()}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-300 font-bold">
                        {item.reliabilityScore}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar Tracks */}
                  <div className="space-y-1.5 text-[10px]">
                    {/* Sales Track */}
                    {(metricMode === 'all_grouped' || metricMode === 'sales') && (
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-slate-400 font-medium shrink-0">Sales (KSh)</span>
                        <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                          <div
                            style={{ width: `${Math.max(2, salesPct)}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-300 shadow-sm"
                          />
                        </div>
                        <span className="w-24 text-right font-mono font-bold text-sky-300 shrink-0">
                          KSh {item.totalSales.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Commission Track */}
                    {(metricMode === 'all_grouped' || metricMode === 'commission') && (
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-slate-400 font-medium shrink-0">Commission</span>
                        <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                          <div
                            style={{ width: `${Math.max(2, commPct)}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300 shadow-sm"
                          />
                        </div>
                        <span className="w-24 text-right font-mono font-bold text-emerald-300 shrink-0">
                          KSh {item.totalCommission.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Reliability Track */}
                    {(metricMode === 'all_grouped' || metricMode === 'reliability') && (
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-slate-400 font-medium shrink-0">Reliability</span>
                        <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                          <div
                            style={{ width: `${Math.max(2, relPct)}%` }}
                            className={`h-full rounded-full transition-all duration-300 shadow-sm ${
                              relPct >= 90
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                : relPct >= 75
                                ? 'bg-gradient-to-r from-amber-600 to-yellow-400'
                                : 'bg-gradient-to-r from-rose-600 to-rose-400'
                            }`}
                          />
                        </div>
                        <span className="w-24 text-right font-mono font-bold text-amber-300 shrink-0">
                          {item.reliabilityScore}% ({item.presentDays}P/{item.lateDays}L)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPARATIVE LEADERBOARD TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Staff Performance Leaderboard & Details</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Itemized sales volume, commissions earned, and punctuality breakdown per team member
            </p>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            Showing {filteredAndSortedStats.length} of {allUsers.length} Workers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Rank & Worker</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">Sales Volume</th>
                <th className="py-3 px-4 text-right">Receipts</th>
                <th className="py-3 px-4 text-right">Commission Earned</th>
                <th className="py-3 px-4 text-center">Attendance Log</th>
                <th className="py-3 px-4 text-right">Reliability Index</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredAndSortedStats.map((item, idx) => {
                const isLeader = idx === 0 && item.totalSales > 0;

                return (
                  <tr
                    key={item.worker.id}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => setSelectedWorkerDetail(item)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] font-mono ${
                            idx === 0
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : idx === 1
                              ? 'bg-slate-700 text-slate-200'
                              : idx === 2
                              ? 'bg-amber-900/40 text-amber-400'
                              : 'bg-slate-950 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-extrabold text-slate-100 flex items-center gap-1.5">
                            <span>{item.worker.name}</span>
                            {isLeader && (
                              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.worker.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-slate-300">
                        {item.worker.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-sky-400 text-sm">
                      KSh {item.totalSales.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {item.salesCount}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-black text-emerald-400 text-sm">
                        KSh {item.totalCommission.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.commissionModelName}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                        <span className="text-emerald-400 font-bold" title="Present on time">
                          {item.presentDays}P
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="text-amber-400 font-bold" title="Late arrival">
                          {item.lateDays}L
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="text-rose-400 font-bold" title="Absent">
                          {item.absentDays}A
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.totalWorkHours.toFixed(1)} hrs
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 font-mono font-black">
                        <span
                          className={`text-sm ${
                            item.reliabilityScore >= 90
                              ? 'text-emerald-400'
                              : item.reliabilityScore >= 75
                              ? 'text-amber-300'
                              : 'text-rose-400'
                          }`}
                        >
                          {item.reliabilityScore}%
                        </span>
                      </div>
                      <div className="w-20 ml-auto bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          style={{ width: `${item.reliabilityScore}%` }}
                          className={`h-full rounded-full ${
                            item.reliabilityScore >= 90
                              ? 'bg-emerald-500'
                              : item.reliabilityScore >= 75
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorkerDetail(item);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* WORKER DETAIL MODAL */}
      {selectedWorkerDetail && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full p-5 space-y-4 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow">
                  {selectedWorkerDetail.worker.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {selectedWorkerDetail.worker.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedWorkerDetail.worker.role} • {selectedWorkerDetail.worker.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedWorkerDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Sales Generated</div>
                <div className="text-lg font-black text-sky-400 font-mono mt-0.5">
                  KSh {selectedWorkerDetail.totalSales.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {selectedWorkerDetail.salesCount} receipts
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Commission Earned</div>
                <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                  KSh {selectedWorkerDetail.totalCommission.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {selectedWorkerDetail.commissionModelName}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Reliability Index</div>
                <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
                  {selectedWorkerDetail.reliabilityScore}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {selectedWorkerDetail.presentDays}P / {selectedWorkerDetail.lateDays}L / {selectedWorkerDetail.absentDays}A
                </div>
              </div>
            </div>

            {/* Recent Shift Records */}
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Recent Attendance Records</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedWorkerDetail.workerAtt.length} Shifts Logged
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {selectedWorkerDetail.workerAtt.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No attendance records logged in this timeframe.
                  </div>
                ) : (
                  selectedWorkerDetail.workerAtt.map((att) => (
                    <div
                      key={att.id}
                      className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-300">{att.date}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            att.status === 'Present'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : att.status === 'Late'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {att.status}
                        </span>
                        {att.notes && (
                          <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            "{att.notes}"
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-slate-400 text-[11px]">
                        In: {att.clockInTime} {att.clockOutTime ? `| Out: ${att.clockOutTime}` : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <div className="text-slate-400">
                Staff ID: <span className="font-mono text-slate-300">{selectedWorkerDetail.worker.id}</span>
              </div>

              <div className="flex items-center gap-2">
                {onNavigateToTab && (
                  <button
                    onClick={() => {
                      setSelectedWorkerDetail(null);
                      onNavigateToTab('commission');
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Go to Commission View</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedWorkerDetail(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
