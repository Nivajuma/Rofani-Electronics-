import React, { useState, useEffect } from 'react';
import {
  GripVertical,
  Wrench,
  Plus,
  Calculator,
  Scan,
  Percent,
  X,
  Copy,
  Check,
  Sparkles,
  Tag,
  Delete,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TabKey } from '../../utils/permissions';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';

export interface MobileCartSummary {
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  hasCartItems: boolean;
}

interface MobileQuickToolsBarProps {
  placement: 'phoneFrame' | 'responsiveMobile';
  hidden?: boolean;
  activeTab: TabKey;
  onMakeSale: () => void;
  onOpenBarcodeScanner: () => void;
  onScanManualBarcode?: (code: string) => void;
  onOpenAiScanner?: () => void;
  onApplyQuickDiscount?: (payload: { mode: 'fixed' | 'percentage'; value: number }) => void;
  onClearQuickDiscount?: () => void;
  cartSummary?: MobileCartSummary;
  canGiveDiscounts?: boolean;
}

// Safe arithmetic expression evaluator (no eval / Function)
function evaluateCalcExpression(expr: string): string {
  const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  if (!normalized || !/^[0-9+\-*/.%()]+$/.test(normalized)) {
    return 'Error';
  }
  try {
    const tokens: string[] = [];
    let numBuf = '';
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      const isUnaryMinus =
        ch === '-' &&
        (i === 0 || ['+', '-', '*', '/'].includes(normalized[i - 1])) &&
        numBuf === '';
      if ((ch >= '0' && ch <= '9') || ch === '.' || isUnaryMinus) {
        numBuf += ch;
      } else if (ch === '%') {
        if (numBuf) {
          tokens.push(String(parseFloat(numBuf) / 100));
          numBuf = '';
        }
      } else if (['+', '-', '*', '/'].includes(ch)) {
        if (numBuf) {
          tokens.push(numBuf);
          numBuf = '';
        }
        tokens.push(ch);
      } else {
        return 'Error';
      }
    }
    if (numBuf) tokens.push(numBuf);
    if (tokens.length === 0) return '0';

    // Pass 1: * and /
    const pass1: (number | string)[] = [];
    let idx = 0;
    while (idx < tokens.length) {
      const tok = tokens[idx];
      if ((tok === '*' || tok === '/') && pass1.length > 0 && idx + 1 < tokens.length) {
        const left = Number(pass1.pop());
        const right = Number(tokens[idx + 1]);
        if (Number.isNaN(left) || Number.isNaN(right)) return 'Error';
        if (tok === '/' && right === 0) return 'Error';
        pass1.push(tok === '*' ? left * right : left / right);
        idx += 2;
      } else if (['+', '-', '*', '/'].includes(tok)) {
        pass1.push(tok);
        idx += 1;
      } else {
        const n = Number(tok);
        if (Number.isNaN(n)) return 'Error';
        pass1.push(n);
        idx += 1;
      }
    }

    // Pass 2: + and -
    let result = Number(pass1[0]);
    if (Number.isNaN(result)) return 'Error';
    for (let i = 1; i < pass1.length; i += 2) {
      const op = pass1[i];
      const right = Number(pass1[i + 1]);
      if (Number.isNaN(right)) return 'Error';
      if (op === '+') result += right;
      else if (op === '-') result -= right;
      else return 'Error';
    }

    if (!Number.isFinite(result)) return 'Error';
    return String(Number(result.toFixed(4)));
  } catch {
    return 'Error';
  }
}

