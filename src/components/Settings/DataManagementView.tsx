import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  HardDrive,
  Save,
  ShieldCheck,
  Building2,
  Receipt,
  FileJson,
  Palette,
  Sun,
  Moon,
  Monitor,
  LayoutGrid,
  ZoomIn,
  PanelLeft,
  PanelLeftClose,
  Maximize2,
  ExternalLink,
  Sparkles,
  Cloud,
  Share2,
  Smartphone,
  Lock,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { Product, Customer, Supplier, Transaction, Expense, AttendanceRecord, User } from '../../types';
import { detectDuplicateProducts, deduplicateProducts } from '../../utils/deduplicate';

interface DataManagementViewProps {
  products: Product[];
  categories: any[];
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  expenses: Expense[];
  attendanceRecords: AttendanceRecord[];
  allUsers: User[];
  onImportData: (data: any) => void;
  onResetSampleData: () => void;
  onClearTransactions: () => void;
  onClearExpenses: () => void;
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

export const DataManagementView: React.FC<DataManagementViewProps> = ({
  products,
  categories,
  customers,
  suppliers,
  transactions,
  expenses,
  attendanceRecords,
  allUsers,
  onImportData,
  onResetSampleData,
  onClearTransactions,
  onClearExpenses,
  displayTheme = 'light',
  onChangeDisplayTheme,
  fontScale = 'normal',
  onChangeFontScale,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenCloudSync,
  deviceFormat = 'computer',
  onChangeDeviceFormat,
  requirePinOnStartup = true,
  onToggleRequirePinOnStartup,
  masterPin = '1234',
  onUpdateMasterPin,
  onLockNow,
  onOpenAuditLogs,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Store Master PIN edit state
  const [inputMasterPin, setInputMasterPin] = useState(masterPin);
  const [showMasterPin, setShowMasterPin] = useState(false);

  // Business settings state stored in local state for header/receipt customization
  const [storeName, setStoreName] = useState('ROFANI ELECTRONICS & BOUTIQUE');
  const [kraPin, setKraPin] = useState('P051234567X');
  const [storePhone, setStorePhone] = useState('+254 700 000 000');
  const [paybillTillNumber, setPaybillTillNumber] = useState('522522 / Till 890123');
  const [kraTaxRate, setKraTaxRate] = useState(1.5);
  const [isSavedSettings, setIsSavedSettings] = useState(false);

  // Confirm dialogs state
  const [confirmModal, setConfirmModal] = useState<'reset' | 'clear_tx' | 'clear_exp' | null>(null);

  const triggerNotify = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // 1. Export entire database to JSON
  const handleExportFullDatabaseJSON = () => {
    const fullBackup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      storeInfo: {
        name: storeName,
        kraPin,
        phone: storePhone,
        paybillTillNumber,
        kraTaxRate
      },
      data: {
        products,
        categories,
        customers,
        suppliers,
        transactions,
        expenses,
        attendanceRecords,
        allUsers
      }
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(fullBackup, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `Rofani_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    triggerNotify('Full JSON database backup downloaded successfully!');
  };

  // 2. Export Products as CSV
  const handleExportProductsCSV = () => {
    let csv = 'ID,Name,Category,SKU,Barcode,CostPrice(KSh),SellingPrice(KSh),StockQuantity,Unit,Supplier\n';
    products.forEach((p) => {
      csv += `"${p.id}","${p.name.replace(/"/g, '""')}","${p.category}","${p.sku || ''}","${p.barcode || ''}",${p.costPrice},${p.sellingPrice},${p.stockQuantity},"${p.unit}","${p.supplierId || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rofani_Products_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerNotify('Products CSV export generated successfully!');
  };

  // 3. Export Sales Transactions CSV
  const handleExportTransactionsCSV = () => {
    let csv = 'ReceiptNumber,Date,Customer,ItemsCount,Subtotal(KSh),Discount(KSh),GrandTotal(KSh),AmountPaid(KSh),BalanceDue(KSh),Status,PaymentMethods\n';
    transactions.forEach((tx) => {
      const pm = tx.payments.map((p) => `${p.method}:${p.amount}`).join(';');
      csv += `"${tx.receiptNumber}","${tx.date}","${tx.customerName || 'Walk-in'}",${tx.items.length},${tx.subtotal},${tx.discountTotal},${tx.grandTotal},${tx.amountPaid},${tx.balanceDue},"${tx.paymentStatus}","${pm}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rofani_Sales_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerNotify('Sales Transactions CSV export generated successfully!');
  };

  // 4. Import / Restore JSON Backup
  const handleImportJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.data || parsed.products)) {
          const importPayload = parsed.data || parsed;
          onImportData(importPayload);
          if (parsed.storeInfo) {
            if (parsed.storeInfo.name) setStoreName(parsed.storeInfo.name);
            if (parsed.storeInfo.kraPin) setKraPin(parsed.storeInfo.kraPin);
            if (parsed.storeInfo.phone) setStorePhone(parsed.storeInfo.phone);
            if (parsed.storeInfo.paybillTillNumber) setPaybillTillNumber(parsed.storeInfo.paybillTillNumber);
          }
          triggerNotify('Data database restored successfully!');
        } else {
          setErrorMessage('Invalid backup file format. Expected a valid JSON database.');
        }
      } catch (err) {
        setErrorMessage('Failed to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavedSettings(true);
    triggerNotify('Store Tax & Profile Settings updated!');
    setTimeout(() => setIsSavedSettings(false), 3000);
  };

  // Calculate system storage metrics
  const totalDbRecords =
    products.length +
    categories.length +
    customers.length +
    suppliers.length +
    transactions.length +
    expenses.length +
    attendanceRecords.length;

  const estimatedStorageKb = Math.round(
    JSON.stringify({ products, transactions, customers, suppliers, expenses, attendanceRecords }).length / 1024
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100">Data Management & System Settings</h2>
            <p className="text-xs text-slate-400">
              Export/Import backups, customize KRA tax details, manage store data purges & storage footprint
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="w-4 h-4" /> System Healthy ({totalDbRecords} Records)
          </span>
        </div>
      </div>

      {/* Success / Error Toast Alerts */}
      {successMessage && (
        <div className="bg-emerald-900/60 border border-emerald-500/50 text-emerald-200 text-xs p-3.5 rounded-xl flex items-center gap-2 font-medium">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Real-Time Cloud Synchronization & Worker Phone Sharing Highlight Card */}
      <div className="bg-gradient-to-r from-sky-900/90 via-blue-900/90 to-indigo-900/90 border border-sky-500/40 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 bg-sky-500/20 text-sky-300 rounded-xl flex items-center justify-center border border-sky-400/40 shrink-0">
            <Cloud className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">Live Multi-Phone Cloud Synchronization</h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Firebase Realtime Active
              </span>
            </div>
            <p className="text-xs text-sky-200 mt-1 max-w-2xl">
              All inventory, prices, sales, and stock counts automatically sync in real-time across every worker's phone or computer. Share the app URL or QR code with staff to keep everyone in sync.
            </p>
          </div>
        </div>

        {onOpenCloudSync && (
          <button
            type="button"
            onClick={onOpenCloudSync}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span>Open Sync & Share Hub</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="bg-rose-900/60 border border-rose-500/50 text-rose-200 text-xs p-3.5 rounded-xl flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Settings & Backup Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Display Appearance & Business Profile */}
        <div className="lg:col-span-1 space-y-6">
          {/* Display & Appearance Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Palette className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-sm text-slate-800">Display Appearance & Layout</h3>
            </div>

            {/* Theme Mode Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Display Theme Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChangeDisplayTheme?.('light');
                    triggerNotify('Display theme changed to Light Mode');
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition gap-1.5 ${
                    displayTheme === 'light'
                      ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onChangeDisplayTheme?.('dark');
                    triggerNotify('Display theme changed to Dark Mode');
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition gap-1.5 ${
                    displayTheme === 'dark'
                      ? 'bg-slate-900 border-slate-800 text-white font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Moon className="w-4 h-4 text-sky-400" />
                  <span>Dark Slate</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onChangeDisplayTheme?.('contrast');
                    triggerNotify('Display theme changed to High Contrast');
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition gap-1.5 ${
                    displayTheme === 'contrast'
                      ? 'bg-indigo-950 border-indigo-600 text-amber-300 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-amber-400" />
                  <span>Contrast</span>
                </button>
              </div>
            </div>

            {/* Font / Touch Scale */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">UI & Font Density</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChangeFontScale?.('normal');
                    triggerNotify('UI font density set to Standard');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    fontScale === 'normal'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Standard (100%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onChangeFontScale?.('large');
                    triggerNotify('UI font density set to Touch Friendly / Large');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    fontScale === 'large'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Touch Large (+15%)</span>
                </button>
              </div>
            </div>

            {/* Display Layout / Format: Full Version vs Mobile Frame */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">Display Layout & View Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-settings-switch-to-computer"
                  onClick={() => {
                    onChangeDeviceFormat?.('computer');
                    triggerNotify('Switched to Full Version (Computer / Desktop)');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    deviceFormat === 'computer'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-blue-300" />
                  <span>Full PC View</span>
                </button>

                <button
                  type="button"
                  id="btn-settings-switch-to-phone"
                  onClick={() => {
                    onChangeDeviceFormat?.('phone');
                    triggerNotify('Switched to Mobile Phone Format');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    deviceFormat === 'phone'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Mobile Phone View</span>
                </button>
              </div>
            </div>

            {/* Layout Canvas Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">Display Layout Shortcuts</label>
              <div className="space-y-1.5 text-xs">
                {onToggleSidebar && (
                  <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-slate-800 font-semibold transition"
                  >
                    <div className="flex items-center gap-2">
                      {isSidebarCollapsed ? <PanelLeft className="w-4 h-4 text-blue-600" /> : <PanelLeftClose className="w-4 h-4 text-slate-500" />}
                      <span>{isSidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Sidebar for Full Workspace'}</span>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    } else if (document.exitFullscreen) {
                      document.exitFullscreen();
                    }
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-slate-800 font-semibold transition"
                >
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-blue-600" />
                    <span>Toggle Fullscreen Display Mode</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-slate-800 font-semibold transition"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    <span>Open in Full Unframed Window Tab</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Business Profile */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-800">Business & KRA Tax Profile</h3>
            </div>

          <form onSubmit={handleSaveStoreSettings} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">KRA PIN Number</label>
              <input
                type="text"
                value={kraPin}
                onChange={(e) => setKraPin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. P051234567X"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">KRA Turnover Tax (TOT) Rate %</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={kraTaxRate}
                  onChange={(e) => setKraTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-amber-600 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Standard Kenya KRA TOT rate is 1.5% for sales &lt; KSh 25M</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Store Phone / M-Pesa Contact</label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">M-Pesa Paybill / Till Number</label>
              <input
                type="text"
                value={paybillTillNumber}
                onChange={(e) => setPaybillTillNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 mt-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSavedSettings ? 'Settings Saved!' : 'Save Profile & Tax Settings'}</span>
            </button>
          </form>
        </div>

        {/* Terminal Login PIN & Sharing Security Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">Login PIN & Sharing Security</h3>
              <p className="text-[11px] text-slate-400">Lock app with PIN before sharing with workers</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Require PIN on Startup Toggle */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <span>Require Login PIN on Startup</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requirePinOnStartup}
                    onChange={(e) => {
                      onToggleRequirePinOnStartup?.(e.target.checked);
                      triggerNotify(
                        e.target.checked
                          ? 'Login PIN required on app load enabled!'
                          : 'PIN requirement on load disabled'
                      );
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                When active, anyone opening the app or sharing link must enter a security PIN before accessing your store.
              </p>
            </div>

            {/* Store Master PIN Settings */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700">Store Master PIN Code</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showMasterPin ? 'text' : 'password'}
                    maxLength={8}
                    value={inputMasterPin}
                    onChange={(e) => setInputMasterPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPin(!showMasterPin)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showMasterPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (inputMasterPin.length < 4) {
                      setErrorMessage('Master PIN must be at least 4 digits.');
                      return;
                    }
                    onUpdateMasterPin?.(inputMasterPin);
                    triggerNotify('Master Store PIN updated successfully.');
                  }}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  Save PIN
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Staff can also authenticate using their own individual worker security PINs.
              </p>
            </div>

            {/* Lock Now Button */}
            {onLockNow && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-settings-lock-terminal"
                  onClick={onLockNow}
                  className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock Terminal Now (Before Sharing)</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-1.5">
                  Locks the screen instantly so you can pass your phone or computer safely.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Middle Column: Export & Import Center */}
        <div className="lg:col-span-2 space-y-6">
          {/* Backup & Export Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Export & Backup Database</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                ~{estimatedStorageKb} KB
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Download complete, unencrypted backups of your system state. You can restore this file at any time on any computer or store terminal.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleExportFullDatabaseJSON}
                className="bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-xl transition text-left space-y-1.5 shadow-sm border border-slate-800 group"
              >
                <div className="flex items-center justify-between">
                  <FileJson className="w-5 h-5 text-sky-400 group-hover:scale-110 transition" />
                  <span className="text-[10px] font-mono text-slate-400">JSON</span>
                </div>
                <div className="font-bold text-xs text-slate-100">Full System Backup</div>
                <div className="text-[10px] text-slate-400">Products, Sales, Customers & Expenses</div>
              </button>

              <button
                onClick={handleExportProductsCSV}
                className="bg-slate-50 hover:bg-slate-100 text-slate-800 p-3.5 rounded-xl border border-slate-200 transition text-left space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
                  <span className="text-[10px] font-mono text-slate-400">CSV</span>
                </div>
                <div className="font-bold text-xs text-slate-800">Products Inventory CSV</div>
                <div className="text-[10px] text-slate-500">{products.length} SKU items list</div>
              </button>

              <button
                onClick={handleExportTransactionsCSV}
                className="bg-slate-50 hover:bg-slate-100 text-slate-800 p-3.5 rounded-xl border border-slate-200 transition text-left space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <Receipt className="w-5 h-5 text-blue-600 group-hover:scale-110 transition" />
                  <span className="text-[10px] font-mono text-slate-400">CSV</span>
                </div>
                <div className="font-bold text-xs text-slate-800">Sales Transactions CSV</div>
                <div className="text-[10px] text-slate-500">{transactions.length} receipts history</div>
              </button>

              {onOpenAuditLogs && (
                <button
                  type="button"
                  onClick={onOpenAuditLogs}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-900 p-3.5 rounded-xl border border-purple-200 transition text-left space-y-1.5 group md:col-span-3 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg group-hover:scale-110 transition">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-purple-950">Worker Role Authorization Audit Trail</div>
                      <div className="text-[10px] text-purple-700">Inspect full audit ledger of worker roles authorizing sensitive actions (expense deletions, catalog edits)</div>
                    </div>
                  </div>
                  <span className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-sm transition">
                    View Audit Logs →
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Import / Restore Database Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Upload className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-800">Restore Data from Backup File</h3>
            </div>

            <p className="text-xs text-slate-500">
              Select a previously exported JSON backup file (`.json`) to populate your store inventory, transactions, customers, and records.
            </p>

            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl p-6 text-center transition cursor-pointer relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSONFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 block">Click or Drag & Drop Backup File</span>
                  <span className="text-[11px] text-slate-400">Supports Rofani POS `.json` backup files</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Storage & Database Purge Tools */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-sm text-slate-800">Data Purge & Reset Actions</h3>
              </div>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                Admin Caution Area
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  const result = deduplicateProducts(products);
                  if (result.removedProductsCount > 0) {
                    onImportData({ products: result.cleanedProducts });
                    triggerNotify(`✨ Auto-deleted ${result.removedProductsCount} repeated items & merged ${result.mergedStockUnitsTotal} stock units into unique catalog items!`);
                  } else {
                    triggerNotify('✨ No repeated or duplicate items found in catalog!');
                  }
                }}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 p-3.5 rounded-xl transition text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-800">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Auto Delete Duplicates
                  </div>
                  {detectDuplicateProducts(products).length > 0 && (
                    <span className="bg-indigo-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {detectDuplicateProducts(products).length}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-indigo-700">Merge duplicate stock & remove repeated SKUs</div>
              </button>

              <button
                onClick={() => setConfirmModal('reset')}
                className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 p-3.5 rounded-xl transition text-left space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                  <RefreshCw className="w-4 h-4 text-amber-600" /> Reset Sample Data
                </div>
                <div className="text-[10px] text-amber-700">Restore default Kenyan store items</div>
              </button>

              <button
                onClick={() => setConfirmModal('clear_tx')}
                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 p-3.5 rounded-xl transition text-left space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                  <Trash2 className="w-4 h-4 text-rose-600" /> Clear Sales History
                </div>
                <div className="text-[10px] text-rose-700">Purge {transactions.length} receipt records</div>
              </button>

              <button
                onClick={() => setConfirmModal('clear_exp')}
                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 p-3.5 rounded-xl transition text-left space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                  <Trash2 className="w-4 h-4 text-rose-600" /> Clear Expense Logs
                </div>
                <div className="text-[10px] text-rose-700">Purge {expenses.length} operating expenses</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  {confirmModal === 'reset' && 'Reset to Default Sample Database?'}
                  {confirmModal === 'clear_tx' && 'Purge All Sales Receipts?'}
                  {confirmModal === 'clear_exp' && 'Purge All Expense Records?'}
                </h3>
                <p className="text-xs text-slate-400">This action cannot be undone without a backup file.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              {confirmModal === 'reset' &&
                'This will replace your current store inventory, transactions, customers, and expenses with the default Kenyan electronics & boutique sample dataset.'}
              {confirmModal === 'clear_tx' &&
                `Are you sure you want to delete all ${transactions.length} sales transactions? Your inventory product stock counts will remain intact.`}
              {confirmModal === 'clear_exp' &&
                `Are you sure you want to clear all ${expenses.length} recorded operating expenses?`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal === 'reset') {
                    onResetSampleData();
                    triggerNotify('Sample database restored successfully!');
                  } else if (confirmModal === 'clear_tx') {
                    onClearTransactions();
                    triggerNotify('Sales history purged!');
                  } else if (confirmModal === 'clear_exp') {
                    onClearExpenses();
                    triggerNotify('Expense logs purged!');
                  }
                  setConfirmModal(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
