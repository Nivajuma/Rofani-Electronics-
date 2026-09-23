import React, { useState } from 'react';
import { ShieldAlert, Lock, ArrowLeft, KeyRound, CheckCircle2, User as UserIcon } from 'lucide-react';
import { User } from '../../types';
import { TabKey, TAB_LABELS, getRoleBadgeStyle } from '../../utils/permissions';

interface AccessRestrictedViewProps {
  currentTab: TabKey;
  currentUser: User;
  allUsers: User[];
  onNavigateToAllowedTab: (tab: TabKey) => void;
  onTemporaryUnlock?: (authorizedBy: User) => void;
  onSwitchUser?: (authorizedUser: User) => void;
}

export const AccessRestrictedView: React.FC<AccessRestrictedViewProps> = ({
  currentTab,
  currentUser,
  allUsers,
  onNavigateToAllowedTab,
  onTemporaryUnlock,
  onSwitchUser,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Eligible supervisors who can unlock this section (Admin or Manager)
  const supervisors = allUsers.filter(
    (u) => (u.role === 'Admin' || u.role === 'Manager') && (u.status !== 'inactive')
  );

  const roleStyle = getRoleBadgeStyle(currentUser.role);
  const tabName = TAB_LABELS[currentTab] || currentTab;

  const handleAuthorize = () => {
    setErrorMsg('');
    if (!pinInput.trim()) {
      setErrorMsg('Please enter a 4-digit supervisor PIN.');
      return;
    }

    // Find any supervisor matching this PIN (or the selected supervisor)
    let authorizedUser: User | undefined;
    if (selectedAdminId) {
      const target = supervisors.find((s) => s.id === selectedAdminId);
      if (target && target.pin === pinInput.trim()) {
        authorizedUser = target;
      }
    } else {
      authorizedUser = supervisors.find((s) => s.pin === pinInput.trim());
    }

    if (authorizedUser) {
      setSuccessMsg(`Access granted by ${authorizedUser.name} (${authorizedUser.role})!`);
      setTimeout(() => {
        if (onTemporaryUnlock) {
          onTemporaryUnlock(authorizedUser);
        } else if (onSwitchUser) {
          onSwitchUser(authorizedUser);
        }
      }, 700);
    } else {
      setErrorMsg('Invalid Supervisor PIN. Please check with your Store Manager or Owner.');
      setPinInput('');
    }
  };

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 6) {
      const next = pinInput + val;
      setPinInput(next);
      if (next.length === 4 && supervisors.some((s) => s.pin === next)) {
        // Auto-verify on 4th digit if matches
        const matched = supervisors.find((s) => s.pin === next);
        if (matched) {
          setSuccessMsg(`Access verified by ${matched.name} (${matched.role})!`);
          setTimeout(() => {
            if (onTemporaryUnlock) {
              onTemporaryUnlock(matched);
            } else if (onSwitchUser) {
              onSwitchUser(matched);
            }
          }, 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  // Determine standard default tab based on user's role
  const fallbackTab: TabKey =
    currentUser.role === 'Inventory Staff' || currentUser.role === 'Stock Ins Role' || currentUser.role === 'Stock Setup Role'
      ? 'inventory'
      : currentUser.role === 'Expenses Role'
      ? 'expenses'
      : 'pos';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 text-white text-center relative">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 mb-3 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Access Restricted</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            The <span className="font-bold text-amber-300">{tabName}</span> module requires Manager or Administrator privileges.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">Logged in:</span>
            <span className="font-bold text-white">{currentUser.name}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${roleStyle.badgeBg}`}>
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Action Body */}
        <div className="p-6 space-y-5">
          {/* Quick Return Option */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={() => onNavigateToAllowedTab(fallbackTab)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/20 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to {fallbackTab === 'pos' ? 'Point of Sale (POS)' : 'Inventory Control'}</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Or Supervisor PIN Override
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Supervisor PIN input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>Enter Admin / Manager PIN</span>
              </label>
              {supervisors.length > 0 && (
                <span className="text-[11px] text-slate-500">
                  Authorized: {supervisors.map((s) => s.name.split(' ')[0]).join(', ')}
                </span>
              )}
            </div>

            {/* PIN Dots Display */}
            <div className="flex items-center justify-center gap-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                      isFilled ? 'bg-amber-600 scale-110 shadow-sm' : 'border-2 border-slate-300 bg-white'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-rose-600 text-center bg-rose-50 border border-rose-200 p-2 rounded-xl">
                {errorMsg}
              </p>
            )}

            {successMsg && (
              <p className="text-xs font-bold text-emerald-700 text-center bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </p>
            )}

            {/* Compact Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1 max-w-[260px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num.toString())}
                  className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-amber-100 text-slate-800 font-extrabold text-base transition flex items-center justify-center shadow-xs cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput('')}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition flex items-center justify-center cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-amber-100 text-slate-800 font-extrabold text-base transition flex items-center justify-center shadow-xs cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center cursor-pointer"
              >
                Delete
              </button>
            </div>

            <button
              onClick={handleAuthorize}
              disabled={pinInput.length === 0}
              className="w-full mt-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-600/20 active:scale-95 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Authorize & Unlock</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
