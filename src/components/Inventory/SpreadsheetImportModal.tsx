import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Clipboard,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Product, Supplier } from '../../types';
import { generateAutoBarcode } from '../../utils/barcode';

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  categories: any[];
  onImportProducts: (newProducts: Product[], replaceExisting: boolean) => void;
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  categories,
  onImportProducts,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [parsedProducts, setParsedProducts] = useState<Product[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewSearch, setPreviewSearch] = useState('');

  if (!isOpen) return null;

  // Helper to parse raw CSV or Tab-separated text from Excel/Google Sheets
  const parseSpreadsheetData = (text: string) => {
    setErrorMessage(null);
    if (!text.trim()) {
      setParsedProducts([]);
      return;
    }

    try {
      // Split into non-empty lines
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        setErrorMessage('The input appears to be empty.');
        return;
      }

      // Determine delimiter (Tab, Comma, or Semicolon)
      const firstLine = lines[0];
      let delimiter = ',';
      if (firstLine.includes('\t')) {
        delimiter = '\t';
      } else if (firstLine.includes(';') && !firstLine.includes(',')) {
        delimiter = ';';
      }

      // Helper function to split row respecting quotes
      const splitRow = (rowStr: string): string[] => {
        if (delimiter === '\t') {
          return rowStr.split('\t').map((cell) => cell.replace(/^"|"$/g, '').trim());
        }

        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < rowStr.length; i++) {
          const char = rowStr[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            result.push(cur.replace(/^"|"$/g, '').trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.replace(/^"|"$/g, '').trim());
        return result;
      };

      const headerRow = splitRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      // Determine if line 0 is header or data
      const hasHeaderName = headerRow.some((h) =>
        ['name', 'product', 'item', 'sku', 'price', 'cost', 'category', 'stock', 'quantity'].includes(h)
      );

      const startIndex = hasHeaderName ? 1 : 0;
      const dataLines = lines.slice(startIndex);

      // Default Category & Supplier
      const defaultCat = categories[0]?.name || 'General';
      const defaultSupplierId = suppliers[0]?.id || 'sup-1';
      const defaultSupplierName = suppliers[0]?.name || 'Direct Wholesale';

      // Header column indexes mapping
      const nameIdx = headerRow.findIndex((h) => ['name', 'productname', 'product', 'item', 'title', 'description'].includes(h));
      const categoryIdx = headerRow.findIndex((h) => ['category', 'cat', 'group', 'department'].includes(h));
      const subcategoryIdx = headerRow.findIndex((h) => ['subcategory', 'subcat'].includes(h));
      const sizeIdx = headerRow.findIndex((h) => ['sizecapacity', 'size', 'capacity', 'spec'].includes(h));
      const skuIdx = headerRow.findIndex((h) => ['sku', 'code', 'itemcode', 'productcode'].includes(h));
      const barcodeIdx = headerRow.findIndex((h) => ['barcode', 'upc', 'ean', 'qr'].includes(h));
      const costPriceIdx = headerRow.findIndex((h) => ['costprice', 'cost', 'buyingprice', 'purchaseprice'].includes(h));
      const sellingPriceIdx = headerRow.findIndex((h) => ['sellingprice', 'price', 'retailprice', 'srp'].includes(h));
      const stockIdx = headerRow.findIndex((h) => ['stockquantity', 'stock', 'qty', 'quantity', 'count', 'inventory'].includes(h));
      const minStockIdx = headerRow.findIndex((h) => ['minstockalert', 'minstock', 'alertlevel'].includes(h));
      const unitIdx = headerRow.findIndex((h) => ['unit', 'uom'].includes(h));
      const supplierIdx = headerRow.findIndex((h) => ['supplier', 'suppliername', 'vendor'].includes(h));

      const parsed: Product[] = [];
      const now = new Date().toISOString().slice(0, 10);

      dataLines.forEach((line, index) => {
        const cells = splitRow(line);
        if (cells.length === 0 || cells.every((c) => !c)) return;

        // Parse cells with fallbacks
        const nameVal = (nameIdx >= 0 ? cells[nameIdx] : cells[0]) || `Imported Item #${index + 1}`;
        const catVal = (categoryIdx >= 0 ? cells[categoryIdx] : cells[1]) || defaultCat;
        const subVal = subcategoryIdx >= 0 ? cells[subcategoryIdx] : '';
        const sizeVal = sizeIdx >= 0 ? cells[sizeIdx] : '';
        const skuVal = (skuIdx >= 0 ? cells[skuIdx] : '') || `SKU-${Math.floor(100000 + Math.random() * 900000)}`;
        const barcodeVal = (barcodeIdx >= 0 ? cells[barcodeIdx] : '') || generateAutoBarcode();

        const parseNum = (valStr: string | undefined, defaultVal: number): number => {
          if (!valStr) return defaultVal;
          const cleaned = valStr.replace(/[^0-9.-]/g, '');
          const parsedNum = parseFloat(cleaned);
          return isNaN(parsedNum) ? defaultVal : parsedNum;
        };

        const costVal = parseNum(costPriceIdx >= 0 ? cells[costPriceIdx] : cells[2], 0);
        const sellingVal = parseNum(sellingPriceIdx >= 0 ? cells[sellingPriceIdx] : cells[3], costVal > 0 ? costVal * 1.25 : 100);
        const stockVal = parseNum(stockIdx >= 0 ? cells[stockIdx] : cells[4], 10);
        const minStockVal = parseNum(minStockIdx >= 0 ? cells[minStockIdx] : undefined, 5);
        const unitVal = (unitIdx >= 0 ? cells[unitIdx] : '') || 'pcs';
        const suppVal = (supplierIdx >= 0 ? cells[supplierIdx] : '') || defaultSupplierName;

        parsed.push({
          id: `prod-imp-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          name: nameVal,
          sku: skuVal,
          barcode: barcodeVal,
          category: catVal,
          subcategory: subVal,
          sizeCapacity: sizeVal,
          description: `Imported via Spreadsheet on ${now}`,
          costPrice: costVal,
          sellingPrice: sellingVal,
          stockQuantity: stockVal,
          minStockAlert: minStockVal,
          unit: unitVal,
          supplierId: defaultSupplierId,
          supplierName: suppVal,
          createdAt: now,
          updatedAt: now,
        });
      });

      if (parsed.length === 0) {
        setErrorMessage('Could not extract valid product rows from input.');
      } else {
        setParsedProducts(parsed);
      }
    } catch (err) {
      setErrorMessage('Failed to parse sheet data. Please check CSV format.');
    }
  };

  // Handle File Select
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      parseSpreadsheetData(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle Textarea Change
  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    parseSpreadsheetData(text);
  };

  // Download Sample CSV
  const handleDownloadSampleCSV = () => {
    const sampleHeader = 'Name,Category,Subcategory,SizeCapacity,SKU,Barcode,CostPrice,SellingPrice,StockQuantity,Unit,SupplierName\n';
    const sampleRows = [
      'Samsung Galaxy A15 128GB,Phones & Tablets,Smartphones,128GB/4GB,SKU-A15-128,789100100101,18500,22500,25,pcs,Samsung East Africa',
      'HP Laptop 15 Core i5 8GB 512GB,Computers & Accessories,Laptops,15.6 Inch,SKU-HP15-I5,789100100102,52000,64000,12,pcs,Direct Wholesale',
      'Anker PowerBank 20000mAh,Accessories,Powerbanks,20000mAh,SKU-ANK-20K,789100100103,3200,4500,40,pcs,Accessories Hub',
      'Sony Wireless Headphones WH-1000XM5,Audio & Sound,Headphones,Black,SKU-SONY-XM5,789100100104,38000,46000,8,pcs,Sony Kenya',
      'Smart Watch Series 8 Ultra,Wearables,Smartwatches,49mm Titanium,SKU-SW-SER8,789100100105,6500,9500,30,pcs,Gadgets Depot'
    ].join('\n');

    const blob = new Blob([sampleHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_300_products_sheet.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Final Import Confirmation
  const handleConfirmImport = () => {
    if (parsedProducts.length === 0) return;
    onImportProducts(parsedProducts, replaceExisting);
    onClose();
  };

  const filteredPreview = parsedProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(previewSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(previewSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(previewSearch.toLowerCase()) ||
      p.barcode.toLowerCase().includes(previewSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[1050] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                <span>Spreadsheet & Bulk Product Importer</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2 py-0.5 rounded-full font-mono">
                  300+ Items Fast
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Import product catalog easily from Excel, Google Sheets, or CSV file.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Options Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'upload'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload CSV / Sheet File</span>
              </button>

              <button
                onClick={() => setActiveTab('paste')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'paste'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clipboard className="w-4 h-4" />
                <span>Copy & Paste Sheet Rows</span>
              </button>
            </div>

            {/* Download Template Button */}
            <button
              onClick={handleDownloadSampleCSV}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-3.5 py-2 rounded-xl text-xs transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Sample CSV Template</span>
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/60 bg-slate-950/50 rounded-2xl p-8 text-center transition space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-200">Select or Drag CSV / Sheet File</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Supports .csv, .tsv, .txt files with 300+ item rows
                </p>
              </div>

              <label className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-lg shadow-blue-600/20 transition">
                Browse CSV File
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Tab 2: Copy & Paste Sheet */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Paste rows directly from Google Sheets or Excel (Ctrl+C then Ctrl+V):
                </label>
                {rawText && (
                  <button
                    onClick={() => {
                      setRawText('');
                      setParsedProducts([]);
                    }}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Clear Text
                  </button>
                )}
              </div>

              <textarea
                rows={6}
                value={rawText}
                onChange={handlePasteChange}
                placeholder={`Example Sheet Format (Tab or Comma Separated):

Name\tCategory\tSubcategory\tSize\tSKU\tBarcode\tCostPrice\tSellingPrice\tStockQuantity\tUnit
Samsung Galaxy A15\tPhones\tSmartphones\t128GB\tSKU-A15\t78910001\t18500\t22500\t25\tpcs
HP Laptop Core i5\tComputers\tLaptops\t15 Inch\tSKU-HP15\t78910002\t52000\t64000\t12\tpcs`}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono p-3.5 rounded-2xl focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-3.5 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Items Preview Table */}
          {parsedProducts.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm text-slate-100">
                    {parsedProducts.length} Items Parsed & Ready to Import
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Filter preview items..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="w-full sm:w-64 bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Table Preview List */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5">Category & Size</th>
                      <th className="p-2.5">SKU & Barcode</th>
                      <th className="p-2.5 text-right">Cost Price</th>
                      <th className="p-2.5 text-right">Selling Price</th>
                      <th className="p-2.5 text-center">Stock Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50 font-mono">
                    {filteredPreview.map((p, i) => (
                      <tr key={p.id} className="hover:bg-slate-800/50">
                        <td className="p-2.5 text-slate-500 text-[11px]">{i + 1}</td>
                        <td className="p-2.5 font-sans font-semibold text-slate-100">{p.name}</td>
                        <td className="p-2.5 font-sans text-sky-400 text-[11px]">
                          {p.category} {p.sizeCapacity ? `(${p.sizeCapacity})` : ''}
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-400">
                          {p.sku} | <span className="text-slate-300">{p.barcode}</span>
                        </td>
                        <td className="p-2.5 text-right text-slate-400">
                          KSh {p.costPrice.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-emerald-400 font-bold">
                          KSh {p.sellingPrice.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-200">
                          {p.stockQuantity} {p.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import Strategy Option */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                  />
                  <span>Replace current catalog entirely with these {parsedProducts.length} items</span>
                </label>

                <span className="text-[11px] text-slate-500">
                  {replaceExisting ? 'Will replace existing products' : 'Will append to existing products'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsedProducts.length === 0}
            onClick={handleConfirmImport}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <span>Import All {parsedProducts.length} Products Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
