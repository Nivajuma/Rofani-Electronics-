import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  GitBranch,
  BarChart3,
  AlertTriangle,
  Users,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Plus,
  RefreshCw,
  ArrowRightLeft,
  Check,
  Sparkles,
  MapPin,
  Store,
  TrendingUp,
  Lock,
} from 'lucide-react';
import { StoreSubscriptionProfile, User, Product, Transaction, Expense } from '../../types';
import {
  MultiBranchCombinedReport,
  fetchMultiBranchCombinedAnalytics,
} from '../../lib/cloudSync';
import {
  EXTRA_BRANCH_ANNUAL_PRICE,
  EXTRA_BRANCH_MONTHLY_PRICE,
  PRIMARY_BRANCH_ANNUAL_PRICE,
  PRIMARY_BRANCH_MONTHLY_PRICE,
  calculateOwnerBundlePricing,
  getBranchDaysRemaining,
  getEffectiveBranchStatus,
  getOwnerMaxAllowedBranches,
  isBranchLicenseUnlocked,
  resolveIsPrimaryBranch,
} from '../../utils/branchLicensing';
import { SUPPORT_WHATSAPP_NUMBER } from '../../utils/supportConfig';

interface MultiBranchUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryStoreId: string;
  activeBranchStoreId: string;
  primaryProfile: StoreSubscriptionProfile | null;
  groupBranches: StoreSubscriptionProfile[];
  activeStoreName: string;
  allUsers: User[];
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
  salaryPayouts?: any[];
  commissionPayouts?: any[];
  onUpgradeToMultiBranch: (businessGroupName: string) => Promise<void>;
  onCreateBranch: (branch: {
    branchName: string;
    branchCode?: string;
    branchCity?: string;
    branchAddress?: string;
    branchPhone?: string;
    branchManagerName?: string;
  }) => Promise<StoreSubscriptionProfile | void>;
  onSwitchBranch: (targetStoreId: string) => Promise<void> | void;
  onSyncCrossBranchStaff: (user: User, targetBranchIds: string[]) => Promise<void>;
  onOpenPlansPricing?: (targetBranch?: StoreSubscriptionProfile) => void;
  isOwnerAccount?: boolean;
}

type HubTab = 'branches' | 'report' | 'staff';

