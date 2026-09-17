import React, { useState } from 'react';
import {
  Landmark,
  Building2,
  Users,
  Smartphone,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  Phone,
  FileText,
  Printer,
  ChevronRight,
  TrendingDown,
  Percent,
  Search,
  Filter,
  X,
  Layers,
  Sparkles,
  Scale
} from 'lucide-react';
import { FinancingFacility, FacilityRepayment, FacilityType, User, CashTransaction } from '../../types';

interface LoansAndChamaViewProps {
  facilities: FinancingFacility[];
  currentUser: User;
  onSaveFacility: (facility: FinancingFacility) => void;
  onDeleteFacility: (facilityId: string) => void;
  onRecordRepayment: (facilityId: string, repayment: FacilityRepayment, autoLogCashOut?: boolean) => void;
  onDisburseFunds: (facilityId: string, amount: number, ref: string, autoLogCashIn?: boolean) => void;
  onAddCashTransaction?: (tx: CashTransaction) => void;
}

export const LoansAndChamaView: React.FC<LoansAndChamaViewProps> = ({
  facilities,
  currentUser,
  onSaveFacility,
  onDeleteFacility,
  onRecordRepayment,
  onDisburseFunds,
  onAddCashTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLEARED'>('ALL');

  // Modal States
  const [showAddFacilityModal, setShowAddFacilityModal] = useState(false);
  const [selectedFacilityForPay, setSelectedFacilityForPay] = useState<FinancingFacility | null>(null);
  const [selectedFacilityForDisburse, setSelectedFacilityForDisburse] = useState<FinancingFacility | null>(null);
  const [selectedFacilityForStatement, setSelectedFacilityForStatement] = useState<FinancingFacility | null>(null);

  // New Facility Form State
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('Bank Loan');
  const [lenderName, setLenderName] = useState('KCB Bank Kenya Ltd');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestPercentage, setInterestPercentage] = useState('12');
  const [repaymentFreq, setRepaymentFreq] = useState<'Monthly' | 'Weekly' | 'Bi-Weekly' | 'Daily' | 'Lump Sum'>('Monthly');
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [installmentAmt, setInstallmentAmt] = useState('');
  const [disbursementMethod, setDisbursementMethod] = useState<'bank_transfer' | 'mpesa' | 'cash' | 'cheque'>('bank_transfer');
  const [disbursementRef, setDisbursementRef] = useState(`DISB-${Math.floor(1000 + Math.random() * 9000)}`);
  const [purpose, setPurpose] = useState('Working capital & inventory restocking');
  const [notes, setNotes] = useState('');
  const [autoLogCashInOnCreate, setAutoLogCashInOnCreate] = useState(true);

  // Repayment Form State
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState<'cash' | 'mpesa' | 'bank_transfer' | 'cheque'>('bank_transfer');
  const [repayRef, setRepayRef] = useState('');
  const [repayNotes, setRepayNotes] = useState('');
  const [autoLogCashOut, setAutoLogCashOut] = useState(true);

  // Top-Up / Disbursement Form State
  const [disburseAmount, setDisburseAmount] = useState('');
  const [disburseRefInput, setDisburseRefInput] = useState('');
  const [disburseNotes, setDisburseNotes] = useState('');

  // --- CALCULATIONS ---
  const totalPrincipalBorrowed = facilities.reduce((sum, f) => sum + f.principalAmount, 0);
  const totalRepayable = facilities.reduce((sum, f) => sum + f.totalRepayableAmount, 0);
  const totalRepaidSoFar = facilities.reduce((sum, f) => sum + (f.totalRepaid || 0), 0);
  const totalOutstandingRemaining = facilities.reduce((sum, f) => sum + (f.balanceRemaining || 0), 0);
  const activeCount = facilities.filter((f) => (f.balanceRemaining || 0) > 0).length;

  // Filtered Facilities
  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.lenderOrGroupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.facilityNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.contactPerson && f.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || f.facilityType === typeFilter;

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') matchesStatus = (f.balanceRemaining || 0) > 0;
    if (statusFilter === 'CLEARED') matchesStatus = (f.balanceRemaining || 0) <= 0;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Handle Create Facility Submit
  const handleCreateFacility = (e: React.FormEvent) => {
    e.preventDefault();
    const principal = parseFloat(principalAmount);
    const interest = parseFloat(interestPercentage) || 0;
    if (isNaN(principal) || principal <= 0 || !facilityName.trim()) return;

    const totalRepayableCalc = principal + (principal * (interest / 100));
    const instAmt = parseFloat(installmentAmt) || (repaymentFreq === 'Monthly' ? totalRepayableCalc / 12 : totalRepayableCalc);

    const prefix = facilityType === 'Bank Loan' ? 'FAC-BANK' : facilityType === 'Chama / Merry-Go-Round' ? 'CHAMA' : facilityType === 'SACCO Loan' ? 'SACCO' : 'MOB';
    const facilityNo = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newFacility: FinancingFacility = {
      id: `fac-${Date.now()}`,
      facilityNumber: facilityNo,
      name: facilityName.trim(),
      facilityType,
      lenderOrGroupName: lenderName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      principalAmount: principal,
      interestRatePercentage: interest,
      totalRepayableAmount: totalRepayableCalc,
      totalRepaid: 0,
      balanceRemaining: totalRepayableCalc,
      disbursementDate,
      dueDate: dueDate || undefined,
      installmentAmount: instAmt,
      repaymentFrequency: repaymentFreq,
      disbursementMethod,
      disbursementRef: disbursementRef.trim() || `DISB-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Active',
      purpose: purpose.trim(),
      notes: notes.trim() || undefined,
      repayments: [],
    };

    onSaveFacility(newFacility);

    // Auto log Cash In if requested
    if (autoLogCashInOnCreate && onAddCashTransaction) {
      const cashInTx: CashTransaction = {
        id: `ct-${Date.now()}`,
        type: 'CASH_IN',
        category: facilityType === 'Chama / Merry-Go-Round' || facilityType === 'Table Banking'
          ? 'Chama / Merry-Go-Round Payout'
          : facilityType === 'SACCO Loan'
          ? 'SACCO / Microfinance Loan'
          : facilityType === 'Mobile / Merchant Float'
          ? 'Mobile / Digital Loan'
          : 'Bank Loan',
        amount: principal,
        date: new Date().toISOString(),
        sourceDestination: `${lenderName} (${facilityName})`,
        referenceNo: newFacility.disbursementRef,
        paymentMethod: disbursementMethod,
        description: `Disbursement for ${facilityName} (${facilityNo}). Purpose: ${purpose}`,
        recordedBy: currentUser.name,
        status: 'Completed',
        facilityId: newFacility.id,
      };
      onAddCashTransaction(cashInTx);
    }

    setShowAddFacilityModal(false);
    // Reset Form
    setFacilityName('');
    setPrincipalAmount('');
    setInterestPercentage('12');
    setInstallmentAmt('');
    setPurpose('Working capital & inventory restocking');
    setNotes('');
  };

  // Handle Repayment Submit
  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityForPay) return;

    const amt = parseFloat(repayAmount);
    if (isNaN(amt) || amt <= 0) return;

    const repayment: FacilityRepayment = {
      id: `fr-${Date.now()}`,
      facilityId: selectedFacilityForPay.id,
      amount: amt,
      date: new Date().toISOString(),
      paymentMethod: repayMethod,
      referenceNo: repayRef.trim() || `EFT-REP-${Math.floor(1000 + Math.random() * 9000)}`,
      recordedBy: currentUser.name,
      notes: repayNotes.trim() || undefined,
    };

    onRecordRepayment(selectedFacilityForPay.id, repayment, autoLogCashOut);

    // If auto log Cash Out
    if (autoLogCashOut && onAddCashTransaction) {
      const outCat = selectedFacilityForPay.facilityType === 'Chama / Merry-Go-Round' || selectedFacilityForPay.facilityType === 'Table Banking'
        ? 'Chama Contribution / Table Banking'
        : selectedFacilityForPay.facilityType === 'Mobile / Merchant Float'
        ? 'Mobile Loan Repayment'
        : 'Bank / SACCO Loan Repayment';

      const cashOutTx: CashTransaction = {
        id: `ct-${Date.now()}`,
        type: 'CASH_OUT',
        category: outCat,
        amount: amt,
        date: new Date().toISOString(),
        sourceDestination: `${selectedFacilityForPay.lenderOrGroupName} (${selectedFacilityForPay.name})`,
        referenceNo: repayment.referenceNo,
        paymentMethod: repayMethod,
        description: `Loan/Chama Repayment for ${selectedFacilityForPay.name} (${selectedFacilityForPay.facilityNumber}). ${repayNotes}`,
        recordedBy: currentUser.name,
        status: 'Completed',
        facilityId: selectedFacilityForPay.id,
      };
      onAddCashTransaction(cashOutTx);
    }

    setSelectedFacilityForPay(null);
    setRepayAmount('');
    setRepayNotes('');
  };

  // Handle Top-Up / Disburse Additional Funds
  const handleDisburseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityForDisburse) return;

    const amt = parseFloat(disburseAmount);
    if (isNaN(amt) || amt <= 0) return;

    const ref = disburseRefInput.trim() || `TOPUP-${Math.floor(1000 + Math.random() * 9000)}`;
    onDisburseFunds(selectedFacilityForDisburse.id, amt, ref, true);

    if (onAddCashTransaction) {
      const cashInTx: CashTransaction = {
        id: `ct-${Date.now()}`,
        type: 'CASH_IN',
        category: selectedFacilityForDisburse.facilityType === 'Chama / Merry-Go-Round' || selectedFacilityForDisburse.facilityType === 'Table Banking'
          ? 'Chama / Merry-Go-Round Payout'
          : selectedFacilityForDisburse.facilityType === 'SACCO Loan'
          ? 'SACCO / Microfinance Loan'
          : selectedFacilityForDisburse.facilityType === 'Mobile / Merchant Float'
          ? 'Mobile / Digital Loan'
          : 'Bank Loan',
        amount: amt,
        date: new Date().toISOString(),
        sourceDestination: `${selectedFacilityForDisburse.lenderOrGroupName} (${selectedFacilityForDisburse.name})`,
        referenceNo: ref,
        paymentMethod: 'bank_transfer',
        description: `Additional funding disbursement for ${selectedFacilityForDisburse.name}. ${disburseNotes}`,
        recordedBy: currentUser.name,
        status: 'Completed',
        facilityId: selectedFacilityForDisburse.id,
      };
      onAddCashTransaction(cashInTx);
    }

    setSelectedFacilityForDisburse(null);
    setDisburseAmount('');
    setDisburseNotes('');
  };

  // Preset loader helper for New Facility Modal
  const loadFacilityPreset = (type: 'KCB' | 'EQUITY' | 'CHAMA' | 'SACCO' | 'MSHWARI') => {
    if (type === 'KCB') {
      setFacilityType('Bank Loan');
      setFacilityName('KCB SME Working Capital Term Loan');
      setLenderName('KCB Bank Kenya Ltd');
      setInterestPercentage('13');
      setPrincipalAmount('500000');
      setInstallmentAmt('24500');
      setRepaymentFreq('Monthly');
      setPurpose('Boutique & electronics inventory expansion');
      setDisbursementMethod('bank_transfer');
    } else if (type === 'EQUITY') {
      setFacilityType('Bank Loan');
      setFacilityName('Equity Bank EazzyBiz Growth Facility');
      setLenderName('Equity Bank Kenya Ltd');
      setInterestPercentage('12.5');
      setPrincipalAmount('350000');
      setInstallmentAmt('18000');
      setRepaymentFreq('Monthly');
      setPurpose('Supplier wholesale bulk procurement');
      setDisbursementMethod('bank_transfer');
    } else if (type === 'CHAMA') {
      setFacilityType('Chama / Merry-Go-Round');
      setFacilityName('Ushirika Traders Chama Table Banking Pool');
      setLenderName('Ushirika Traders Investment Group');
      setInterestPercentage('5');
      setPrincipalAmount('200000');
      setInstallmentAmt('35000');
      setRepaymentFreq('Monthly');
      setPurpose('Merry-go-round lump sum payout for bulk imports');
      setDisbursementMethod('mpesa');
    } else if (type === 'SACCO') {
      setFacilityType('SACCO Loan');
      setFacilityName('Stima SACCO Business Development Loan');
      setLenderName('Stima DT SACCO Society');
      setInterestPercentage('10');
      setPrincipalAmount('300000');
      setInstallmentAmt('27500');
      setRepaymentFreq('Monthly');
      setPurpose('Retail showroom fixtures and high-end soundbars');
      setDisbursementMethod('bank_transfer');
    } else if (type === 'MSHWARI') {
      setFacilityType('Mobile / Merchant Float');
      setFacilityName('Lipa Na M-Pesa Merchant Business Float');
      setLenderName('Safaricom / NCBA Merchant Credit');
      setInterestPercentage('8');
      setPrincipalAmount('80000');
      setInstallmentAmt('86400');
      setRepaymentFreq('Lump Sum');
      setPurpose('Weekend emergency stock purchase float');
      setDisbursementMethod('mpesa');
    }
  };

  const getFacilityIcon = (type: FacilityType) => {
    switch (type) {
      case 'Bank Loan':
        return <Landmark className="w-5 h-5 text-sky-400" />;
      case 'Chama / Merry-Go-Round':
      case 'Table Banking':
        return <Users className="w-5 h-5 text-amber-400" />;
      case 'SACCO Loan':
        return <Building2 className="w-5 h-5 text-emerald-400" />;
      case 'Mobile / Merchant Float':
        return <Smartphone className="w-5 h-5 text-purple-400" />;
      default:
        return <DollarSign className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* SUMMARY STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Outstanding Remaining Debt</span>
            <div className="p-2 bg-rose-950/80 border border-rose-800/80 text-rose-400 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-400 font-mono tracking-tight">
            KSh {totalOutstandingRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {activeCount} Active Debt Facilities Remaining
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Total Capital Disbursed</span>
            <div className="p-2 bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 rounded-xl">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
            KSh {totalPrincipalBorrowed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Principal Received into Business Vault
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Total Repaid to Date</span>
            <div className="p-2 bg-sky-950/80 border border-sky-800/80 text-sky-400 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-400 font-mono tracking-tight">
            KSh {totalRepaidSoFar.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {totalRepayable > 0 ? ((totalRepaidSoFar / totalRepayable) * 100).toFixed(1) : 0}% of Total Repayable Cleared
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Financing Registry</span>
              <div className="p-2 bg-amber-950/80 border border-amber-800/80 text-amber-400 rounded-xl">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-100 font-mono mt-1">
              {facilities.length} Total Facilities
            </div>
          </div>
          <button
            onClick={() => {
              setDisbursementRef(`DISB-${Math.floor(1000 + Math.random() * 9000)}`);
              setShowAddFacilityModal(true);
            }}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Loan or Chama</span>
          </button>
        </div>
      </div>

      {/* SEARCH, FILTER & PRESETS BAR */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search bank name, chama group, facility ID, contact person..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Facility Types</option>
            <option value="Bank Loan">Bank Loans</option>
            <option value="Chama / Merry-Go-Round">Chamas / Table Banking</option>
            <option value="SACCO Loan">SACCO Loans</option>
            <option value="Mobile / Merchant Float">Mobile / Digital Floats</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({facilities.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                statusFilter === 'ACTIVE' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('CLEARED')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                statusFilter === 'CLEARED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Cleared ({facilities.filter((f) => (f.balanceRemaining || 0) <= 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* FACILITIES GRID LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredFacilities.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center text-slate-500 space-y-3">
            <Landmark className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-slate-400">No bank loans or chama facilities match your search criteria.</p>
            <button
              onClick={() => {
                setShowAddFacilityModal(true);
              }}
              className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition"
            >
              <Plus className="w-4 h-4" /> Register First Loan or Chama
            </button>
          </div>
        ) : (
          filteredFacilities.map((fac) => {
            const isCleared = (fac.balanceRemaining || 0) <= 0;
            const progressPercent = fac.totalRepayableAmount > 0
              ? Math.min(100, Math.round(((fac.totalRepaid || 0) / fac.totalRepayableAmount) * 100))
              : 100;

            return (
              <div
                key={fac.id}
                className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl shrink-0">
                        {getFacilityIcon(fac.facilityType)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-100 leading-snug">{fac.name}</h4>
                        <p className="text-xs text-slate-400 font-medium">{fac.lenderOrGroupName}</p>
                      </div>
                    </div>

                    {isCleared ? (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Fully Cleared
                      </span>
                    ) : (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0">
                        Active Debt
                      </span>
                    )}
                  </div>

                  {/* Financial Breakdown Box */}
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Principal Disbursed:</span>
                      <strong className="text-slate-200">KSh {fac.principalAmount.toLocaleString()}</strong>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>Interest / Surcharge:</span>
                      <span className="text-amber-400 font-bold">{fac.interestRatePercentage || 0}% ({fac.repaymentFrequency || 'Monthly'})</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>Total Repayable:</span>
                      <strong className="text-slate-200">KSh {fac.totalRepayableAmount.toLocaleString()}</strong>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400 uppercase text-[10px] font-sans font-bold">Remaining Balance:</span>
                      <span className={`text-base font-black ${isCleared ? 'text-emerald-400' : 'text-rose-400'}`}>
                        KSh {(fac.balanceRemaining || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Repaid: KSh {(fac.totalRepaid || 0).toLocaleString()}</span>
                        <span className="font-bold text-sky-400">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${isCleared ? 'bg-emerald-500' : 'bg-sky-500'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact & Terms Info */}
                  <div className="text-[11px] text-slate-400 space-y-1">
                    {fac.installmentAmount && (
                      <div className="flex justify-between">
                        <span>Scheduled Installment:</span>
                        <span className="text-slate-300 font-bold font-mono">KSh {fac.installmentAmount.toLocaleString()} / {fac.repaymentFrequency}</span>
                      </div>
                    )}
                    {fac.contactPerson && (
                      <div className="flex justify-between">
                        <span>Contact:</span>
                        <span className="text-slate-300">{fac.contactPerson} {fac.contactPhone ? `(${fac.contactPhone})` : ''}</span>
                      </div>
                    )}
                    {fac.dueDate && (
                      <div className="flex justify-between">
                        <span>Maturity / Due Date:</span>
                        <span className="text-amber-400 font-mono">{fac.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  {!isCleared && (
                    <button
                      onClick={() => {
                        setSelectedFacilityForPay(fac);
                        setRepayAmount(fac.installmentAmount ? fac.installmentAmount.toString() : (fac.balanceRemaining || 0).toString());
                        setRepayRef(`EFT-${Math.floor(1000 + Math.random() * 9000)}`);
                        setRepayNotes(`Repayment for ${fac.name}`);
                      }}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1 shadow-lg shadow-rose-600/20"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Record Repayment</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedFacilityForStatement(fac);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs transition flex items-center gap-1"
                    title="View Statement & Payment History"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Statement</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedFacilityForDisburse(fac);
                      setDisburseRefInput(`TOPUP-${Math.floor(1000 + Math.random() * 9000)}`);
                      setDisburseAmount('');
                    }}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-xl transition border border-transparent hover:border-slate-700"
                    title="Disburse Additional Funds / Top-Up (Cash In)"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: ADD NEW LOAN / CHAMA FACILITY */}
      {/* ========================================================= */}
      {showAddFacilityModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-950 text-sky-400 border border-sky-800 rounded-2xl">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Register Bank Loan, Chama or Financing Facility</h3>
                  <p className="text-xs text-slate-400">Track loans, chama merry-go-round payouts, SACCO & merchant credit facilities</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddFacilityModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                ⚡ Quick Kenyan Financing Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadFacilityPreset('KCB')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1"
                >
                  🏦 KCB SME Term Loan
                </button>
                <button
                  type="button"
                  onClick={() => loadFacilityPreset('CHAMA')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1"
                >
                  🤝 Chama Merry-Go-Round
                </button>
                <button
                  type="button"
                  onClick={() => loadFacilityPreset('SACCO')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1"
                >
                  🏛️ Stima SACCO Micro-Loan
                </button>
                <button
                  type="button"
                  onClick={() => loadFacilityPreset('MSHWARI')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1"
                >
                  📱 M-Pesa Merchant Float
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateFacility} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Facility Type *</label>
                  <select
                    value={facilityType}
                    onChange={(e) => setFacilityType(e.target.value as FacilityType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Bank Loan">Bank Loan (KCB, Equity, Co-op, Stanbic)</option>
                    <option value="Chama / Merry-Go-Round">Chama / Merry-Go-Round Payout</option>
                    <option value="SACCO Loan">SACCO / Microfinance Facility</option>
                    <option value="Mobile / Merchant Float">Mobile / Digital Merchant Credit (M-Shwari, Fuliza)</option>
                    <option value="Table Banking">Table Banking Loan</option>
                    <option value="Other Financing">Other Financing Source</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Facility / Account Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KCB SME Working Capital Loan"
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Lender / Chama Group Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KCB Bank Kenya Ltd / Ushirika Chama"
                    value={lenderName}
                    onChange={(e) => setLenderName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Contact Officer / Treasurer</label>
                  <input
                    type="text"
                    placeholder="e.g. Dennis Mutua / Mama Beatrice"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +254 722 000 111"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-slate-300 mb-1">Principal Disbursed (KSh) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 500000"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Total Interest / Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 13"
                    value={interestPercentage}
                    onChange={(e) => setInterestPercentage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold text-base focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Repayment Frequency</label>
                  <select
                    value={repaymentFreq}
                    onChange={(e) => setRepaymentFreq(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Monthly">Monthly Installments</option>
                    <option value="Weekly">Weekly Installments</option>
                    <option value="Bi-Weekly">Bi-Weekly Installments</option>
                    <option value="Daily">Daily Installments</option>
                    <option value="Lump Sum">Lump Sum at Maturity</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Due / Maturity Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Monthly/Periodic Installment (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 24500"
                    value={installmentAmt}
                    onChange={(e) => setInstallmentAmt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Disbursement Method</label>
                  <select
                    value={disbursementMethod}
                    onChange={(e) => setDisbursementMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 capitalize"
                  >
                    <option value="bank_transfer">Bank Transfer / EFT</option>
                    <option value="mpesa">M-Pesa Mobile Till</option>
                    <option value="cash">Cash Vault Drawer</option>
                    <option value="cheque">Bank Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Disbursement Ref / Slip No</label>
                  <input
                    type="text"
                    placeholder="e.g. EFT-KCB-88019"
                    value={disbursementRef}
                    onChange={(e) => setDisbursementRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Financing Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Stock expansion for boutique fashion and smart TVs"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoLogCashIn"
                  checked={autoLogCashInOnCreate}
                  onChange={(e) => setAutoLogCashInOnCreate(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-700"
                />
                <label htmlFor="autoLogCashIn" className="text-xs text-emerald-300 font-bold cursor-pointer">
                  Automatically record this disbursement as +CASH IN in the Cashflow Ledger
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFacilityModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-2.5 rounded-xl transition shadow-lg shadow-sky-600/20"
                >
                  Save Financing Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RECORD REPAYMENT / CHAMA SHARE (CASH OUT) */}
      {/* ========================================================= */}
      {selectedFacilityForPay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-950 text-rose-400 border border-rose-800 rounded-2xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Record Loan / Chama Repayment</h3>
                  <p className="text-xs text-slate-400">{selectedFacilityForPay.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFacilityForPay(null)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-xs flex justify-between items-center">
              <span className="text-slate-400">Current Balance Remaining:</span>
              <strong className="text-rose-400 text-base font-black">
                KSh {(selectedFacilityForPay.balanceRemaining || 0).toLocaleString()}
              </strong>
            </div>

            <form onSubmit={handleRepaymentSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-300 mb-1">Repayment Amount (KSh) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Enter repayment amount"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-rose-400 font-mono font-bold text-base focus:outline-none focus:border-rose-500"
                />
                <div className="flex gap-2 mt-2">
                  {selectedFacilityForPay.installmentAmount && (
                    <button
                      type="button"
                      onClick={() => setRepayAmount(selectedFacilityForPay.installmentAmount!.toString())}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1 rounded-lg transition font-bold"
                    >
                      Monthly Installment (KSh {selectedFacilityForPay.installmentAmount.toLocaleString()})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRepayAmount((selectedFacilityForPay.balanceRemaining || 0).toString())}
                    className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-1 rounded-lg hover:bg-rose-900 transition font-bold"
                  >
                    Clear Full Remaining Balance
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={repayMethod}
                    onChange={(e) => setRepayMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 capitalize"
                  >
                    <option value="bank_transfer">Bank Transfer / EFT</option>
                    <option value="mpesa">M-Pesa Mobile Till</option>
                    <option value="cash">Cash Vault Drawer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Receipt / Voucher Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. EFT-REP-9921"
                    value={repayRef}
                    onChange={(e) => setRepayRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. August monthly installment standing order or chama table share"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoLogCashOut"
                  checked={autoLogCashOut}
                  onChange={(e) => setAutoLogCashOut(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-950 border-slate-700"
                />
                <label htmlFor="autoLogCashOut" className="text-xs text-rose-300 font-bold cursor-pointer">
                  Automatically record this repayment as -CASH OUT in the Cashflow Ledger
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFacilityForPay(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2.5 rounded-xl transition shadow-lg shadow-rose-600/20"
                >
                  Confirm Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: TOP UP / DISBURSE ADDITIONAL FUNDS (CASH IN) */}
      {/* ========================================================= */}
      {selectedFacilityForDisburse && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-2xl">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Disburse Additional Funds (Cash In)</h3>
                  <p className="text-xs text-slate-400">{selectedFacilityForDisburse.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFacilityForDisburse(null)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisburseSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-300 mb-1">Additional Principal Amount (KSh) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Enter additional loan / chama top-up"
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-emerald-400 font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Disbursement Ref No</label>
                <input
                  type="text"
                  placeholder="e.g. TOPUP-KCB-991"
                  value={disburseRefInput}
                  onChange={(e) => setDisburseRefInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Supplemental loan tranche released for inventory stocking"
                  value={disburseNotes}
                  onChange={(e) => setDisburseNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFacilityForDisburse(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/20"
                >
                  Record Top-Up (+Cash In)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: FACILITY STATEMENT & REPAYMENT HISTORY */}
      {/* ========================================================= */}
      {selectedFacilityForStatement && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-950 text-sky-400 border border-sky-800 rounded-2xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">{selectedFacilityForStatement.name}</h3>
                  <p className="text-xs text-slate-400">Account Statement & Repayment Audit Trail</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFacilityForStatement(null)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Statement Header Card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-400">
                <div>
                  <span className="text-[10px] text-slate-500 block">Facility ID:</span>
                  <strong className="text-slate-200">{selectedFacilityForStatement.facilityNumber}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Lender / Chama:</span>
                  <strong className="text-slate-200">{selectedFacilityForStatement.lenderOrGroupName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Disbursed Date:</span>
                  <strong className="text-slate-200">{selectedFacilityForStatement.disbursementDate}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Remaining Due:</span>
                  <strong className="text-rose-400 text-sm font-black">
                    KSh {(selectedFacilityForStatement.balanceRemaining || 0).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            {/* Repayments History Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Installment Payment Ledger ({selectedFacilityForStatement.repayments?.length || 0} Records)
              </h4>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Ref No</th>
                      <th className="p-3">Method</th>
                      <th className="p-3 text-right">Amount (KSh)</th>
                      <th className="p-3">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    {(!selectedFacilityForStatement.repayments || selectedFacilityForStatement.repayments.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No repayment records have been posted to this facility yet.
                        </td>
                      </tr>
                    ) : (
                      selectedFacilityForStatement.repayments.map((rep) => (
                        <tr key={rep.id} className="hover:bg-slate-900/60 transition font-mono">
                          <td className="p-3 text-slate-300 text-[11px]">
                            {new Date(rep.date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-slate-400">{rep.referenceNo}</td>
                          <td className="p-3 capitalize text-slate-300">{rep.paymentMethod.replace('_', ' ')}</td>
                          <td className="p-3 text-right font-extrabold text-emerald-400">
                            KSh {rep.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-slate-400 font-sans">{rep.recordedBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Loan Statement
              </button>
              <button
                onClick={() => setSelectedFacilityForStatement(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
