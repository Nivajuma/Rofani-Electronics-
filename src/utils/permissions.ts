import { Role, User, WorkerPermissions } from '../types';

export type TabKey =
  | 'pos'
  | 'inventory'
  | 'stocktake'
  | 'contacts'
  | 'cashmanagement'
  | 'expenses'
  | 'attendance'
  | 'reports'
  | 'onlinestore'
  | 'onlineorders'
  | 'settings'
  | 'auditlogs';

export interface PermissionDefinition {
  key: keyof WorkerPermissions;
  label: string;
  category: 'sales' | 'stockIns' | 'stockSetup' | 'expenses' | 'other';
  categoryLabel: string;
  description: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // SALES ROLE
  {
    key: 'canMakeSales',
    label: 'Can make sales',
    category: 'sales',
    categoryLabel: 'SALES ROLE',
    description: 'Ring up POS sales, add items to cart, and process checkout payments.',
  },
  {
    key: 'canManageCustomerOrders',
    label: 'Can make / manage customers orders',
    category: 'sales',
    categoryLabel: 'SALES ROLE',
    description: 'Create, edit, cancel, and oversee online and local customer sales orders.',
  },
  {
    key: 'canUpdateSalesOrderStatus',
    label: 'Can update sales order status',
    category: 'sales',
    categoryLabel: 'SALES ROLE',
    description: 'Change order lifecycle status between Pending, Preparing, Ready, Delivered, and Cancelled.',
  },
  {
    key: 'canViewManageCustomers',
    label: 'Can view and manage customers',
    category: 'sales',
    categoryLabel: 'SALES ROLE',
    description: 'Access customer profiles, record customer debts, and update credit allowances.',
  },
  {
    key: 'canEnableSalesCommission',
    label: 'Can enable sales commission',
    category: 'sales',
    categoryLabel: 'SALES ROLE',
    description: 'View sales performance commission, configure targets, and calculate staff commissions.',
  },

  // STOCK INS ROLES
  {
    key: 'canAddStockIn',
    label: 'Can add stock in',
    category: 'stockIns',
    categoryLabel: 'STOCK INS ROLES',
    description: 'Receive incoming stock shipments, restock inventory items, and log purchase bills.',
  },
  {
    key: 'canManageSupplierOrders',
    label: 'Can make/manage orders to suppliers',
    category: 'stockIns',
    categoryLabel: 'STOCK INS ROLES',
    description: 'Issue purchase orders, track supplier restocking requests, and manage deliveries.',
  },
  {
    key: 'canViewManageSupplies',
    label: 'Can view and manage supplies',
    category: 'stockIns',
    categoryLabel: 'STOCK INS ROLES',
    description: 'View supplier directory, vendor contact information, and supplier order histories.',
  },
  {
    key: 'canAddBadStock',
    label: 'Can add bad stock',
    category: 'stockIns',
    categoryLabel: 'STOCK INS ROLES',
    description: 'Write off expired, damaged, or defective goods and record inventory shrinkage.',
  },

  // STOCK SETUP ROLES
  {
    key: 'canAddNewProducts',
    label: 'Can add new products',
    category: 'stockSetup',
    categoryLabel: 'STOCK SETUP ROLES',
    description: 'Create new catalog products, input categories, cost prices, and selling prices.',
  },
  {
    key: 'canCreateOffers',
    label: 'Can creat offers',
    category: 'stockSetup',
    categoryLabel: 'STOCK SETUP ROLES',
    description: 'Set up promotional deals, bundle packages, discounts, and flash sales.',
  },
  {
    key: 'canViewOutOfStock',
    label: 'Can view items out of stock',
    category: 'stockSetup',
    categoryLabel: 'STOCK SETUP ROLES',
    description: 'View low-stock alarms, out-of-stock items, and automated reorder reminders.',
  },
  {
    key: 'canCountUpdateStockBalance',
    label: 'Can count and update stock balance',
    category: 'stockSetup',
    categoryLabel: 'STOCK SETUP ROLES',
    description: 'Perform physical stock-take counting and reconcile system balances with physical inventory.',
  },

  // EXPENSES ROLES
  {
    key: 'canAddExpenses',
    label: 'Can add expenses',
    category: 'expenses',
    categoryLabel: 'EXPENSES ROLES',
    description: 'Record operating expenses, petty cash outflows, rent, utility bills, and transport costs.',
  },

  // OTHER ROLES
  {
    key: 'canGiveDiscounts',
    label: 'can give discounts',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Apply percentage or fixed cash discounts during checkout without supervisor PIN authorization.',
  },
  {
    key: 'canEditDailyEntries',
    label: 'Can edit daily entries',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Modify logged sales, shift notes, payment methods, and cash records for today.',
  },
  {
    key: 'canDeleteDailyEntries',
    label: 'Can delete daily entries',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Void or delete today\'s recorded transactions, ledger entries, or sales invoices.',
  },
  {
    key: 'canBackdateEntries',
    label: 'Can backdate entries',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Record sales, expenses, or stock adjustments with a date earlier than today.',
  },
  {
    key: 'canReturnStocks',
    label: 'Can return stocks',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Process customer returns, issue refund payments, and restock returned items.',
  },
  {
    key: 'canGenerateBarcode',
    label: 'Can generate barcode',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Auto-generate EAN/Code128 barcodes and batch print sticky product labels.',
  },
  {
    key: 'canPreviewReceipt',
    label: 'Can previer receipt',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Preview, download, and reprint thermal 58mm/80mm or standard A4 invoice receipts.',
  },
];

