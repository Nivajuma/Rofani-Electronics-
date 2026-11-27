import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Search,
  X,
  RefreshCw,
  CalendarPlus,
  Ban,
  Phone,
  Store,
  CheckCircle2,
  AlertTriangle,
  Users,
  Gift,
  Lightbulb,
  Save,
  MessageCircle,
  GitBranch,
  Check,
} from 'lucide-react';
import {
  FeatureRequest,
  FeatureRequestStatus,
  StoreSubscriptionProfile,
} from '../../types';
import {
  fetchAllStoresForSuperAdmin,
  subscribeToAllStoresForSuperAdmin,
  superAdminUpdateStoreSubscription,
  superAdminBulkUpdateOwnerGroup,
  superAdminSetOwnerMaxBranches,
  SuperAdminBranchAction,
  reconcileIncomingReferralRewards,
} from '../../lib/cloudSync';
import {
  buildFeatureRequestWhatsAppUrl,
  FEATURE_REQUEST_BOUNDS,
  FEATURE_REQUEST_STATUSES,
  fetchAllFeatureRequestsForAdmin,
  subscribeToAllFeatureRequestsForAdmin,
  superAdminUpdateFeatureRequest,
} from '../../lib/featureRequestsService';
import {
  calculateOwnerBundlePricing,
  getBranchDaysRemaining,
  getEffectiveBranchStatus,
  getOwnerMaxAllowedBranches,
  isBranchLicenseUnlocked,
  isMasterOwnerStore,
  resolveIsPrimaryBranch,
} from '../../utils/branchLicensing';

