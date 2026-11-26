import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Building2,
  Search,
  Plus,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  Download,
  MessageCircle,
  Eye,
  Edit2,
  Trash2,
  CreditCard,
  Package,
  Layers,
  ArrowUpDown,
  FileText,
  Sparkles,
  Smartphone,
  MessageSquare,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Send,
  Check,
  Share2,
  Clock,
  Wallet,
  RotateCcw,
  MessageSquareWarning,
  PackageCheck,
  ShoppingBag,
} from 'lucide-react';
import {
  Customer,
  Supplier,
  Transaction,
  Product,
  User,
  PaymentMethod,
  CashTransaction,
  CustomerDepositRecord,
  CustomerComplaint,
  CustomerReturnRecord,
  CustomerReturnItem,
  ReturnRefundMode,
} from '../../types';
import {
  exportCustomerReportPDF,
  exportCustomerReturnPDF,
  exportSupplierReportPDF,
  exportReceiptPDF,
} from '../../utils/pdfGenerator';
import { formatKSh } from '../../utils/currency';
import { CustomerEditModal } from './CustomerEditModal';
import { CustomerDebtPaymentModal } from './CustomerDebtPaymentModal';
import { CustomerDetailsModal } from './CustomerDetailsModal';
import { CustomerContactsListModal } from './CustomerContactsListModal';
import { CustomerDepositModal } from './CustomerDepositModal';
import { CustomerReturnModal } from './CustomerReturnModal';
import { CustomerComplaintModal } from './CustomerComplaintModal';
import { SupplierEditModal } from './SupplierEditModal';
import { SupplierPaymentModal } from './SupplierPaymentModal';
import { SupplierDetailsModal } from './SupplierDetailsModal';
import { SupplierPaymentHistoryModal } from './SupplierPaymentHistoryModal';
import { ContactsImportExportModal } from './ContactsImportExportModal';
import { PhonebookImportModal } from './PhonebookImportModal';
import { CustomerPromotionGeneratorModal } from '../Marketing/CustomerPromotionGeneratorModal';
import { WhatsAppMarketingSection } from './WhatsAppMarketingSection';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import { OfferDeal } from '../../types';

interface CustomersSuppliersViewProps {
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  cashTransactions: CashTransaction[];
  products: Product[];
  currentUser: User;
  offers?: OfferDeal[];
  customerDeposits?: CustomerDepositRecord[];
  customerComplaints?: CustomerComplaint[];
  customerReturns?: CustomerReturnRecord[];
  storeName?: string;
  storeKraPin?: string;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onSaveSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onRecordCustomerDebtPayment: (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ) => void;
  onRecordCustomerDepositOrPayment?: (params: {
    customerId: string;
    mode: 'deposit' | 'partial_payment';
    amount: number;
    paymentMethod: PaymentMethod | 'store_credit';
    linkedTransactionId?: string;
    referenceNo?: string;
    notes?: string;
  }) => void;
  onProcessCustomerReturn?: (params: {
    customer: Customer;
    transaction: Transaction;
    items: CustomerReturnItem[];
    refundMode: ReturnRefundMode;
    cashRefundAmount: number;
    cashRefundChannel?: 'cash' | 'mpesa';
    cashRefundRef?: string;
    reason: string;
    notes?: string;
  }) => CustomerReturnRecord | void;
  onSaveCustomerComplaint?: (complaint: CustomerComplaint) => void;
  onRecordSupplierPayment: (
    supplierId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ) => void;
  onImportCustomers: (newCustomers: Customer[]) => void;
  onImportSuppliers: (newSuppliers: Supplier[]) => void;
  onNavigateToRestock?: (supplierName: string) => void;
}

