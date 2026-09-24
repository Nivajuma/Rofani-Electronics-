import {
  Role,
  User,
  Product,
  Expense,
  SensitiveActionType,
  SensitiveActionLog,
  SensitiveActionCategory,
  WorkerPermissions,
} from '../types';
import { getUserRoles, hasRole } from './permissions';
import { safeGetJSON, safeSetJSON } from './safeStorage';

export interface ActionAuthorizationRequirement {
  actionType: SensitiveActionType;
  label: string;
  category: SensitiveActionCategory;
  requiredPermission?: keyof WorkerPermissions;
  description: string;
  qualifyingRoles: Role[]; // Default canonical roles that grant this privilege
}

/**
  * Specification of which roles and permissions grant authorization
  * for each sensitive system action.
  */
export const SENSITIVE_ACTION_SPECS: Record<SensitiveActionType, ActionAuthorizationRequirement> = {
  DELETE_EXPENSE: {
    actionType: 'DELETE_EXPENSE',
    label: 'Delete Expense Record',
    category: 'expenses',
    requiredPermission: 'canDeleteDailyEntries',
    description: 'Permanently removes an operating cost entry or overhead schedule from the store ledger.',
    qualifyingRoles: [
      'Admin',
      'Expenses Role',
      'Can delete daily entries',
    ],
  },
  MODIFY_INVENTORY: {
    actionType: 'MODIFY_INVENTORY',
    label: 'Modify Product Catalog & Inventory',
    category: 'inventory',
    requiredPermission: 'canAddNewProducts',
    description: 'Updates critical inventory attributes such as selling price, cost price, stock level, or barcode.',
    qualifyingRoles: [
      'Admin',
      'Inventory Staff',
      'Stock Setup Role',
      'Can add / modify products in store catalog',
      'Can count and update stock balance',
    ],
  },
  DELETE_PRODUCT: {
    actionType: 'DELETE_PRODUCT',
    label: 'Delete Product from Catalog',
    category: 'inventory',
    requiredPermission: 'canAddNewProducts',
    description: 'Permanently purges an inventory item, its barcode reference, and stock history from the store catalog.',
    qualifyingRoles: [
      'Admin',
      'Inventory Staff',
      'Stock Setup Role',
      'Can add / modify products in store catalog',
      'Can delete daily entries',
    ],
  },
  ADJUST_STOCK: {
    actionType: 'ADJUST_STOCK',
    label: 'Physical Stock Count Reconciliation',
    category: 'stock',
    requiredPermission: 'canCountUpdateStockBalance',
    description: 'Adjusts inventory on-hand balances following physical audit count variances.',
    qualifyingRoles: [
      'Admin',
      'Inventory Staff',
      'Stock Setup Role',
      'Can count and update stock balance',
    ],
  },
  ADD_RESTOCK: {
    actionType: 'ADD_RESTOCK',
    label: 'Inward Stock Replenishment',
    category: 'stock',
    requiredPermission: 'canAddStockIn',
    description: 'Records incoming shipment batches, updates unit purchase costs, and increases on-hand stock.',
    qualifyingRoles: [
      'Admin',
      'Inventory Staff',
      'Stock Ins Role',
      'Can add stock in',
    ],
  },
  CLEAR_EXPENSES: {
    actionType: 'CLEAR_EXPENSES',
    label: 'Purge Expense History',
    category: 'expenses',
    requiredPermission: 'canDeleteDailyEntries',
    description: 'Wipes all historical store expense records and receipts.',
    qualifyingRoles: ['Admin'],
  },
  CLEAR_TRANSACTIONS: {
    actionType: 'CLEAR_TRANSACTIONS',
    label: 'Purge Sales Transactions',
    category: 'sales',
    description: 'Resets or deletes recorded point of sale receipt transactions.',
    qualifyingRoles: ['Admin'],
  },
  RESET_SYSTEM_DATA: {
    actionType: 'RESET_SYSTEM_DATA',
    label: 'Reset Entire Store Catalog & Data',
    category: 'security',
    description: 'Reinitializes all store databases, inventory, contacts, and transactions to initial states.',
    qualifyingRoles: ['Admin'],
  },
  DELETE_CUSTOMER: {
    actionType: 'DELETE_CUSTOMER',
    label: 'Delete Customer Profile',
    category: 'contacts',
    requiredPermission: 'canViewManageCustomers',
    description: 'Removes a registered customer profile and associated credit history.',
    qualifyingRoles: ['Admin', 'Manager', 'Can view and manage customers'],
  },
  DELETE_SUPPLIER: {
    actionType: 'DELETE_SUPPLIER',
    label: 'Delete Supplier Profile',
    category: 'contacts',
    requiredPermission: 'canViewManageSupplies',
    description: 'Removes a wholesale vendor record and contact details.',
    qualifyingRoles: ['Admin', 'Manager', 'Inventory Staff', 'Can view / manage supplies'],
  },
  OVERRIDE_DISCOUNT: {
    actionType: 'OVERRIDE_DISCOUNT',
    label: 'Authorize Custom POS Checkout Discount',
    category: 'sales',
    requiredPermission: 'canGiveDiscounts',
    description: 'Overrides standard item prices with a custom promotional discount at checkout.',
    qualifyingRoles: ['Admin', 'Manager', 'can give discounts'],
  },
};

