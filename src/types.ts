export type Role =
  | 'Admin'
  | 'Manager'
  | 'Cashier'
  | 'Inventory Staff'
  | 'Sales Role'
  | 'Stock Ins Role'
  | 'Stock Setup Role'
  | 'Expenses Role';

export type CommissionType = 'percentage' | 'tiered' | 'fixed_per_sale' | 'profit_share';

export interface CommissionTier {
  minSales: number;
  maxSales?: number;
  rate: number; // percentage e.g. 5, 7.5, 10
}

export interface WorkerPermissions {
  // SALES ROLE
  canMakeSales: boolean;
  canManageCustomerOrders: boolean;
  canUpdateSalesOrderStatus: boolean;
  canViewManageCustomers: boolean;
  canEnableSalesCommission: boolean;

  // STOCK INS ROLES
  canAddStockIn: boolean;
  canManageSupplierOrders: boolean;
  canViewManageSupplies: boolean;
  canAddBadStock: boolean;

  // STOCK SETUP ROLES
  canAddNewProducts: boolean;
  canCreateOffers: boolean;
  canViewOutOfStock: boolean;
  canCountUpdateStockBalance: boolean;

  // EXPENSES ROLES
  canAddExpenses: boolean;

  // OTHER ROLES
  canGiveDiscounts: boolean;
  canEditDailyEntries: boolean;
  canDeleteDailyEntries: boolean;
  canBackdateEntries: boolean;
  canReturnStocks: boolean;
  canGenerateBarcode: boolean;
  canPreviewReceipt: boolean;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  assignedRoles?: string[]; // e.g. ['Sales Role', 'Stock Ins Role']
  email: string;
  pin: string;
  avatar?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  department?: string;
  hireDate?: string;
  notes?: string;
  customRoleTitle?: string;
  permissions?: Partial<WorkerPermissions>;
  commissionRate?: number; // percentage e.g. 5 for 5%
  commissionType?: CommissionType; // 'percentage' | 'tiered' | 'fixed_per_sale' | 'profit_share'
  fixedCommissionPerSale?: number; // e.g. KSh 50 per sale
  commissionTiers?: CommissionTier[]; // e.g. [{minSales: 0, maxSales: 30000, rate: 5}, {minSales: 30000, maxSales: 70000, rate: 7.5}, {minSales: 70000, rate: 10}]
  dailySalesTarget?: number; // e.g. 25000
  profitShareRate?: number; // percentage of gross profit e.g. 15%
}

export type PaymentMethod = 'cash' | 'credit_card' | 'cheque' | 'mpesa' | 'upi' | 'bank_transfer';

