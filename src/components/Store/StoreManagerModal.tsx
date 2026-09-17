import React, { useState } from 'react';
import { StoreLocation, Product, StockTransferRecord } from '../../types';
import {
  Store,
  Plus,
  MapPin,
  Phone,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Building2,
  Trash2,
  ArrowRightLeft,
  ArrowRight,
  Clock,
  Check,
  XCircle,
  PackageCheck,
  Send
} from 'lucide-react';

interface StoreManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreLocation[];
  products: Product[];
  stockTransfers: StockTransferRecord[];
  onAddStore: (store: Omit<StoreLocation, 'id'>) => void;
  onUpdateStore: (store: StoreLocation) => void;
  onDeleteStore: (id: string) => void;
  activeStoreId: string;
  onSelectActiveStore: (id: string) => void;
  onTransferStock: (transfer: Omit<StockTransferRecord, 'id' | 'createdAt' | 'transferNumber'>) => void;
  onUpdateTransferStatus: (transferId: string, status: StockTransferRecord['status']) => void;
}

export const StoreManagerModal: React.FC<StoreManagerModalProps> = ({
  isOpen,
  onClose,
  stores,
  products,
  stockTransfers,
  onAddStore,
  onUpdateStore,
  onDeleteStore,
  activeStoreId,
  onSelectActiveStore,
  onTransferStock,
  onUpdateTransferStatus
}) => {
  const [activeTab, setActiveTab] = useState<'outlets' | 'transfers'>('outlets');

  // Branch creation form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCode, setNewStoreCode] = useState('');
  const [newStoreCity, setNewStoreCity] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreManager, setNewStoreManager] = useState('');
  const [isMainBranch, setIsMainBranch] = useState(false);
  const [isOnlineStore, setIsOnlineStore] = useState(false);

  // Stock Transfer Form state
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [sourceStoreId, setSourceStoreId] = useState<string>(stores[0]?.id || '');
  const [targetStoreId, setTargetStoreId] = useState<string>(stores[1]?.id || stores[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferredBy, setTransferredBy] = useState<string>('Manager');

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    onAddStore({
      name: newStoreName.trim(),
      code: newStoreCode.trim() || `BR-${Date.now().toString().slice(-4)}`,
      city: newStoreCity.trim() || 'Nairobi',
      address: newStoreAddress.trim() || 'Branch Address',
      phone: newStorePhone.trim() || '+254 700 000000',
      isMainBranch,
      isOnlineStorefront: isOnlineStore,
      active: true,
      managerName: newStoreManager.trim() || 'Branch Manager'
    });

    setNewStoreName('');
    setNewStoreCode('');
    setNewStoreCity('');
    setNewStoreAddress('');
    setNewStorePhone('');
    setNewStoreManager('');
    setIsMainBranch(false);
    setIsOnlineStore(false);
    setShowAddForm(false);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceStoreId || !targetStoreId || sourceStoreId === targetStoreId) {
      alert('Source branch and target branch must be different.');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const sourceStoreObj = stores.find((s) => s.id === sourceStoreId);
    const targetStoreObj = stores.find((s) => s.id === targetStoreId);

    if (!sourceStoreObj || !targetStoreObj) return;

    onTransferStock({
      sourceStoreId,
      sourceStoreName: sourceStoreObj.name,
      targetStoreId,
      targetStoreName: targetStoreObj.name,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      quantity: transferQty,
      status: 'In Transit',
      transferredBy: transferredBy.trim() || 'Branch Manager',
      notes: transferNotes.trim() || undefined
    });

    setTransferNotes('');
    setTransferQty(1);
    setShowTransferForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Multi-Store & Inter-Branch Stock Transfers
              </h2>
              <p className="text-xs text-slate-400">
                Manage branch outlets, switch operating terminals, and dispatch inventory between stores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('outlets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'outlets'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Branch Outlets ({stores.length})
              </button>
              <button
                onClick={() => setActiveTab('transfers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'transfers'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-300" /> Stock Transfers ({stockTransfers.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'outlets' ? (
            <>
              {/* Active Store Switcher Banner */}
              <div className="bg-slate-950 border border-sky-900/50 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-sky-400" />
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Currently Selected Active Terminal Outlet</span>
                    <span className="text-sm font-bold text-slate-100">
                      {stores.find((s) => s.id === activeStoreId)?.name || 'All Branches (Aggregated View)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectActiveStore('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      activeStoreId === 'all'
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    All Branches (Combined)
                  </button>
                </div>
              </div>

              {/* List of Stores */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Store Outlets ({stores.length})
                  </h3>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-sky-600/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add New Branch
                    </button>
                  )}
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddSubmit} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                      Register New Branch / Outlet
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-1">Store / Branch Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Kisumu Mega Mall Branch"
                          value={newStoreName}
                          onChange={(e) => setNewStoreName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Branch Code</label>
                        <input
                          type="text"
                          placeholder="e.g. KSM-04"
                          value={newStoreCode}
                          onChange={(e) => setNewStoreCode(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">City / Region</label>
                        <input
                          type="text"
                          placeholder="e.g. Kisumu"
                          value={newStoreCity}
                          onChange={(e) => setNewStoreCity(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Physical Address / Street</label>
                        <input
                          type="text"
                          placeholder="e.g. Oginga Odinga Street"
                          value={newStoreAddress}
                          onChange={(e) => setNewStoreAddress(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Contact Phone Number</label>
                        <input
                          type="text"
                          placeholder="e.g. +254 700 888 999"
                          value={newStorePhone}
                          onChange={(e) => setNewStorePhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Branch Manager Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Mary Odhiambo"
                          value={newStoreManager}
                          onChange={(e) => setNewStoreManager(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={isMainBranch}
                          onChange={(e) => setIsMainBranch(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-800 text-sky-500 focus:ring-sky-500"
                        />
                        <span>Set as Main Headquarter Branch</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={isOnlineStore}
                          onChange={(e) => setIsOnlineStore(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-800 text-sky-500 focus:ring-sky-500"
                        />
                        <span>Flag as E-Commerce Online Outlet</span>
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-500 shadow-lg shadow-sky-600/20"
                      >
                        Save Outlet
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stores.map((s) => {
                    const isSelected = activeStoreId === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-500/60 shadow-lg shadow-sky-950/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {s.isOnlineStorefront ? (
                                <Globe className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Building2 className="w-5 h-5 text-sky-400" />
                              )}
                              <div>
                                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                                  {s.name}
                                  {s.isMainBranch && (
                                    <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
                                      HQ
                                    </span>
                                  )}
                                  {s.isOnlineStorefront && (
                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
                                      Online E-Store
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[11px] text-slate-400 font-mono">Code: {s.code}</p>
                              </div>
                            </div>

                            {isSelected && (
                              <span className="text-sky-400 flex items-center gap-1 text-xs font-bold bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Active
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 text-xs text-slate-400 my-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{s.address}, {s.city}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{s.phone}</span>
                            </div>
                            {s.managerName && (
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span>Manager: {s.managerName}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                          <button
                            onClick={() => onSelectActiveStore(s.id)}
                            className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition flex-1 ${
                              isSelected
                                ? 'bg-sky-600 border-sky-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {isSelected ? 'Active Operating Outlet' : 'Switch to This Outlet'}
                          </button>

                          {!s.isMainBranch && stores.length > 1 && (
                            <button
                              onClick={() => onDeleteStore(s.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                              title="Delete store outlet"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Inter-Store Stock Transfers View */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 border border-indigo-900/40 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-400" /> Inter-Branch Stock Transfers
                  </h3>
                  <p className="text-xs text-slate-400">
                    Transfer product stock quantities between store locations with automated inventory update
                  </p>
                </div>
                {!showTransferForm && (
                  <button
                    onClick={() => setShowTransferForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
                  >
                    <Send className="w-3.5 h-3.5" /> Initiate Stock Transfer
                  </button>
                )}
              </div>

              {showTransferForm && (
                <form onSubmit={handleTransferSubmit} className="bg-slate-950 border border-indigo-500/30 p-4 rounded-xl space-y-3 text-xs">
                  <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">
                    New Stock Transfer Dispatch
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Source Store (From) *</label>
                      <select
                        value={sourceStoreId}
                        onChange={(e) => setSourceStoreId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Target Store (To) *</label>
                      <select
                        value={targetStoreId}
                        onChange={(e) => setTargetStoreId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-slate-400 block mb-1">Select Product *</label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (SKU: {p.sku}) - Stock: {p.stockQuantity} {p.unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Transfer Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={transferQty}
                        onChange={(e) => setTransferQty(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Authorized / Dispatched By</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe (Admin)"
                        value={transferredBy}
                        onChange={(e) => setTransferredBy(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Notes / Courier Reference</label>
                      <input
                        type="text"
                        placeholder="e.g. G4S Courier Waybill #8849"
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowTransferForm(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                    >
                      Confirm Dispatch
                    </button>
                  </div>
                </form>
              )}

              {/* Transfer Logs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Transfer Audit Logs ({stockTransfers.length})
                </h4>

                {stockTransfers.length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                    <ArrowRightLeft className="w-10 h-10 mx-auto stroke-1 text-slate-700 mb-2" />
                    <p className="text-xs">No stock transfers recorded yet.</p>
                  </div>
                ) : (
                  stockTransfers.map((trf) => (
                    <div
                      key={trf.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-400 text-xs">
                            {trf.transferNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              trf.status === 'Completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : trf.status === 'In Transit'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}
                          >
                            {trf.status}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(trf.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {trf.status === 'In Transit' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onUpdateTransferStatus(trf.id, 'Completed')}
                              className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> Confirm Receipt
                            </button>
                            <button
                              onClick={() => onUpdateTransferStatus(trf.id, 'Cancelled')}
                              className="text-slate-500 hover:text-red-400 text-xs p-1"
                              title="Cancel transfer"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-500 block">From Source Branch</span>
                            <span className="font-bold text-slate-200">{trf.sourceStoreName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-500 block">To Destination Branch</span>
                            <span className="font-bold text-slate-200">{trf.targetStoreName}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 block">Transferred Item</span>
                          <span className="font-bold text-slate-100">{trf.productName}</span>
                          <span className="text-indigo-400 font-mono font-bold ml-2">
                            × {trf.quantity}
                          </span>
                        </div>
                      </div>

                      {trf.notes && (
                        <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg font-mono">
                          Note: {trf.notes} ({trf.transferredBy})
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
};