interface SuperAdminSubscribersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminSubscribersModal: React.FC<SuperAdminSubscribersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [adminTab, setAdminTab] = useState<'subscribers' | 'feature_requests'>('subscribers');
  const [stores, setStores] = useState<StoreSubscriptionProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'expired' | 'suspended'>('all');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [customDaysByTarget, setCustomDaysByTarget] = useState<Record<string, string>>({});
  const [maxBranchesDrafts, setMaxBranchesDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestFilter, setRequestFilter] = useState<'all' | FeatureRequestStatus>('all');
  const [requestStatusDrafts, setRequestStatusDrafts] = useState<Record<string, FeatureRequestStatus>>({});
  const [requestNotesDrafts, setRequestNotesDrafts] = useState<Record<string, string>>({});
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setIsLoadingRequests(true);
    let active = true;

    const unsubscribe = subscribeToAllStoresForSuperAdmin(
      (list) => {
        if (!active) return;
        setStores(list);
        setIsLoading(false);
      },
      (err) => {
        if (!active) return;
        setIsLoading(false);
        setFeedback({
          type: 'error',
          text: err?.message || 'Could not load subscriber stores.',
        });
      }
    );

    const unsubscribeRequests = subscribeToAllFeatureRequestsForAdmin(
      (list) => {
        if (!active) return;
        setFeatureRequests(list);
        setIsLoadingRequests(false);
      },
      () => {
        if (active) setIsLoadingRequests(false);
      }
    );

    fetchAllStoresForSuperAdmin()
      .then((list) => {
        if (active && list.length > 0) {
          setStores(list);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    fetchAllFeatureRequestsForAdmin()
      .then((list) => {
        if (active) {
          setFeatureRequests(list);
          setIsLoadingRequests(false);
        }
      })
      .catch(() => {
        if (active) setIsLoadingRequests(false);
      });

    return () => {
      active = false;
      unsubscribe();
      unsubscribeRequests();
    };
  }, [isOpen]);

  const enrichedStores = useMemo(() => {
    const referredByCounts: Record<string, number> = {};
    for (const s of stores) {
      if (s.referredBy) {
        referredByCounts[s.referredBy] = (referredByCounts[s.referredBy] || 0) + 1;
      }
    }

    return stores.map((s) => {
      const isMaster = isMasterOwnerStore(s);
      const liveStatus = getEffectiveBranchStatus(s, isMaster);
      const daysRemaining = getBranchDaysRemaining(s);
      const effectiveReferrals = Math.max(
        s.referralCount || 0,
        referredByCounts[s.id] || 0
      );
      return {
        ...s,
        isMaster,
        liveStatus,
        daysRemaining,
        effectiveReferrals,
        hasPendingReconcile: (referredByCounts[s.id] || 0) > (s.referralCount || 0),
      };
    });
  }, [stores]);

  useEffect(() => {
    if (!isOpen || stores.length === 0) return;
    const pendingShops = enrichedStores.filter((s) => s.hasPendingReconcile);
    if (pendingShops.length === 0) return;
    pendingShops.forEach((s) => {
      reconcileIncomingReferralRewards(s.id).catch(() => {});
    });
  }, [isOpen, enrichedStores, stores.length]);

  const stats = useMemo(() => {
    const total = enrichedStores.length;
    const active = enrichedStores.filter((s) => s.liveStatus === 'active').length;
    const trial = enrichedStores.filter((s) => s.liveStatus === 'trial').length;
    const expired = enrichedStores.filter(
      (s) => s.liveStatus === 'expired' || s.liveStatus === 'suspended'
    ).length;
    return { total, active, trial, expired };
  }, [enrichedStores]);

  const filteredStores = useMemo(() => {
    return enrichedStores.filter((s) => {
      if (statusFilter === 'active' && s.liveStatus !== 'active') return false;
      if (statusFilter === 'trial' && s.liveStatus !== 'trial') return false;
      if (statusFilter === 'expired' && s.liveStatus !== 'expired') return false;
      if (statusFilter === 'suspended' && s.liveStatus !== 'suspended') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.storeName?.toLowerCase().includes(q) ||
          s.branchName?.toLowerCase().includes(q) ||
          s.businessGroupName?.toLowerCase().includes(q) ||
          s.ownerEmail?.toLowerCase().includes(q) ||
          s.phone?.toLowerCase().includes(q) ||
          s.id?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedStores, searchQuery, statusFilter]);

  const ownerGroups = useMemo(() => {
    const map = new Map<string, typeof enrichedStores>();
    filteredStores.forEach((s) => {
      const ownerKey = (s.ownerId || s.ownerUid || s.parentStoreId || s.id).trim();
      const arr = map.get(ownerKey) || [];
      arr.push(s);
      map.set(ownerKey, arr);
    });

    return Array.from(map.entries())
      .map(([ownerKey, branches]) => {
        const sorted = [...branches].sort((a, b) => {
          const aPrimary = resolveIsPrimaryBranch(a, ownerKey);
          const bPrimary = resolveIsPrimaryBranch(b, ownerKey);
          if (aPrimary && !bPrimary) return -1;
          if (!aPrimary && bPrimary) return 1;
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        });
        const primary = sorted[0];
        const activeCount = sorted.filter((b) => isBranchLicenseUnlocked(b, b.isMaster)).length;
        const maxAllowed = getOwnerMaxAllowedBranches(sorted, primary);
        const pricing = calculateOwnerBundlePricing(sorted.length);
        return {
          ownerKey,
          primary,
          branches: sorted,
          activeCount,
          totalCount: sorted.length,
          maxAllowed,
          pricing,
        };
      })
      .sort((a, b) => {
        if (a.primary.isMaster && !b.primary.isMaster) return -1;
        if (!a.primary.isMaster && b.primary.isMaster) return 1;
        return new Date(b.primary.createdAt || 0).getTime() - new Date(a.primary.createdAt || 0).getTime();
      });
  }, [filteredStores]);

  const pendingRequestsCount = useMemo(
    () => featureRequests.filter((r) => r.status === 'Pending').length,
    [featureRequests]
  );

  const filteredRequests = useMemo(() => {
    return featureRequests.filter((r) => {
      if (requestFilter !== 'all' && r.status !== requestFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.subject?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.storeName?.toLowerCase().includes(q) ||
          r.ownerEmail?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [featureRequests, requestFilter, searchQuery]);

  if (!isOpen) return null;

  const handleAction = async (
    store: StoreSubscriptionProfile,
    action: SuperAdminBranchAction,
    customDays?: number
  ) => {
    setActionBusyId(store.id);
    setFeedback(null);
    try {
      await superAdminUpdateStoreSubscription(store.id, action, store, customDays);
      const label =
        action === 'extend_30d'
          ? 'extended by +30 Days'
          : action === 'extend_1y'
          ? 'extended by +1 Year'
          : action === 'extend_custom'
          ? `extended by +${customDays || 30} Days`
          : action === 'activate'
          ? 'activated'
          : 'suspended';
      setFeedback({
        type: 'success',
        text: `${store.branchName || store.storeName} license ${label}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to update subscriber status.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleBulkOwnerAction = async (
    ownerKey: string,
    groupName: string,
    ownerBranches: StoreSubscriptionProfile[],
    action: SuperAdminBranchAction,
    customDays?: number
  ) => {
    setActionBusyId(`group:${ownerKey}`);
    setFeedback(null);
    try {
      const updatedCount = await superAdminBulkUpdateOwnerGroup(ownerBranches, action, customDays);
      const label =
        action === 'extend_30d'
          ? 'extended by +30 Days'
          : action === 'extend_1y'
          ? 'extended by +1 Year'
          : action === 'extend_custom'
          ? `extended by +${customDays || 30} Days`
          : action === 'activate'
          ? 'activated'
          : 'suspended';
      setFeedback({
        type: 'success',
        text: `${groupName}: ${updatedCount} branch(es) ${label}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Bulk branch update failed.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSaveMaxBranches = async (
    ownerKey: string,
    groupName: string,
    ownerBranches: StoreSubscriptionProfile[],
    nextMax: number
  ) => {
    setActionBusyId(`max:${ownerKey}`);
    setFeedback(null);
    try {
      const saved = await superAdminSetOwnerMaxBranches(ownerBranches, nextMax);
      setFeedback({
        type: 'success',
        text: `${groupName} max allowed branches updated to ${saved}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Could not update maxAllowedBranches.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSaveFeatureRequestUpdate = async (req: FeatureRequest) => {
    const nextStatus = requestStatusDrafts[req.id] || req.status;
    const nextNotes =
      requestNotesDrafts[req.id] !== undefined ? requestNotesDrafts[req.id] : req.adminNotes || '';
    setSavingRequestId(req.id);
    setFeedback(null);
    try {
      await superAdminUpdateFeatureRequest(req.id, {
        status: nextStatus,
        adminNotes: nextNotes,
      });
      setFeatureRequests((prev) =>
        prev.map((item) =>
          item.id === req.id
            ? { ...item, status: nextStatus, adminNotes: nextNotes, updatedAt: new Date().toISOString() }
            : item
        )
      );
      setFeedback({
        type: 'success',
        text: `Updated "${req.subject}" to ${nextStatus}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Could not update feature request.',
      });
    } finally {
      setSavingRequestId(null);
    }
  };

  const handleManualRefresh = async () => {
    if (adminTab === 'feature_requests') {
      setIsLoadingRequests(true);
      try {
        const list = await fetchAllFeatureRequestsForAdmin();
        setFeatureRequests(list);
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: err?.message || 'Could not refresh feature requests.',
        });
      } finally {
        setIsLoadingRequests(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const list = await fetchAllStoresForSuperAdmin();
      setStores(list);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Refresh failed.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-5 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-3xl p-4 sm:p-6 text-slate-100 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-slate-700/70 pb-3.5 shrink-0">
          {/* Top Bar: Accessible Back Button + Shield Title + Close */}
          <div className="flex items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-100 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition active:scale-95"
                aria-label="Back to previous screen"
              >
                <ArrowLeft className="w-4 h-4 text-sky-400" />
                <span>Back</span>
              </button>

              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-lg font-extrabold text-white tracking-tight truncate">
                  Super Admin Console
                </h2>
                <p className="text-[11px] text-slate-400 truncate">
                  Multi-branch owner licensing, individual branch controls &amp; feature requests
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex p-2 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer shrink-0 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs + Refresh Row */}
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            <div className="flex-1 sm:flex-initial min-w-0 grid grid-cols-2 sm:inline-flex bg-slate-900 border border-slate-700 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setAdminTab('subscribers')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1.5 min-w-0 cursor-pointer transition ${
                  adminTab === 'subscribers'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Subscribers</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('feature_requests')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 min-w-0 cursor-pointer transition ${
                  adminTab === 'feature_requests'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Feature Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-extrabold tabular-nums shrink-0">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={adminTab === 'subscribers' ? isLoading : isLoadingRequests}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-slate-300 hover:text-white cursor-pointer shrink-0 transition"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  (adminTab === 'subscribers' ? isLoading : isLoadingRequests) ? 'animate-spin' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {adminTab === 'subscribers' ? (
          <>
            {/* Summary KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3.5 shrink-0">
              <div className="bg-[#0f172a] border border-slate-700/70 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Total Branches
                </p>
                <p className="text-lg font-extrabold text-white tabular-nums mt-0.5">{stats.total}</p>
              </div>
              <div className="bg-[#0f172a] border border-emerald-500/30 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                  Paid Active
                </p>
                <p className="text-lg font-extrabold text-emerald-300 tabular-nums mt-0.5">
                  {stats.active}
                </p>
              </div>
              <div className="bg-[#0f172a] border border-sky-500/30 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold">
                  Free Trials
                </p>
                <p className="text-lg font-extrabold text-sky-300 tabular-nums mt-0.5">
                  {stats.trial}
                </p>
              </div>
              <div className="bg-[#0f172a] border border-rose-500/30 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">
                  Expired / Suspended
                </p>
                <p className="text-lg font-extrabold text-rose-300 tabular-nums mt-0.5">
                  {stats.expired}
                </p>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-2.5 pb-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search business group, branch, email, or phone..."
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="inline-flex flex-wrap bg-slate-900 border border-slate-700 rounded-xl p-1 gap-1 self-start max-w-full">
                {(['all', 'active', 'trial', 'expired', 'suspended'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize cursor-pointer transition ${
                      statusFilter === tab
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2.5 py-3.5 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search feature title, shop, category, or email..."
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="inline-flex flex-wrap bg-[#0f172a] border border-slate-700 rounded-xl p-1 gap-1 self-start">
              {(['all', ...FEATURE_REQUEST_STATUSES] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRequestFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    requestFilter === tab
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Feedback */}
        {feedback && (
          <div
            className={`mb-3 rounded-xl p-3 text-xs flex items-center gap-2 shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Main Scroll List */}
        {adminTab === 'subscribers' ? (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoading && stores.length === 0 ? (
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
                Loading registered subscriber stores...
              </div>
            ) : ownerGroups.length === 0 ? (
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400 space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No subscriber shops match this filter.</p>
              </div>
            ) : (
              ownerGroups.map((group) => {
                const { ownerKey, primary, branches, activeCount, totalCount, maxAllowed, pricing } = group;
                const groupTitle = primary.businessGroupName || primary.storeName || 'Unnamed Owner';
                const isGroupBusy =
                  actionBusyId === `group:${ownerKey}` || actionBusyId === `max:${ownerKey}`;
                const draftMax = maxBranchesDrafts[ownerKey] ?? String(maxAllowed);
                const groupDaysDraft = customDaysByTarget[`group:${ownerKey}`] ?? '30';
                const hasMasterStore = branches.some((b) => b.isMaster);

                return (
                  <div
                    key={ownerKey}
                    className="bg-[#0f172a] border border-slate-700/80 rounded-2xl p-4 space-y-3"
                  >
                    {/* Business Group / Owner Summary Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 font-extrabold text-sm text-white">
                            {totalCount > 1 ? (
                              <GitBranch className="w-4 h-4 text-sky-400 shrink-0" />
                            ) : (
                              <Store className="w-4 h-4 text-sky-400 shrink-0" />
                            )}
                            {groupTitle}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/35 text-sky-300 text-[10px] font-extrabold tabular-nums">
                            {activeCount} / {totalCount} Active
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-bold tabular-nums">
                            Bundle: KSh {pricing.monthlyTotal.toLocaleString()}/mo · KSh {pricing.annualTotal.toLocaleString()}/yr
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                          <span>{primary.ownerEmail}</span>
                          {primary.phone && (
                            <span className="inline-flex items-center gap-1 text-slate-300 font-mono">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {primary.phone}
                            </span>
                          )}
                          {primary.kraPin && <span>KRA: {primary.kraPin}</span>}
                        </div>
                      </div>

                      {/* Owner Max Branches + Bulk All-Branches Controls */}
                      {!hasMasterStore && (
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-[11px]">
                            <span className="text-slate-400">Max Branches:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={draftMax}
                              onChange={(e) =>
                                setMaxBranchesDrafts((prev) => ({
                                  ...prev,
                                  [ownerKey]: e.target.value,
                                }))
                              }
                              className="w-12 bg-slate-800 border border-slate-600 rounded-lg px-1.5 py-0.5 text-center text-white font-mono text-[11px]"
                            />
                            <button
                              type="button"
                              disabled={isGroupBusy}
                              onClick={() =>
                                handleSaveMaxBranches(
                                  ownerKey,
                                  groupTitle,
                                  branches,
                                  Number(draftMax || maxAllowed)
                                )
                              }
                              className="px-2 py-0.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] cursor-pointer disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>

                          {totalCount > 1 && (
                            <>
                              <button
                                type="button"
                                disabled={isGroupBusy}
                                onClick={() =>
                                  handleBulkOwnerAction(ownerKey, groupTitle, branches, 'extend_30d')
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                              >
                                Extend All +30d
                              </button>
                              <button
                                type="button"
                                disabled={isGroupBusy}
                                onClick={() =>
                                  handleBulkOwnerAction(ownerKey, groupTitle, branches, 'extend_1y')
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                              >
                                Extend All +1y
                              </button>
                              <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-1.5 py-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={3650}
                                  value={groupDaysDraft}
                                  onChange={(e) =>
                                    setCustomDaysByTarget((prev) => ({
                                      ...prev,
                                      [`group:${ownerKey}`]: e.target.value,
                                    }))
                                  }
                                  className="w-11 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center text-[11px] text-white font-mono"
                                  title="Custom days to add to all branches"
                                />
                                <button
                                  type="button"
                                  disabled={isGroupBusy}
                                  onClick={() =>
                                    handleBulkOwnerAction(
                                      ownerKey,
                                      groupTitle,
                                      branches,
                                      'extend_custom',
                                      Number(groupDaysDraft || 30)
                                    )
                                  }
                                  className="px-2 py-0.5 rounded bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-200 font-bold text-[10px] cursor-pointer"
                                >
                                  +Days All
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Individual Branch Rows under this Owner */}
                    <div className="space-y-2">
                      {branches.map((shop, branchIdx) => {
                        const isBusy = actionBusyId === shop.id || isGroupBusy;
                        const isPrimary = resolveIsPrimaryBranch(shop, ownerKey) && branchIdx === 0;
                        const formattedExpiry = shop.expiresAt
                          ? new Date(shop.expiresAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A';
                        const branchDaysDraft = customDaysByTarget[shop.id] ?? '30';
                        const unlocked = isBranchLicenseUnlocked(shop, shop.isMaster);
                        const statusPillClass =
                          shop.liveStatus === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : shop.liveStatus === 'trial'
                            ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                            : shop.liveStatus === 'suspended'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/45'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/35';

                        return (
                          <div
                            key={shop.id}
                            className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-white">
                                  {shop.branchName || shop.storeName || 'Unnamed Branch'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold">
                                  {isPrimary ? 'Primary #1 (KSh 500/mo)' : `Branch #${branchIdx + 1} (KSh 250/mo)`}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusPillClass}`}>
                                  {shop.licensePendingActivation ? 'Pending License' : shop.liveStatus}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold uppercase">
                                  {shop.isMaster ? 'Owner Master' : shop.planType || 'trial'}
                                </span>
                                {shop.effectiveReferrals > 0 && (
                                  <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold inline-flex items-center gap-1 tabular-nums bg-amber-500/15 text-amber-300 border-amber-500/35">
                                    <Gift className="w-3 h-3" />
                                    {shop.effectiveReferrals}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                                <span>
                                  Expires:{' '}
                                  <strong className="text-slate-200 tabular-nums">{formattedExpiry}</strong>
                                  {unlocked && !shop.isMaster && (
                                    <span className="text-sky-400 ml-1">
                                      ({shop.daysRemaining}d left)
                                    </span>
                                  )}
                                </span>
                                {shop.referralCode && (
                                  <span>
                                    Code: <strong className="text-amber-300 font-mono">{shop.referralCode}</strong>
                                  </span>
                                )}
                                {shop.lastPaymentRef && (
                                  <span>
                                    Last Ref:{' '}
                                    <strong className="text-emerald-300 font-mono">{shop.lastPaymentRef}</strong>
                                    {shop.lastPaymentAmount
                                      ? ` (KSh ${shop.lastPaymentAmount.toLocaleString()})`
                                      : ''}
                                  </span>
                                )}
                              </div>
                            </div>

                            {!shop.isMaster && (
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {!unlocked && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleAction(shop, 'activate', 30)}
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Activate
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleAction(shop, 'extend_30d')}
                                  className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                                >
                                  <CalendarPlus className="w-3.5 h-3.5" />
                                  +30d
                                </button>

                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleAction(shop, 'extend_1y')}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                                >
                                  <CalendarPlus className="w-3.5 h-3.5" />
                                  +1y
                                </button>

                                <div className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-1.5 py-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={3650}
                                    value={branchDaysDraft}
                                    onChange={(e) =>
                                      setCustomDaysByTarget((prev) => ({
                                        ...prev,
                                        [shop.id]: e.target.value,
                                      }))
                                    }
                                    className="w-10 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-center text-[11px] text-white font-mono"
                                    title="Custom days to add"
                                  />
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleAction(shop, 'extend_custom', Number(branchDaysDraft || 30))
                                    }
                                    className="px-1.5 py-0.5 rounded bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-200 font-bold text-[10px] cursor-pointer"
                                  >
                                    +Days
                                  </button>
                                </div>

                                {shop.liveStatus !== 'suspended' && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleAction(shop, 'suspend')}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    Suspend
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {isLoadingRequests && featureRequests.length === 0 ? (
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
                Loading client feature requests...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400 space-y-2">
                <Lightbulb className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No client feature requests match this filter.</p>
              </div>
            ) : (
              filteredRequests.map((req) => {
                const draftStatus = requestStatusDrafts[req.id] || req.status;
                const draftNotes =
                  requestNotesDrafts[req.id] !== undefined
                    ? requestNotesDrafts[req.id]
                    : req.adminNotes || '';
                const isSavingReq = savingRequestId === req.id;

                return (
                  <div
                    key={req.id}
                    className="bg-[#0f172a] border border-slate-700/70 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">{req.subject}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-semibold text-sky-300">
                            {req.category}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                            {req.priority}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                          <span className="text-slate-200 font-semibold">{req.storeName}</span>
                          <span>{req.ownerEmail}</span>
                          {req.contactPhone && (
                            <span className="font-mono text-slate-300">{req.contactPhone}</span>
                          )}
                          <span>
                            {new Date(req.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {req.contactPhone && (
                        <a
                          href={buildFeatureRequestWhatsAppUrl(req)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 shrink-0"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                      {req.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr_auto] gap-2 items-center">
                      <select
                        value={draftStatus}
                        onChange={(e) =>
                          setRequestStatusDrafts((prev) => ({
                            ...prev,
                            [req.id]: e.target.value as FeatureRequestStatus,
                          }))
                        }
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {FEATURE_REQUEST_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        maxLength={FEATURE_REQUEST_BOUNDS.adminNotesMax}
                        value={draftNotes}
                        onChange={(e) =>
                          setRequestNotesDrafts((prev) => ({
                            ...prev,
                            [req.id]: e.target.value,
                          }))
                        }
                        placeholder="Add reply note visible to client (e.g. Scheduled for v4.3)..."
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />

                      <button
                        type="button"
                        disabled={isSavingReq}
                        onClick={() => handleSaveFeatureRequestUpdate(req)}
                        className="px-3.5 py-2 rounded-xl bg-[#38bdf8] hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingReq ? 'Saving...' : 'Save Reply'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
