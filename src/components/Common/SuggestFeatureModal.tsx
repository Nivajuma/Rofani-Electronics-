import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Lightbulb,
  Mail,
  MessageCircle,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
  Wrench,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  FeatureRequest,
  FeatureRequestCategory,
  FeatureRequestPriority,
  FeatureRequestStatus,
} from '../../types';
import {
  buildFeatureRequestEmailHref,
  buildFeatureRequestWhatsAppUrl,
  deleteMyPendingFeatureRequest,
  FEATURE_REQUEST_BOUNDS,
  FEATURE_REQUEST_CATEGORIES,
  FEATURE_REQUEST_PRIORITIES,
  fetchMyFeatureRequests,
  loadLocalFeatureRequests,
  submitFeatureRequest,
  subscribeToMyFeatureRequests,
  syncPendingFeatureRequestsToCloud,
} from '../../lib/featureRequestsService';

export interface SuggestFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName?: string;
  defaultPhone?: string;
  defaultContactName?: string;
  isCloudSignedIn?: boolean;
}

const STATUS_BADGE_STYLES: Record<FeatureRequestStatus, string> = {
  Pending: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  Planned: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
  'In Progress': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  Completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  Declined: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
};

export const SuggestFeatureModal: React.FC<SuggestFeatureModalProps> = ({
  isOpen,
  onClose,
  storeName = 'Rofani POS',
  defaultPhone = '',
  defaultContactName = '',
  isCloudSignedIn = false,
}) => {
  const [activeView, setActiveView] = useState<'submit' | 'history'>('submit');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<FeatureRequestCategory>('POS & Checkout');
  const [priority, setPriority] = useState<FeatureRequestPriority>('Important for My Shop');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState(defaultPhone);
  const [contactName, setContactName] = useState(defaultContactName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<{
    request: FeatureRequest;
    syncedToCloud: boolean;
    notice?: string;
  } | null>(null);

  const [myRequests, setMyRequests] = useState<FeatureRequest[]>(() => loadLocalFeatureRequests());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (defaultPhone && !contactPhone) setContactPhone(defaultPhone);
    if (defaultContactName && !contactName) setContactName(defaultContactName);
  }, [isOpen, defaultPhone, defaultContactName]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoadingHistory(true);
    setMyRequests(loadLocalFeatureRequests());

    if (isCloudSignedIn) {
      syncPendingFeatureRequestsToCloud().catch(() => {});
    }

    const unsubscribe = subscribeToMyFeatureRequests(
      (list) => {
        if (!active) return;
        setMyRequests(list);
        setIsLoadingHistory(false);
      },
      () => {
        if (!active) return;
        setMyRequests(loadLocalFeatureRequests());
        setIsLoadingHistory(false);
      }
    );

    fetchMyFeatureRequests()
      .then((list) => {
        if (!active) return;
        setMyRequests(list);
        setIsLoadingHistory(false);
      })
      .catch(() => {
        if (active) setIsLoadingHistory(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isOpen, isCloudSignedIn]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const result = await submitFeatureRequest({
        subject,
        category,
        priority,
        description,
        storeName,
        contactPhone,
        contactName,
      });
      setSubmittedRequest(result);
      setMyRequests((prev) => [
        result.request,
        ...prev.filter((r) => r.id !== result.request.id),
      ]);
      setSubject('');
      setDescription('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not submit your feature request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePending = async (id: string) => {
    try {
      await deleteMyPendingFeatureRequest(id);
      setMyRequests((prev) => prev.filter((r) => r.id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not delete feature request.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-5 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#1e293b] border border-slate-700 rounded-3xl p-5 text-slate-100 shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-700/70 pb-3.5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/35 flex items-center justify-center text-sky-400 shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-white tracking-tight truncate">
                Suggest a Feature
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Need a special workflow or custom integration for your shop? Tell us here.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
            aria-label="Close Suggest a Feature"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#0f172a] border border-slate-700/80 rounded-xl p-1 my-3.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveView('submit');
              setSubmittedRequest(null);
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
              activeView === 'submit'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
              activeView === 'history'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>My Requests</span>
            {myRequests.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono tabular-nums text-sky-300">
                {myRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-3.5">
          {activeView === 'submit' ? (
            submittedRequest ? (
              <div className="bg-[#0f172a] border border-emerald-500/40 rounded-2xl p-5 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-extrabold text-white">
                    Feature Request Received!
                  </h3>
                  <p className="text-xs text-slate-300">
                    <span className="font-bold text-sky-300">
                      {submittedRequest.request.subject}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {submittedRequest.syncedToCloud
                      ? 'Your request has been sent to the Rofani POS engineering team. You can track live status updates anytime under My Requests.'
                      : submittedRequest.notice}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a
                    href={buildFeatureRequestWhatsAppUrl(submittedRequest.request)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>Also Send on WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                  <a
                    href={buildFeatureRequestEmailHref(submittedRequest.request)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition"
                  >
                    <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Send Copy via Email</span>
                  </a>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSubmittedRequest(null)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition"
                  >
                    Submit Another
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedRequest(null);
                      setActiveView('history');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#38bdf8] hover:bg-sky-400 text-slate-950 text-xs font-extrabold cursor-pointer transition"
                  >
                    Track My Requests
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {errorMsg && (
                  <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Subject */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="feature-request-subject"
                      className="font-bold text-slate-200"
                    >
                      Feature Subject / Title <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {subject.length}/{FEATURE_REQUEST_BOUNDS.subjectMax}
                    </span>
                  </div>
                  <input
                    id="feature-request-subject"
                    type="text"
                    required
                    minLength={FEATURE_REQUEST_BOUNDS.subjectMin}
                    maxLength={FEATURE_REQUEST_BOUNDS.subjectMax}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Custom wholesale price tiers, WhatsApp credit reminder, or weigh-scale support"
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="feature-request-category"
                      className="font-bold text-slate-200 block"
                    >
                      Area / Module
                    </label>
                    <select
                      id="feature-request-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as FeatureRequestCategory)}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {FEATURE_REQUEST_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="feature-request-priority"
                      className="font-bold text-slate-200 block"
                    >
                      Importance
                    </label>
                    <select
                      id="feature-request-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as FeatureRequestPriority)}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {FEATURE_REQUEST_PRIORITIES.map((prio) => (
                        <option key={prio} value={prio}>
                          {prio}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="feature-request-description"
                      className="font-bold text-slate-200"
                    >
                      How Should It Work for Your Business?{' '}
                      <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {description.length}/{FEATURE_REQUEST_BOUNDS.descriptionMax}
                    </span>
                  </div>
                  <textarea
                    id="feature-request-description"
                    required
                    rows={4}
                    minLength={FEATURE_REQUEST_BOUNDS.descriptionMin}
                    maxLength={FEATURE_REQUEST_BOUNDS.descriptionMax}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain what you want the special feature to do, who in your shop will use it, and any example receipt/report layout..."
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
                  />
                </div>

                {/* Optional Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="feature-request-contact-name"
                      className="font-semibold text-slate-300 block"
                    >
                      Your Name (Optional)
                    </label>
                    <input
                      id="feature-request-contact-name"
                      type="text"
                      maxLength={FEATURE_REQUEST_BOUNDS.contactNameMax}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Shop Owner / Manager"
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="feature-request-contact-phone"
                      className="font-semibold text-slate-300 block"
                    >
                      WhatsApp / Call Number (Optional)
                    </label>
                    <input
                      id="feature-request-contact-phone"
                      type="tel"
                      maxLength={FEATURE_REQUEST_BOUNDS.contactPhoneMax}
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="e.g. +254 7XX XXX XXX"
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="bg-[#0f172a] border border-slate-700/70 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-slate-300">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Special feature requests are reviewed directly by the Rofani POS development team for upcoming releases or custom shop builds.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#38bdf8] hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-2 shadow-lg cursor-pointer transition"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting ? 'Submitting Request...' : 'Submit Feature Request'}
                  </span>
                </button>
              </form>
            )
          ) : (
            <div className="space-y-2.5">
              {isLoadingHistory && myRequests.length === 0 ? (
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                  Loading your submitted feature requests...
                </div>
              ) : myRequests.length === 0 ? (
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <Wrench className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">
                    No feature requests submitted yet
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Have an idea or need a custom feature tailored for {storeName}? Switch to New Request to send it.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('submit')}
                    className="mt-2 px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-bold cursor-pointer transition"
                  >
                    Suggest a Feature
                  </button>
                </div>
              ) : (
                myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-[#0f172a] border border-slate-700/70 rounded-2xl p-3.5 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm leading-snug">
                          {req.subject}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                            {req.category}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/70 text-amber-300 font-semibold">
                            {req.priority}
                          </span>
                          {req.pendingCloudSync && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                              Saved Locally
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase shrink-0 ${
                          STATUS_BADGE_STYLES[req.status]
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line">
                      {req.description}
                    </p>

                    {req.adminNotes && (
                      <div className="bg-sky-950/40 border border-sky-500/30 rounded-xl p-2.5 text-[11px] text-sky-200">
                        <span className="font-bold text-sky-300">Rofani Team Reply: </span>
                        {req.adminNotes}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <span>
                        Submitted{' '}
                        {new Date(req.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>

                      <div className="flex items-center gap-2">
                        <a
                          href={buildFeatureRequestWhatsAppUrl(req)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Follow up</span>
                        </a>

                        {req.status === 'Pending' &&
                          (confirmDeleteId === req.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeletePending(req.id)}
                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                              >
                                Confirm Remove
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(req.id)}
                              className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 cursor-pointer"
                              title="Withdraw pending request"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Withdraw</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