/**
 * Evaluates a user's assigned roles to determine WHICH of their roles
 * actually confer the authority to execute the given sensitive action.
 *
 * If a user holds multiple roles (e.g. ['Admin', 'Expenses Role']),
 * this function returns all roles that qualify (e.g. both 'Expenses Role' and 'Admin').
 */
export function getQualifyingRolesForAction(
  user: User,
  actionType: SensitiveActionType
): Role[] {
  const userRoles = getUserRoles(user);
  const spec = SENSITIVE_ACTION_SPECS[actionType];

  if (!spec) {
    // Fallback: If unknown action, any Admin role qualifies
    return userRoles.filter((r) => r === 'Admin');
  }

  // Filter user roles that match the qualifying roles for this action
  const qualifying = userRoles.filter((role) => {
    // 1. Direct match with action's qualifying roles
    if (spec.qualifyingRoles.includes(role)) {
      return true;
    }

    // 2. Admins always qualify for all sensitive actions
    if (role === 'Admin') {
      return true;
    }

    // 3. Manager qualify for specific operational tasks
    if (role === 'Manager' && ['DELETE_CUSTOMER', 'DELETE_SUPPLIER', 'OVERRIDE_DISCOUNT'].includes(actionType)) {
      return true;
    }

    return false;
  });

  return Array.from(new Set(qualifying));
}

/**
 * Helper to compute precise field-level diff between two versions of a product.
 */
export function computeProductDiff(
  before: Partial<Product>,
  after: Partial<Product>
): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {};
  const fieldsToCheck: (keyof Product)[] = [
    'name',
    'sellingPrice',
    'costPrice',
    'stockQuantity',
    'minStockAlert',
    'barcode',
    'sku',
    'category',
    'subcategory',
    'unit',
    'supplierName',
  ];

  fieldsToCheck.forEach((field) => {
    if (before[field] !== undefined && after[field] !== undefined) {
      if (before[field] !== after[field]) {
        diff[field] = {
          old: before[field],
          new: after[field],
        };
      }
    }
  });

  return diff;
}

/**
 * Helper to create a structured SensitiveActionLog entry.
 */
