import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FolderTree,
  Layers,
  Loader2,
  Percent,
  Tag,
  X,
} from 'lucide-react';
import { Product } from '../../types';

export type PriceAdjustmentMode =
  | 'fixed'
  | 'percent'
  | 'amount'
  | 'cost_markup';

export type PriceRoundingRule = 'exact' | '5' | '10' | '50' | '100';

export interface ConsolidatedCategoryOption {
  id: string;
  name: string;
  subcategories: string[];
}

export interface BulkEditProductsModalProps {
  selectedProducts: Product[];
  categories: ConsolidatedCategoryOption[];
  onClose: () => void;
  onApplyBatch: (updatedProducts: Product[], summaryLabel: string) => Promise<void> | void;
}

function applyRounding(value: number, rule: PriceRoundingRule): number {
  const safeVal = Math.max(0, value);
  if (rule === 'exact') {
    return Math.round(safeVal * 100) / 100;
  }
  const step = Number(rule);
  if (!step || step <= 0) return Math.round(safeVal);
  return Math.round(safeVal / step) * step;
}

export const BulkEditProductsModal: React.FC<BulkEditProductsModalProps> = ({
  selectedProducts,
  categories,
  onClose,
  onApplyBatch,
}) => {
  // Price Update State
  const [enablePriceUpdate, setEnablePriceUpdate] = useState<boolean>(true);
  const [priceMode, setPriceMode] = useState<PriceAdjustmentMode>('percent');
  const [priceInputValue, setPriceInputValue] = useState<string>('');
  const [roundingRule, setRoundingRule] = useState<PriceRoundingRule>('exact');

  // Category Update State
  const [enableCategoryUpdate, setEnableCategoryUpdate] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categories[0]?.name || 'General'
  );
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryName, setCustomCategoryName] = useState<string>('');

  const [subcategoryMode, setSubcategoryMode] = useState<'keep' | 'set' | 'custom'>('set');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(
    categories[0]?.subcategories[0] || 'General'
  );
  const [customSubcategoryName, setCustomSubcategoryName] = useState<string>('');

  // UI state
  const [showAllPreviewRows, setShowAllPreviewRows] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.name === selectedCategory),
    [categories, selectedCategory]
  );

  const availableSubcategories = useMemo(
    () => activeCategoryObj?.subcategories || ['General'],
    [activeCategoryObj]
  );

  const targetCategory = isCustomCategory
    ? customCategoryName.trim()
    : selectedCategory.trim();

  const targetSubcategory =
    subcategoryMode === 'custom'
      ? customSubcategoryName.trim()
      : subcategoryMode === 'set'
      ? selectedSubcategory.trim()
      : '';

  const parsedNumericInput = parseFloat(priceInputValue);
  const hasValidNumericInput =
    priceInputValue.trim() !== '' && Number.isFinite(parsedNumericInput);

  // Compute live before -> after preview for every selected product
  const previewRows = useMemo(() => {
    return selectedProducts.map((p) => {
      let nextPrice = p.sellingPrice;
      if (enablePriceUpdate && hasValidNumericInput) {
        if (priceMode === 'fixed') {
          nextPrice = parsedNumericInput;
        } else if (priceMode === 'percent') {
          nextPrice = p.sellingPrice * (1 + parsedNumericInput / 100);
        } else if (priceMode === 'amount') {
          nextPrice = p.sellingPrice + parsedNumericInput;
        } else if (priceMode === 'cost_markup') {
          const baseCost = Number(p.costPrice || 0);
          nextPrice = baseCost > 0 ? baseCost * (1 + parsedNumericInput / 100) : p.sellingPrice;
        }
        nextPrice = Math.max(0, applyRounding(nextPrice, roundingRule));
      }

      const nextCategory =
        enableCategoryUpdate && targetCategory ? targetCategory : p.category;
      const nextSubcategory =
        enableCategoryUpdate && subcategoryMode !== 'keep' && targetSubcategory
          ? targetSubcategory
          : p.subcategory;

      const priceChanged = Math.abs(nextPrice - p.sellingPrice) > 0.001;
      const categoryChanged =
        nextCategory !== p.category || nextSubcategory !== p.subcategory;
      const isBelowCost = Number(p.costPrice || 0) > 0 && nextPrice < Number(p.costPrice || 0);
      const isInvalidZero = enablePriceUpdate && hasValidNumericInput && nextPrice <= 0;

      return {
        product: p,
        nextPrice,
        nextCategory,
        nextSubcategory,
        priceChanged,
        categoryChanged,
        isBelowCost,
        isInvalidZero,
      };
    });
  }, [
    selectedProducts,
    enablePriceUpdate,
    hasValidNumericInput,
    priceMode,
    parsedNumericInput,
    roundingRule,
    enableCategoryUpdate,
    targetCategory,
    subcategoryMode,
    targetSubcategory,
  ]);

  const changedCount = previewRows.filter((r) => r.priceChanged || r.categoryChanged).length;
  const belowCostCount = previewRows.filter((r) => r.isBelowCost).length;
  const zeroPriceCount = previewRows.filter((r) => r.isInvalidZero).length;

  const handleCategoryChange = (nextCatName: string) => {
    if (nextCatName === '__custom__') {
      setIsCustomCategory(true);
      setCustomCategoryName('');
      if (subcategoryMode === 'set') {
        setSubcategoryMode('custom');
        setCustomSubcategoryName('General');
      }
      return;
    }
    setIsCustomCategory(false);
    setSelectedCategory(nextCatName);
    const catObj = categories.find((c) => c.name === nextCatName);
    const firstSub = catObj?.subcategories[0] || 'General';
    setSelectedSubcategory(firstSub);
    if (subcategoryMode === 'custom') {
      setSubcategoryMode('set');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedProducts.length === 0) {
      setFormError('No products selected for batch editing.');
      return;
    }

    if (!enablePriceUpdate && !enableCategoryUpdate) {
      setFormError('Enable at least Selling Price or Category update before applying.');
      return;
    }

    if (enablePriceUpdate) {
      if (!hasValidNumericInput) {
        setFormError('Enter a valid numeric price or adjustment value.');
        return;
      }
      if (priceMode === 'fixed' && parsedNumericInput <= 0) {
        setFormError('Fixed selling price must be greater than KSh 0.');
        return;
      }
      if (zeroPriceCount > 0) {
        setFormError(
          `${zeroPriceCount} selected item(s) would drop to KSh 0 or below. Adjust your reduction amount.`
        );
        return;
      }
    }

    if (enableCategoryUpdate && !targetCategory) {
      setFormError('Choose or enter a target category name.');
      return;
    }

    if (
      enableCategoryUpdate &&
      subcategoryMode === 'custom' &&
      !customSubcategoryName.trim()
    ) {
      setFormError('Enter a target subcategory name or switch subcategory mode to Keep Existing.');
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedProducts: Product[] = previewRows
      .filter((r) => r.priceChanged || r.categoryChanged)
      .map((r) => {
        const nextCost = Number(r.product.costPrice || 0);
        const nextProfitMargin =
          nextCost > 0
            ? Math.round(((r.nextPrice - nextCost) / nextCost) * 1000) / 10
            : r.product.profitMargin;

        return {
          ...r.product,
          sellingPrice: r.nextPrice,
          profitMargin: nextProfitMargin,
          category: r.nextCategory,
          subcategory: r.nextSubcategory,
          updatedAt: nowIso,
        };
      });

    if (updatedProducts.length === 0) {
      setFormError('No changes detected for the selected items.');
      return;
    }

    const summaryParts: string[] = [];
    if (enablePriceUpdate && hasValidNumericInput) {
      if (priceMode === 'fixed') {
        summaryParts.push(`Price set to KSh ${parsedNumericInput.toLocaleString()}`);
      } else if (priceMode === 'percent') {
        summaryParts.push(
          `Price adjusted by ${parsedNumericInput >= 0 ? '+' : ''}${parsedNumericInput}%`
        );
      } else if (priceMode === 'amount') {
        summaryParts.push(
          `Price adjusted by ${parsedNumericInput >= 0 ? '+' : ''}KSh ${parsedNumericInput.toLocaleString()}`
        );
      } else if (priceMode === 'cost_markup') {
        summaryParts.push(`Price set to ${parsedNumericInput}% markup over cost`);
      }
    }
    if (enableCategoryUpdate && targetCategory) {
      summaryParts.push(
        `Category → ${targetCategory}${
          subcategoryMode !== 'keep' && targetSubcategory ? ` › ${targetSubcategory}` : ''
        }`
      );
    }

    setIsSubmitting(true);
    try {
      await onApplyBatch(updatedProducts, summaryParts.join(' & '));
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save batch update. Please retry.');
      setIsSubmitting(false);
    }
  };

  const visiblePreviewRows = showAllPreviewRows ? previewRows : previewRows.slice(0, 8);

  return (
    <div
      className="fixed inset-0 z-[2100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                Bulk Edit Selected Products ({selectedProducts.length})
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Update selling prices, categories, or both in one synced batch
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            aria-label="Close Bulk Edit"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {formError && (
            <div className="bg-rose-950/70 border border-rose-500/50 text-rose-200 rounded-xl p-3 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Selling Price Batch Update */}
          <div
            className={`rounded-2xl border p-4 space-y-3 transition ${
              enablePriceUpdate
                ? 'bg-slate-950/80 border-sky-500/40'
                : 'bg-slate-950/40 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enablePriceUpdate}
                  onChange={(e) => setEnablePriceUpdate(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer"
                />
                <span className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Update Selling Prices</span>
                </span>
              </label>

              {enablePriceUpdate && (
                <span className="text-[11px] font-mono text-emerald-400">
                  Applies to {selectedProducts.length} items
                </span>
              )}
            </div>

            {enablePriceUpdate && (
              <div className="space-y-3 pt-1">
                {/* Price Adjustment Mode Segmented Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPriceMode('percent')}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition ${
                      priceMode === 'percent'
                        ? 'bg-sky-600 text-white shadow'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5 shrink-0" />
                    <span>By % (+ / -)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceMode('amount')}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition ${
                      priceMode === 'amount'
                        ? 'bg-sky-600 text-white shadow'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>± Fixed KSh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceMode('fixed')}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition ${
                      priceMode === 'fixed'
                        ? 'bg-sky-600 text-white shadow'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>Set Exact Price</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceMode('cost_markup')}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition ${
                      priceMode === 'cost_markup'
                        ? 'bg-sky-600 text-white shadow'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>Markup % / Cost</span>
                  </button>
                </div>

                {/* Numeric Input & Rounding Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      {priceMode === 'percent' && 'Percentage Change (e.g., 10 for +10%, -15 for -15%)'}
                      {priceMode === 'amount' && 'Amount Adjustment in KSh (e.g., 100 or -50)'}
                      {priceMode === 'fixed' && 'New Selling Price for All Selected Items (KSh)'}
                      {priceMode === 'cost_markup' && 'Markup % Above Cost Price (e.g., 25 for +25%)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                        {priceMode === 'percent' || priceMode === 'cost_markup' ? '%' : 'KSh'}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={priceInputValue}
                        onChange={(e) => setPriceInputValue(e.target.value)}
                        placeholder={
                          priceMode === 'percent'
                            ? 'e.g. 10 or -10'
                            : priceMode === 'amount'
                            ? 'e.g. 200 or -100'
                            : priceMode === 'fixed'
                            ? 'e.g. 1500'
                            : 'e.g. 30'
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Price Rounding
                    </label>
                    <select
                      value={roundingRule}
                      onChange={(e) => setRoundingRule(e.target.value as PriceRoundingRule)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="exact">Exact Value</option>
                      <option value="5">Nearest KSh 5</option>
                      <option value="10">Nearest KSh 10</option>
                      <option value="50">Nearest KSh 50</option>
                      <option value="100">Nearest KSh 100</option>
                    </select>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 mr-1">Quick presets:</span>
                  {priceMode === 'percent' &&
                    ['-20', '-10', '-5', '5', '10', '15', '20'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPriceInputValue(val)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-slate-200 cursor-pointer transition"
                      >
                        {Number(val) > 0 ? `+${val}%` : `${val}%`}
                      </button>
                    ))}
                  {priceMode === 'amount' &&
                    ['-100', '-50', '50', '100', '200', '500'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPriceInputValue(val)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-slate-200 cursor-pointer transition"
                      >
                        {Number(val) > 0 ? `+${val}` : val}
                      </button>
                    ))}
                  {priceMode === 'cost_markup' &&
                    ['15', '20', '25', '30', '40', '50'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPriceInputValue(val)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-slate-200 cursor-pointer transition"
                      >
                        +{val}%
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Category & Subcategory Batch Update */}
          <div
            className={`rounded-2xl border p-4 space-y-3 transition ${
              enableCategoryUpdate
                ? 'bg-slate-950/80 border-amber-500/40'
                : 'bg-slate-950/40 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableCategoryUpdate}
                  onChange={(e) => setEnableCategoryUpdate(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <span className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                  <FolderTree className="w-4 h-4 text-amber-400" />
                  <span>Update Category &amp; Subcategory</span>
                </span>
              </label>

              {enableCategoryUpdate && (
                <span className="text-[11px] font-mono text-amber-300">
                  Moves {selectedProducts.length} items
                </span>
              )}
            </div>

            {enableCategoryUpdate && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Target Category */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Target Category
                  </label>
                  <select
                    value={isCustomCategory ? '__custom__' : selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="__custom__">+ Enter New Category...</option>
                  </select>

                  {isCustomCategory && (
                    <input
                      type="text"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="New category name..."
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  )}
                </div>

                {/* Target Subcategory */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Target Subcategory
                  </label>
                  <select
                    value={
                      subcategoryMode === 'keep'
                        ? '__keep__'
                        : subcategoryMode === 'custom'
                        ? '__custom__'
                        : selectedSubcategory
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__keep__') {
                        setSubcategoryMode('keep');
                      } else if (val === '__custom__') {
                        setSubcategoryMode('custom');
                        setCustomSubcategoryName('');
                      } else {
                        setSubcategoryMode('set');
                        setSelectedSubcategory(val);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="__keep__">Keep Each Item&apos;s Current Subcategory</option>
                    {!isCustomCategory &&
                      availableSubcategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    <option value="__custom__">+ Enter New Subcategory...</option>
                  </select>

                  {subcategoryMode === 'custom' && (
                    <input
                      type="text"
                      value={customSubcategoryName}
                      onChange={(e) => setCustomSubcategoryName(e.target.value)}
                      placeholder="New subcategory name..."
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Warnings if any prices fall below cost */}
          {belowCostCount > 0 && (
            <div className="bg-amber-950/70 border border-amber-500/50 text-amber-200 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Heads up:</strong> {belowCostCount} item(s) will have a selling price below their cost price after this adjustment. Review the preview below before saving.
              </span>
            </div>
          )}

          {/* Section 3: Live Before -> After Preview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Tag className="w-3.5 h-3.5 text-sky-400" />
                <span>Live Batch Preview ({changedCount} of {selectedProducts.length} modified)</span>
              </div>
              {previewRows.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllPreviewRows((prev) => !prev)}
                  className="text-[11px] font-bold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>
                    {showAllPreviewRows
                      ? 'Show Less'
                      : `Show All ${previewRows.length}`}
                  </span>
                  {showAllPreviewRows ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Current Price</th>
                    <th className="px-3 py-2 text-right">New Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visiblePreviewRows.map((row) => (
                    <tr key={row.product.id} className="hover:bg-slate-900/50">
                      <td className="px-3 py-2 font-semibold text-slate-100 max-w-[180px] truncate">
                        {row.product.name}
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        {row.categoryChanged ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-slate-500 line-through">
                              {row.product.category}
                            </span>
                            <span className="text-amber-300 font-bold">
                              → {row.nextCategory}
                              {row.nextSubcategory ? ` › ${row.nextSubcategory}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            {row.product.category}
                            {row.product.subcategory ? ` › ${row.product.subcategory}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-400">
                        KSh {row.product.sellingPrice.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums font-bold">
                        {row.priceChanged ? (
                          <span
                            className={
                              row.isInvalidZero
                                ? 'text-rose-400'
                                : row.isBelowCost
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }
                          >
                            KSh {row.nextPrice.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            KSh {row.nextPrice.toLocaleString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            Ready to update <strong className="text-white">{changedCount}</strong> product(s)
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any)}
              disabled={isSubmitting || changedCount === 0}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 shadow-lg cursor-pointer transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Batch...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply Update ({changedCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
