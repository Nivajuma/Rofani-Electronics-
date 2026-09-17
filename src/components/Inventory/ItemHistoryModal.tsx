import React, { useState } from 'react';
import {
  X,
  History,
  TrendingUp,
  Package,
  PlusCircle,
  Clock,
  DollarSign,
  UserCheck,
  Calendar,
  Layers,
  Check,
  Tag,
  ShoppingBag
} from 'lucide-react';
import { Product, RestockRecord, Transaction, Supplier, User } from '../../types';
import { calculateProfitMargin } from '../../utils/margin';

interface ItemHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  restockRecords: RestockRecord[];
  transactions: Transaction[];
  suppliers: Supplier[];
  currentUser: User;
  onAddRestock: (
    productId: string,
    quantityAdded: number,
    unitCost: number,
    supplierName: string,
    batchNo: string,
    notes: string
  ) => void;
}

export const ItemHistoryModal: React.FC<ItemHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
  restockRecords,
  transactions,
  suppliers,
  currentUser,
  onAddRestock,
}) => {
  const [activeTab, setActiveTab] = useState<'restock' | 'sales'>('restock');
  const [showAddRestockForm, setShowAddRestockForm] = useState(false);

  // Form state for adding restock
  const [quantityAdded, setQuantityAdded] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen || !product) return null;

  // Pre-fill unit cost and supplier if empty
  if (!unitCost && product.costPrice) {
    setUnitCost(product.costPrice.toString());
  }
  if (!supplierName && product.supplierName) {
    setSupplierName(product.supplierName);
  }

  // Filter restock records for this product
  const productRestocks = restockRecords
    .filter((r) => r.productId === product.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter sales history for this product across all transactions
  const productSales = transactions
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
          totalCost: (it.product.costPrice || product.costPrice) * it.quantity,
          totalProfit: it.total - (it.product.costPrice || product.costPrice) * it.quantity,
        }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Aggregate stats
  const totalRestockedQty = productRestocks.reduce((sum, r) => sum + r.quantityAdded, 0);
  const totalRestockCost = productRestocks.reduce((sum, r) => sum + r.totalCost, 0);

  const totalUnitsSold = productSales.reduce((sum, s) => sum + s.quantitySold, 0);
  const totalSalesRevenue = productSales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalSalesProfit = productSales.reduce((sum, s) => sum + s.totalProfit, 0);

  const marginInfo = calculateProfitMargin(product.costPrice, product.sellingPrice);

  const handleSubmitRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantityAdded, 10);
    const cost = parseFloat(unitCost);

    if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
      return;
    }

    onAddRestock(
      product.id,
      qty,
      cost,
      supplierName || product.supplierName || 'General Supplier',
      batchNo.trim() || `BATCH-${Date.now().toString().slice(-6)}`,
      notes.trim()
    );

    // Reset form
    setQuantityAdded('');
    setBatchNo('');
    setNotes('');
    setShowAddRestockForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        
        {/* Header Bar */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shrink-0 shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="p-3 bg-indigo-950 border border-indigo-800 text-indigo-400 rounded-2xl shrink-0">
                <Package className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-lg text-slate-100">{product.name}</h2>
                <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                  {product.sku}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${marginInfo.badgeBg} ${marginInfo.badgeText} ${marginInfo.badgeBorder}`}
                >
                  {marginInfo.label} ({marginInfo.marginPercent.toFixed(1)}%)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Category: <span className="text-slate-200 font-medium">{product.category}</span> ({product.subcategory}) • Stock: <span className="font-mono font-bold text-slate-200">{product.stockQuantity} {product.unit}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Summary Strip */}
        <div className="bg-slate-950/40 border-b border-slate-800 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <span className="text-slate-400 block text-[11px]">Cost Price</span>
            <span className="font-mono text-slate-200 font-bold text-sm">
              KSh {product.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <span className="text-slate-400 block text-[11px]">Selling Price</span>
            <span className="font-mono text-emerald-400 font-extrabold text-sm">
              KSh {product.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <span className="text-slate-400 block text-[11px]">Profit Per Unit</span>
            <span className="font-mono text-sky-400 font-bold text-sm">
              KSh {(product.sellingPrice - product.costPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <span className="text-slate-400 block text-[11px]">Total Lifetime Sales</span>
            <span className="font-mono text-amber-400 font-bold text-sm">
              KSh {totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({totalUnitsSold} pcs)
            </span>
          </div>
        </div>

        {/* Tabs navigation & actions */}
        <div className="px-5 pt-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('restock')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                activeTab === 'restock'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-950/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Restock History ({productRestocks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                activeTab === 'sales'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-950/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Sales History ({productSales.length})</span>
            </button>
          </div>

          {activeTab === 'restock' && (
            <button
              onClick={() => setShowAddRestockForm(!showAddRestockForm)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md mb-1 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{showAddRestockForm ? 'Close Restock Form' : 'Restock Item'}</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Add Restock Form */}
          {activeTab === 'restock' && showAddRestockForm && (
            <form
              onSubmit={handleSubmitRestock}
              className="bg-slate-950 border border-indigo-900/60 p-4 rounded-2xl space-y-3 animate-fadeIn text-xs shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="font-bold text-indigo-400 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" /> Log Restock for {product.name}
                </h4>
                <span className="text-[11px] text-slate-500">Current Stock: {product.stockQuantity}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Quantity Added *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 25"
                    value={quantityAdded}
                    onChange={(e) => setQuantityAdded(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Unit Cost Price (KSh) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 2800"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Supplier</label>
                  <select
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                    <option value="General Supplier">General Wholesale Market</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Batch # / Delivery Note</label>
                  <input
                    type="text"
                    placeholder="e.g. BATCH-2026-09"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Received 25 pcs in mint condition"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRestockForm(false)}
                  className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-xl shadow-lg"
                >
                  Save Restock
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: RESTOCK HISTORY */}
          {activeTab === 'restock' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Total Restocked Volume: <strong className="text-slate-200 font-mono">{totalRestockedQty} pcs</strong></span>
                <span>Total Restock Cost: <strong className="text-indigo-400 font-mono">KSh {totalRestockCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Qty Added</th>
                        <th className="p-3">Unit Cost</th>
                        <th className="p-3">Total Cost</th>
                        <th className="p-3">Supplier</th>
                        <th className="p-3">Batch #</th>
                        <th className="p-3">Received By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {productRestocks.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No restock history recorded for this item yet.
                          </td>
                        </tr>
                      ) : (
                        productRestocks.map((rst) => (
                          <tr key={rst.id} className="hover:bg-slate-900/50 transition">
                            <td className="p-3 font-mono text-slate-300">
                              {new Date(rst.date).toLocaleDateString()}
                              <span className="block text-[10px] text-slate-500">
                                {new Date(rst.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>

                            <td className="p-3 font-mono font-bold text-emerald-400">
                              +{rst.quantityAdded} {product.unit}
                            </td>

                            <td className="p-3 font-mono text-slate-300">
                              KSh {rst.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            <td className="p-3 font-mono font-bold text-indigo-400">
                              KSh {rst.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            <td className="p-3 text-slate-200 font-medium">
                              {rst.supplierName}
                            </td>

                            <td className="p-3 font-mono text-[11px] text-slate-400">
                              {rst.batchNo || 'N/A'}
                            </td>

                            <td className="p-3 text-slate-400">
                              {rst.receivedBy}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SALES HISTORY */}
          {activeTab === 'sales' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">Units Sold</span>
                  <span className="font-mono text-slate-200 font-bold text-sm">{totalUnitsSold} {product.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Revenue</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">KSh {totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Gross Profit</span>
                  <span className="font-mono text-sky-400 font-bold text-sm">KSh {totalSalesProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Receipt & Date</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3 text-center">Qty Sold</th>
                        <th className="p-3">Unit Price</th>
                        <th className="p-3">Total Sales</th>
                        <th className="p-3">Profit & Margin</th>
                        <th className="p-3">Cashier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {productSales.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No sales transactions recorded for this item yet.
                          </td>
                        </tr>
                      ) : (
                        productSales.map((s, idx) => {
                          const itemMargin = calculateProfitMargin(s.unitCostPrice, s.unitSellingPrice);
                          return (
                            <tr key={`${s.transactionId}-${idx}`} className="hover:bg-slate-900/50 transition">
                              <td className="p-3 font-mono">
                                <span className="text-indigo-400 font-bold">{s.receiptNumber}</span>
                                <span className="block text-[10px] text-slate-500">
                                  {new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>

                              <td className="p-3 text-slate-200 font-medium">
                                {s.customerName}
                              </td>

                              <td className="p-3 text-center font-mono font-bold text-slate-100">
                                {s.quantitySold}
                              </td>

                              <td className="p-3 font-mono text-slate-300">
                                KSh {s.unitSellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>

                              <td className="p-3 font-mono font-bold text-emerald-400">
                                KSh {s.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>

                              <td className="p-3 font-mono">
                                <div className="text-sky-400 font-bold">
                                  +KSh {s.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <span
                                  className={`inline-block mt-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${itemMargin.badgeBg} ${itemMargin.badgeText} ${itemMargin.badgeBorder}`}
                                >
                                  {itemMargin.label} ({itemMargin.marginPercent.toFixed(1)}%)
                                </span>
                              </td>

                              <td className="p-3 text-slate-400">
                                {s.cashierName}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
          <span className="text-slate-500">Item Audit Tracker • Real-time database synchronisation</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl font-bold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
