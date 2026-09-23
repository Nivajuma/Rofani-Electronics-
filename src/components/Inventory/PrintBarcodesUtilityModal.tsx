import React, { useState, useMemo } from 'react';
import {
  Printer,
  Barcode,
  Search,
  CheckSquare,
  Square,
  Clock,
  Package,
  Layers,
  Sparkles,
  AlertCircle,
  X,
  Plus,
  Minus,
  CheckCircle2,
  Calendar,
  Filter,
  RefreshCw,
  Tag,
  ArrowRight
} from 'lucide-react';
import { BarcodeScanLog, Product } from '../../types';
import { printBatchBarcodes, generateBarcodeDataUrl } from '../../utils/barcode';

export interface PrintBarcodesUtilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanLogs: BarcodeScanLog[];
  products: Product[];
  storeName?: string;
}

interface PrintableItem {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  price: number;
  category: string;
  stockQuantity: number;
  lastScannedAt?: string;
  scanCount?: number;
  lastScannedBy?: string;
  source: 'scan_history' | 'catalog';
}

export const PrintBarcodesUtilityModal: React.FC<PrintBarcodesUtilityModalProps> = ({
  isOpen,
  onClose,
  scanLogs,
  products,
  storeName = 'ROFANI Retail',
}) => {
  const [activeSource, setActiveSource] = useState<'scan_history' | 'catalog'>('scan_history');
  const [searchTerm, setSearchTerm] = useState('');
  const [scanTimeFilter, setScanTimeFilter] = useState<'all' | 'today' | 'recent_50'>('all');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [labelCounts, setLabelCounts] = useState<Record<string, number>>({});
  const [sheetTitle, setSheetTitle] = useState(`${storeName} Barcode Labels Sheet`);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);

  // Map products by barcode & id for fast lookup
  const productsByBarcode = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      if (p.barcode) map.set(p.barcode.trim(), p);
    });
    return map;
  }, [products]);

  // Aggregate unique items from scanLogs
  const scanHistoryItems = useMemo<PrintableItem[]>(() => {
    const map = new Map<string, PrintableItem>();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Scan logs are sorted latest first
    scanLogs.forEach((log) => {
      if (!log.barcode) return;
      const barcodeKey = log.barcode.trim();
      const matchedProd = productsByBarcode.get(barcodeKey);

      // Check date filter
      if (scanTimeFilter === 'today') {
        const logDateStr = (log.scannedAt || '').slice(0, 10);
        if (logDateStr !== todayStr) return;
      }

      if (map.has(barcodeKey)) {
        const existing = map.get(barcodeKey)!;
        existing.scanCount = (existing.scanCount || 1) + 1;
      } else {
        const price =
          matchedProd?.sellingPrice ??
          log.sellingPrice ??
          0;
        const name =
          matchedProd?.name ||
          log.productName ||
          `Item ${barcodeKey}`;
        const sku =
          matchedProd?.sku ||
          log.sku ||
          barcodeKey;
        const category =
          matchedProd?.category ||
          log.category ||
          'General';
        const stockQuantity =
          matchedProd?.stockQuantity ??
          log.stockQuantity ??
          0;

        map.set(barcodeKey, {
          id: matchedProd?.id || `scan-${barcodeKey}`,
          name,
          barcode: barcodeKey,
          sku,
          price,
          category,
          stockQuantity,
          lastScannedAt: log.scannedAt,
          scanCount: 1,
          lastScannedBy: log.userName,
          source: 'scan_history',
        });
      }
    });

    const items = Array.from(map.values());
    if (scanTimeFilter === 'recent_50') {
      return items.slice(0, 50);
    }
    return items;
  }, [scanLogs, productsByBarcode, scanTimeFilter]);

  // Catalog items list
  const catalogItems = useMemo<PrintableItem[]>(() => {
    return products
      .filter((p) => p.barcode && p.barcode.trim() !== '')
      .map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode.trim(),
        sku: p.sku || p.barcode.trim(),
        price: p.sellingPrice || 0,
        category: p.category || 'General',
        stockQuantity: p.stockQuantity || 0,
        source: 'catalog' as const,
      }));
  }, [products]);

  // Currently displayed items list based on active tab and search
  const displayedItems = useMemo(() => {
    const list = activeSource === 'scan_history' ? scanHistoryItems : catalogItems;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.barcode.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        (item.lastScannedBy && item.lastScannedBy.toLowerCase().includes(term))
    );
  }, [activeSource, scanHistoryItems, catalogItems, searchTerm]);

  // Selection statistics
  const selectedItemsList = useMemo(() => {
    const allKnownItems = activeSource === 'scan_history' ? scanHistoryItems : catalogItems;
    return allKnownItems.filter((item) => !!selectedIds[item.barcode]);
  }, [selectedIds, activeSource, scanHistoryItems, catalogItems]);

  const totalLabelsCount = useMemo(() => {
    return selectedItemsList.reduce((sum, item) => {
      const count = labelCounts[item.barcode] ?? 1;
      return sum + count;
    }, 0);
  }, [selectedItemsList, labelCounts]);

  // Handle select / deselect
  const toggleItemSelection = (barcode: string) => {
    setSelectedIds((prev) => ({
      ...prev,
      [barcode]: !prev[barcode],
    }));
    if (!labelCounts[barcode]) {
      setLabelCounts((prev) => ({ ...prev, [barcode]: 1 }));
    }
  };

  const handleSelectAllVisible = () => {
    const updated: Record<string, boolean> = { ...selectedIds };
    const counts: Record<string, number> = { ...labelCounts };
    displayedItems.forEach((item) => {
      updated[item.barcode] = true;
      if (!counts[item.barcode]) counts[item.barcode] = 1;
    });
    setSelectedIds(updated);
    setLabelCounts(counts);
  };

  const handleDeselectAll = () => {
    setSelectedIds({});
  };

  const updateLabelCount = (barcode: string, delta: number) => {
    setLabelCounts((prev) => {
      const current = prev[barcode] ?? 1;
      const next = Math.max(1, Math.min(500, current + delta));
      return { ...prev, [barcode]: next };
    });
  };

  const setAllLabelCounts = (qty: number) => {
    const counts: Record<string, number> = { ...labelCounts };
    selectedItemsList.forEach((item) => {
      counts[item.barcode] = qty;
    });
    setLabelCounts(counts);
  };

  const matchStockQuantities = () => {
    const counts: Record<string, number> = { ...labelCounts };
    selectedItemsList.forEach((item) => {
      counts[item.barcode] = Math.max(1, Math.min(200, item.stockQuantity || 1));
    });
    setLabelCounts(counts);
  };

  // Perform Batch Print
  const handleExecuteBatchPrint = () => {
    if (selectedItemsList.length === 0) {
      alert('Please select at least one item to print barcode labels.');
      return;
    }

    const batchData = selectedItemsList.map((item) => ({
      name: item.name,
      price: item.price,
      barcode: item.barcode,
      count: labelCounts[item.barcode] ?? 1,
    }));

    const finalTitle = sheetTitle.trim() || `${storeName} Barcode Labels`;
    printBatchBarcodes(batchData, finalTitle);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-sky-600/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Batch Barcode Label Printer
                </h2>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  Print Utility
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate and print sticky barcode sheets from recent barcode scan history or catalog products
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS & CONTROLS TOOLBAR */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Source Switcher */}
            <div className="flex items-center p-1 bg-slate-800/90 rounded-xl border border-slate-700/80">
              <button
                onClick={() => {
                  setActiveSource('scan_history');
                  setSelectedIds({});
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeSource === 'scan_history'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>From Scan History ({scanHistoryItems.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveSource('catalog');
                  setSelectedIds({});
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeSource === 'catalog'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>From Entire Catalog ({catalogItems.length})</span>
              </button>
            </div>

            {/* Time Filter for Scan History */}
            {activeSource === 'scan_history' && (
              <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/60 p-1 rounded-xl text-xs">
                <span className="text-[11px] text-slate-400 font-semibold px-2 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  Filter:
                </span>
                <button
                  onClick={() => setScanTimeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    scanTimeFilter === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Scans ({scanLogs.length})
                </button>
                <button
                  onClick={() => setScanTimeFilter('today')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    scanTimeFilter === 'today'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Today's Scans
                </button>
                <button
                  onClick={() => setScanTimeFilter('recent_50')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    scanTimeFilter === 'recent_50'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Recent 50
                </button>
              </div>
            )}
          </div>

          {/* Search bar & Selection Helpers */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeSource === 'scan_history'
                    ? 'Search scanned products by name, barcode, worker...'
                    : 'Search products by name, barcode, SKU...'
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                onClick={handleSelectAllVisible}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Select All Visible ({displayedItems.length})</span>
              </button>
              {selectedItemsList.length > 0 && (
                <>
                  <button
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-semibold rounded-lg border border-slate-700 transition"
                  >
                    Deselect All
                  </button>

                  <div className="h-4 w-px bg-slate-700 mx-1" />

                  {/* Batch label counts quick buttons */}
                  <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 text-[11px]">
                    <span className="text-slate-400 font-medium">Copies:</span>
                    <button
                      onClick={() => setAllLabelCounts(1)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold"
                      title="Set 1 label copy for each selected item"
                    >
                      1×
                    </button>
                    <button
                      onClick={() => setAllLabelCounts(3)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold"
                      title="Set 3 label copies for each selected item"
                    >
                      3×
                    </button>
                    <button
                      onClick={() => setAllLabelCounts(5)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold"
                      title="Set 5 label copies for each selected item"
                    >
                      5×
                    </button>
                    <button
                      onClick={matchStockQuantities}
                      className="px-1.5 py-0.5 bg-sky-950 text-sky-300 border border-sky-800/80 hover:bg-sky-900 rounded font-bold"
                      title="Set copies to match current inventory stock of each item"
                    >
                      Stock Qty
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ITEMS SELECTION TABLE / LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {displayedItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 border-2 border-dashed border-slate-800 rounded-2xl">
              <Barcode className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-bold text-slate-300">No matching products found</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {activeSource === 'scan_history'
                  ? 'There are no barcode scans matching your current filter. You can switch to "From Entire Catalog" to print labels for any inventory product.'
                  : 'No inventory items with barcodes matched your search.'}
              </p>
              {activeSource === 'scan_history' && (
                <button
                  onClick={() => setActiveSource('catalog')}
                  className="mt-4 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Browse Entire Catalog</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {displayedItems.map((item) => {
                const isSelected = !!selectedIds[item.barcode];
                const count = labelCounts[item.barcode] ?? 1;
                const isPreviewing = previewItemId === item.barcode;

                return (
                  <div
                    key={item.barcode}
                    onClick={() => toggleItemSelection(item.barcode)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500/70 shadow-md shadow-sky-950/50 ring-1 ring-sky-500/40'
                        : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`mt-0.5 shrink-0 transition ${
                            isSelected ? 'text-sky-400' : 'text-slate-500'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-100 truncate">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span className="bg-slate-900 px-1.5 py-0.2 rounded border border-slate-700/80 text-sky-300">
                              {item.barcode}
                            </span>
                            {item.sku && item.sku !== item.barcode && (
                              <span className="text-slate-400 truncate">SKU: {item.sku}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-extrabold text-emerald-400 font-mono">
                          KSh {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Stock: <strong className={item.stockQuantity <= 5 ? 'text-rose-400' : 'text-slate-300'}>{item.stockQuantity}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Meta info & Quantity control */}
                    <div
                      className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 truncate">
                        {item.lastScannedAt ? (
                          <span className="flex items-center gap-1 text-slate-400 truncate">
                            <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                            <span>
                              {new Date(item.lastScannedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {item.lastScannedBy ? ` • ${item.lastScannedBy}` : ''}
                            </span>
                            {item.scanCount && item.scanCount > 1 && (
                              <span className="bg-sky-900/60 text-sky-300 px-1 rounded font-bold">
                                {item.scanCount}× scans
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-500">{item.category}</span>
                        )}
                      </div>

                      {/* Label Count Stepper */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isSelected) toggleItemSelection(item.barcode);
                            updateLabelCount(item.barcode, -1);
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Decrease label copies"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={count}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1));
                            if (!isSelected) toggleItemSelection(item.barcode);
                            setLabelCounts((prev) => ({ ...prev, [item.barcode]: val }));
                          }}
                          className="w-10 text-center bg-transparent text-xs font-bold text-white focus:outline-none"
                          title="Number of barcode stickers to print for this product"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!isSelected) toggleItemSelection(item.barcode);
                            updateLabelCount(item.barcode, 1);
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Increase label copies"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] text-slate-400 pr-1 font-mono">labels</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER & ACTION BAR */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">
                Selected for Batch Printing:
              </span>
              <span className="text-sm font-black text-white flex items-center gap-1.5 font-mono">
                <span className="text-sky-400">{selectedItemsList.length}</span> Products
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-extrabold">{totalLabelsCount}</span> Labels Total
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>

            <button
              id="btn-confirm-batch-print-barcodes"
              onClick={handleExecuteBatchPrint}
              disabled={selectedItemsList.length === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all ${
                selectedItemsList.length > 0
                  ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-600/30 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Print Barcode Labels ({totalLabelsCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
