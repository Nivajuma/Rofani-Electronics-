import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Clock,
  ShieldCheck,
  ArrowRight,
  Settings as SettingsIcon,
  Copy,
  Check,
  Send,
  Zap,
  Lock,
  PhoneCall,
  MessageSquare
} from 'lucide-react';
import {
  normalizeKenyanPhone,
  generateMpesaReceiptCode,
  formatMpesaConfirmationSms,
  loadMpesaConfig,
  saveMpesaConfig,
  requestMpesaStkPush,
  MpesaConfig
} from '../../utils/mpesa';

interface MpesaPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  initialPhone?: string;
  customerName?: string;
  accountReference?: string;
  onPaymentSuccess: (receiptCode: string, phone: string, amount: number, smsNotification?: string) => void;
  onAutoFinalizeSale?: (receiptCode: string, phone: string) => void;
}

type Step = 'input' | 'prompting' | 'success' | 'failed' | 'settings';

export const MpesaPromptModal: React.FC<MpesaPromptModalProps> = ({
  isOpen,
  onClose,
  amount,
  initialPhone = '',
  customerName = 'Customer',
  accountReference = 'POS-SALE',
  onPaymentSuccess,
  onAutoFinalizeSale,
}) => {
  const [step, setStep] = useState<Step>('input');
  const [phoneInput, setPhoneInput] = useState(initialPhone && initialPhone !== 'N/A' ? initialPhone : '');
  const [config, setConfig] = useState<MpesaConfig>(loadMpesaConfig());
  const [showConfig, setShowConfig] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Prompt state
  const [countdown, setCountdown] = useState(60);
  const [activeReceiptCode, setActiveReceiptCode] = useState('');
  const [confirmedSms, setConfirmedSms] = useState('');
  const [simulatedPin, setSimulatedPin] = useState('••••');
  const [isProcessing, setIsProcessing] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync phone input when initialPhone changes
  useEffect(() => {
    if (initialPhone && initialPhone !== 'N/A') {
      setPhoneInput(initialPhone);
    }
  }, [initialPhone]);

  // Reset modal when reopened
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setErrorMsg('');
      setCountdown(60);
      setActiveReceiptCode('');
      setConfirmedSms('');
      setConfig(loadMpesaConfig());
      if (initialPhone && initialPhone !== 'N/A') {
        setPhoneInput(initialPhone);
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen, initialPhone]);

  // Handle countdown during 'prompting'
  useEffect(() => {
    if (step === 'prompting') {
      setCountdown(45);
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // If in demo mode, auto-succeed or timeout
            if (config.mode === 'instant_demo') {
              handleCompleteSuccess();
              return 0;
            } else {
              setStep('failed');
              setErrorMsg('M-PESA request timed out. The customer did not enter their PIN within 45 seconds.');
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-simulate completion in demo mode after 4-6 seconds if desired
      let autoSimTimeout: NodeJS.Timeout | null = null;
      if (config.mode === 'instant_demo' && (config.autoSimulatePinDelaySeconds ?? 4) > 0) {
        autoSimTimeout = setTimeout(() => {
          handleCompleteSuccess();
        }, (config.autoSimulatePinDelaySeconds ?? 4) * 1000);
      }

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (autoSimTimeout) clearTimeout(autoSimTimeout);
      };
    }
  }, [step]);

  if (!isOpen) return null;

  const phoneInfo = normalizeKenyanPhone(phoneInput);

  const handleSendPrompt = async () => {
    setErrorMsg('');
    if (!phoneInput.trim()) {
      setErrorMsg('Please enter customer mobile phone number.');
      return;
    }

    if (!phoneInfo.isValid) {
      setErrorMsg('Invalid Kenyan mobile number. Please use formats like 0712345678, 0110123456, or +254712345678.');
      return;
    }

    if (amount <= 0) {
      setErrorMsg('Payment amount must be greater than KSh 0.00.');
      return;
    }

    setIsProcessing(true);
    try {
      await requestMpesaStkPush(
        {
          phoneNumber: phoneInfo.normalized,
          amount,
          accountReference,
          transactionDesc: `Payment for goods at ${config.storeDisplayName}`,
          storeName: config.storeDisplayName,
        },
        config
      );

      setStep('prompting');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch M-PESA STK prompt.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteSuccess = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const receipt = generateMpesaReceiptCode();
    const sms = formatMpesaConfirmationSms(
      receipt,
      amount,
      config.storeDisplayName,
      config.shortcode
    );

    setActiveReceiptCode(receipt);
    setConfirmedSms(sms);
    setStep('success');
  };

  const handleAcceptAndApply = () => {
    onPaymentSuccess(activeReceiptCode, phoneInfo.normalized || phoneInput, amount, confirmedSms);
    onClose();
  };

  const handleAcceptAndFinalize = () => {
    onPaymentSuccess(activeReceiptCode, phoneInfo.normalized || phoneInput, amount, confirmedSms);
    if (onAutoFinalizeSale) {
      onAutoFinalizeSale(activeReceiptCode, phoneInfo.normalized || phoneInput);
    }
    onClose();
  };

  const handleCopyCode = () => {
    if (!activeReceiptCode) return;
    navigator.clipboard.writeText(activeReceiptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveMpesaConfig(config);
    setShowConfig(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative text-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Safaricom Green Header Bar */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-sm font-black text-sm">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base tracking-tight">Lipa Na M-PESA Online</h3>
                <span className="bg-emerald-950/60 text-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-400/40">
                  STK Push Prompt
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                Customer gives phone number → SMS/SIM prompt pops up on their phone to enter PIN
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 transition"
              title="M-PESA Express Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Quick Settings Panel if toggled */}
          {showConfig && (
            <form onSubmit={handleSaveSettings} className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <SettingsIcon className="w-3.5 h-3.5" />
                  <span>M-PESA Till & Integration Settings</span>
                </span>
                <span className="text-[10px] text-slate-400">Configure Till / Paybill</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Store Display Name</label>
                  <input
                    type="text"
                    value={config.storeDisplayName}
                    onChange={(e) => setConfig({ ...config, storeDisplayName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Lipa Na M-PESA Type</label>
                  <select
                    value={config.shortcodeType}
                    onChange={(e) => setConfig({ ...config, shortcodeType: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-200"
                  >
                    <option value="till">Buy Goods (Till Number)</option>
                    <option value="paybill">Paybill</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Till / Paybill Number</label>
                  <input
                    type="text"
                    value={config.shortcode}
                    onChange={(e) => setConfig({ ...config, shortcode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-200 font-mono"
                    placeholder="e.g. 174379"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Execution Mode</label>
                  <select
                    value={config.mode}
                    onChange={(e) => setConfig({ ...config, mode: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-200 font-semibold text-emerald-400"
                  >
                    <option value="instant_demo">⚡ Instant Demo / Auto-Prompt</option>
                    <option value="live_daraja">🔒 Live Safaricom Daraja API</option>
                  </select>
                </div>
              </div>

              {config.mode === 'live_daraja' && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <p className="text-[10px] text-amber-400">
                    Enter your Safaricom Daraja Portal credentials below for real live STK Push:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Consumer Key"
                      value={config.consumerKey || ''}
                      onChange={(e) => setConfig({ ...config, consumerKey: e.target.value })}
                      className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[11px] font-mono text-slate-300"
                    />
                    <input
                      type="password"
                      placeholder="Consumer Secret"
                      value={config.consumerSecret || ''}
                      onChange={(e) => setConfig({ ...config, consumerSecret: e.target.value })}
                      className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[11px] font-mono text-slate-300"
                    />
                  </div>
                  <input
                    type="password"
                    placeholder="Daraja Passkey"
                    value={config.passkey || ''}
                    onChange={(e) => setConfig({ ...config, passkey: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[11px] font-mono text-slate-300"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                >
                  Save Settings
                </button>
              </div>
            </form>
          )}

          {/* Amount Display Header */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Total Amount to Collect
              </span>
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                KSh {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Payable to: <span className="text-slate-200 font-semibold">{config.storeDisplayName}</span>{' '}
                <span className="text-emerald-400 font-mono">({config.shortcodeType === 'till' ? 'Till' : 'Paybill'}: {config.shortcode})</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Customer</span>
              <span className="font-bold text-slate-200 text-sm">{customerName}</span>
              <span className="text-[11px] text-slate-500 font-mono block">Ref: {accountReference}</span>
            </div>
          </div>

          {/* STEP 1: Enter Customer Phone Number */}
          {step === 'input' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Customer M-PESA Phone Number</span>
                  </span>
                  {phoneInfo.isValid && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Safaricom M-Pesa Valid
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    autoFocus
                    placeholder="e.g. 0712 345 678 or 0110 123 456"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      setErrorMsg('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendPrompt();
                      }
                    }}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 text-slate-100 font-mono text-lg font-bold px-4 py-3 rounded-2xl focus:outline-none transition shadow-inner placeholder:text-slate-600"
                  />
                  {phoneInput && (
                    <button
                      type="button"
                      onClick={() => setPhoneInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {phoneInfo.isValid && (
                  <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 pl-1">
                    <span>Target Phone:</span>
                    <span className="font-bold underline">{phoneInfo.displayFormatted}</span>
                  </div>
                )}
              </div>

              {/* Quick sample phone pills for easy testing / quick demo */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                <span>Quick Fill:</span>
                {initialPhone && initialPhone !== 'N/A' && (
                  <button
                    type="button"
                    onClick={() => setPhoneInput(initialPhone)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono"
                  >
                    Customer's saved: {initialPhone}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPhoneInput('0712345678')}
                  className="px-2 py-0.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 font-mono"
                >
                  Demo Safaricom (0712 345 678)
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneInput('0722000000')}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
                >
                  0722 000 000
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Information / Instruction Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-200">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>How Customer Finishes Payment:</span>
                </div>
                <ol className="list-decimal list-inside space-y-0.5 text-emerald-200/90 pl-1 text-[11px]">
                  <li>Cashier clicks <strong>"Send M-PESA Prompt"</strong> below.</li>
                  <li>A SIM Toolkit / SMS prompt appears instantly on the customer's phone.</li>
                  <li>Customer types their 4-digit M-PESA PIN and taps <strong>OK</strong>.</li>
                  <li>M-PESA confirms the transaction and the sale finishes automatically!</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-send-mpesa-stk-prompt"
                  disabled={isProcessing}
                  onClick={handleSendPrompt}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isProcessing ? 'Dispatching STK Prompt...' : `Prompt M-PESA on Customer Phone`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Prompting / Waiting for Customer PIN Entry */}
          {step === 'prompting' && (
            <div className="space-y-4">
              {/* Radar status alert */}
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-50"></span>
                    <div className="relative w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <Smartphone className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-left">
                    <h4 className="font-extrabold text-sm text-emerald-200">
                      STK Push Prompt Dispatched!
                    </h4>
                    <p className="text-xs text-emerald-300/80">
                      Sent to: <span className="font-mono font-bold text-white">{phoneInfo.displayFormatted}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-300 pt-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Waiting for customer to enter PIN ({countdown}s left)</span>
                </div>
              </div>

              {/* VISUAL CUSTOMER PHONE SCREEN SIMULATOR */}
              <div className="bg-slate-950 p-4 rounded-2xl border-2 border-emerald-500/30 shadow-inner">
                <div className="text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">
                  Customer's Phone Screen (Lipa Na M-PESA SIM Toolkit)
                </div>

                {/* Simulated Phone Pop-up Window */}
                <div className="max-w-xs mx-auto bg-slate-900 border border-emerald-500/40 rounded-xl p-3.5 shadow-xl text-center space-y-3 font-sans">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[11px] font-bold text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Lipa na M-PESA
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">Till: {config.shortcode}</span>
                  </div>

                  <div className="text-xs text-slate-200 font-medium">
                    Do you want to pay <span className="font-bold text-emerald-400">KSh {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> to{' '}
                    <span className="font-bold text-white">{config.storeDisplayName}</span>?
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-slate-400 mb-0.5">Enter M-PESA PIN:</div>
                    <div className="font-mono text-base font-black tracking-widest text-emerald-400">
                      {simulatedPin}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('failed');
                        setErrorMsg('Customer cancelled the M-PESA PIN prompt on their phone.');
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteSuccess}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Send OK (Pay)
                    </button>
                  </div>
                </div>
              </div>

              {/* Cashier Control & Fast Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  id="btn-simulate-mpesa-pin-success"
                  onClick={handleCompleteSuccess}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Customer Entered PIN & Confirmed (Instant Accept)</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('input');
                      if (timerRef.current) clearInterval(timerRef.current);
                    }}
                    className="text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Change Phone Number
                  </button>
                  <button
                    type="button"
                    onClick={handleSendPrompt}
                    className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Send className="w-3.5 h-3.5" /> Resend Prompt to Phone
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Success & Receipt Code Generation */}
          {step === 'success' && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">M-PESA Payment Verified!</h3>
                <p className="text-xs text-emerald-300 font-medium mt-0.5">
                  Customer successfully entered PIN on phone and payment has been received.
                </p>
              </div>

              {/* Receipt Code Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/40 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    M-PESA Transaction Receipt Code
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl font-mono text-xl font-black text-emerald-400 tracking-wider flex items-center justify-between">
                  <span>{activeReceiptCode}</span>
                  <span className="text-xs font-normal text-slate-400 font-sans">
                    KSh {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Safaricom Confirmation SMS Quote */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-emerald-400" />
                    <span>Official Safaricom M-PESA SMS Confirmation:</span>
                  </div>
                  <p className="text-[11px] font-mono text-emerald-200/90 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/60 leading-relaxed select-all">
                    "{confirmedSms}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  id="btn-mpesa-apply-code"
                  onClick={handleAcceptAndApply}
                  className="w-full sm:flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-xl text-xs transition"
                >
                  Fill Code into Payment & Review
                </button>
                <button
                  type="button"
                  id="btn-mpesa-finalize-sale-now"
                  onClick={handleAcceptAndFinalize}
                  className="w-full sm:flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Sale & Print Receipt</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Failed / Cancelled */}
          {step === 'failed' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Payment Unsuccessful</h3>
                <p className="text-xs text-rose-300 font-medium mt-1">
                  {errorMsg || 'The customer did not complete the M-PESA prompt.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Try Again / Change Number
                </button>
                <button
                  type="button"
                  onClick={handleSendPrompt}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" /> Resend Prompt
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
