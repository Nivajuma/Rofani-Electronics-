import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Package,
  CheckCircle2,
  Calendar,
  DollarSign,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Plus,
  Minus,
  Check,
  X,
  Building2,
  HelpCircle,
  Clock,
  Layers,
  Zap,
  Info,
  ExternalLink
} from 'lucide-react';
import { Product, Transaction, User } from '../../types';
import {
  calculateReplenishmentPlan,
  ReplenishmentItem,
  ReplenishmentSummary,
  ReplenishmentUrgency
} from '../../utils/replenishment';

interface PredictiveRestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  transactions?: Transaction[];
  storeName: string;
  onQuickRestockProduct?: (productId: string, addedQuantity: number, reason?: string) => void;
  onOpenAiAssistantWithPrompt?: (prompt: string) => void;
  currentUser?: User;
}

interface AiStrategyReport {
  executiveSummary: string;
  priorityActions: string[];
  workingCapitalTip: string;
  demandOutlook: string;
}

export const PredictiveRestockModal: React.FC<PredictiveRestockModalProps> = ({
  isOpen,
  onClose,
  products,
  transactions = [],
  storeName,
  onQuickRestockProduct,
  onOpenAiAssistantWithPrompt,
  currentUser
}) => {
  const [targetDaysCover, setTargetDaysCover] = useState<number>(21);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'reorder_soon' | 'overstocked'>('critical');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editableQtys, setEditableQtys] = useState<Record<string, number>>({});
  const [aiReport, setAiReport] = useState<AiStrategyReport | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [restockedIds, setRestockedIds] = useState<Set<string>>(new Set());

  // 1. Calculate Replenishment Plan from actual inventory & transactions
  const { items: allItems, summary } = useMemo(() => {
    return calculateReplenishmentPlan(products, transactions, targetDaysCover, 30);
  }, [products, transactions, targetDaysCover]);

  // Sync initial editable quantities
  useEffect(() => {
    const qtys: Record<string, number> = {};
    allItems.forEach((item) => {
      qtys[item.productId] = item.recommendedOrderQty;
    });
    setEditableQtys(qtys);
  }, [allItems]);

  // Fetch AI Strategic Forecast on open if not loaded
  useEffect(() => {
    if (isOpen && !aiReport && !loadingAi) {
      fetchAiForecast();
    }
  }, [isOpen]);

  const fetchAiForecast = async () => {
    setLoadingAi(true);
    try {
      const response = await fetch('/api/ai/replenishment-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: allItems.slice(0, 15),
          summary,
          storeName,
          targetDaysCover,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiReport(data);
      }
    } catch (err) {
      console.warn('Could not fetch AI forecast:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  if (!isOpen) return null;

  // Categories list for filter
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  // Filtered Items
  const filteredItems = allItems.filter((item) => {
    if (activeTab === 'critical') {
      if (item.urgency !== 'critical' && item.urgency !== 'out_of_stock') return false;
    } else if (activeTab === 'reorder_soon') {
      if (item.urgency !== 'reorder_soon') return false;
    } else if (activeTab === 'overstocked') {
      if (item.urgency !== 'overstocked' && item.urgency !== 'stagnant') return false;
    }

    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.productName.toLowerCase().includes(q);
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchCat = item.category?.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchCat) return false;
    }

    return true;
  });

  const handleQtyChange = (productId: string, delta: number) => {
    setEditableQtys((prev) => {
      const current = prev[productId] ?? 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleSetQtyDirect = (productId: string, val: number) => {
    setEditableQtys((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  };

  // Total recalculated cost based on user-edited quantities
  const totalAdjustedCost = filteredItems.reduce((acc, item) => {
    const qty = editableQtys[item.productId] ?? item.recommendedOrderQty;
    return acc + qty * item.costPrice;
  }, 0);

  const totalAdjustedUnits = filteredItems.reduce((acc, item) => {
    const qty = editableQtys[item.productId] ?? item.recommendedOrderQty;
    return acc + qty;
  }, 0);

  // Export to CSV for suppliers
  const handleExportCSV = () => {
    const headers = [
      'Product Name',
      'SKU',
      'Category',
      'Current Stock',
      'Min Stock Alert',
      'Daily Velocity (units/day)',
      'Days Runway Left',
      'Urgency',
      'Recommended Order Qty',
      'Unit Cost (KSh)',
      'Total Estimated Cost (KSh)',
      'Supplier',
    ];

    const rows = filteredItems.map((item) => {
      const qty = editableQtys[item.productId] ?? item.recommendedOrderQty;
      return [
        `"${item.productName.replace(/"/g, '""')}"`,
        `"${item.sku}"`,
        `"${item.category || ''}"`,
        item.currentStock,
        item.minStockAlert,
        item.dailyVelocity,
        item.daysRemaining === 999 ? 'N/A' : item.daysRemaining,
        item.urgency,
        qty,
        item.costPrice,
        qty * item.costPrice,
        `"${item.supplierName || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ROFANI_Restock_Plan_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print purchase order / restock sheet
  const handlePrint = () => {
    window.print();
  };

  // Quick Restock handler
  const handleApplyQuickRestock = (item: ReplenishmentItem) => {
    const orderQty = editableQtys[item.productId] ?? item.recommendedOrderQty;
    if (orderQty <= 0) return;

    if (onQuickRestockProduct) {
      onQuickRestockProduct(
        item.productId,
        orderQty,
        `AI Predictive Restock (${orderQty} units to replenish ${item.daysRemaining} days runway)`
      );
      setRestockedIds((prev) => new Set([...prev, item.productId]));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 p-0.5 shadow-lg shadow-indigo-600/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  AI Predictive Restock & Replenishment
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Gemini 3.8
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold hidden sm:inline">
                  {storeName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated stock velocity runway analysis, depletion forecasting, and smart purchase order planning.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Target Horizon Selector */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl p-1 text-xs">
              <span className="text-slate-400 px-2 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Runway:
              </span>
              {[
                { days: 14, label: '14 Days' },
                { days: 21, label: '21 Days' },
                { days: 30, label: '30 Days' },
              ].map((h) => (
                <button
                  key={h.days}
                  onClick={() => setTargetDaysCover(h.days)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                    targetDaysCover === h.days
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchAiForecast}
              disabled={loadingAi}
              title="Refresh AI Forecast with latest live transactions"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAi ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden md:inline">Refresh AI</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* High-Level Inventory Health & Metrics */}
        <div className="p-4 sm:p-6 bg-slate-900/60 border-b border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Critical & Stockouts</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-400">
                {summary.outOfStockCount + summary.criticalCount}
              </span>
              <span className="text-xs text-rose-300/80">
                ({summary.outOfStockCount} zero stock, {summary.criticalCount} &lt;4d)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">High risk of imminent lost retail sales</p>
          </div>

          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Reorder Soon</span>
              <Package className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">
                {summary.reorderSoonCount}
              </span>
              <span className="text-xs text-amber-300/80">within 10-day buffer</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Approaching minimum shelf threshold</p>
          </div>

          <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Restock Capital Required</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-indigo-300">KSh</span>
              <span className="text-xl sm:text-2xl font-black text-white">
                {summary.totalWorkingCapitalNeeded.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              For ~{summary.totalRecommendedUnits.toLocaleString()} units to cover {targetDaysCover} days
            </p>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Inventory Health Score</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {summary.overallHealthScore}/100
              </span>
              <span className="text-xs font-bold text-slate-400">
                {summary.overallHealthScore >= 80 ? 'Good' : summary.overallHealthScore >= 60 ? 'Fair' : 'Attention'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  summary.overallHealthScore >= 80
                    ? 'bg-emerald-400'
                    : summary.overallHealthScore >= 60
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
                style={{ width: `${summary.overallHealthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* AI Strategic Intelligence Banner */}
        {aiReport && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border-b border-indigo-900/50">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                  Gemini AI Executive Replenishment Briefing
                </span>
              </div>
              {onOpenAiAssistantWithPrompt && (
                <button
                  onClick={() =>
                    onOpenAiAssistantWithPrompt(
                      `Give me a detailed supplier replenishment plan for our ${summary.criticalCount} critical items and how to negotiate terms in Kenya.`
                    )
                  }
                  className="text-xs text-indigo-300 hover:text-white font-bold flex items-center gap-1.5 transition underline-offset-2 hover:underline"
                >
                  <span>Ask AI Co-Pilot for Supplier Negotiation Tips</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-3">
              {aiReport.executiveSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <span className="font-bold text-amber-400 flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Prioritized Action Items:
                </span>
                <ul className="space-y-1 text-slate-300">
                  {aiReport.priorityActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    Working Capital Strategy:
                  </span>
                  <p className="text-slate-300 leading-relaxed">{aiReport.workingCapitalTip}</p>
                </div>
                {aiReport.demandOutlook && (
                  <p className="text-[11px] text-slate-400 mt-2 italic">
                    Outlook: {aiReport.demandOutlook}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Toolbar: Filters, Search, and Action Buttons */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Tab Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 overflow-x-auto">
            <button
              onClick={() => setActiveTab('critical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'critical'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Critical & Out</span>
              <span className="bg-rose-950/60 border border-rose-400/40 text-rose-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {summary.outOfStockCount + summary.criticalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reorder_soon')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'reorder_soon'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Reorder Soon</span>
              <span className="bg-amber-950/60 border border-amber-400/40 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {summary.reorderSoonCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('overstocked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'overstocked'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Overstocked / Slow</span>
              <span className="bg-indigo-950/60 border border-indigo-400/40 text-indigo-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {summary.overstockedCount + summary.stagnantCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Catalog</span>
              <span className="bg-slate-900 text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {summary.totalCatalogItems}
              </span>
            </button>
          </div>

          {/* Search & Category */}
          <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
            <div className="relative flex-grow sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search SKU, item name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white pl-9 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Export Buttons */}
            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              title="Download Purchase Order as CSV for suppliers"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PO CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5"
              title="Print replenishment plan"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Replenishment Table */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[500px]">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-white mb-1">No Items in this Filter</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No products match the selected criteria. All items may have healthy inventory runways for this filter.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-4">Product & Category</th>
                  <th className="py-3 px-3 text-center">Current Stock</th>
                  <th className="py-3 px-3 text-center">Sales Velocity</th>
                  <th className="py-3 px-3 text-center">Stock Runway</th>
                  <th className="py-3 px-3 text-center">Suggested Order</th>
                  <th className="py-3 px-3 text-right">Unit / Total Cost</th>
                  <th className="py-3 px-4 text-center">Status & Rationale</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredItems.map((item) => {
                  const qty = editableQtys[item.productId] ?? item.recommendedOrderQty;
                  const itemTotalCost = qty * item.costPrice;
                  const isRestocked = restockedIds.has(item.productId);

                  return (
                    <tr
                      key={item.productId}
                      className={`hover:bg-slate-800/40 transition ${
                        item.urgency === 'out_of_stock'
                          ? 'bg-rose-950/10'
                          : item.urgency === 'critical'
                          ? 'bg-rose-950/5'
                          : item.urgency === 'reorder_soon'
                          ? 'bg-amber-950/5'
                          : ''
                      }`}
                    >
                      {/* Product */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm line-clamp-1">
                              {item.productName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span className="font-mono bg-slate-800 px-1 rounded text-slate-300">
                                {item.sku}
                              </span>
                              <span>•</span>
                              <span>{item.category}</span>
                              {item.supplierName && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-500 truncate max-w-[120px]">
                                    {item.supplierName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Stock vs Min Alert */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-black text-sm ${
                              item.currentStock <= 0
                                ? 'text-rose-400'
                                : item.currentStock <= item.minStockAlert
                                ? 'text-amber-400'
                                : 'text-slate-200'
                            }`}
                          >
                            {item.currentStock} {item.unit}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Min: {item.minStockAlert}
                          </span>
                        </div>
                      </td>

                      {/* Sales Velocity */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-200 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-sky-400" />
                            {item.dailyVelocity} / day
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ~{item.weeklyVelocity} / week ({item.totalUnitsSold} sold)
                          </span>
                        </div>
                      </td>

                      {/* Runway Days */}
                      <td className="py-3 px-3 text-center">
                        {item.currentStock <= 0 ? (
                          <span className="inline-block bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black px-2.5 py-1 rounded-full animate-pulse">
                            0 Days (Stockout)
                          </span>
                        ) : item.daysRemaining <= 4 ? (
                          <span className="inline-block bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-black px-2.5 py-1 rounded-full">
                            ~{item.daysRemaining} days left
                          </span>
                        ) : item.daysRemaining <= 10 ? (
                          <span className="inline-block bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold px-2.5 py-1 rounded-full">
                            ~{item.daysRemaining} days
                          </span>
                        ) : item.daysRemaining >= 999 ? (
                          <span className="inline-block bg-slate-800 text-slate-400 text-[11px] px-2.5 py-1 rounded-full">
                            No sales yet
                          </span>
                        ) : (
                          <span className="inline-block bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-1 rounded-full">
                            {item.daysRemaining} days
                          </span>
                        )}
                      </td>

                      {/* Suggested Order (Editable) */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                          <button
                            onClick={() => handleQtyChange(item.productId, -1)}
                            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"
                            title="Decrease order quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) =>
                              handleSetQtyDirect(item.productId, parseInt(e.target.value) || 0)
                            }
                            className="w-12 text-center bg-transparent text-white font-black text-xs focus:outline-none"
                          />
                          <button
                            onClick={() => handleQtyChange(item.productId, 1)}
                            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"
                            title="Increase order quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Cost Details */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-white">
                          KSh {itemTotalCost.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          @ KSh {item.costPrice.toLocaleString()} cost
                        </div>
                      </td>

                      {/* Status & Rationale */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.urgency === 'out_of_stock'
                                ? 'bg-rose-500/20 text-rose-300'
                                : item.urgency === 'critical'
                                ? 'bg-rose-500/20 text-rose-300'
                                : item.urgency === 'reorder_soon'
                                ? 'bg-amber-500/20 text-amber-300'
                                : item.urgency === 'overstocked'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {item.urgencyLabel}
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[180px] line-clamp-1 italic">
                            {item.rationale}
                          </span>
                        </div>
                      </td>

                      {/* Quick Restock Action */}
                      <td className="py-3 px-4 text-right">
                        {isRestocked ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            <Check className="w-3.5 h-3.5" /> Added
                          </span>
                        ) : onQuickRestockProduct ? (
                          <button
                            onClick={() => handleApplyQuickRestock(item)}
                            disabled={qty <= 0}
                            className={`font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 ml-auto shadow-sm ${
                              qty > 0
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                            title={`Add ${qty} units directly to inventory stock`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Restock</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Summary & Action Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-400">Filtered Items:</span>{' '}
              <span className="font-bold text-white">{filteredItems.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Recommended Units:</span>{' '}
              <span className="font-bold text-white">{totalAdjustedUnits.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Purchase Value:</span>{' '}
              <span className="font-black text-emerald-400">
                KSh {totalAdjustedCost.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Supplier PO (CSV)</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
