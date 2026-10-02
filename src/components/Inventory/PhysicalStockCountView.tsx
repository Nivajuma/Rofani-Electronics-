import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, AlertTriangle, RefreshCw, Scan, Save, Search, X, Filter, Package } from 'lucide-react';
import { Product, StockCountItem, StockCountAudit } from '../../types';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';

interface PhysicalStockCountViewProps {
  products: Product[];
  onApplyStockAdjustment: (updatedProducts: Product[], audit: StockCountAudit) => void;
}

export const PhysicalStockCountView: React.FC<PhysicalStockCountViewProps> = ({
  products,
  onApplyStockAdjustment,
}) => {
  const [counts, setCounts] = useState<Record<string, number | null>>(() => {
    const saved = safeGetJSON<Record<string, number | null> | null>(
      'retail_pos_stocktake_counts',
      null,
      (val) => Boolean(val && typeof val === 'object' && !Array.isArray(val))
    );
    if (saved) return saved;

    // Start blank before adding any figure as requested
    const initial: Record<string, number | null> = {};
    products.forEach((p) => {
      initial[p.id] = null;
    });
    return initial;
  });

  useEffect(() => {
    safeSetJSON('retail_pos_stocktake_counts', counts);
  }, [counts]);

  const [auditorName, setAuditorName] = useState(() =>
    safeGetJSON<string>('retail_pos_stocktake_auditor', 'Sarah Miller', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_stocktake_auditor', auditorName);
  }, [auditorName]);

  const [auditNotes, setAuditNotes] = useState(() =>
    safeGetJSON<string>('retail_pos_stocktake_notes', '', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_stocktake_notes', auditNotes);
  }, [auditNotes]);

  const [filterCategory, setFilterCategory] = useState(() =>
    safeGetJSON<string>('retail_pos_stocktake_category', 'All', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_stocktake_category', filterCategory);
  }, [filterCategory]);

  const [searchTerm, setSearchTerm] = useState(() =>
    safeGetJSON<string>('retail_pos_stocktake_search', '', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_stocktake_search', searchTerm);
  }, [searchTerm]);

  const [showDiscrepanciesOnly, setShowDiscrepanciesOnly] = useState(() =>
    safeGetJSON<boolean>('retail_pos_stocktake_discrepancies_only', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_stocktake_discrepancies_only', showDiscrepanciesOnly);
  }, [showDiscrepanciesOnly]);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const handlePhysicalCountChange = (productId: string, val: string) => {
    if (val.trim() === '') {
      setCounts((prev) => ({
        ...prev,
        [productId]: null
      }));
      return;
    }
    const qty = parseInt(val, 10);
    setCounts((prev) => ({
      ...prev,
      [productId]: isNaN(qty) ? null : Math.max(0, qty)
    }));
  };

  const handleClearAllToBlank = () => {
    const blank: Record<string, number | null> = {};
    products.forEach((p) => {
      blank[p.id] = null;
    });
    setCounts(blank);
  };

  const handlePrefillSystemStock = () => {
    const prefilled: Record<string, number | null> = {};
    products.forEach((p) => {
      prefilled[p.id] = p.stockQuantity;
    });
    setCounts(prefilled);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query));

    const rawPhysical = counts[p.id];
    const physical = rawPhysical !== null && rawPhysical !== undefined ? rawPhysical : p.stockQuantity;
    const hasDiscrepancy = rawPhysical !== null && rawPhysical !== undefined && physical !== p.stockQuantity;
    const matchesDiscrepancy = !showDiscrepanciesOnly || hasDiscrepancy;

    return matchesCategory && matchesSearch && matchesDiscrepancy;
  });

  // Compute Variances
  const auditItems: StockCountItem[] = filteredProducts.map((p) => {
    const rawVal = counts[p.id];
    const isCounted = rawVal !== null && rawVal !== undefined;
    const physical = isCounted ? rawVal : p.stockQuantity;
    const variance = isCounted ? physical - p.stockQuantity : 0;
    const varianceCost = Math.round(variance * (p.costPrice || 0));

    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      systemQuantity: p.stockQuantity,
      physicalQuantity: physical,
      variance,
      varianceCost,
      unit: p.unit
    };
  });

  const countedAuditItems = auditItems.filter((item) => counts[item.productId] !== null && counts[item.productId] !== undefined);
  const totalVarianceCount = countedAuditItems.reduce((sum, item) => sum + Math.abs(item.variance), 0);
  const totalVarianceCost = Math.round(countedAuditItems.reduce((sum, item) => sum + item.varianceCost, 0));

  const handleCommitAudit = () => {
    if (confirm('Apply physical stock count to system inventory? This will overwrite system stock quantities.')) {
      const updatedProducts = products.map((p) => {
        const counted = counts[p.id];
        if (counted !== null && counted !== undefined) {
          return {
            ...p,
            stockQuantity: counted,
            updatedAt: new Date().toISOString().slice(0, 10)
          };
        }
        return p;
      });

      const auditRecord: StockCountAudit = {
        id: `audit-${Date.now()}`,
        auditDate: new Date().toISOString(),
        auditedBy: auditorName,
        items: auditItems,
        totalVarianceCount,
        totalVarianceCost,
        status: 'Completed',
        notes: auditNotes || 'Routine physical inventory audit'
      };

      onApplyStockAdjustment(updatedProducts, auditRecord);
      alert('Physical stock counts applied successfully! System stock has been updated.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-950 border border-sky-800 text-sky-400 rounded-xl">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100">Physical Stock Counting (Stocktaking)</h2>
            <p className="text-xs text-slate-400">
              Conduct physical inventory audit in Kenya Shillings (KSh), detect shrinkage & auto-adjust stock
            </p>
          </div>
        </div>

        <button
          onClick={handleCommitAudit}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
        >
          <Save className="w-4 h-4" /> Apply Stock Adjustments
        </button>
      </div>

      {/* Variance Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">Physical Items Counted</div>
          <div className="text-2xl font-extrabold text-slate-100 font-mono mt-1">
            {countedAuditItems.length} <span className="text-xs font-normal text-slate-500">/ {filteredProducts.length} items ({filteredProducts.length - countedAuditItems.length} blank)</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">Discrepancy Units Count</div>
          <div className={`text-2xl font-extrabold font-mono mt-1 ${totalVarianceCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {totalVarianceCount} <span className="text-xs font-normal text-slate-500">units mismatch</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">Financial Impact / Variance Cost (KSh)</div>
          <div className={`text-2xl font-extrabold font-mono mt-1 ${totalVarianceCost < 0 ? 'text-rose-400' : totalVarianceCost > 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
            KSh {Math.round(totalVarianceCost).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
        {/* Search Input Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stock items by name, SKU, or barcode..."
              className="w-full bg-slate-950 border border-slate-800 pl-10 pr-9 py-2.5 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleClearAllToBlank}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-850 text-sky-300 font-semibold rounded-xl border border-slate-800 transition cursor-pointer text-xs flex items-center gap-1.5"
              title="Clear all physical counts to blank so staff can count from scratch without sticky figures"
            >
              <span>Make All Blank (Fresh Count)</span>
            </button>

            <button
              type="button"
              onClick={handlePrefillSystemStock}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-850 text-slate-300 font-semibold rounded-xl border border-slate-800 transition cursor-pointer text-xs"
              title="Prefill all fields with current system stock quantities"
            >
              <span>Prefill System Stock</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDiscrepanciesOnly(!showDiscrepanciesOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                showDiscrepanciesOnly
                  ? 'bg-amber-950 border-amber-700 text-amber-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${showDiscrepanciesOnly ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>{showDiscrepanciesOnly ? 'Discrepancies Only' : 'All Stock Statuses'}</span>
            </button>

            <span className="text-[11px] text-slate-400 font-mono px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg">
              Showing <strong className="text-sky-400">{filteredProducts.length}</strong> of {products.length} items
            </span>
          </div>
        </div>

        {/* Category & Audit Metadata Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
          <div>
            <label className="text-slate-400 block mb-1">Filter Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Audited By (Staff Name)</label>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Audit Notes / Reason</label>
            <input
              type="text"
              placeholder="e.g. Monthly stock audit, damage check"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Product & SKU</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-center">System Stock</th>
                <th className="p-3.5 text-center">Physical Count</th>
                <th className="p-3.5 text-center">Variance (Units)</th>
                <th className="p-3.5 text-right">Cost Variance (KSh)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400 text-sm">No matching inventory items found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try adjusting your search query, clearing filters, or checking another category.
                    </p>
                    {(searchTerm || filterCategory !== 'All' || showDiscrepanciesOnly) && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setFilterCategory('All');
                          setShowDiscrepanciesOnly(false);
                        }}
                        className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                      >
                        Reset Search & Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                auditItems.map((item) => {
                  const rawVal = counts[item.productId];
                  const isCounted = rawVal !== null && rawVal !== undefined;
                  const hasMismatch = isCounted && item.variance !== 0;
                  const prod = products.find((p) => p.id === item.productId);

                  return (
                    <tr
                      key={item.productId}
                      className={`hover:bg-slate-800/50 transition ${
                        hasMismatch ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {prod?.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={item.productName}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 shadow-sm"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                              <Package className="w-5 h-5 text-slate-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-100">{item.productName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.sku} | Barcode: {item.barcode}
                            </div>
                            <div className="text-[11px] text-emerald-400 font-mono font-semibold mt-0.5">
                              Price: KSh {Math.round(prod?.sellingPrice || 0).toLocaleString()} • Cost: KSh {Math.round(prod?.costPrice || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </td>

                    <td className="p-3.5 text-sky-400 font-medium">{item.category}</td>

                    <td className="p-3.5 text-center font-mono font-bold text-slate-300 text-sm">
                      {item.systemQuantity} {item.unit}
                    </td>

                    <td className="p-3.5 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Blank"
                        value={rawVal === null || rawVal === undefined ? '' : rawVal}
                        onFocus={(e) => {
                          e.target.select();
                        }}
                        onChange={(e) => handlePhysicalCountChange(item.productId, e.target.value)}
                        className="w-24 bg-slate-950 border border-slate-700 text-center font-bold font-mono text-sky-400 text-sm py-1.5 rounded-xl focus:outline-none focus:border-sky-500 placeholder-slate-600"
                        title="Enter physical count (blank before adding figure)"
                      />
                    </td>

                    <td className="p-3.5 text-center font-mono font-extrabold text-sm">
                      {!isCounted ? (
                        <span className="text-slate-500 font-normal text-xs italic">Uncounted</span>
                      ) : item.variance === 0 ? (
                        <span className="text-emerald-400">0 (Matched)</span>
                      ) : item.variance > 0 ? (
                        <span className="text-emerald-400">+{item.variance} (Overage)</span>
                      ) : (
                        <span className="text-rose-400">{item.variance} (Shrinkage)</span>
                      )}
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-sm">
                      {!isCounted ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        <span className={item.varianceCost < 0 ? 'text-rose-400' : item.varianceCost > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                          KSh {Math.round(item.varianceCost).toLocaleString()}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
