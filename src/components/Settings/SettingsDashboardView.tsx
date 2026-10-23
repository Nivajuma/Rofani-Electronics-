import React, { useState, useEffect } from 'react';
import {
  Settings,
  Search,
  Building2,
  CreditCard,
  Printer,
  Percent,
  Users,
  Bell,
  UserCheck,
  Package,
  Coins,
  ChevronRight,
  X,
  Save,
  Check,
  ShieldCheck,
  Sliders,
  DollarSign,
  FileText
} from 'lucide-react';
import { Product, Customer, Supplier, Transaction, Expense, AttendanceRecord, User, StoreLocation } from '../../types';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import { ItemSettingsView } from './ItemSettingsView';

interface SettingsDashboardViewProps {
  products: Product[];
  categories: any[];
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  expenses: Expense[];
  attendanceRecords: AttendanceRecord[];
  allUsers: User[];
  stores?: StoreLocation[];
  onOpenStoreManager?: () => void;
  onImportData: (data: any) => void;
  displayTheme?: 'light' | 'dark' | 'contrast';
  onChangeDisplayTheme?: (theme: 'light' | 'dark' | 'contrast') => void;
  fontScale?: 'normal' | 'large';
  onChangeFontScale?: (scale: 'normal' | 'large') => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenCloudSync?: () => void;
  deviceFormat?: 'computer' | 'phone';
  onChangeDeviceFormat?: (format: 'computer' | 'phone') => void;
  requirePinOnStartup?: boolean;
  onToggleRequirePinOnStartup?: (require: boolean) => void;
  masterPin?: string;
  onUpdateMasterPin?: (newPin: string) => void;
  onLockNow?: () => void;
  onOpenAuditLogs?: () => void;
}

type SettingCategoryKey =
  | 'general'
  | 'transaction'
  | 'invoice'
  | 'taxes'
  | 'users'
  | 'reminders'
  | 'party'
  | 'inventory'
  | 'currency';

