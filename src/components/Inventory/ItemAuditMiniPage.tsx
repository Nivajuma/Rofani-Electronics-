import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Package,
  History,
  TrendingUp,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  ShoppingBag,
  Printer,
  Share2,
  Copy,
  Check,
  RotateCcw,
  Edit3,
  QrCode,
  Truck,
  Building2,
  ShieldCheck,
  Eye,
  X,
  DollarSign
} from 'lucide-react';
import { Product, RestockRecord, Transaction, User } from '../../types';
import { formatKSh } from '../../utils/currency';
import { calculateProfitMargin } from '../../utils/margin';
import { ProductQrCodeModal } from './ProductQrCodeModal';
import QRCode from 'qrcode';

interface ItemAuditMiniPageProps {
  product: Product;
  restockRecords: RestockRecord[];
  transactions: Transaction[];
  storeName?: string;
  currentUser?: User;
  onBack: () => void;
  onAddRestock?: (
    productId: string,
    quantityAdded: number,
    unitCost: number,
    supplierName: string,
    batchNo: string,
    notes: string
  ) => void;
  onAdjustStockQuantity?: (productId: string, newQuantity: number, reason: string) => void;
}

export const ItemAuditMiniPage: React.FC<ItemAuditMiniPageProps> = ({
  product,
  restockRecords,
  transactions,
  storeName = 'Rofani Electronics',
  currentUser,
  onBack,
  onAddRestock,
  onAdjustStockQuantity,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'history'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQuickRestockForm, setShowQuickRestockForm] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [newPhysicalCount, setNewPhysicalCount] = useState<string>(product.stockQuantity.toString());
  const [adjustReason, setAdjustReason] = useState<string>('Physical stock audit count');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Quick Restock form states
  const [restockQty, setRestockQty] = useState<string>('10');
  const [restockCost, setRestockCost] = useState<string>(product.costPrice.toString());
  const [restockSupplier, setRestockSupplier] = useState<string>(product.supplierName || 'General Supplier');
  const [restockBatch, setRestockBatch] = useState<string>(`BATCH-${Math.floor(1000 + Math.random() * 9000)}`);
  const [restockNotes, setRestockNotes] = useState<string>('Manager shelf audit restock');
  const [restockSuccessMsg, setRestockSuccessMsg] = useState<string | null>(null);

  // Filter restock records specifically for this product
  const productBatches = useMemo(() => {
    return restockRecords
      .filter((r) => r.productId === product.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [restockRecords, product.id]);

  // Filter sales transactions specifically for this product
  const productSales = useMemo(() => {
    return transactions
      .flatMap((tx) =>
        tx.items
          .filter((it) => it.product.id === product.id)
          .map((it) => ({
            transactionId: tx.id,
            receiptNumber: tx.receiptNumber,
            date: tx.date,
            customerName: tx.customerName || 'Walk-in Customer',
            cashierName: tx.cashierName,
            quantitySold: it.quantity,
            unitSellingPrice: it.unitPrice,
            unitCostPrice: it.product.costPrice || product.costPrice,
            totalRevenue: it.total,
            totalProfit: it.total - (it.product.costPrice || product.costPrice) * it.quantity,
          }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, product.id, product.costPrice]);

  // Aggregate stats
  const totalUnitsSold = useMemo(() => productSales.reduce((sum, s) => sum + s.quantitySold, 0), [productSales]);
  const totalSalesRevenue = useMemo(() => productSales.reduce((sum, s) => sum + s.totalRevenue, 0), [productSales]);
  const totalSalesProfit = useMemo(() => productSales.reduce((sum, s) => sum + s.totalProfit, 0), [productSales]);
  const totalRestockedUnits = useMemo(() => productBatches.reduce((sum, b) => sum + b.quantityAdded, 0), [productBatches]);
  const totalRestockedInvestment = useMemo(() => productBatches.reduce((sum, b) => sum + b.totalCost, 0), [productBatches]);

  const marginInfo = calculateProfitMargin(product.costPrice, product.sellingPrice);
  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = product.stockQuantity <= product.minStockAlert && !isOutOfStock;

  // Direct audit URL
  const auditUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      const base = `${window.location.origin}${window.location.pathname}`;
      return `${base}?itemAudit=${encodeURIComponent(product.id)}`;
    }
    return `?itemAudit=${encodeURIComponent(product.id)}`;
  }, [product.id]);

  // Generate QR code for this audit page
  React.useEffect(() => {
    QRCode.toDataURL(auditUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR code gen error:', err));
  }, [auditUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(auditUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*STOCK AUDIT REPORT - ${storeName}*\n` +
      `Item: *${product.name}*\n` +
      `SKU: ${product.sku} | Barcode: ${product.barcode}\n` +
      `Current Stock: *${product.stockQuantity} ${product.unit}* (${isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK ALERT' : 'IN STOCK'})\n` +
      `Price: ${formatKSh(product.sellingPrice)} (Cost: ${formatKSh(product.costPrice)})\n` +
      `Total Sold: ${totalUnitsSold} ${product.unit} | Batches Restocked: ${productBatches.length}\n` +
      `Direct Audit Link: ${auditUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handlePrintTag = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shelf Tag - ${product.name}</title>
          <style>
            @page { size: auto; margin: 6mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; color: #000; text-align: center; }
            .tag { border: 2px dashed #000; border-radius: 8px; padding: 12px; max-width: 280px; margin: 0 auto; }
            .store { font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; color: #333; }
            .name { font-size: 15px; font-weight: 900; line-height: 1.2; margin: 6px 0; }
            .sku { font-size: 11px; font-family: monospace; color: #555; }
            .price { font-size: 20px; font-weight: 900; color: #000; margin: 8px 0; }
            .stock { font-size: 11px; font-weight: 700; background: #eee; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }
            .qr { width: 140px; height: 140px; margin: 0 auto 6px; display: block; }
            .hint { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #444; }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="store">${storeName}</div>
            <div class="name">${product.name}</div>
            <div class="sku">SKU: ${product.sku}</div>
            <div class="price">${formatKSh(product.sellingPrice, { showDecimals: true })}</div>
            <div class="stock">Current Stock: ${product.stockQuantity} ${product.unit}</div>
            ${qrDataUrl ? `<img src="${qrDataUrl}" class="qr" alt="QR" />` : ''}
            <div class="hint">Scan to view stock history & restock batches</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSaveRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(restockQty, 10);
    const cost = parseFloat(restockCost);
    if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) return;

    if (onAddRestock) {
      onAddRestock(
        product.id,
        qty,
        cost,
        restockSupplier.trim() || product.supplierName || 'General Supplier',
        restockBatch.trim() || `BATCH-${Date.now().toString().slice(-6)}`,
        restockNotes.trim()
      );
      setRestockSuccessMsg(`Successfully restocked +${qty} ${product.unit} under ${restockBatch}!`);
      setTimeout(() => setRestockSuccessMsg(null), 4000);
      setShowQuickRestockForm(false);
      setRestockBatch(`BATCH-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  const handleSavePhysicalAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(newPhysicalCount, 10);
    if (isNaN(parsed) || parsed < 0) return;

    if (onAdjustStockQuantity) {
      onAdjustStockQuantity(product.id, parsed, adjustReason.trim() || 'Physical stock audit adjustment');
      setShowAdjustStockModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Mobile-First App Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Return to Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white truncate">{storeName}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                Manager Audit Terminal
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              Single Item Stock & Restock History Audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowQrModal(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl transition cursor-pointer"
            title="View Shelf QR Tag"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrintTag}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl transition cursor-pointer"
            title="Print Shelf Tag"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/20"
            title="Share Audit via WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Success Alert Banner */}
        {restockSuccessMsg && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{restockSuccessMsg}</span>
          </div>
        )}

        {/* Hero Item Overview Card */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Product Photo */}
            <div className="relative shrink-0 mx-auto sm:mx-0">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-slate-700 shadow-md"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-sky-900 to-indigo-900 border border-sky-800/60 flex items-center justify-center text-sky-400 shadow-md">
                  <Package className="w-12 h-12" />
                </div>
              )}
              {isOutOfStock ? (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow">
                  OUT
                </span>
              ) : isLowStock ? (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 shadow">
                  LOW
                </span>
              ) : null}
            </div>

            {/* Product Meta */}
            <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
              <div>
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                  {product.category} {product.subcategory ? `• ${product.subcategory}` : ''}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {product.name}
                </h1>
                {product.sizeCapacity && (
                  <span className="inline-block text-xs font-mono text-slate-400 mt-0.5">
                    Variant / Size: {product.sizeCapacity}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 font-mono text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                  SKU: <strong className="text-white">{product.sku}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                  Barcode: <strong className="text-sky-300">{product.barcode}</strong>
                </span>
                {product.supplierName && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[140px]">{product.supplierName}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Price & Margins Pill */}
            <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl sm:text-right shrink-0 w-full sm:w-auto">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Retail Selling Price</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {formatKSh(product.sellingPrice, { showDecimals: true })}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                Unit Cost: <strong className="text-slate-200">{formatKSh(product.costPrice, { showDecimals: true })}</strong>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                <TrendingUp className="w-3 h-3" />
                <span>{marginInfo.marginPercent.toFixed(1)}% Margin ({formatKSh(marginInfo.profitAmount)} profit)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Current Stock Level Status Card (Prominently Highlighted) */}
        <section className={`p-5 rounded-3xl border shadow-xl relative overflow-hidden ${
          isOutOfStock
            ? 'bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 border-rose-500/40 ring-1 ring-rose-500/30'
            : isLowStock
            ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border-amber-500/40 ring-1 ring-amber-500/30'
            : 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40 ring-1 ring-emerald-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Current Verified Stock Level
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                  isOutOfStock
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : isLowStock
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isOutOfStock ? (
                    <>
                      <AlertTriangle className="w-3 h-3" /> Out of Stock
                    </>
                  ) : isLowStock ? (
                    <>
                      <AlertTriangle className="w-3 h-3" /> Low Stock Warning
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> In Stock & Ready
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                  {product.stockQuantity}
                </span>
                <span className="text-lg font-bold text-slate-400 font-mono">
                  {product.unit} on shelf
                </span>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-3 pt-1">
                <span>Minimum Alert Threshold: <strong className="text-slate-200 font-mono">{product.minStockAlert} {product.unit}</strong></span>
                <span>•</span>
                <span>Shelf Valuation: <strong className="text-sky-300 font-mono">{formatKSh(product.stockQuantity * product.costPrice)}</strong> (at cost)</span>
              </div>
            </div>

            {/* Quick Manager Stock Adjust Button */}
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNewPhysicalCount(product.stockQuantity.toString());
                  setShowAdjustStockModal(true);
                }}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Adjust Physical Count</span>
              </button>

              {onAddRestock && (
                <button
                  type="button"
                  onClick={() => setShowQuickRestockForm(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Receive Restock Batch</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Tab Switcher: Overview / Restock Batches / Sales Movement */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Audit Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('batches')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'batches'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Recent Restock Batches ({productBatches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Movement & Sales ({productSales.length})</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & KEY METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* 4 KPI Grid Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Lifetime Units Sold</span>
                  <ShoppingBag className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-black text-slate-100 font-mono mt-1">
                  {totalUnitsSold.toLocaleString()} {product.unit}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">Across customer receipts</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Gross Sales Revenue</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  {formatKSh(totalSalesRevenue)}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">Total retail turnover</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Gross Profit Earned</span>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                  {formatKSh(totalSalesProfit)}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">{marginInfo.marginPercent.toFixed(0)}% margin realized</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Total Batches Restocked</span>
                  <Truck className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-purple-300 font-mono mt-1">
                  {totalRestockedUnits} {product.unit}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">{productBatches.length} supply shipments</span>
              </div>
            </div>

            {/* Quick Preview of Latest Restock Batch & Latest Sale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Latest Restock Batch */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    <span>Latest Restock Batch</span>
                  </h3>
                  {productBatches.length > 0 && (
                    <button
                      onClick={() => setActiveTab('batches')}
                      className="text-[11px] font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
                    >
                      View All ({productBatches.length})
                    </button>
                  )}
                </div>

                {productBatches.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                    No restock batches recorded yet for this item.
                  </div>
                ) : (
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-emerald-400">
                        {productBatches[0].batchNo || 'BATCH-STD'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(productBatches[0].date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Quantity Added:</span>
                      <strong className="text-white font-mono">+{productBatches[0].quantityAdded} {product.unit}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Supplier:</span>
                      <span className="text-slate-200">{productBatches[0].supplierName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-1.5">
                      <span className="text-slate-400">Batch Investment:</span>
                      <span className="font-mono font-bold text-slate-100">{formatKSh(productBatches[0].totalCost)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Latest Customer Sale */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-sky-400" />
                    <span>Latest Customer Purchase</span>
                  </h3>
                  {productSales.length > 0 && (
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-[11px] font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
                    >
                      View All ({productSales.length})
                    </button>
                  )}
                </div>

                {productSales.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                    No customer sales recorded yet for this item.
                  </div>
                ) : (
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-sky-400">
                        #{productSales[0].receiptNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(productSales[0].date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Customer:</span>
                      <span className="text-white font-medium">{productSales[0].customerName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Units Purchased:</span>
                      <strong className="text-white font-mono">{productSales[0].quantitySold} {product.unit}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-1.5">
                      <span className="text-slate-400">Sale Total:</span>
                      <span className="font-mono font-bold text-emerald-400">{formatKSh(productSales[0].totalRevenue)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RECENT RESTOCK BATCHES (Specifically Requested) */}
        {activeTab === 'batches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-white">Recent Restock Batches</h3>
                <p className="text-xs text-slate-400">
                  Audit trail of all supplier shipments, incoming quantities, and costs for {product.name}
                </p>
              </div>
              {onAddRestock && (
                <button
                  type="button"
                  onClick={() => setShowQuickRestockForm(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Receive Batch</span>
                </button>
              )}
            </div>

            {productBatches.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                <Truck className="w-12 h-12 mx-auto text-slate-600" />
                <h4 className="font-bold text-slate-200">No restock batches recorded</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No shipments have been logged for this product. Use the button below to record the first restock batch.
                </p>
                {onAddRestock && (
                  <button
                    type="button"
                    onClick={() => setShowQuickRestockForm(true)}
                    className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Log First Restock Batch
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Batch #</th>
                        <th className="p-3.5">Date & Time</th>
                        <th className="p-3.5">Supplier</th>
                        <th className="p-3.5 text-right">Qty Received</th>
                        <th className="p-3.5 text-right">Unit Cost</th>
                        <th className="p-3.5 text-right">Total Batch Cost</th>
                        <th className="p-3.5">Received By</th>
                        <th className="p-3.5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {productBatches.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-mono font-bold text-emerald-400">
                            {b.batchNo || 'BATCH-STD'}
                          </td>
                          <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap">
                            {new Date(b.date).toLocaleDateString()} {new Date(b.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3.5 font-medium text-slate-200">
                            {b.supplierName || 'General Supplier'}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-white text-sm">
                            +{b.quantityAdded} {product.unit}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-300">
                            {formatKSh(b.unitCost, { showDecimals: true })}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-300">
                            {formatKSh(b.totalCost, { showDecimals: true })}
                          </td>
                          <td className="p-3.5 text-slate-400 text-[11px]">
                            {b.receivedBy}
                          </td>
                          <td className="p-3.5 text-slate-400 text-[11px] max-w-xs truncate">
                            {b.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Total Batches: <strong>{productBatches.length}</strong></span>
                  <span>Total Restocked Quantity: <strong className="text-emerald-400">+{totalRestockedUnits} {product.unit}</strong></span>
                  <span>Total Restock Value: <strong className="text-white">{formatKSh(totalRestockedInvestment)}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MOVEMENT & SALES HISTORY (Specifically Requested) */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-base text-white">Item Sales & Movement History</h3>
              <p className="text-xs text-slate-400">
                Customer purchases and sales velocity transactions for {product.name}
              </p>
            </div>

            {productSales.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-600" />
                <h4 className="font-bold text-slate-200">No sales transactions logged yet</h4>
                <p className="text-xs text-slate-500">
                  This item has not yet been sold in any customer transaction.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Receipt #</th>
                        <th className="p-3.5">Date & Time</th>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Cashier</th>
                        <th className="p-3.5 text-right">Quantity Sold</th>
                        <th className="p-3.5 text-right">Unit Price</th>
                        <th className="p-3.5 text-right">Total Revenue</th>
                        <th className="p-3.5 text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {productSales.map((s, idx) => (
                        <tr key={`${s.transactionId}-${idx}`} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-mono font-bold text-sky-400">
                            #{s.receiptNumber}
                          </td>
                          <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap">
                            {new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3.5 text-slate-200 font-medium">
                            {s.customerName}
                          </td>
                          <td className="p-3.5 text-slate-400 text-[11px]">
                            {s.cashierName}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-white text-sm">
                            {s.quantitySold} {product.unit}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-300">
                            {formatKSh(s.unitSellingPrice, { showDecimals: true })}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-300">
                            {formatKSh(s.totalRevenue, { showDecimals: true })}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-amber-300">
                            {formatKSh(s.totalProfit, { showDecimals: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Total Sales Recorded: <strong>{productSales.length}</strong></span>
                  <span>Units Sold: <strong className="text-sky-400">{totalUnitsSold} {product.unit}</strong></span>
                  <span>Total Revenue: <strong className="text-emerald-400">{formatKSh(totalSalesRevenue)}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: QUICK RESTOCK BATCH */}
      {showQuickRestockForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Truck className="w-5 h-5" />
                <h3 className="text-sm font-black text-white">Receive Restock Batch</h3>
              </div>
              <button
                onClick={() => setShowQuickRestockForm(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="space-y-3.5">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Quantity Received ({product.unit}) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Unit Cost Price (KSh) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={restockCost}
                    onChange={(e) => setRestockCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={restockBatch}
                    onChange={(e) => setRestockBatch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Supplier / Vendor Name
                </label>
                <input
                  type="text"
                  value={restockSupplier}
                  onChange={(e) => setRestockSupplier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Audit Notes / Shipment Remarks
                </label>
                <textarea
                  rows={2}
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs outline-none resize-none"
                  placeholder="e.g. Received directly by manager; intact carton seal"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
                <span className="text-slate-400">Total Batch Investment:</span>
                <strong className="text-emerald-400 text-sm">
                  {formatKSh((parseInt(restockQty, 10) || 0) * (parseFloat(restockCost) || 0))}
                </strong>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickRestockForm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Save Restock Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PHYSICAL STOCK COUNT ADJUSTMENT */}
      {showAdjustStockModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="text-sm font-black text-white">Adjust Physical Shelf Stock</h3>
              </div>
              <button
                onClick={() => setShowAdjustStockModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400 leading-relaxed">
              If the physical count of <strong>{product.name}</strong> on the shelf differs from the system inventory ({product.stockQuantity} {product.unit}), enter the verified count below to reconcile.
            </p>

            <form onSubmit={handleSavePhysicalAdjust} className="space-y-3.5">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Actual Physical Count ({product.unit}) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={newPhysicalCount}
                  onChange={(e) => setNewPhysicalCount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono font-bold text-base outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Audit Reason / Discrepancy Note
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white text-xs outline-none"
                  placeholder="e.g. Physical stocktake recount; shelf shrinkage adjustment"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
                <span className="text-slate-400">Variance:</span>
                <strong className={`text-sm ${
                  (parseInt(newPhysicalCount, 10) || 0) - product.stockQuantity > 0
                    ? 'text-emerald-400'
                    : (parseInt(newPhysicalCount, 10) || 0) - product.stockQuantity < 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}>
                  {(parseInt(newPhysicalCount, 10) || 0) - product.stockQuantity >= 0 ? '+' : ''}
                  {(parseInt(newPhysicalCount, 10) || 0) - product.stockQuantity} {product.unit}
                </strong>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustStockModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Update Stock Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE DISPLAY & HIGH-RES PNG EXPORT */}
      {showQrModal && (
        <ProductQrCodeModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          product={product}
          storeName={storeName}
          onOpenMiniPage={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
