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
  Share2
} from 'lucide-react';
import { Customer, Supplier, Transaction, Product, User, PaymentMethod } from '../../types';
import { exportCustomerReportPDF, exportSupplierReportPDF } from '../../utils/pdfGenerator';
import { formatKSh } from '../../utils/currency';
import { CustomerEditModal } from './CustomerEditModal';
import { CustomerDebtPaymentModal } from './CustomerDebtPaymentModal';
import { CustomerDetailsModal } from './CustomerDetailsModal';
import { CustomerContactsListModal } from './CustomerContactsListModal';
import { SupplierEditModal } from './SupplierEditModal';
import { SupplierPaymentModal } from './SupplierPaymentModal';
import { SupplierDetailsModal } from './SupplierDetailsModal';
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
  products: Product[];
  currentUser: User;
  offers?: OfferDeal[];
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
  products,
  currentUser,
  offers,
  onSaveCustomer,
  onDeleteCustomer,
  onSaveSupplier,
  onDeleteSupplier,
  onRecordCustomerDebtPayment,
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

  // 1. Calculate Customer Metrics
  const customerMetrics = useMemo(() => {
    const totalCount = customers.length;
    const debtors = customers.filter((c) => (c.currentBalanceDue || 0) > 0);
    const totalDebt = debtors.reduce((sum, c) => sum + (c.currentBalanceDue || 0), 0);
    const totalLifetimeSales = customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);
    const avgSpend = totalCount > 0 ? Math.round(totalLifetimeSales / totalCount) : 0;
    return { totalCount, debtorsCount: debtors.length, totalDebt, totalLifetimeSales, avgSpend };
  }, [customers]);

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
      ? encodeURIComponent(`Hello ${c.name}, greeting from ROFANI Electronics & Boutique. Reminder of your pending balance: KSh ${debt.toLocaleString()}. Paybill 247247 Acc 0180293. Thank you!`)
      : encodeURIComponent(`Hello ${c.name}, thank you for choosing ROFANI Electronics & Boutique! Let us know if you need any new electronics or boutique arrivals.`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  const handleQuickWhatsAppSupplier = (s: Supplier) => {
    if (!s.phone || s.phone === 'N/A') return;
    const clean = s.phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hello ${s.contactPerson || s.name}, this is ROFANI Electronics & Boutique regarding product supply and catalog restock.`);
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
    onDeleteCustomer(customerToDelete.id);
    setCustomerToDelete(null);
  };

  const handleDeleteSupplierPrompt = (s: Supplier) => {
    setSupplierToDelete(s);
  };

  const handleConfirmDeleteSupplier = () => {
    if (!supplierToDelete) return;
    onDeleteSupplier(supplierToDelete.id);
    setSupplierToDelete(null);
  };

  return (
    <div className="space-y-6">
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
              <span>Total Lifetime Purchases</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {formatKSh(customerMetrics.totalLifetimeSales, { showDecimals: true })}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Gross customer sales</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Average Customer Spend</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-slate-100 font-mono mt-1">
              {formatKSh(customerMetrics.avgSpend)}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Lifetime value per customer</span>
          </div>
        </div>
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

                          {/* Lifetime Purchases */}
                          <td className="p-4 text-right font-mono font-bold text-slate-100 text-sm">
                            {formatKSh(c.totalPurchases || 0, { showDecimals: true })}
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
                              {debt > 0 && (
                                <button
                                  onClick={() => {
                                    setPayingCustomer(c);
                                    setIsCustomerPayOpen(true);
                                  }}
                                  title="Record Debt Repayment"
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <DollarSign className="w-3.5 h-3.5" /> Pay
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setViewingCustomer(c);
                                  setIsCustomerDetailsOpen(true);
                                }}
                                title="View Customer Profile & Invoices"
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
        onOpenEdit={(c) => {
          setEditingCustomer(c);
          setIsCustomerEditOpen(true);
        }}
        onOpenRepayment={(c) => {
          setPayingCustomer(c);
          setIsCustomerPayOpen(true);
        }}
        onOpenContactsList={(c) => {
          setIsCustomerDetailsOpen(false);
          setSelectedCustomerForContactsList(c);
          setIsCustomerContactsListOpen(true);
        }}
      />

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
