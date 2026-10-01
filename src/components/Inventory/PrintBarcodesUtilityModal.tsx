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
  ArrowRight,
  Eye,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Ruler,
  Info,
  Check,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  FileText,
  Smartphone
} from 'lucide-react';
import { BarcodeScanLog, Product } from '../../types';
import {
  printBatchBarcodes,
  generateBarcodeDataUrl,
  LABEL_SHEET_PRESETS,
  LabelSheetPreset
} from '../../utils/barcode';

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
  const [activeSource, setActiveSource] = useState<'scan_history' | 'catalog'>(() => {
    return scanLogs && scanLogs.length > 0 ? 'scan_history' : 'catalog';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [scanTimeFilter, setScanTimeFilter] = useState<'all' | 'today' | 'recent_50'>('all');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [labelCounts, setLabelCounts] = useState<Record<string, number>>({});
  const [sheetTitle, setSheetTitle] = useState(`${storeName} Barcode Labels Sheet`);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [includePrice, setIncludePrice] = useState(false);
  const [selectedFormatId, setSelectedFormatId] = useState<string>('a4_64');
  const [labelFontSize, setLabelFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showStoreNameOnLabel, setShowStoreNameOnLabel] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<'items' | 'preview'>('items');
  const [viewLayout, setViewLayout] = useState<'list' | 'grid'>('list');
  const [filterSelectedOnly, setFilterSelectedOnly] = useState<boolean>(false);
  const [showOptionsDrawer, setShowOptionsDrawer] = useState<boolean>(false);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(true);
  const [previewViewMode, setPreviewViewMode] = useState<'single' | 'sheet'>('single');
  const [sheetPageIndex, setSheetPageIndex] = useState<number>(0);
  const [sheetZoom, setSheetZoom] = useState<number>(100);
  const [showHpGuide, setShowHpGuide] = useState<boolean>(false);

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

  // Unified available items from both catalog & scan history
  const allAvailableItems = useMemo<PrintableItem[]>(() => {
    const map = new Map<string, PrintableItem>();
    catalogItems.forEach((item) => map.set(item.barcode, item));
    scanHistoryItems.forEach((item) => {
      if (!map.has(item.barcode)) {
        map.set(item.barcode, item);
      } else {
        const existing = map.get(item.barcode)!;
        map.set(item.barcode, {
          ...existing,
          lastScannedAt: item.lastScannedAt,
          lastScannedBy: item.lastScannedBy,
          scanCount: item.scanCount,
        });
      }
    });
    return Array.from(map.values());
  }, [catalogItems, scanHistoryItems]);

  // Currently displayed items list based on active tab, search, and selected-only filter
  const displayedItems = useMemo(() => {
    let list = activeSource === 'scan_history' ? scanHistoryItems : catalogItems;
    if (filterSelectedOnly) {
      list = allAvailableItems.filter((item) => !!selectedIds[item.barcode]);
    }
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.barcode.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        (item.category && item.category.toLowerCase().includes(term)) ||
        (item.lastScannedBy && item.lastScannedBy.toLowerCase().includes(term))
    );
  }, [activeSource, scanHistoryItems, catalogItems, allAvailableItems, filterSelectedOnly, selectedIds, searchTerm]);

  // Selection statistics
  const selectedItemsList = useMemo(() => {
    return allAvailableItems.filter((item) => !!selectedIds[item.barcode]);
  }, [selectedIds, allAvailableItems]);

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

  // Active sheet preset
  const activePreset = useMemo<LabelSheetPreset>(() => {
    return LABEL_SHEET_PRESETS.find((p) => p.id === selectedFormatId) || LABEL_SHEET_PRESETS[0];
  }, [selectedFormatId]);

  // Active preview item
  const activePreviewItem = useMemo<PrintableItem | null>(() => {
    if (previewItemId) {
      const found =
        displayedItems.find((i) => i.barcode === previewItemId) ||
        scanHistoryItems.find((i) => i.barcode === previewItemId) ||
        catalogItems.find((i) => i.barcode === previewItemId);
      if (found) return found;
    }
    if (selectedItemsList.length > 0) {
      return selectedItemsList[0];
    }
    if (displayedItems.length > 0) {
      return displayedItems[0];
    }
    return null;
  }, [previewItemId, displayedItems, selectedItemsList, scanHistoryItems, catalogItems]);

  // Real-time Barcode Image Data URL for single label preview
  const previewBarcodeUrl = useMemo(() => {
    if (!activePreviewItem?.barcode) return '';
    return generateBarcodeDataUrl(activePreviewItem.barcode, activePreviewItem.barcode);
  }, [activePreviewItem]);

  // Sheets count and capacity calculations
  const totalSheetsNeeded = useMemo(() => {
    if (activePreset.category === 'thermal_roll') {
      return totalLabelsCount;
    }
    const count = totalLabelsCount || 1;
    return Math.ceil(count / activePreset.labelsPerSheet);
  }, [totalLabelsCount, activePreset]);

  const spotsRemainingOnLastSheet = useMemo(() => {
    if (activePreset.category === 'thermal_roll') return 0;
    const count = totalLabelsCount || 1;
    const remainder = count % activePreset.labelsPerSheet;
    return remainder === 0 ? 0 : activePreset.labelsPerSheet - remainder;
  }, [totalLabelsCount, activePreset]);

  // Flatten selected labels into a sequential array for sheet layout preview
  const sheetLabelsArray = useMemo<PrintableItem[]>(() => {
    const list: PrintableItem[] = [];
    if (selectedItemsList.length > 0) {
      selectedItemsList.forEach((item) => {
        const count = labelCounts[item.barcode] ?? 1;
        for (let i = 0; i < count; i++) {
          list.push(item);
        }
      });
    } else if (activePreviewItem) {
      // If none selected, fill 1 full sheet with activePreviewItem so user sees the sheet filled
      const count = activePreset.labelsPerSheet;
      for (let i = 0; i < count; i++) {
        list.push(activePreviewItem);
      }
    }
    return list;
  }, [selectedItemsList, labelCounts, activePreviewItem, activePreset.labelsPerSheet]);

  const maxSheetPages = useMemo(() => {
    if (sheetLabelsArray.length === 0) return 1;
    return Math.ceil(sheetLabelsArray.length / activePreset.labelsPerSheet);
  }, [sheetLabelsArray, activePreset.labelsPerSheet]);

  const currentSheetPageItems = useMemo(() => {
    const start = sheetPageIndex * activePreset.labelsPerSheet;
    return sheetLabelsArray.slice(start, start + activePreset.labelsPerSheet);
  }, [sheetLabelsArray, sheetPageIndex, activePreset.labelsPerSheet]);

  // Barcode image URLs for the current sheet preview items
  const sheetBarcodeUrls = useMemo(() => {
    const map: Record<string, string> = {};
    if (activePreviewItem?.barcode) {
      map[activePreviewItem.barcode] = generateBarcodeDataUrl(activePreviewItem.barcode, activePreviewItem.barcode);
    }
    currentSheetPageItems.forEach((item) => {
      if (item.barcode && !map[item.barcode]) {
        map[item.barcode] = generateBarcodeDataUrl(item.barcode, item.barcode);
      }
    });
    return map;
  }, [activePreviewItem, currentSheetPageItems]);

  // Cycle previewed item
  const handleCyclePreview = (direction: 'next' | 'prev') => {
    const list = selectedItemsList.length > 0 ? selectedItemsList : displayedItems;
    if (list.length === 0) return;
    const currentIndex = list.findIndex((i) => i.barcode === activePreviewItem?.barcode);
    if (currentIndex === -1) {
      setPreviewItemId(list[0].barcode);
      return;
    }
    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % list.length
        : (currentIndex - 1 + list.length) % list.length;
    setPreviewItemId(list[nextIndex].barcode);
  };

  // Perform Batch Print with selected format and styling
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
    printBatchBarcodes(
      batchData,
      finalTitle,
      includePrice,
      selectedFormatId,
      labelFontSize,
      showStoreNameOnLabel ? storeName : undefined
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-0 sm:p-3 md:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border-0 sm:border sm:border-slate-700 rounded-none sm:rounded-2xl shadow-2xl w-full max-w-6xl h-full sm:h-auto sm:max-h-[95vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-sky-600/30 shrink-0">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-white truncate">
                  Batch Barcode Label Printer
                </h2>
                <span className="hidden sm:inline-block text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  Print Utility
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 mt-0.5 truncate">
                Generate and print sticky barcode sheets from recent barcode scan history or catalog products
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="sm:hidden text-[11px] font-mono font-bold text-sky-300 bg-sky-950/80 px-2.5 py-1 rounded-lg border border-sky-800/60">
              {selectedItemsList.length} sel ({totalLabelsCount} pcs)
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STEP TABS: 1. SELECT PRODUCTS vs 2. LIVE SHEET PREVIEW */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 bg-slate-950 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModalTab('items')}
            className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeModalTab === 'items'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-900/40 ring-1 ring-sky-400'
                : 'bg-slate-850 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-sky-300 shrink-0" />
            <span className="truncate">1. Select Products</span>
            <span className="bg-sky-950 text-sky-200 border border-sky-400/50 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0">
              {selectedItemsList.length} items ({totalLabelsCount} labels)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModalTab('preview')}
            className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeModalTab === 'preview'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-900/40 ring-1 ring-sky-400'
                : 'bg-slate-850 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Eye className="w-4 h-4 text-sky-300 shrink-0" />
            <span className="truncate">2. Live Sheet Preview</span>
            <span className="bg-sky-950 text-sky-200 border border-sky-400/50 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0">
              {activePreset.shortName}
            </span>
          </button>
        </div>

        {/* TABS & CONTROLS TOOLBAR (Rendered on 1. Select Products Tab) */}
        {activeModalTab === 'items' && (
          <div className="p-2.5 sm:p-3.5 border-b border-slate-800 bg-slate-950/70 space-y-2.5 shrink-0">
            {/* Top Toolbar Row: Search + Source Switcher + Layout Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products by name, barcode, SKU, category..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 sm:py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-inner"
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

              {/* Source Switcher Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    onClick={() => {
                      setActiveSource('catalog');
                      setFilterSelectedOnly(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeSource === 'catalog' && !filterSelectedOnly
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Catalog ({catalogItems.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSource('scan_history');
                      setFilterSelectedOnly(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeSource === 'scan_history' && !filterSelectedOnly
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Scans ({scanHistoryItems.length})</span>
                  </button>

                  <button
                    onClick={() => setFilterSelectedOnly(!filterSelectedOnly)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterSelectedOnly
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : selectedItemsList.length > 0
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Selected ({selectedItemsList.length})</span>
                  </button>
                </div>

                {/* View Layout Toggle: Spacious List vs Grid Cards */}
                <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setViewLayout('list')}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewLayout === 'list'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Spacious List View (Easy scrolling & clear item selection)"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewLayout('grid')}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewLayout === 'grid'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Grid Card View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions & Options Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-sky-300 font-bold rounded-lg border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All Visible ({displayedItems.length})</span>
                </button>

                {selectedItemsList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-rose-300 hover:text-rose-200 font-semibold rounded-lg border border-slate-700/80 transition cursor-pointer text-xs"
                  >
                    Clear Selection
                  </button>
                )}

                {/* Collapsible Options Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => setShowOptionsDrawer(!showOptionsDrawer)}
                  className={`px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1.5 font-bold cursor-pointer text-xs ${
                    showOptionsDrawer
                      ? 'bg-sky-950 text-sky-300 border-sky-700'
                      : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                  <span>Label Options & Copies</span>
                  {showOptionsDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Selection summary hint */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="text-slate-300 font-semibold">{displayedItems.length} items shown</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">{selectedItemsList.length} selected for print</span>
              </div>
            </div>

            {/* Collapsible Options Drawer (Copies, Sticker Format, Stock Sync) */}
            {showOptionsDrawer && (
              <div className="p-3 bg-slate-900/95 rounded-xl border border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Batch label counts quick buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 font-semibold text-[11px]">Set Copies for Selected:</span>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => setAllLabelCounts(1)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
                      >
                        1× each
                      </button>
                      <button
                        onClick={() => setAllLabelCounts(2)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
                      >
                        2× each
                      </button>
                      <button
                        onClick={() => setAllLabelCounts(3)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
                      >
                        3× each
                      </button>
                      <button
                        onClick={() => setAllLabelCounts(5)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
                      >
                        5× each
                      </button>
                      <button
                        onClick={matchStockQuantities}
                        className="px-2 py-0.5 bg-sky-950 text-sky-300 border border-sky-800/80 hover:bg-sky-900 rounded font-bold"
                      >
                        Match In-Store Stock
                      </button>
                    </div>
                  </div>

                  {/* Sticker Content Format: Only Item Name vs Include Price */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-slate-400 font-semibold text-[11px]">Sticker Content:</span>
                    <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIncludePrice(false)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                          !includePrice
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Only Item Name
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncludePrice(true)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                          includePrice
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Name + Price
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REAL-TIME VISUAL PREVIEW OF SELECTED LABEL SHEET & SINGLE LABEL (Rendered on 2. Live Sheet Preview Tab) */}
        {activeModalTab === 'preview' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('items')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Product Selection</span>
                </button>
                <span className="text-slate-500">•</span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Label Sheet & Physical Sticker Preview
                </span>
                <span className="bg-sky-950 text-sky-300 border border-sky-800/80 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                  {activePreset.shortName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteBatchPrint}
                  disabled={selectedItemsList.length === 0}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-sky-600/30 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet Now ({totalLabelsCount})</span>
                </button>
              </div>
            </div>

          {showLivePreview && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Paper Format Selector Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold flex items-center gap-1">
                    <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
                    Select Adhesive Paper Size / Sheet Format:
                  </span>
                  <span className="text-slate-400 text-[10px] hidden sm:inline">
                    {activePreset.description}
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                  {LABEL_SHEET_PRESETS.map((preset) => {
                    const isSelected = preset.id === selectedFormatId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedFormatId(preset.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/25 ring-1 ring-sky-400'
                            : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
                        }`}
                        title={preset.description}
                      >
                        {preset.id === 'a4_64' && (
                          <span className="text-amber-300 text-[10px]">⭐</span>
                        )}
                        <span>{preset.shortName}</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview View Mode Switcher & Mobile HP Quick Guide Toggle */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode('single')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      previewViewMode === 'single'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Single Sticker (Close-Up)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode('sheet')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      previewViewMode === 'sheet'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Full Sheet Grid ({activePreset.labelsPerSheet} Labels)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowHpGuide(!showHpGuide)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    showHpGuide
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mobile Phone & HP Printer Tips</span>
                  {showHpGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Mobile & HP Printer Setup Guide Accordion */}
              {showHpGuide && (
                <div className="bg-slate-900/95 border-2 border-amber-500/40 rounded-2xl p-3.5 text-xs text-slate-200 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span>How to Print on A4 64-Label Sheets from a Mobile Phone to an Older HP Printer</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div className="font-bold text-sky-400 mb-1 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-sky-900 text-sky-200 flex items-center justify-center text-[10px]">1</span>
                        Why 64 Labels (48.5×16.9 mm)?
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Since you are printing <strong>only Product Name + Barcode (no prices)</strong>, the 16.9 mm height is optimal. You get 64 stickers per A4 page (4 columns × 16 rows), minimizing paper cost.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-emerald-900 text-emerald-200 flex items-center justify-center text-[10px]">2</span>
                        Phone to HP Printer Connection
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        • <strong>Wi-Fi:</strong> If HP printer has Wi-Fi / Wireless Direct, connect phone and use <em>Mopria Print Service</em> (Android) or <em>AirPrint</em> (iPhone).<br />
                        • <strong>USB Cable:</strong> Use a $2 USB-OTG adapter from phone to HP printer USB cable with the <em>NokoPrint</em> app.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div className="font-bold text-amber-400 mb-1 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-amber-900 text-amber-200 flex items-center justify-center text-[10px]">3</span>
                        Critical Alignment Settings
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        In print dialog: Set <strong>Paper: A4</strong>, <strong>Scale: 100% (Actual Size)</strong>. <em>Never choose "Fit to Page"</em> because it shrinks the grid and causes stickers to print over pre-cut lines!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Visual Previews: Single Sticker vs Full Sheet Grid */}
              {previewViewMode === 'sheet' ? (
                /* FULL SHEET GRID PREVIEW */
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                        <LayoutGrid className="w-4 h-4 text-sky-400" />
                        Full Sheet Preview: {activePreset.name}
                      </span>
                      <span className="bg-slate-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono font-bold text-[11px]">
                        {activePreset.columns} Cols × {activePreset.rows} Rows ({activePreset.labelsPerSheet} stickers/sheet)
                      </span>
                    </div>

                    {/* Pagination & Zoom Controls */}
                    <div className="flex items-center gap-2">
                      {maxSheetPages > 1 && (
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs">
                          <button
                            type="button"
                            onClick={() => setSheetPageIndex((prev) => Math.max(0, prev - 1))}
                            disabled={sheetPageIndex === 0}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                            title="Previous Sheet"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-slate-200 font-bold px-1 text-[11px]">
                            Sheet {sheetPageIndex + 1} of {maxSheetPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSheetPageIndex((prev) => Math.min(maxSheetPages - 1, prev + 1))}
                            disabled={sheetPageIndex >= maxSheetPages - 1}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                            title="Next Sheet"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Zoom Controls */}
                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setSheetZoom((prev) => Math.max(60, prev - 15))}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-slate-300 text-[11px] w-9 text-center font-bold">
                          {sheetZoom}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setSheetZoom((prev) => Math.min(160, prev + 15))}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSheetZoom(100)}
                          className="text-[10px] text-sky-400 hover:text-sky-300 font-bold px-1 cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Visual White A4 Sheet Viewport */}
                  <div className="bg-slate-950 p-3 sm:p-5 rounded-xl border border-slate-800 flex justify-center overflow-x-auto max-h-[460px] overflow-y-auto">
                    <div
                      style={{
                        width: `${(activePreset.widthMm * activePreset.columns + 16) * (sheetZoom / 100)}mm`,
                        maxWidth: `${sheetZoom}%`,
                        minWidth: '280px',
                        transformOrigin: 'top center',
                      }}
                      className="bg-white text-slate-950 rounded-lg p-2.5 sm:p-4 shadow-2xl border border-slate-300 flex flex-col transition-all duration-150 select-none"
                    >
                      {/* Sheet Header Banner on paper preview */}
                      <div className="border-b border-slate-200 pb-1 mb-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                        <span className="font-bold text-slate-800 uppercase tracking-wider">{storeName} — {activePreset.name}</span>
                        <span>Sheet {sheetPageIndex + 1}/{maxSheetPages} • {activePreset.category === 'thermal_roll' ? 'Continuous' : 'A4 Size (210×297mm)'}</span>
                      </div>

                      {/* The Grid of Labels */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${activePreset.columns}, 1fr)`,
                          gap: '2px',
                        }}
                        className="w-full"
                      >
                        {Array.from({ length: activePreset.labelsPerSheet }).map((_, slotIdx) => {
                          const item = currentSheetPageItems[slotIdx];
                          const barcodeUrl = item?.barcode ? (sheetBarcodeUrls[item.barcode] || previewBarcodeUrl) : '';
                          const isFilled = !!item;

                          return (
                            <div
                              key={slotIdx}
                              onClick={() => {
                                if (item) {
                                  setPreviewItemId(item.barcode);
                                  setPreviewViewMode('single');
                                }
                              }}
                              style={{
                                minHeight: activePreset.heightMm <= 18 ? '44px' : '58px',
                              }}
                              className={`p-1 rounded-[3px] border flex flex-col justify-between items-center text-center transition ${
                                isFilled
                                  ? 'border-slate-300 bg-white hover:border-sky-500 hover:shadow-md cursor-pointer'
                                  : 'border-dashed border-slate-200 bg-slate-50/50 opacity-50'
                              }`}
                              title={isFilled ? `${item.name} (${item.barcode}) - Click to preview single sticker` : 'Unused sticker slot on this sheet'}
                            >
                              {isFilled ? (
                                <>
                                  {showStoreNameOnLabel && (
                                    <div className="text-[6px] font-black uppercase text-slate-400 tracking-wider leading-none">
                                      {storeName}
                                    </div>
                                  )}
                                  <div className="text-[8px] sm:text-[9px] font-black text-slate-900 truncate w-full leading-tight px-0.5">
                                    {item.name}
                                  </div>
                                  {includePrice && (
                                    <div className="text-[7px] font-black text-sky-700 leading-none">
                                      KSh {Number(item.price || 0).toLocaleString()}
                                    </div>
                                  )}
                                  {barcodeUrl ? (
                                    <img
                                      src={barcodeUrl}
                                      alt={item.barcode}
                                      style={{
                                        height: activePreset.heightMm <= 18 ? '18px' : '24px',
                                        maxWidth: '95%',
                                        objectFit: 'contain',
                                      }}
                                      className="block"
                                    />
                                  ) : (
                                    <div className="text-[7px] text-slate-400 font-mono">
                                      {item.barcode}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="h-full flex items-center justify-center text-[7px] text-slate-300 font-mono">
                                  #{slotIdx + 1} Blank
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Sheet Footer Notes */}
                      <div className="border-t border-slate-200 mt-2 pt-1 flex items-center justify-between text-[8px] text-slate-400 font-mono">
                        <span>Format: Scale 100% (Actual Size)</span>
                        <span>4 Columns × 16 Rows = 64 Labels</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                    <span className="text-[11px] text-slate-300">
                      💡 Click any sticker to inspect it in high-resolution Single Label view.
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewViewMode('single')}
                      className="text-sky-400 hover:text-sky-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Switch to Single Sticker Close-Up</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* SINGLE LABEL REALISTIC CLOSE-UP MOCKUP */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
                  {/* LEFT: Physical Single Label Realistic Mockup (7 Cols) */}
                  <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-inner space-y-2.5">
                    {/* Top Bar of Single Label Preview */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
                          <Ruler className="w-3.5 h-3.5 text-sky-400" />
                          Single Label Print Preview
                        </span>
                        <span className="text-[10px] font-mono bg-slate-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                          {activePreset.widthMm}mm × {activePreset.heightMm}mm
                        </span>
                      </div>

                      {/* Cycle Item Switcher */}
                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-[11px]">
                        <span className="text-slate-400 mr-1 hidden sm:inline">Previewing:</span>
                        <button
                          type="button"
                          onClick={() => handleCyclePreview('prev')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                          title="Preview previous product"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-slate-200 font-bold truncate max-w-[130px]" title={activePreviewItem?.name}>
                          {activePreviewItem?.name || 'No Item'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCyclePreview('next')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                          title="Preview next product"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Physical Sticker Mockup Canvas */}
                    <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center justify-center relative min-h-[130px] overflow-hidden select-none">
                      {/* Width dimension ruler */}
                      <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                        <span>⟵</span>
                        <span>{activePreset.widthMm} mm width</span>
                        <span>⟶</span>
                      </div>

                      <div className="flex items-center gap-2 w-full justify-center">
                        {/* Height dimension ruler on left */}
                        <div className="text-[10px] font-mono text-slate-400 flex flex-col items-center justify-center shrink-0 pr-1">
                          <span>↑</span>
                          <span className="text-[9px] [writing-mode:vertical-lr] my-1 rotate-180">
                            {activePreset.heightMm} mm
                          </span>
                          <span>↓</span>
                        </div>

                        {/* PHYSICAL WHITE ADHESIVE STICKER */}
                        <div
                          style={{
                            width: '100%',
                            maxWidth: activePreset.category === 'thermal_roll' ? '280px' : '320px',
                            minHeight: activePreset.heightMm <= 18 ? '68px' : '86px',
                          }}
                          className="bg-white text-slate-950 rounded-lg p-2 shadow-2xl border border-slate-300 flex flex-col justify-between items-center transition-all duration-150 transform hover:scale-[1.02]"
                        >
                          {/* Optional Store Brand Header */}
                          {showStoreNameOnLabel && (
                            <div className="text-[8px] font-black uppercase text-slate-500 tracking-wider mb-0.5 leading-none">
                              {storeName}
                            </div>
                          )}

                          {/* Product Name (Bold & Crisp) */}
                          <div
                            style={{
                              fontSize:
                                labelFontSize === 'small' || activePreset.heightMm < 20
                                  ? '11px'
                                  : labelFontSize === 'large'
                                  ? '14px'
                                  : '12px',
                            }}
                            className="font-black text-slate-950 text-center w-full truncate leading-tight tracking-tight px-1"
                            title={activePreviewItem?.name || 'Product Name'}
                          >
                            {activePreviewItem?.name || 'Sample Product Name'}
                          </div>

                          {/* Optional Selling Price */}
                          {includePrice && (
                            <div className="text-[11px] font-black text-sky-700 text-center font-mono my-0.5 leading-none">
                              KSh {Number(activePreviewItem?.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          )}

                          {/* Barcode Graphic */}
                          {previewBarcodeUrl ? (
                            <div className="w-full flex flex-col items-center justify-center my-0.5">
                              <img
                                src={previewBarcodeUrl}
                                alt={activePreviewItem?.barcode || 'Barcode'}
                                style={{
                                  height: activePreset.heightMm <= 18 ? '28px' : '38px',
                                  maxWidth: '100%',
                                  objectFit: 'contain',
                                }}
                                className="block"
                              />
                            </div>
                          ) : (
                            <div className="h-7 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                              [Barcode Preview]
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Single Label Options Toolbar */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-xs">
                      {/* Font Size Selector */}
                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-[11px]">
                        <span className="text-slate-400 font-medium">Text Size:</span>
                        <button
                          type="button"
                          onClick={() => setLabelFontSize('small')}
                          className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                            labelFontSize === 'small'
                              ? 'bg-sky-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Small
                        </button>
                        <button
                          type="button"
                          onClick={() => setLabelFontSize('medium')}
                          className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                            labelFontSize === 'medium'
                              ? 'bg-sky-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => setLabelFontSize('large')}
                          className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                            labelFontSize === 'large'
                              ? 'bg-sky-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Large
                        </button>
                      </div>

                      {/* Store Header Toggle */}
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-300 font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showStoreNameOnLabel}
                          onChange={(e) => setShowStoreNameOnLabel(e.target.checked)}
                          className="rounded text-sky-600 bg-slate-800 border-slate-700"
                        />
                        <span>Store Name Header</span>
                      </label>

                      {/* Sticker Content info */}
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-lg font-mono">
                        {includePrice ? 'Name + Barcode + Price' : 'Only Name + Barcode'}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT: Sheet Grid Layout & Capacity Indicator (5 Cols) */}
                  <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-inner space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
                        <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
                        Sheet Layout & Capacity
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewViewMode('sheet')}
                        className="text-[10px] bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-700 px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Full Sheet</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Visual A4 Miniature Wireframe */}
                      <div className="w-20 sm:w-24 h-28 sm:h-32 bg-slate-950 border border-slate-700 rounded-lg p-1.5 shrink-0 flex flex-col justify-between shadow-md relative overflow-hidden">
                        <div className="text-[7px] text-slate-500 font-mono text-center border-b border-slate-800 pb-0.5">
                          {activePreset.columns} × {activePreset.rows} Grid
                        </div>

                        {/* Grid representation */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${activePreset.columns}, 1fr)`,
                            gridTemplateRows: `repeat(${Math.min(16, activePreset.rows)}, 1fr)`,
                            gap: '1px',
                            height: '80px',
                          }}
                          className="w-full my-auto"
                        >
                          {Array.from({ length: Math.min(64, activePreset.labelsPerSheet) }).map((_, idx) => {
                            const isFilled = idx < totalLabelsCount;
                            return (
                              <div
                                key={idx}
                                className={`rounded-[1px] ${
                                  isFilled
                                    ? 'bg-sky-500 shadow-[0_0_2px_rgba(14,165,233,0.8)]'
                                    : 'bg-slate-800/80 border border-slate-700/40'
                                }`}
                              />
                            );
                          })}
                        </div>

                        <div className="text-[7px] text-sky-400 font-bold font-mono text-center">
                          {activePreset.labelsPerSheet} Labels/Page
                        </div>
                      </div>

                      {/* Stats & Details */}
                      <div className="space-y-1.5 text-xs min-w-0 flex-1">
                        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Total Stickers:</span>
                            <span className="font-extrabold text-white font-mono">{totalLabelsCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Sheets Required:</span>
                            <span className="font-extrabold text-emerald-400 font-mono">
                              {totalSheetsNeeded} {activePreset.category === 'thermal_roll' ? 'Cut(s)' : 'A4 Sheet(s)'}
                            </span>
                          </div>
                          {activePreset.category === 'a4_sheet' && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Blank on Last Page:</span>
                              <span className="font-bold text-slate-300 font-mono">
                                {spotsRemainingOnLastSheet} stickers
                              </span>
                            </div>
                          )}
                        </div>

                        {/* HP Printer / Mobile Phone Pro Tip */}
                        <div className="bg-sky-950/60 border border-sky-800/60 p-2 rounded-xl text-[10px] text-sky-300 leading-snug">
                          <span className="font-bold block text-white">💡 HP Printer & Mobile Tip:</span>
                          In print dialog: set <strong>Scale: 100% (Actual Size)</strong>. Do not use "Fit to Page".
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ITEMS SELECTION TABLE / LIST (Rendered on 1. Select Products Tab) */}
      {activeModalTab === 'items' && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 min-h-0">
          {displayedItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 border-2 border-dashed border-slate-800 rounded-2xl">
              <Barcode className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-bold text-slate-300">
                {filterSelectedOnly
                  ? 'No items selected yet'
                  : 'No matching products found'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {filterSelectedOnly
                  ? 'You are viewing the "Selected Only" filter. Switch back to "Catalog" or "Scans" to choose items to print.'
                  : searchTerm.trim()
                  ? `No items matched "${searchTerm}". Try a different keyword or barcode.`
                  : activeSource === 'scan_history'
                  ? 'There are no barcode scans matching your filter. Switch to "Catalog" to print labels for any product in inventory.'
                  : 'No inventory items with barcodes found in your store.'}
              </p>
              <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
                {filterSelectedOnly && (
                  <button
                    onClick={() => setFilterSelectedOnly(false)}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>View All Catalog Items</span>
                  </button>
                )}
                {searchTerm.trim() && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Search Filter</span>
                  </button>
                )}
                {!filterSelectedOnly && activeSource === 'scan_history' && (
                  <button
                    onClick={() => setActiveSource('catalog')}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Browse Entire Catalog</span>
                  </button>
                )}
              </div>
            </div>
          ) : viewLayout === 'list' ? (
            /* SPACIOUS LIST VIEW (Recommended: Maximum clarity & comfortable touch targets) */
            <div className="space-y-2.5">
              {displayedItems.map((item) => {
                const isSelected = !!selectedIds[item.barcode];
                const count = labelCounts[item.barcode] ?? 1;
                const isPreviewing = activePreviewItem?.barcode === item.barcode;

                return (
                  <div
                    key={item.barcode}
                    onClick={() => {
                      toggleItemSelection(item.barcode);
                      setPreviewItemId(item.barcode);
                    }}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none shadow-sm ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-500/90 shadow-md shadow-sky-950/60 ring-2 ring-sky-500/50'
                        : 'bg-slate-800/80 border-slate-700/70 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    {/* Left: Checkbox + Product Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox Tap Zone */}
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                          isSelected
                            ? 'bg-sky-500 border-sky-400 text-slate-950 shadow-md'
                            : 'border-slate-600 bg-slate-900 text-transparent hover:border-slate-400'
                        }`}
                      >
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                      </div>

                      {/* Product Name, Barcode & Tags */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm sm:text-base font-bold text-slate-100 truncate">
                            {item.name}
                          </span>
                          {isSelected && (
                            <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0">
                              Selected for Print ({count} copies)
                            </span>
                          )}
                          {isPreviewing && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                              <Eye className="w-3 h-3" /> Previewing on Sticker
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1 flex-wrap">
                          <span className="bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800 text-sky-300 font-bold">
                            {item.barcode}
                          </span>
                          <span className="bg-slate-800 px-2 py-0.5 rounded-lg text-slate-300 text-[11px] font-sans">
                            {item.category}
                          </span>
                          {item.sku && item.sku !== item.barcode && (
                            <span className="text-slate-400 truncate text-[11px]">SKU: {item.sku}</span>
                          )}
                          {item.lastScannedAt && (
                            <span className="text-slate-400 text-[11px] flex items-center gap-1 font-sans">
                              <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                              Scanned {new Date(item.lastScannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Price & Stock + Label Copies Stepper + Preview Button */}
                    <div
                      className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Price & Stock info */}
                      <div className="text-left sm:text-right pr-1">
                        <div className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                          KSh {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          Stock: <strong className={item.stockQuantity <= 5 ? 'text-rose-400' : 'text-slate-300'}>{item.stockQuantity}</strong>
                        </div>
                      </div>

                      {/* Copies Stepper */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isSelected) toggleItemSelection(item.barcode);
                            updateLabelCount(item.barcode, -1);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Decrease copies"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={count}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1));
                            if (!isSelected) toggleItemSelection(item.barcode);
                            setLabelCounts((prev) => ({ ...prev, [item.barcode]: val }));
                          }}
                          className="w-10 text-center bg-transparent text-xs font-mono font-bold text-sky-300 focus:outline-none"
                          title="Label copies count"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!isSelected) toggleItemSelection(item.barcode);
                            updateLabelCount(item.barcode, 1);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Increase copies"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Single Sticker Preview Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewItemId(item.barcode);
                          setActiveModalTab('preview');
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                          isPreviewing
                            ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                        }`}
                        title="Preview this item on sticker"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* CARD GRID VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
              {displayedItems.map((item) => {
                const isSelected = !!selectedIds[item.barcode];
                const count = labelCounts[item.barcode] ?? 1;
                const isPreviewing = activePreviewItem?.barcode === item.barcode;

                return (
                  <div
                    key={item.barcode}
                    onClick={() => {
                      toggleItemSelection(item.barcode);
                      setPreviewItemId(item.barcode);
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none shadow-sm ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-500/90 shadow-md shadow-sky-950/60 ring-2 ring-sky-500/50'
                        : 'bg-slate-800/80 border-slate-700/70 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 transition-all ${
                            isSelected
                              ? 'bg-sky-500 border-sky-400 text-slate-950 shadow-md'
                              : 'border-slate-600 bg-slate-900 text-transparent hover:border-slate-400'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-100 truncate">
                              {item.name}
                            </span>
                            {isPreviewing && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                                <Eye className="w-2.5 h-2.5" /> Previewing on Sticker
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1 flex-wrap">
                            <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700/80 text-sky-300 font-bold">
                              {item.barcode}
                            </span>
                            <span className="bg-slate-800 px-2 py-0.5 rounded-lg text-slate-300 text-[11px] font-sans">
                              {item.category}
                            </span>
                            {item.sku && item.sku !== item.barcode && (
                              <span className="text-slate-400 truncate">SKU: {item.sku}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItemId(item.barcode);
                            setActiveModalTab('preview');
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            isPreviewing
                              ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                          }`}
                          title="Preview this item on sticker"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-400" />
                          <span>Preview</span>
                        </button>

                        <div className="text-right">
                          <div className="text-sm font-black text-emerald-400 font-mono">
                            KSh {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            Stock: <strong className={item.stockQuantity <= 5 ? 'text-rose-400' : 'text-slate-300'}>{item.stockQuantity}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Meta info & Quantity control */}
                    <div
                      className="mt-3.5 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                        {item.lastScannedAt ? (
                          <span className="flex items-center gap-1.5 text-slate-400 truncate">
                            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>
                              Scanned {new Date(item.lastScannedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Inventory Product</span>
                        )}
                      </div>

                      {/* Label Count Stepper */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isSelected) toggleItemSelection(item.barcode);
                            updateLabelCount(item.barcode, -1);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Decrease label copies"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={count}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1));
                            if (!isSelected) toggleItemSelection(item.barcode);
                            setLabelCounts((prev) => ({ ...prev, [item.barcode]: val }));
                          }}
                          className="w-12 text-center bg-transparent text-xs font-bold text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!isSelected) toggleItemSelection(item.barcode);
                            updateLabelCount(item.barcode, 1);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Increase label copies"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] text-slate-400 pr-1.5 font-mono">labels</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky summary bar on items tab */}
          {selectedItemsList.length > 0 && (
            <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border border-sky-500/50 p-3 sm:p-3.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="text-xs text-slate-200">
                <strong className="text-sky-400 font-mono text-sm">{selectedItemsList.length}</strong> products selected (
                <strong className="text-emerald-400 font-mono text-sm">{totalLabelsCount}</strong> stickers total, requires{' '}
                <strong className="text-amber-300 font-mono">{totalSheetsNeeded}</strong> {activePreset.category === 'thermal_roll' ? 'cuts' : 'sheets'})
              </div>
              <button
                type="button"
                onClick={() => setActiveModalTab('preview')}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/30 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Proceed to Label Sheet Preview ➔</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL FOOTER & ACTION BAR */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400">
              Selected for Batch Printing:
            </span>
            <span className="text-sm font-black text-white flex items-center gap-1.5 font-mono flex-wrap">
              <span className="text-sky-400">{selectedItemsList.length}</span> Products
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-extrabold">{totalLabelsCount}</span> Labels Total
              <span className="text-slate-500">•</span>
              <span className="text-amber-300 font-bold">{totalSheetsNeeded}</span> {activePreset.category === 'thermal_roll' ? 'Cuts' : 'A4 Sheets'}
              <span className="text-slate-500">•</span>
              <span className="text-[11px] text-sky-300 bg-sky-950/80 border border-sky-800/80 px-2 py-0.5 rounded-full font-sans font-semibold">
                {activePreset.shortName}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-[11px] text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full font-sans font-semibold">
                {includePrice ? 'Name + Price' : 'Only Item Name'}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>

          {activeModalTab === 'items' ? (
            <button
              type="button"
              onClick={() => setActiveModalTab('preview')}
              disabled={selectedItemsList.length === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all ${
                selectedItemsList.length > 0
                  ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Next: Sheet Preview ({totalLabelsCount}) ➔</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveModalTab('items')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Products</span>
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
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