export const DEFAULT_ROLE_WORKER_PERMISSIONS: Record<string, WorkerPermissions> = {
  Admin: {
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
    canEditDailyEntries: true,
    canDeleteDailyEntries: true,
    canBackdateEntries: true,
    canReturnStocks: true,
    canGenerateBarcode: true,
    canPreviewReceipt: true,
  },
  Manager: {
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
    canEditDailyEntries: true,
    canDeleteDailyEntries: true,
    canBackdateEntries: true,
    canReturnStocks: true,
    canGenerateBarcode: true,
    canPreviewReceipt: true,
  },
  Cashier: {
    canMakeSales: true,
    canManageCustomerOrders: true,
    canUpdateSalesOrderStatus: true,
    canViewManageCustomers: true,
    canEnableSalesCommission: false,
    canAddStockIn: false,
    canManageSupplierOrders: false,
    canViewManageSupplies: false,
    canAddBadStock: false,
    canAddNewProducts: false,
    canCreateOffers: false,
    canViewOutOfStock: false,
    canCountUpdateStockBalance: false,
    canAddExpenses: false,
    canGiveDiscounts: false,
    canEditDailyEntries: false,
    canDeleteDailyEntries: false,
    canBackdateEntries: false,
    canReturnStocks: false,
    canGenerateBarcode: false,
    canPreviewReceipt: true,
  },
  'Inventory Staff': {
    canMakeSales: false,
    canManageCustomerOrders: false,
    canUpdateSalesOrderStatus: false,
    canViewManageCustomers: false,
    canEnableSalesCommission: false,
    canAddStockIn: true,
    canManageSupplierOrders: true,
    canViewManageSupplies: true,
    canAddBadStock: true,
    canAddNewProducts: true,
    canCreateOffers: false,
    canViewOutOfStock: true,
    canCountUpdateStockBalance: true,
    canAddExpenses: false,
    canGiveDiscounts: false,
    canEditDailyEntries: false,
    canDeleteDailyEntries: false,
    canBackdateEntries: false,
    canReturnStocks: true,
    canGenerateBarcode: true,
    canPreviewReceipt: false,
  },
  'Sales Role': {
    canMakeSales: true,
    canManageCustomerOrders: true,
    canUpdateSalesOrderStatus: true,
    canViewManageCustomers: true,
    canEnableSalesCommission: true,
    canAddStockIn: false,
    canManageSupplierOrders: false,
    canViewManageSupplies: false,
    canAddBadStock: false,
    canAddNewProducts: false,
    canCreateOffers: false,
    canViewOutOfStock: false,
    canCountUpdateStockBalance: false,
    canAddExpenses: false,
    canGiveDiscounts: false,
    canEditDailyEntries: false,
    canDeleteDailyEntries: false,
    canBackdateEntries: false,
    canReturnStocks: false,
    canGenerateBarcode: false,
    canPreviewReceipt: true,
  },
  'Stock Ins Role': {
    canMakeSales: false,
    canManageCustomerOrders: false,
    canUpdateSalesOrderStatus: false,
    canViewManageCustomers: false,
    canEnableSalesCommission: false,
    canAddStockIn: true,
    canManageSupplierOrders: true,
    canViewManageSupplies: true,
    canAddBadStock: true,
    canAddNewProducts: false,
    canCreateOffers: false,
    canViewOutOfStock: true,
    canCountUpdateStockBalance: false,
    canAddExpenses: false,
    canGiveDiscounts: false,
    canEditDailyEntries: false,
    canDeleteDailyEntries: false,
    canBackdateEntries: false,
    canReturnStocks: true,
    canGenerateBarcode: false,
    canPreviewReceipt: false,
  },
  'Stock Setup Role': {
    canMakeSales: false,
    canManageCustomerOrders: false,
    canUpdateSalesOrderStatus: false,
    canViewManageCustomers: false,
    canEnableSalesCommission: false,
    canAddStockIn: false,
    canManageSupplierOrders: false,
    canViewManageSupplies: false,
    canAddBadStock: false,
    canAddNewProducts: true,
    canCreateOffers: true,
    canViewOutOfStock: true,
    canCountUpdateStockBalance: true,
    canAddExpenses: false,
    canGiveDiscounts: false,
    canEditDailyEntries: false,
    canDeleteDailyEntries: false,
    canBackdateEntries: false,
    canReturnStocks: false,
    canGenerateBarcode: true,
    canPreviewReceipt: false,
  },
  'Expenses Role': {
    canMakeSales: false,
    canManageCustomerOrders: false,
    canUpdateSalesOrderStatus: false,
    canViewManageCustomers: false,
    canEnableSalesCommission: false,
    canAddStockIn: false,
    canManageSupplierOrders: false,
    canViewManageSupplies: false,
    canAddBadStock: false,
    canAddNewProducts: false,
    canCreateOffers: false,
    canViewOutOfStock: false,
    canCountUpdateStockBalance: false,
    canAddExpenses: true,
    canGiveDiscounts: false,
    canEditDailyEntries: true,
    canDeleteDailyEntries: false,
    canBackdateEntries: false,
    canReturnStocks: false,
    canGenerateBarcode: false,
    canPreviewReceipt: false,
  },
};

export interface RoleConfiguration {
  label: string;
  description: string;
  allowedTabs: TabKey[];
  canManageStaff: boolean;
  canViewStaffPins: boolean;
  canViewGrossProfit: boolean;
  canManageSettings: boolean;
  canDeleteInventory: boolean;
  canEditCostPrices: boolean;
  canAuthorizeDiscounts: boolean;
}

