import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Minus,
  Search,
  Filter,
  Download,
  Printer,
  Landmark,
  Building2,
  FileText,
  CreditCard,
  DollarSign,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Layers,
  Trash2,
  Check,
  Truck,
  Scale,
  Receipt,
  History,
  Coins,
  PieChart,
  ArrowRight,
  ShieldCheck,
  Package,
  Users,
  Smartphone,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import {
  CashTransaction,
  CashInCategory,
  CashOutCategory,
  User,
  Product,
  Customer,
  Supplier,
  Transaction,
  Expense,
  FinancingFacility,
  FacilityRepayment
} from '../../types';
import { LoansAndChamaView } from './LoansAndChamaView';
import { DenominationReconciliationView } from './DenominationReconciliationView';

interface CashManagementViewProps {
  cashTransactions: CashTransaction[];
  financingFacilities?: FinancingFacility[];
  currentUser: User;
  products?: Product[];
  customers?: Customer[];
  suppliers?: Supplier[];
  transactions?: Transaction[];
  expenses?: Expense[];
  onAddCashTransaction: (tx: CashTransaction) => void;
  onDeleteCashTransaction: (txId: string) => void;
  onSaveSupplier?: (supplier: Supplier) => void;
  onRecordSupplierPayment?: (supplierId: string, amount: number, paymentMethod?: string, referenceNo?: string) => void;
  onSaveFinancingFacility?: (facility: FinancingFacility) => void;
  onDeleteFinancingFacility?: (facilityId: string) => void;
  onRecordFacilityRepayment?: (facilityId: string, repayment: FacilityRepayment, autoLogCashOut?: boolean) => void;
  onDisburseFacilityFunds?: (facilityId: string, amount: number, ref: string, autoLogCashIn?: boolean) => void;
}

const CASH_IN_CATEGORIES: CashInCategory[] = [
  'Bank Loan',
  'Chama / Merry-Go-Round Payout',
  'SACCO / Microfinance Loan',
  'Mobile / Digital Loan',
  'Owner Capital / Equity',
  'Bank Withdrawal to Vault',
  'Customer Debt Payment',
  'Asset Sale',
  'Refund Received',
  'Other Cash In',
];

const CASH_OUT_CATEGORIES: CashOutCategory[] = [
  'Bank Deposit (Vault to Bank)',
  'Bank / SACCO Loan Repayment',
  'Chama Contribution / Table Banking',
  'Mobile Loan Repayment',
  'Supplier Cash Payment',
  'Petty Cash Payout',
  'Owner Drawings / Dividends',
  'Tax Payment',
  'Other Cash Out',
];