export function buildSensitiveActionLog(params: {
  actionType: SensitiveActionType;
  actionTitle: string;
  user: User;
  authorizingRole: Role;
  targetId?: string;
  targetName?: string;
  details: {
    summary: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    diff?: Record<string, { old: any; new: any }>;
    metadata?: Record<string, any>;
  };
  reason?: string;
  severity?: 'critical' | 'high' | 'medium';
}): SensitiveActionLog {
  const spec = SENSITIVE_ACTION_SPECS[params.actionType];
  const allUserRoles = getUserRoles(params.user);

  return {
    id: `audit-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    actionType: params.actionType,
    actionTitle: params.actionTitle,
    category: spec?.category || 'security',
    userId: params.user.id,
    userName: params.user.name,
    userEmail: params.user.email || `${params.user.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rofani.co.ke`,
    authorizingRole: params.authorizingRole,
    assignedRolesSnapshot: allUserRoles,
    requiredPermissionKey: spec?.requiredPermission,
    targetId: params.targetId,
    targetName: params.targetName,
    details: params.details,
    reason: params.reason?.trim() || undefined,
    severity: params.severity || (params.actionType.startsWith('DELETE') || params.actionType.startsWith('CLEAR') || params.actionType.startsWith('RESET') ? 'critical' : 'high'),
  };
}

const STORAGE_KEY = 'retail_pos_sensitive_action_logs';

/**
 * Initial sample audit records demonstrating workers with multiple roles
 * and attributing sensitive actions to specific role authorizations.
 */
export const INITIAL_AUDIT_LOGS: SensitiveActionLog[] = [
  {
    id: 'audit-init-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 mins ago
    actionType: 'DELETE_EXPENSE',
    actionTitle: 'Deleted Expense: Utilities (KSh 4,500)',
    category: 'expenses',
    userId: 'usr-1',
    userName: 'John Doe (Admin)',
    userEmail: 'admin@rofani.co.ke',
    authorizingRole: 'Expenses Role', // Specifically exercised Expenses Role
    assignedRolesSnapshot: ['Admin', 'Expenses Role', 'Sales Role'],
    requiredPermissionKey: 'canDeleteDailyEntries',
    targetId: 'exp-util-001',
    targetName: 'Electricity & Generator Fuel Bill',
    details: {
      summary: 'Deleted redundant duplicate utility invoice KSh 4,500 (Ref: KPLC-8812)',
      before: {
        category: 'Utilities',
        amount: 4500,
        description: 'Electricity & Generator Fuel Bill',
        receiptNo: 'KPLC-8812',
        paymentMethod: 'mpesa',
      },
    },
    reason: 'Duplicate payment entry recorded twice by morning and afternoon shifts',
    severity: 'critical',
  },
  {
    id: 'audit-init-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    actionType: 'MODIFY_INVENTORY',
    actionTitle: 'Modified Product: Basmati Biryani Rice 5kg',
    category: 'inventory',
    userId: 'usr-4',
    userName: 'David Smith (Stock Staff)',
    userEmail: 'david@rofani.co.ke',
    authorizingRole: 'Stock Setup Role', // Specifically exercised Stock Setup Role
    assignedRolesSnapshot: ['Inventory Staff', 'Stock Ins Role', 'Stock Setup Role'],
    requiredPermissionKey: 'canAddNewProducts',
    targetId: 'prod-1',
    targetName: 'Basmati Biryani Rice 5kg',
    details: {
      summary: 'Updated selling price from KSh 1,200 to KSh 1,250 and adjusted min stock threshold',
      diff: {
        sellingPrice: { old: 1200, new: 1250 },
        minStockAlert: { old: 10, new: 15 },
      },
      before: { sellingPrice: 1200, minStockAlert: 10 },
      after: { sellingPrice: 1250, minStockAlert: 15 },
    },
    reason: 'New distributor price adjustment announced for Q3',
    severity: 'high',
  },
  {
    id: 'audit-init-003',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
    actionType: 'DELETE_PRODUCT',
    actionTitle: 'Deleted Product: Expired Promo Sample Pack',
    category: 'inventory',
    userId: 'usr-1',
    userName: 'John Doe (Admin)',
    userEmail: 'admin@rofani.co.ke',
    authorizingRole: 'Admin', // Exercised Master Admin authority
    assignedRolesSnapshot: ['Admin', 'Expenses Role', 'Sales Role', 'Inventory Staff'],
    requiredPermissionKey: 'canAddNewProducts',
    targetId: 'prod-sample-old',
    targetName: 'Promo Sample Pack (Discontinued)',
    details: {
      summary: 'Permanently removed obsolete seasonal promotional sample pack with 0 stock',
      before: {
        sku: 'SMP-DISC-099',
        barcode: '9900112233',
        stockQuantity: 0,
        sellingPrice: 0,
      },
    },
    reason: 'Product discontinued by manufacturer; zero remaining stock',
    severity: 'critical',
  },
  {
    id: 'audit-init-004',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    actionType: 'ADJUST_STOCK',
    actionTitle: 'Stock Reconciliation: 4 Discrepancy Adjustments',
    category: 'stock',
    userId: 'usr-4',
    userName: 'David Smith (Stock Staff)',
    userEmail: 'david@rofani.co.ke',
    authorizingRole: 'Can count and update stock balance', // Granular capability role
    assignedRolesSnapshot: ['Inventory Staff', 'Stock Ins Role', 'Stock Setup Role', 'Can count and update stock balance'],
    requiredPermissionKey: 'canCountUpdateStockBalance',
    details: {
      summary: 'Adjusted physical inventory count for 4 shelf items; net variance -2 units (KSh 1,400)',
      metadata: {
        adjustedProductsCount: 4,
        netVarianceUnits: -2,
        varianceCostKSh: 1400,
      },
    },
    reason: 'Monthly physical aisle stock-take reconciliation',
    severity: 'high',
  },
];

/**
 * Load audit logs from safe local storage, initializing with realistic records if empty.
 */
export function loadAuditLogsFromStorage(): SensitiveActionLog[] {
  const saved = safeGetJSON<SensitiveActionLog[]>(STORAGE_KEY, []);
  if (!saved || saved.length === 0) {
    safeSetJSON(STORAGE_KEY, INITIAL_AUDIT_LOGS);
    return INITIAL_AUDIT_LOGS;
  }
  return saved;
}

/**
 * Persist audit logs to local storage.
 */
export function saveAuditLogsToStorage(logs: SensitiveActionLog[]): void {
  safeSetJSON(STORAGE_KEY, logs);
}

/**
 * Export audit logs to downloadable CSV format.
 */
export function exportAuditLogsToCSV(logs: SensitiveActionLog[]): void {
  const headers = [
    'Timestamp',
    'Action Type',
    'Action Title',
    'Category',
    'Worker Name',
    'Worker Email',
    'Authorizing Role Used',
    'All Assigned Roles',
    'Target ID',
    'Target Name',
    'Summary Details',
    'Reason / Justification',
    'Severity',
  ];

  const rows = logs.map((log) => [
    `"${log.timestamp}"`,
    `"${log.actionType}"`,
    `"${(log.actionTitle || '').replace(/"/g, '""')}"`,
    `"${log.category}"`,
    `"${(log.userName || '').replace(/"/g, '""')}"`,
    `"${log.userEmail || ''}"`,
    `"${(log.authorizingRole || '').replace(/"/g, '""')}"`,
    `"${(log.assignedRolesSnapshot || []).join('; ').replace(/"/g, '""')}"`,
    `"${log.targetId || ''}"`,
    `"${(log.targetName || '').replace(/"/g, '""')}"`,
    `"${(log.details?.summary || '').replace(/"/g, '""')}"`,
    `"${(log.reason || '').replace(/"/g, '""')}"`,
    `"${log.severity}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `security_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