export const ROLE_CONFIGURATIONS: Record<string, RoleConfiguration> = {
  Admin: {
    label: 'Administrator (Owner)',
    description: 'Unrestricted full access to all system operations, financial data, worker PINs, and store configurations.',
    allowedTabs: [
      'pos',
      'inventory',
      'stocktake',
      'contacts',
      'cashmanagement',
      'expenses',
      'attendance',
      'reports',
      'onlinestore',
      'onlineorders',
      'settings',
      'auditlogs',
    ],
    canManageStaff: true,
    canViewStaffPins: true,
    canViewGrossProfit: true,
    canManageSettings: true,
    canDeleteInventory: true,
    canEditCostPrices: true,
    canAuthorizeDiscounts: true,
  },
  Manager: {
    label: 'Branch Manager',
    description: 'Oversees daily sales operations, inventory restocking, expenses, and staff attendance without root configuration access.',
    allowedTabs: [
      'pos',
      'inventory',
      'stocktake',
      'contacts',
      'cashmanagement',
      'expenses',
      'attendance',
      'reports',
      'onlinestore',
      'onlineorders',
      'auditlogs',
    ],
    canManageStaff: false,
    canViewStaffPins: false,
    canViewGrossProfit: true,
    canManageSettings: false,
    canDeleteInventory: true,
    canEditCostPrices: true,
    canAuthorizeDiscounts: true,
  },
  Cashier: {
    label: 'Sales Cashier',
    description: 'Operates POS checkout, receives payments, manages customer orders, and reviews daily cashier shift logs.',
    allowedTabs: ['pos', 'contacts', 'onlineorders'],
    canManageStaff: false,
    canViewStaffPins: false,
    canViewGrossProfit: false,
    canManageSettings: false,
    canDeleteInventory: false,
    canEditCostPrices: false,
    canAuthorizeDiscounts: false,
  },
  'Inventory Staff': {
    label: 'Storekeeper / Inventory Staff',
    description: 'Manages physical warehouse stock, counts, supplier restocking, and item catalog additions.',
    allowedTabs: ['inventory', 'stocktake', 'contacts'],
    canManageStaff: false,
    canViewStaffPins: false,
    canViewGrossProfit: false,
    canManageSettings: false,
    canDeleteInventory: false,
    canEditCostPrices: true,
    canAuthorizeDiscounts: false,
  },
  'Sales Role': {
    label: 'Sales Role (POS & Orders)',
    description: 'Can make sales, manage customer orders, update order status, view/manage customers, and sales commission.',
    allowedTabs: ['pos', 'contacts', 'onlineorders'],
    canManageStaff: false,
    canViewStaffPins: false,
    canViewGrossProfit: false,
    canManageSettings: false,
    canDeleteInventory: false,
    canEditCostPrices: false,
    canAuthorizeDiscounts: false,
  },
  'Stock Ins Role': {
    label: 'Stock Ins Role (Receiving & Supplies)',
    description: 'Can add stock in, manage supplier orders, view/manage supplies, and record bad stock.',
    allowedTabs: ['inventory', 'stocktake', 'contacts'],
    canManageStaff: false,
    canViewStaffPins: false,
    canViewGrossProfit: false,
    canManageSettings: false,
    canDeleteInventory: false,
    canEditCostPrices: true,
    canAuthorizeDiscounts: false,
  },
  'Stock Setup Role': {
    label: 'Stock Setup Role (Catalog & Counting)',
    description: 'Can add new products, create offers, view out of stock, count & update stock balance, and print barcodes.',
    allowedTabs: ['inventory', 'stocktake'],
    canManageStaff: false,
    canViewStaffPins: false,
    canViewGrossProfit: false,
    canManageSettings: false,
    canDeleteInventory: false,
    canEditCostPrices: false,
    canAuthorizeDiscounts: false,
  },
  'Expenses Role': {
    label: 'Expenses Role (Expense Tracker)',
    description: 'Can add expenses, log daily payouts, and edit daily expense entries.',
    allowedTabs: ['expenses', 'cashmanagement'],
    canManageStaff: false,
    canViewStaffPins: false,
    canViewGrossProfit: false,
    canManageSettings: false,
    canDeleteInventory: false,
    canEditCostPrices: false,
    canAuthorizeDiscounts: false,
  },
};

/**
 * All 21 granular role definitions corresponding to every individual functional capability
 */
export interface GranularRoleInfo {
  role: Role;
  key: keyof WorkerPermissions;
  label: string;
  category: 'sales' | 'stockIns' | 'stockSetup' | 'expenses' | 'other';
  categoryLabel: string;
  description: string;
}

