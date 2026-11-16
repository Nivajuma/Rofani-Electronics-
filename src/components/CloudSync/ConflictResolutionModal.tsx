import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Eye,
  EyeOff,
  GitCompareArrows,
  HardDrive,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  ConflictFieldDiff,
  ConflictResolutionChoice,
  SyncConflict,
  SyncConflictRecordType,
  formatPreciseTimestamp,
} from '../../utils/syncConflicts';
import { playButtonSound } from '../../utils/uiFeedback';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflicts: SyncConflict[];
  onResolveConflict: (
    conflict: SyncConflict,
    choice: ConflictResolutionChoice,
    customMergedRecord?: Record<string, any>
  ) => Promise<void> | void;
  onClose: () => void;
}

const RECORD_TYPE_LABELS: Record<SyncConflictRecordType, string> = {
  product: 'Product',
  customer: 'Customer',
  supplier: 'Supplier',
  transaction: 'Sale Receipt',
  expense: 'Expense',
  user: 'Staff Account',
};

function formatDeltaLabel(diff: ConflictFieldDiff): string | null {
  if (typeof diff.numericDelta !== 'number' || diff.numericDelta === 0) return null;
  const sign = diff.numericDelta > 0 ? '+' : '-';
  const abs = Math.abs(diff.numericDelta);
  if (diff.isCurrency) {
    return `${sign}KSh ${abs.toLocaleString('en-KE', {
      minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${sign}${abs.toLocaleString()}`;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  conflicts,
  onResolveConflict,
  onClose,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [resolutionMode, setResolutionMode] = useState<'whole' | 'field'>('whole');
  const [showAllFields, setShowAllFields] = useState(false);
  const [fieldChoices, setFieldChoices] = useState<Record<string, 'local' | 'remote'>>({});
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const safeIndex = conflicts.length === 0 ? 0 : Math.min(activeIndex, conflicts.length - 1);
  const activeConflict = conflicts[safeIndex] || null;

  // Reset per-conflict UI state whenever active conflict changes
  useEffect(() => {
    if (!activeConflict) return;
    const defaults: Record<string, 'local' | 'remote'> = {};
    activeConflict.diffs.forEach((d) => {
      defaults[d.key] = 'local';
    });
    setFieldChoices(defaults);
    setResolutionMode('whole');
    setResolveError(null);
  }, [activeConflict?.id]);

  // Allow Escape key to dismiss / defer resolution
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isResolving) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isResolving, onClose]);

  const preciseTime = useMemo(
    () =>
      activeConflict
        ? formatPreciseTimestamp(activeConflict.sharedTimestampIso || activeConflict.sharedTimestampMs)
        : null,
    [activeConflict]
  );

  const visibleRows = useMemo(() => {
    if (!activeConflict) return [];
    const diffKeys = new Set(activeConflict.diffs.map((d) => d.key));
    if (showAllFields) {
      return [
        ...activeConflict.diffs.map((d) => ({ ...d, isDifferent: true })),
        ...activeConflict.allComparableFields
          .filter((f) => !diffKeys.has(f.key))
          .map((f) => ({ ...f, isDifferent: false })),
      ];
    }
    return activeConflict.diffs.map((d) => ({ ...d, isDifferent: true }));
  }, [activeConflict, showAllFields]);

  const customSelectionCounts = useMemo(() => {
    if (!activeConflict) return { localCount: 0, remoteCount: 0 };
    let localCount = 0;
    let remoteCount = 0;
    activeConflict.diffs.forEach((d) => {
      if (fieldChoices[d.key] === 'remote') remoteCount += 1;
      else localCount += 1;
    });
    return { localCount, remoteCount };
  }, [activeConflict, fieldChoices]);

  if (!isOpen || !activeConflict) return null;

  const canUseFieldMerge = activeConflict.diffs.length > 1;
  const recordTypeLabel = RECORD_TYPE_LABELS[activeConflict.recordType] || 'Record';

  const handleDecision = async (choice: ConflictResolutionChoice) => {
    if (isResolving) return;
    setIsResolving(true);
    setResolveError(null);

    try {
      let customMerged: Record<string, any> | undefined;
      if (choice === 'custom') {
        const merged: Record<string, any> = { ...activeConflict.localRecord };
        activeConflict.diffs.forEach((d) => {
          if (fieldChoices[d.key] === 'remote') {
            if (d.remoteValue === undefined) {
              delete merged[d.key];
            } else {
              merged[d.key] = d.remoteValue;
            }
          }
        });
        customMerged = merged;
      }

      playButtonSound('tap');
      await onResolveConflict(activeConflict, choice, customMerged);
    } catch (err: any) {
      setResolveError(
        err?.message || 'Could not apply conflict resolution. Please try again.'
      );
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-assistant-title"
      className="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto text-slate-100">
        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center shrink-0">
              <GitCompareArrows className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="conflict-assistant-title"
                className="text-base font-bold text-white leading-tight truncate"
              >
                Conflict Resolution Assistant
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                <span className="text-amber-300 font-medium">Millisecond Timestamp Tie</span>
                <span aria-hidden="true">·</span>
                <span>{recordTypeLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-200 font-medium truncate max-w-[240px]">
                  {activeConflict.recordLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-300">
                  {safeIndex + 1} of {conflicts.length}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isResolving}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0 disabled:opacity-50"
            title="Resolve later"
            aria-label="Close Conflict Resolution Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Multi-conflict navigator when more than 1 conflict is queued */}
        {conflicts.length > 1 && (
          <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {conflicts.map((c, idx) => {
                const isSelected = idx === safeIndex;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-800 text-white border-amber-500/60'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {idx + 1}. {c.recordLabel}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                disabled={safeIndex === 0}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                aria-label="Previous conflict"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => Math.min(conflicts.length - 1, prev + 1))}
                disabled={safeIndex >= conflicts.length - 1}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                aria-label="Next conflict"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Shared Millisecond Timestamp Verification Bar */}
          <div className="bg-amber-950/35 border border-amber-500/35 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-semibold text-amber-100">
                  Both your local edit and the remote server update share the exact same millisecond timestamp, so neither can automatically overwrite the other.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
                  <span className="font-mono text-slate-400">ID: {activeConflict.recordId}</span>
                  {activeConflict.recordSublabel && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{activeConflict.recordSublabel}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>Source: {activeConflict.sourceLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300 font-semibold font-mono tabular-nums">
                    {activeConflict.diffs.length} differing field{activeConflict.diffs.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            {preciseTime && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 shrink-0 text-right">
                <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Shared Millisecond Timestamp</span>
                </div>
                <div className="text-xs font-mono tabular-nums font-bold text-amber-300 mt-0.5">
                  {preciseTime.localFormatted}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-400">
                  {preciseTime.utcIso} ({preciseTime.epochMs} ms)
                </div>
              </div>
            )}
          </div>

          {/* Toolbar: Mode Switch & Show Matching Fields */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                id="btn-conflict-mode-whole"
                onClick={() => setResolutionMode('whole')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer ${
                  resolutionMode === 'whole'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Compare Full Versions
              </button>
              {canUseFieldMerge && (
                <button
                  type="button"
                  id="btn-conflict-mode-field"
                  onClick={() => setResolutionMode('field')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer ${
                    resolutionMode === 'field'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pick Field-by-Field
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAllFields(!showAllFields)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              {showAllFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>
                {showAllFields
                  ? 'Show Differing Fields Only'
                  : `Show All Fields (${activeConflict.allComparableFields.length})`}
              </span>
            </button>
          </div>

          {/* Visual Side-by-Side Comparison Matrix */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            {/* Column Header Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-800 bg-slate-950 text-xs font-semibold">
              <div className="md:col-span-4 px-4 py-3 text-slate-400 flex items-center justify-between">
                <span>Attribute</span>
                <span className="font-mono tabular-nums text-[11px] text-slate-500">
                  {activeConflict.diffs.length} changed
                </span>
              </div>
              <div className="md:col-span-4 px-4 py-3 border-t md:border-t-0 md:border-l border-slate-800 text-sky-300 flex items-center justify-between gap-2 bg-sky-950/20">
                <span className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Local Edit (This Device)</span>
                </span>
                {resolutionMode === 'field' && (
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, 'local' | 'remote'> = {};
                      activeConflict.diffs.forEach((d) => {
                        next[d.key] = 'local';
                      });
                      setFieldChoices(next);
                    }}
                    className="text-[11px] text-sky-300 hover:text-white underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Select All
                  </button>
                )}
              </div>
              <div className="md:col-span-4 px-4 py-3 border-t md:border-t-0 md:border-l border-slate-800 text-emerald-300 flex items-center justify-between gap-2 bg-emerald-950/20">
                <span className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Remote Server (Cloud Firestore)</span>
                </span>
                {resolutionMode === 'field' && (
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, 'local' | 'remote'> = {};
                      activeConflict.diffs.forEach((d) => {
                        next[d.key] = 'remote';
                      });
                      setFieldChoices(next);
                    }}
                    className="text-[11px] text-emerald-300 hover:text-white underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>

            {/* Field Rows */}
            <div className="divide-y divide-slate-800/80">
              {visibleRows.map((row) => {
                const deltaText = row.isDifferent ? formatDeltaLabel(row) : null;
                const chosenSide = fieldChoices[row.key] || 'local';
                const isInteractiveField = resolutionMode === 'field' && row.isDifferent;

                return (
                  <div
                    key={row.key}
                    className={`grid grid-cols-1 md:grid-cols-12 text-xs ${
                      row.isDifferent ? 'bg-slate-900/50' : 'bg-slate-950/30 opacity-75'
                    }`}
                  >
                    {/* Field Label */}
                    <div className="md:col-span-4 px-4 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                          <span>{row.label}</span>
                          {!row.isDifferent && (
                            <span className="text-[11px] font-normal text-slate-500">Match</span>
                          )}
                        </div>
                        {deltaText && (
                          <div className="text-[11px] font-mono tabular-nums text-amber-300 mt-0.5">
                            Local vs Server diff: {deltaText}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Local Cell */}
                    <div
                      className={`md:col-span-4 px-4 py-3 border-t md:border-t-0 md:border-l border-slate-800/80 flex items-center justify-between gap-2 transition ${
                        row.isDifferent
                          ? isInteractiveField && chosenSide === 'local'
                            ? 'bg-sky-950/55 ring-1 ring-inset ring-sky-500/60'
                            : 'bg-sky-950/20'
                          : ''
                      } ${isInteractiveField ? 'cursor-pointer hover:bg-sky-950/40' : ''}`}
                      onClick={() => {
                        if (isInteractiveField) {
                          setFieldChoices((prev) => ({ ...prev, [row.key]: 'local' }));
                        }
                      }}
                    >
                      <div
                        className={`min-w-0 break-words ${
                          row.isCurrency || typeof row.localValue === 'number'
                            ? 'font-mono tabular-nums font-semibold'
                            : 'font-medium'
                        } ${row.isDifferent ? 'text-sky-100' : 'text-slate-400'}`}
                      >
                        {row.formattedLocal}
                      </div>
                      {isInteractiveField && (
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            chosenSide === 'local'
                              ? 'bg-sky-500 border-sky-400 text-slate-950'
                              : 'bg-slate-900 border-slate-700 text-transparent'
                          }`}
                          aria-hidden="true"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Remote Cell */}
                    <div
                      className={`md:col-span-4 px-4 py-3 border-t md:border-t-0 md:border-l border-slate-800/80 flex items-center justify-between gap-2 transition ${
                        row.isDifferent
                          ? isInteractiveField && chosenSide === 'remote'
                            ? 'bg-emerald-950/55 ring-1 ring-inset ring-emerald-500/60'
                            : 'bg-emerald-950/20'
                          : ''
                      } ${isInteractiveField ? 'cursor-pointer hover:bg-emerald-950/40' : ''}`}
                      onClick={() => {
                        if (isInteractiveField) {
                          setFieldChoices((prev) => ({ ...prev, [row.key]: 'remote' }));
                        }
                      }}
                    >
                      <div
                        className={`min-w-0 break-words ${
                          row.isCurrency || typeof row.remoteValue === 'number'
                            ? 'font-mono tabular-nums font-semibold'
                            : 'font-medium'
                        } ${row.isDifferent ? 'text-emerald-100' : 'text-slate-400'}`}
                      >
                        {row.formattedRemote}
                      </div>
                      {isInteractiveField && (
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            chosenSide === 'remote'
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'bg-slate-900 border-slate-700 text-transparent'
                          }`}
                          aria-hidden="true"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {resolveError && (
            <div
              role="alert"
              className="bg-rose-950/60 border border-rose-500/50 text-rose-200 rounded-xl px-4 py-2.5 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{resolveError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="px-5 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isResolving}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer disabled:opacity-50"
          >
            Resolve Later
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {resolutionMode === 'field' && canUseFieldMerge ? (
              <button
                type="button"
                id="btn-apply-custom-conflict-merge"
                onClick={() => handleDecision('custom')}
                disabled={isResolving}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isResolving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <GitCompareArrows className="w-4 h-4" />
                )}
                <span>
                  {isResolving
                    ? 'Saving Merge...'
                    : `Apply Custom Merge (${customSelectionCounts.localCount} Local, ${customSelectionCounts.remoteCount} Server)`}
                </span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  id="btn-keep-local-version"
                  onClick={() => handleDecision('local')}
                  disabled={isResolving}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isResolving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <HardDrive className="w-4 h-4" />
                  )}
                  <span>Keep Local Version</span>
                </button>

                <button
                  type="button"
                  id="btn-keep-remote-version"
                  onClick={() => handleDecision('remote')}
                  disabled={isResolving}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isResolving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  <span>Keep Server Version</span>
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
