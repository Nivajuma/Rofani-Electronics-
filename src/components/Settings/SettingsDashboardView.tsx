import React, { useState, useEffect, useMemo } from 'react';
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
  FileText,
  Sparkles,
  Trash2
} from 'lucide-react';
import { Product, Customer, Supplier, Transaction, Expense, AttendanceRecord, User, StoreLocation } from '../../types';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import { ItemSettingsView } from './ItemSettingsView';
import { GeneralSettingsView } from './GeneralSettingsView';
import { PrintAndTaxSettingsView } from './PrintAndTaxSettingsView';

interface SettingsDashboardViewProps {
  products: Product[];
  categories: any[];
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  expenses: Expense[];
  attendanceRecords: AttendanceRecord[];
  allUsers: User[];
  onAddUser?: (newUser: User) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onDeleteUser?: (userId: string) => void;
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
  | 'print_tax'
  | 'users'
  | 'reminders'
  | 'party'
  | 'inventory'
  | 'currency';

export const PERMISSION_CATEGORIES = [
  {
    category: '👥 Staff & Business Management',
    permissions: [
      'Can manage workers & roles',
      'Can view staff commissions & performance',
      'Can modify app general settings',
      'Can manage store locations & multi-branch transfer'
    ]
  },
  {
    category: '🛍️ Sales & Checkout Operations',
    permissions: [
      'Can make sales',
      'Can make / manage customers orders',
      'Can update sales order status',
      'Can view and manage customers',
      'Can enable sales commission',
      'Can give discounts & price overrides',
      'Can preview receipt',
      'Can void/cancel ongoing receipt'
    ]
  },
  {
    category: '📦 Inventory & Stock Controls',
    permissions: [
      'Can add stock in',
      'Can add new products',
      'Can view items out of stock',
      'Can count and update stock balance',
      'Can add bad stock / damage write-offs',
      'Can generate & print barcodes/QR labels',
      'Can return stocks',
      'Can create offers & promotions'
    ]
  },
  {
    category: '🚚 Suppliers & Purchasing',
    permissions: [
      'Can make/manage orders to suppliers',
      'Can view and manage suppliers/parties',
      'Can process purchase receipts & supplier bills'
    ]
  },
  {
    category: '💰 Finance, Expenses & Tax Compliance',
    permissions: [
      'Can add expenses',
      'Can view financial reports & analytics',
      'Can access loan & bank statements',
      'Can view profit margins & COGS',
      'Can perform KRA TOT/VAT tax filings & report export'
    ]
  },
  {
    category: '⚡ Audit & System Overrides',
    permissions: [
      'Can edit daily entries',
      'Can delete daily entries',
      'Can backdate entries'
    ]
  }
];

export const ALL_AVAILABLE_PERMISSIONS = PERMISSION_CATEGORIES.flatMap(c => c.permissions);

// Safe Permission Helper Check
const hasPermission = (permissionsList: any, permId: string): boolean => {
  if (!Array.isArray(permissionsList)) {
    if (typeof permissionsList === 'string' && permissionsList.trim() !== '') {
      return permissionsList === permId;
    }
    return false;
  }
  return permissionsList.includes(permId);
};

export const SettingsDashboardView: React.FC<SettingsDashboardViewProps> = ({
  products,
  customers,
  suppliers,
  allUsers,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  stores = [],
  onOpenStoreManager,
  displayTheme = 'dark',
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

  // Staff Users CRUD State synchronized with App allUsers and pos_store_staff_users
  const staffUsers = useMemo(() => {
    const rawList = (allUsers && allUsers.length > 0) ? allUsers : (safeGetJSON<any[]>('pos_store_staff_users', null) || [
      { id: 'u1', name: 'Grace Makasi', phone: '+254 711 223344', role: 'Manager', commissionRate: 5, pin: '1234', permissions: ['Can make sales', 'Can view and manage customers', 'Can give discounts & price overrides'] },
      { id: 'u2', name: 'Esther Mwangi', phone: '+254 722 334455', role: 'Cashier', commissionRate: 3, pin: '5678', permissions: ['Can make sales', 'Can give discounts & price overrides', 'Can preview receipt'] },
      { id: 'u3', name: 'Rozy Otieno', phone: '+254 733 445566', role: 'Inventory Staff', commissionRate: 2, pin: '9999', permissions: ['Can add stock in', 'Can view items out of stock', 'Can count and update stock balance'] }
    ]);

    return rawList.map(worker => ({
      ...worker,
      permissions: Array.isArray(worker.permissions)
        ? worker.permissions
        : (typeof worker.permissions === 'string' && worker.permissions.trim() !== '')
          ? [worker.permissions]
          : worker.role ? [worker.role, 'Can make sales'] : ['Can make sales']
    }));
  }, [allUsers]);

  useEffect(() => {
    safeSetJSON('pos_store_staff_users', staffUsers);
  }, [staffUsers]);

  // Worker Modal state for Add/Edit
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerRole, setWorkerRole] = useState('Cashier');
  const [workerCommission, setWorkerCommission] = useState<number>(3);
  const [workerPin, setWorkerPin] = useState('1234');
  const [workerPermissions, setWorkerPermissions] = useState<string[]>([]);

  const handleOpenAddWorker = () => {
    setEditingWorkerId(null);
    setWorkerName('');
    setWorkerPhone('');
    setWorkerRole('Cashier');
    setWorkerCommission(3);
    setWorkerPin('1234');
    setWorkerPermissions(['Can make sales', 'Can give discounts & price overrides', 'Can preview receipt']);
    setWorkerModalOpen(true);
  };

  const handleOpenEditWorker = (u: any) => {
    setEditingWorkerId(u.id);
    setWorkerName(u.name);
    setWorkerPhone(u.phone || '');
    setWorkerRole(u.role || 'Cashier');
    setWorkerCommission(u.commissionRate ?? 3);
    setWorkerPin(u.pin || '1234');
    
    // Array Defensive Normalization
    const safePermissions = Array.isArray(u?.permissions)
      ? u.permissions
      : (typeof u?.permissions === 'string' && u.permissions.trim() !== '')
        ? [u.permissions]
        : ['Can make sales', 'Can give discounts & price overrides'];
    
    setWorkerPermissions(safePermissions);
    setWorkerModalOpen(true);
  };

  const handleTogglePermission = (perm: string) => {
    setWorkerPermissions(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      return currentList.includes(perm) ? currentList.filter(p => p !== perm) : [...currentList, perm];
    });
  };