export const ALL_21_GRANULAR_ROLES: GranularRoleInfo[] = [
  {
    role: 'Can make sales',
    key: 'canMakeSales',
    label: 'Can make sales',
    category: 'sales',
    categoryLabel: 'SALES ROLES',
    description: 'Ring up POS sales, add items to cart, and process checkout payments.',
  },
  {
    role: 'Can make / manage customers orders',
    key: 'canManageCustomerOrders',
    label: 'Can make / manage customers orders',
    category: 'sales',
    categoryLabel: 'SALES ROLES',
    description: 'Create, edit, cancel, and oversee online and local customer sales orders.',
  },
  {
    role: 'Can update sales order status',
    key: 'canUpdateSalesOrderStatus',
    label: 'Can update sales order status',
    category: 'sales',
    categoryLabel: 'SALES ROLES',
    description: 'Change order lifecycle status between Pending, Preparing, Ready, Delivered, and Cancelled.',
  },
  {
    role: 'Can view and manage customers',
    key: 'canViewManageCustomers',
    label: 'Can view and manage customers',
    category: 'sales',
    categoryLabel: 'SALES ROLES',
    description: 'Access customer profiles, record customer debts, and update credit allowances.',
  },
  {
    role: 'Can enable sales commission',
    key: 'canEnableSalesCommission',
    label: 'Can enable sales commission',
    category: 'sales',
    categoryLabel: 'SALES ROLES',
    description: 'View sales performance commission, configure targets, and calculate staff commissions.',
  },
  {
    role: 'Can add stock in',
    key: 'canAddStockIn',
    label: 'Can add stock in',
    category: 'stockIns',
    categoryLabel: 'STOCK INS ROLES',
    description: 'Receive incoming stock shipments, restock inventory items, and log purchase bills.',
  },
  {
    role: 'Can make/manage orders to suppliers',
    key: 'canManageSupplierOrders',
    label: 'Can make/manage orders to suppliers',
    category: 'stockIns',
    categoryLabel: 'STOCK INS ROLES',
    description: 'Issue purchase orders, track supplier restocking requests, and manage deliveries.',
  },
  {
    role: 'Can view and manage supplies',
    key: 'canViewManageSupplies',
    label: 'Can view and manage supplies',
    category: 'stockIns',
    categoryLabel: 'STOCK INS ROLES',
    description: 'View supplier directory, vendor contact information, and supplier order histories.',
  },
  {
    role: 'Can add bad stock',
    key: 'canAddBadStock',
    label: 'Can add bad stock',
    category: 'stockIns',
    categoryLabel: 'STOCK INS ROLES',
    description: 'Write off expired, damaged, or defective goods and record inventory shrinkage.',
  },
  {
    role: 'Can add new products',
    key: 'canAddNewProducts',
    label: 'Can add new products',
    category: 'stockSetup',
    categoryLabel: 'STOCK SETUP ROLES',
    description: 'Create new catalog products, input categories, cost prices, and selling prices.',
  },
  {
    role: 'Can creat offers',
    key: 'canCreateOffers',
    label: 'Can creat offers',
    category: 'stockSetup',
    categoryLabel: 'STOCK SETUP ROLES',
    description: 'Set up promotional deals, bundle packages, discounts, and flash sales.',
  },
  {
    role: 'Can view items out of stock',
    key: 'canViewOutOfStock',
    label: 'Can view items out of stock',
    category: 'stockSetup',
    categoryLabel: 'STOCK SETUP ROLES',
    description: 'View low-stock alarms, out-of-stock items, and automated reorder reminders.',
  },
  {
    role: 'Can count and update stock balance',
    key: 'canCountUpdateStockBalance',
    label: 'Can count and update stock balance',
    category: 'stockSetup',
    categoryLabel: 'STOCK SETUP ROLES',
    description: 'Perform physical stock-take counting and reconcile system balances with physical inventory.',
  },
  {
    role: 'Can add expenses',
    key: 'canAddExpenses',
    label: 'Can add expenses',
    category: 'expenses',
    categoryLabel: 'EXPENSES ROLES',
    description: 'Record operating expenses, petty cash outflows, rent, utility bills, and transport costs.',
  },
  {
    role: 'can give discounts',
    key: 'canGiveDiscounts',
    label: 'can give discounts',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Apply percentage or fixed cash discounts during checkout without supervisor PIN authorization.',
  },
  {
    role: 'Can edit daily entries',
    key: 'canEditDailyEntries',
    label: 'Can edit daily entries',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Modify logged sales, shift notes, payment methods, and cash records for today.',
  },
  {
    role: 'Can delete daily entries',
    key: 'canDeleteDailyEntries',
    label: 'Can delete daily entries',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Void or delete today\'s recorded transactions, ledger entries, or sales invoices.',
  },
  {
    role: 'Can backdate entries',
    key: 'canBackdateEntries',
    label: 'Can backdate entries',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Record sales, expenses, or stock adjustments with a date earlier than today.',
  },
  {
    role: 'Can return stocks',
    key: 'canReturnStocks',
    label: 'Can return stocks',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Process customer returns, issue refund payments, and restock returned items.',
  },
  {
    role: 'Can generate barcode',
    key: 'canGenerateBarcode',
    label: 'Can generate barcode',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Auto-generate EAN/Code128 barcodes and batch print sticky product labels.',
  },
  {
    role: 'Can previer receipt',
    key: 'canPreviewReceipt',
    label: 'Can previer receipt',
    category: 'other',
    categoryLabel: 'OTHER ROLES',
    description: 'Preview, download, and reprint thermal 58mm/80mm or standard A4 invoice receipts.',
  },
];

/**
 * 8 Core store classifications and department bundle roles
 */
export const PRIMARY_ROLES: Role[] = [
  'Admin',
  'Manager',
  'Cashier',
  'Inventory Staff',
  'Sales Role',
  'Stock Ins Role',
  'Stock Setup Role',
  'Expenses Role',
];

/**
 * All available system roles: Includes core classifications PLUS all 21 individual granular capability roles
 */
export const ALL_ROLES: Role[] = [
  ...PRIMARY_ROLES,
  ...ALL_21_GRANULAR_ROLES.map((r) => r.role),
];

/**
 * Get all roles assigned to a user (extracts from roles array, primary role, assignedRoles, and permissions)
 * Also ensures that default store admin/owner accounts always retain Admin.
 */
export function getUserRoles(user?: User | null): Role[] {
  if (!user) return ['Cashier'];
  const list = new Set<Role>();

  // 1. Roles array (supports 1, 2, 3, up to all 21+ roles)
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      if (r && typeof r === 'string' && r.trim()) {
        list.add(r as Role);
      }
    });
  }

  // 2. Primary role
  if (user.role && typeof user.role === 'string' && user.role.trim()) {
    list.add(user.role as Role);
  }

  // 3. Backwards-compatible assignedRoles array
  if (Array.isArray(user.assignedRoles)) {
    user.assignedRoles.forEach((r) => {
      if (r && typeof r === 'string' && r.trim()) {
        list.add(r as Role);
      }
    });
  }

  // 4. Default owner accounts always retain Admin
  if (
    user.id === 'usr-1' ||
    user.email?.toLowerCase() === 'admin@rofani.co.ke' ||
    user.email?.toLowerCase() === 'nivajuma@gmail.com'
  ) {
    list.add('Admin');
  }

  const result = Array.from(list);
  return result.length > 0 ? result : [user.role || 'Cashier'];
}

/**
 * Check if a user or role has a specific role assigned.
 * (e.g. hasRole(user, 'Inventory Staff'), hasRole(user, 'Admin'), hasRole(user, 'Sales Role'))
 * Supports role synonyms, bundle checking, granular 21 role checking, and case insensitivity.
 */
