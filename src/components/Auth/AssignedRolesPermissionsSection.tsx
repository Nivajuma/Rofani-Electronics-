import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Role, WorkerPermissions } from '../../types';
import {
  ALL_21_GRANULAR_ROLES,
  DEFAULT_EMPTY_PERMISSIONS,
  DEFAULT_ROLE_WORKER_PERMISSIONS,
  PRIMARY_ROLES,
  formatRoleDisplayLabel,
  getCombinedPermissionsForRoles,
} from '../../utils/permissions';

export type PresetRoleName = 'Admin' | 'Manager' | 'Cashier' | 'Inventory Staff';

interface ActiveChipItem {
  id: string;
  label: string;
  kind: 'preset' | 'bundle' | 'permission';
  roleValue?: Role;
  permKey?: keyof WorkerPermissions;
}

interface PermissionGroupRow {
  id: string;
  label: string;
  description?: string;
  kind: 'preset' | 'bundle' | 'permission';
  roleValue?: Role;
  permKey?: keyof WorkerPermissions;
}

interface PermissionGroupSection {
  id: 'presets' | 'sales' | 'stock' | 'expenses';
  title: string;
  items: PermissionGroupRow[];
}

export interface AssignedRolesPermissionsSectionProps {
  roles: Role[];
  permissions: WorkerPermissions;
  primaryRole: Role;
  isOwnerProtected?: boolean;
  canAssignAdmin?: boolean;
  compact?: boolean;
  onChange: (next: { roles: Role[]; permissions: WorkerPermissions; primaryRole: Role }) => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESET_OPTIONS: PresetRoleName[] = ['Admin', 'Manager', 'Cashier', 'Inventory Staff'];

const PERMISSION_GROUPS: PermissionGroupSection[] = [
  {
    id: 'presets',
    title: 'Role Presets',
    items: [
      { id: 'preset-Admin', label: 'Admin', description: 'Full system access across all branches and settings', kind: 'preset', roleValue: 'Admin' },
      { id: 'preset-Manager', label: 'Manager', description: 'Full store operations, stock, staff, and reports', kind: 'preset', roleValue: 'Manager' },
      { id: 'preset-Cashier', label: 'Cashier', description: 'POS checkout, customer orders, and receipts', kind: 'preset', roleValue: 'Cashier' },
      { id: 'preset-Inventory Staff', label: 'Inventory Staff', description: 'Stock-in, supplier orders, counts, and products', kind: 'preset', roleValue: 'Inventory Staff' },
    ],
  },
  {
    id: 'sales',
    title: 'Sales & Checkout',
    items: [
      { id: 'perm-canMakeSales', label: 'Make Sales', description: 'Ring up sales and process checkout payments', kind: 'permission', permKey: 'canMakeSales', roleValue: 'Can make sales' },
      { id: 'perm-canGiveDiscounts', label: 'Give Discounts', description: 'Apply discounts at checkout without manager PIN', kind: 'permission', permKey: 'canGiveDiscounts', roleValue: 'can give discounts' },
      { id: 'perm-canEnableSalesCommission', label: 'Enable Sales Commission', description: 'Track staff commissions and targets', kind: 'permission', permKey: 'canEnableSalesCommission', roleValue: 'Can enable sales commission' },
      { id: 'perm-canManageCustomerOrders', label: 'Manage Customer Orders', description: 'Create, edit, and fulfill customer orders', kind: 'permission', permKey: 'canManageCustomerOrders', roleValue: 'Can make / manage customers orders' },
      { id: 'perm-canUpdateSalesOrderStatus', label: 'Update Order Status', description: 'Update order stage from Pending to Delivered', kind: 'permission', permKey: 'canUpdateSalesOrderStatus', roleValue: 'Can update sales order status' },
      { id: 'perm-canViewManageCustomers', label: 'View & Manage Customers', description: 'Manage customer profiles, deposits, and debt balances', kind: 'permission', permKey: 'canViewManageCustomers', roleValue: 'Can view and manage customers' },
      { id: 'perm-canReturnStocks', label: 'Return Stocks', description: 'Process customer returns, refunds, and credit notes', kind: 'permission', permKey: 'canReturnStocks', roleValue: 'Can return stocks' },
      { id: 'perm-canPreviewReceipt', label: 'Preview Receipt', description: 'Preview, print, and share customer receipts', kind: 'permission', permKey: 'canPreviewReceipt', roleValue: 'Can previer receipt' },
      { id: 'perm-canBackdateEntries', label: 'Backdate Entries', description: 'Record entries with a past transaction date', kind: 'permission', permKey: 'canBackdateEntries', roleValue: 'Can backdate entries' },
    ],
  },
  {
    id: 'stock',
    title: 'Stock & Suppliers',
    items: [
      { id: 'perm-canAddStockIn', label: 'Add Stock-In', description: 'Receive incoming stock and record purchase bills', kind: 'permission', permKey: 'canAddStockIn', roleValue: 'Can add stock in' },
      { id: 'bundle-Stock Setup Role', label: 'Stock Setup', description: 'Add products, count stock balances, and view out-of-stock', kind: 'bundle', roleValue: 'Stock Setup Role' },
      { id: 'perm-canCountUpdateStockBalance', label: 'Count & Update Stock Balance', description: 'Run physical stock-takes and reconcile quantities', kind: 'permission', permKey: 'canCountUpdateStockBalance', roleValue: 'Can count and update stock balance' },
      { id: 'perm-canAddNewProducts', label: 'Add New Products', description: 'Create catalog items and set prices', kind: 'permission', permKey: 'canAddNewProducts', roleValue: 'Can add new products' },
      { id: 'perm-canAddBadStock', label: 'Add Bad Stock', description: 'Write off damaged or expired inventory', kind: 'permission', permKey: 'canAddBadStock', roleValue: 'Can add bad stock' },
      { id: 'perm-canViewOutOfStock', label: 'View Out-of-Stock Items', description: 'View low-stock alerts and depleted items', kind: 'permission', permKey: 'canViewOutOfStock', roleValue: 'Can view items out of stock' },
      { id: 'perm-canManageSupplierOrders', label: 'Manage Supplier Orders', description: 'Create purchase orders and track deliveries', kind: 'permission', permKey: 'canManageSupplierOrders', roleValue: 'Can make/manage orders to suppliers' },
      { id: 'perm-canViewManageSupplies', label: 'View & Manage Supplies', description: 'Access supplier contacts and supply history', kind: 'permission', permKey: 'canViewManageSupplies', roleValue: 'Can view and manage supplies' },
      { id: 'perm-canGenerateBarcode', label: 'Generate Barcodes', description: 'Generate barcodes and print item labels', kind: 'permission', permKey: 'canGenerateBarcode', roleValue: 'Can generate barcode' },
    ],
  },
  {
    id: 'expenses',
    title: 'Expenses, Offers & Entries',
    items: [
      { id: 'perm-canAddExpenses', label: 'Add Expenses', description: 'Record daily business and petty cash expenses', kind: 'permission', permKey: 'canAddExpenses', roleValue: 'Can add expenses' },
      { id: 'perm-canCreateOffers', label: 'Create Offers', description: 'Set up promotional deals and bundle pricing', kind: 'permission', permKey: 'canCreateOffers', roleValue: 'Can creat offers' },
      { id: 'perm-canEditDailyEntries', label: 'Edit Daily Entries', description: 'Modify today\'s sales, expenses, and notes', kind: 'permission', permKey: 'canEditDailyEntries', roleValue: 'Can edit daily entries' },
      { id: 'perm-canDeleteDailyEntries', label: 'Delete Daily Entries', description: 'Void or remove daily transactions and records', kind: 'permission', permKey: 'canDeleteDailyEntries', roleValue: 'Can delete daily entries' },
    ],
  },
];

const STOCK_SETUP_KEYS: (keyof WorkerPermissions)[] = [
  'canAddNewProducts',
  'canCountUpdateStockBalance',
  'canViewOutOfStock',
  'canCreateOffers',
];

export const AssignedRolesPermissionsSection: React.FC<AssignedRolesPermissionsSectionProps> = ({
  roles,
  permissions,
  primaryRole,
  isOwnerProtected = false,
  canAssignAdmin = true,
  compact = false,
  onChange,
  onNotify,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    compact
      ? { presets: false, sales: false, stock: false, expenses: false }
      : { presets: true, sales: true, stock: false, expenses: false }
  );

  const normalizedRoles = useMemo(() => {
    const clean = new Set<Role>();
    (roles || []).forEach((r) => {
      if (r && r !== 'Custom') clean.add(r);
    });
    if (isOwnerProtected) clean.add('Admin');
    return Array.from(clean);
  }, [roles, isOwnerProtected]);

  const effectivePermissions = useMemo<WorkerPermissions>(() => {
    if (normalizedRoles.includes('Admin')) {
      return { ...DEFAULT_ROLE_WORKER_PERMISSIONS.Admin };
    }
    return {
      ...DEFAULT_EMPTY_PERMISSIONS,
      ...(permissions || {}),
    };
  }, [normalizedRoles, permissions]);

  const activePresetForDropdown = useMemo(() => {
    for (const preset of PRESET_OPTIONS) {
      if (normalizedRoles.includes(preset)) {
        return preset;
      }
    }
    if (PRESET_OPTIONS.includes(primaryRole as PresetRoleName)) {
      return primaryRole;
    }
    return '';
  }, [normalizedRoles, primaryRole]);

  const resolvePrimaryRole = (nextRoles: Role[]): Role => {
    if (nextRoles.includes('Admin')) return 'Admin';
    if (nextRoles.includes('Manager')) return 'Manager';
    for (const p of PRESET_OPTIONS) {
      if (nextRoles.includes(p)) return p;
    }
    const coreMatch = nextRoles.find((r) => PRIMARY_ROLES.includes(r));
    if (coreMatch) return coreMatch;
    if (nextRoles.length > 0) return nextRoles[0];
    return 'Custom';
  };

  // Build active chips shown in Active Roles (X) box
  const activeChips = useMemo<ActiveChipItem[]>(() => {
    const chips: ActiveChipItem[] = [];
    const seenLabels = new Set<string>();

    PRESET_OPTIONS.forEach((preset) => {
      if (normalizedRoles.includes(preset)) {
        seenLabels.add(preset.toLowerCase());
        chips.push({
          id: `chip-preset-${preset}`,
          label: preset,
          kind: 'preset',
          roleValue: preset,
        });
      }
    });

    if (normalizedRoles.includes('Stock Setup Role')) {
      seenLabels.add('stock setup');
      chips.push({
        id: 'chip-bundle-stock-setup',
        label: 'Stock Setup',
        kind: 'bundle',
        roleValue: 'Stock Setup Role',
      });
    }

    PERMISSION_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        if (item.kind === 'permission' && item.permKey && effectivePermissions[item.permKey]) {
          const cleanLabel = formatRoleDisplayLabel(item.label);
          if (!seenLabels.has(cleanLabel.toLowerCase())) {
            seenLabels.add(cleanLabel.toLowerCase());
            chips.push({
              id: `chip-perm-${item.permKey}`,
              label: cleanLabel,
              kind: 'permission',
              permKey: item.permKey,
              roleValue: item.roleValue,
            });
          }
        }
      });
    });

    return chips;
  }, [normalizedRoles, effectivePermissions]);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleApplyPreset = (preset: PresetRoleName) => {
    if (preset === 'Admin' && !canAssignAdmin) {
      onNotify?.('Only an Administrator can assign the Admin role.', 'error');
      return;
    }
    const nextRoles: Role[] = isOwnerProtected && preset !== 'Admin' ? ['Admin', preset] : [preset];
    const nextPermissions = isOwnerProtected
      ? { ...DEFAULT_ROLE_WORKER_PERMISSIONS.Admin }
      : { ...DEFAULT_ROLE_WORKER_PERMISSIONS[preset] };

    onChange({
      roles: nextRoles,
      permissions: nextPermissions,
      primaryRole: isOwnerProtected ? 'Admin' : preset,
    });
    onNotify?.(`Applied ${preset} role preset.`, 'success');
  };

  const handleAssignAll = () => {
    const allRoles: Role[] = [
      ...(canAssignAdmin ? (['Admin'] as Role[]) : []),
      'Manager',
      'Cashier',
      'Inventory Staff',
      'Stock Setup Role',
      ...ALL_21_GRANULAR_ROLES.map((g) => g.role),
    ];
    const uniqueRoles = Array.from(new Set(allRoles));
    const fullPerms: WorkerPermissions = { ...DEFAULT_ROLE_WORKER_PERMISSIONS.Admin };
    onChange({
      roles: uniqueRoles,
      permissions: fullPerms,
      primaryRole: canAssignAdmin ? 'Admin' : 'Manager',
    });
    onNotify?.('Assigned all roles and permissions.', 'success');
  };

  const handleClearAll = () => {
    if (isOwnerProtected) {
      onChange({
        roles: ['Admin'],
        permissions: { ...DEFAULT_ROLE_WORKER_PERMISSIONS.Admin },
        primaryRole: 'Admin',
      });
      onNotify?.('Store owner retains Administrator access. Extra non-owner roles cleared.', 'info');
      return;
    }
    onChange({
      roles: [],
      permissions: { ...DEFAULT_EMPTY_PERMISSIONS },
      primaryRole: 'Custom',
    });
    onNotify?.('Cleared all assigned roles and permissions.', 'info');
  };

  const handleToggleRow = (row: PermissionGroupRow) => {
    if (row.kind === 'preset' && row.roleValue) {
      const targetPreset = row.roleValue as PresetRoleName;
      const isCurrentlyOn = normalizedRoles.includes(targetPreset);

      if (isCurrentlyOn) {
        if (targetPreset === 'Admin' && isOwnerProtected) {
          onNotify?.('Store owner account must retain Admin access.', 'error');
          return;
        }
        const remainingRoles = normalizedRoles.filter((r) => r !== targetPreset);
        const recomputed = getCombinedPermissionsForRoles(remainingRoles);
        // Preserve any explicit granular permissions not tied exclusively to the removed preset
        const nextPerms: WorkerPermissions = { ...recomputed };
        onChange({
          roles: remainingRoles,
          permissions: nextPerms,
          primaryRole: resolvePrimaryRole(remainingRoles),
        });
        return;
      } else {
        if (targetPreset === 'Admin' && !canAssignAdmin) {
          onNotify?.('Only an Administrator can assign the Admin role.', 'error');
          return;
        }
        const nextRoles = Array.from(new Set([...normalizedRoles, targetPreset]));
        const presetDefaults = DEFAULT_ROLE_WORKER_PERMISSIONS[targetPreset] || {};
        const nextPerms: WorkerPermissions = { ...effectivePermissions };
        (Object.keys(presetDefaults) as (keyof WorkerPermissions)[]).forEach((k) => {
          if (presetDefaults[k]) nextPerms[k] = true;
        });
        onChange({
          roles: nextRoles,
          permissions: nextPerms,
          primaryRole: resolvePrimaryRole(nextRoles),
        });
        return;
      }
    }

    if (row.kind === 'bundle' && row.roleValue === 'Stock Setup Role') {
      const isCurrentlyOn =
        normalizedRoles.includes('Stock Setup Role') ||
        STOCK_SETUP_KEYS.every((k) => effectivePermissions[k]);

      if (isCurrentlyOn && isOwnerProtected && normalizedRoles.includes('Admin')) {
        onNotify?.('Store owner with Admin retains full permissions.', 'info');
        return;
      }

      const nextPerms: WorkerPermissions = { ...effectivePermissions };
      STOCK_SETUP_KEYS.forEach((k) => {
        nextPerms[k] = !isCurrentlyOn;
      });
      let nextRoles = [...normalizedRoles];
      if (isCurrentlyOn) {
        nextRoles = nextRoles.filter((r) => r !== 'Stock Setup Role' && r !== 'Admin');
      } else if (!nextRoles.includes('Stock Setup Role')) {
        nextRoles.push('Stock Setup Role');
      }
      onChange({
        roles: nextRoles,
        permissions: nextPerms,
        primaryRole: resolvePrimaryRole(nextRoles),
      });
      return;
    }

    if (row.kind === 'permission' && row.permKey) {
      const isCurrentlyOn = Boolean(effectivePermissions[row.permKey]);
      if (isCurrentlyOn && isOwnerProtected && normalizedRoles.includes('Admin')) {
        onNotify?.('Store owner Admin account keeps all permissions enabled.', 'info');
        return;
      }

      const nextValue = !isCurrentlyOn;
      const nextPerms: WorkerPermissions = {
        ...effectivePermissions,
        [row.permKey]: nextValue,
      };

      let nextRoles = [...normalizedRoles];
      if (!nextValue) {
        // Removing an individual capability removes its matching granular role and non-owner Admin catch-all
        nextRoles = nextRoles.filter(
          (r) =>
            r !== row.roleValue &&
            r !== row.label &&
            r !== 'Admin'
        );
      } else if (row.roleValue && !nextRoles.includes(row.roleValue)) {
        nextRoles.push(row.roleValue);
      }

      onChange({
        roles: nextRoles,
        permissions: nextPerms,
        primaryRole: resolvePrimaryRole(nextRoles),
      });
    }
  };

  const handleRemoveChip = (chip: ActiveChipItem) => {
    if (chip.kind === 'preset' && chip.roleValue) {
      handleToggleRow({
        id: chip.id,
        label: chip.label,
        kind: 'preset',
        roleValue: chip.roleValue,
      });
      return;
    }
    if (chip.kind === 'bundle' && chip.roleValue) {
      handleToggleRow({
        id: chip.id,
        label: chip.label,
        kind: 'bundle',
        roleValue: chip.roleValue,
      });
      return;
    }
    if (chip.kind === 'permission' && chip.permKey) {
      handleToggleRow({
        id: chip.id,
        label: chip.label,
        kind: 'permission',
        permKey: chip.permKey,
        roleValue: chip.roleValue,
      });
    }
  };

  const isRowChecked = (row: PermissionGroupRow): boolean => {
    if (row.kind === 'preset' && row.roleValue) {
      return normalizedRoles.includes(row.roleValue);
    }
    if (row.kind === 'bundle' && row.roleValue === 'Stock Setup Role') {
      return (
        normalizedRoles.includes('Stock Setup Role') ||
        STOCK_SETUP_KEYS.every((k) => effectivePermissions[k])
      );
    }
    if (row.kind === 'permission' && row.permKey) {
      return Boolean(effectivePermissions[row.permKey]);
    }
    return false;
  };

  return (
    <div className="space-y-3 text-xs">
      {/* 1. Active Assigned Roles Bar + Quick Preset Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-slate-100 text-xs">
              Active Roles ({activeChips.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="Apply Role Preset"
              value={activePresetForDropdown}
              onChange={(e) => {
                const chosen = e.target.value as PresetRoleName;
                if (chosen) handleApplyPreset(chosen);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold rounded-lg px-2.5 py-1.5 min-h-[34px] focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Role Preset...</option>
              {PRESET_OPTIONS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAssignAll}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              Assign All
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Active Chips List (Tap x to Remove) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 max-h-40 overflow-y-auto">
          {activeChips.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">
              No active roles assigned. Select a Role Preset or toggle permissions below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {activeChips.map((chip) => (
                <span
                  key={chip.id}
                  className="bg-slate-800 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChip(chip)}
                    aria-label={`Remove ${chip.label}`}
                    title={`Remove ${chip.label}`}
                    className="p-0.5 -mr-1 rounded hover:bg-slate-700 text-emerald-300 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Categorized & Collapsible Permission Groups */}
      <div className="space-y-2">
        {PERMISSION_GROUPS.map((group) => {
          const isOpen = Boolean(expandedGroups[group.id]);
          const enabledCount = group.items.filter((item) => isRowChecked(item)).length;

          return (
            <div
              key={group.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleGroupExpand(group.id)}
                className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-800/50 hover:bg-slate-800 transition text-left min-h-[44px] cursor-pointer"
              >
                <span className="font-bold text-slate-100 text-xs">{group.title}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {enabledCount}/{group.items.length}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </span>
              </button>

              {isOpen && (
                <div className="divide-y divide-slate-800/80 px-1.5 py-1">
                  {group.items.map((item) => {
                    const checked = isRowChecked(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        onClick={() => handleToggleRow(item)}
                        className="w-full flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg min-h-[44px] hover:bg-slate-800/50 transition text-left cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-slate-100 truncate">
                            {item.label}
                          </div>
                          {!compact && item.description && (
                            <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </div>

                        <span
                          aria-hidden="true"
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                            checked
                              ? 'bg-emerald-600 border-emerald-500'
                              : 'bg-slate-800 border-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              checked ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