export const SettingsDashboardView: React.FC<SettingsDashboardViewProps> = ({
  products,
  customers,
  suppliers,
  allUsers,
  stores = [],
  onOpenStoreManager,
  displayTheme = 'light',
  onChangeDisplayTheme,
  fontScale = 'normal',
  onChangeFontScale,
  requirePinOnStartup = true,
  onToggleRequirePinOnStartup,
  masterPin = '1234',
  onUpdateMasterPin,
  onLockNow,
  onOpenAuditLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubPanel, setActiveSubPanel] = useState<SettingCategoryKey | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const triggerNotify = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Persistent settings states
  const [shopName, setShopName] = useState(() =>
    safeGetJSON<string>('rofani_settings_shop_name', 'Rofani Electronics & Boutique')
  );
  useEffect(() => { safeSetJSON('rofani_settings_shop_name', shopName); }, [shopName]);

  const [branchLocation, setBranchLocation] = useState(() =>
    safeGetJSON<string>('rofani_settings_branch', 'Main Store - Nairobi CBD')
  );
  useEffect(() => { safeSetJSON('rofani_settings_branch', branchLocation); }, [branchLocation]);

  const [receiptFooter, setReceiptFooter] = useState(() =>
    safeGetJSON<string>('rofani_settings_footer', 'Goods once sold are non-returnable after 7 days. Thank you for shopping with Rofani!')
  );
  useEffect(() => { safeSetJSON('rofani_settings_footer', receiptFooter); }, [receiptFooter]);

  const [storePhone, setStorePhone] = useState(() =>
    safeGetJSON<string>('rofani_settings_phone', '+254 700 000 000')
  );
  useEffect(() => { safeSetJSON('rofani_settings_phone', storePhone); }, [storePhone]);

  // Transaction settings
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(() =>
    safeGetJSON<string>('rofani_settings_default_payment', 'mpesa')
  );
  useEffect(() => { safeSetJSON('rofani_settings_default_payment', defaultPaymentMethod); }, [defaultPaymentMethod]);

  const [autoPrintReceipt, setAutoPrintReceipt] = useState(() =>
    safeGetJSON<boolean>('rofani_settings_auto_print', true)
  );
  useEffect(() => { safeSetJSON('rofani_settings_auto_print', autoPrintReceipt); }, [autoPrintReceipt]);

  const [defaultSalesRep, setDefaultSalesRep] = useState(() =>
    safeGetJSON<string>('rofani_settings_default_rep', 'Any Available Cashier')
  );
  useEffect(() => { safeSetJSON('rofani_settings_default_rep', defaultSalesRep); }, [defaultSalesRep]);

  // Invoice Print settings
  const [paperSize, setPaperSize] = useState(() =>
    safeGetJSON<string>('rofani_settings_paper_size', '58mm')
  );
  useEffect(() => { safeSetJSON('rofani_settings_paper_size', paperSize); }, [paperSize]);

  const [showLogoOnReceipt, setShowLogoOnReceipt] = useState(() =>
    safeGetJSON<boolean>('rofani_settings_show_logo', true)
  );
  useEffect(() => { safeSetJSON('rofani_settings_show_logo', showLogoOnReceipt); }, [showLogoOnReceipt]);

  const [customHeader, setCustomHeader] = useState(() =>
    safeGetJSON<string>('rofani_settings_custom_header', 'ROFANI OFFICIAL RECEIPT')
  );
  useEffect(() => { safeSetJSON('rofani_settings_custom_header', customHeader); }, [customHeader]);

  // Taxes settings
  const [kraTotRate, setKraTotRate] = useState(() =>
    safeGetJSON<number>('rofani_settings_tot_rate', 1.5)
  );
  useEffect(() => { safeSetJSON('rofani_settings_tot_rate', kraTotRate); }, [kraTotRate]);

  const [enableVat, setEnableVat] = useState(() =>
    safeGetJSON<boolean>('rofani_settings_enable_vat', false)
  );
  useEffect(() => { safeSetJSON('rofani_settings_enable_vat', enableVat); }, [enableVat]);

  const [pricingMode, setPricingMode] = useState(() =>
    safeGetJSON<string>('rofani_settings_pricing_mode', 'tax_inclusive')
  );
  useEffect(() => { safeSetJSON('rofani_settings_pricing_mode', pricingMode); }, [pricingMode]);

  // Reminders & Notifications
  const [lowStockThreshold, setLowStockThreshold] = useState(() =>
    safeGetJSON<number>('rofani_settings_low_stock_threshold', 5)
  );
  useEffect(() => { safeSetJSON('rofani_settings_low_stock_threshold', lowStockThreshold); }, [lowStockThreshold]);

  const [enableRestockAlerts, setEnableRestockAlerts] = useState(() =>
    safeGetJSON<boolean>('rofani_settings_restock_alerts', true)
  );
  useEffect(() => { safeSetJSON('rofani_settings_restock_alerts', enableRestockAlerts); }, [enableRestockAlerts]);

  // Party / Customer Management
  const [defaultCustomerType, setDefaultCustomerType] = useState(() =>
    safeGetJSON<string>('rofani_settings_default_cust_type', 'Walk-in')
  );
  useEffect(() => { safeSetJSON('rofani_settings_default_cust_type', defaultCustomerType); }, [defaultCustomerType]);

  const [defaultCreditLimit, setDefaultCreditLimit] = useState(() =>
    safeGetJSON<number>('rofani_settings_default_credit_limit', 10000)
  );
  useEffect(() => { safeSetJSON('rofani_settings_default_credit_limit', defaultCreditLimit); }, [defaultCreditLimit]);

  // Item / Inventory Defaults
  const [defaultUnitCategory, setDefaultUnitCategory] = useState(() =>
    safeGetJSON<string>('rofani_settings_default_unit', 'pcs')
  );
  useEffect(() => { safeSetJSON('rofani_settings_default_unit', defaultUnitCategory); }, [defaultUnitCategory]);

  // Multi-Currency
  const [primaryCurrency, setPrimaryCurrency] = useState(() =>
    safeGetJSON<string>('rofani_settings_currency', 'KES (KSh)')
  );
  useEffect(() => { safeSetJSON('rofani_settings_currency', primaryCurrency); }, [primaryCurrency]);

  const settingsMenuItems = [
    {
      id: 'general' as SettingCategoryKey,
      icon: Building2,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      title: 'General',
      description: 'Shop Name, Branch Location, Receipt Footer Note, Store Contact details.',
      keywords: ['shop', 'name', 'branch', 'location', 'footer', 'contact', 'phone']
    },
    {
      id: 'transaction' as SettingCategoryKey,
      icon: CreditCard,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      title: 'Transaction',
      description: 'Default payment methods (Cash, M-PESA STK), auto-print receipt toggle, default sales rep settings.',
      keywords: ['payment', 'cash', 'mpesa', 'receipt', 'print', 'sales rep', 'transaction']
    },
    {
      id: 'invoice' as SettingCategoryKey,
      icon: Printer,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      title: 'Invoice Print',
      description: 'Paper size selection (58mm thermal vs 80mm vs A4 PDF), shop logo display toggle, custom header/footer text.',
      keywords: ['invoice', 'print', 'paper', '58mm', '80mm', 'a4', 'logo', 'thermal']
    },
    {
      id: 'taxes' as SettingCategoryKey,
      icon: Percent,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      title: 'Taxes',
      description: 'KRA Turnover Tax (1.5% TOT) toggle/rate, VAT configuration, tax-inclusive vs tax-exclusive pricing defaults.',
      keywords: ['tax', 'kra', 'tot', 'vat', 'inclusive', 'exclusive', 'pricing']
    },
    {
      id: 'users' as SettingCategoryKey,
      icon: Users,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      title: 'User Management',
      description: 'Add/edit cashiers, set roles (Admin vs Cashier), assign commission percentages.',
      keywords: ['user', 'cashier', 'admin', 'role', 'commission', 'staff']
    },
    {
      id: 'reminders' as SettingCategoryKey,
      icon: Bell,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      title: 'Reminders & Notifications',
      description: 'Low stock alerts threshold, stock reorder notifications.',
      keywords: ['reminder', 'notification', 'low stock', 'alert', 'reorder']
    },
    {
      id: 'party' as SettingCategoryKey,
      icon: UserCheck,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      title: 'Party / Customer Management',
      description: 'Walk-in vs registered customer profiles, credit limit settings.',
      keywords: ['customer', 'party', 'walk-in', 'credit', 'limit']
    },
    {
      id: 'inventory' as SettingCategoryKey,
      icon: Package,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
      title: 'Item / Inventory Defaults',
      description: 'Default unit categories, low stock trigger numbers.',
      keywords: ['item', 'inventory', 'unit', 'category', 'trigger', 'stock']
    },
    {
      id: 'currency' as SettingCategoryKey,
      icon: Coins,
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      title: 'Multi-Currency / Currency',
      description: 'Primary currency (KSh / KES) and formatting preferences.',
      keywords: ['currency', 'ksh', 'kes', 'money', 'format']
    }
  ];

  const filteredItems = settingsMenuItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Executive Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-inner">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100">Store Settings & Preferences</h2>
            <p className="text-xs text-slate-400">
              Configure Rofani Electronics & Boutique executive preferences, tax defaults, and POS terminals
            </p>
          </div>
        </div>

        {/* Top Search Bar */}
        <div className="w-full md:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings (e.g. Tax, M-Pesa)..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
          />
        </div>
      </div>

      {/* Success Toast Notification */}
      {successToast && (
        <div className="bg-emerald-900/80 border border-emerald-500/50 text-emerald-200 text-xs p-3.5 rounded-xl flex items-center gap-2 font-medium shadow-lg">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Settings Menu List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-800/80">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No setting options matched "{searchQuery}". Try a different keyword.
          </div>
        ) : (
          filteredItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSubPanel(item.id)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between hover:bg-slate-800/60 transition group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition group-hover:scale-105 ${item.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-lg bg-slate-800/80 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {activeSubPanel === 'inventory' && (
        <div className="fixed inset-0 z-50 bg-[#F1F5F9] overflow-y-auto">
          <ItemSettingsView onBack={() => setActiveSubPanel(null)} />
        </div>
      )}

      {/* Sub-Panel Modal Overlay */}
      {activeSubPanel && activeSubPanel !== 'inventory' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100 capitalize">
                    {(activeSubPanel as string) === 'general' && '⚙️ General Shop Settings'}
                    {(activeSubPanel as string) === 'transaction' && '💱 Transaction & POS Settings'}
                    {(activeSubPanel as string) === 'invoice' && '🖨️ Invoice & Receipt Print Settings'}
                    {(activeSubPanel as string) === 'taxes' && '% Taxes & KRA Configuration'}
                    {(activeSubPanel as string) === 'users' && '👥 User Management & Roles'}
                    {(activeSubPanel as string) === 'reminders' && '🔔 Reminders & Low Stock Alerts'}
                    {(activeSubPanel as string) === 'party' && '🤝 Party & Customer Management'}
                    {(activeSubPanel as string) === 'inventory' && '📦 Item & Inventory Defaults'}
                    {(activeSubPanel as string) === 'currency' && '🪙 Multi-Currency & Formatting'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure parameters and save changes instantly</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubPanel(null)}
                className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Inputs */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-slate-300">
              {activeSubPanel === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Shop Name</label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Branch Location</label>
                    <input
                      type="text"
                      value={branchLocation}
                      onChange={(e) => setBranchLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Store Contact Phone</label>
                    <input
                      type="text"
                      value={storePhone}
                      onChange={(e) => setStorePhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Receipt Footer Note</label>
                    <textarea
                      rows={3}
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {activeSubPanel === 'transaction' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Default Payment Method</label>
                    <select
                      value={defaultPaymentMethod}
                      onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      <option value="mpesa">M-PESA STK / Till</option>
                      <option value="cash">Cash</option>
                      <option value="card">Credit Card / POS</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <div className="font-bold text-slate-100">Auto-Print Receipt on Sale Completion</div>
                      <div className="text-[11px] text-slate-400">Trigger thermal print dialog automatically after checkout</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoPrintReceipt}
                        onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Default Sales Representative</label>
                    <input
                      type="text"
                      value={defaultSalesRep}
                      onChange={(e) => setDefaultSalesRep(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {activeSubPanel === 'invoice' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Receipt Paper Size</label>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    >
                      <option value="58mm">58mm Thermal Receipt Printer</option>
                      <option value="80mm">80mm Thermal Receipt Printer</option>
                      <option value="a4">A4 PDF Invoice Sheet</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <div className="font-bold text-slate-100">Display Shop Logo / Branding on Receipt</div>
                      <div className="text-[11px] text-slate-400">Include store watermark at top of printed receipt</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLogoOnReceipt}
                        onChange={(e) => setShowLogoOnReceipt(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Custom Header Title</label>
                    <input
                      type="text"
                      value={customHeader}
                      onChange={(e) => setCustomHeader(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {activeSubPanel === 'taxes' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">KRA Turnover Tax (TOT) Rate %</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={kraTotRate}
                        onChange={(e) => setKraTotRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-amber-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <div className="font-bold text-slate-100">Enable VAT (Value Added Tax 16%)</div>
                      <div className="text-[11px] text-slate-400">Calculate Kenya VAT on applicable electronic items</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableVat}
                        onChange={(e) => setEnableVat(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Catalog Pricing Default</label>
                    <select
                      value={pricingMode}
                      onChange={(e) => setPricingMode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      <option value="tax_inclusive">Tax Inclusive (Prices include TOT/VAT)</option>
                      <option value="tax_exclusive">Tax Exclusive (Add tax at checkout)</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSubPanel === 'users' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div className="font-bold text-slate-100 mb-1">Active Cashiers & Staff ({allUsers.length})</div>
                    <p className="text-[11px] text-slate-400">
                      Manage staff roles (Admin vs Cashier) and sales commission rates in the Attendance & Staff Management tab.
                    </p>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                        <div>
                          <div className="font-bold text-slate-200">{u.name}</div>
                          <div className="text-[10px] text-slate-400">{u.role} • {u.phone || 'No phone'}</div>
                        </div>
                        <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2.5 py-1 rounded-full font-mono font-bold">
                          Commission: {u.commissionRate ?? 2}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSubPanel === 'reminders' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Low Stock Alert Threshold (Units)</label>
                    <input
                      type="number"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Items with stock count at or below this number trigger low stock alerts.</p>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <div className="font-bold text-slate-100">Stock Reorder Notifications</div>
                      <div className="text-[11px] text-slate-400">Show restocking prompt when items run low</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableRestockAlerts}
                        onChange={(e) => setEnableRestockAlerts(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {activeSubPanel === 'party' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Default Customer Profile Type</label>
                    <select
                      value={defaultCustomerType}
                      onChange={(e) => setDefaultCustomerType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Walk-in">Walk-in Customer</option>
                      <option value="Registered">Registered Member</option>
                      <option value="Wholesale">Wholesale Partner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Default Customer Credit Limit (KSh)</label>
                    <input
                      type="number"
                      value={defaultCreditLimit}
                      onChange={(e) => setDefaultCreditLimit(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-indigo-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}



              {activeSubPanel === 'currency' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Primary Currency & Formatting</label>
                    <select
                      value={primaryCurrency}
                      onChange={(e) => setPrimaryCurrency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-yellow-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="KES (KSh)">KES (KSh) - Kenyan Shilling</option>
                      <option value="USD ($)">USD ($) - US Dollar</option>
                      <option value="EUR (€)">EUR (€) - Euro</option>
                    </select>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <p className="text-[11px] text-slate-400">
                      All POS receipts, totals, and cost reports will format in {primaryCurrency}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Save Changes Button */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveSubPanel(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerNotify('Settings updated and saved successfully!');
                  setActiveSubPanel(null);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
