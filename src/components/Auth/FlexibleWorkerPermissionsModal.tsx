import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  ShoppingBag,
  PackagePlus,
  Boxes,
  DollarSign,
  Sliders,
  RotateCcw,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import { User, WorkerPermissions, Role } from '../../types';
import {
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_WORKER_PERMISSIONS,
  getWorkerPermissions,
  PermissionDefinition,
  ALL_21_GRANULAR_ROLES,
  getUserRoles,
} from '../../utils/permissions';

interface FlexibleWorkerPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: User | null;
  onUpdateWorker: (updatedUser: User) => void;
  currentLoggedInUser: User;
}

export const FlexibleWorkerPermissionsModal: React.FC<FlexibleWorkerPermissionsModalProps> = ({
  isOpen,
  onClose,
  worker,
  onUpdateWorker,
  currentLoggedInUser,
}) => {
  if (!isOpen || !worker) return null;

  // Local state for the worker's permissions
  const [permissions, setPermissions] = useState<WorkerPermissions>(() =>
    getWorkerPermissions(worker)
  );
  const [selectedRole, setSelectedRole] = useState<Role>(worker.role);
  const [customRoleTitle, setCustomRoleTitle] = useState<string>(
    worker.customRoleTitle || ''
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when worker prop changes
  useEffect(() => {
    if (worker) {
      setPermissions(getWorkerPermissions(worker));
      setSelectedRole(worker.role);
      setCustomRoleTitle(worker.customRoleTitle || '');
      setSavedSuccess(false);
    }
  }, [worker]);

  const togglePermission = (key: keyof WorkerPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCategoryToggleAll = (
    category: 'sales' | 'stockIns' | 'stockSetup' | 'expenses' | 'other',
    enable: boolean
  ) => {
    const keys = PERMISSION_DEFINITIONS.filter((p) => p.category === category).map(
      (p) => p.key
    );
    setPermissions((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        next[k] = enable;
      });
      return next;
    });
  };

  const applyPreset = (presetRole: Role | 'all' | 'customSalesStock') => {
    if (presetRole === 'all') {
      const allTrue = { ...DEFAULT_ROLE_WORKER_PERMISSIONS.Admin };
      setPermissions(allTrue);
      return;
    }

    if (presetRole === 'customSalesStock') {
      // Hybrid sales + stock lead
      setPermissions({
        canMakeSales: true,
        canManageCustomerOrders: true,
        canUpdateSalesOrderStatus: true,
        canViewManageCustomers: true,
        canEnableSalesCommission: true,
        canAddStockIn: true,
        canManageSupplierOrders: true,
        canViewManageSupplies: true,
        canAddBadStock: true,
        canAddNewProducts: true,
        canCreateOffers: true,
        canViewOutOfStock: true,
        canCountUpdateStockBalance: true,
        canAddExpenses: true,
        canGiveDiscounts: true,
        canEditDailyEntries: false,
        canDeleteDailyEntries: false,
        canBackdateEntries: false,
        canReturnStocks: true,
        canGenerateBarcode: true,
        canPreviewReceipt: true,
      });
      return;
    }

    const template = DEFAULT_ROLE_WORKER_PERMISSIONS[presetRole];
    if (template) {
      setPermissions({ ...template });
    }
  };

  const handleResetToRoleDefault = () => {
    const defaults = DEFAULT_ROLE_WORKER_PERMISSIONS[selectedRole] || DEFAULT_ROLE_WORKER_PERMISSIONS[worker.role] || DEFAULT_ROLE_WORKER_PERMISSIONS.Cashier;
    setPermissions({ ...defaults });
  };

  const handleSave = () => {
    // Collect active granular roles from enabled permissions
    const activeGranularRoles = ALL_21_GRANULAR_ROLES.filter((g) => permissions[g.key]).map((g) => g.role);
    const baseRoles = getUserRoles(worker).filter((r) => !ALL_21_GRANULAR_ROLES.some((g) => g.role === r));
    if (!baseRoles.includes(selectedRole)) {
      baseRoles.unshift(selectedRole);
    }
    const combinedRoles = Array.from(new Set([...baseRoles, ...activeGranularRoles]));

    const updated: User = {
      ...worker,
      role: selectedRole,
      roles: combinedRoles,
      assignedRoles: combinedRoles,
      permissions: { ...permissions },
      customRoleTitle: customRoleTitle.trim() || undefined,
    };
    onUpdateWorker(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Group definitions by category
  const salesPerms = PERMISSION_DEFINITIONS.filter((p) => p.category === 'sales');
  const stockInsPerms = PERMISSION_DEFINITIONS.filter((p) => p.category === 'stockIns');
  const stockSetupPerms = PERMISSION_DEFINITIONS.filter((p) => p.category === 'stockSetup');
  const expensesPerms = PERMISSION_DEFINITIONS.filter((p) => p.category === 'expenses');
  const otherPerms = PERMISSION_DEFINITIONS.filter((p) => p.category === 'other');

  const activeCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = PERMISSION_DEFINITIONS.length;

  const renderCategorySection = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    items: PermissionDefinition[],
    category: 'sales' | 'stockIns' | 'stockSetup' | 'expenses' | 'other',
    accentColor: {
      bg: string;
      border: string;
      text: string;
      badge: string;
    }
  ) => {
    const categoryActiveCount = items.filter((item) => permissions[item.key]).length;
    const allChecked = categoryActiveCount === items.length;

    return (
      <div className={`rounded-2xl border ${accentColor.border} bg-slate-950/70 overflow-hidden shadow-sm`}>
        {/* Section Header */}
        <div className={`px-4 py-3 border-b ${accentColor.border} bg-slate-900/90 flex flex-wrap items-center justify-between gap-2`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-xl ${accentColor.bg} ${accentColor.text}`}>
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-slate-100 tracking-wide uppercase">
                  {title}
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${accentColor.badge}`}>
                  {categoryActiveCount} / {items.length} Enabled
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCategoryToggleAll(category, true)}
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
            >
              <CheckSquare className="w-3 h-3" /> Select All
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={() => handleCategoryToggleAll(category, false)}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
            >
              <Square className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>

        {/* Section Items */}
        <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {items.map((item) => {
            const isEnabled = !!permissions[item.key];
            return (
              <div
                key={item.key}
                onClick={() => togglePermission(item.key)}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                  isEnabled
                    ? 'bg-slate-900/90 border-slate-700 hover:border-slate-600 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700/60 opacity-60 hover:opacity-85'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isEnabled ? 'text-slate-100' : 'text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* Switch Toggle */}
                <div className="pt-0.5 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePermission(item.key);
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-2xl shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-100">
                  Flexible Worker Roles & Permissions
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {activeCount} / {totalCount} Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customizing capabilities for <strong className="text-slate-200">{worker.name}</strong> ({worker.role}). Changes can be adjusted anytime.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
            title="Close window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WORKER SUMMARY & QUICK PRESET BAR */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Primary Role Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 shrink-0 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span>Base Role:</span>
              </span>
              <select
                value={selectedRole}
                onChange={(e) => {
                  const newRole = e.target.value as Role;
                  setSelectedRole(newRole);
                  const defaults = DEFAULT_ROLE_WORKER_PERMISSIONS[newRole];
                  if (defaults) {
                    setPermissions({ ...defaults });
                  }
                }}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-bold focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="Sales Role">Sales Role (POS & Orders)</option>
                <option value="Stock Ins Role">Stock Ins Role (Supplies)</option>
                <option value="Stock Setup Role">Stock Setup Role (Products)</option>
                <option value="Expenses Role">Expenses Role (Expenses)</option>
                <option value="Cashier">Cashier</option>
                <option value="Inventory Staff">Inventory Staff</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {/* Quick Custom Title Tag */}
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <span className="text-xs font-semibold text-slate-400 shrink-0">Custom Title / Tag:</span>
              <input
                type="text"
                placeholder={`e.g. Senior ${selectedRole} or Store Lead`}
                value={customRoleTitle}
                onChange={(e) => setCustomRoleTitle(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 flex-1"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Load Preset Bundle:</span>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('Sales Role');
                applyPreset('Sales Role');
              }}
              className="text-[11px] bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 px-2.5 py-1 rounded-lg font-medium transition"
            >
              Sales Role
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('Stock Ins Role');
                applyPreset('Stock Ins Role');
              }}
              className="text-[11px] bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-800/80 px-2.5 py-1 rounded-lg font-medium transition"
            >
              Stock Ins Role
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('Stock Setup Role');
                applyPreset('Stock Setup Role');
              }}
              className="text-[11px] bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 px-2.5 py-1 rounded-lg font-medium transition"
            >
              Stock Setup Role
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('Expenses Role');
                applyPreset('Expenses Role');
              }}
              className="text-[11px] bg-orange-950 hover:bg-orange-900 text-orange-300 border border-orange-800/80 px-2.5 py-1 rounded-lg font-medium transition"
            >
              Expenses Role
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('Cashier');
                applyPreset('Cashier');
              }}
              className="text-[11px] bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800/80 px-2.5 py-1 rounded-lg font-medium transition"
            >
              Cashier
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('Inventory Staff');
                applyPreset('Inventory Staff');
              }}
              className="text-[11px] bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 px-2.5 py-1 rounded-lg font-medium transition"
            >
              Inventory Staff
            </button>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="text-[11px] bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-400" /> Full Access
            </button>
            <button
              type="button"
              onClick={handleResetToRoleDefault}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1"
              title="Reset to standard defaults for this role"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" /> Reset Default
            </button>
          </div>
        </div>

        {/* SCROLLABLE CATEGORIES */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Notice banner */}
          <div className="bg-sky-950/40 border border-sky-900/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-sky-300">
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p>
              Permissions take effect across the entire system immediately. Any toggled capability dynamically unlocks the corresponding buttons, navigation tabs, and operational workflows for this worker.
            </p>
          </div>

          {/* 1. SALES ROLE */}
          {renderCategorySection(
            'Sales Role',
            'Point of sale register, customer orders, customer records, and sales commission settings',
            <ShoppingBag className="w-4 h-4" />,
            salesPerms,
            'sales',
            {
              bg: 'bg-emerald-950 border border-emerald-800',
              border: 'border-emerald-900/50',
              text: 'text-emerald-400',
              badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
            }
          )}

          {/* 2. STOCK INS ROLES */}
          {renderCategorySection(
            'Stock Ins Roles',
            'Receiving stock, supplier orders, vendor directory, and bad stock / damage write-offs',
            <PackagePlus className="w-4 h-4" />,
            stockInsPerms,
            'stockIns',
            {
              bg: 'bg-sky-950 border border-sky-800',
              border: 'border-sky-900/50',
              text: 'text-sky-400',
              badge: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
            }
          )}

          {/* 3. STOCK SETUP ROLES */}
          {renderCategorySection(
            'Stock Setup Roles',
            'Adding new catalog products, promotional offers, stock balance audits, and out of stock monitoring',
            <Boxes className="w-4 h-4" />,
            stockSetupPerms,
            'stockSetup',
            {
              bg: 'bg-indigo-950 border border-indigo-800',
              border: 'border-indigo-900/50',
              text: 'text-indigo-400',
              badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
            }
          )}

          {/* 4. EXPENSES ROLES */}
          {renderCategorySection(
            'Expenses Roles',
            'Recording operating costs, shop bills, petty cash, and daily business expenditures',
            <DollarSign className="w-4 h-4" />,
            expensesPerms,
            'expenses',
            {
              bg: 'bg-amber-950 border border-amber-800',
              border: 'border-amber-900/50',
              text: 'text-amber-400',
              badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
            }
          )}

          {/* 5. OTHER ROLES */}
          {renderCategorySection(
            'Other Roles & Advanced Capabilities',
            'Sales discounts, daily entry edits/deletions, backdating, returns, barcodes, and receipts',
            <Sliders className="w-4 h-4" />,
            otherPerms,
            'other',
            {
              bg: 'bg-purple-950 border border-purple-800',
              border: 'border-purple-900/50',
              text: 'text-purple-400',
              badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
            }
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:px-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            Active permissions: <strong className="text-emerald-400">{activeCount}</strong> of {totalCount}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className={`font-extrabold px-6 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg ${
                savedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Permissions Saved!</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save & Apply Roles</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