export function hasRole(userOrRole?: User | Role | null, roleToCheck?: Role | string): boolean {
  if (!userOrRole || !roleToCheck) return false;

  const targetStr = roleToCheck.toString().trim().toLowerCase();

  // If passed a role string directly
  if (typeof userOrRole === 'string') {
    const directStr = userOrRole.trim().toLowerCase();
    if (directStr === targetStr) return true;
    if (directStr === 'admin') return true; // Admin has all roles
    return false;
  }

  const user = userOrRole;

  // Store owner or Admin account always has all roles
  if (
    user.id === 'usr-1' ||
    user.email?.toLowerCase() === 'admin@rofani.co.ke' ||
    user.email?.toLowerCase() === 'nivajuma@gmail.com' ||
    user.role === 'Admin' ||
    (Array.isArray(user.roles) && user.roles.some((r) => r?.toString().toLowerCase() === 'admin'))
  ) {
    return true;
  }

  const userRoles = getUserRoles(user);
  const normalizedUserRoles = userRoles.map((r) => r?.toString().trim().toLowerCase());

  // 1. Direct match in assigned roles
  if (normalizedUserRoles.includes(targetStr)) {
    return true;
  }

  // 2. Primary role match
  if (user.role && user.role.toString().trim().toLowerCase() === targetStr) {
    return true;
  }

  // 3. Composite or bundle role checks:
  // 'Inventory Staff' can be held directly OR granted by 'Stock Ins Role' / 'Stock Setup Role' / inventory permissions
  if (targetStr === 'inventory staff' || targetStr === 'inventory') {
    if (normalizedUserRoles.some((r) => r.includes('inventory staff'))) return true;
    if (normalizedUserRoles.some((r) => r.includes('stock ins') || r.includes('stock setup'))) return true;
    const perms = getWorkerPermissions(user);
    if (perms.canAddStockIn || perms.canAddNewProducts || perms.canCountUpdateStockBalance) return true;
  }

  if (targetStr === 'cashier' || targetStr === 'sales role' || targetStr === 'sales') {
    if (normalizedUserRoles.some((r) => r.includes('cashier') || r.includes('sales'))) return true;
    const perms = getWorkerPermissions(user);
    if (perms.canMakeSales) return true;
  }

  if (targetStr === 'expenses role' || targetStr === 'expenses') {
    if (normalizedUserRoles.some((r) => r.includes('expenses'))) return true;
    const perms = getWorkerPermissions(user);
    if (perms.canAddExpenses) return true;
  }

  if (targetStr === 'stock ins role' || targetStr === 'stock ins') {
    if (normalizedUserRoles.some((r) => r.includes('stock ins'))) return true;
    const perms = getWorkerPermissions(user);
    if (perms.canAddStockIn || perms.canManageSupplierOrders) return true;
  }

  if (targetStr === 'stock setup role' || targetStr === 'stock setup') {
    if (normalizedUserRoles.some((r) => r.includes('stock setup'))) return true;
    const perms = getWorkerPermissions(user);
    if (perms.canAddNewProducts || perms.canCreateOffers || perms.canCountUpdateStockBalance) return true;
  }

  if (targetStr === 'manager') {
    if (normalizedUserRoles.some((r) => r.includes('manager'))) return true;
  }

  // 4. Check if checking for any of the 21 granular roles by permission key or label
  const matchingGranular = ALL_21_GRANULAR_ROLES.find(
    (g) =>
      g.key.toLowerCase() === targetStr ||
      g.role.toLowerCase() === targetStr ||
      g.label.toLowerCase() === targetStr
  );
  if (matchingGranular) {
    const perms = getWorkerPermissions(user);
    if (perms[matchingGranular.key]) return true;
  }

  return false;
}

/**
 * Empty baseline permissions
 */
export const DEFAULT_EMPTY_PERMISSIONS: WorkerPermissions = {
  canMakeSales: false,
  canManageCustomerOrders: false,
  canUpdateSalesOrderStatus: false,
  canViewManageCustomers: false,
  canEnableSalesCommission: false,
  canAddStockIn: false,
  canManageSupplierOrders: false,
  canViewManageSupplies: false,
  canAddBadStock: false,
  canAddNewProducts: false,
  canCreateOffers: false,
  canViewOutOfStock: false,
  canCountUpdateStockBalance: false,
  canAddExpenses: false,
  canGiveDiscounts: false,
  canEditDailyEntries: false,
  canDeleteDailyEntries: false,
  canBackdateEntries: false,
  canReturnStocks: false,
  canGenerateBarcode: false,
  canPreviewReceipt: false,
};

/**
 * Combine permissions granted by multiple roles (union of allowed privileges across all assigned roles)
 */
export function getCombinedPermissionsForRoles(roles: Role[]): WorkerPermissions {
  if (roles.some((r) => r?.toString().toLowerCase() === 'admin')) {
    return { ...DEFAULT_ROLE_WORKER_PERMISSIONS['Admin'] };
  }
  const combined = { ...DEFAULT_ROLE_WORKER_PERMISSIONS['Cashier'] };

  roles.forEach((r) => {
    // 1. Check if it's one of the bundle roles
    const roleDef = DEFAULT_ROLE_WORKER_PERMISSIONS[r as Role];
    if (roleDef) {
      for (const [key, val] of Object.entries(roleDef)) {
        if (val) {
          (combined as any)[key] = true;
        }
      }
    }
    // 2. Check if it matches any of the 21 granular roles
    const granular = ALL_21_GRANULAR_ROLES.find(
      (g) =>
        g.role.toLowerCase() === r.toString().toLowerCase() ||
        g.key.toLowerCase() === r.toString().toLowerCase()
    );
    if (granular) {
      combined[granular.key] = true;
    }
  });

  return combined;
}


/**
 * Assign all 21 granular roles to a worker (full master operational access)
 */
