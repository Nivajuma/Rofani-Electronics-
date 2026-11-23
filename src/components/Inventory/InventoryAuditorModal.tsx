import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Edit2,
  Loader2,
  Package,
  Percent,
  Search,
  ShieldAlert,
  TrendingUp,
  X,
} from 'lucide-react';
import { Product } from '../../types';
import { calculateProfitMargin } from '../../utils/margin';

export type AuditorPricingBasis = 'margin' | 'markup';
export type AuditorRoundingRule = 'ceil_1' | 'exact' | 'ceil_5' | 'ceil_10' | 'ceil_50';

export interface InventoryAuditorModalProps {
  products: Product[];
  onClose: () => void;
  onQuickMarkupSingle: (updatedProduct: Product) => Promise<void> | void;
  onQuickMarkupBatch: (updatedProducts: Product[], summaryLabel: string) => Promise<void> | void;
  onEditProduct?: (product: Product) => void;
}

function computeTargetPrice(
  costPrice: number,
  targetPct: number,
  basis: AuditorPricingBasis,
  rounding: AuditorRoundingRule
): number {
  if (costPrice <= 0 || targetPct <= 0) return costPrice;

  let rawPrice = costPrice;
  if (basis === 'margin') {
    const safePct = Math.min(95, Math.max(0.1, targetPct));
    rawPrice = costPrice / (1 - safePct / 100);
  } else {
    rawPrice = costPrice * (1 + targetPct / 100);
  }

  if (rounding === 'exact') {
    return Math.round(rawPrice * 100) / 100;
  }
  if (rounding === 'ceil_1') {
    return Math.ceil(rawPrice);
  }
  const step = rounding === 'ceil_5' ? 5 : rounding === 'ceil_10' ? 10 : 50;
  return Math.ceil(rawPrice / step) * step;
}