  const handleAssignAllRoles = () => {
    setWorkerPermissions([...ALL_AVAILABLE_PERMISSIONS]);
    triggerNotify('✨ All granular roles & permissions assigned!');
  };

  const handleClearAllRoles = () => {
    setWorkerPermissions([]);
    triggerNotify('🧹 All permissions cleared.');
  };

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) return;

    const sanitizedPerms = Array.isArray(workerPermissions) ? workerPermissions : [];

    if (editingWorkerId) {
      const existing = staffUsers.find(u => u.id === editingWorkerId);
      const updatedUser: User = {
        ...(existing || {}),
        id: editingWorkerId,
        name: workerName.trim(),
        phone: workerPhone.trim(),
        role: workerRole as any,
        roles: [workerRole as any],
        commissionRate: workerCommission,
        pin: workerPin,
        permissions: sanitizedPerms as any,
        status: existing?.status || 'active'
      };
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }
      triggerNotify(`Staff member "${workerName}" updated successfully!`);
    } else {
      const newUser: User = {
        id: `staff-${Date.now()}`,
        name: workerName.trim(),
        phone: workerPhone.trim(),
        role: workerRole as any,
        roles: [workerRole as any],
        assignedRoles: [workerRole as any],
        commissionRate: workerCommission,
        pin: workerPin,
        status: 'active',
        permissions: sanitizedPerms as any,
        email: `${workerName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rofani.co.ke`,
        hireDate: new Date().toISOString().slice(0, 10),
      };
      if (onAddUser) {
        onAddUser(newUser);
      }
      triggerNotify(`New staff member "${workerName}" added successfully!`);
    }
    setWorkerModalOpen(false);
  };

  const handleDeleteWorker = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove worker "${name}"?`)) {
      if (onDeleteUser) {
        onDeleteUser(id);
      }
      triggerNotify(`Worker "${name}" removed successfully.`);
    }
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
      id: 'print_tax' as SettingCategoryKey,
      icon: Printer,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      title: 'Invoice Print & Taxes',
      description: 'Paper size selection, receipt header/footer, KRA Turnover Tax (TOT), VAT configuration, and KRA PIN.',
      keywords: ['invoice', 'print', 'paper', '58mm', '80mm', 'a4', 'logo', 'thermal', 'tax', 'kra', 'tot', 'vat']
    },
    {
      id: 'users' as SettingCategoryKey,
      icon: Users,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      title: 'User Management',
      description: 'Add/edit cashiers, set roles, assign granular categorized permissions & PINs.',
      keywords: ['user', 'cashier', 'admin', 'role', 'commission', 'staff', 'permissions']
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
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto bg-slate-950 text-slate-100 min-h-screen">
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-800/80">
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
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
          <ItemSettingsView onBack={() => setActiveSubPanel(null)} />
        </div>
      )}

      {activeSubPanel === 'general' && (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
          <GeneralSettingsView
            onBack={() => setActiveSubPanel(null)}
            onOpenStoreManager={onOpenStoreManager}
          />
        </div>
      )}

      {activeSubPanel === 'print_tax' && (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
          <PrintAndTaxSettingsView onBack={() => setActiveSubPanel(null)} />
        </div>
      )}

      {/* Sub-Panel Modal Overlay */}
      {activeSubPanel && activeSubPanel !== 'inventory' && activeSubPanel !== 'general' && activeSubPanel !== 'print_tax' && (
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
                    {(activeSubPanel as string) === 'transaction' && '💱 Transaction & POS Settings'}
                    {(activeSubPanel as string) === 'users' && '👥 User Management & Granular Permissions'}
                    {(activeSubPanel as string) === 'reminders' && '🔔 Reminders & Low Stock Alerts'}
                    {(activeSubPanel as string) === 'party' && '🤝 Party & Customer Management'}
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



              {activeSubPanel === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl">
                    <div>
                      <div className="font-bold text-slate-100 text-sm">Staff & Cashier Directory ({staffUsers.length})</div>
                      <p className="text-[11px] text-slate-400">Manage worker roles and granular permission chips.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddWorker}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer shrink-0"
                    >
                      <span>+ Add New Worker</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {staffUsers.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">No workers configured yet. Click "+ Add New Worker" to create one.</div>
                    ) : (
                      staffUsers.map((u) => (
                        <div key={u.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-100 text-sm">{u.name}</span>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                  u.role === 'Admin' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                                  u.role === 'Manager' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                                  'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                }`}>
                                  {u.role || 'Cashier'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3 mt-1">
                                <span>📞 {u.phone || 'No phone'}</span>
                                <span>💰 Comm: {u.commissionRate ?? 3}%</span>
                                <span>🔑 PIN: {u.pin || '1234'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditWorker(u)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
                              >
                                <span>✏️ Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteWorker(u.id, u.name)}
                                className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 font-bold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer border border-rose-800/60"
                              >
                                <span>🗑️ Remove</span>
                              </button>
                            </div>
                          </div>

                          {/* Active Permission Badges with Safe Normalization */}
                          {Array.isArray(u.permissions) && u.permissions.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-800">
                              {u.permissions.map((p: any, pIdx: number) => {
                                const pStr = typeof p === 'string' ? p : String(p);
                                return (
                                  <span key={pIdx} className="text-[9px] bg-blue-950/80 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md font-medium">
                                    {pStr}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))
                    )}
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
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>

              {activeSubPanel !== 'users' && (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Worker Modal with Categorized Granular Permission Chips */}
      {workerModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh] animate-scale-up">
            <div className="p-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">{editingWorkerId ? 'Edit Worker Profile & Permissions' : 'Add New Worker & Permissions'}</h3>
                  <p className="text-[11px] text-slate-400">Configure role permissions, commission, PIN & categorized capability chips</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWorkerModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Worker Full Name *</label>
                  <input
                    type="text"
                    required
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    placeholder="E.g. Grace Makasi"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={workerPhone}
                    onChange={(e) => setWorkerPhone(e.target.value)}
                    placeholder="E.g. +254 711 223344"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Role / Permission</label>
                  <select
                    value={workerRole}
                    onChange={(e) => setWorkerRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Inventory Staff">Inventory Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={workerCommission}
                    onChange={(e) => setWorkerCommission(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Access PIN (4-Digit)</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={workerPin}
                    onChange={(e) => setWorkerPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold tracking-widest text-center"
                  />
                </div>
              </div>

              {/* Categorized Permission Chips & Checkboxes Grid */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-200 text-sm">Granular Permission Chips & Capabilities</label>
                    <p className="text-[11px] text-slate-400">Select specific operations categorized by functional area.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAssignAllRoles}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>✨ Assign All Roles</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllRoles}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Clear All</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-64 overflow-y-auto pr-1 bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                  {PERMISSION_CATEGORIES.map((catGroup, cIdx) => (
                    <div key={cIdx} className="space-y-2">
                      <div className="text-xs font-extrabold text-blue-400 tracking-wider uppercase border-b border-slate-800 pb-1">
                        {catGroup.category}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catGroup.permissions.map((perm) => {
                          const isChecked = hasPermission(workerPermissions, perm);
                          return (
                            <label
                              key={perm}
                              onClick={() => handleTogglePermission(perm)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-blue-950/50 border-blue-600/60 text-blue-200 font-bold shadow-xs'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700 shrink-0"
                              />
                              <span className="text-xs leading-snug">{perm}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setWorkerModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingWorkerId ? 'Save Changes' : 'Create Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