export function assignAll21RolesToWorker(worker: User): User {
  const all21RoleNames = ALL_21_GRANULAR_ROLES.map((r) => r.role);
  const nextRoles = Array.from(new Set([...getUserRoles(worker), ...all21RoleNames]));
  return setWorkerRoles(worker, nextRoles);
}

/**
 * Get effective worker permissions, combining all assigned role defaults with user-specific custom overrides
 */
export function getWorkerPermissions(user?: User | null): WorkerPermissions {
  if (!user) {
    return { ...DEFAULT_ROLE_WORKER_PERMISSIONS['Cashier'] };
  }
  if (hasRole(user, 'Admin')) {
    return { ...DEFAULT_ROLE_WORKER_PERMISSIONS['Admin'] };
  }
  const userRoles = getUserRoles(user);
  const baseDefaults = getCombinedPermissionsForRoles(userRoles);
  if (!user.permissions) {
    return { ...baseDefaults };
  }
  return {
    ...baseDefaults,
    ...user.permissions,
  };
}

/**
 * Check if a specific worker has a given granular capability
 */
export function hasWorkerPermission(
  user: User | null | undefined,
  permissionKey: keyof WorkerPermissions
): boolean {
  if (!user) return false;
  if (hasRole(user, 'Admin')) return true; // Admins always have master access
  const permissions = getWorkerPermissions(user);
  return !!permissions[permissionKey];
}

/**
 * Check if a role or user has access to a specific tab
 * Enhanced: checks both role baseline and custom worker permissions!
 */
export function hasTabPermission(roleOrUser: Role | User, tab: TabKey): boolean {
  if (typeof roleOrUser === 'string') {
    const config = ROLE_CONFIGURATIONS[roleOrUser];
    if (!config) return false;
    return config.allowedTabs.includes(tab);
  }

  const user = roleOrUser;
  if (hasRole(user, 'Admin')) return true;

  // Check all assigned roles
  const roles = getUserRoles(user);
  for (const r of roles) {
    const config = ROLE_CONFIGURATIONS[r];
    if (config && config.allowedTabs.includes(tab)) {
      return true;
    }
  }

  // Dynamic permission expansion based on flexible worker roles
  const perms = getWorkerPermissions(user);
  switch (tab) {
    case 'pos':
      return perms.canMakeSales;
    case 'inventory':
      return perms.canAddStockIn || perms.canAddNewProducts || perms.canAddBadStock || perms.canViewOutOfStock || perms.canCountUpdateStockBalance;
    case 'stocktake':
      return perms.canCountUpdateStockBalance;
    case 'contacts':
      return perms.canViewManageCustomers || perms.canViewManageSupplies || perms.canManageSupplierOrders;
    case 'expenses':
      return perms.canAddExpenses;
    case 'onlineorders':
      return perms.canManageCustomerOrders || perms.canUpdateSalesOrderStatus;
    case 'attendance':
      return perms.canEnableSalesCommission;
    case 'auditlogs':
      return hasRole(user, 'Admin') || hasRole(user, 'Manager') || perms.canDeleteDailyEntries || perms.canEditDailyEntries;
    default:
      return false;
  }
}

/**
 * Check if a role or user can manage workers (add/edit/delete)
 */
export function canManageStaff(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (hasRole(roleOrUser, 'Admin') || hasRole(roleOrUser, 'Manager')) return true;
    return getUserRoles(roleOrUser).some((r) => ROLE_CONFIGURATIONS[r]?.canManageStaff);
  }
  return ROLE_CONFIGURATIONS[roleOrUser]?.canManageStaff ?? false;
}

/**
 * Check if a role or user can view all worker PINs in clear text
 */
export function canViewStaffPins(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (hasRole(roleOrUser, 'Admin')) return true;
    return getUserRoles(roleOrUser).some((r) => ROLE_CONFIGURATIONS[r]?.canViewStaffPins);
  }
  return ROLE_CONFIGURATIONS[roleOrUser]?.canViewStaffPins ?? false;
}

/**
 * Check if a role or user can view gross profit margins and business profit numbers
 */
export function canViewGrossProfit(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (hasRole(roleOrUser, 'Admin') || hasRole(roleOrUser, 'Manager')) return true;
    return getUserRoles(roleOrUser).some((r) => ROLE_CONFIGURATIONS[r]?.canViewGrossProfit);
  }
  return ROLE_CONFIGURATIONS[roleOrUser]?.canViewGrossProfit ?? false;
}

/**
 * Check if a role or user can view or modify system/data/tax settings
 */
export function canManageSettings(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (hasRole(roleOrUser, 'Admin')) return true;
    return getUserRoles(roleOrUser).some((r) => ROLE_CONFIGURATIONS[r]?.canManageSettings);
  }
  return ROLE_CONFIGURATIONS[roleOrUser]?.canManageSettings ?? false;
}

/**
 * Check if a role or user can delete inventory items
 */
export function canDeleteInventory(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (hasRole(roleOrUser, 'Admin')) return true;
    return (
      hasWorkerPermission(roleOrUser, 'canDeleteDailyEntries') ||
      getUserRoles(roleOrUser).some((r) => ROLE_CONFIGURATIONS[r]?.canDeleteInventory) ||
      false
    );
  }
  return ROLE_CONFIGURATIONS[roleOrUser]?.canDeleteInventory ?? false;
}

/**
 * Check if a role or user can edit or create inventory products
 */
export function canEditInventory(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (hasRole(roleOrUser, 'Admin')) return true;
    return (
      hasWorkerPermission(roleOrUser, 'canAddNewProducts') ||
      hasWorkerPermission(roleOrUser, 'canAddStockIn') ||
      hasRole(roleOrUser, 'Manager') ||
      hasRole(roleOrUser, 'Inventory Staff')
    );
  }
  return roleOrUser === 'Admin' || roleOrUser === 'Manager' || roleOrUser === 'Inventory Staff';
}

/**
 * Check if a role or user can edit or view product cost/buying prices
 */
