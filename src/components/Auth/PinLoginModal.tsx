import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Delete,
  ShoppingBag,
  ChevronRight,
  Eye,
  EyeOff,
  User as UserIcon,
  ShieldAlert,
  Mail,
  Key,
  HelpCircle,
  Check,
  ArrowLeft,
  Sparkles
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
  recoveryEmail?: string;
  emergencyKey?: string;
  onResetAdminPin?: (newPin: string, targetUserId: string) => Promise<void> | void;
  onResetMasterPin?: (newMasterPin: string) => Promise<void> | void;
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
  recoveryEmail = 'NivaJuma@gmail.com',
  emergencyKey = 'ROFANI-RESET-2026',
  onResetAdminPin,
  onResetMasterPin,
}) => {
  // Always require the employee to select their own account on mandatory startup/terminal lock
  const [selectedUser, setSelectedUser] = useState<User | null>(
    isMandatory ? null : (currentUser || null)
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showPinText, setShowPinText] = useState<boolean>(false);
  const [loginMode, setLoginMode] = useState<'staff' | 'master'>('staff');

  // Emergency Admin PIN Recovery State
  const [showRecoveryView, setShowRecoveryView] = useState<boolean>(false);
  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'key'>('email');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState<string>('');
  const [isRecoveryVerified, setIsRecoveryVerified] = useState<boolean>(false);
  const [targetAdminUser, setTargetAdminUser] = useState<User | null>(null);
  const [newAdminPin, setNewAdminPin] = useState<string>('1234');
  const [syncMasterPasscode, setSyncMasterPasscode] = useState<boolean>(true);
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [recoverySuccessNotice, setRecoverySuccessNotice] = useState<string>('');
  const [showAlternativeHelp, setShowAlternativeHelp] = useState<boolean>(false);

  // Reset inputs and require clean staff selection whenever the lock screen opens
  useEffect(() => {
    if (isOpen) {
      if (isMandatory) {
        setSelectedUser(null);
      }
      setPinInput('');
      setErrorMsg('');
      setLoginMode('staff');
      setShowRecoveryView(false);
      setIsRecoveryVerified(false);
      setRecoveryIdentifier('');
      setNewAdminPin('1234');
      setRecoveryError('');
      setRecoverySuccessNotice('');
    }
  }, [isOpen, isMandatory]);

  const handleKeyPress = (num: string) => {
    if (loginMode === 'staff' && !selectedUser) {
      setErrorMsg('Please select your staff account from the list first.');
      return;
    }

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
      setErrorMsg('Incorrect Store Master PIN. Please try again or tap "Forgot PIN?"');
      setPinInput('');
    }
  };

  const verifyPin = (pinToTest: string, userToTest: User | null) => {
    if (!userToTest) {
      setErrorMsg('Please select your staff account first.');
      return;
    }

    if (pinToTest === userToTest.pin) {
      setErrorMsg('');
      setPinInput('');
      onLoginSuccess(userToTest);
    } else {
      setErrorMsg('Incorrect PIN code. Please try again.');
      setPinInput('');
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    if (!isOpen || showRecoveryView) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' && onClose && !isMandatory) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedUser, loginMode, pinInput, masterPin, showRecoveryView]);

  // Recovery verification logic
  const handleVerifyRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    const trimmedInput = recoveryIdentifier.trim();
    if (!trimmedInput) {
      setRecoveryError(
        recoveryMethod === 'email'
          ? 'Please enter your owner email address.'
          : 'Please enter the emergency reset key.'
      );
      return;
    }

    const adminAccounts = users.filter((u) => u.role === 'Admin');
    const defaultAdmin = adminAccounts[0] || users[0];

    if (recoveryMethod === 'email') {
      const lowerInput = trimmedInput.toLowerCase();
      const validEmails = [
        recoveryEmail.toLowerCase(),
        'nivajuma@gmail.com',
        ...adminAccounts.map((a) => (a.email || '').toLowerCase()).filter(Boolean),
      ];

      if (validEmails.includes(lowerInput)) {
        setIsRecoveryVerified(true);
        setTargetAdminUser(defaultAdmin);
        setNewAdminPin('1234');
        setRecoveryError('');
      } else {
        setRecoveryError(
          'Email does not match the registered store owner account. Check spelling or use the Emergency Key.'
        );
      }
    } else {
      const validKey = (emergencyKey || 'ROFANI-RESET-2026').trim().toUpperCase();
      if (trimmedInput.toUpperCase() === validKey) {
        setIsRecoveryVerified(true);
        setTargetAdminUser(defaultAdmin);
        setNewAdminPin('1234');
        setRecoveryError('');
      } else {
        setRecoveryError('Invalid Emergency Reset Key. Try again or verify store configuration.');
      }
    }
  };

  // Save new PIN and log in immediately
  const handleCompleteReset = async () => {
    if (!targetAdminUser) return;
    if (!newAdminPin || newAdminPin.length < 4) {
      setRecoveryError('Please specify a PIN of at least 4 digits.');
      return;
    }

    setRecoveryError('');
    setRecoverySuccessNotice('Saving new credentials and syncing with Cloud Firestore...');

    try {
      if (onResetAdminPin) {
        await onResetAdminPin(newAdminPin, targetAdminUser.id);
      }
      if (syncMasterPasscode && onResetMasterPin) {
        await onResetMasterPin(newAdminPin);
      }

      setRecoverySuccessNotice('PIN reset successfully! Unlocking terminal as Admin...');
      const updatedUser: User = { ...targetAdminUser, pin: newAdminPin };

      setTimeout(() => {
        setShowRecoveryView(false);
        setIsRecoveryVerified(false);
        onLoginSuccess(updatedUser);
      }, 500);
    } catch (err: any) {
      setRecoveryError(err?.message || 'Could not complete PIN reset. Please try again.');
      setRecoverySuccessNotice('');
    }
  };

  const roleBadges: Record<Role, string> = {
    Admin: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    Manager: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    Cashier: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    'Inventory Staff': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden min-h-[520px]">
        {showRecoveryView ? (
          /* ================= EMERGENCY ADMIN RECOVERY SCREEN ================= */
          <div className="p-6 sm:p-10 flex flex-col justify-between min-h-[520px]">
            <div className="max-w-2xl mx-auto w-full space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      Admin Emergency Account Recovery
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verify store ownership to reset your Admin PIN or Master Passcode immediately.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowRecoveryView(false);
                    setIsRecoveryVerified(false);
                    setRecoveryError('');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
              </div>

              {!isRecoveryVerified ? (
                /* STEP 1: VERIFY STORE OWNERSHIP */
                <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Step 1: Verify Store Ownership
                    </span>
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryMethod('email');
                          setRecoveryError('');
                        }}
                        className={`px-3 py-1 text-xs rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          recoveryMethod === 'email'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Owner Email</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryMethod('key');
                          setRecoveryError('');
                        }}
                        className={`px-3 py-1 text-xs rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          recoveryMethod === 'key'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Emergency Key</span>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleVerifyRecovery} className="space-y-4">
                    {recoveryMethod === 'email' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Registered Store Owner Email:
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type="email"
                            required
                            value={recoveryIdentifier}
                            onChange={(e) => setRecoveryIdentifier(e.target.value)}
                            placeholder="e.g. NivaJuma@gmail.com or admin@rofani.co.ke"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          Enter your store owner email address to verify identity and unlock reset controls.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Store Emergency Master Key:
                        </label>
                        <div className="relative">
                          <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type="text"
                            required
                            value={recoveryIdentifier}
                            onChange={(e) => setRecoveryIdentifier(e.target.value)}
                            placeholder="Enter store emergency key"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          Default emergency key: <span className="font-mono text-amber-400">ROFANI-RESET-2026</span>
                        </p>
                      </div>
                    )}

                    {recoveryError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{recoveryError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Store Ownership</span>
                    </button>
                  </form>
                </div>
              ) : (
                /* STEP 2: SET NEW ADMIN PIN */
                <div className="bg-slate-950/60 border border-emerald-900/40 rounded-2xl p-6 space-y-5">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Store Ownership Verified! Resetting credentials for{' '}
                        <strong>{targetAdminUser?.name || 'Administrator'}</strong>.
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200">
                      Authorized
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Choose New Admin 4-Digit PIN:
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          maxLength={8}
                          value={newAdminPin}
                          onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 1234"
                          className="w-44 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-lg font-mono font-bold tracking-widest text-center focus:outline-none focus:border-emerald-500"
                        />
                        <div className="flex items-center gap-2">
                          {['1234', '9999', '0000'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setNewAdminPin(preset)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition border border-slate-700 cursor-pointer"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={syncMasterPasscode}
                        onChange={(e) => setSyncMasterPasscode(e.target.checked)}
                        className="w-4 h-4 text-emerald-500 bg-slate-900 border-slate-700 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Also synchronize the Store Master Passcode to match this new PIN ({newAdminPin || '....'})</span>
                    </label>

                    {recoveryError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{recoveryError}</span>
                      </div>
                    )}

                    {recoverySuccessNotice && (
                      <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{recoverySuccessNotice}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCompleteReset}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save New PIN & Log In to Terminal</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Alternative Recovery Methods Collapsible */}
              <div className="pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAlternativeHelp(!showAlternativeHelp)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                  <span>Other ways to recover without this screen</span>
                </button>

                {showAlternativeHelp && (
                  <div className="mt-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                    <p className="flex items-start gap-2">
                      <strong className="text-slate-200 shrink-0">1. Realtime Phone Reset:</strong>
                      If any other store phone or tablet is already open, have a manager open the "Staff Management" screen and edit your PIN directly.
                    </p>
                    <p className="flex items-start gap-2">
                      <strong className="text-slate-200 shrink-0">2. Firebase Console:</strong>
                      As the project owner, you can view or update the <span className="font-mono text-sky-300">users</span> collection directly in your Firebase Firestore console.
                    </p>
                    <p className="flex items-start gap-2">
                      <strong className="text-slate-200 shrink-0">3. Factory Default:</strong>
                      The factory master passcode is <span className="font-mono text-amber-300 font-bold">1234</span> on the "Master Store PIN" tab.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ================= STANDARD PIN LOGIN SCREEN ================= */
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
            {/* LEFT PANEL: STAFF ACCOUNT SELECTOR */}
            <div className="md:col-span-5 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-100 tracking-wide uppercase">
                      {storeName}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isMandatory ? 'Security Passcode Protected' : 'Terminal Authentication'}
                    </p>
                  </div>
                </div>

                {/* Login Mode Selector Tabs */}
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 mb-4">
                  <button
                    onClick={() => {
                      setLoginMode('staff');
                      setPinInput('');
                      setErrorMsg('');
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      loginMode === 'staff'
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Staff PIN
                  </button>
                  <button
                    onClick={() => {
                      setLoginMode('master');
                      setPinInput('');
                      setErrorMsg('');
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      loginMode === 'master'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Master Store PIN
                  </button>
                </div>

                {loginMode === 'master' ? (
                  <div className="bg-purple-950/30 border border-purple-800/40 rounded-2xl p-4 space-y-2.5 text-xs text-purple-200">
                    <div className="font-bold flex items-center gap-1.5 text-purple-300">
                      <Lock className="w-4 h-4 text-purple-400" />
                      Store Master Passcode
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      For store managers and owners only. Enter the secure store master passcode to unlock this terminal with full administrator authority.
                    </p>
                    <div className="bg-purple-950/60 p-2.5 rounded-xl border border-purple-800/50 text-[11px] text-purple-300/90 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Master unlock provides complete administrative access.</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      <span>Select Your Account</span>
                      <span className="text-[10px] text-sky-400 font-mono">{users.length} Active Staff</span>
                    </div>

                    {!selectedUser && (
                      <div className="mb-2 px-3 py-2 bg-sky-950/40 border border-sky-800/50 rounded-xl text-[11px] text-sky-300 flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                        <span>Tap your name below to sign in:</span>
                      </div>
                    )}

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
                            className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-slate-800 border-sky-500 shadow-md shadow-sky-500/10 text-white ring-1 ring-sky-500'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
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
                                  <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono ${roleBadges[u.role] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                    {u.role}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Forgot PIN & Recovery Action Button */}
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecoveryView(true);
                    setIsRecoveryVerified(false);
                    setRecoveryIdentifier('');
                    setRecoveryError('');
                  }}
                  className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Forgot PIN? / Emergency Reset</span>
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="flex items-center gap-1 text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Role-Based Shift Security
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Terminal Locked
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: PIN PAD & DIGITS INPUT */}
            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between items-center text-center">
              <div className="w-full max-w-sm space-y-4">
                {/* Header for PIN Entry */}
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-sky-950 border border-sky-800 text-sky-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
                    {loginMode === 'master' ? (
                      <KeyRound className="w-6 h-6 text-purple-400" />
                    ) : (
                      <UserCheck className="w-6 h-6" />
                    )}
                  </div>
                  <h2 className="text-xl font-black text-slate-100">
                    {loginMode === 'master'
                      ? 'Enter Master Store PIN'
                      : selectedUser
                      ? 'Enter Staff PIN'
                      : 'Select Your Account'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {loginMode === 'master' ? (
                      <span>Enter store master passcode to unlock this terminal</span>
                    ) : selectedUser ? (
                      <>
                        Authenticating as <span className="text-sky-400 font-bold">{selectedUser.name}</span>{' '}
                        <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono ${roleBadges[selectedUser.role]}`}>
                          {selectedUser.role}
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-400 font-semibold">
                        ← Tap your name on the left to enter your PIN
                      </span>
                    )}
                  </p>
                </div>

                {/* PIN Bullet Dots Display or Placeholder */}
                {!selectedUser && loginMode === 'staff' ? (
                  <div className="py-5 px-4 bg-slate-950/80 border border-dashed border-slate-800 rounded-2xl text-center">
                    <div className="text-sky-400 font-semibold text-xs flex items-center justify-center gap-1.5 mb-1">
                      <UserIcon className="w-4 h-4" />
                      <span>Choose Your Profile to Continue</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Select your name from the staff directory on the left. The numeric keypad will activate for your account.
                    </p>
                  </div>
                ) : (
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
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      {showPinText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPinText ? 'Hide Digits' : 'Show Digits'}</span>
                    </button>
                  </div>
                )}

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
                      className="h-13 bg-slate-800/80 hover:bg-slate-700 active:bg-sky-600 text-slate-100 font-mono font-bold text-xl rounded-2xl border border-slate-700/80 transition shadow-sm active:scale-95 flex items-center justify-center py-3 cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}

                  <button
                    onClick={handleClear}
                    className="h-13 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 font-bold text-xs rounded-2xl border border-slate-800 transition active:scale-95 flex items-center justify-center py-3 cursor-pointer"
                  >
                    CLEAR
                  </button>

                  <button
                    onClick={() => handleKeyPress('0')}
                    className="h-13 bg-slate-800/80 hover:bg-slate-700 active:bg-sky-600 text-slate-100 font-mono font-bold text-xl rounded-2xl border border-slate-700/80 transition shadow-sm active:scale-95 flex items-center justify-center py-3 cursor-pointer"
                  >
                    0
                  </button>

                  <button
                    onClick={handleBackspace}
                    className="h-13 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-amber-400 font-bold text-xs rounded-2xl border border-slate-800 transition active:scale-95 flex items-center justify-center py-3 cursor-pointer"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Footer controls */}
              <div className="mt-6 w-full max-w-sm flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecoveryView(true);
                    setIsRecoveryVerified(false);
                    setRecoveryIdentifier('');
                    setRecoveryError('');
                  }}
                  className="text-amber-400/90 hover:text-amber-300 transition flex items-center gap-1 text-[11px] underline cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Forgot PIN? / Reset</span>
                </button>

                {onClose && !isMandatory && (
                  <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition underline text-[11px] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
