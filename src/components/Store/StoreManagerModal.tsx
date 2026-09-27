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
  Send,
  Edit2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Search,
  MessageCircle,
  X
} from 'lucide-react';
import { INITIAL_STORES } from '../../data/initialData';

const DEMO_STORE_IDS = ['store-main', 'store-westlands', 'store-mombasa', 'store-online'];

interface StoreManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreLocation[];
  products: Product[];
  stockTransfers: StockTransferRecord[];
  onAddStore: (store: Omit<StoreLocation, 'id'>) => void;
  onUpdateStore: (store: StoreLocation) => void;
  onDeleteStore: (id: string) => void;
  onResetDemoStores?: () => void;
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
  onResetDemoStores,
  activeStoreId,
  onSelectActiveStore,
  onTransferStock,
  onUpdateTransferStatus
}) => {
  const [activeTab, setActiveTab] = useState<'outlets' | 'transfers'>('outlets');
  const [searchQuery, setSearchQuery] = useState('');

  // Branch creation form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCode, setNewStoreCode] = useState('');
  const [newStoreCity, setNewStoreCity] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreWhatsapp, setNewStoreWhatsapp] = useState('');
  const [newStoreManager, setNewStoreManager] = useState('');
  const [isMainBranch, setIsMainBranch] = useState(false);
  const [isOnlineStore, setIsOnlineStore] = useState(false);

  // Branch editing state
  const [editingStore, setEditingStore] = useState<StoreLocation | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editManager, setEditManager] = useState('');
  const [editIsMainBranch, setEditIsMainBranch] = useState(false);
  const [editIsOnlineStore, setEditIsOnlineStore] = useState(false);
  const [editActive, setEditActive] = useState(true);

  // Delete Confirmation state
  const [storeToDelete, setStoreToDelete] = useState<StoreLocation | null>(null);
  const [showResetDemoConfirm, setShowResetDemoConfirm] = useState(false);
  const [showKeepSingleConfirm, setShowKeepSingleConfirm] = useState<StoreLocation | null>(null);

  // Stock Transfer Form state
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [sourceStoreId, setSourceStoreId] = useState<string>(stores[0]?.id || '');
  const [targetStoreId, setTargetStoreId] = useState<string>(stores[1]?.id || stores[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferredBy, setTransferredBy] = useState<string>('Manager');

  if (!isOpen) return null;

  // Filtered stores
  const filteredStores = stores.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      (s.managerName && s.managerName.toLowerCase().includes(q))
    );
  });

  // Start editing a store
  const handleStartEdit = (s: StoreLocation) => {
    setEditingStore(s);
    setEditName(s.name);
    setEditCode(s.code);
    setEditCity(s.city);
    setEditAddress(s.address);
    setEditPhone(s.phone);
    setEditWhatsapp(s.whatsappPhone || '');
    setEditManager(s.managerName || '');
    setEditIsMainBranch(!!s.isMainBranch);
    setEditIsOnlineStore(!!s.isOnlineStorefront);
    setEditActive(s.active !== false);
    setShowAddForm(false);
  };

  // Submit edit store
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore || !editName.trim()) return;

    const updated: StoreLocation = {
      ...editingStore,
      name: editName.trim(),
      code: editCode.trim() || editingStore.code,
      city: editCity.trim() || editingStore.city,
      address: editAddress.trim() || editingStore.address,
      phone: editPhone.trim() || editingStore.phone,
      whatsappPhone: editWhatsapp.trim() || undefined,
      managerName: editManager.trim() || editingStore.managerName,
      isMainBranch: editIsMainBranch,
      isOnlineStorefront: editIsOnlineStore,
      active: editActive
    };

    // If marked as main branch, demote any other main branch
    if (editIsMainBranch) {
      stores.forEach((other) => {
        if (other.id !== updated.id && other.isMainBranch) {
          onUpdateStore({ ...other, isMainBranch: false });
        }
      });
    }

    onUpdateStore(updated);
    setEditingStore(null);
  };

  // Submit add store
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    onAddStore({
      name: newStoreName.trim(),
      code: newStoreCode.trim() || `BR-${Date.now().toString().slice(-4)}`,
      city: newStoreCity.trim() || 'Nairobi',
      address: newStoreAddress.trim() || 'Branch Address',
      phone: newStorePhone.trim() || '+254 700 000000',
      whatsappPhone: newStoreWhatsapp.trim() || undefined,
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
    setNewStoreWhatsapp('');
    setNewStoreManager('');
    setIsMainBranch(false);
    setIsOnlineStore(false);
    setShowAddForm(false);
  };

  // Confirm delete store
  const handleConfirmDelete = () => {
    if (!storeToDelete) return;
    onDeleteStore(storeToDelete.id);
    setStoreToDelete(null);
  };

  // Keep only this store and remove all other demo outlets
  const handleKeepOnlyStore = (storeToKeep: StoreLocation) => {
    stores.forEach((s) => {
      if (s.id !== storeToKeep.id) {
        onDeleteStore(s.id);
      }
    });
    // Ensure the kept store is active and main
    onUpdateStore({ ...storeToKeep, isMainBranch: true, active: true });
    onSelectActiveStore(storeToKeep.id);
    setShowKeepSingleConfirm(null);
  };

  // Submit stock transfer
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceStoreId || !targetStoreId || sourceStoreId === targetStoreId) {
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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/50 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-sky-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Store Branches & Multi-Outlet Manager
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  {stores.length} Outlets
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Edit branch names, contact details, manage demo stores, switch active terminal, and dispatch stock.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('outlets')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'outlets'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Store Branches</span>
              </button>
              <button
                onClick={() => setActiveTab('transfers')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'transfers'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Inter-Store Transfers ({stockTransfers.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'outlets' ? (
            <>
              {/* Active Terminal Switcher & Demo Tools Banner */}
              <div className="bg-slate-950/80 border border-indigo-900/50 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Currently Active Terminal Outlet:</span>
                    <span className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      {stores.find((s) => s.id === activeStoreId)?.name || 'All Branches (Aggregated View)'}
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Connected
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {onResetDemoStores && (
                    <button
                      onClick={() => setShowResetDemoConfirm(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5"
                      title="Restore the 4 pre-configured demo store branches"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Reset Demo Outlets</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectActiveStore('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      activeStoreId === 'all'
                        ? 'bg-sky-600 border-sky-500 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    All Outlets (Aggregated)
                  </button>
                </div>
              </div>

              {/* EDIT FORM (Visible when editingStore is set) */}
              {editingStore && (
                <div className="bg-slate-950 border-2 border-indigo-500/60 p-4 sm:p-5 rounded-2xl space-y-4 shadow-xl animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-sm font-black text-white">
                        Edit Store Branch: <span className="text-indigo-400">{editingStore.name}</span>
                      </h4>
                      {DEMO_STORE_IDS.includes(editingStore.id) && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                          Demo Store
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingStore(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          Store / Branch Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-white font-bold outline-none"
                          placeholder="e.g. ROFANI Flagship Store CBD"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          Branch Code
                        </label>
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none uppercase"
                          placeholder="e.g. HQ-CBD"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          City / Region *
                        </label>
                        <input
                          type="text"
                          required
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                          placeholder="e.g. Nairobi"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          Physical Address / Street / Building *
                        </label>
                        <input
                          type="text"
                          required
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                          placeholder="e.g. Kenyatta Avenue, CBD"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          Contact Phone Number
                        </label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
                          placeholder="e.g. +254 700 111 222"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          WhatsApp Order Line (Optional)
                        </label>
                        <input
                          type="text"
                          value={editWhatsapp}
                          onChange={(e) => setEditWhatsapp(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
                          placeholder="e.g. +254 711 222 333"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          Branch Manager Name
                        </label>
                        <input
                          type="text"
                          value={editManager}
                          onChange={(e) => setEditManager(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                          placeholder="e.g. Sarah Miller"
                        />
                      </div>

                      <div className="flex flex-col justify-center space-y-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-bold">
                          <input
                            type="checkbox"
                            checked={editIsMainBranch}
                            onChange={(e) => setEditIsMainBranch(e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Set as Main Headquarter Branch (HQ)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={editIsOnlineStore}
                            onChange={(e) => setEditIsOnlineStore(e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>E-Commerce / Online Storefront Portal</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-sky-500"
                          />
                          <span>Active / Currently Operating</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowKeepSingleConfirm(editingStore)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Keep Only This Outlet (Clear Other Demos)</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStore(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* ADD STORE FORM */}
              {showAddForm && (
                <div className="bg-slate-950 border-2 border-sky-500/60 p-4 sm:p-5 rounded-2xl space-y-4 shadow-xl animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-sky-400" />
                      Register New Branch Outlet
                    </h4>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Store / Branch Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Kisumu Mega Mall Branch"
                          value={newStoreName}
                          onChange={(e) => setNewStoreName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Branch Code</label>
                        <input
                          type="text"
                          placeholder="e.g. KSM-04"
                          value={newStoreCode}
                          onChange={(e) => setNewStoreCode(e.target.value.toUpperCase())}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">City / Region *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Kisumu"
                          value={newStoreCity}
                          onChange={(e) => setNewStoreCity(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Physical Address / Street *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Oginga Odinga Street"
                          value={newStoreAddress}
                          onChange={(e) => setNewStoreAddress(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Contact Phone Number</label>
                        <input
                          type="text"
                          placeholder="e.g. +254 700 888 999"
                          value={newStorePhone}
                          onChange={(e) => setNewStorePhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Branch Manager Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Mary Odhiambo"
                          value={newStoreManager}
                          onChange={(e) => setNewStoreManager(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                        <input
                          type="checkbox"
                          checked={isMainBranch}
                          onChange={(e) => setIsMainBranch(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500"
                        />
                        <span>Set as Main Headquarter Branch (HQ)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                        <input
                          type="checkbox"
                          checked={isOnlineStore}
                          onChange={(e) => setIsOnlineStore(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span>Flag as E-Commerce Online Outlet</span>
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-500 shadow-lg shadow-sky-600/20"
                      >
                        Create Outlet
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Outlet List Header & Search */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                      Configured Outlets ({stores.length})
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Click "Edit Details" on any outlet to rename or update info
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search outlet..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {!showAddForm && !editingStore && (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-lg shadow-sky-600/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add New Branch
                      </button>
                    )}
                  </div>
                </div>

                {/* Outlet Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredStores.map((s) => {
                    const isSelected = activeStoreId === s.id;
                    const isDemo = DEMO_STORE_IDS.includes(s.id);
                    const isEditing = editingStore?.id === s.id;

                    return (
                      <div
                        key={s.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition relative flex flex-col justify-between ${
                          isEditing
                            ? 'bg-indigo-950/30 border-indigo-500 shadow-lg'
                            : isSelected
                            ? 'bg-sky-950/30 border-sky-500/70 shadow-lg shadow-sky-950/50'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          {/* Top Badges & Name */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  s.isOnlineStorefront
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                }`}
                              >
                                {s.isOnlineStorefront ? (
                                  <Globe className="w-5 h-5" />
                                ) : (
                                  <Building2 className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                                  <span>{s.name}</span>
                                  {s.isMainBranch && (
                                    <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] px-1.5 py-0.2 rounded-md font-bold">
                                      HQ / Main
                                    </span>
                                  )}
                                  {s.isOnlineStorefront && (
                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-1.5 py-0.2 rounded-md font-bold">
                                      E-Commerce
                                    </span>
                                  )}
                                  {isDemo && (
                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold">
                                      Demo
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Code: {s.code}</p>
                              </div>
                            </div>

                            {isSelected && (
                              <span className="text-sky-400 flex items-center gap-1 text-xs font-bold bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Active
                              </span>
                            )}
                          </div>

                          {/* Address & Manager Info */}
                          <div className="space-y-1.5 text-xs text-slate-300 my-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{s.address}, {s.city}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{s.phone}</span>
                              {s.whatsappPhone && (
                                <span className="text-emerald-400 flex items-center gap-1 ml-2 font-sans text-[11px]">
                                  <MessageCircle className="w-3 h-3" /> WA
                                </span>
                              )}
                            </div>
                            {s.managerName && (
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span>Manager: <strong className="text-slate-200">{s.managerName}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Edit, Switch, Delete */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                          {/* Edit Details Button */}
                          <button
                            onClick={() => handleStartEdit(s)}
                            className="text-xs px-3 py-1.5 rounded-xl font-bold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                            title={`Edit and customize ${s.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Edit Details</span>
                          </button>

                          {/* Switch Terminal Button */}
                          <button
                            onClick={() => onSelectActiveStore(s.id)}
                            className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition flex-1 text-center ${
                              isSelected
                                ? 'bg-sky-600 border-sky-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {isSelected ? 'Active Terminal' : 'Switch Terminal'}
                          </button>

                          {/* Delete Store (Available if > 1 stores) */}
                          {stores.length > 1 && (
                            <button
                              onClick={() => setStoreToDelete(s)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                              title={`Delete ${s.name}`}
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
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-600/20 cursor-pointer"
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

                        <div className="flex items-center gap-2">
                          {trf.status === 'In Transit' && (
                            <button
                              onClick={() => onUpdateTransferStatus(trf.id, 'Completed')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> Mark Received
                            </button>
                          )}
                          {trf.status === 'In Transit' && (
                            <button
                              onClick={() => onUpdateTransferStatus(trf.id, 'Cancelled')}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[11px]">From Outlet:</span>
                          <span className="font-bold text-slate-200">{trf.sourceStoreName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">To Outlet:</span>
                          <span className="font-bold text-slate-200">{trf.targetStoreName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Item & Quantity:</span>
                          <span className="font-bold text-sky-400">
                            {trf.productName} ({trf.quantity} pcs)
                          </span>
                        </div>
                      </div>

                      {trf.notes && (
                        <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                          Note: {trf.notes}
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
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Active Outlet: <strong className="text-white">{stores.find((s) => s.id === activeStoreId)?.name || 'All'}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* MODAL: DELETE STORE CONFIRMATION */}
      {storeToDelete && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-black text-white">Delete Store Branch?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong>"{storeToDelete.name}"</strong> ({storeToDelete.code})?
              {storeToDelete.isMainBranch && (
                <span className="block mt-2 text-amber-300">
                  ⚠️ This is currently the Main Headquarter Branch. If deleted, another branch will automatically be designated as HQ.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStoreToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET DEMO STORES CONFIRMATION */}
      {showResetDemoConfirm && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-base font-black text-white">Reset Demo Store Outlets?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will restore the 4 default sample branches (Main Flagship, Westlands Mall, Mombasa Coastal, and Online E-Store).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetDemoConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetDemoStores?.();
                  setShowResetDemoConfirm(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg"
              >
                Reset Demo Stores
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KEEP ONLY THIS STORE CONFIRMATION */}
      {showKeepSingleConfirm && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-indigo-400">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-base font-black text-white">Keep Only "{showKeepSingleConfirm.name}"?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will remove all other sample/demo branches and leave only <strong>"{showKeepSingleConfirm.name}"</strong> as your primary active store. You can always add more branches later.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeepSingleConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleKeepOnlyStore(showKeepSingleConfirm)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
              >
                Keep Only This Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