export function canEditCostPrices(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (hasRole(roleOrUser, 'Admin')) return true;
    return getUserRoles(roleOrUser).some((r) => ROLE_CONFIGURATIONS[r]?.canEditCostPrices);
  }
  return ROLE_CONFIGURATIONS[roleOrUser]?.canEditCostPrices ?? false;
}

/**
 * Check if a role or user can authorize custom sales discounts
 */
export function canAuthorizeDiscounts(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (hasRole(roleOrUser, 'Admin')) return true;
    return (
      hasWorkerPermission(roleOrUser, 'canGiveDiscounts') ||
      getUserRoles(roleOrUser).some((r) => ROLE_CONFIGURATIONS[r]?.canAuthorizeDiscounts) ||
      false
    );
  }
  return ROLE_CONFIGURATIONS[roleOrUser]?.canAuthorizeDiscounts ?? false;
}

/**
 * Get role styling badges
 */
export function getRoleBadgeStyle(role: Role): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  pillColor: string;
} {
  switch (role) {
    case 'Admin':
      return {
        badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        badgeText: 'text-rose-400',
        badgeBorder: 'border-rose-500/30',
        pillColor: 'bg-rose-500 text-white',
      };
    case 'Manager':
      return {
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        badgeText: 'text-amber-400',
        badgeBorder: 'border-amber-500/30',
        pillColor: 'bg-amber-500 text-white',
      };
    case 'Cashier':
      return {
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/30',
        pillColor: 'bg-emerald-500 text-white',
      };
    case 'Inventory Staff':
      return {
        badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        badgeText: 'text-sky-400',
        badgeBorder: 'border-sky-500/30',
        pillColor: 'bg-sky-500 text-white',
      };
    case 'Sales Role':
      return {
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/30',
        pillColor: 'bg-emerald-500 text-white',
      };
    case 'Stock Ins Role':
      return {
        badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        badgeText: 'text-cyan-400',
        badgeBorder: 'border-cyan-500/30',
        pillColor: 'bg-cyan-500 text-white',
      };
    case 'Stock Setup Role':
      return {
        badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        badgeText: 'text-indigo-400',
        badgeBorder: 'border-indigo-500/30',
        pillColor: 'bg-indigo-500 text-white',
      };
    case 'Expenses Role':
      return {
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        badgeText: 'text-amber-400',
        badgeBorder: 'border-amber-500/30',
        pillColor: 'bg-amber-500 text-white',
      };
    default:
      return {
        badgeBg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        badgeText: 'text-slate-400',
        badgeBorder: 'border-slate-500/30',
        pillColor: 'bg-slate-500 text-white',
      };
  }
}

export interface SelectableRoleOption {
  role: Role;
  label: string;
  badge: string;
  category: 'sales' | 'stock' | 'finance' | 'primary' | 'admin';
  description: string;
  permissionsSummary: string;
}

export const ALL_SELECTABLE_ROLES: SelectableRoleOption[] = [
  {
    role: 'Sales Role',
    label: 'Sales Role (POS & Customer Orders)',
    badge: 'Sales Role',
    category: 'sales',
    description: 'Specialized role for counter sales, customer orders, order fulfillment, and commission tracking.',
    permissionsSummary: 'Sales, Customer Orders, Status, Customers, Commissions, Receipts',
  },
  {
    role: 'Stock Ins Role',
    label: 'Stock Ins Role (Receiving & Supplies)',
    badge: 'Stock Ins',
    category: 'stock',
    description: 'Responsible for receiving warehouse arrivals, managing supplier purchase orders, and logging bad stock.',
    permissionsSummary: 'Stock In, Supplier Orders, Supply Management, Bad/Damaged Stock',
  },
  {
    role: 'Stock Setup Role',
    label: 'Stock Setup Role (Catalog & Barcodes)',
    badge: 'Stock Setup',
    category: 'stock',
    description: 'Responsible for adding new items, discount promotions, viewing out-of-stock items, physical counts, and barcodes.',
    permissionsSummary: 'Add Products, Offers, Out-of-Stock View, Stock Balance, Barcodes',
  },
  {
    role: 'Expenses Role',
    label: 'Expenses Role (Expenditures & Petty Cash)',
    badge: 'Expenses Role',
    category: 'finance',
    description: 'Dedicated to recording store operational expenses, petty cash, and daily business payments.',
    permissionsSummary: 'Log Expenses, Edit Daily Entries, Cash Management',
  },
  {
    role: 'Cashier',
    label: 'Cashier (Standard POS & Cash Drawer)',
    badge: 'Cashier',
    category: 'primary',
    description: 'Standard retail sales cashier for daily checkout, scanning, payment processing, and customer receipts.',
    permissionsSummary: 'Make Sales, Customer Orders, View Customers, Receipt Preview',
  },
  {
    role: 'Inventory Staff',
    label: 'Inventory Staff (Storekeeper & Restocking)',
    badge: 'Storekeeper',
    category: 'primary',
    description: 'Warehouse storekeeper managing arrivals, physical counts, supplier goods, and catalog updates.',
    permissionsSummary: 'Stock In, Supplier Orders, Supplies, Bad Stock, Add Products, Counts, Barcodes',
  },
  {
    role: 'Manager',
    label: 'Branch Manager (Operations Oversight)',
    badge: 'Manager',
    category: 'primary',
    description: 'Operational manager with authorization to grant sales discounts, oversee inventory, and inspect financial metrics.',
    permissionsSummary: 'All Sales + All Stock + Expenses + Discounts + Staff Attendance',
  },
  {
    role: 'Admin',
    label: 'Administrator (Owner / Root Access)',
    badge: 'Admin',
    category: 'admin',
    description: 'Unrestricted full master access to all system tabs, financial data, worker PINs, and store configurations.',
    permissionsSummary: 'Unrestricted Full Master Access Across Everything',
  },
];

