import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Delete,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Info,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, Role } from '../../types';

interface PinLoginModalProps {
  users: User[];
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  isOpen: boolean;
  onClose?: () => void;
  isMandatory?: boolean;
  masterPin?: string;
  storeName?: string;
}

export const PinLoginModal: React.FC<PinLoginModalProps> = ({
  users,
  currentUser,
  onLoginSuccess,
  isOpen,
  onClose,
  isMandatory = false,
  masterPin = '1234',
  storeName = 'ROFANI POS SYSTEM',
}) => {
  const [selectedUser, setSelectedUser] = useState<User>(currentUser || users[0] || null);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showDemoPins, setShowDemoPins] = useState<boolean>(false);
  const [showPinText, setShowPinText] = useState<boolean>(false);
  const [loginMode, setLoginMode] = useState<'staff' | 'master'>('staff');

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 8) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
      setErrorMsg('');

      if (loginMode === 'master') {
        if (nextPin.length === masterPin.length) {
          verifyMasterPin(nextPin);
        }
      } else {
        const targetPin = selectedUser ? selectedUser.pin : '';
        if (nextPin.length === targetPin.length) {
          verifyPin(nextPin, selectedUser);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMsg('');
  };

  const verifyMasterPin = (pinToTest: string) => {
    if (pinToTest === masterPin) {
      setErrorMsg('');
      setPinInput('');
      const adminUser = users.find((u) => u.role === 'Admin') || users[0];
      onLoginSuccess(adminUser);
    } else {
      setErrorMsg('Incorrect Store Master PIN. Please try again.');
      setPinInput('');
    }
  };

  const verifyPin = (pinToTest: string, userToTest: User | null) => {
    if (!userToTest) {
      setErrorMsg('Please select a staff member first.');
      return;
    }

    if (pinToTest === userToTest.pin || pinToTest === masterPin) {
      setErrorMsg('');
      setPinInput('');
      onLoginSuccess(userToTest);
    } else {
      setErrorMsg('Incorrect PIN code. Please try again.');
      setPinInput('');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    verifyPin(pinInput, selectedUser);
  };

  const roleBadges: Record<Role, string> = {
    Admin: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    Manager: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    Cashier: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    'Inventory Staff': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        
        {/* LEFT PANEL: STAFF WORKER SELECTION */}
        <div className="md:col-span-5 bg-slate-950 p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-100 text-sm tracking-wide uppercase">
                  {storeName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isMandatory ? 'Security Passcode Protected' : 'Terminal PIN Authentication'}
                </p>
              </div>
            </div>

            {/* Authentication Mode Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('staff');
                  setPinInput('');
                  setErrorMsg('');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  loginMode === 'staff'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Staff PIN</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('master');
                  setPinInput('');
                  setErrorMsg('');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  loginMode === 'master'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Master Store PIN</span>
              </button>
            </div>

            {loginMode === 'master' ? (
              <div className="bg-purple-950/30 border border-purple-800/40 rounded-2xl p-3.5 space-y-2 text-xs text-purple-200">
                <div className="font-bold flex items-center gap-1.5 text-purple-300">
                  <Lock className="w-4 h-4 text-purple-400" />
                  Store Master Passcode
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Enter the store's primary master PIN code. Anyone with this PIN can unlock the terminal before choosing their shift account.
                </p>
                <div className="bg-slate-950/80 p-2 rounded-xl border border-purple-900/50 text-[11px] font-mono text-purple-300 flex items-center justify-between">
                  <span>Default Master PIN:</span>
                  <span className="font-bold bg-purple-900/60 px-2 py-0.5 rounded text-white">{masterPin}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Select Staff Account</span>
                  <span className="text-[10px] text-sky-400 font-mono">{users.length} Active</span>
                </div>

                {/* Staff list cards */}
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setPinInput('');
                          setErrorMsg('');
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-slate-800 border-sky-500 shadow-md shadow-sky-500/10 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-xs leading-tight">{u.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono ${roleBadges[u.role]}`}>
                                {u.role}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Quick Demo PIN Helper Ribbon */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <Info className="w-3.5 h-3.5" /> Demo Staff PINs:
              </span>
              <button
                onClick={() => setShowDemoPins(!showDemoPins)}
                className="text-sky-400 hover:underline text-[10px]"
              >
                {showDemoPins ? 'Hide' : 'Show'}
              </button>
            </div>

            {showDemoPins && (
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                {users.map((u) => (
                  <div key={u.id} className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded">
                    <span className="truncate max-w-[90px] text-slate-400">{u.name.split(' ')[0]}:</span>
                    <span className="text-sky-400 font-bold">{u.pin}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: PIN PAD & DIGITS INPUT */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between items-center text-center">
          <div className="w-full max-w-sm space-y-4">
            {/* Header for PIN Entry */}
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-950 border border-sky-800 text-sky-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-100">
                {loginMode === 'master' ? 'Enter Master Store PIN' : 'Enter Staff PIN'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {loginMode === 'master' ? (
                  <span>Enter store passcode to unlock this terminal</span>
                ) : (
                  <>
                    Authenticating as <span className="text-sky-400 font-bold">{selectedUser?.name || 'Staff Member'}</span> ({selectedUser?.role})
                  </>
                )}
              </p>
            </div>

            {/* PIN Bullet Dots Display */}
            <div className="py-2">
              <div className="flex justify-center items-center gap-2.5">
                {Array.from({ length: Math.max(4, loginMode === 'master' ? masterPin.length : (selectedUser?.pin?.length || 4)) }).map((_, idx) => {
                  const isFilled = pinInput.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-11 h-12 rounded-2xl border-2 flex items-center justify-center text-lg font-mono font-bold transition-all duration-200 ${
                        isFilled
                          ? loginMode === 'master'
                            ? 'border-purple-500 bg-purple-950/60 text-purple-300 shadow-lg shadow-purple-500/20 scale-105'
                            : 'border-sky-500 bg-sky-950/60 text-sky-300 shadow-lg shadow-sky-500/20 scale-105'
                          : 'border-slate-800 bg-slate-950 text-slate-600'
                      }`}
                    >
                      {isFilled ? (showPinText ? pinInput[idx] : '●') : ''}
                    </div>
                  );
                })}
              </div>

              {/* Toggle Show PIN Text */}
              <button
                type="button"
                onClick={() => setShowPinText(!showPinText)}
                className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition"
              >
                {showPinText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPinText ? 'Hide Digits' : 'Show Digits'}</span>
              </button>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-300 text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Numeric Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeyPress(digit)}
                  className="h-13 bg-slate-800/80 hover:bg-slate-700 active:bg-sky-600 text-slate-100 font-mono font-bold text-xl rounded-2xl border border-slate-700/80 transition shadow-sm active:scale-95 flex items-center justify-center py-3"
                >
                  {digit}
                </button>
              ))}

              <button
                onClick={handleClear}
                className="h-13 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 font-bold text-xs rounded-2xl border border-slate-800 transition active:scale-95 flex items-center justify-center py-3"
              >
                CLEAR
              </button>

              <button
                onClick={() => handleKeyPress('0')}
                className="h-13 bg-slate-800/80 hover:bg-slate-700 active:bg-sky-600 text-slate-100 font-mono font-bold text-xl rounded-2xl border border-slate-700/80 transition shadow-sm active:scale-95 flex items-center justify-center py-3"
              >
                0
              </button>

              <button
                onClick={handleBackspace}
                className="h-13 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-amber-400 font-bold text-xs rounded-2xl border border-slate-800 transition active:scale-95 flex items-center justify-center py-3"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Footer controls */}
          <div className="mt-6 w-full max-w-sm flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800">
            <span className="flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {isMandatory ? 'Access Restricted • PIN Required' : 'KRA compliant session'}
            </span>

            {onClose && !isMandatory && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition underline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
