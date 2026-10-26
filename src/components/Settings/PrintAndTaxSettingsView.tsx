import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Info,
  Check,
  Printer,
  Percent,
  FileText,
  ShieldCheck,
  Bluetooth,
  Sliders
} from 'lucide-react';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';

interface PrintAndTaxSettingsViewProps {
  onBack: () => void;
}

export interface PrintAndTaxSettingsState {
  // Section 1: Invoice & Receipt Design
  paperSize: '58mm' | '80mm' | 'a4';
  showStoreLogo: boolean;
  printAddressContact: boolean;
  customHeaderNote: string;
  customFooterNote: string;
  showBarcodeQR: boolean;

  // Section 2: Taxes & KRA Compliance
  enableKraTot: boolean;
  kraTotRate: number;
  enableVat: boolean;
  vatRate: number;
  taxCalculationType: 'inclusive' | 'exclusive';
  kraPinNumber: string;
  showTaxBreakdown: boolean;
}

export const PRINT_AND_TAX_SETTINGS_DEFAULT: PrintAndTaxSettingsState = {
  paperSize: '58mm',
  showStoreLogo: true,
  printAddressContact: true,
  customHeaderNote: 'Rofani Electronics & Boutique - Kengeleni, Mombasa',
  customFooterNote: 'Thank you for shopping with us! Goods once sold are not returnable after 7 days.',
  showBarcodeQR: true,
  enableKraTot: true,
  kraTotRate: 1.5,
  enableVat: false,
  vatRate: 16.0,
  taxCalculationType: 'inclusive',
  kraPinNumber: 'P051234567X',
  showTaxBreakdown: true,
};