/**
 * Assign an exact set of multiple roles to a worker (supports 1, 2, 3, 4, 5+ roles!)
 * Automatically recalculates and applies combined permissions across all assigned roles.
 */
export function setWorkerRoles(worker: User, newRoles: Role[]): User {
  let safeRoles: Role[] = newRoles.length > 0 ? Array.from(new Set(newRoles)) : ['Cashier'];

  // Protect store owner from losing Admin
  if (
    (worker.id === 'usr-1' ||
      worker.email?.toLowerCase() === 'admin@rofani.co.ke' ||
      worker.email?.toLowerCase() === 'nivajuma@gmail.com') &&
    !safeRoles.includes('Admin')
  ) {
    safeRoles.push('Admin');
  }

  // Primary display role priority: Admin > Manager > first role
  const primaryRole: Role = safeRoles.includes('Admin')
    ? 'Admin'
    : safeRoles.includes('Manager')
    ? 'Manager'
    : safeRoles[0];

  const combinedPerms = getCombinedPermissionsForRoles(safeRoles);

  return {
    ...worker,
    role: primaryRole,
    roles: safeRoles,
    assignedRoles: safeRoles,
    permissions: {
      ...combinedPerms,
      ...(worker.permissions || {}),
    },
    customRoleTitle:
      worker.customRoleTitle ||
      (safeRoles.length > 1 ? `${safeRoles.length} Roles Assigned` : safeRoles[0]),
  };
}

/**
 * Add an additional role to a worker without deleting their existing roles.
 * Supports adding more than 3 roles!
 */
export function addRoleToWorker(worker: User, roleToAdd: Role): User {
  const currentRoles = getUserRoles(worker);
  if (currentRoles.includes(roleToAdd)) {
    return worker;
  }
  return setWorkerRoles(worker, [...currentRoles, roleToAdd]);
}

/**
 * Remove a specific role from a worker.
 */
export function removeRoleFromWorker(worker: User, roleToRemove: Role): User {
  const currentRoles = getUserRoles(worker);
  if (
    roleToRemove === 'Admin' &&
    (worker.id === 'usr-1' ||
      worker.email?.toLowerCase() === 'admin@rofani.co.ke' ||
      worker.email?.toLowerCase() === 'nivajuma@gmail.com')
  ) {
    return worker;
  }
  const updatedRoles = currentRoles.filter((r) => r !== roleToRemove);
  return setWorkerRoles(worker, updatedRoles.length > 0 ? updatedRoles : ['Cashier']);
}

/**
 * Toggle a role on/off for a worker
 */
export function toggleRoleOnWorker(worker: User, roleToToggle: Role): User {
  const currentRoles = getUserRoles(worker);
  if (currentRoles.includes(roleToToggle)) {
    return removeRoleFromWorker(worker, roleToToggle);
  } else {
    return addRoleToWorker(worker, roleToToggle);
  }
}

/**
 * Apply a role package to any worker, updating both their role and default permissions.
 * Safeguard: If the worker had Admin, preserves Admin in their roles array!
 */
export function applyRoleToWorker(worker: User, newRole: Role, append: boolean = false): User {
  if (append) {
    return addRoleToWorker(worker, newRole);
  }
  const currentRoles = getUserRoles(worker);
  let updatedRoles: Role[];
  if (currentRoles.includes('Admin')) {
    // Keep Admin so the administrator is NEVER locked out!
    updatedRoles = Array.from(new Set([...currentRoles, newRole]));
  } else {
    updatedRoles = [newRole];
  }
  return setWorkerRoles(worker, updatedRoles);
}

/**
 * Toggle an entire role bundle (Sales, Stock Ins, Stock Setup, Expenses, Other) for any worker
 */
export function toggleRoleCategoryOnWorker(
  worker: User,
  category: 'sales' | 'stockIns' | 'stockSetup' | 'expenses' | 'other',
  enable?: boolean
): User {
  const currentPerms = getWorkerPermissions(worker);
  const keys = PERMISSION_DEFINITIONS.filter((p) => p.category === category).map((p) => p.key);
  
  // If enable flag is not explicitly passed, toggle based on whether all are already enabled
  const areAllEnabled = keys.every((k) => currentPerms[k]);
  const shouldEnable = enable !== undefined ? enable : !areAllEnabled;

  const updatedPerms = { ...currentPerms };
  keys.forEach((k) => {
    updatedPerms[k] = shouldEnable;
  });

  // Track assigned role badges in assignedRoles array
  const categoryLabels: Record<string, string> = {
    sales: 'Sales Role',
    stockIns: 'Stock Ins Role',
    stockSetup: 'Stock Setup Role',
    expenses: 'Expenses Role',
    other: 'Other Roles',
  };
  const categoryLabel = categoryLabels[category];
  const existingAssigned = worker.assignedRoles || [];
  let updatedAssigned = [...existingAssigned];
  if (shouldEnable) {
    if (!updatedAssigned.includes(categoryLabel)) {
      updatedAssigned.push(categoryLabel);
    }
  } else {
    updatedAssigned = updatedAssigned.filter((r) => r !== categoryLabel);
  }

  return {
    ...worker,
    assignedRoles: updatedAssigned,
    permissions: updatedPerms,
  };
}

/**
 * Friendly readable module tab labels
 */
export const TAB_LABELS: Record<TabKey, string> = {
  pos: 'Point of Sale (POS)',
  inventory: 'Inventory Control',
  stocktake: 'Physical Stock Audit',
  contacts: 'Customers & Suppliers',
  cashmanagement: 'Cash Drawer & Finance',
  expenses: 'Business Expenses',
  attendance: 'Staff Attendance & Commissions',
  reports: 'Financial Reports & Analytics',
  onlinestore: 'Online Storefront',
  onlineorders: 'Online Orders & Delivery',
  settings: 'System & KRA Fiscal Settings',
  auditlogs: 'Worker Role Authorization Audit Trail',
};
