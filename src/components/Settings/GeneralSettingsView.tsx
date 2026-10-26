import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Info,
  Check,
  Globe,
  Coins,
  Calendar,
  Shield,
  Building2,
  Truck,
  Database,
  FileText,
  Sliders,
  ChevronRight,
  KeyRound,
  X,
  Lock
} from 'lucide-react';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';

interface GeneralSettingsViewProps {
  onBack: () => void;
  onOpenStoreManager?: () => void;
  onOpenCloudSync?: () => void;
}

export interface GeneralSettingsState {
  appLanguage: string;
  businessCurrency: string;
  decimalPlaces: number;
  dateFormat: string;
  showUnsavedWarning: boolean;
  appTheme: string;
  passcodeFingerprint: boolean;
  multifirmSettings: boolean;
  stockTransferStores: boolean;
  backupSettings: boolean;
  estimateQuotation: boolean;
  proformaInvoice: boolean;
  otherIncome: boolean;
  salePurchaseOrder: boolean;
  fixedAssets: boolean;
  deliveryNote: boolean;
  goodsReturnOnDeliveryNote: boolean;
  printAmountOnNote: boolean;
}

export const GENERAL_SETTINGS_DEFAULT: GeneralSettingsState = {
  appLanguage: 'English',
  businessCurrency: 'KSh',
  decimalPlaces: 2,
  dateFormat: 'dd/MM/yyyy',
  showUnsavedWarning: true,
  appTheme: 'Dark Mode Pro',
  passcodeFingerprint: false,
  multifirmSettings: false,
  stockTransferStores: false,
  backupSettings: false,
  estimateQuotation: true,
  proformaInvoice: false,
  otherIncome: false,
  salePurchaseOrder: true,
  fixedAssets: false,
  deliveryNote: true,
  goodsReturnOnDeliveryNote: true,
  printAmountOnNote: false,
};

