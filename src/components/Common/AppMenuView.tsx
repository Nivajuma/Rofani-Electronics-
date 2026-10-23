import React, { useState } from 'react';
import {
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  DollarSign,
  Globe,
  FileText,
  Landmark,
  Wallet,
  Receipt,
  FileCheck,
  Cloud,
  Building2,
  Database,
  Wrench,
  Award,
  Monitor,
  TrendingUp,
  Settings,
  Bell,
  Filter,
  Store,
  X
} from 'lucide-react';
import { TabKey } from '../../utils/permissions';

interface AppMenuViewProps {
  onSelectTab: (tab: TabKey) => void;
  onOpenCloudSync?: () => void;
  onOpenStoreManager?: () => void;
  onOpenInstallModal?: () => void;
  onSwitchToComputer: () => void;
  lowStockCount: number;
  storeName?: string;
}

export const AppMenuView: React.FC<AppMenuViewProps> = ({
  onSelectTab,
  onOpenCloudSync,
  onOpenStoreManager,
  onOpenInstallModal,
  onSwitchToComputer,
  lowStockCount,
  storeName = 'ROFANI ELECTRONICS'
}) => {
  const [dropdowns, setDropdowns] = useState<Record<string, boolean>>({
    sale: false,
    purchase: false,
    backup: false,
    utilities: false,
    grow: false,
  });

  const [modalNotice, setModalNotice] = useState<string | null>(null);

  const toggleDropdown = (key: string) => {
    setDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubItemClick = (actionName: string) => {
    if (actionName.includes('Sale') || actionName.includes('POS') || actionName.includes('Invoice') || actionName.includes('Quotation') || actionName.includes('Order') || actionName.includes('Delivery')) {
      onSelectTab('pos');
    } else if (actionName.includes('Purchase') || actionName.includes('Bill') || actionName.includes('Debit')) {
      onSelectTab('purchasing');
    } else if (actionName.includes('Payment-In') || actionName.includes('Payment - Out')) {
      onSelectTab('cashmanagement');
    } else {
      setModalNotice(`Opening workflow: ${actionName}`);
    }
  };

  return (
    <div className="min-h-full bg-[#F1F5F9] text-slate-900 pb-20 font-sans">
      {/* 1. Top Header Bar */}
      <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-wide text-white">{storeName}</h1>
            <p className="text-[10px] text-slate-400">POS & Inventory Menu</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('inventory')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl relative transition"
            title="Low Stock Filter Badge"
          >
            <Filter className="w-4 h-4 text-sky-400" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('inventory')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl relative transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-emerald-400" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>

      {/* Toast Notice */}
      {modalNotice && (
        <div className="mx-4 mt-3 bg-blue-900/90 border border-blue-500/50 text-blue-100 p-3 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md">
          <span>{modalNotice}</span>
          <button onClick={() => setModalNotice(null)} className="text-blue-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Grouped Section Cards (List View) */}
      <div className="max-w-xl mx-auto px-4 py-4 space-y-4 text-xs">
        {/* Main Modules Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
          <div className="px-4 py-2.5 bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Main Modules
          </div>

          {/* Sale Accordion */}
          <div>
            <button
              onClick={() => toggleDropdown('sale')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span>Sale</span>
              </div>
              {dropdowns.sale ? (
                <ChevronUp className="w-4 h-4 text-blue-600 font-bold transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
              )}
            </button>
            {dropdowns.sale && (
              <div className="bg-slate-50/80 px-4 py-2.5 space-y-2 border-t border-slate-100 pl-14 animate-fade-in">
                {[
                  'Sale Invoice',
                  'Payment-In',
                  'Sale Return (Credit Note)',
                  'Estimate/Quotation',
                  'Sale Order',
                  'Delivery Note',
                  'Mobile POS',
                ].map((subItem) => (
                  <button
                    key={subItem}
                    onClick={() => handleSubItemClick(subItem)}
                    className="w-full text-left py-1.5 text-slate-700 hover:text-blue-600 font-semibold flex items-center justify-between transition group cursor-pointer"
                  >
                    <span>{subItem}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Purchase Accordion */}
          <div>
            <button
              onClick={() => toggleDropdown('purchase')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <span>Purchase</span>
              </div>
              {dropdowns.purchase ? (
                <ChevronUp className="w-4 h-4 text-emerald-600 font-bold transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
              )}
            </button>
            {dropdowns.purchase && (
              <div className="bg-slate-50/80 px-4 py-2.5 space-y-2 border-t border-slate-100 pl-14 animate-fade-in">
                {[
                  'Purchase Bills',
                  'Payment - Out',
                  'Purchase Return (Debit Note)',
                  'Purchase Order',
                ].map((subItem) => (
                  <button
                    key={subItem}
                    onClick={() => handleSubItemClick(subItem)}
                    className="w-full text-left py-1.5 text-slate-700 hover:text-emerald-600 font-semibold flex items-center justify-between transition group cursor-pointer"
                  >
                    <span>{subItem}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expenses */}
          <button
            onClick={() => onSelectTab('expenses')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <span>Expenses</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* My Online Store */}
          <button
            onClick={() => onSelectTab('onlinestore')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <span>My Online Store</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Reports */}
          <button
            onClick={() => onSelectTab('reports')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span>Reports</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Cash & Bank Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
          <div className="px-4 py-2.5 bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Cash & Bank
          </div>

          <button
            onClick={() => onSelectTab('cashmanagement')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
              <span>Bank Accounts</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => onSelectTab('cashmanagement')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <span>Cash In-Hand</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => onSelectTab('cashmanagement')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <span>Cheques</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => onSelectTab('attendance')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <span>Loan Accounts</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Important Utilities Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
          <div className="px-4 py-2.5 bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Important Utilities
          </div>

          <button
            onClick={onOpenCloudSync}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
              <span>Sync & Share</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={onOpenStoreManager}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <span>Manage Companies</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Backup/Restore */}
          <div>
            <button
              onClick={() => toggleDropdown('backup')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <span>Backup/Restore</span>
              </div>
              {dropdowns.backup ? (
                <ChevronUp className="w-4 h-4 text-emerald-600 font-bold transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
              )}
            </button>
            {dropdowns.backup && (
              <div className="bg-slate-50/80 px-4 py-2.5 space-y-2 border-t border-slate-100 pl-14 animate-fade-in">
                <button
                  onClick={() => onSelectTab('settings')}
                  className="w-full text-left py-1.5 text-slate-700 hover:text-emerald-600 font-semibold flex items-center justify-between"
                >
                  <span>Export JSON Backup</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onSelectTab('settings')}
                  className="w-full text-left py-1.5 text-slate-700 hover:text-emerald-600 font-semibold flex items-center justify-between"
                >
                  <span>Restore from Backup</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </div>

          {/* Utilities */}
          <div>
            <button
              onClick={() => toggleDropdown('utilities')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <span>Utilities</span>
              </div>
              {dropdowns.utilities ? (
                <ChevronUp className="w-4 h-4 text-purple-600 font-bold transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
              )}
            </button>
            {dropdowns.utilities && (
              <div className="bg-slate-50/80 px-4 py-2.5 space-y-2 border-t border-slate-100 pl-14 animate-fade-in">
                <button
                  onClick={() => onSelectTab('inventory')}
                  className="w-full text-left py-1.5 text-slate-700 hover:text-purple-600 font-semibold flex items-center justify-between"
                >
                  <span>Barcode & Label Printing</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onSelectTab('stocktake')}
                  className="w-full text-left py-1.5 text-slate-700 hover:text-purple-600 font-semibold flex items-center justify-between"
                >
                  <span>Physical Audit Count</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Others Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
          <div className="px-4 py-2.5 bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Others
          </div>

          <button
            onClick={() => setModalNotice('Rofani POS Pro License: Active & Fully Unlocked')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <span>Plans & Pricing</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={onSwitchToComputer}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Monitor className="w-4 h-4" />
              </div>
              <span>Get Desktop Billing Software</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Grow Your Business */}
          <div>
            <button
              onClick={() => toggleDropdown('grow')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span>Grow Your Business</span>
              </div>
              {dropdowns.grow ? (
                <ChevronUp className="w-4 h-4 text-emerald-600 font-bold transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
              )}
            </button>
            {dropdowns.grow && (
              <div className="bg-slate-50/80 px-4 py-2.5 space-y-2 border-t border-slate-100 pl-14 animate-fade-in">
                <button
                  onClick={() => onSelectTab('onlinestore')}
                  className="w-full text-left py-1.5 text-slate-700 hover:text-emerald-600 font-semibold flex items-center justify-between"
                >
                  <span>Launch WhatsApp Online Store</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onSelectTab('reports')}
                  className="w-full text-left py-1.5 text-slate-700 hover:text-emerald-600 font-semibold flex items-center justify-between"
                >
                  <span>Daily Sales & Profit Analytics</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onSelectTab('settings')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <span>Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
