import React, { useState, useMemo } from 'react';
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
  Sparkles
} from 'lucide-react';
import { Customer, Supplier, Transaction, Product, User, PaymentMethod } from '../../types';
import { exportCustomerReportPDF, exportSupplierReportPDF } from '../../utils/pdfGenerator';
import { CustomerEditModal } from './CustomerEditModal';
import { CustomerDebtPaymentModal } from './CustomerDebtPaymentModal';
import { CustomerDetailsModal } from './CustomerDetailsModal';
import { SupplierEditModal } from './SupplierEditModal';
import { SupplierPaymentModal } from './SupplierPaymentModal';
import { SupplierDetailsModal } from './SupplierDetailsModal';
import { ContactsImportExportModal } from './ContactsImportExportModal';

interface CustomersSuppliersViewProps {
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  products: Product[];
  currentUser: User;
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
  // Main Tab: 'customers' or 'suppliers'
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'debt' | 'clear' | 'vip' | 'wholesaler' | 'corporate'>('all');
  const [supplierFilter, setSupplierFilter] = useState<'all' | 'payable' | 'clear'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'debt' | 'volume'>('debt');

  // Modal States
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCustomerEditOpen, setIsCustomerEditOpen] = useState(false);

  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [isCustomerPayOpen, setIsCustomerPayOpen] = useState(false);

  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSupplierEditOpen, setIsSupplierEditOpen] = useState(false);

  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  const [isSupplierPayOpen, setIsSupplierPayOpen] = useState(false);

  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [isSupplierDetailsOpen, setIsSupplierDetailsOpen] = useState(false);

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

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

  // 3. Filtered Customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
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

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'debt') return (b.currentBalanceDue || 0) - (a.currentBalanceDue || 0);
      if (sortBy === 'volume') return (b.totalPurchases || 0) - (a.totalPurchases || 0);
      return 0;
    });

    return result;
  }, [customers, searchQuery, customerFilter, sortBy]);

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
      alert('The default Walk-in Customer profile cannot be deleted.');
      return;
    }
    if ((c.currentBalanceDue || 0) > 0) {
      if (!window.confirm(`Warning: ${c.name} has an outstanding balance of KSh ${c.currentBalanceDue.toLocaleString()}. Are you sure you want to delete this profile?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete customer "${c.name}"?`)) {
        return;
      }
    }
    onDeleteCustomer(c.id);
  };

  const handleDeleteSupplierPrompt = (s: Supplier) => {
    const linkedProducts = products.filter((p) => p.supplierName?.toLowerCase() === s.name.toLowerCase());
    if (linkedProducts.length > 0) {
      if (!window.confirm(`Supplier "${s.name}" is linked to ${linkedProducts.length} inventory products. Deleting will unlink them. Continue?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete supplier "${s.name}"?`)) {
        return;
      }
    }
    onDeleteSupplier(s.id);
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
        </div>
      </div>

      {/* KPI Metrics Strip */}
      {activeTab === 'customers' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Customers</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-slate-100 font-mono mt-1">
              {customerMetrics.totalCount}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Active directory accounts</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Outstanding Debt (Credit)</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono mt-1">
              KSh {customerMetrics.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              KSh {customerMetrics.totalLifetimeSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Gross customer sales</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Average Customer Spend</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-slate-100 font-mono mt-1">
              KSh {customerMetrics.avgSpend.toLocaleString()}
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
              KSh {supplierMetrics.totalPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              KSh {supplierMetrics.totalSupplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'customers'
                  ? 'Search customers by name, phone, email, KRA PIN, location...'
                  : 'Search suppliers by company, contact person, phone, category...'
              }
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
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
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 text-xs outline-none transition font-semibold"
            >
              <option value="debt">Highest Debt / Payable</option>
              <option value="volume">Highest Sales / Volume</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

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
                    {filteredCustomers.map((c) => {
                      const debt = c.currentBalanceDue || 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
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
                                    className="p-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/80 rounded-lg transition"
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
                            KSh {(c.totalPurchases || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          {/* Balance Due */}
                          <td className="p-4 text-right font-mono font-black text-sm">
                            {debt > 0 ? (
                              <span className="text-rose-400">
                                KSh {debt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
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
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingCustomer(c);
                                  setIsCustomerEditOpen(true);
                                }}
                                title="Edit Customer Details"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {c.id !== 'cust-1' && (
                                <button
                                  onClick={() => handleDeleteCustomerPrompt(c)}
                                  title="Delete Customer Profile"
                                  className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-xl transition"
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
                            KSh {(s.totalSuppliedValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          {/* Accounts Payable Owed */}
                          <td className="p-4 text-right font-mono font-black text-sm">
                            {debt > 0 ? (
                              <span className="text-rose-400">
                                KSh {debt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-normal">KSh 0.00</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-4 text-center">
                            {debt > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Due: KSh {debt.toLocaleString()}
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
        targetType={activeTab}
        customers={customers}
        suppliers={suppliers}
        onImportCustomers={onImportCustomers}
        onImportSuppliers={onImportSuppliers}
      />
    </div>
  );
};