export interface PaymentBreakdown {
  method: PaymentMethod;
  amount: number;
  reference?: string; // Cheque #, M-Pesa Code, UPI Ref, etc.
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  subcategory: string;
  sizeCapacity: string; // e.g. "500ml", "1kg", "XL", "128GB"
  description: string;
  costPrice: number;
  buyingPrice?: number;
  sellingPrice: number;
  stockQuantity: number;
  stock?: number;
  minStockAlert: number;
  unit: string; // "pcs", "kg", "liters", "boxes"
  supplierId: string;
  supplierName: string;
  imageUrl?: string;
  storeStock?: Record<string, number>; // Mapping from store location ID to stock quantity
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage or fixed amount
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  currentBalanceDue: number; // For credit / partial payments
  debtBalance?: number;
  kraPin?: string; // Tax PIN / KRA PIN for invoice
  creditLimit?: number; // Maximum allowed credit balance
  customerType?: 'Individual' | 'Wholesaler' | 'Corporate' | 'VIP';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  totalSuppliedValue: number;
  currentBalanceDue?: number; // Outstanding credit / accounts payable owed to supplier
  currentBalance?: number; // Alias for backward compatibility
  kraPin?: string; // Tax PIN / VAT #
  paymentTerms?: string; // e.g. "Net 15 Days", "Cash on Delivery", "Net 30 Days"
  bankDetails?: string; // e.g. "Equity Bank - Acc #1234567" or "Paybill 123456 Acc: XYZ"
  categorySpecialty?: string; // e.g. "Electronics & Cables", "Apparel Wholesaler"
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  receiptNumber: string;
  date: string; // ISO string
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  discountAuthorizedBy?: string; // e.g. "John Doe (Admin)"
  taxTotal: number;
  grandTotal: number;
  total?: number; // Alias for backward compatibility
  paymentMethod?: string; // Alias for single payment method summary
  amountPaid: number;
  balanceDue: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  payments: PaymentBreakdown[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  cashierName: string;
  cashierId: string;
  salesRepId?: string; // Staff member who assisted / made the sale
  salesRepName?: string;
  cashierCommissionRate?: number; // e.g. 5 for 5%
  cashierCommissionAmount?: number; // e.g. grandTotal * 0.05
  commissionModelApplied?: string; // e.g. "5% Standard", "Tier 2 (7.5%)", "Fixed KSh 50/sale", "15% Margin Share"
  storeId?: string;
  storeName?: string;
  sourceType?: 'POS' | 'Online Store';
  notes?: string;
}

export interface StaffCommissionPayout {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD or date label
  period?: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate?: string;
  endDate?: string;
  totalSalesAmount: number;
  salesCount: number;
  commissionRate: number; // e.g. 5% or effective % rate
  commissionEarned: number;
  loanDeduction?: number; // Automatic loan repayment deduction
  deductedLoanId?: string;
  paidAmount: number; // Net paid amount
  status: 'Paid' | 'Pending';
  paidAt?: string;
  paidBy?: string;
  paymentMethod?: PaymentMethod | 'salary_addition';
  referenceNo?: string;
  notes?: string;
}

export interface WorkerLoanRepayment {
  id: string;
  loanId: string;
  amount: number;
  date: string; // YYYY-MM-DD or ISO
  paymentMethod: PaymentMethod | 'salary_deduction';
  referenceNo?: string; // M-Pesa Code, Cheque #, Salary Slip Ref, etc.
  recordedBy: string;
  notes?: string;
}

export interface WorkerLoan {
  id: string;
  loanNumber: string; // e.g. "WLN-2026-001"
  workerId: string;
  workerName: string;
  role: Role;
  principalAmount: number;
  totalRepaid: number;
  balanceDue: number; // principalAmount - totalRepaid
  issueDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  disbursementMethod: PaymentMethod;
  disbursementRef?: string;
  purpose: string; // e.g. "Salary Advance / Emergency", "Rent Advance", "Medical Support", "School Fees"
  status: 'Active' | 'Fully Repaid' | 'Overdue' | 'Written Off';
  approvedBy: string;
  repayments: WorkerLoanRepayment[];
  notes?: string;
}

export type RecurringFrequency = 'One-Time' | 'Daily' | 'Monthly' | 'Yearly';

export interface Expense {
  id: string;
  date: string;
  category: 'Rent' | 'Utilities' | 'Salaries' | 'Transport' | 'Restock' | 'Maintenance' | 'Miscellaneous';
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  recordedBy: string;
  receiptNo?: string;
  recurringType?: RecurringFrequency;
  nextDueDate?: string;
  isRecurring?: boolean;
  status?: 'Paid' | 'Due' | 'Overdue';
}

export interface RestockRecord {
  id: string;
  productId: string;
  productName: string;
  quantityAdded: number;
  unitCost: number;
  totalCost: number;
  supplierName: string;
  supplierId?: string;
  date: string; // ISO string or YYYY-MM-DD
  receivedBy: string;
  batchNo?: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: Role;
  date: string; // YYYY-MM-DD
  clockInTime: string; // HH:mm
  clockOutTime?: string; // HH:mm
  status: 'Present' | 'Late' | 'Half-Day' | 'Absent' | 'On Leave';
  workHours?: number;
  notes?: string;
}

export interface StockCountItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  systemQuantity: number;
  physicalQuantity: number;
  variance: number; // physical - system
  varianceCost: number; // variance * costPrice
  unit: string;
}

export interface StockCountAudit {
  id: string;
  auditDate: string;
  auditedBy: string;
  items: StockCountItem[];
  totalVarianceCount: number;
  totalVarianceCost: number;
  status: 'Completed' | 'Pending Adjustment';
  notes: string;
}

export type CashTransactionType = 'CASH_IN' | 'CASH_OUT';

export type CashInCategory =
  | 'Bank Loan'
  | 'Chama / Merry-Go-Round Payout'
  | 'SACCO / Microfinance Loan'
  | 'Mobile / Digital Loan'
  | 'Owner Capital / Equity'
  | 'Bank Withdrawal to Vault'
  | 'Customer Debt Payment'
  | 'Asset Sale'
  | 'Refund Received'
  | 'Other Cash In';

export type CashOutCategory =
  | 'Bank / SACCO Loan Repayment'
  | 'Bank Loan Repayment'
  | 'Chama Contribution / Table Banking'
  | 'Mobile Loan Repayment'
  | 'Bank Deposit (Vault to Bank)'
  | 'Supplier Cash Payment'
  | 'Petty Cash Payout'
  | 'Owner Drawings / Dividends'
  | 'Tax & County License Payment'
  | 'Tax Payment'
  | 'Equipment & Asset Purchase'
  | 'Other Cash Out';

export type FacilityType =
  | 'Bank Loan'
  | 'Chama / Merry-Go-Round'
  | 'SACCO Loan'
  | 'Mobile / Merchant Float'
  | 'Table Banking'
  | 'Other Financing';