export const CashManagementView: React.FC<CashManagementViewProps> = ({
  cashTransactions,
  financingFacilities = [],
  currentUser,
  products = [],
  customers = [],
  suppliers = [],
  transactions = [],
  expenses = [],
  onAddCashTransaction,
  onDeleteCashTransaction,
  onSaveSupplier,
  onRecordSupplierPayment,
  onSaveFinancingFacility,
  onDeleteFinancingFacility,
  onRecordFacilityRepayment,
  onDisburseFacilityFunds,
}) => {
  // Main Tab Navigation
  const [activeTab, setActiveTab] = useState<'ledger' | 'loans' | 'payables' | 'denominations' | 'balancesheet'>('ledger');

  // Search and Filter States for Ledger
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CASH_IN' | 'CASH_OUT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  // Modal States
  const [showCashInModal, setShowCashInModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [selectedTxForVoucher, setSelectedTxForVoucher] = useState<CashTransaction | null>(null);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null);
  const [supplierPayAmount, setSupplierPayAmount] = useState('');
  const [supplierPayMethod, setSupplierPayMethod] = useState<'cash' | 'mpesa' | 'bank_transfer' | 'cheque'>('cash');
  const [supplierPayRef, setSupplierPayRef] = useState('');

  // Cash In Form State
  const [inCategory, setInCategory] = useState<CashInCategory>('Bank Loan');
  const [inAmount, setInAmount] = useState('');
  const [inSource, setInSource] = useState('KCB Bank Kenya Ltd');
  const [inRefNo, setInRefNo] = useState(`DISB-${Math.floor(1000 + Math.random() * 9000)}`);
  const [inMethod, setInMethod] = useState<'cash' | 'mpesa' | 'bank_transfer' | 'cheque'>('bank_transfer');
  const [inDescription, setInDescription] = useState('');
  const [inNotes, setInNotes] = useState('');

  // Cash Out Form State
  const [outCategory, setOutCategory] = useState<CashOutCategory>('Bank / SACCO Loan Repayment');
  const [outAmount, setOutAmount] = useState('');
  const [outDestination, setOutDestination] = useState('KCB Bank Kenya Ltd');
  const [outRefNo, setOutRefNo] = useState(`PV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [outMethod, setOutMethod] = useState<'cash' | 'mpesa' | 'bank_transfer' | 'cheque'>('bank_transfer');
  const [outDescription, setOutDescription] = useState('');
  const [outNotes, setOutNotes] = useState('');

  // --- EXECUTIVE FINANCIAL CALCULATIONS ---
  const totalCashIn = useMemo(() => {
    return cashTransactions
      .filter((t) => t.type === 'CASH_IN')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [cashTransactions]);

  const totalCashOut = useMemo(() => {
    return cashTransactions
      .filter((t) => t.type === 'CASH_OUT')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [cashTransactions]);

  // POS Direct Cash Inflows (cash sales)
  const posCashSales = useMemo(() => {
    return transactions
      .filter((t) => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.total, 0);
  }, [transactions]);

  // Cash Paid Expenses
  const cashExpensesTotal = useMemo(() => {
    return expenses
      .filter((e) => e.paymentMethod === 'cash')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Total Loans & Chama Inflows Specifically
  const totalFinancingInflows = useMemo(() => {
    return cashTransactions
      .filter(
        (t) =>
          t.type === 'CASH_IN' &&
          (t.category === 'Bank Loan' ||
            t.category === 'Chama / Merry-Go-Round Payout' ||
            t.category === 'SACCO / Microfinance Loan' ||
            t.category === 'Mobile / Digital Loan')
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [cashTransactions]);

  // Total Financing Repayments Outflows
  const totalFinancingRepayments = useMemo(() => {
    return cashTransactions
      .filter(
        (t) =>
          t.type === 'CASH_OUT' &&
          (t.category === 'Bank Loan Repayment' ||
            t.category === 'Bank / SACCO Loan Repayment' ||
            t.category === 'Chama Contribution / Table Banking' ||
            t.category === 'Mobile Loan Repayment')
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [cashTransactions]);

  // Net Cash Vault Balance
  const netVaultBalance = totalCashIn + posCashSales - totalCashOut - cashExpensesTotal;

  // Supplier Payables Total
  const totalSupplierPayables = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0);
  }, [suppliers]);

  // Outstanding Loan / Chama Debt Total
  const totalOutstandingLoanDebt = useMemo(() => {
    return financingFacilities.reduce((sum, f) => sum + (f.balanceRemaining || 0), 0);
  }, [financingFacilities]);

  // Customer Receivables Total
  const totalCustomerReceivables = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.debtBalance || 0), 0);
  }, [customers]);

  // Inventory Cost Valuation Total
  const totalInventoryCost = useMemo(() => {
    return products.reduce((sum, p) => sum + p.buyingPrice * p.stock, 0);
  }, [products]);

  // Filtered Ledger Transactions
  const filteredTransactions = useMemo(() => {
    return cashTransactions.filter((tx) => {
      // Type filter
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;

      // Date filter
      if (dateFilter !== 'ALL') {
        const txDate = new Date(tx.date);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          if (txDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'WEEK') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (txDate < oneWeekAgo) return false;
        } else if (dateFilter === 'MONTH') {
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (txDate < oneMonthAgo) return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(term);
        const matchesSource = tx.sourceDestination.toLowerCase().includes(term);
        const matchesRef = tx.referenceNo.toLowerCase().includes(term);
        const matchesCat = tx.category.toLowerCase().includes(term);
        const matchesAmt = tx.amount.toString().includes(term);
        const matchesUser = tx.recordedBy.toLowerCase().includes(term);
        if (!matchesDesc && !matchesSource && !matchesRef && !matchesCat && !matchesAmt && !matchesUser) {
          return false;
        }
      }

      return true;
    });
  }, [cashTransactions, typeFilter, categoryFilter, dateFilter, searchTerm]);

  // Quick Preset Handlers for Cash In Modal
  const loadCashInPreset = (preset: 'KCB_LOAN' | 'CHAMA_PAYOUT' | 'SACCO_LOAN' | 'MSHWARI' | 'OWNER_CAPITAL' | 'CUST_DEBT' | 'BANK_DRAW') => {
    if (preset === 'KCB_LOAN') {
      setInCategory('Bank Loan');
      setInSource('KCB Bank Kenya Ltd (SME Business Expansion Loan)');
      setInRefNo(`LOAN-KCB-${Math.floor(1000 + Math.random() * 9000)}`);
      setInAmount('500000');
      setInMethod('bank_transfer');
      setInDescription('Bank loan disbursement received for boutique inventory expansion & shop renovation');
      setInNotes('Approved 24-month term loan at 13% APR.');
    } else if (preset === 'CHAMA_PAYOUT') {
      setInCategory('Chama / Merry-Go-Round Payout');
      setInSource('Ushirika Entrepreneurs Chama Investment Group');
      setInRefNo(`CHAMA-USH-${Math.floor(1000 + Math.random() * 9000)}`);
      setInAmount('200000');
      setInMethod('mpesa');
      setInDescription('Monthly Chama merry-go-round lump-sum payout received for wholesale stock discounts');
      setInNotes('Received directly on M-Pesa business till.');
    } else if (preset === 'SACCO_LOAN') {
      setInCategory('SACCO / Microfinance Loan');
      setInSource('Stima DT SACCO Society (Working Capital Facility)');
      setInRefNo(`SACCO-${Math.floor(1000 + Math.random() * 9000)}`);
      setInAmount('300000');
      setInMethod('bank_transfer');
      setInDescription('SACCO emergency stock development loan credit received into business bank account');
      setInNotes('Member dividend-backed 12-month facility.');
    } else if (preset === 'MSHWARI') {
      setInCategory('Mobile / Digital Loan');
      setInSource('Safaricom Lipa Na M-Pesa Merchant Business Float');
      setInRefNo(`MPESA-FUL-${Math.floor(1000 + Math.random() * 9000)}`);
      setInAmount('80000');
      setInMethod('mpesa');
      setInDescription('Short-term weekend stock purchase float advance from NCBA/Safaricom');
      setInNotes('30-day merchant facility.');
    } else if (preset === 'OWNER_CAPITAL') {
      setInCategory('Owner Capital / Equity');
      setInSource('Managing Director Capital Injection');
      setInRefNo(`CAP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setInAmount('150000');
      setInMethod('bank_transfer');
      setInDescription('Direct equity contribution for store liquidity, emergency buffer & operational float');
    } else if (preset === 'CUST_DEBT') {
      setInCategory('Customer Debt Payment');
      setInSource('Wholesale Credit Customer');
      setInRefNo(`MPESA-SETTLE-${Math.floor(1000 + Math.random() * 9000)}`);
      setInAmount('25000');
      setInMethod('mpesa');
      setInDescription('Customer settled outstanding store ledger credit balance for previous wholesale purchase');
    } else if (preset === 'BANK_DRAW') {
      setInCategory('Bank Withdrawal to Vault');
      setInSource('Equity Bank Corporate Account');
      setInRefNo(`WITHDRAW-${Math.floor(1000 + Math.random() * 9000)}`);
      setInAmount('100000');
      setInMethod('cash');
      setInDescription('Cash withdrawal from bank account to replenish physical register cash drawer & petty cash safe');
    }
  };

  // Quick Preset Handlers for Cash Out Modal
  const loadCashOutPreset = (preset: 'BANK_REPAY' | 'CHAMA_CONTRIB' | 'MOB_REPAY' | 'BANK_DEPOSIT' | 'SUPPLIER_PAY' | 'PETTY_CASH' | 'OWNER_DRAW' | 'TAX_PAY') => {
    if (preset === 'BANK_REPAY') {
      setOutCategory('Bank / SACCO Loan Repayment');
      setOutDestination('KCB Bank Kenya Ltd Loan A/C #110029301');
      setOutRefNo(`EFT-KCB-${Math.floor(1000 + Math.random() * 9000)}`);
      setOutAmount('24500');
      setOutMethod('bank_transfer');
      setOutDescription('KCB SME Expansion Loan Monthly Installment Standing Order (Principal + Interest)');
    } else if (preset === 'CHAMA_CONTRIB') {
      setOutCategory('Chama Contribution / Table Banking');
      setOutDestination('Ushirika Entrepreneurs Chama Group');
      setOutRefNo(`MPESA-CHM-${Math.floor(1000 + Math.random() * 9000)}`);
      setOutAmount('35000');
      setOutMethod('mpesa');
      setOutDescription('Monthly Chama savings share contribution & table banking loan repayment installment');
    } else if (preset === 'MOB_REPAY') {
      setOutCategory('Mobile Loan Repayment');
      setOutDestination('Safaricom / NCBA Merchant Credit Facility');
      setOutRefNo(`MPESA-CLR-${Math.floor(1000 + Math.random() * 9000)}`);
      setOutAmount('86400');
      setOutMethod('mpesa');
      setOutDescription('Full settlement and clearance of weekend merchant float advance');
    } else if (preset === 'BANK_DEPOSIT') {
      setOutCategory('Bank Deposit (Vault to Bank)');
      setOutDestination('Equity Bank Corporate Account (HQ CBD Branch)');
      setOutRefNo(`SLIP-EQB-${Math.floor(10000 + Math.random() * 90000)}`);
      setOutAmount('180000');
      setOutMethod('cash');
      setOutDescription('End-of-day physical cash vault & drawer deposit banked at Equity Bank branch');
    } else if (preset === 'SUPPLIER_PAY') {
      setOutCategory('Supplier Cash Payment');
      setOutDestination('East Africa Fashion Wholesalers');
      setOutRefNo(`PV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setOutAmount('45000');
      setOutMethod('cash');
      setOutDescription('Payment voucher for urgent boutique stock replenishment delivery');
    } else if (preset === 'PETTY_CASH') {
      setOutCategory('Petty Cash Payout');
      setOutDestination('Store Operations & Courier Supplies');
      setOutRefNo(`PETTY-${Math.floor(1000 + Math.random() * 9000)}`);
      setOutAmount('4200');
      setOutMethod('cash');
      setOutDescription('Cash payout for receipt rolls, cleaning detergents, courier parcels & drinking water');
    } else if (preset === 'OWNER_DRAW') {
      setOutCategory('Owner Drawings / Dividends');
      setOutDestination('Director Personal Account');
      setOutRefNo(`DRAW-${Math.floor(1000 + Math.random() * 9000)}`);
      setOutAmount('50000');
      setOutMethod('bank_transfer');
      setOutDescription('Owner monthly profit draw / personal drawings');
    } else if (preset === 'TAX_PAY') {
      setOutCategory('Tax Payment');
      setOutDestination('Kenya Revenue Authority (KRA) / County Government');
      setOutRefNo(`KRA-PRN-${Math.floor(100000 + Math.random() * 900000)}`);
      setOutAmount('15000');
      setOutMethod('bank_transfer');
      setOutDescription('Monthly Turnover Tax (TOT) / County Single Business Permit fee payment');
    }
  };

  // Submit Cash In
  const handleCashInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(inAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newTx: CashTransaction = {
      id: `ct-${Date.now()}`,
      type: 'CASH_IN',
      category: inCategory,
      amount: amt,
      date: new Date().toISOString(),
      sourceDestination: inSource.trim() || 'Unknown Source',
      referenceNo: inRefNo.trim() || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      paymentMethod: inMethod,
      description: inDescription.trim() || `${inCategory} Inflow`,
      recordedBy: currentUser.name,
      status: 'Completed',
      notes: inNotes.trim() || undefined,
    };

    onAddCashTransaction(newTx);
    setShowCashInModal(false);
    // Reset Form
    setInAmount('');
    setInDescription('');
    setInNotes('');
  };

  // Submit Cash Out
  const handleCashOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(outAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newTx: CashTransaction = {
      id: `ct-${Date.now()}`,
      type: 'CASH_OUT',
      category: outCategory,
      amount: amt,
      date: new Date().toISOString(),
      sourceDestination: outDestination.trim() || 'Unknown Destination',
      referenceNo: outRefNo.trim() || `PV-${Math.floor(1000 + Math.random() * 9000)}`,
      paymentMethod: outMethod,
      description: outDescription.trim() || `${outCategory} Outflow`,
      recordedBy: currentUser.name,
      status: 'Completed',
      notes: outNotes.trim() || undefined,
    };

    onAddCashTransaction(newTx);
    setShowCashOutModal(false);
    // Reset Form
    setOutAmount('');
    setOutDescription('');
    setOutNotes('');
  };

  // Export Ledger to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Category', 'Amount (KSh)', 'Date', 'Source/Destination', 'Reference No', 'Payment Method', 'Description', 'Recorded By', 'Status', 'Notes'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.type,
      `"${tx.category.replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      `"${new Date(tx.date).toLocaleString()}"`,
      `"${tx.sourceDestination.replace(/"/g, '""')}"`,
      `"${tx.referenceNo.replace(/"/g, '""')}"`,
      tx.paymentMethod,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.recordedBy.replace(/"/g, '""')}"`,
      tx.status,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cashflow_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Supplier Settle Modal
  const handleSupplierPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPay) return;
    const amt = parseFloat(supplierPayAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (onRecordSupplierPayment) {
      onRecordSupplierPayment(selectedSupplierForPay.id, amt, supplierPayMethod, supplierPayRef);
    } else if (onSaveSupplier) {
      const newBal = Math.max(0, (selectedSupplierForPay.currentBalance || 0) - amt);
      onSaveSupplier({
        ...selectedSupplierForPay,
        currentBalance: newBal,
      });
    }

    // Auto-create Cash Out transaction
    const cashOutTx: CashTransaction = {
      id: `ct-${Date.now()}`,
      type: 'CASH_OUT',
      category: 'Supplier Cash Payment',
      amount: amt,
      date: new Date().toISOString(),
      sourceDestination: selectedSupplierForPay.name,
      referenceNo: supplierPayRef.trim() || `PV-SUP-${Math.floor(1000 + Math.random() * 9000)}`,
      paymentMethod: supplierPayMethod,
      description: `Payment for stock invoice to supplier ${selectedSupplierForPay.name}`,
      recordedBy: currentUser.name,
      status: 'Completed',
    };
    onAddCashTransaction(cashOutTx);

    setSelectedSupplierForPay(null);
    setSupplierPayAmount('');
    setSupplierPayRef('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & FAST ACTION BUTTONS */}
      {/* ========================================================= */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-extrabold text-xs uppercase tracking-wider mb-1">
            <Wallet className="w-4 h-4" /> Treasury & Liquidity Management
          </div>
          <h2 className="text-3xl font-black text-slate-100 tracking-tight">Cash In & Cash Out Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Track bank loans, chama merry-go-round payouts, SACCO facilities, supplier cash vouchers, bank deposits & vault liquidity
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setInRefNo(`DISB-${Math.floor(1000 + Math.random() * 9000)}`);
              setShowCashInModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Record Cash In</span>
          </button>

          <button
            onClick={() => {
              setOutRefNo(`PV-${Math.floor(1000 + Math.random() * 9000)}`);
              setShowCashOutModal(true);
            }}
            className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs transition flex items-center gap-2 shadow-lg shadow-rose-600/25 active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>- Record Cash Out</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2.5 rounded-2xl text-xs transition flex items-center gap-1.5 active:scale-95"
            title="Export full ledger to CSV"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. EXECUTIVE METRICS GRID */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Vault Balance */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 relative overflow-hidden shadow-lg group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Net Vault & Register Cash</span>
            <div className="p-2 bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
            KSh {netVaultBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>POS Sales: KSh {posCashSales.toLocaleString()}</span>
            <span className="text-emerald-400 font-bold">Liquid Float</span>
          </div>
        </div>

        {/* Total Cash Inflows */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 relative overflow-hidden shadow-lg group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Total Cash Inflows</span>
            <div className="p-2 bg-sky-950/80 border border-sky-800/80 text-sky-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-400 font-mono tracking-tight">
            KSh {totalCashIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Loans & Chama: KSh {totalFinancingInflows.toLocaleString()}
          </div>
        </div>

        {/* Total Cash Outflows */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 relative overflow-hidden shadow-lg group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Total Cash Outflows</span>
            <div className="p-2 bg-rose-950/80 border border-rose-800/80 text-rose-400 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-400 font-mono tracking-tight">
            KSh {totalCashOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Debt & Chama Repaid: KSh {totalFinancingRepayments.toLocaleString()}
          </div>
        </div>

        {/* Bank & Chama Debt Outstanding */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 relative overflow-hidden shadow-lg group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Bank & Chama Liabilities</span>
            <div className="p-2 bg-amber-950/80 border border-amber-800/80 text-amber-400 rounded-xl">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
            KSh {totalOutstandingLoanDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {financingFacilities.filter((f) => (f.balanceRemaining || 0) > 0).length} Active Facilities
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. NAVIGATION SUB-TABS */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'ledger'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Cashflow Ledger & Vouchers</span>
          <span className="bg-slate-950/60 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {cashTransactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'loans'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Landmark className="w-4 h-4 text-amber-400" />
          <span>Bank Loans & Chama Facilities</span>
          <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {financingFacilities.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payables')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'payables'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Truck className="w-4 h-4 text-purple-400" />
          <span>Supplier Payables & Invoices</span>
          <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
            KSh {totalSupplierPayables.toLocaleString()}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('denominations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'denominations'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Coins className="w-4 h-4 text-emerald-400" />
          <span>Till & Vault Denomination Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('balancesheet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'balancesheet'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Scale className="w-4 h-4 text-indigo-400" />
          <span>Balance Sheet & Financial Position</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CASHFLOW LEDGER & VOUCHERS */}
      {/* ========================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS BAR */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search transaction reference, description, source, payee, category or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    typeFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({cashTransactions.length})
                </button>
                <button
                  onClick={() => setTypeFilter('CASH_IN')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                    typeFilter === 'CASH_IN' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  + Cash In ({cashTransactions.filter((t) => t.type === 'CASH_IN').length})
                </button>
                <button
                  onClick={() => setTypeFilter('CASH_OUT')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                    typeFilter === 'CASH_OUT' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  - Cash Out ({cashTransactions.filter((t) => t.type === 'CASH_OUT').length})
                </button>
              </div>

              {/* Category Dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Categories</option>
                <optgroup label="Cash In Categories">
                  {CASH_IN_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Cash Out Categories">
                  {CASH_OUT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* Date Filter Dropdown */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">Past 7 Days</option>
                <option value="MONTH">Past 30 Days</option>
              </select>
            </div>
          </div>

          {/* TRANSACTIONS TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Type</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Source / Destination</th>
                    <th className="p-4">Reference No</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4 text-right">Amount (KSh)</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Recorded By</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500">
                        <Wallet className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                        <p className="text-sm font-bold text-slate-400">No cash transactions match your filter criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isIn = tx.type === 'CASH_IN';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-850/60 transition group">
                          {/* Type */}
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                isIn
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800/80'
                              }`}
                            >
                              {isIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {isIn ? '+ CASH IN' : '- CASH OUT'}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="p-4 font-bold text-slate-200">
                            {tx.category}
                            {tx.facilityId && (
                              <span className="block text-[10px] text-amber-400 font-mono">Linked Facility</span>
                            )}
                          </td>

                          {/* Source / Destination */}
                          <td className="p-4 text-slate-300">
                            <div className="font-semibold">{tx.sourceDestination}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{tx.description}</div>
                          </td>

                          {/* Reference No */}
                          <td className="p-4 font-mono text-slate-400 text-[11px]">{tx.referenceNo}</td>

                          {/* Payment Method */}
                          <td className="p-4 capitalize text-slate-300">
                            <span className="bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                              {tx.paymentMethod.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Amount */}
                          <td
                            className={`p-4 text-right font-black font-mono text-sm ${
                              isIn ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isIn ? '+' : '-'}KSh {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          {/* Date */}
                          <td className="p-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>

                          {/* Recorded By */}
                          <td className="p-4 text-slate-400">{tx.recordedBy}</td>

                          {/* Actions */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedTxForVoucher(tx)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition border border-slate-700"
                                title="Print Official Cash Receipt / Payment Voucher"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onDeleteCashTransaction(tx.id)}
                                className="p-1.5 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded-lg transition"
                                title="Delete Transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: BANK LOANS & CHAMA FACILITIES */}
      {/* ========================================================= */}
      {activeTab === 'loans' && (
        <LoansAndChamaView
          facilities={financingFacilities}
          currentUser={currentUser}
          onSaveFacility={onSaveFinancingFacility || (() => {})}
          onDeleteFacility={onDeleteFinancingFacility || (() => {})}
          onRecordRepayment={onRecordFacilityRepayment || (() => {})}
          onDisburseFunds={onDisburseFacilityFunds || (() => {})}
          onAddCashTransaction={onAddCashTransaction}
        />
      )}

      {/* ========================================================= */}
      {/* TAB 3: SUPPLIER PAYABLES & INVOICES */}
      {/* ========================================================= */}
      {activeTab === 'payables' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-400 font-extrabold text-xs uppercase tracking-wider mb-1">
                <Truck className="w-4 h-4" /> Supplier Credit & Account Payables
              </div>
              <h3 className="text-2xl font-black text-slate-100">Trade Creditors & Supplier Payables</h3>
              <p className="text-xs text-slate-400 mt-1">
                Manage supplier credit balances and issue cash payment vouchers for stock replenishments
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl font-mono text-xs text-right">
              <span className="text-slate-400 block text-[10px]">Total Supplier Credit Outstanding:</span>
              <strong className="text-2xl font-black text-rose-400">
                KSh {totalSupplierPayables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((sup) => {
              const owesBalance = (sup.currentBalance || 0) > 0;
              return (
                <div
                  key={sup.id}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-100">{sup.name}</h4>
                        <p className="text-xs text-slate-400">{sup.contactPerson || 'Account Representative'}</p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          owesBalance ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {owesBalance ? 'Payment Due' : 'Cleared'}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 font-mono text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-400">
                        <span>Phone / Contact:</span>
                        <span className="text-slate-200">{sup.phone}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Payment Terms:</span>
                        <span className="text-slate-200">{sup.paymentTerms || 'Net 30'}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-850 flex justify-between items-center">
                        <span className="text-slate-400 uppercase text-[10px] font-sans font-bold">Outstanding Owed:</span>
                        <strong className={`text-base font-black ${owesBalance ? 'text-rose-400' : 'text-emerald-400'}`}>
                          KSh {(sup.currentBalance || 0).toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedSupplierForPay(sup);
                      setSupplierPayAmount((sup.currentBalance || 0).toString());
                      setSupplierPayRef(`PV-${Math.floor(1000 + Math.random() * 9000)}`);
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Issue Payment Voucher (-Cash Out)</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: DENOMINATIONS & VAULT AUDIT */}
      {/* ========================================================= */}
      {activeTab === 'denominations' && (
        <DenominationReconciliationView
          systemCashBalance={netVaultBalance}
          currentUser={currentUser}
        />
      )}

      {/* ========================================================= */}
      {/* TAB 5: BALANCE SHEET & FINANCIAL POSITION */}
      {/* ========================================================= */}
      {activeTab === 'balancesheet' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs uppercase tracking-wider mb-1">
                <Scale className="w-4 h-4" /> Statement of Financial Position
              </div>
              <h3 className="text-2xl font-black text-slate-100">Live Balance Sheet & Net Working Capital</h3>
              <p className="text-xs text-slate-400 mt-1">
                Real-time assessment of Current Assets, Liabilities & Owner's Equity based on your live inventory, ledger & loans
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/25"
            >
              <Printer className="w-4 h-4" />
              <span>Print Balance Sheet</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ASSETS COLUMN */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-black text-base text-emerald-400 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5" /> CURRENT ASSETS
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-xl">
                  Total: KSh {(netVaultBalance + totalCustomerReceivables + totalInventoryCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-200 block text-sm">Cash in Vault & Drawer Float</span>
                    <span className="text-[10px] text-slate-400 font-sans">Physical and till liquid funds</span>
                  </div>
                  <strong className="text-emerald-400 text-base font-black">
                    KSh {netVaultBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-200 block text-sm">Accounts Receivable (Customer Credit)</span>
                    <span className="text-[10px] text-slate-400 font-sans">Debts owed by store customers</span>
                  </div>
                  <strong className="text-emerald-400 text-base font-black">
                    KSh {totalCustomerReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-200 block text-sm">Merchandise Inventory (At Cost Valuation)</span>
                    <span className="text-[10px] text-slate-400 font-sans">{products.reduce((s, p) => s + p.stock, 0)} items in stock</span>
                  </div>
                  <strong className="text-emerald-400 text-base font-black">
                    KSh {totalInventoryCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>

            {/* LIABILITIES COLUMN */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-black text-base text-rose-400 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5" /> CURRENT LIABILITIES
                </h4>
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-3 py-1 rounded-xl">
                  Total: KSh {(totalOutstandingLoanDebt + totalSupplierPayables).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-200 block text-sm">Bank Loans & Chama Borrowings</span>
                    <span className="text-[10px] text-slate-400 font-sans">KCB, Chamas, SACCOs & Mobile facilities</span>
                  </div>
                  <strong className="text-rose-400 text-base font-black">
                    KSh {totalOutstandingLoanDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-200 block text-sm">Accounts Payable (Supplier Credit)</span>
                    <span className="text-[10px] text-slate-400 font-sans">Invoices owed to stock suppliers</span>
                  </div>
                  <strong className="text-rose-400 text-base font-black">
                    KSh {totalSupplierPayables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* NET WORKING CAPITAL CARD */}
              <div className="pt-3 border-t border-slate-800">
                <div className="bg-indigo-950/40 border border-indigo-800 p-4 rounded-2xl flex justify-between items-center font-mono">
                  <div>
                    <span className="font-black text-indigo-300 block text-sm">Net Business Working Capital</span>
                    <span className="text-[10px] text-slate-400 font-sans">Total Assets minus Total Current Liabilities</span>
                  </div>
                  <strong className="text-indigo-300 text-lg font-black">
                    KSh {((netVaultBalance + totalCustomerReceivables + totalInventoryCost) - (totalOutstandingLoanDebt + totalSupplierPayables)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: RECORD CASH IN */}
      {/* ========================================================= */}
      {showCashInModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-2xl">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Record Cash In (Inflow)</h3>
                  <p className="text-xs text-slate-400">Receive bank loans, chama payouts, owner capital or debt settlements</p>
                </div>
              </div>
              <button
                onClick={() => setShowCashInModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                ⚡ Quick Kenyan Inflow Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadCashInPreset('KCB_LOAN')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  🏦 KCB Bank Loan
                </button>
                <button
                  type="button"
                  onClick={() => loadCashInPreset('CHAMA_PAYOUT')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  🤝 Chama Payout
                </button>
                <button
                  type="button"
                  onClick={() => loadCashInPreset('SACCO_LOAN')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  🏛️ Stima SACCO
                </button>
                <button
                  type="button"
                  onClick={() => loadCashInPreset('MSHWARI')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  📱 M-Pesa Float
                </button>
                <button
                  type="button"
                  onClick={() => loadCashInPreset('OWNER_CAPITAL')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  💼 Owner Capital
                </button>
                <button
                  type="button"
                  onClick={() => loadCashInPreset('BANK_DRAW')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  🏦 Bank to Vault Draw
                </button>
              </div>
            </div>

            <form onSubmit={handleCashInSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Inflow Category *</label>
                  <select
                    value={inCategory}
                    onChange={(e) => setInCategory(e.target.value as CashInCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {CASH_IN_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Amount (KSh) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 500000"
                    value={inAmount}
                    onChange={(e) => setInAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Source / Payer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KCB Bank / Ushirika Chama"
                    value={inSource}
                    onChange={(e) => setInSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Reference / Slip No</label>
                  <input
                    type="text"
                    placeholder="e.g. DISB-9921"
                    value={inRefNo}
                    onChange={(e) => setInRefNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={inMethod}
                    onChange={(e) => setInMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 capitalize"
                  >
                    <option value="bank_transfer">Bank Transfer / EFT</option>
                    <option value="mpesa">M-Pesa Mobile Till</option>
                    <option value="cash">Cash Vault Drawer</option>
                    <option value="cheque">Bank Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Description / Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KCB SME Loan disbursement received for inventory expansion"
                  value={inDescription}
                  onChange={(e) => setInDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Additional Notes / Terms (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 24-month term loan at 13% APR, monthly standing order"
                  value={inNotes}
                  onChange={(e) => setInNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCashInModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/20"
                >
                  Post Cash In (+ Inflow)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RECORD CASH OUT */}
      {/* ========================================================= */}
      {showCashOutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-950 text-rose-400 border border-rose-800 rounded-2xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Record Cash Out (Payment Voucher)</h3>
                  <p className="text-xs text-slate-400">Pay loan installments, chama contributions, supplier invoices, bank deposits</p>
                </div>
              </div>
              <button
                onClick={() => setShowCashOutModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                ⚡ Quick Kenyan Outflow Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadCashOutPreset('BANK_REPAY')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  🏦 Bank Loan Repayment
                </button>
                <button
                  type="button"
                  onClick={() => loadCashOutPreset('CHAMA_CONTRIB')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  🤝 Chama Contribution
                </button>
                <button
                  type="button"
                  onClick={() => loadCashOutPreset('MOB_REPAY')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  📱 Mobile Float Repay
                </button>
                <button
                  type="button"
                  onClick={() => loadCashOutPreset('BANK_DEPOSIT')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  🏦 Bank Vault Cash
                </button>
                <button
                  type="button"
                  onClick={() => loadCashOutPreset('SUPPLIER_PAY')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  🛒 Supplier Payment
                </button>
                <button
                  type="button"
                  onClick={() => loadCashOutPreset('PETTY_CASH')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold"
                >
                  🧾 Petty Cash Payout
                </button>
              </div>
            </div>

            <form onSubmit={handleCashOutSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Outflow Category *</label>
                  <select
                    value={outCategory}
                    onChange={(e) => setOutCategory(e.target.value as CashOutCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    {CASH_OUT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Amount (KSh) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 24500"
                    value={outAmount}
                    onChange={(e) => setOutAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-rose-400 font-mono font-bold text-base focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Payee / Destination *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KCB Bank Loan A/C / Supplier Name"
                    value={outDestination}
                    onChange={(e) => setOutDestination(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Payment Voucher / Slip No</label>
                  <input
                    type="text"
                    placeholder="e.g. PV-2026-081"
                    value={outRefNo}
                    onChange={(e) => setOutRefNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={outMethod}
                    onChange={(e) => setOutMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 capitalize"
                  >
                    <option value="bank_transfer">Bank Transfer / EFT</option>
                    <option value="mpesa">M-Pesa Mobile Till</option>
                    <option value="cash">Cash Vault Drawer</option>
                    <option value="cheque">Bank Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Description / Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly loan installment standing order repayment"
                  value={outDescription}
                  onChange={(e) => setOutDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Additional Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified by accountant and store manager"
                  value={outNotes}
                  onChange={(e) => setOutNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCashOutModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2.5 rounded-xl transition shadow-lg shadow-rose-600/20"
                >
                  Post Payment Voucher (- Outflow)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: OFFICIAL PRINTABLE RECEIPT / PAYMENT VOUCHER */}
      {/* ========================================================= */}
      {selectedTxForVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-extrabold text-xs uppercase tracking-wider">
                <Receipt className="w-4 h-4" /> Official Accounting Voucher
              </div>
              <button
                onClick={() => setSelectedTxForVoucher(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* PRINTABLE VOUCHER CONTENT */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 font-mono text-xs space-y-4 text-slate-300">
              <div className="text-center border-b border-slate-800 pb-3 space-y-1">
                <h4 className="text-base font-black text-slate-100 tracking-wider">ROFANI ELECTRONICS & BOUTIQUE</h4>
                <p className="text-[11px] text-slate-400 font-sans font-bold">
                  {selectedTxForVoucher.type === 'CASH_IN' ? 'OFFICIAL CASH RECEIPT VOUCHER' : 'OFFICIAL PAYMENT VOUCHER'}
                </p>
                <p className="text-[10px] text-slate-500">Voucher Ref: {selectedTxForVoucher.referenceNo}</p>
              </div>

              <div className="space-y-2 font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time:</span>
                  <span className="font-bold text-slate-200">{new Date(selectedTxForVoucher.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-bold text-slate-200">{selectedTxForVoucher.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{selectedTxForVoucher.type === 'CASH_IN' ? 'Received From:' : 'Paid To / Destination:'}</span>
                  <span className="font-bold text-slate-200">{selectedTxForVoucher.sourceDestination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Mode:</span>
                  <span className="font-bold text-slate-200 uppercase">{selectedTxForVoucher.paymentMethod.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Recorded By:</span>
                  <span className="font-bold text-slate-200">{selectedTxForVoucher.recordedBy}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 font-sans space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Description & Particulars:</span>
                <p className="text-xs text-slate-200 font-medium">{selectedTxForVoucher.description}</p>
                {selectedTxForVoucher.notes && (
                  <p className="text-[11px] text-slate-400 italic">Notes: {selectedTxForVoucher.notes}</p>
                )}
              </div>

              {/* Amount Box */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border-2 border-slate-800 flex justify-between items-center font-mono">
                <span className="text-xs uppercase font-bold text-slate-400 font-sans">Total Amount:</span>
                <strong
                  className={`text-xl font-black ${
                    selectedTxForVoucher.type === 'CASH_IN' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  KSh {selectedTxForVoucher.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-4 text-[10px] text-slate-400 font-sans border-t border-slate-800">
                <div className="space-y-4">
                  <div className="border-b border-slate-700 h-6"></div>
                  <span>Prepared By / Officer Signature</span>
                </div>
                <div className="space-y-4">
                  <div className="border-b border-slate-700 h-6"></div>
                  <span>Authorized / Approver Signature</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Official Voucher
              </button>
              <button
                onClick={() => setSelectedTxForVoucher(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: SUPPLIER SETTLE PAYMENT */}
      {/* ========================================================= */}
      {selectedSupplierForPay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-950 text-rose-400 border border-rose-800 rounded-2xl">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Settle Supplier Invoice</h3>
                  <p className="text-xs text-slate-400">{selectedSupplierForPay.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupplierForPay(null)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-xs flex justify-between items-center">
              <span className="text-slate-400">Current Balance Owed:</span>
              <strong className="text-rose-400 text-base font-black">
                KSh {(selectedSupplierForPay.currentBalance || 0).toLocaleString()}
              </strong>
            </div>

            <form onSubmit={handleSupplierPaymentSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-300 mb-1">Payment Amount (KSh) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Enter amount to pay"
                  value={supplierPayAmount}
                  onChange={(e) => setSupplierPayAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-rose-400 font-mono font-bold text-base focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={supplierPayMethod}
                    onChange={(e) => setSupplierPayMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 capitalize"
                  >
                    <option value="cash">Cash Vault Drawer</option>
                    <option value="mpesa">M-Pesa Mobile Till</option>
                    <option value="bank_transfer">Bank Transfer / EFT</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Voucher Ref No</label>
                  <input
                    type="text"
                    placeholder="e.g. PV-2026-091"
                    value={supplierPayRef}
                    onChange={(e) => setSupplierPayRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSupplierForPay(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2.5 rounded-xl transition shadow-lg shadow-rose-600/20"
                >
                  Confirm Settle Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