export const GeneralSettingsView: React.FC<GeneralSettingsViewProps> = ({
  onBack,
  onOpenStoreManager,
  onOpenCloudSync
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [settings, setSettings] = useState<GeneralSettingsState>(() =>
    safeGetJSON<GeneralSettingsState>('rofani_general_settings_v1', GENERAL_SETTINGS_DEFAULT)
  );

  // PIN Setup Modal state
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [pinInput, setPinInput] = useState(() => safeGetJSON<string>('rofani_app_pin', '1234'));
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    safeSetJSON('rofani_general_settings_v1', settings);
  }, [settings]);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const updateSetting = <K extends keyof GeneralSettingsState>(key: K, value: GeneralSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    triggerToast('General settings updated successfully!');
  };

  const handleSavePinSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput || pinInput.length < 4) {
      setPinError('Please enter a valid 4-digit PIN code.');
      return;
    }
    safeSetJSON('rofani_app_pin', pinInput);
    safeSetJSON('retail_pos_master_pin', pinInput);
    setSettings((prev) => ({ ...prev, passcodeFingerprint: true }));
    setShowPinSetupModal(false);
    setPinError('');
    triggerToast('🔒 Register PIN passcode set successfully!');
  };

  const handleDisablePasscode = () => {
    setSettings((prev) => ({ ...prev, passcodeFingerprint: false }));
    triggerToast('🔓 PIN passcode lock disabled.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans">
      {/* 1. Header Navigation */}
      <div className="sticky top-0 z-30 bg-slate-900 text-white shadow-md px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-base sm:text-lg tracking-tight">General Settings</h1>
            <p className="text-[10px] text-slate-400">Application, Security, Documents & Preferences</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-44 sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search general settings..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="max-w-3xl mx-auto px-4 mt-3">
          <div className="bg-emerald-900/90 border border-emerald-500/50 text-emerald-200 text-xs p-3 rounded-xl flex items-center gap-2 font-medium shadow-lg animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5 text-xs">

        {/* Section 1: Application */}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Section 1: Application Preferences</span>
          </div>
          <div className="divide-y divide-slate-800">
            {/* App Language */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>App Language</span>
                  <span title="Select primary UI display language"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Choose preferred interface language</div>
              </div>
              <select
                value={settings.appLanguage}
                onChange={(e) => updateSetting('appLanguage', e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="English">English</option>
                <option value="Swahili">Swahili (Kiswahili)</option>
              </select>
            </div>

            {/* Business Currency */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Business Currency</span>
                  <span title="Set default shop currency for sales and inventory valuation"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Primary currency symbol and formatting</div>
              </div>
              <select
                value={settings.businessCurrency}
                onChange={(e) => updateSetting('businessCurrency', e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="KSh">KSh (Kenyan Shilling)</option>
                <option value="USD">USD ($ US Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
              </select>
            </div>

            {/* Decimal Places */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Decimal Places</span>
                  <span title="Number of decimal digits for currency and quantity precision"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Currency & quantity precision format</div>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 font-bold text-slate-100">
                <button
                  type="button"
                  onClick={() => updateSetting('decimalPlaces', Math.max(0, settings.decimalPlaces - 1))}
                  className="w-5 h-5 bg-slate-800 rounded-lg shadow-sm flex items-center justify-center hover:bg-slate-700 transition cursor-pointer text-slate-200"
                >
                  -
                </button>
                <span className="w-4 text-center">{settings.decimalPlaces}</span>
                <button
                  type="button"
                  onClick={() => updateSetting('decimalPlaces', Math.min(4, settings.decimalPlaces + 1))}
                  className="w-5 h-5 bg-slate-800 rounded-lg shadow-sm flex items-center justify-center hover:bg-slate-700 transition cursor-pointer text-slate-200"
                >
                  +
                </button>
              </div>
            </div>

            {/* Date Format */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Date Format</span>
                  <span title="Date display format across reports and invoices"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Transaction & report date layout</div>
              </div>
              <select
                value={settings.dateFormat}
                onChange={(e) => updateSetting('dateFormat', e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dd/MM/yyyy">dd/MM/yyyy (31/12/2026)</option>
                <option value="MM/dd/yyyy">MM/dd/yyyy (12/31/2026)</option>
                <option value="yyyy-MM-dd">yyyy-MM-dd (2026-12-31)</option>
              </select>
            </div>

            {/* Show warning for unsaved changes */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Show warning for unsaved changes</span>
                  <span title="Alert cashiers before navigating away from active uncompleted sale"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Alert cashiers before losing draft transactions</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showUnsavedWarning}
                  onChange={(e) => updateSetting('showUnsavedWarning', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Change App Theme */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Change App Theme</span>
                  <span title="Select visual skin and color profile"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">UI styling and visual appearance</div>
              </div>
              <select
                value={settings.appTheme}
                onChange={(e) => updateSetting('appTheme', e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Modern">Modern Light</option>
                <option value="Dark Mode Pro">Dark Mode Pro (Active)</option>
                <option value="Executive Blue">Executive Blue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Security */}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Section 2: Security & Authentication</span>
          </div>
          <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
            <div className="space-y-0.5 flex-1 pr-4">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Passcode / FingerPrint Lock</span>
                <span title="Require 4-digit PIN verification on app startup"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
              <div className="text-[11px] text-slate-400">Secure register access with a 4-digit PIN lock</div>
            </div>
            <div className="flex items-center gap-3">
              {settings.passcodeFingerprint && (
                <button
                  type="button"
                  onClick={() => setShowPinSetupModal(true)}
                  className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold hover:bg-amber-500/30 transition cursor-pointer"
                >
                  Change PIN
                </button>
              )}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.passcodeFingerprint}
                  onChange={(e) => {
                    const val = e.target.checked;
                    if (val) {
                      setShowPinSetupModal(true);
                    } else {
                      handleDisablePasscode();
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Multifirm */}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Section 3: Multifirm & Companies</span>
          </div>
          <button
            type="button"
            onClick={onOpenStoreManager}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-800/60 transition text-left cursor-pointer"
          >
            <div className="space-y-0.5 pr-4">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Multifirm Settings</span>
                <span title="Manage multiple store branches and distinct company ledgers"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
              <div className="text-[11px] text-slate-400">Configure multi-branch or multi-company accounts</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Section 4: Stock Transfer Between Stores */}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <span>Section 4: Inter-Store Logistics</span>
          </div>
          <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
            <div className="space-y-0.5 flex-1 pr-4">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Store management & Stock transfer</span>
                <span title="Enable inventory dispatches and stock transfers between store branches"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
              <div className="text-[11px] text-slate-400">Enable inter-store stock transfers & dispatches</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.stockTransferStores}
                onChange={(e) => updateSetting('stockTransferStores', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Section 5: Backup */}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            <span>Section 5: Data Backup & Cloud</span>
          </div>
          <button
            type="button"
            onClick={onOpenCloudSync}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-800/60 transition text-left cursor-pointer"
          >
            <div className="space-y-0.5 pr-4">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Backup Settings</span>
                <span title="Manage auto-backup frequency, Google Drive sync, and local export"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
              <div className="text-[11px] text-slate-400">Manage auto-backup, Google Drive sync, and JSON exports</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Section 6: More Transactions (Document Features) */}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Section 6: Document Features & Transactions</span>
          </div>
          <div className="divide-y divide-slate-800">
            {/* Estimate/Quotation */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Estimate / Quotation</span>
                  <span title="Enable generating pro-forma price estimates for customers"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Enable generating pro-forma price estimates</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.estimateQuotation}
                  onChange={(e) => updateSetting('estimateQuotation', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {/* Proforma Invoice */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Proforma Invoice</span>
                  <span title="Enable formal proforma invoice generation before final sale"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Enable formal proforma invoice generation</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.proformaInvoice}
                  onChange={(e) => updateSetting('proformaInvoice', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {/* Other Income */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Other Income</span>
                  <span title="Track non-retail income sources like rent, service fees, and commissions"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Track non-retail income sources (rent, services)</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.otherIncome}
                  onChange={(e) => updateSetting('otherIncome', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {/* Sale/Purchase Order */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Sale / Purchase Order</span>
                  <span title="Enable creation and tracking of SOs and POs"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Enable creation and tracking of SOs and POs</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.salePurchaseOrder}
                  onChange={(e) => updateSetting('salePurchaseOrder', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {/* Fixed Assets (FA) */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Fixed Assets (FA)</span>
                  <span title="Enable tracking shop equipment, computers, and asset depreciation"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Track equipment, computers & asset depreciation</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.fixedAssets}
                  onChange={(e) => updateSetting('fixedAssets', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {/* Delivery Note */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Delivery Note</span>
                  <span title="Enable delivery note creation during dispatch"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Enable delivery note creation during dispatch</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.deliveryNote}
                  onChange={(e) => updateSetting('deliveryNote', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {/* Goods Return on Delivery Note */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Goods Return on Delivery Note</span>
                  <span title="Allow immediate returns against delivery notes"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Allow immediate returns against delivery notes</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.goodsReturnOnDeliveryNote}
                  onChange={(e) => updateSetting('goodsReturnOnDeliveryNote', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {/* Print Amount on Note */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Print Amount on Note</span>
                  <span title="Toggle printing item monetary values on delivery/dispatch notes"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Toggle printing item monetary values on notes</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.printAmountOnNote}
                  onChange={(e) => updateSetting('printAmountOnNote', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>
          </div>
        </div>

      </div>

      {/* Set Your 4-Digit Register PIN Modal */}
      {showPinSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-scale-up text-slate-100">
            <div className="p-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Set Your 4-Digit Register PIN</h3>
                  <p className="text-[11px] text-slate-400">Secure register access with in-app PIN protection</p>
                </div>
              </div>
              <button
                onClick={() => setShowPinSetupModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePinSetup} className="p-6 space-y-4">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Enter 4-Digit PIN Code</label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold tracking-widest text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Cashiers will be required to enter this 4-digit PIN whenever unlocking the POS register.
                </p>
              </div>

              {pinError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-medium">
                  {pinError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinSetupModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Save Register PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