export const MultiBranchUpgradeModal: React.FC<MultiBranchUpgradeModalProps> = ({
  isOpen,
  onClose,
  primaryStoreId,
  activeBranchStoreId,
  primaryProfile,
  groupBranches,
  activeStoreName,
  allUsers,
  products,
  transactions,
  expenses,
  salaryPayouts = [],
  commissionPayouts = [],
  onUpgradeToMultiBranch,
  onCreateBranch,
  onSwitchBranch,
  onSyncCrossBranchStaff,
  onOpenPlansPricing,
  isOwnerAccount = false,
}) => {
  const isUpgraded = Boolean(primaryProfile?.isMultiBranch || groupBranches.length > 1);

  const [businessGroupName, setBusinessGroupName] = useState<string>(
    primaryProfile?.businessGroupName || activeStoreName || ''
  );
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<HubTab>('branches');

  // Add Branch form state
  const [showAddBranchForm, setShowAddBranchForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState(primaryProfile?.phone || '');
  const [newBranchManager, setNewBranchManager] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [pendingLicenseBranch, setPendingLicenseBranch] = useState<StoreSubscriptionProfile | null>(null);

  // Combined Report state
  const [report, setReport] = useState<MultiBranchCombinedReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Cross-branch staff saving state
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUpgradeError(null);
      setBranchError(null);
      setStatusNotice(null);
      setPendingLicenseBranch(null);
      setBusinessGroupName(
        primaryProfile?.businessGroupName ||
          (activeStoreName && activeStoreName !== 'Rofani POS' ? `${activeStoreName} Group` : activeStoreName || 'My Business Group')
      );
      if (!newBranchPhone && primaryProfile?.phone) {
        setNewBranchPhone(primaryProfile.phone);
      }
    }
  }, [isOpen, primaryProfile?.businessGroupName, primaryProfile?.phone, activeStoreName]);

  const loadCombinedReport = async () => {
    const branchesToAnalyze =
      groupBranches.length > 0
        ? groupBranches
        : primaryProfile
        ? [primaryProfile]
        : [];
    if (branchesToAnalyze.length === 0) return;

    setIsLoadingReport(true);
    try {
      const res = await fetchMultiBranchCombinedAnalytics(branchesToAnalyze, activeBranchStoreId, {
        products,
        transactions,
        expenses,
        users: allUsers,
        salaryPayouts,
        commissionPayouts,
      });
      setReport(res);
    } catch {
      // Non-fatal
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    if (isOpen && isUpgraded && activeTab === 'report') {
      loadCombinedReport();
    }
  }, [isOpen, isUpgraded, activeTab, groupBranches.length, activeBranchStoreId]);

  if (!isOpen) return null;

  const notify = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice((curr) => (curr === msg ? null : curr)), 4000);
  };

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = businessGroupName.trim();
    if (!clean) {
      setUpgradeError('Please enter the name of the whole business.');
      return;
    }
    setIsUpgrading(true);
    setUpgradeError(null);
    try {
      await onUpgradeToMultiBranch(clean);
      notify(`"${clean}" upgraded to Multi-Branch! Your current shop is now Branch #1.`);
      setShowAddBranchForm(true);
    } catch (err: any) {
      setUpgradeError(err?.message || 'Could not upgrade to Multi-Branch. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleAddBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      setBranchError('Enter the branch shop name (e.g. Westlands Branch).');
      return;
    }
    setIsCreatingBranch(true);
    setBranchError(null);
    try {
      const created = await onCreateBranch({
        branchName: newBranchName.trim(),
        branchCode: newBranchCode.trim() || undefined,
        branchCity: newBranchCity.trim() || 'Nairobi',
        branchAddress: newBranchAddress.trim() || undefined,
        branchPhone: newBranchPhone.trim() || undefined,
        branchManagerName: newBranchManager.trim() || undefined,
      });
      const createdName = newBranchName.trim();
      setNewBranchName('');
      setNewBranchCode('');
      setNewBranchCity('');
      setNewBranchAddress('');
      setNewBranchManager('');
      setShowAddBranchForm(false);
      if (created && !isOwnerAccount && (created.licensePendingActivation || !isBranchLicenseUnlocked(created, false))) {
        setPendingLicenseBranch(created);
        notify(`Branch "${createdName}" created! Activate its KSh ${EXTRA_BRANCH_MONTHLY_PRICE}/mo license to unlock POS checkout.`);
      } else {
        notify(`Branch "${createdName}" created with isolated stock & records!`);
      }
    } catch (err: any) {
      setBranchError(err?.message || 'Failed to create branch. Please try again.');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleToggleUserBranch = async (user: User, branchId: string) => {
    const currentAssigned =
      user.assignedBranchIds && user.assignedBranchIds.length > 0
        ? user.assignedBranchIds
        : [primaryStoreId];
    const hasBranch = currentAssigned.includes(branchId);
    const nextAssigned = hasBranch
      ? currentAssigned.filter((id) => id !== branchId)
      : [...currentAssigned, branchId];

    if (nextAssigned.length === 0) {
      notify('Each worker must remain assigned to at least 1 branch.');
      return;
    }

    setSavingStaffId(user.id);
    try {
      await onSyncCrossBranchStaff(user, nextAssigned);
      notify(`Updated branch access for ${user.name}.`);
    } finally {
      setSavingStaffId(null);
    }
  };

  const benefits = [
    {
      icon: ArrowRightLeft,
      color: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
      text: 'Switch branches inside the app while each branch keeps its own stock and records.',
    },
    {
      icon: BarChart3,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      text: 'One combined report across every branch (sales, expenses, wages, and profit branch by branch).',
    },
    {
      icon: AlertTriangle,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      text: 'Highlight any branch whose performance or stock variance is out of line with the rest.',
    },
    {
      icon: Users,
      color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
      text: 'Assign one employee/attendant to work across multiple branches.',
    },
    {
      icon: Smartphone,
      color: 'text-teal-400 bg-teal-500/15 border-teal-500/30',
      text: `Primary shop KSh ${PRIMARY_BRANCH_MONTHLY_PRICE}/mo (KSh ${PRIMARY_BRANCH_ANNUAL_PRICE.toLocaleString()}/yr); each additional branch only KSh ${EXTRA_BRANCH_MONTHLY_PRICE}/mo (KSh ${EXTRA_BRANCH_ANNUAL_PRICE.toLocaleString()}/yr — 50% off).`,
    },
  ];

  const resolvedBranches =
    groupBranches.length > 0
      ? groupBranches
      : primaryProfile
      ? [primaryProfile]
      : [];

  const activeBranchesCount = resolvedBranches.filter((b) => isBranchLicenseUnlocked(b, isOwnerAccount)).length;
  const maxAllowedBranches = getOwnerMaxAllowedBranches(resolvedBranches, primaryProfile);
  const bundlePricing = calculateOwnerBundlePricing(resolvedBranches.length);
  const willRequireLicense = !isOwnerAccount && activeBranchesCount >= maxAllowedBranches;

  const waApprovalUrl = pendingLicenseBranch
    ? `https://wa.me/${SUPPORT_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Hello Rofani POS, I created branch "${pendingLicenseBranch.storeName}" (${pendingLicenseBranch.id}) under ${
          primaryProfile?.businessGroupName || activeStoreName
        } and want to activate the KSh ${EXTRA_BRANCH_MONTHLY_PRICE}/mo extra branch license.`
      )}`
    : '';

  return (
    <div className="fixed inset-0 z-[220] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/35 text-sky-400 flex items-center justify-center shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
                {isUpgraded
                  ? primaryProfile?.businessGroupName || 'Multi-Branch Business Group'
                  : 'Run more than one shop?'}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {isUpgraded
                  ? `${activeBranchesCount} / ${resolvedBranches.length} Active • Max slots: ${maxAllowedBranches} • Independent per-branch licensing`
                  : `Branch #1: KSh ${PRIMARY_BRANCH_MONTHLY_PRICE}/mo • Extra Branches: KSh ${EXTRA_BRANCH_MONTHLY_PRICE}/mo (50% off)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Multi-Branch modal"
            className="w-9 h-9 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusNotice && (
          <div className="mx-4 sm:mx-6 mt-3 px-3.5 py-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!isUpgraded ? (
            /* PRE-UPGRADE ONBOARDING FLOW */
            <form onSubmit={handleUpgradeSubmit} className="space-y-5">
              {/* Transparent Multi-Branch Pricing Banner */}
              <div className="bg-sky-950/40 border border-sky-500/35 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-extrabold text-white">Transparent Multi-Branch Pricing</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/35 text-[10px] font-extrabold text-emerald-300 uppercase">
                    50% Off Branch #2+
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-2.5">
                    <div className="text-slate-400 font-semibold">Primary Shop (Branch #1)</div>
                    <div className="font-extrabold text-white mt-0.5">
                      KSh {PRIMARY_BRANCH_MONTHLY_PRICE}/mo · KSh {PRIMARY_BRANCH_ANNUAL_PRICE.toLocaleString()}/yr
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-emerald-500/40 rounded-xl p-2.5">
                    <div className="text-emerald-300 font-semibold">Each Extra Branch (Branch #2+)</div>
                    <div className="font-extrabold text-white mt-0.5">
                      KSh {EXTRA_BRANCH_MONTHLY_PRICE}/mo · KSh {EXTRA_BRANCH_ANNUAL_PRICE.toLocaleString()}/yr
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Multi-Branch Business Group Benefits</span>
                </div>
                <div className="space-y-2.5">
                  {benefits.map((b, idx) => {
                    const Icon = b.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-700/60"
                      >
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${b.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed pt-0.5">
                          {b.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reassurance Callout Box */}
              <div className="p-4 rounded-2xl bg-emerald-950/35 border border-emerald-500/40 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-100 leading-relaxed">
                  <span className="font-bold text-emerald-300 block mb-0.5">Zero Disruption Guarantee</span>
                  Your current shop does not change — products, sales, staff, and paid subscription days stay
                  exactly as they are. It becomes your first branch.
                </div>
              </div>

              {/* Parent Business Group Name Input */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
                <label
                  htmlFor="business-group-name-input"
                  className="block text-xs font-bold text-slate-200"
                >
                  Name of the whole business *
                </label>
                <p className="text-[11px] text-slate-400">
                  This is your parent business group name. Your current shop keeps its branch name ({activeStoreName}) as Branch #1.
                </p>
                <input
                  id="business-group-name-input"
                  type="text"
                  required
                  value={businessGroupName}
                  onChange={(e) => setBusinessGroupName(e.target.value)}
                  placeholder="e.g. Rofani Enterprises Group"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />

                {upgradeError && (
                  <p className="text-xs text-rose-400 font-semibold pt-1">{upgradeError}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Maybe Later
                </button>
                <button
                  type="submit"
                  disabled={isUpgrading}
                  className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition cursor-pointer"
                >
                  {isUpgrading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <GitBranch className="w-4 h-4" />
                  )}
                  <span>{isUpgrading ? 'Upgrading Group...' : 'Upgrade to Multi-Branch'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* UPGRADED MULTI-BRANCH HUB */
            <div className="space-y-4">
              {/* Sub-navigation Tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-700/70">
                <button
                  type="button"
                  onClick={() => setActiveTab('branches')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'branches'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Branches ({resolvedBranches.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'report'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Combined Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('staff')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'staff'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Staff Access</span>
                </button>
              </div>

              {/* Per-Branch Licensing & Pricing Strip */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-white">
                      Per-Branch Licensing ({activeBranchesCount}/{maxAllowedBranches} Licensed)
                    </span>
                    <span className="text-slate-400 block text-[11px]">
                      Branch #1: KSh {PRIMARY_BRANCH_MONTHLY_PRICE}/mo • Extra Branch #2+: KSh {EXTRA_BRANCH_MONTHLY_PRICE}/mo (50% off) · Group Est: KSh {bundlePricing.monthlyTotal.toLocaleString()}/mo
                    </span>
                  </div>
                </div>
                {onOpenPlansPricing && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPlansPricing();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold transition cursor-pointer"
                  >
                    Plans &amp; Pricing
                  </button>
                )}
              </div>

              {/* Activate Branch License Prompt (Triggered when new branch exceeds maxAllowedBranches) */}
              {pendingLicenseBranch && (
                <div className="bg-amber-950/45 border border-amber-500/50 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-white text-sm">
                          Activate Branch License (KSh {EXTRA_BRANCH_MONTHLY_PRICE}/mo)
                        </h4>
                        <p className="text-[11px] text-amber-100/85 mt-0.5 leading-relaxed">
                          <strong className="text-white">{pendingLicenseBranch.storeName}</strong> was created with isolated storage, and your plan currently includes{' '}
                          <strong className="text-white">{maxAllowedBranches}</strong> licensed branch slot{maxAllowedBranches === 1 ? '' : 's'}. Activate this branch via M-Pesa (Till <strong className="font-mono text-white">1833804</strong>) at KSh {EXTRA_BRANCH_MONTHLY_PRICE}/mo or KSh {EXTRA_BRANCH_ANNUAL_PRICE.toLocaleString()}/yr (50% off), or request Super Admin approval before unlocking live POS checkout.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingLicenseBranch(null)}
                      className="p-1 rounded-lg text-amber-200/70 hover:text-white cursor-pointer"
                      aria-label="Dismiss prompt"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {onOpenPlansPricing && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = pendingLicenseBranch;
                          setPendingLicenseBranch(null);
                          onClose();
                          onOpenPlansPricing(target);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Pay KSh {EXTRA_BRANCH_MONTHLY_PRICE}/mo via M-Pesa (Till 1833804)</span>
                      </button>
                    )}
                    <a
                      href={waApprovalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <span>Request Super Admin Approval</span>
                    </a>
                  </div>
                </div>
              )}

              {/* TAB 1: BRANCHES & SWITCHER */}
              {activeTab === 'branches' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">Your Business Branches</h3>
                      <p className="text-[11px] text-slate-400">
                        Switch branch anytime — each branch isolates stock, sales, and cash records under its own store workspace.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddBranchForm((prev) => !prev)}
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Branch</span>
                    </button>
                  </div>

                  {/* Add New Branch Form */}
                  {showAddBranchForm && (
                    <form
                      onSubmit={handleAddBranchSubmit}
                      className="bg-slate-800 border border-sky-500/40 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-sky-300">
                          Create New Branch Shop {willRequireLicense ? `(Requires KSh ${EXTRA_BRANCH_MONTHLY_PRICE}/mo License)` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddBranchForm(false)}
                          className="text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      {willRequireLicense && (
                        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/35 text-[11px] text-amber-200">
                          Active branches ({activeBranchesCount}) have reached your allowed branch limit ({maxAllowedBranches}). After creating this branch, pay <strong>KSh {EXTRA_BRANCH_MONTHLY_PRICE}/mo</strong> via Till <strong>1833804</strong> (or get Super Admin approval) to unlock live checkout.
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Branch Shop Name *</label>
                          <input
                            type="text"
                            required
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            placeholder="e.g. Westlands Branch"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Branch Code</label>
                          <input
                            type="text"
                            value={newBranchCode}
                            onChange={(e) => setNewBranchCode(e.target.value)}
                            placeholder="e.g. BR-02"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">City / Town</label>
                          <input
                            type="text"
                            value={newBranchCity}
                            onChange={(e) => setNewBranchCity(e.target.value)}
                            placeholder="e.g. Nairobi"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Branch Phone</label>
                          <input
                            type="text"
                            value={newBranchPhone}
                            onChange={(e) => setNewBranchPhone(e.target.value)}
                            placeholder="+254 7XX XXX XXX"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Street / Building Address</label>
                          <input
                            type="text"
                            value={newBranchAddress}
                            onChange={(e) => setNewBranchAddress(e.target.value)}
                            placeholder="e.g. Sarit Ground Floor"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Branch Manager / Lead</label>
                          <input
                            type="text"
                            value={newBranchManager}
                            onChange={(e) => setNewBranchManager(e.target.value)}
                            placeholder="e.g. Grace Makasi"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                      {branchError && (
                        <p className="text-xs text-rose-400 font-semibold">{branchError}</p>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isCreatingBranch}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                        >
                          {isCreatingBranch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{isCreatingBranch ? 'Creating Branch...' : 'Create Isolated Branch'}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Branch Cards List */}
                  <div className="space-y-2.5">
                    {resolvedBranches.map((branch, idx) => {
                      const isActive = branch.id === activeBranchStoreId;
                      const isFirst = resolveIsPrimaryBranch(branch, primaryStoreId) && (idx === 0 || branch.id === primaryStoreId);
                      const branchStatus = getEffectiveBranchStatus(branch, isOwnerAccount);
                      const daysLeft = getBranchDaysRemaining(branch);
                      const unlocked = isBranchLicenseUnlocked(branch, isOwnerAccount);
                      const statusBadgeClass =
                        branchStatus === 'active'
                          ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                          : branchStatus === 'trial'
                          ? 'bg-sky-500/15 border-sky-500/35 text-sky-300'
                          : branchStatus === 'suspended'
                          ? 'bg-rose-500/20 border-rose-500/45 text-rose-300'
                          : 'bg-amber-500/15 border-amber-500/35 text-amber-300';

                      return (
                        <div
                          key={branch.id}
                          className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isActive
                              ? 'bg-sky-950/35 border-sky-500/60'
                              : 'bg-slate-800/80 border-slate-700/80'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                                isActive
                                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                                  : 'bg-slate-900 border-slate-700 text-slate-400'
                              }`}
                            >
                              <Store className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-white truncate">
                                  {branch.branchName || branch.storeName}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300">
                                  {branch.branchCode || (isFirst ? 'MAIN-01' : `BR-0${idx + 1}`)}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-[10px] font-bold text-slate-300">
                                  {isFirst
                                    ? `Primary · KSh ${PRIMARY_BRANCH_MONTHLY_PRICE}/mo`
                                    : `Extra · KSh ${EXTRA_BRANCH_MONTHLY_PRICE}/mo`}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${statusBadgeClass}`}>
                                  {branch.licensePendingActivation
                                    ? 'License Pending'
                                    : branchStatus === 'trial'
                                    ? `Trial (${daysLeft}d)`
                                    : branchStatus === 'active'
                                    ? isOwnerAccount
                                      ? 'Active'
                                      : `Active (${daysLeft}d)`
                                    : branchStatus}
                                </span>
                                {isActive && (
                                  <span className="px-2 py-0.5 rounded-md bg-sky-500 text-slate-950 text-[10px] font-extrabold">
                                    ACTIVE NOW
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {branch.branchCity || 'Main Location'}
                                </span>
                                {branch.phone && <span className="font-mono">{branch.phone}</span>}
                                {branch.expiresAt && !isOwnerAccount && (
                                  <span>
                                    Exp: <strong className="text-slate-300">{new Date(branch.expiresAt).toLocaleDateString()}</strong>
                                  </span>
                                )}
                                <span className="font-mono text-[10px] text-slate-500">
                                  stores/{branch.id}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {!unlocked && onOpenPlansPricing && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenPlansPricing(branch);
                                }}
                                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>
                                  {isFirst
                                    ? `Renew (KSh ${PRIMARY_BRANCH_MONTHLY_PRICE}/mo)`
                                    : `Activate License (KSh ${EXTRA_BRANCH_MONTHLY_PRICE}/mo)`}
                                </span>
                              </button>
                            )}
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-300 text-xs font-bold">
                                <Check className="w-3.5 h-3.5" />
                                Current Branch
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  await onSwitchBranch(branch.id);
                                  notify(`Switched workspace to ${branch.branchName || branch.storeName}.`);
                                }}
                                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-sky-600 border border-slate-700 hover:border-sky-500 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>Switch to Branch</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: COMBINED REPORT + OUTLIER / VARIANCE ALERTS */}
              {activeTab === 'report' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">Combined Multi-Branch Report</h3>
                      <p className="text-[11px] text-slate-400">
                        Sales, expenses, wages, profit &amp; stock variance across every branch
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={loadCombinedReport}
                      disabled={isLoadingReport}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReport ? 'animate-spin text-sky-400' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {isLoadingReport && !report ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-800/60 rounded-2xl border border-slate-700/70">
                      <RefreshCw className="w-5 h-5 animate-spin text-sky-400 mx-auto mb-2" />
                      Aggregating sales, expenses, wages &amp; stock across branches...
                    </div>
                  ) : report ? (
                    <>
                      {/* Group Totals Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3">
                          <div className="text-[10px] font-bold uppercase text-slate-400">Combined Sales</div>
                          <div className="text-sm sm:text-base font-extrabold text-white font-mono mt-1">
                            KSh {Math.round(report.totals.salesTotal).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {report.totals.transactionsCount} receipts
                          </div>
                        </div>
                        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3">
                          <div className="text-[10px] font-bold uppercase text-slate-400">Expenses + Wages</div>
                          <div className="text-sm sm:text-base font-extrabold text-amber-300 font-mono mt-1">
                            KSh {Math.round(report.totals.expensesTotal + report.totals.wagesTotal).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Wages: KSh {Math.round(report.totals.wagesTotal).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3">
                          <div className="text-[10px] font-bold uppercase text-slate-400">Combined Net Profit</div>
                          <div
                            className={`text-sm sm:text-base font-extrabold font-mono mt-1 ${
                              report.totals.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            KSh {Math.round(report.totals.netProfit).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">After COGS, expenses &amp; wages</div>
                        </div>
                        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3">
                          <div className="text-[10px] font-bold uppercase text-slate-400">Group Stock Value</div>
                          <div className="text-sm sm:text-base font-extrabold text-sky-300 font-mono mt-1">
                            KSh {Math.round(report.totals.stockValue).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {report.totals.outlierCount > 0
                              ? `${report.totals.outlierCount} outlier branch alert(s)`
                              : 'All branches aligned'}
                          </div>
                        </div>
                      </div>

                      {/* Outlier / Variance Alert Callout */}
                      {report.branches.some((b) => b.isOutlier) && (
                        <div className="bg-amber-950/35 border border-amber-500/45 rounded-2xl p-3.5 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Branches Out of Line (Performance / Stock Variance)</span>
                          </div>
                          <div className="space-y-1.5">
                            {report.branches
                              .filter((b) => b.isOutlier)
                              .map((b) => (
                                <div key={b.storeId} className="text-[11px] text-amber-100 flex items-start gap-2">
                                  <span className="font-bold text-white shrink-0">{b.branchName}:</span>
                                  <span>{b.anomalyReasons.join(' • ')}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Branch-by-Branch Comparison Cards */}
                      <div className="space-y-2.5">
                        {report.branches.map((b) => (
                          <div
                            key={b.storeId}
                            className={`p-3.5 rounded-2xl border space-y-2.5 ${
                              b.anomalySeverity === 'alert'
                                ? 'bg-rose-950/20 border-rose-500/45'
                                : b.anomalySeverity === 'warning'
                                ? 'bg-amber-950/20 border-amber-500/45'
                                : 'bg-slate-800/80 border-slate-700/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-sky-400" />
                                <span className="text-xs font-extrabold text-white">{b.branchName}</span>
                                <span className="text-[10px] font-mono text-slate-400">({b.branchCode})</span>
                              </div>
                              {b.isOutlier ? (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    b.anomalySeverity === 'alert'
                                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                      : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                  }`}
                                >
                                  Needs Attention
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-bold">
                                  On Track
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                              <div className="bg-slate-900/80 rounded-lg p-2">
                                <div className="text-slate-400 text-[10px]">Sales</div>
                                <div className="font-mono font-bold text-white">
                                  KSh {Math.round(b.salesTotal).toLocaleString()}
                                </div>
                              </div>
                              <div className="bg-slate-900/80 rounded-lg p-2">
                                <div className="text-slate-400 text-[10px]">Expenses</div>
                                <div className="font-mono font-bold text-rose-300">
                                  KSh {Math.round(b.expensesTotal).toLocaleString()}
                                </div>
                              </div>
                              <div className="bg-slate-900/80 rounded-lg p-2">
                                <div className="text-slate-400 text-[10px]">Wages</div>
                                <div className="font-mono font-bold text-amber-300">
                                  KSh {Math.round(b.wagesTotal).toLocaleString()}
                                </div>
                              </div>
                              <div className="bg-slate-900/80 rounded-lg p-2">
                                <div className="text-slate-400 text-[10px]">Net Profit</div>
                                <div
                                  className={`font-mono font-bold ${
                                    b.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  KSh {Math.round(b.netProfit).toLocaleString()}
                                </div>
                              </div>
                              <div className="bg-slate-900/80 rounded-lg p-2">
                                <div className="text-slate-400 text-[10px]">Stock Variance</div>
                                <div className="font-mono font-bold text-slate-200">
                                  {b.stockVarianceCount} items ({b.outOfStockCount} OOS)
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* TAB 3: CROSS-BRANCH STAFF ASSIGNMENT */}
              {activeTab === 'staff' && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Assign Staff Across Branches</h3>
                    <p className="text-[11px] text-slate-400">
                      Tap branches below any employee/attendant so they can log in and operate across multiple shops.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {allUsers.map((u) => {
                      const assigned =
                        u.assignedBranchIds && u.assignedBranchIds.length > 0
                          ? u.assignedBranchIds
                          : [primaryStoreId];
                      return (
                        <div
                          key={u.id}
                          className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white">{u.name}</div>
                              <div className="text-[11px] text-slate-400">
                                {u.role} • {u.email || u.phone || 'Staff Account'}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-md">
                              {assigned.length} branch{assigned.length === 1 ? '' : 'es'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {resolvedBranches.map((branch) => {
                              const checked = assigned.includes(branch.id);
                              return (
                                <button
                                  key={branch.id}
                                  type="button"
                                  disabled={savingStaffId === u.id}
                                  onClick={() => handleToggleUserBranch(u, branch.id)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                                    checked
                                      ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  <Check className={`w-3 h-3 ${checked ? 'text-sky-400' : 'opacity-25'}`} />
                                  <span>{branch.storeName}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
