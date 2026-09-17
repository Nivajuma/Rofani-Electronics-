import React, { useState } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Package,
  Layers,
  Download,
  MessageCircle,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Send,
  CreditCard,
  Plus
} from 'lucide-react';
import { Supplier, Product } from '../../types';
import { exportSupplierAccountStatementPDF } from '../../utils/pdfGenerator';

interface SupplierDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  products: Product[];
  onOpenEdit: (supplier: Supplier) => void;
  onOpenPayment: (supplier: Supplier) => void;
  onNavigateToRestock?: (supplierName: string) => void;
}

export const SupplierDetailsModal: React.FC<SupplierDetailsModalProps> = ({
  isOpen,
  onClose,
  supplier,
  products,
  onOpenEdit,
  onOpenPayment,
  onNavigateToRestock,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'profile'>('catalog');

  if (!isOpen || !supplier) return null;

  // Filter products supplied by this vendor
  const supplierProducts = products.filter(
    (p) =>
      p.supplierName &&
      p.supplierName.trim().toLowerCase() === supplier.name.trim().toLowerCase()
  );

  const lowStockItems = supplierProducts.filter((p) => p.stockQuantity <= p.minStockAlert);
  const currentDebt = supplier.currentBalanceDue || 0;
  const totalSupplied = supplier.totalSuppliedValue || 0;

  // WhatsApp Restock PO Generator
  const handleSendWhatsAppOrder = () => {
    if (!supplier.phone || supplier.phone === 'N/A') {
      alert('This supplier does not have a phone number configured.');
      return;
    }
    const cleanPhone = supplier.phone.replace(/[^0-9]/g, '');
    
    let itemsText = '';
    if (lowStockItems.length > 0) {
      itemsText = lowStockItems.map((p) => `• ${p.name} (SKU: ${p.sku}) - Current Stock: ${p.stockQuantity} ${p.unit}`).join('\n');
    } else if (supplierProducts.length > 0) {
      itemsText = supplierProducts.slice(0, 5).map((p) => `• ${p.name} (SKU: ${p.sku})`).join('\n');
    } else {
      itemsText = '• (Please provide latest wholesale catalog & price list)';
    }

    const message = encodeURIComponent(
      `Hello ${supplier.contactPerson || supplier.name},\n\n` +
      `This is *ROFANI Electronics & Boutique* placing an inquiry / restock purchase order for the following items:\n\n` +
      `${itemsText}\n\n` +
      `Please send us the proforma invoice and estimated delivery schedule.\n\nThank you!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleDownloadStatement = () => {
    exportSupplierAccountStatementPDF(supplier, supplierProducts);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-600/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-xl text-slate-100">{supplier.name}</h3>
                {supplier.categorySpecialty && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {supplier.categorySpecialty}
                  </span>
                )}
                {currentDebt > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Payable Owed: KSh {currentDebt.toLocaleString()}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> All Invoices Settled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 font-mono">
                <span className="text-slate-300 font-sans">Contact: {supplier.contactPerson}</span>
                {supplier.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" /> {supplier.phone}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentDebt > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPayment(supplier);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <DollarSign className="w-4 h-4" /> Pay Supplier
              </button>
            )}

            {supplier.phone && (
              <button
                onClick={handleSendWhatsAppOrder}
                title="Send Restock Order via WhatsApp"
                className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" /> Order via WhatsApp
              </button>
            )}

            <button
              onClick={handleDownloadStatement}
              title="Download Statement & Catalog PDF"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-indigo-400" /> Statement PDF
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenEdit(supplier);
              }}
              title="Edit Profile"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Supplier Financial Stats Banner */}
        <div className="p-6 bg-slate-900/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Total Goods Supplied
            </span>
            <div className="text-base font-extrabold text-slate-100 font-mono mt-1">
              KSh {totalSupplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Lifetime procurement</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Accounts Payable (Debt)
            </span>
            <div className={`text-base font-extrabold font-mono mt-1 ${currentDebt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              KSh {currentDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {currentDebt > 0 ? 'Pending payment' : 'Zero balance owed'}
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Products in Catalog
            </span>
            <div className="text-base font-bold text-indigo-400 font-mono mt-1">
              {supplierProducts.length} Products
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {lowStockItems.length > 0 ? `${lowStockItems.length} items low stock` : 'Healthy stock levels'}
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Payment Terms
            </span>
            <div className="text-sm font-bold text-slate-200 mt-1 truncate">
              {supplier.paymentTerms || 'Net 30 Days'}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Standard credit policy</span>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="px-6 pt-4 bg-slate-900 border-b border-slate-800 flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'catalog'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Supplied Product Catalog ({supplierProducts.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'profile'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Vendor Details & Banking Details</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {activeSubTab === 'catalog' && (
            <div>
              {supplierProducts.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                  <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">No products directly mapped to this supplier yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    When adding or editing products in the Inventory tab, assign this supplier's name to link them here automatically.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Cost Price</th>
                        <th className="p-3 text-right">Selling Price</th>
                        <th className="p-3 text-center">Stock Level</th>
                        <th className="p-3 text-center">Reorder Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {supplierProducts.map((p) => {
                        const isLow = p.stockQuantity <= p.minStockAlert;
                        return (
                          <tr key={p.id} className="hover:bg-slate-800/50 transition">
                            <td className="p-3 font-bold text-indigo-400">{p.sku}</td>
                            <td className="p-3 font-sans text-xs text-slate-100 font-semibold">{p.name}</td>
                            <td className="p-3 font-sans text-slate-400">{p.category}</td>
                            <td className="p-3 text-right text-slate-200">
                              KSh {p.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-400">
                              KSh {p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-100">
                              {p.stockQuantity} {p.unit}
                            </td>
                            <td className="p-3 text-center font-sans">
                              {isLow ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Reorder ({p.stockQuantity}/{p.minStockAlert})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  In Stock
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'profile' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] text-indigo-400">
                  Vendor Location & Contact
                </h4>
                <div>
                  <span className="text-slate-500 block text-[10px]">Company Name</span>
                  <span className="text-slate-200 font-semibold">{supplier.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Contact Person</span>
                  <span className="text-slate-200">{supplier.contactPerson}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Phone Number</span>
                  <span className="text-slate-200 font-mono">{supplier.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Email Address</span>
                  <span className="text-slate-200">{supplier.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Warehouse / Office Location</span>
                  <span className="text-slate-200">{supplier.address}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] text-indigo-400">
                  Banking & Credit Terms
                </h4>
                <div>
                  <span className="text-slate-500 block text-[10px]">KRA PIN / Tax Compliance</span>
                  <span className="text-slate-200 font-mono font-bold">{supplier.kraPin || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Payment Credit Terms</span>
                  <span className="text-slate-200 font-semibold">{supplier.paymentTerms || 'Net 30 Days'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Bank / M-Pesa Remittance Account</span>
                  <span className="text-sky-400 font-mono">{supplier.bankDetails || 'Direct Invoicing'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Internal Procurement Notes</span>
                  <span className="text-slate-300 italic">{supplier.notes || 'No special notes recorded.'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