export const PrintAndTaxSettingsView: React.FC<PrintAndTaxSettingsViewProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [printerConnected, setPrinterConnected] = useState(false);

  const [settings, setSettings] = useState<PrintAndTaxSettingsState>(() =>
    safeGetJSON<PrintAndTaxSettingsState>('printAndTaxSettings', PRINT_AND_TAX_SETTINGS_DEFAULT)
  );

  useEffect(() => {
    safeSetJSON('printAndTaxSettings', settings);
  }, [settings]);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const updateSetting = <K extends keyof PrintAndTaxSettingsState>(
    key: K,
    value: PrintAndTaxSettingsState[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    triggerToast('Print & Tax settings updated successfully!');
  };

  const handleConnectPrinter = () => {
    triggerToast('Searching for nearby Bluetooth thermal printers...');
    setTimeout(() => {
      setPrinterConnected(true);
      triggerToast('Connected successfully to POS-Thermal-BT-80mm!');
    }, 1500);
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
            <h1 className="font-bold text-base sm:text-lg tracking-tight">Print & Tax Settings</h1>
            <p className="text-[10px] text-slate-400">Receipt Design & KRA Compliance Rules</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-44 sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search print & tax options..."
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

        {/* Section 1: Invoice & Receipt Design (Print Settings) */}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Printer className="w-4 h-4 text-purple-400" />
            <span>Section 1: Invoice & Receipt Design (Print Settings)</span>
          </div>

          <div className="divide-y divide-slate-800">
            {/* Paper Size / Format Radio Selector */}
            <div className="p-4 space-y-3">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Paper Size / Format</span>
                <span title="Select thermal receipt or A4 full sheet printer paper format"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '58mm', label: '58mm Thermal', desc: 'Compact mobile POS' },
                  { id: '80mm', label: '80mm Thermal', desc: 'Standard counter POS' },
                  { id: 'a4', label: 'A4 Full Sheet', desc: 'Detailed PDF invoice' },
                ].map((paper) => (
                  <button
                    key={paper.id}
                    type="button"
                    onClick={() => updateSetting('paperSize', paper.id as any)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      settings.paperSize === paper.id
                        ? 'border-purple-500 bg-purple-950/60 text-purple-200 font-bold shadow-sm'
                        : 'border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold">{paper.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{paper.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Show Store Logo on Print */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Show Store Logo on Print</span>
                  <span title="Include store logo at the top header of customer receipts"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Include brand logo at the top header of receipts</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showStoreLogo}
                  onChange={(e) => updateSetting('showStoreLogo', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Print Shop Address & Contact Details */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Print Shop Address & Contact Details</span>
                  <span title="Include phone number, email, and location in header"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Include phone number, email & physical store location</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.printAddressContact}
                  onChange={(e) => updateSetting('printAddressContact', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Custom Receipt Header Note */}
            <div className="p-4 space-y-1.5">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Custom Receipt Header Note</span>
                <span title="Custom greeting or branch title printed right below store name"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
              <input
                type="text"
                value={settings.customHeaderNote}
                onChange={(e) => updateSetting('customHeaderNote', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="E.g. Rofani Electronics - Main Branch"
              />
            </div>

            {/* Custom Receipt Footer Note */}
            <div className="p-4 space-y-1.5">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Custom Receipt Footer Note</span>
                <span title="Return policy and thank you message printed at the bottom of receipts"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
              <textarea
                rows={2}
                value={settings.customFooterNote}
                onChange={(e) => updateSetting('customFooterNote', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="E.g. Thank you for shopping with us!"
              />
            </div>

            {/* Show Barcode / QR Code on Invoice */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Show Barcode / QR Code on Invoice</span>
                  <span title="Print transaction verification barcode/QR code at receipt bottom"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Print transaction verification QR / Barcode at receipt bottom</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showBarcodeQR}
                  onChange={(e) => updateSetting('showBarcodeQR', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Thermal Printer Connection Button */}
            <div className="p-4 flex items-center justify-between bg-purple-950/40">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-100">Thermal Printer Connection</div>
                <div className="text-[11px] text-slate-400">
                  {printerConnected ? 'Connected (POS-Thermal-BT-80mm)' : 'No Bluetooth printer paired'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleConnectPrinter}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Bluetooth className="w-4 h-4" />
                <span>{printerConnected ? 'Printer Connected ✓' : 'Connect Bluetooth Printer'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Taxes & KRA Compliance Settings */}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-400" />
            <span>Section 2: Taxes & KRA Compliance Settings</span>
          </div>

          <div className="divide-y divide-slate-800">
            {/* Enable KRA Turnover Tax (TOT) */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="font-bold text-slate-100 flex items-center gap-1.5">
                    <span>Enable KRA Turnover Tax (TOT)</span>
                    <span title="Kenyan Revenue Authority Turnover Tax rate configuration"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                  </div>
                  <div className="text-[11px] text-slate-400">Apply standard KRA turnover tax on retail transactions</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableKraTot}
                    onChange={(e) => updateSetting('enableKraTot', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {settings.enableKraTot && (
                <div className="flex items-center gap-3 pt-2 pl-2">
                  <label className="font-semibold text-slate-300">TOT Rate (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.kraTotRate}
                    onChange={(e) => updateSetting('kraTotRate', parseFloat(e.target.value) || 0)}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Enable VAT */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="font-bold text-slate-100 flex items-center gap-1.5">
                    <span>Enable VAT (Value Added Tax)</span>
                    <span title="Standard VAT rate calculation for registered businesses"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                  </div>
                  <div className="text-[11px] text-slate-400">Apply standard VAT rate on taxable catalog items</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableVat}
                    onChange={(e) => updateSetting('enableVat', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {settings.enableVat && (
                <div className="flex items-center gap-3 pt-2 pl-2">
                  <label className="font-semibold text-slate-300">VAT Rate (%):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.vatRate}
                    onChange={(e) => updateSetting('vatRate', parseFloat(e.target.value) || 0)}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Tax Calculation Type */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Tax Calculation Type</span>
                  <span title="Choose whether catalog prices already include tax or add tax at checkout"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Tax-inclusive vs tax-exclusive pricing mode</div>
              </div>
              <select
                value={settings.taxCalculationType}
                onChange={(e) => updateSetting('taxCalculationType', e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="inclusive">Tax Inclusive (Prices include tax)</option>
                <option value="exclusive">Tax Exclusive (Add tax at checkout)</option>
              </select>
            </div>

            {/* Tax Identification Number (KRA PIN) */}
            <div className="p-4 space-y-1.5">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Tax Identification Number (KRA PIN)</span>
                <span title="Enter business KRA PIN to display on official tax invoices"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
              <input
                type="text"
                value={settings.kraPinNumber}
                onChange={(e) => updateSetting('kraPinNumber', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="E.g. P051234567X"
              />
            </div>

            {/* Show Tax Breakdown on Receipt */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Show Tax Breakdown on Receipt</span>
                  <span title="Display separate tax line items (Subtotal, Tax Amount, Grand Total)"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Display separate tax line items on customer receipts</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showTaxBreakdown}
                  onChange={(e) => updateSetting('showTaxBreakdown', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