export const InventoryAuditorModal: React.FC<InventoryAuditorModalProps> = ({
  products,
  onClose,
  onQuickMarkupSingle,
  onQuickMarkupBatch,
  onEditProduct,
}) => {
  const [minDesiredMargin, setMinDesiredMargin] = useState<string>('20');
  const [pricingBasis, setPricingBasis] = useState<AuditorPricingBasis>('margin');
  const [roundingRule, setRoundingRule] = useState<AuditorRoundingRule>('ceil_1');
  const [statusFilter, setStatusFilter] = useState<'all' | 'loss' | 'breakeven'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [isBatchApplying, setIsBatchApplying] = useState<boolean>(false);
  const [fixedCountSession, setFixedCountSession] = useState<number>(0);
  const [auditNotice, setAuditNotice] = useState<string | null>(null);

  const parsedMargin = useMemo(() => {
    const num = parseFloat(minDesiredMargin);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return pricingBasis === 'margin' ? Math.min(95, num) : Math.min(500, num);
  }, [minDesiredMargin, pricingBasis]);

  // Identify every product where sellingPrice <= costPrice
  const flaggedItems = useMemo(() => {
    return products
      .filter(
        (p) =>
          Number(p.sellingPrice || 0) <= Number(p.costPrice ?? p.buyingPrice ?? 0)
      )
      .map((p) => {
        const cost = Number(p.costPrice ?? p.buyingPrice ?? 0);
        const selling = Number(p.sellingPrice || 0);
        const stock = Math.max(0, Number(p.stockQuantity ?? p.stock ?? 0));
        const unitDiff = selling - cost; // <= 0
        const lossPerUnit = cost > selling ? cost - selling : 0;
        const stockExposure = lossPerUnit * stock;
        const severity: 'loss' | 'breakeven' | 'unpriced' =
          cost <= 0 ? 'unpriced' : selling < cost ? 'loss' : 'breakeven';

        const targetPrice =
          cost > 0 && parsedMargin > 0
            ? computeTargetPrice(cost, parsedMargin, pricingBasis, roundingRule)
            : selling;
        const targetMarginInfo = calculateProfitMargin(cost, targetPrice);

        return {
          product: p,
          cost,
          selling,
          stock,
          unitDiff,
          lossPerUnit,
          stockExposure,
          severity,
          targetPrice,
          targetMarginPercent: targetMarginInfo.marginPercent,
          canQuickMarkup: cost > 0 && parsedMargin > 0 && targetPrice > cost,
        };
      })
      .sort((a, b) => {
        // Prioritize highest loss exposure / below-cost items first
        if (a.severity === 'loss' && b.severity !== 'loss') return -1;
        if (b.severity === 'loss' && a.severity !== 'loss') return 1;
        return b.lossPerUnit - a.lossPerUnit;
      });
  }, [products, parsedMargin, pricingBasis, roundingRule]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return flaggedItems.filter((item) => {
      if (statusFilter === 'loss' && item.severity !== 'loss') return false;
      if (statusFilter === 'breakeven' && item.severity === 'loss') return false;
      if (!q) return true;
      const p = item.product;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
  }, [flaggedItems, statusFilter, searchQuery]);

  const lossOnlyCount = flaggedItems.filter((i) => i.severity === 'loss').length;
  const breakEvenCount = flaggedItems.filter((i) => i.severity !== 'loss').length;
  const totalStockExposure = flaggedItems.reduce((sum, i) => sum + i.stockExposure, 0);
  const eligibleForBatch = filteredItems.filter((i) => i.canQuickMarkup);

  const showNotice = (msg: string) => {
    setAuditNotice(msg);
    window.setTimeout(() => {
      setAuditNotice((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const handleSingleQuickMarkup = async (item: (typeof flaggedItems)[number]) => {
    if (!item.canQuickMarkup || busyProductId || isBatchApplying) return;
    setBusyProductId(item.product.id);
    try {
      const nowIso = new Date().toISOString();
      const updatedProduct: Product = {
        ...item.product,
        sellingPrice: item.targetPrice,
        profitMargin: Math.round(item.targetMarginPercent * 10) / 10,
        updatedAt: nowIso,
      };
      await onQuickMarkupSingle(updatedProduct);
      setFixedCountSession((c) => c + 1);
      showNotice(
        `Marked up "${item.product.name}" to KSh ${item.targetPrice.toLocaleString()} (${item.targetMarginPercent.toFixed(1)}% margin).`
      );
    } finally {
      setBusyProductId(null);
    }
  };

  const handleBatchQuickMarkupAll = async () => {
    if (eligibleForBatch.length === 0 || isBatchApplying || busyProductId) return;
    setIsBatchApplying(true);
    try {
      const nowIso = new Date().toISOString();
      const updatedProducts: Product[] = eligibleForBatch.map((item) => ({
        ...item.product,
        sellingPrice: item.targetPrice,
        profitMargin: Math.round(item.targetMarginPercent * 10) / 10,
        updatedAt: nowIso,
      }));
      const summary = `Inventory Auditor Quick Mark-up (${parsedMargin}% min ${
        pricingBasis === 'margin' ? 'profit margin' : 'cost markup'
      })`;
      await onQuickMarkupBatch(updatedProducts, summary);
      setFixedCountSession((c) => c + updatedProducts.length);
      showNotice(
        `Applied ${parsedMargin}% minimum ${
          pricingBasis === 'margin' ? 'profit margin' : 'markup'
        } to ${updatedProducts.length} product(s).`
      );
    } finally {
      setIsBatchApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBatchApplying) onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/75 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                Inventory Auditor — Loss-Making &amp; Zero-Margin Items
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Flags items where selling price is ≤ cost price and applies your minimum margin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBatchApplying}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            aria-label="Close Inventory Auditor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 px-4 pt-3 pb-2 bg-slate-950/40 border-b border-slate-800/80 shrink-0">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Flagged Items
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-rose-400 mt-0.5">
              {flaggedItems.length}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {lossOnlyCount} below cost · {breakEvenCount} 0%/unpriced
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Stock Loss Risk
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-amber-300 mt-0.5 truncate">
              KSh {totalStockExposure.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Potential loss on shelf stock
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Fixed This Session
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-emerald-400 mt-0.5">
              {fixedCountSession}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Synced to catalog
            </div>
          </div>
        </div>

        {/* Global Minimum Desired Profit Margin Controls */}
        <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 space-y-2.5 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
            {/* Desired Minimum Margin % Input */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-400" />
                <span>Global Minimum Desired Margin (%)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={pricingBasis === 'margin' ? 95 : 500}
                  step="any"
                  value={minDesiredMargin}
                  onChange={(e) => setMinDesiredMargin(e.target.value)}
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl pl-3 pr-9 py-2 text-sm font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                  placeholder="20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                  %
                </span>
              </div>
            </div>

            {/* Calculation Mode */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Margin Formula
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPricingBasis('margin')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    pricingBasis === 'margin'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Selling Price = Cost / (1 - Margin%)"
                >
                  Profit Margin %
                </button>
                <button
                  type="button"
                  onClick={() => setPricingBasis('markup')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    pricingBasis === 'markup'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Selling Price = Cost × (1 + Markup%)"
                >
                  Cost Markup %
                </button>
              </div>
            </div>

            {/* Rounding Rule */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Price Rounding
              </label>
              <select
                value={roundingRule}
                onChange={(e) => setRoundingRule(e.target.value as AuditorRoundingRule)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ceil_1">Round Up to Nearest KSh 1</option>
                <option value="ceil_5">Round Up to Nearest KSh 5</option>
                <option value="ceil_10">Round Up to Nearest KSh 10</option>
                <option value="ceil_50">Round Up to Nearest KSh 50</option>
                <option value="exact">Exact Price</option>
              </select>
            </div>
          </div>

          {/* Preset Margin Chips + Search & Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Presets:</span>
              {['10', '15', '20', '25', '30', '40'].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setMinDesiredMargin(pct)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer transition ${
                    minDesiredMargin === pct
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end">
              <div className="relative min-w-[160px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter flagged items..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({flaggedItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('loss')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition ${
                    statusFilter === 'loss'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Below Cost ({lossOnlyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('breakeven')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition ${
                    statusFilter === 'breakeven'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  0% / Equal ({breakEvenCount})
                </button>
              </div>
            </div>
          </div>

          {auditNotice && (
            <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{auditNotice}</span>
            </div>
          )}
        </div>

        {/* Scrollable Audit Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-950/30">
          {parsedMargin <= 0 && flaggedItems.length > 0 && (
            <div className="bg-amber-950/60 border border-amber-500/40 text-amber-200 rounded-xl p-3 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Enter a positive minimum desired profit margin (%) above to enable Quick Mark-up.
              </span>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {flaggedItems.length === 0
                    ? 'Healthy Margins Across Your Inventory!'
                    : 'No flagged items match your current filter'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {flaggedItems.length === 0
                    ? 'Every product in your store has a selling price strictly higher than its cost price.'
                    : 'Try clearing the search query or switching back to "All" flagged items.'}
                </p>
              </div>
            </div>
          ) : (
            filteredItems.map((item) => {
              const p = item.product;
              const isBusy = busyProductId === p.id;

              return (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  {/* Product Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-950"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate max-w-[260px]">
                          {p.name}
                        </span>
                        {item.severity === 'loss' ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-950/90 border border-rose-700/70 text-rose-300 text-[10px] font-black font-mono">
                            LOSS: -KSh {item.lossPerUnit.toLocaleString()}/unit
                          </span>
                        ) : item.severity === 'breakeven' ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-700/70 text-amber-300 text-[10px] font-black font-mono">
                            0% MARGIN (BREAK-EVEN)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                            COST IS KSh 0
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                        <span>{p.category}</span>
                        <span>·</span>
                        <span>SKU: {p.sku}</span>
                        <span>·</span>
                        <span>
                          Stock: <strong className="text-slate-200">{item.stock} {p.unit}</strong>
                        </span>
                      </div>

                      {/* Current Cost / Selling -> New Price Comparison */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono tabular-nums">
                        <span className="text-slate-400">
                          Cost: <strong className="text-slate-200">KSh {item.cost.toLocaleString()}</strong>
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-rose-300">
                          Selling: <strong>KSh {item.selling.toLocaleString()}</strong>
                        </span>
                        {item.canQuickMarkup && (
                          <>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-emerald-400 font-black">
                              New: KSh {item.targetPrice.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.5 rounded">
                              {item.targetMarginPercent.toFixed(1)}% margin
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Per-Item Quick Mark-up Action */}
                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    {onEditProduct && (
                      <button
                        type="button"
                        onClick={() => onEditProduct(p)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                        title="Edit item cost or selling price manually"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!item.canQuickMarkup || isBusy || isBatchApplying}
                      onClick={() => handleSingleQuickMarkup(item)}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer transition"
                      title={
                        item.cost <= 0
                          ? 'Set a cost price greater than KSh 0 first to auto-calculate margin'
                          : `Update selling price to KSh ${item.targetPrice.toLocaleString()}`
                      }
                    >
                      {isBusy ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Quick Mark-up</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Global Batch Fix Button */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/85 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-400">
            {pricingBasis === 'margin'
              ? 'Formula: Selling = Cost ÷ (1 - Margin%)'
              : 'Formula: Selling = Cost × (1 + Markup%)'}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isBatchApplying}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition disabled:opacity-50"
            >
              Close
            </button>

            {eligibleForBatch.length > 0 && (
              <button
                type="button"
                onClick={handleBatchQuickMarkupAll}
                disabled={isBatchApplying || Boolean(busyProductId)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 shadow-lg whitespace-nowrap cursor-pointer transition"
              >
                {isBatchApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying to {eligibleForBatch.length} Items...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>
                      Quick Mark-up All ({eligibleForBatch.length}) to {parsedMargin}%
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