export interface FacilityRepayment {
  id: string;
  facilityId: string;
  amount: number;
  date: string; // ISO string
  paymentMethod: 'cash' | 'mpesa' | 'bank_transfer' | 'cheque';
  referenceNo: string;
  recordedBy: string;
  notes?: string;
}

export interface FinancingFacility {
  id: string;
  facilityNumber: string; // e.g. "FAC-KCB-001", "CHAMA-USH-01"
  name: string; // e.g. "KCB SME Business Expansion Loan", "Ushirika Chama Table Loan"
  facilityType: FacilityType;
  lenderOrGroupName: string; // e.g. "KCB Bank Kenya Ltd", "Ushirika Women Chama Group", "Stima SACCO"
  contactPerson?: string;
  contactPhone?: string;
  principalAmount: number; // Disbursed principal
  interestRatePercentage?: number; // e.g. 12% APR or 5% flat
  totalRepayableAmount: number; // Principal + total interest
  totalRepaid: number;
  balanceRemaining: number; // totalRepayableAmount - totalRepaid
  disbursementDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  installmentAmount?: number; // e.g. Monthly installment amount
  repaymentFrequency?: 'Monthly' | 'Weekly' | 'Bi-Weekly' | 'Daily' | 'Lump Sum';
  disbursementMethod: 'bank_transfer' | 'mpesa' | 'cash' | 'cheque';
  disbursementRef: string;
  status: 'Active' | 'Fully Cleared' | 'Overdue' | 'Defaulted';
  repayments?: FacilityRepayment[];
  purpose: string;
  notes?: string;
}

export interface CashTransaction {
  id: string;
  type: CashTransactionType;
  category: CashInCategory | CashOutCategory;
  amount: number;
  date: string; // ISO String or YYYY-MM-DD
  sourceDestination: string; // e.g. "KCB Bank Kenya Ltd", "Ushirika Chama", "Equity Bank Vault", "Main Cash Register"
  referenceNo: string; // e.g. "LOAN-KCB-2026-001", "CHAMA-PAY-7749", "SLIP-EQB-77491"
  paymentMethod: 'cash' | 'mpesa' | 'bank_transfer' | 'cheque';
  description: string;
  recordedBy: string;
  status: 'Completed' | 'Pending Verification';
  facilityId?: string; // Optional link to FinancingFacility
  notes?: string;
}

export interface StoreLocation {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  whatsappPhone?: string;
  isMainBranch?: boolean;
  isOnlineStorefront?: boolean;
  active: boolean;
  managerName?: string;
}

export interface OfferDeal {
  id: string;
  code: string; // e.g., "WELCOME10", "WEEKEND20"
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'bogo';
  discountValue: number; // e.g. 20 for 20% or 500 for KSh 500
  minOrderAmount?: number;
  applicableCategory?: string;
  bannerTag?: string; // e.g. "🔥 Hot Offer", "⚡ Flash Sale"
  validUntil?: string; // YYYY-MM-DD
  active: boolean;
  storeId?: string; // 'all' or specific store ID
}

export interface OnlineOrder {
  id: string;
  orderNumber: string; // e.g., "ORD-1002"
  storeId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  deliveryType: 'Delivery' | 'Store Pickup';
  items: CartItem[];
  subtotal: number;
  promoCodeApplied?: string;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
  paymentMethod: 'mpesa' | 'card' | 'cash_on_delivery';
  paymentStatus: 'Paid' | 'Pending Payment';
  orderStatus: 'Pending' | 'Confirmed' | 'Preparing' | 'Out for Delivery / Ready' | 'Completed' | 'Cancelled';
  createdAt: string;
  notes?: string;
}

export interface StockTransferRecord {
  id: string;
  transferNumber: string; // e.g. "TRF-2026-001"
  sourceStoreId: string;
  sourceStoreName: string;
  targetStoreId: string;
  targetStoreName: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  status: 'Completed' | 'In Transit' | 'Cancelled';
  createdAt: string;
  transferredBy: string;
  notes?: string;
}

export interface BarcodeScanLog {
  id: string;
  barcode: string;
  productId?: string;
  productName: string;
  category?: string;
  subcategory?: string;
  sku?: string;
  sellingPrice?: number;
  costPrice?: number;
  stockQuantity?: number;
  imageUrl?: string;
  scannedAt: string; // ISO timestamp string e.g. 2026-09-12T06:15:00.000Z
  userId: string;
  userName: string;
  userRole?: string;
  scanLocation: 'inventory' | 'pos' | 'stocktake' | 'quick_scan';
  deviceType?: 'camera' | 'barcode_gun' | 'manual';
  actionTaken?: 'view_details' | 'added_to_cart' | 'stock_audit' | 'price_check' | 'catalog_search' | 'lookup_failed';
  notes?: string;
}

