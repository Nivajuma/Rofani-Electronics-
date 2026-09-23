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
  | 'settings';

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

export const DEFAULT_ROLE_WORKER_PERMISSIONS: Record<Role, WorkerPermissions> = {
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

export const ROLE_CONFIGURATIONS: Record<Role, RoleConfiguration> = {
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
 * Get effective worker permissions, combining role defaults with user-specific custom overrides
 */
export function getWorkerPermissions(user?: User | null): WorkerPermissions {
  if (!user) {
    return { ...DEFAULT_ROLE_WORKER_PERMISSIONS['Cashier'] };
  }
  const roleDefaults = DEFAULT_ROLE_WORKER_PERMISSIONS[user.role] || DEFAULT_ROLE_WORKER_PERMISSIONS['Cashier'];
  if (!user.permissions) {
    return { ...roleDefaults };
  }
  return {
    ...roleDefaults,
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
  if (user.role === 'Admin') return true; // Admins always have master access
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
  if (user.role === 'Admin') return true;

  // Check base role allowed tabs
  const config = ROLE_CONFIGURATIONS[user.role];
  if (config && config.allowedTabs.includes(tab)) {
    return true;
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
    default:
      return false;
  }
}

/**
 * Check if a role can manage workers (add/edit/delete)
 */
export function canManageStaff(role: Role): boolean {
  return ROLE_CONFIGURATIONS[role]?.canManageStaff ?? false;
}

/**
 * Check if a role can view all worker PINs in clear text
 */
export function canViewStaffPins(role: Role): boolean {
  return ROLE_CONFIGURATIONS[role]?.canViewStaffPins ?? false;
}

/**
 * Check if a role can view gross profit margins and business profit numbers
 */
export function canViewGrossProfit(role: Role): boolean {
  return ROLE_CONFIGURATIONS[role]?.canViewGrossProfit ?? false;
}

/**
 * Check if a role can view or modify system/data/tax settings
 */
export function canManageSettings(role: Role): boolean {
  return ROLE_CONFIGURATIONS[role]?.canManageSettings ?? false;
}

/**
 * Check if a role or user can delete inventory items
 */
export function canDeleteInventory(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (roleOrUser.role === 'Admin') return true;
    return hasWorkerPermission(roleOrUser, 'canDeleteDailyEntries') || ROLE_CONFIGURATIONS[roleOrUser.role]?.canDeleteInventory || false;
  }
  return ROLE_CONFIGURATIONS[roleOrUser]?.canDeleteInventory ?? false;
}

/**
 * Check if a role or user can edit or create inventory products
 */
export function canEditInventory(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (roleOrUser.role === 'Admin') return true;
    return (
      hasWorkerPermission(roleOrUser, 'canAddNewProducts') ||
      hasWorkerPermission(roleOrUser, 'canAddStockIn') ||
      roleOrUser.role === 'Manager' ||
      roleOrUser.role === 'Inventory Staff'
    );
  }
  return roleOrUser === 'Admin' || roleOrUser === 'Manager' || roleOrUser === 'Inventory Staff';
}

/**
 * Check if a role can edit or view product cost/buying prices
 */
export function canEditCostPrices(role: Role): boolean {
  return ROLE_CONFIGURATIONS[role]?.canEditCostPrices ?? false;
}

/**
 * Check if a role or user can authorize custom sales discounts
 */
export function canAuthorizeDiscounts(roleOrUser: Role | User): boolean {
  if (typeof roleOrUser === 'object') {
    if (roleOrUser.role === 'Admin') return true;
    return hasWorkerPermission(roleOrUser, 'canGiveDiscounts') || ROLE_CONFIGURATIONS[roleOrUser.role]?.canAuthorizeDiscounts || false;
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
 * Apply a role package to any worker, updating both their role and default permissions
 */
export function applyRoleToWorker(worker: User, newRole: Role): User {
  const newPermissions = { ...DEFAULT_ROLE_WORKER_PERMISSIONS[newRole] };
  return {
    ...worker,
    role: newRole,
    permissions: newPermissions,
    customRoleTitle: worker.customRoleTitle || ROLE_CONFIGURATIONS[newRole]?.label || newRole,
  };
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
};