export const CustomersSuppliersView: React.FC<CustomersSuppliersViewProps> = ({
  customers,
  suppliers,
  transactions,
  cashTransactions,
  products,
  currentUser,
  offers,
  customerDeposits = [],
  customerComplaints = [],
  customerReturns = [],
  storeName,
  storeKraPin,
  onSaveCustomer,
  onDeleteCustomer,
  onSaveSupplier,
  onDeleteSupplier,
  onRecordCustomerDebtPayment,
  onRecordCustomerDepositOrPayment,
  onProcessCustomerReturn,
  onSaveCustomerComplaint,
  onRecordSupplierPayment,
  onImportCustomers,
  onImportSuppliers,
  onNavigateToRestock,
}) => {
  // Main Tab: 'customers', 'suppliers', or 'whatsapp'
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers' | 'whatsapp'>(() =>
    safeGetJSON<'customers' | 'suppliers' | 'whatsapp'>('retail_pos_contacts_active_tab', 'customers', (val) =>
      val === 'customers' || val === 'suppliers' || val === 'whatsapp'
    )
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_active_tab', activeTab);
  }, [activeTab]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState(() =>
    safeGetJSON<string>('retail_pos_contacts_search', '', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_search', searchQuery);
  }, [searchQuery]);

  const [customerFilter, setCustomerFilter] = useState<'all' | 'debt' | 'clear' | 'vip' | 'wholesaler' | 'corporate'>(() =>
    safeGetJSON('retail_pos_contacts_cust_filter', 'all')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_cust_filter', customerFilter);
  }, [customerFilter]);

  const [supplierFilter, setSupplierFilter] = useState<'all' | 'payable' | 'clear'>(() =>
    safeGetJSON('retail_pos_contacts_supp_filter', 'all')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_supp_filter', supplierFilter);
  }, [supplierFilter]);

  const [sortBy, setSortBy] = useState<'name' | 'debt' | 'volume'>(() =>
    safeGetJSON<'name' | 'debt' | 'volume'>('retail_pos_contacts_sort_by', 'debt', (val) =>
      ['name', 'debt', 'volume'].includes(val)
    )
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_sort_by', sortBy);
  }, [sortBy]);

  // Alphabetical A-Z Quick-Jump Filter
  const [activeLetter, setActiveLetter] = useState<string>(() =>
    safeGetJSON<string>('retail_pos_contacts_letter_filter', 'ALL')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_letter_filter', activeLetter);
  }, [activeLetter]);

  // High-Performance Pagination (20, 50, 100, 200 per page)
  const [pageSize, setPageSize] = useState<number>(() =>
    safeGetJSON<number>('retail_pos_contacts_page_size', 50, (val) => [20, 50, 100, 200].includes(val))
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_page_size', pageSize);
  }, [pageSize]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  // Bulk Selection Control
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(() => new Set());
  const [preselectedMarketingIds, setPreselectedMarketingIds] = useState<string[] | undefined>(undefined);

  // Modal States
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(() =>
    safeGetJSON<Customer | null>('retail_pos_contacts_edit_cust', null, (val) => Boolean(val && val.id))
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_edit_cust', editingCustomer);
  }, [editingCustomer]);

  const [isCustomerEditOpen, setIsCustomerEditOpen] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_contacts_edit_cust_open', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_edit_cust_open', isCustomerEditOpen);
  }, [isCustomerEditOpen]);

  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(() =>
    safeGetJSON<Customer | null>('retail_pos_contacts_pay_cust', null, (val) => Boolean(val && val.id))
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_pay_cust', payingCustomer);
  }, [payingCustomer]);

  const [isCustomerPayOpen, setIsCustomerPayOpen] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_contacts_pay_cust_open', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_pay_cust_open', isCustomerPayOpen);
  }, [isCustomerPayOpen]);

  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(() =>
    safeGetJSON<Customer | null>('retail_pos_contacts_view_cust', null, (val) => Boolean(val && val.id))
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_view_cust', viewingCustomer);
  }, [viewingCustomer]);

  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_contacts_view_cust_open', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_view_cust_open', isCustomerDetailsOpen);
  }, [isCustomerDetailsOpen]);

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(() =>
    safeGetJSON<Supplier | null>('retail_pos_contacts_edit_supp', null, (val) => Boolean(val && val.id))
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_edit_supp', editingSupplier);
  }, [editingSupplier]);

  const [isSupplierEditOpen, setIsSupplierEditOpen] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_contacts_edit_supp_open', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_edit_supp_open', isSupplierEditOpen);
  }, [isSupplierEditOpen]);

  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(() =>
    safeGetJSON<Supplier | null>('retail_pos_contacts_pay_supp', null, (val) => Boolean(val && val.id))
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_pay_supp', payingSupplier);
  }, [payingSupplier]);

  const [isSupplierPayOpen, setIsSupplierPayOpen] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_contacts_pay_supp_open', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_pay_supp_open', isSupplierPayOpen);
  }, [isSupplierPayOpen]);

  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(() =>
    safeGetJSON<Supplier | null>('retail_pos_contacts_view_supp', null, (val) => Boolean(val && val.id))
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_view_supp', viewingSupplier);
  }, [viewingSupplier]);

  const [isSupplierDetailsOpen, setIsSupplierDetailsOpen] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_contacts_view_supp_open', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_contacts_view_supp_open', isSupplierDetailsOpen);
  }, [isSupplierDetailsOpen]);

  const [viewingSupplierHistory, setViewingSupplierHistory] = useState<Supplier | null>(null);
  const [isSupplierHistoryOpen, setIsSupplierHistoryOpen] = useState(false);

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isPhonebookModalOpen, setIsPhonebookModalOpen] = useState(false);
  const [isPromoGeneratorOpen, setIsPromoGeneratorOpen] = useState(false);
  const [selectedPromoCustomer, setSelectedPromoCustomer] = useState<Customer | null>(null);

  // Customer contactsList and Delete Confirmation States
  const [selectedCustomerForContactsList, setSelectedCustomerForContactsList] = useState<Customer | null>(null);
  const [isCustomerContactsListOpen, setIsCustomerContactsListOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deleteNoticeMessage, setDeleteNoticeMessage] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Customer Sub-View & New Modal States (Sales/Partial Payments, Deposits, Returns & Restock, Complaints)
  const [customerSubView, setCustomerSubView] = useState<
    'directory' | 'sales_partial' | 'deposits' | 'returns' | 'complaints'
  >('directory');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<
    'ALL' | 'Open' | 'In Review' | 'Escalated' | 'Resolved'
  >('ALL');
  const [salesStatusFilter, setSalesStatusFilter] = useState<'ALL' | 'Partial' | 'Unpaid' | 'Paid'>('ALL');

  const [depositModalCustomer, setDepositModalCustomer] = useState<Customer | null>(null);
  const [depositModalMode, setDepositModalMode] = useState<'deposit' | 'partial_payment'>('deposit');
  const [depositModalTxId, setDepositModalTxId] = useState<string | undefined>(undefined);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  const [returnModalCustomer, setReturnModalCustomer] = useState<Customer | null>(null);
  const [returnModalTxId, setReturnModalTxId] = useState<string | undefined>(undefined);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const [complaintModalCustomer, setComplaintModalCustomer] = useState<Customer | null>(null);
  const [editingComplaint, setEditingComplaint] = useState<CustomerComplaint | null>(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  // 1. Calculate Customer Metrics
  const customerMetrics = useMemo(() => {
    const totalCount = customers.length;
    const debtors = customers.filter((c) => (c.currentBalanceDue || 0) > 0);
    const totalDebt = debtors.reduce((sum, c) => sum + (c.currentBalanceDue || 0), 0);
    const totalDepositsHeld = customers.reduce((sum, c) => sum + (c.depositBalance || 0), 0);
    const totalLifetimeSales = customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);
    const avgSpend = totalCount > 0 ? Math.round(totalLifetimeSales / totalCount) : 0;
    const openComplaintsCount = customerComplaints.filter((c) => c.status !== 'Resolved').length;
    const totalRestockedUnits = customerReturns.reduce((s, r) => s + (r.restockedTotalUnits || 0), 0);
    return {
      totalCount,
      debtorsCount: debtors.length,
      totalDebt,
      totalDepositsHeld,
      totalLifetimeSales,
      avgSpend,
      openComplaintsCount,
      totalRestockedUnits,
    };
  }, [customers, customerComplaints, customerReturns]);

  // 2. Calculate Supplier Metrics
  const supplierMetrics = useMemo(() => {
    const totalCount = suppliers.length;
    const payables = suppliers.filter((s) => (s.currentBalanceDue || 0) > 0);
    const totalPayable = payables.reduce((sum, s) => sum + (s.currentBalanceDue || 0), 0);
    const totalSupplied = suppliers.reduce((sum, s) => sum + (s.totalSuppliedValue || 0), 0);
    return { totalCount, payablesCount: payables.length, totalPayable, totalSupplied };
  }, [suppliers]);

  // Alphabet letters list & live distribution counts
  const alphabetLetters = useMemo(() => [
    'ALL', '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  ], []);

  const letterCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: customers.length, '#': 0 };
    for (let i = 65; i <= 90; i++) {
      counts[String.fromCharCode(i)] = 0;
    }
    customers.forEach((c) => {
      const firstChar = (c.name || '').trim().charAt(0).toUpperCase();
      if (firstChar >= 'A' && firstChar <= 'Z') {
        counts[firstChar] = (counts[firstChar] || 0) + 1;
      } else if (firstChar) {
        counts['#'] = (counts['#'] || 0) + 1;
      }
    });
    return counts;
  }, [customers]);

  // 3. Filtered Customers with Instant Search & A-Z Jump
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.kraPin && c.kraPin.toLowerCase().includes(q))
      );
    }

    if (customerFilter === 'debt') {
      result = result.filter((c) => (c.currentBalanceDue || 0) > 0);
    } else if (customerFilter === 'clear') {
      result = result.filter((c) => (c.currentBalanceDue || 0) <= 0);
    } else if (customerFilter === 'vip') {
      result = result.filter((c) => c.customerType === 'VIP');
    } else if (customerFilter === 'wholesaler') {
      result = result.filter((c) => c.customerType === 'Wholesaler');
    } else if (customerFilter === 'corporate') {
      result = result.filter((c) => c.customerType === 'Corporate');
    }

    // A-Z Alphabetical Quick-Jump Filter
    if (activeLetter !== 'ALL') {
      if (activeLetter === '#') {
        result = result.filter((c) => {
          const firstChar = (c.name || '').trim().charAt(0).toUpperCase();
          return !(firstChar >= 'A' && firstChar <= 'Z');
        });
      } else {
        result = result.filter((c) => (c.name || '').trim().toUpperCase().startsWith(activeLetter));
      }
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'debt') return (b.currentBalanceDue || 0) - (a.currentBalanceDue || 0);
      if (sortBy === 'volume') return (b.totalPurchases || 0) - (a.totalPurchases || 0);
      return 0;
    });

    return result;
  }, [customers, searchQuery, customerFilter, activeLetter, sortBy]);

  // Reset pagination to page 1 whenever search, category filter, letter, or sort changes
  useEffect(() => {
    setCurrentPage(1);
    setJumpPageInput('');
  }, [searchQuery, customerFilter, activeLetter, sortBy, pageSize]);

  // Pagination Window Slice (Crucial for 1,600+ contacts performance)
  const totalFilteredCustomers = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCustomers / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFilteredCustomers);

  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, startIndex, endIndex]);

  // Bulk Selection States & Helpers
  const isPageSelected = useMemo(() => {
    if (paginatedCustomers.length === 0) return false;
    return paginatedCustomers.every((c) => selectedCustomerIds.has(c.id));
  }, [paginatedCustomers, selectedCustomerIds]);

  const isPageIndeterminate = useMemo(() => {
    if (paginatedCustomers.length === 0) return false;
    const someSelected = paginatedCustomers.some((c) => selectedCustomerIds.has(c.id));
    return someSelected && !isPageSelected;
  }, [paginatedCustomers, selectedCustomerIds, isPageSelected]);

  const isAllFilteredSelected = useMemo(() => {
    if (filteredCustomers.length === 0) return false;
    return filteredCustomers.length === selectedCustomerIds.size && filteredCustomers.every((c) => selectedCustomerIds.has(c.id));
  }, [filteredCustomers, selectedCustomerIds]);

  const handleToggleSelectPage = () => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (isPageSelected) {
        paginatedCustomers.forEach((c) => next.delete(c.id));
      } else {
        paginatedCustomers.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      filteredCustomers.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedCustomerIds(new Set());
  };

  const handleToggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleLaunchWhatsAppBlast = () => {
    if (selectedCustomerIds.size === 0) return;
    setPreselectedMarketingIds(Array.from(selectedCustomerIds));
    setActiveTab('whatsapp');
  };

  const handleExportSelectedCSV = () => {
    const selectedList = customers.filter((c) => selectedCustomerIds.has(c.id));
    if (selectedList.length === 0) return;
    const headers = ['Name', 'Phone', 'Email', 'Customer Type', 'Address', 'KRA PIN', 'Lifetime Purchases (KSh)', 'Current Balance Due (KSh)'];
    const rows = selectedList.map((c) => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.customerType || 'Individual').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${(c.kraPin || '').replace(/"/g, '""')}"`,
      (c.totalPurchases || 0).toString(),
      (c.currentBalanceDue || 0).toString(),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Selected_Customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSelectedPDF = () => {
    const selectedList = customers.filter((c) => selectedCustomerIds.has(c.id));
    if (selectedList.length === 0) return;
    exportCustomerReportPDF(selectedList);
  };

  // 4. Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    let result = [...suppliers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.contactPerson.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          (s.categorySpecialty && s.categorySpecialty.toLowerCase().includes(q))
      );
    }

    if (supplierFilter === 'payable') {
      result = result.filter((s) => (s.currentBalanceDue || 0) > 0);
    } else if (supplierFilter === 'clear') {
      result = result.filter((s) => (s.currentBalanceDue || 0) <= 0);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'debt') return (b.currentBalanceDue || 0) - (a.currentBalanceDue || 0);
      if (sortBy === 'volume') return (b.totalSuppliedValue || 0) - (a.totalSuppliedValue || 0);
      return 0;
    });

    return result;
  }, [suppliers, searchQuery, supplierFilter, sortBy]);

  // Quick WhatsApp helpers
  const handleQuickWhatsAppCustomer = (c: Customer) => {
    if (!c.phone || c.phone === 'N/A') return;
    const clean = c.phone.replace(/[^0-9]/g, '');
    const debt = c.currentBalanceDue || 0;
    const msg = debt > 0
      ? encodeURIComponent(`Hello ${c.name}, greeting from Rofani POS. Reminder of your pending balance: KSh ${debt.toLocaleString()}. Paybill 247247 Acc 0180293. Thank you!`)
      : encodeURIComponent(`Hello ${c.name}, thank you for choosing Rofani POS! Let us know if you need any new arrivals.`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  const handleQuickWhatsAppSupplier = (s: Supplier) => {
    if (!s.phone || s.phone === 'N/A') return;
    const clean = s.phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hello ${s.contactPerson || s.name}, this is Rofani POS regarding product supply and catalog restock.`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  const handleDeleteCustomerPrompt = (c: Customer) => {
    if (c.id === 'cust-1' || c.name.toLowerCase().includes('walk-in')) {
      setDeleteNoticeMessage('The default Walk-in Customer profile is required by the POS and cannot be deleted.');
      return;
    }
    setCustomerToDelete(c);
  };

  const handleConfirmDeleteCustomer = () => {
    if (!customerToDelete) return;
    const cName = customerToDelete.name;
    onDeleteCustomer(customerToDelete.id);
    setCustomerToDelete(null);
    setToastNotice(`✨ Customer "${cName}" removed successfully.`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleDeleteSupplierPrompt = (s: Supplier) => {
    setSupplierToDelete(s);
  };

  const handleConfirmDeleteSupplier = () => {
    if (!supplierToDelete) return;
    const sName = supplierToDelete.name;
    onDeleteSupplier(supplierToDelete.id);
    setSupplierToDelete(null);
    setToastNotice(`✨ Supplier "${sName}" was successfully deleted.`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {toastNotice && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-300 shadow-lg animate-in fade-in">
          <span>{toastNotice}</span>
          <button
            onClick={() => setToastNotice(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-sky-600/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                Customers & Suppliers Directory
              </h2>
              <p className="text-xs text-slate-400">
                Manage accounts receivables, supplier credit, procurement orders, and contact ledgers
              </p>
            </div>
          </div>
        </div>

        {/* Primary Toggle Switch */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start lg:self-auto">
          <button
            onClick={() => {
              setActiveTab('customers');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers & Debtors ({customers.length})</span>
            {customerMetrics.debtorsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono font-black">
                {customerMetrics.debtorsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('suppliers');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              activeTab === 'suppliers'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Suppliers & Payables ({suppliers.length})</span>
            {supplierMetrics.payablesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono font-black">
                {supplierMetrics.payablesCount}
              </span>
            )}
          </button>

          <button
            id="tab-whatsapp-marketing"
            onClick={() => {
              setActiveTab('whatsapp');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp Marketing</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
              Bulk Deals
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'whatsapp' ? (
        <WhatsAppMarketingSection
          customers={customers}
          transactions={transactions}
          products={products}
          offers={offers}
          currentUser={currentUser}
          initialSelectedCustomerIds={preselectedMarketingIds}
        />
      ) : (
        <>
          {/* KPI Metrics Strip */}
          {activeTab === 'customers' ? (
          <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Customers</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-slate-100 font-mono mt-1">
              {customerMetrics.totalCount.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Active directory accounts</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Outstanding Debt (Credit)</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono mt-1">
              {formatKSh(customerMetrics.totalDebt, { showDecimals: true })}
            </div>
            <span className="text-[10px] text-rose-400/80 block mt-0.5">
              {customerMetrics.debtorsCount} customer{customerMetrics.debtorsCount !== 1 ? 's' : ''} owe credit
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Deposits &amp; Partial Credit</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {formatKSh(customerMetrics.totalDepositsHeld, { showDecimals: true })}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {customerDeposits.length} deposit/partial ledger entries
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Returns &amp; Complaints</span>
              <RotateCcw className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300 font-mono mt-1">
              {customerReturns.length}{' '}
              <span className="text-xs font-bold text-slate-400">
                / {customerMetrics.openComplaintsCount} open
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              +{customerMetrics.totalRestockedUnits} returned units added back to stock
            </span>
          </div>
        </div>

        {/* Customers Workspace Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
          {[
            { id: 'directory', label: 'Customer Directory', count: customers.length, icon: Users },
            {
              id: 'sales_partial',
              label: 'Sales & Partial Payments',
              count: transactions.filter((t) => (t.balanceDue || 0) > 0).length,
              icon: ShoppingBag,
            },
            { id: 'deposits', label: 'Deposits & Ledger', count: customerDeposits.length, icon: Wallet },
            { id: 'returns', label: 'Goods Returns & Stock Restore', count: customerReturns.length, icon: RotateCcw },
            {
              id: 'complaints',
              label: 'Complaints',
              count: customerMetrics.openComplaintsCount,
              icon: MessageSquareWarning,
            },
          ].map((sub) => {
            const Icon = sub.icon;
            const active = customerSubView === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setCustomerSubView(sub.id as any)}
                className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sub.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    active ? 'bg-slate-950/50 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {sub.count}
                </span>
              </button>
            );
          })}
        </div>
      </>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Registered Vendors</span>
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-slate-100 font-mono mt-1">
              {supplierMetrics.totalCount}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Approved suppliers</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Accounts Payable (Owed)</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono mt-1">
              {formatKSh(supplierMetrics.totalPayable, { showDecimals: true })}
            </div>
            <span className="text-[10px] text-rose-400/80 block mt-0.5">
              {supplierMetrics.payablesCount} vendor credit balances
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Restock Procured</span>
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {formatKSh(supplierMetrics.totalSupplied, { showDecimals: true })}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Total inventory supply value</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Catalog Coverage</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-slate-100 font-mono mt-1">
              {products.filter((p) => p.supplierName).length} Products
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Mapped to suppliers</span>
          </div>
        </div>
      )}

      {/* Control Bar: Search, Filters, Sort & Action Buttons */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Instant Search Input Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'customers'
                  ? 'Search customers by name (e.g. John), phone (e.g. 0712...), email, KRA PIN, address...'
                  : 'Search suppliers by company, contact person, phone, category...'
              }
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-2xl pl-10 pr-28 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
            />
            <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                  title="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                {activeTab === 'customers'
                  ? `${totalFilteredCustomers.toLocaleString()} found`
                  : `${filteredSuppliers.length.toLocaleString()} found`}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-import-phonebook-contacts"
              onClick={() => setIsPhonebookModalOpen(true)}
              className="px-3.5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 cursor-pointer"
              title="Directly import contacts from your phone book or .vcf file"
            >
              <Smartphone className="w-4 h-4 text-white" />
              <span>📱 Import from Phone Book</span>
            </button>

            <button
              onClick={() => setIsImportExportOpen(true)}
              className="px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-2xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              <span>Import / Export CSV</span>
            </button>

            <button
              onClick={() => {
                if (activeTab === 'customers') {
                  exportCustomerReportPDF(customers);
                } else {
                  exportSupplierReportPDF(suppliers);
                }
              }}
              className="px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-2xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export PDF Report</span>
            </button>

            {activeTab === 'customers' && (
              <>
                <button
                  id="btn-whatsapp-marketing-shortcut"
                  onClick={() => setActiveTab('whatsapp')}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                  title="Filter customers & broadcast WhatsApp Offer Deals"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>💬 WhatsApp Deals</span>
                </button>

                <button
                  id="btn-ai-customer-promotions"
                  onClick={() => {
                    setSelectedPromoCustomer(null);
                    setIsPromoGeneratorOpen(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white rounded-2xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 border border-indigo-400/40 cursor-pointer"
                  title="AI Customer Promotion Generator: Create targeted SMS, WhatsApp, and discount campaigns"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>AI Promo Generator</span>
                </button>
              </>
            )}

            {activeTab === 'customers' ? (
              <button
                onClick={() => {
                  setEditingCustomer(null);
                  setIsCustomerEditOpen(true);
                }}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-sky-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Customer</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setIsSupplierEditOpen(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Supplier</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          {activeTab === 'customers' ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-semibold mr-1">Filter:</span>
              <button
                onClick={() => setCustomerFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  customerFilter === 'all'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All ({customers.length})
              </button>
              <button
                onClick={() => setCustomerFilter('debt')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  customerFilter === 'debt'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-950 text-rose-400 hover:text-rose-300 border border-slate-800'
                }`}
              >
                Owes Debt ({customerMetrics.debtorsCount})
              </button>
              <button
                onClick={() => setCustomerFilter('clear')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  customerFilter === 'clear'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Zero Debt
              </button>
              <button
                onClick={() => setCustomerFilter('vip')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  customerFilter === 'vip'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                VIP
              </button>
              <button
                onClick={() => setCustomerFilter('wholesaler')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  customerFilter === 'wholesaler'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Wholesalers
              </button>
              <button
                onClick={() => setCustomerFilter('corporate')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  customerFilter === 'corporate'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Corporate
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-semibold mr-1">Filter:</span>
              <button
                onClick={() => setSupplierFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  supplierFilter === 'all'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All ({suppliers.length})
              </button>
              <button
                onClick={() => setSupplierFilter('payable')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  supplierFilter === 'payable'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-950 text-rose-400 hover:text-rose-300 border border-slate-800'
                }`}
              >
                Payable Due ({supplierMetrics.payablesCount})
              </button>
              <button
                onClick={() => setSupplierFilter('clear')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  supplierFilter === 'clear'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Fully Paid
              </button>
            </div>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-400 font-semibold">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 text-xs outline-none transition font-semibold cursor-pointer"
            >
              <option value="debt">Highest Debt / Payable</option>
              <option value="volume">Highest Sales / Volume</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Alphabetical A-Z Quick-Jump Navigation Bar */}
        {activeTab === 'customers' && (
          <div className="pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <span>A-Z Index Jump:</span>
                {activeLetter !== 'ALL' && (
                  <span className="text-sky-400 font-mono font-bold normal-case">
                    (Filtering names starting with "{activeLetter}")
                  </span>
                )}
              </div>
              {activeLetter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setActiveLetter('ALL')}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer transition flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Reset to All Letters
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
              {alphabetLetters.map((letter) => {
                const count = letterCounts[letter] || 0;
                const isSelected = activeLetter === letter;
                const isDisabled = letter !== 'ALL' && count === 0;

                return (
                  <button
                    key={letter}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setActiveLetter(letter)}
                    title={isDisabled ? `No contacts starting with ${letter}` : `${count} contact${count !== 1 ? 's' : ''} starting with ${letter}`}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-1 ring-sky-400'
                        : isDisabled
                        ? 'bg-slate-950/40 text-slate-700 border border-slate-900 cursor-not-allowed opacity-40'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{letter}</span>
                    {letter !== 'ALL' && count > 0 && (
                      <span className={`ml-1 text-[9px] px-1 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-sky-700 text-sky-100' : 'bg-slate-900 text-slate-400'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Selection Control Toolbar */}
      {activeTab === 'customers' && selectedCustomerIds.size > 0 && (
        <div className="bg-gradient-to-r from-sky-950/90 via-slate-900 to-indigo-950/90 border border-sky-500/40 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl shadow-sky-950/50">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-mono font-extrabold flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-sky-400" />
              <span>{selectedCustomerIds.size.toLocaleString()} Selected</span>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              of {totalFilteredCustomers.toLocaleString()} matching customers
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isAllFilteredSelected && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Select All Filtered ({totalFilteredCustomers.toLocaleString()})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLaunchWhatsAppBlast}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30 active:scale-95 cursor-pointer"
              title="Open WhatsApp Marketing with this cohort pre-selected"
            >
              <MessageSquare className="w-4 h-4 text-white" />
              <span>💬 Send WhatsApp Blast ({selectedCustomerIds.size.toLocaleString()})</span>
            </button>

            <button
              type="button"
              onClick={handleExportSelectedCSV}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportSelectedPDF}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Deselect All</span>
            </button>
          </div>
        </div>
      )}

      {/* Select All Filtered Helper Banner */}
      {activeTab === 'customers' && isPageSelected && totalFilteredCustomers > paginatedCustomers.length && (
        <div className="bg-sky-950/40 border border-sky-800/60 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs text-sky-200">
          <div className="flex items-center gap-2">
            <span>All <strong>{paginatedCustomers.length}</strong> customers on page {safeCurrentPage} are selected.</span>
            {!isAllFilteredSelected ? (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-sky-400 hover:text-sky-300 underline font-bold cursor-pointer ml-1"
              >
                Select all {totalFilteredCustomers.toLocaleString()} customers matching this filter
              </button>
            ) : (
              <span className="text-emerald-400 font-bold ml-1">✓ All {totalFilteredCustomers.toLocaleString()} customers selected!</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Main Data Table */}
      {activeTab === 'customers' ? (
        customerSubView === 'sales_partial' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-sky-400" />
                  <span>Customer Sales &amp; Partial Payments Tracker</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Track full, partial, and unpaid customer credit invoices and record installment payments or returns directly.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {(['ALL', 'Partial', 'Unpaid', 'Paid'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSalesStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                      salesStatusFilter === st
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300 min-w-[780px]">
                <thead className="bg-slate-950 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Receipt # &amp; Date</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Balance Due</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {transactions
                    .filter((tx) => {
                      if (salesStatusFilter !== 'ALL' && tx.paymentStatus !== salesStatusFilter) return false;
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        tx.receiptNumber.toLowerCase().includes(q) ||
                        (tx.customerName || '').toLowerCase().includes(q) ||
                        (tx.customerPhone || '').toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 60)
                    .map((tx) => {
                      const matchedCust =
                        customers.find((c) => c.id === tx.customerId) ||
                        customers.find((c) => c.name.toLowerCase() === (tx.customerName || '').toLowerCase()) ||
                        customers[0];
                      return (
                        <tr key={tx.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono">
                            <div className="font-bold text-sky-400">{tx.receiptNumber}</div>
                            <div className="text-[10px] text-slate-500">{new Date(tx.date).toLocaleString()}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-white">{tx.customerName || 'Walk-in Customer'}</div>
                            {tx.customerPhone && tx.customerPhone !== 'N/A' && (
                              <div className="text-[10px] font-mono text-slate-400">{tx.customerPhone}</div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-white">
                            {formatKSh(tx.grandTotal, { showDecimals: true })}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-400">
                            {formatKSh(tx.amountPaid, { showDecimals: true })}
                          </td>
                          <td className={`p-3 text-right font-mono font-extrabold ${tx.balanceDue > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {formatKSh(tx.balanceDue, { showDecimals: true })}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tx.paymentStatus === 'Paid'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : tx.paymentStatus === 'Partial'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {tx.paymentStatus}
                            </span>
                            {tx.returnStatus && tx.returnStatus !== 'None' && (
                              <div className="text-[9px] text-amber-300 mt-0.5 font-bold">{tx.returnStatus}</div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {tx.balanceDue > 0 && matchedCust && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDepositModalCustomer(matchedCust);
                                    setDepositModalMode('partial_payment');
                                    setDepositModalTxId(tx.id);
                                    setIsDepositModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Partial Pay
                                </button>
                              )}
                              {matchedCust && tx.returnStatus !== 'Full Return' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReturnModalCustomer(matchedCust);
                                    setReturnModalTxId(tx.id);
                                    setIsReturnModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Return
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => exportReceiptPDF(tx, { storeName, storeKraPin })}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg cursor-pointer"
                                title="Download Receipt PDF"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ) : customerSubView === 'deposits' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Customer Deposits &amp; Partial Payments Ledger</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Track advance prepayments, partial invoice settlements, and store deposit credits applied at checkout.
                </p>
              </div>
              {customers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDepositModalCustomer(customers[0]);
                    setDepositModalMode('deposit');
                    setDepositModalTxId(undefined);
                    setIsDepositModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Record New Deposit / Partial Pay
                </button>
              )}
            </div>

            {customerDeposits.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No customer deposits or partial invoice payments recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300 min-w-[740px]">
                  <thead className="bg-slate-950 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Ref # &amp; Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Entry Type</th>
                      <th className="p-3">Channel &amp; Ref</th>
                      <th className="p-3">Linked Invoice / Notes</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {customerDeposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono">
                          <div className="font-bold text-sky-400">{dep.receiptRef}</div>
                          <div className="text-[10px] text-slate-500">{new Date(dep.date).toLocaleString()}</div>
                        </td>
                        <td className="p-3 font-bold text-white">{dep.customerName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-emerald-300 uppercase">
                            {dep.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {dep.paymentMethod.toUpperCase()} {dep.referenceNo ? `(${dep.referenceNo})` : ''}
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">
                          {dep.linkedReceiptNumber && (
                            <span className="font-mono text-amber-300 mr-2">Inv: {dep.linkedReceiptNumber}</span>
                          )}
                          {dep.notes || `By ${dep.recordedBy}`}
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-emerald-400">
                          {formatKSh(dep.amount, { showDecimals: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : customerSubView === 'returns' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Customer Goods Returns &amp; Stock Restoration Workflow</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Handle partial or full returns, cash/M-Pesa payouts or store credit, and verify exactly how resellable items return to inventory.
                </p>
              </div>
              {customers.length > 0 && transactions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setReturnModalCustomer(customers[0]);
                    setReturnModalTxId(transactions[0]?.id);
                    setIsReturnModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Process Goods Return
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-700/40 text-xs text-emerald-200 flex items-start gap-2.5">
              <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>How Returned Items Go Back Into Stock:</strong> Each returned line item is inspected on the return screen. Items marked{' '}
                <span className="text-emerald-300 font-bold">Resellable</span> automatically add their returned quantity back to{' '}
                <code className="font-mono text-[11px]">stockQuantity</code> (logged in the Security &amp; Stock Audit Trail), while{' '}
                <span className="text-rose-300 font-bold">Damaged / Defective</span> units are quarantined with <strong>0</strong> units added back to sellable inventory.
              </div>
            </div>

            {customerReturns.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No customer goods returns processed yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {customerReturns.map((ret) => (
                  <div key={ret.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-amber-300">{ret.returnNumber}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 font-mono text-[10px] font-bold">
                          Credit Note: {ret.creditNoteNumber}
                        </span>
                        <span className="text-white font-bold">{ret.customerName}</span>
                        <span className="text-slate-500 font-mono">Orig: {ret.originalReceiptNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-amber-300">
                          {formatKSh(ret.totalRefundAmount, { showDecimals: true })}
                        </span>
                        <button
                          type="button"
                          onClick={() => exportCustomerReturnPDF(ret, { storeName, storeKraPin })}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-3">
                      <span>Date: {new Date(ret.date).toLocaleString()}</span>
                      <span>Mode: <strong className="text-slate-200">{ret.refundMode.replace(/_/g, ' ').toUpperCase()}</strong></span>
                      {ret.cashRefundAmount > 0 && <span>Cash/M-Pesa Out: <strong className="text-amber-300">{formatKSh(ret.cashRefundAmount)}</strong></span>}
                      {ret.creditIssuedAmount > 0 && <span>Deposit Credit: <strong className="text-emerald-300">{formatKSh(ret.creditIssuedAmount)}</strong></span>}
                      {ret.debtReducedAmount > 0 && <span>Debt Reduced: <strong className="text-sky-300">{formatKSh(ret.debtReducedAmount)}</strong></span>}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {ret.items.map((it) => (
                        <span
                          key={it.productId}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border ${
                            it.addedBackToStock
                              ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                              : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                          }`}
                        >
                          {it.productName} x{it.quantityReturned}:{' '}
                          {it.addedBackToStock
                            ? `Restocked +${it.quantityReturned}${it.stockAfterReturn !== undefined ? ` (Stock -> ${it.stockAfterReturn})` : ''}`
                            : 'Damaged Write-Off (0 Restocked)'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : customerSubView === 'complaints' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <MessageSquareWarning className="w-4 h-4 text-rose-400" />
                  <span>Customer Complaints &amp; Resolution Desk</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Track open issues, product defects, billing queries, and resolution notes per customer.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', 'Open', 'In Review', 'Escalated', 'Resolved'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setComplaintStatusFilter(st)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                      complaintStatusFilter === st
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
                {customers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setComplaintModalCustomer(customers[0]);
                      setEditingComplaint(null);
                      setIsComplaintModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Log Complaint
                  </button>
                )}
              </div>
            </div>

            {customerComplaints.filter(
              (c) => complaintStatusFilter === 'ALL' || c.status === complaintStatusFilter
            ).length === 0 ? (
              <div className="p-12 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No customer complaints match this filter.
              </div>
            ) : (
              <div className="space-y-2.5">
                {customerComplaints
                  .filter((c) => complaintStatusFilter === 'ALL' || c.status === complaintStatusFilter)
                  .map((cmp) => {
                    const matchedCust = customers.find((cu) => cu.id === cmp.customerId) || customers[0];
                    return (
                      <div key={cmp.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-rose-400">{cmp.complaintNumber}</span>
                            <span className="font-bold text-white">{cmp.subject}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                              {cmp.category}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                              {cmp.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                cmp.status === 'Resolved'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : cmp.status === 'Escalated'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {cmp.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setComplaintModalCustomer(matchedCust);
                                setEditingComplaint(cmp);
                                setIsComplaintModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Manage / Resolve
                            </button>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Customer: <strong className="text-slate-200">{cmp.customerName}</strong>
                          {cmp.linkedReceiptNumber && ` • Receipt: ${cmp.linkedReceiptNumber}`}
                          {cmp.productName && ` • Product: ${cmp.productName}`}
                        </div>
                        <p className="text-slate-300">{cmp.description}</p>
                        {cmp.resolutionNotes && (
                          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px]">
                            Resolution: {cmp.resolutionNotes}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
        <div>
          {filteredCustomers.length === 0 ? (
            <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-3xl">
              <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="font-bold text-slate-200 text-base">No customers match your criteria</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting your search query or filter settings, or add a new customer.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectPage}
                          title={isPageSelected ? "Deselect Page" : "Select Entire Page"}
                          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          {isPageSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-400" />
                          ) : isPageIndeterminate ? (
                            <MinusSquare className="w-4 h-4 text-sky-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                      </th>
                      <th className="p-4">Customer Name & Category</th>
                      <th className="p-4">Contact Info</th>
                      <th className="p-4">Location / KRA PIN</th>
                      <th className="p-4 text-right">Lifetime Purchases</th>
                      <th className="p-4 text-right">Debt Balance (Due)</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {paginatedCustomers.map((c) => {
                      const debt = c.currentBalanceDue || 0;
                      const isSelected = selectedCustomerIds.has(c.id);

                      return (
                        <tr
                          key={c.id}
                          className={`transition ${
                            isSelected
                              ? 'bg-sky-950/40 ring-1 ring-inset ring-sky-500/30'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="p-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleToggleCustomer(c.id)}
                              className="p-1 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title={isSelected ? "Deselect Customer" : "Select Customer"}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-sky-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                              )}
                            </button>
                          </td>

                          {/* Name & Initials */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-sky-600/20">
                                {c.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-100 text-sm block">
                                  {c.name}
                                </span>
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                  {c.customerType || 'Individual'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info & WhatsApp */}
                          <td className="p-4">
                            <div className="space-y-1 font-mono text-[11px]">
                              {c.phone && c.phone !== 'N/A' ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-200">{c.phone}</span>
                                  <button
                                    onClick={() => handleQuickWhatsAppCustomer(c)}
                                    title="WhatsApp Customer"
                                    className="p-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/80 rounded-lg transition cursor-pointer"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500">No phone</span>
                              )}
                              {c.email && (
                                <div className="text-slate-400 font-sans text-[11px] truncate max-w-xs">
                                  {c.email}
                                </div>
                              )}
                              {c.contactsList && c.contactsList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomerForContactsList(c);
                                    setIsCustomerContactsListOpen(true);
                                  }}
                                  className="mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 inline-flex items-center gap-1 cursor-pointer transition"
                                >
                                  <Users className="w-3 h-3" />
                                  <span>{c.contactsList.length} Contacts Saved</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Address & KRA PIN */}
                          <td className="p-4">
                            <div className="space-y-1 text-slate-300">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate max-w-[180px]">{c.address || 'N/A'}</span>
                              </div>
                              {c.kraPin && (
                                <div className="text-[10px] font-mono text-slate-400">
                                  PIN: <span className="font-bold text-sky-400">{c.kraPin}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Lifetime Purchases & Deposit Credit */}
                          <td className="p-4 text-right font-mono font-bold text-slate-100 text-sm">
                            <div>{formatKSh(c.totalPurchases || 0, { showDecimals: true })}</div>
                            {(c.depositBalance || 0) > 0 && (
                              <div className="text-[10px] text-emerald-400 font-bold">
                                Deposit: {formatKSh(c.depositBalance || 0, { showDecimals: true })}
                              </div>
                            )}
                          </td>

                          {/* Balance Due */}
                          <td className="p-4 text-right font-mono font-black text-sm">
                            {debt > 0 ? (
                              <span className="text-rose-400">
                                {formatKSh(debt, { showDecimals: true })}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-normal">KSh 0.00</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-4 text-center">
                            {debt > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Credit Due
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Clear
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setDepositModalCustomer(c);
                                  setDepositModalMode(debt > 0 ? 'partial_payment' : 'deposit');
                                  setDepositModalTxId(undefined);
                                  setIsDepositModalOpen(true);
                                }}
                                title={debt > 0 ? 'Partial Pay / Deposit' : 'Add Advance Deposit'}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                              >
                                <Wallet className="w-3.5 h-3.5" /> {debt > 0 ? 'Pay' : 'Deposit'}
                              </button>

                              <button
                                onClick={() => {
                                  setReturnModalCustomer(c);
                                  setReturnModalTxId(undefined);
                                  setIsReturnModalOpen(true);
                                }}
                                title="Process Goods Return & Stock Restoration"
                                className="p-1.5 bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-700/60 rounded-xl transition cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setComplaintModalCustomer(c);
                                  setEditingComplaint(null);
                                  setIsComplaintModalOpen(true);
                                }}
                                title="Log Customer Complaint"
                                className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl transition cursor-pointer"
                              >
                                <MessageSquareWarning className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setViewingCustomer(c);
                                  setIsCustomerDetailsOpen(true);
                                }}
                                title="View Customer Profile, Deposits, Returns & Complaints"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl transition cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedCustomerForContactsList(c);
                                  setIsCustomerContactsListOpen(true);
                                }}
                                title={`Manage Contacts List (${c.contactsList?.length || 1}) for ${c.name}`}
                                className="p-1.5 bg-slate-800 hover:bg-sky-950/80 hover:text-sky-300 text-sky-400 border border-slate-700/80 rounded-xl transition cursor-pointer"
                              >
                                <Phone className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedPromoCustomer(c);
                                  setIsPromoGeneratorOpen(true);
                                }}
                                title={`Generate AI Promotion Campaign for ${c.name}`}
                                className="p-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-300 rounded-xl transition cursor-pointer"
                              >
                                <Sparkles className="w-4 h-4 text-amber-300" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingCustomer(c);
                                  setIsCustomerEditOpen(true);
                                }}
                                title="Edit Customer Details"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {c.id !== 'cust-1' && (
                                <button
                                  onClick={() => handleDeleteCustomerPrompt(c)}
                                  title="Delete Customer Profile"
                                  className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-xl transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* High-Performance Pagination Bar */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                {/* Summary & Page Size selector */}
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-slate-400">
                    Showing <strong className="text-white font-mono">{totalFilteredCustomers === 0 ? 0 : startIndex + 1}</strong> –{' '}
                    <strong className="text-white font-mono">{endIndex}</strong> of{' '}
                    <strong className="text-sky-400 font-mono">{totalFilteredCustomers.toLocaleString()}</strong> customers
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-semibold">Per Page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 text-xs font-mono font-bold outline-none cursor-pointer hover:border-slate-700"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                </div>

                {/* Page Navigation Controls */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* First Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* Previous Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  {/* Numbered Page Buttons with Ellipses */}
                  {(() => {
                    const pages: (number | string)[] = [];
                    const maxButtons = 7;
                    if (totalPages <= maxButtons) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (safeCurrentPage > 3) {
                        pages.push('...');
                      }
                      const start = Math.max(2, safeCurrentPage - 1);
                      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
                      for (let i = start; i <= end; i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      if (safeCurrentPage < totalPages - 2) {
                        pages.push('...');
                      }
                      if (!pages.includes(totalPages)) pages.push(totalPages);
                    }
                    return pages.map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-600 font-mono">
                            ...
                          </span>
                        );
                      }
                      const isCurrent = p === safeCurrentPage;
                      return (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setCurrentPage(Number(p))}
                          className={`min-w-8 h-8 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                            isCurrent
                              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-1 ring-sky-400'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}

                  {/* Next Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                    title="Next Page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Direct Jump-to-Page Input */}
                {totalPages > 3 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const num = parseInt(jumpPageInput, 10);
                      if (!isNaN(num) && num >= 1 && num <= totalPages) {
                        setCurrentPage(num);
                        setJumpPageInput('');
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-[11px] text-slate-500">Jump to:</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value)}
                      placeholder={safeCurrentPage.toString()}
                      className="w-14 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-slate-200 text-xs font-mono text-center outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Go
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
        )
      ) : (
        <div>
          {filteredSuppliers.length === 0 ? (
            <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-3xl">
              <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="font-bold text-slate-200 text-base">No suppliers match your criteria</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting your search query or add a new supplier/vendor profile.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Company Name & Specialty</th>
                      <th className="p-4">Contact Agent & Phone</th>
                      <th className="p-4">Terms & Banking</th>
                      <th className="p-4 text-right">Total Goods Supplied</th>
                      <th className="p-4 text-right">Payable Balance (Owed)</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredSuppliers.map((s) => {
                      const debt = s.currentBalanceDue || 0;
                      return (
                        <tr key={s.id} className="hover:bg-slate-800/40 transition">
                          {/* Company Name */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-indigo-600/20">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-100 text-sm block">
                                  {s.name}
                                </span>
                                {s.categorySpecialty && (
                                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {s.categorySpecialty}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Contact Person & Phone */}
                          <td className="p-4">
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-200 block">
                                {s.contactPerson}
                              </span>
                              <div className="flex items-center gap-2 font-mono text-[11px]">
                                <span className="text-slate-300">{s.phone}</span>
                                <button
                                  onClick={() => handleQuickWhatsAppSupplier(s)}
                                  title="WhatsApp Supplier"
                                  className="p-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/80 rounded-lg transition"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Payment Terms & Bank info */}
                          <td className="p-4">
                            <div className="space-y-1 text-slate-300">
                              <div className="font-semibold text-[11px] text-slate-200">
                                {s.paymentTerms || 'Net 30 Days'}
                              </div>
                              {s.bankDetails && (
                                <div className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                                  {s.bankDetails}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Total Supplied Value */}
                          <td className="p-4 text-right font-mono font-bold text-slate-100 text-sm">
                            {formatKSh(s.totalSuppliedValue || 0, { showDecimals: true })}
                          </td>

                          {/* Accounts Payable Owed */}
                          <td className="p-4 text-right font-mono font-black text-sm">
                            {debt > 0 ? (
                              <span className="text-rose-400">
                                {formatKSh(debt, { showDecimals: true })}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-normal">KSh 0.00</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-4 text-center">
                            {debt > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Due: {formatKSh(debt)}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Settled
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {debt > 0 && (
                                <button
                                  onClick={() => {
                                    setPayingSupplier(s);
                                    setIsSupplierPayOpen(true);
                                  }}
                                  title="Pay Supplier Balance"
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                                >
                                  <DollarSign className="w-3.5 h-3.5" /> Pay
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setViewingSupplierHistory(s);
                                  setIsSupplierHistoryOpen(true);
                                }}
                                title="View Supplier Payment History"
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5" /> History
                              </button>

                              <button
                                onClick={() => {
                                  setViewingSupplier(s);
                                  setIsSupplierDetailsOpen(true);
                                }}
                                title="View Supplier Profile & Catalog"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingSupplier(s);
                                  setIsSupplierEditOpen(true);
                                }}
                                title="Edit Supplier Profile"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteSupplierPrompt(s)}
                                title="Delete Supplier"
                                className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-xl transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )}

      {/* Sub-Modals */}
      <CustomerEditModal
        isOpen={isCustomerEditOpen}
        onClose={() => {
          setIsCustomerEditOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onSave={onSaveCustomer}
      />

      <CustomerDebtPaymentModal
        isOpen={isCustomerPayOpen}
        onClose={() => {
          setIsCustomerPayOpen(false);
          setPayingCustomer(null);
        }}
        customer={payingCustomer}
        currentUser={currentUser}
        onRecordPayment={onRecordCustomerDebtPayment}
      />

      <CustomerDetailsModal
        isOpen={isCustomerDetailsOpen}
        onClose={() => {
          setIsCustomerDetailsOpen(false);
          setViewingCustomer(null);
        }}
        customer={viewingCustomer}
        transactions={transactions}
        deposits={customerDeposits}
        returns={customerReturns}
        complaints={customerComplaints}
        onOpenEdit={(c) => {
          setEditingCustomer(c);
          setIsCustomerEditOpen(true);
        }}
        onOpenRepayment={(c) => {
          setPayingCustomer(c);
          setIsCustomerPayOpen(true);
        }}
        onOpenDeposit={(c, mode = 'deposit', txId) => {
          setDepositModalCustomer(c);
          setDepositModalMode(mode);
          setDepositModalTxId(txId);
          setIsDepositModalOpen(true);
        }}
        onOpenReturn={(c, txId) => {
          setReturnModalCustomer(c);
          setReturnModalTxId(txId);
          setIsReturnModalOpen(true);
        }}
        onOpenComplaint={(c, existingCmp) => {
          setComplaintModalCustomer(c);
          setEditingComplaint(existingCmp || null);
          setIsComplaintModalOpen(true);
        }}
        onOpenContactsList={(c) => {
          setIsCustomerDetailsOpen(false);
          setSelectedCustomerForContactsList(c);
          setIsCustomerContactsListOpen(true);
        }}
      />

      {onRecordCustomerDepositOrPayment && (
        <CustomerDepositModal
          isOpen={isDepositModalOpen}
          onClose={() => {
            setIsDepositModalOpen(false);
            setDepositModalCustomer(null);
            setDepositModalTxId(undefined);
          }}
          customer={depositModalCustomer}
          transactions={transactions}
          currentUser={currentUser}
          initialMode={depositModalMode}
          initialTransactionId={depositModalTxId}
          onRecordDepositOrPayment={onRecordCustomerDepositOrPayment}
        />
      )}

      {onProcessCustomerReturn && (
        <CustomerReturnModal
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            setReturnModalCustomer(null);
            setReturnModalTxId(undefined);
          }}
          customer={returnModalCustomer}
          transactions={transactions}
          products={products}
          existingReturns={customerReturns}
          currentUser={currentUser}
          initialTransactionId={returnModalTxId}
          storeName={storeName}
          storeKraPin={storeKraPin}
          onProcessReturn={onProcessCustomerReturn}
        />
      )}

      {onSaveCustomerComplaint && (
        <CustomerComplaintModal
          isOpen={isComplaintModalOpen}
          onClose={() => {
            setIsComplaintModalOpen(false);
            setComplaintModalCustomer(null);
            setEditingComplaint(null);
          }}
          customer={complaintModalCustomer}
          complaintToEdit={editingComplaint}
          transactions={transactions}
          products={products}
          currentUser={currentUser}
          onSaveComplaint={onSaveCustomerComplaint}
        />
      )}

      <CustomerContactsListModal
        isOpen={isCustomerContactsListOpen}
        onClose={() => {
          setIsCustomerContactsListOpen(false);
          setSelectedCustomerForContactsList(null);
        }}
        customer={selectedCustomerForContactsList}
        onSaveCustomer={(updated) => {
          onSaveCustomer(updated);
          setSelectedCustomerForContactsList(updated);
        }}
      />

      <SupplierEditModal
        isOpen={isSupplierEditOpen}
        onClose={() => {
          setIsSupplierEditOpen(false);
          setEditingSupplier(null);
        }}
        supplier={editingSupplier}
        onSave={onSaveSupplier}
        onDeleteSupplier={handleDeleteSupplierPrompt}
      />

      <SupplierPaymentModal
        isOpen={isSupplierPayOpen}
        onClose={() => {
          setIsSupplierPayOpen(false);
          setPayingSupplier(null);
        }}
        supplier={payingSupplier}
        currentUser={currentUser}
        onRecordPayment={onRecordSupplierPayment}
      />

      <SupplierDetailsModal
        isOpen={isSupplierDetailsOpen}
        onClose={() => {
          setIsSupplierDetailsOpen(false);
          setViewingSupplier(null);
        }}
        supplier={viewingSupplier}
        products={products}
        onOpenEdit={(s) => {
          setEditingSupplier(s);
          setIsSupplierEditOpen(true);
        }}
        onOpenPayment={(s) => {
          setPayingSupplier(s);
          setIsSupplierPayOpen(true);
        }}
        onNavigateToRestock={onNavigateToRestock}
        onDeleteSupplier={handleDeleteSupplierPrompt}
      />

      <SupplierPaymentHistoryModal
        isOpen={isSupplierHistoryOpen}
        onClose={() => {
          setIsSupplierHistoryOpen(false);
          setViewingSupplierHistory(null);
        }}
        supplier={viewingSupplierHistory}
        cashTransactions={cashTransactions}
        onOpenPayment={(s) => {
          setPayingSupplier(s);
          setIsSupplierPayOpen(true);
        }}
      />

      <ContactsImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        targetType={activeTab === 'suppliers' ? 'suppliers' : 'customers'}
        customers={customers}
        suppliers={suppliers}
        onImportCustomers={onImportCustomers}
        onImportSuppliers={onImportSuppliers}
        onOpenPhonebook={() => setIsPhonebookModalOpen(true)}
      />

      {/* MODAL: DIRECT PHONEBOOK CONTACTS IMPORTER */}
      <PhonebookImportModal
        isOpen={isPhonebookModalOpen}
        onClose={() => setIsPhonebookModalOpen(false)}
        defaultTarget={activeTab === 'suppliers' ? 'suppliers' : 'customers'}
        onImportCustomers={onImportCustomers}
        onImportSuppliers={onImportSuppliers}
      />

      {/* MODAL: AI CUSTOMER PROMOTION & MARKETING GENERATOR */}
      <CustomerPromotionGeneratorModal
        isOpen={isPromoGeneratorOpen}
        onClose={() => {
          setIsPromoGeneratorOpen(false);
          setSelectedPromoCustomer(null);
        }}
        customers={customers}
        products={products}
        initialCustomer={selectedPromoCustomer}
        currentUser={currentUser}
      />

      {/* MODAL: DELETE CUSTOMER CONFIRMATION */}
      {customerToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCustomerToDelete(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-100">
                  Delete Customer Profile?
                </h3>
                <p className="text-xs text-slate-400">
                  Permanent removal from directory & cloud database
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-slate-200">{customerToDelete.name}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">Phone:</span>
                <span className="text-emerald-400">{customerToDelete.phone || 'N/A'}</span>
              </div>
              {customerToDelete.contactsList && customerToDelete.contactsList.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Saved Contacts:</span>
                  <span className="text-sky-400 font-semibold">{customerToDelete.contactsList.length} numbers</span>
                </div>
              )}
              {(customerToDelete.currentBalanceDue || 0) > 0 && (
                <div className="p-2.5 bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2 mt-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    Warning: Customer has outstanding debt of <strong>KSh {(customerToDelete.currentBalanceDue || 0).toLocaleString()}</strong>.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-rose-600/25 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Customer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SUPPLIER CONFIRMATION */}
      {supplierToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSupplierToDelete(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-100">
                  Delete Supplier Profile?
                </h3>
                <p className="text-xs text-slate-400">
                  Remove {supplierToDelete.name} from directory
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Supplier:</span>
                <span className="font-bold text-slate-200">{supplierToDelete.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Contact Agent:</span>
                <span className="text-slate-300">{supplierToDelete.contactPerson || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">Phone:</span>
                <span className="text-emerald-400">{supplierToDelete.phone || 'N/A'}</span>
              </div>
            </div>

            {(() => {
              const linkedCount = products.filter(
                (p) =>
                  p.supplierName &&
                  p.supplierName.trim().toLowerCase() === supplierToDelete.name.trim().toLowerCase()
              ).length;
              if (linkedCount === 0) return null;
              return (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{linkedCount} {linkedCount === 1 ? 'product is' : 'products are'} currently linked to this supplier</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Their supplier name will automatically be reset to "Direct Wholesale" so all inventory history stays safe.
                  </p>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSupplier}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-rose-600/25 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Supplier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROTECTED RECORD NOTICE */}
      {deleteNoticeMessage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteNoticeMessage(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm">Protected System Record</h4>
              <p className="text-xs text-slate-400 mt-1">{deleteNoticeMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteNoticeMessage(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
