import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Trash2,
  Download,
  Sparkles,
  Wand2,
  RefreshCw,
  ArrowUpDown,
  Filter,
  Check,
  Image as ImageIcon,
  Calculator,
  ChevronDown,
  Layers,
  Save,
  HelpCircle,
  Copy,
  AlertTriangle,
  History,
  Barcode,
  Printer,
  Star,
  Zap,
  Gem
} from 'lucide-react';
import { Product, Supplier, Transaction } from '../../types';
import { generateAutoBarcode, printBarcodeLabels, printBatchBarcodes } from '../../utils/barcode';
import { calculateProfitMargin } from '../../utils/margin';
import { ImageGeneratorModal } from './ImageGeneratorModal';
import { computeProductsPerformance } from '../../utils/salesPerformance';

interface ExcelSpreadsheetViewProps {
  products: Product[];
  categories: any[];
  suppliers: Supplier[];
  transactions?: Transaction[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onBatchImportProducts?: (importedProducts: Product[], replaceExisting: boolean) => void;
  showLowStockOnly?: boolean;
  onToggleLowStockOnly?: () => void;
  onViewProductHistory?: (product: Product) => void;
}

export const ExcelSpreadsheetView: React.FC<ExcelSpreadsheetViewProps> = ({
  products,
  categories,
  suppliers,
  transactions = [],
  onSaveProduct,
  onDeleteProduct,
  onBatchImportProducts,
  showLowStockOnly = false,
  onToggleLowStockOnly,
  onViewProductHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [localLowStockOnly, setLocalLowStockOnly] = useState(showLowStockOnly);

  const performanceMap = useMemo(() => {
    return computeProductsPerformance(products, transactions);
  }, [products, transactions]);

  const activeLowStockFilter = showLowStockOnly || localLowStockOnly;

  const handleToggleLowStock = () => {
    if (onToggleLowStockOnly) {
      onToggleLowStockOnly();
    } else {
      setLocalLowStockOnly(!localLowStockOnly);
    }
  };

  // Active Inline Editing Cell state: { productId: string, field: keyof Product }
  const [editingCell, setEditingCell] = useState<{ productId: string; field: keyof Product } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Image Modal State
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);

  // Column Sort State
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Row Selection for Excel actions
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Filtered & Sorted products
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesLowStock = !activeLowStockFilter || p.stockQuantity <= p.minStockAlert;

      return matchesSearch && matchesCat && matchesLowStock;
    })
    .sort((a, b) => {
      const valA = a[sortField] ?? '';
      const valB = b[sortField] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

  // Handle Sort Header Click
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Start Inline Editing Cell
  const handleCellClick = (p: Product, field: keyof Product) => {
    setEditingCell({ productId: p.id, field });
    setEditValue(String(p[field] ?? ''));
  };

  // Save Inline Edit
  const handleCellBlur = (p: Product) => {
    if (!editingCell) return;

    const { field } = editingCell;
    let updatedVal: any = editValue;

    if (field === 'costPrice' || field === 'sellingPrice' || field === 'stockQuantity' || field === 'minStockAlert') {
      const num = parseFloat(editValue);
      updatedVal = isNaN(num) ? 0 : num;
    }

    const updatedProduct: Product = {
      ...p,
      [field]: updatedVal,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onSaveProduct(updatedProduct);
    setEditingCell(null);
  };

  // Add New Blank Row (like Excel Insert Row)
  const handleAddExcelRow = () => {
    const now = new Date().toISOString().slice(0, 10);
    const defaultCat = categories[0]?.name || 'General';
    const defaultSupp = suppliers[0]?.name || 'Direct Wholesale';
    const defaultSuppId = suppliers[0]?.id || 'sup-1';

    const newProd: Product = {
      id: `prod-excel-${Date.now()}`,
      name: `New Item #${products.length + 1}`,
      sku: `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      barcode: generateAutoBarcode(),
      category: defaultCat,
      subcategory: '',
      sizeCapacity: 'Standard',
      description: 'Added via Excel Grid',
      costPrice: 100,
      sellingPrice: 150,
      stockQuantity: 10,
      minStockAlert: 5,
      unit: 'pcs',
      supplierId: defaultSuppId,
      supplierName: defaultSupp,
      createdAt: now,
      updatedAt: now,
    };

    onSaveProduct(newProd);
  };

  // Delete Selected Excel Rows
  const handleDeleteSelected = () => {
    if (selectedRowIds.size === 0) return;
    selectedRowIds.forEach((id) => onDeleteProduct(id));
    setSelectedRowIds(new Set());
  };

  // Toggle Row Selection
  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.size === filteredProducts.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Category', 'Subcategory', 'SizeCapacity', 'SKU', 'Barcode', 'CostPrice', 'SellingPrice', 'StockQuantity', 'Unit', 'SupplierName', 'ImageUrl'];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.subcategory || ''}"`,
      `"${p.sizeCapacity || ''}"`,
      p.sku,
      p.barcode,
      p.costPrice,
      p.sellingPrice,
      p.stockQuantity,
      p.unit,
      `"${p.supplierName}"`,
      `"${p.imageUrl || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `excel_inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk Apply Generated Images
  const handleBulkImagesApplied = (imageMap: Record<string, string>) => {
    products.forEach((p) => {
      if (imageMap[p.id]) {
        onSaveProduct({
          ...p,
          imageUrl: imageMap[p.id],
        });
      }
    });
  };

  // Excel Summary Stats
  const totalItemsCount = filteredProducts.length;
  const totalStockQuantity = filteredProducts.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
  const totalCatalogValue = filteredProducts.reduce((acc, p) => acc + (p.sellingPrice * p.stockQuantity || 0), 0);
  const totalCatalogCost = filteredProducts.reduce((acc, p) => acc + (p.costPrice * p.stockQuantity || 0), 0);
  const totalPotentialProfit = totalCatalogValue - totalCatalogCost;
  const avgMargin =
    totalCatalogValue > 0 ? ((totalPotentialProfit / totalCatalogValue) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      {/* EXCEL RIBBON TOOLBAR HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Ribbon Title Bar */}
        <div className="bg-emerald-950/80 border-b border-emerald-800/80 p-3 px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <span>Excel Spreadsheet Inventory Manager</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  Editable Grid • 300+ Items
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Click any cell to edit directly like Microsoft Excel or Google Sheets.
              </p>
            </div>
          </div>

          {/* Quick Action Ribbon Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleAddExcelRow}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Insert Row</span>
            </button>

            <button
              onClick={() => {
                setSelectedProductForImage(null);
                setShowImageModal(true);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Generate Images</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                const targetProducts =
                  selectedRowIds.size > 0
                    ? filteredProducts.filter((p) => selectedRowIds.has(p.id))
                    : filteredProducts;

                const batchData = targetProducts.map((p) => ({
                  name: p.name,
                  price: p.sellingPrice,
                  barcode: p.barcode,
                  count: 1,
                }));

                const labelTitle =
                  selectedRowIds.size > 0
                    ? `Selected Items Barcodes Sheet (${selectedRowIds.size} items)`
                    : `All Filtered Items Barcodes Sheet (${filteredProducts.length} items)`;

                printBatchBarcodes(batchData, labelTitle);
              }}
              className="bg-sky-950 border border-sky-800 text-sky-200 hover:bg-sky-900 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md"
              title={
                selectedRowIds.size > 0
                  ? `Print barcodes for ${selectedRowIds.size} selected rows`
                  : `Print barcodes for all ${filteredProducts.length} items`
              }
            >
              <Barcode className="w-4 h-4 text-sky-400" />
              <span>
                {selectedRowIds.size > 0
                  ? `Print Selected Barcodes (${selectedRowIds.size})`
                  : `Print All Barcodes`}
              </span>
            </button>

            {selectedRowIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete ({selectedRowIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Formula Filter Bar */}
        <div className="p-3 bg-slate-950 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search formula (Name, SKU, Barcode)..."
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs pl-9 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={handleToggleLowStock}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeLowStockFilter
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle to view only low stock / alerted items"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${activeLowStockFilter ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>{activeLowStockFilter ? 'Low Stock Filter Active' : 'Low Stock Filter'}</span>
            </button>

            <div className="flex items-center gap-1.5 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-xl focus:outline-none focus:border-emerald-500"
              >
                <option value="All">All Categories ({products.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60 hidden md:block">
              fx: =SUM(Inventory_Value)
            </div>
          </div>
        </div>

        {/* EXCEL GRID TABLE */}
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider sticky top-0 z-20 border-b border-slate-800 font-mono">
              <tr>
                {/* Select Checkbox */}
                <th className="p-2.5 w-10 text-center border-r border-slate-800 bg-slate-950">
                  <input
                    type="checkbox"
                    checked={selectedRowIds.size > 0 && selectedRowIds.size === filteredProducts.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded text-emerald-600 bg-slate-900 border-slate-700"
                  />
                </th>

                {/* Excel Row # Column */}
                <th className="p-2.5 w-12 text-center text-slate-500 border-r border-slate-800 bg-slate-950">
                  #
                </th>

                {/* Col A: Image */}
                <th className="p-2.5 w-14 text-center border-r border-slate-800 bg-slate-950">
                  A [Img]
                </th>

                {/* Col B: Name */}
                <th
                  onClick={() => handleSort('name')}
                  className="p-2.5 min-w-[180px] border-r border-slate-800 cursor-pointer hover:bg-slate-900 transition bg-slate-950"
                >
                  <div className="flex items-center justify-between">
                    <span>B: Item Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>

                {/* Col C: Category */}
                <th
                  onClick={() => handleSort('category')}
                  className="p-2.5 min-w-[130px] border-r border-slate-800 cursor-pointer hover:bg-slate-900 transition bg-slate-950"
                >
                  <div className="flex items-center justify-between">
                    <span>C: Category</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>

                {/* Col D: Size / Specs */}
                <th className="p-2.5 min-w-[110px] border-r border-slate-800 bg-slate-950">
                  D: Size/Cap
                </th>

                {/* Col E: SKU */}
                <th className="p-2.5 min-w-[120px] border-r border-slate-800 bg-slate-950">
                  E: SKU
                </th>

                {/* Col F: Barcode */}
                <th className="p-2.5 min-w-[130px] border-r border-slate-800 bg-slate-950">
                  F: Barcode
                </th>

                {/* Col G: Cost Price */}
                <th
                  onClick={() => handleSort('costPrice')}
                  className="p-2.5 text-right min-w-[110px] border-r border-slate-800 cursor-pointer hover:bg-slate-900 transition bg-slate-950"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>G: Cost (KSh)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>

                {/* Col H: Selling Price */}
                <th
                  onClick={() => handleSort('sellingPrice')}
                  className="p-2.5 text-right min-w-[110px] border-r border-slate-800 cursor-pointer hover:bg-slate-900 transition bg-slate-950"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>H: Price (KSh)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>

                {/* Col I: Margin % */}
                <th className="p-2.5 text-right min-w-[90px] border-r border-slate-800 bg-slate-950 text-emerald-400">
                  I: Margin
                </th>

                {/* Col J: Stock Qty */}
                <th
                  onClick={() => handleSort('stockQuantity')}
                  className="p-2.5 text-center min-w-[90px] border-r border-slate-800 cursor-pointer hover:bg-slate-900 transition bg-slate-950"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>J: Stock</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>

                {/* Col K: Stock Value */}
                <th className="p-2.5 text-right min-w-[120px] border-r border-slate-800 bg-slate-950 text-sky-400">
                  K: Value (KSh)
                </th>

                {/* Col L: Velocity & Profit Tier */}
                <th className="p-2.5 text-center min-w-[140px] border-r border-slate-800 bg-slate-950 text-amber-400">
                  L: Sales & Margin
                </th>

                {/* Col M: Restock & Sales History */}
                <th className="p-2.5 text-center min-w-[100px] bg-slate-950 text-indigo-400">
                  M: History
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredProducts.map((p, idx) => {
                const isSelected = selectedRowIds.has(p.id);
                const marginInfo = calculateProfitMargin(p.costPrice, p.sellingPrice);
                const stockVal = p.sellingPrice * p.stockQuantity;
                const perf = performanceMap[p.id];

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-800/60 transition group ${
                      isSelected
                        ? 'bg-emerald-950/30'
                        : perf
                        ? `${perf.tableRowHighlight} ${perf.accentBorderLeft}`
                        : idx % 2 === 0
                        ? 'bg-slate-900/40'
                        : 'bg-slate-900/10'
                    }`}
                  >
                    {/* Select Row Checkbox */}
                    <td className="p-2.5 text-center border-r border-slate-800/80">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(p.id)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 bg-slate-900 border-slate-700"
                      />
                    </td>

                    {/* Row Index */}
                    <td className="p-2.5 text-center text-slate-500 text-[11px] border-r border-slate-800/80 select-none bg-slate-950/40">
                      {idx + 1}
                    </td>

                    {/* Col A: Image thumbnail & AI Wand button */}
                    <td className="p-1.5 text-center border-r border-slate-800/80">
                      <div className="relative group/img inline-block">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-lg object-cover mx-auto border border-slate-700"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <button
                          title="Generate AI Studio Image for this item"
                          onClick={() => {
                            setSelectedProductForImage(p);
                            setShowImageModal(true);
                          }}
                          className="absolute -top-1 -right-1 bg-purple-600 text-white p-0.5 rounded-full opacity-0 group-hover/img:opacity-100 transition shadow"
                        >
                          <Wand2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </td>

                    {/* Col B: Item Name (Editable) */}
                    <td
                      onClick={() => handleCellClick(p, 'name')}
                      className="p-2.5 font-sans font-bold text-slate-100 border-r border-slate-800/80 cursor-pointer hover:bg-blue-950/40 hover:text-sky-300 transition"
                    >
                      {editingCell?.productId === p.id && editingCell.field === 'name' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(p)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(p)}
                          className="w-full bg-blue-950 border border-blue-500 text-white text-xs px-2 py-0.5 rounded focus:outline-none"
                        />
                      ) : (
                        <span>{p.name}</span>
                      )}
                    </td>

                    {/* Col C: Category (Editable) */}
                    <td
                      onClick={() => handleCellClick(p, 'category')}
                      className="p-2.5 text-sky-400 border-r border-slate-800/80 cursor-pointer hover:bg-blue-950/40 transition text-[11px]"
                    >
                      {editingCell?.productId === p.id && editingCell.field === 'category' ? (
                        <select
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(p)}
                          className="w-full bg-blue-950 border border-blue-500 text-white text-xs px-1 py-0.5 rounded focus:outline-none"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{p.category}</span>
                      )}
                    </td>

                    {/* Col D: Size / Specs (Editable) */}
                    <td
                      onClick={() => handleCellClick(p, 'sizeCapacity')}
                      className="p-2.5 text-slate-300 border-r border-slate-800/80 cursor-pointer hover:bg-blue-950/40 transition text-[11px]"
                    >
                      {editingCell?.productId === p.id && editingCell.field === 'sizeCapacity' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(p)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(p)}
                          className="w-full bg-blue-950 border border-blue-500 text-white text-xs px-2 py-0.5 rounded focus:outline-none"
                        />
                      ) : (
                        <span>{p.sizeCapacity || '-'}</span>
                      )}
                    </td>

                    {/* Col E: SKU (Editable) */}
                    <td
                      onClick={() => handleCellClick(p, 'sku')}
                      className="p-2.5 text-slate-400 border-r border-slate-800/80 cursor-pointer hover:bg-blue-950/40 transition text-[11px]"
                    >
                      {editingCell?.productId === p.id && editingCell.field === 'sku' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(p)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(p)}
                          className="w-full bg-blue-950 border border-blue-500 text-white text-xs px-2 py-0.5 rounded focus:outline-none font-mono"
                        />
                      ) : (
                        <span>{p.sku}</span>
                      )}
                    </td>

                    {/* Col F: Barcode (Editable) */}
                    <td
                      onClick={() => handleCellClick(p, 'barcode')}
                      className="p-2.5 text-slate-300 border-r border-slate-800/80 cursor-pointer hover:bg-blue-950/40 transition text-[11px]"
                    >
                      {editingCell?.productId === p.id && editingCell.field === 'barcode' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(p)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(p)}
                          className="w-full bg-blue-950 border border-blue-500 text-white text-xs px-2 py-0.5 rounded focus:outline-none font-mono"
                        />
                      ) : (
                        <span>{p.barcode}</span>
                      )}
                    </td>

                    {/* Col G: Cost Price (Editable) */}
                    <td
                      onClick={() => handleCellClick(p, 'costPrice')}
                      className="p-2.5 text-right text-slate-400 border-r border-slate-800/80 cursor-pointer hover:bg-blue-950/40 transition"
                    >
                      {editingCell?.productId === p.id && editingCell.field === 'costPrice' ? (
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(p)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(p)}
                          className="w-full bg-blue-950 border border-blue-500 text-white text-xs px-2 py-0.5 rounded focus:outline-none text-right font-mono"
                        />
                      ) : (
                        <span>{p.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      )}
                    </td>

                    {/* Col H: Selling Price (Editable) */}
                    <td
                      onClick={() => handleCellClick(p, 'sellingPrice')}
                      className="p-2.5 text-right font-bold text-emerald-400 border-r border-slate-800/80 cursor-pointer hover:bg-blue-950/40 transition"
                    >
                      {editingCell?.productId === p.id && editingCell.field === 'sellingPrice' ? (
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(p)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(p)}
                          className="w-full bg-blue-950 border border-blue-500 text-white text-xs px-2 py-0.5 rounded focus:outline-none text-right font-mono"
                        />
                      ) : (
                        <span>{p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      )}
                    </td>

                    {/* Col I: Margin % (Color-Coded Badge) */}
                    <td className="p-2.5 text-right font-bold border-r border-slate-800/80 text-[11px]">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${marginInfo.badgeBg} ${marginInfo.badgeText} ${marginInfo.badgeBorder}`}
                        title={`${marginInfo.label}: Margin ${marginInfo.marginPercent.toFixed(1)}% (KSh ${marginInfo.profitAmount.toFixed(2)} unit profit)`}
                      >
                        {marginInfo.marginPercent.toFixed(0)}%
                      </span>
                    </td>

                    {/* Col J: Stock Quantity (Editable) */}
                    <td
                      onClick={() => handleCellClick(p, 'stockQuantity')}
                      className="p-2.5 text-center font-bold text-white border-r border-slate-800/80 cursor-pointer hover:bg-blue-950/40 transition"
                    >
                      {editingCell?.productId === p.id && editingCell.field === 'stockQuantity' ? (
                        <input
                          type="number"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(p)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(p)}
                          className="w-full bg-blue-950 border border-blue-500 text-white text-xs px-2 py-0.5 rounded focus:outline-none text-center font-mono"
                        />
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] ${
                            p.stockQuantity <= p.minStockAlert
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {p.stockQuantity} {p.unit}
                        </span>
                      )}
                    </td>

                    {/* Col K: Stock Value (Auto Formula) */}
                    <td className="p-2.5 text-right font-bold text-sky-400 border-r border-slate-800/80">
                      KSh {stockVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Col L: Velocity & Profit Tier */}
                    <td className="p-2 text-center border-r border-slate-800/80">
                      {perf && perf.tier !== 'unranked_no_sales' ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border shadow-sm ${perf.badgeBg} ${perf.badgeText} ${perf.badgeBorder}`}
                          title={`${perf.tierLabel}: ${perf.unitsSold} sold • KSh ${perf.totalProfit.toLocaleString()} profit`}
                        >
                          {perf.tier === 'high_sales_high_profit' && <Star className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400 shrink-0" />}
                          {perf.tier === 'low_sales_low_profit' && <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                          {perf.tier === 'high_sales_low_profit' && <Zap className="w-2.5 h-2.5 text-sky-400 shrink-0" />}
                          {perf.tier === 'low_sales_high_profit' && <Gem className="w-2.5 h-2.5 text-purple-400 shrink-0" />}
                          <span>{perf.tierShortLabel}</span>
                          <span className="opacity-80">({perf.unitsSold})</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">0 sold</span>
                      )}
                    </td>

                    {/* Col M: Restock & Sales History */}
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => onViewProductHistory && onViewProductHistory(p)}
                        className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 shadow-sm"
                        title="View Restock & Sales Audit Log for this product"
                      >
                        <History className="w-3 h-3 text-indigo-400" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* EXCEL STATS FORMULA BAR AT BOTTOM */}
        <div className="bg-slate-950 p-3 px-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rows: <strong className="text-white">{totalItemsCount}</strong></span>
            </span>

            <span className="flex items-center gap-1 text-slate-400">
              <span>SUM(Qty): <strong className="text-white">{totalStockQuantity.toLocaleString()}</strong></span>
            </span>

            <span className="flex items-center gap-1 text-slate-400">
              <span>AVG(Margin): <strong className="text-emerald-400">{avgMargin}%</strong></span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400">
              Total Catalog Value: <strong className="text-sky-400 text-sm">KSh {totalCatalogValue.toLocaleString()}</strong>
            </span>
            <span className="text-slate-400">
              Est. Profit: <strong className="text-emerald-400 text-sm">KSh {totalPotentialProfit.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* AI IMAGE GENERATOR MODAL */}
      <ImageGeneratorModal
        isOpen={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setSelectedProductForImage(null);
        }}
        product={selectedProductForImage}
        allProducts={products}
        onApplyImage={(prodId, imgUrl) => {
          const target = products.find((p) => p.id === prodId);
          if (target) {
            onSaveProduct({ ...target, imageUrl: imgUrl });
          }
        }}
        onBulkApplyImages={handleBulkImagesApplied}
      />
    </div>
  );
};
