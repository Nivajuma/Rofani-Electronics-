import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  X,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Role, User, SensitiveActionType } from '../../types';
import { SENSITIVE_ACTION_SPECS } from '../../utils/auditLogger';
import { getUserRoles } from '../../utils/permissions';

export interface RoleAuthorizationRequest {
  actionType: SensitiveActionType;
  actionTitle: string;
  targetId?: string;
  targetName?: string;
  qualifyingRoles: Role[];
  user: User;
  diffSummary?: string[];
  metadata?: Record<string, any>;
  onConfirm: (selectedRole: Role, reason?: string) => void;
  onCancel: () => void;
}

interface RoleAuthorizationModalProps {
  request: RoleAuthorizationRequest | null;
}

export const RoleAuthorizationModal: React.FC<RoleAuthorizationModalProps> = ({ request }) => {
  if (!request) return null;

  const {
    actionType,
    actionTitle,
    targetName,
    qualifyingRoles,
    user,
    diffSummary,
    onConfirm,
    onCancel,
  } = request;

  const allAssignedRoles = getUserRoles(user);
  const spec = SENSITIVE_ACTION_SPECS[actionType];

  // Pre-select the first qualifying role, preferring a domain-specific role over Admin if available
  const defaultRole =
    qualifyingRoles.find((r) => r !== 'Admin') || qualifyingRoles[0] || allAssignedRoles[0] || 'Staff';

  const [selectedRole, setSelectedRole] = useState<Role>(defaultRole);
  const [reason, setReason] = useState<string>('');

  const handleAuthorize = () => {
    if (!selectedRole) return;
    onConfirm(selectedRole, reason.trim());
  };

  const getRoleAuthorityBadge = (role: Role) => {
    if (role === 'Admin') {
      return {
        badge: 'Master Administrator Privilege',
        desc: 'Unrestricted store-wide executive authority across all ledger and inventory modules.',
        color: 'bg-purple-950/80 text-purple-300 border-purple-800',
      };
    }
    if (role === 'Manager') {
      return {
        badge: 'Store Management Authority',
        desc: 'Supervisory role authorizing price adjustments, vendor oversight, and staff management.',
        color: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
      };
    }
    if (role === 'Expenses Role' || role.includes('expense')) {
      return {
        badge: 'Departmental Expense Authority',
        desc: 'Authorized to oversee, record, and purge operational overhead schedules.',
        color: 'bg-amber-950/80 text-amber-300 border-amber-800',
      };
    }
    if (role === 'Inventory Staff' || role.includes('Stock') || role.includes('stock')) {
      return {
        badge: 'Inventory Custodian Authority',
        desc: 'Authorized to adjust on-hand stock quantities, manage SKU barcodes, and update catalog prices.',
        color: 'bg-sky-950/80 text-sky-300 border-sky-800',
      };
    }
    return {
      badge: 'Granular Operational Capability',
      desc: 'Specific functional privilege enabled on this worker profile.',
      color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Zero-Trust Role Attribution
                </span>
                <span className="text-xs text-slate-400">Security Audit</span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">Role Authorization Required</h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Action details banner */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Target Operation
                </span>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{actionTitle}</span>
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {spec?.category?.toUpperCase() || 'SENSITIVE'}
              </span>
            </div>

            {targetName && (
              <div className="text-xs text-slate-300">
                <span className="text-slate-500">Record: </span>
                <span className="font-semibold text-slate-200">{targetName}</span>
              </div>
            )}

            {diffSummary && diffSummary.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Affected Attributes:
                </div>
                <div className="bg-slate-900/90 rounded-lg p-2 space-y-1 text-xs font-mono">
                  {diffSummary.map((diff, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>{diff}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Explanation */}
          <div className="bg-sky-950/30 border border-sky-800/50 rounded-xl p-3 flex items-start gap-2.5 text-xs text-sky-200">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p>
                You hold <strong className="text-white">{allAssignedRoles.length} roles</strong> on your account,
                and <strong className="text-white">{qualifyingRoles.length} qualify</strong> to authorize this sensitive action.
              </p>
              <p className="text-[11px] text-sky-300/80 mt-1">
                Please select the specific role authorization you are exercising for this transaction. This will be permanently logged in the audit ledger.
              </p>
            </div>
          </div>

          {/* Role selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Select Authorizing Role to Log:
            </label>

            <div className="space-y-2">
              {qualifyingRoles.map((role) => {
                const isSelected = selectedRole === role;
                const info = getRoleAuthorityBadge(role);

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-sky-500 ring-2 ring-sky-500/30 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="mt-0.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                          isSelected ? 'border-sky-400 bg-sky-500' : 'border-slate-600 bg-slate-900'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          <ShieldCheck className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                          <span>{role}</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${info.color}`}>
                          {info.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{info.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assigned Roles Snapshot Badge List */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Worker Profile: </span>
                <strong className="text-slate-200">{user.name}</strong>
              </span>
              <span className="text-[10px] font-mono text-slate-500">{user.email || 'N/A'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 self-center">Assigned Roles:</span>
              {allAssignedRoles.map((r) => (
                <span
                  key={r}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    r === selectedRole
                      ? 'bg-sky-950 text-sky-300 border-sky-500 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {r === selectedRole ? `✓ ${r} (Active)` : r}
                </span>
              ))}
            </div>
          </div>

          {/* Justification note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Audit Note / Reason for Action <span className="text-slate-500 font-normal">(Optional)</span>:
            </label>
            <input
              type="text"
              placeholder="e.g. Approved price update, duplicate entry removal, supplier adjustment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Authorizing as: <strong className="text-sky-300 font-mono">{selectedRole}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAuthorize}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-sky-600/30 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Authorize & Record Log</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