export const MobileQuickToolsBar: React.FC<MobileQuickToolsBarProps> = ({
  placement,
  hidden = false,
  activeTab,
  onMakeSale,
  onOpenBarcodeScanner,
  onScanManualBarcode,
  onOpenAiScanner,
  onApplyQuickDiscount,
  onClearQuickDiscount,
  cartSummary,
  canGiveDiscounts = true,
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [toolTab, setToolTab] = useState<'calc' | 'scanner' | 'discount'>('calc');

  // Mini Calculator State
  const [calcDisplay, setCalcDisplay] = useState<string>(() =>
    safeGetJSON<string>('retail_pos_float_calc_display', '0', (v) => typeof v === 'string')
  );
  const [cashTendered, setCashTendered] = useState('');
  const [copiedCalc, setCopiedCalc] = useState(false);

  // Barcode Manual Lookup State
  const [manualBarcode, setManualBarcode] = useState('');
  const [toolNotice, setToolNotice] = useState<string | null>(null);

  // Quick Discount Tool State
  const [discountMode, setDiscountMode] = useState<'percentage' | 'fixed'>('percentage');
  const [discountInput, setDiscountInput] = useState('10');
  const [samplePriceInput, setSamplePriceInput] = useState('');

  useEffect(() => {
    safeSetJSON('retail_pos_float_calc_display', calcDisplay);
  }, [calcDisplay]);

  // Automatically collapse drawer if the bar is hidden (e.g. keyboard open / cart drawer open)
  useEffect(() => {
    if (hidden && isToolsOpen) {
      setIsToolsOpen(false);
    }
  }, [hidden, isToolsOpen]);

  if (hidden) return null;

  const showTempNotice = (msg: string) => {
    setToolNotice(msg);
    setTimeout(() => setToolNotice(null), 2800);
  };

  const handleCalcPress = (key: string) => {
    if (key === 'C') {
      setCalcDisplay('0');
      return;
    }
    if (key === 'DEL') {
      setCalcDisplay((prev) => (prev.length > 1 && prev !== 'Error' ? prev.slice(0, -1) : '0'));
      return;
    }
    if (key === '=') {
      setCalcDisplay(evaluateCalcExpression(calcDisplay));
      return;
    }
    if (calcDisplay === '0' && !['.', '+', '-', '×', '÷', '%'].includes(key)) {
      setCalcDisplay(key);
    } else if (calcDisplay === 'Error') {
      setCalcDisplay(['+', '-', '×', '÷', '%'].includes(key) ? '0' : key);
    } else {
      setCalcDisplay((prev) => prev + key);
    }
  };

  const handleCopyCalc = () => {
    try {
      navigator.clipboard?.writeText(calcDisplay);
      setCopiedCalc(true);
      setTimeout(() => setCopiedCalc(false), 1800);
    } catch {}
  };

  const parsedCalcTotal = parseFloat(evaluateCalcExpression(calcDisplay));
  const parsedTendered = parseFloat(cashTendered);
  const hasChangeValue = !Number.isNaN(parsedCalcTotal) && !Number.isNaN(parsedTendered) && cashTendered.trim() !== '';
  const changeDiff = hasChangeValue ? parsedTendered - parsedCalcTotal : 0;

  // Quick discount preview math
  const baseDiscountAmount = cartSummary?.hasCartItems
    ? cartSummary.subtotal
    : Math.max(0, parseFloat(samplePriceInput) || 0);
  const parsedDiscVal = Math.max(0, parseFloat(discountInput) || 0);
  const computedDiscountKsh =
    discountMode === 'percentage'
      ? Math.round((Math.min(100, parsedDiscVal) / 100) * baseDiscountAmount)
      : Math.min(baseDiscountAmount, parsedDiscVal);
  const discountedTotalPreview = Math.max(0, baseDiscountAmount - computedDiscountKsh);

  const handleApplyDiscount = (modeOverride?: 'percentage' | 'fixed', valueOverride?: number) => {
    const useMode = modeOverride ?? discountMode;
    const useVal = valueOverride ?? parsedDiscVal;
    if (useVal <= 0) {
      showTempNotice('Enter a discount value greater than 0.');
      return;
    }
    if (!cartSummary?.hasCartItems) {
      showTempNotice('Add items to the POS cart first to apply a sale discount.');
      return;
    }
    onApplyQuickDiscount?.({ mode: useMode, value: useVal });
    setIsToolsOpen(false);
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualBarcode.trim();
    if (!code) return;
    onScanManualBarcode?.(code);
    setManualBarcode('');
    setIsToolsOpen(false);
  };

  const wrapperPositionClass =
    placement === 'phoneFrame'
      ? 'pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center w-full px-3'
      : 'lg:hidden pointer-events-none fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center w-full max-w-md px-3';

  const hasActiveDiscount = (cartSummary?.discountTotal || 0) > 0;

  return (
    <div
      data-quick-tools-container="true"
      className={wrapperPositionClass}
    >
      {/* Expanded Fast-Access Quick Tools Popup */}
      <AnimatePresence>
        {isToolsOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="pointer-events-auto mb-2.5 w-full max-w-[360px] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
          >
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/35 text-sky-400 flex items-center justify-center">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-white leading-tight">Quick Tools</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Calculator, Barcode Scanner &amp; Quick Discount
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsToolsOpen(false)}
                aria-label="Close Quick Tools"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Tool Mode Tabs */}
            <div className="grid grid-cols-3 bg-slate-950 border-b border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setToolTab('calc')}
                className={`py-2 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  toolTab === 'calc'
                    ? 'bg-slate-900 text-sky-400 border-b-2 border-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Calculator</span>
              </button>
              <button
                type="button"
                onClick={() => setToolTab('scanner')}
                className={`py-2 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  toolTab === 'scanner'
                    ? 'bg-slate-900 text-sky-400 border-b-2 border-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scan className="w-3.5 h-3.5" />
                <span>Scan</span>
              </button>
              <button
                type="button"
                onClick={() => setToolTab('discount')}
                className={`py-2 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer relative ${
                  toolTab === 'discount'
                    ? 'bg-slate-900 text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Discount</span>
                {hasActiveDiscount && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>

            {toolNotice && (
              <div className="mx-3 mt-2.5 px-3 py-1.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-[11px] font-semibold">
                {toolNotice}
              </div>
            )}

            {/* Tab Content */}
            <div className="p-3">
              {/* 1. MINI CALCULATOR */}
              {toolTab === 'calc' && (
                <div className="space-y-2.5">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span>Mini Calculator</span>
                      <button
                        type="button"
                        onClick={handleCopyCalc}
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 cursor-pointer"
                      >
                        {copiedCalc ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCalc ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-right text-xl font-black font-mono tabular-nums text-sky-400 truncate">
                      {calcDisplay}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {['C', 'DEL', '%', '÷'].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => handleCalcPress(btn)}
                        className="h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-400 font-bold text-xs flex items-center justify-center cursor-pointer transition"
                      >
                        {btn === 'DEL' ? <Delete className="w-3.5 h-3.5" /> : btn}
                      </button>
                    ))}
                    {['7', '8', '9', '×'].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => handleCalcPress(btn)}
                        className={`h-9 rounded-lg font-bold text-sm active:scale-95 transition cursor-pointer ${
                          btn === '×'
                            ? 'bg-slate-800 hover:bg-slate-700 text-sky-400'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-100'
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
                    {['4', '5', '6', '-'].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => handleCalcPress(btn)}
                        className={`h-9 rounded-lg font-bold text-sm active:scale-95 transition cursor-pointer ${
                          btn === '-'
                            ? 'bg-slate-800 hover:bg-slate-700 text-sky-400'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-100'
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
                    {['1', '2', '3', '+'].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => handleCalcPress(btn)}
                        className={`h-9 rounded-lg font-bold text-sm active:scale-95 transition cursor-pointer ${
                          btn === '+'
                            ? 'bg-slate-800 hover:bg-slate-700 text-sky-400'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-100'
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
                    {['0', '.', '='].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => handleCalcPress(btn)}
                        className={`h-9 rounded-lg font-bold text-sm active:scale-95 transition cursor-pointer ${
                          btn === '='
                            ? 'col-span-2 bg-sky-600 hover:bg-sky-500 text-white'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-100'
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>

                  {/* Quick Cash Change Helper */}
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder="Cash given (KSh)"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                    <div
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold shrink-0 border ${
                        !hasChangeValue
                          ? 'bg-slate-950 border-slate-800 text-slate-400'
                          : changeDiff >= 0
                          ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300'
                          : 'bg-rose-950/70 border-rose-700/70 text-rose-300'
                      }`}
                    >
                      {hasChangeValue
                        ? changeDiff >= 0
                          ? `Change: ${changeDiff.toLocaleString()}`
                          : `Short: ${Math.abs(changeDiff).toLocaleString()}`
                        : 'Change: —'}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. BARCODE SCANNER SHORTCUT */}
              {toolTab === 'scanner' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    id="btn-quick-tools-open-scanner"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenBarcodeScanner();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60 transition cursor-pointer"
                  >
                    <Scan className="w-4 h-4" />
                    <span>Open Camera Barcode / QR Scanner</span>
                  </button>

                  {onOpenAiScanner && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        onOpenAiScanner();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-purple-500/40 text-purple-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>AI Scan Counter Items to Receipt</span>
                    </button>
                  )}

                  <form onSubmit={handleManualBarcodeSubmit} className="pt-2 border-t border-slate-800 space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Quick Barcode / SKU Lookup
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        placeholder="Type or paste barcode / SKU..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer transition"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 3. QUICK DISCOUNT TOOL */}
              {toolTab === 'discount' && (
                <div className="space-y-3">
                  {/* Cart context or manual calculator preview */}
                  {cartSummary?.hasCartItems ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          Active Cart ({cartSummary.itemCount} {cartSummary.itemCount === 1 ? 'item' : 'items'})
                        </div>
                        <div className="font-mono font-bold text-slate-200">
                          Subtotal: KSh {cartSummary.subtotal.toLocaleString()}
                        </div>
                      </div>
                      {hasActiveDiscount && onClearQuickDiscount && (
                        <button
                          type="button"
                          onClick={() => {
                            onClearQuickDiscount();
                            showTempNotice('Active sale discount cleared.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Price to Discount (Cart Empty — Preview)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={samplePriceInput}
                        onChange={(e) => setSamplePriceInput(e.target.value)}
                        placeholder="Enter price in KSh (e.g. 2500)"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  {/* Mode Switch + Input */}
                  <div className="flex items-center gap-2">
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setDiscountMode('percentage')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          discountMode === 'percentage'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        % Off
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountMode('fixed')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          discountMode === 'fixed'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        KSh
                      </button>
                    </div>

                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder={discountMode === 'percentage' ? 'e.g. 10' : 'e.g. 100'}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(discountMode === 'percentage' ? [5, 10, 15, 20] : [50, 100, 200, 500]).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setDiscountInput(String(val));
                          if (cartSummary?.hasCartItems) {
                            handleApplyDiscount(discountMode, val);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-950 border border-slate-700 hover:border-emerald-600 text-slate-200 hover:text-emerald-300 text-[11px] font-mono font-bold transition cursor-pointer"
                      >
                        {discountMode === 'percentage' ? `${val}%` : `-KSh ${val}`}
                      </button>
                    ))}
                  </div>

                  {/* Live Discount Preview */}
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      Save:{' '}
                      <strong className="text-emerald-400">
                        KSh {computedDiscountKsh.toLocaleString()}
                      </strong>
                    </span>
                    <span className="text-slate-300">
                      Final:{' '}
                      <strong className="text-sky-400">
                        KSh {discountedTotalPreview.toLocaleString()}
                      </strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    id="btn-quick-tools-apply-discount"
                    onClick={() => handleApplyDiscount()}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>
                      {canGiveDiscounts
                        ? 'Apply Discount to Sale'
                        : 'Authorize Discount (Admin PIN)'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable Floating Pill Container */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.12}
        whileDrag={{ scale: 1.04 }}
        className="pointer-events-auto bg-slate-800/95 backdrop-blur-md border border-slate-700/80 shadow-2xl shadow-black/70 rounded-full px-4 py-2 flex items-center gap-3 touch-none select-none"
      >
        {/* Grip / Drag Handle */}
        <span
          className="text-slate-400 cursor-grab active:cursor-grabbing flex items-center shrink-0"
          title="Drag Quick Tools bar"
        >
          <GripVertical className="w-4 h-4" />
        </span>

        {/* Quick Tools Drawer Toggle with Notification Dot */}
        <button
          type="button"
          id="btn-mobile-quick-tools-toggle"
          onClick={() => setIsToolsOpen((prev) => !prev)}
          aria-expanded={isToolsOpen}
          className={`min-h-[36px] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 border ${
            isToolsOpen
              ? 'bg-sky-600 text-white border-sky-400/60 shadow-md'
              : 'bg-slate-900/90 hover:bg-slate-700/90 text-slate-100 border-slate-700'
          }`}
        >
          <Wrench className={`w-3.5 h-3.5 shrink-0 ${isToolsOpen ? 'text-white' : 'text-sky-400'}`} />
          <span>Quick Tools</span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              hasActiveDiscount ? 'bg-emerald-400' : 'bg-sky-400'
            }`}
          />
        </button>

        {/* Prominent Green "+ Make Sale" FAB */}
        <button
          type="button"
          id="btn-mobile-quick-make-sale"
          onClick={() => {
            setIsToolsOpen(false);
            onMakeSale();
          }}
          title={activeTab === 'pos' ? 'Start a fresh sale on POS' : 'Make Sale — Jump straight to POS Checkout'}
          className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-lg shadow-emerald-950/60 border border-emerald-300/40 whitespace-nowrap shrink-0 cursor-pointer transition"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.75] shrink-0" />
          <span>Make Sale</span>
        </button>
      </motion.div>
    </div>
  );
};
