import React, { useState, useEffect } from 'react';
import {
  Calculator,
  DollarSign,
  ArrowLeftRight,
  X,
  Copy,
  Check,
  Delete,
  Trash2,
  Percent,
  TrendingUp,
  RotateCcw,
  Package,
  ShoppingBag,
  Banknote,
  Coins,
} from 'lucide-react';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';

interface CalculatorConverterSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseInPos?: (amount: number) => void;
  cartGrandTotal?: number;
}

type SuiteTab = 'calc' | 'change' | 'currency' | 'units';

const KES_DENOMINATIONS = [1000, 500, 200, 100, 50, 40, 20, 10, 5, 1];

function computeKesChangeBreakdown(amount: number): { denom: number; count: number }[] {
  let remaining = Math.round(Math.max(0, amount));
  const breakdown: { denom: number; count: number }[] = [];
  for (const denom of KES_DENOMINATIONS) {
    if (remaining >= denom) {
      const count = Math.floor(remaining / denom);
      breakdown.push({ denom, count });
      remaining -= count * denom;
    }
  }
  return breakdown;
}

interface CalcTapeEntry {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  defaultRatePerUSD: number;
}

const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', defaultRatePerUSD: 129.5 },
  { code: 'USD', symbol: '$', name: 'US Dollar', defaultRatePerUSD: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', defaultRatePerUSD: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', defaultRatePerUSD: 0.78 },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', defaultRatePerUSD: 3680 },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', defaultRatePerUSD: 2650 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (RMB)', defaultRatePerUSD: 7.24 },
];

const DEFAULT_RATES_PER_USD: Record<string, number> = SUPPORTED_CURRENCIES.reduce(
  (acc, c) => ({ ...acc, [c.code]: c.defaultRatePerUSD }),
  {} as Record<string, number>
);

type UnitCategory = 'weight' | 'length' | 'volume';

const UNIT_CONVERSIONS: Record<
  UnitCategory,
  { label: string; units: { code: string; name: string; toBase: number }[] }
> = {
  weight: {
    label: 'Weight',
    units: [
      { code: 'kg', name: 'Kilograms (kg)', toBase: 1 },
      { code: 'g', name: 'Grams (g)', toBase: 0.001 },
      { code: 'lb', name: 'Pounds (lb)', toBase: 0.45359237 },
      { code: 'oz', name: 'Ounces (oz)', toBase: 0.028349523 },
    ],
  },
  length: {
    label: 'Length',
    units: [
      { code: 'm', name: 'Meters (m)', toBase: 1 },
      { code: 'cm', name: 'Centimeters (cm)', toBase: 0.01 },
      { code: 'ft', name: 'Feet (ft)', toBase: 0.3048 },
      { code: 'in', name: 'Inches (in)', toBase: 0.0254 },
      { code: 'yd', name: 'Yards (yd)', toBase: 0.9144 },
    ],
  },
  volume: {
    label: 'Volume',
    units: [
      { code: 'L', name: 'Liters (L)', toBase: 1 },
      { code: 'mL', name: 'Milliliters (mL)', toBase: 0.001 },
      { code: 'gal', name: 'US Gallons (gal)', toBase: 3.785411784 },
    ],
  },
};

// Safe arithmetic expression evaluator (no eval / Function)
function evaluateSafeExpression(expr: string): string {
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

    // Handle trailing operator gracefully
    while (tokens.length > 0 && ['+', '-', '*', '/'].includes(tokens[tokens.length - 1])) {
      tokens.pop();
    }
    if (tokens.length === 0) return '0';

    const pass1: (number | string)[] = [];
    let idx = 0;
    while (idx < tokens.length) {
      const tok = tokens[idx];
      if ((tok === '*' || tok === '/') && pass1.length > 0 && idx + 1 < tokens.length) {
        const left = Number(pass1.pop());
        const right = Number(tokens[idx + 1]);
        if (Number.isNaN(left) || Number.isNaN(right) || (tok === '/' && right === 0)) {
          return 'Error';
        }
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

export const CalculatorConverterSuiteModal: React.FC<CalculatorConverterSuiteModalProps> = ({
  isOpen,
  onClose,
  onUseInPos,
  cartGrandTotal = 0,
}) => {
  const [activeTab, setActiveTab] = useState<SuiteTab>('calc');

  // --- TAB 1: POS CALCULATOR STATE ---
  const [calcDisplay, setCalcDisplay] = useState<string>(() =>
    safeGetJSON<string>('rofani_calc_display', '0', (v) => typeof v === 'string')
  );
  const [calcTape, setCalcTape] = useState<CalcTapeEntry[]>(() =>
    safeGetJSON<CalcTapeEntry[]>('rofani_calc_tape', [], (v) => Array.isArray(v))
  );
  const [showMarginHelper, setShowMarginHelper] = useState(false);
  const [costInput, setCostInput] = useState('');
  const [sellInput, setSellInput] = useState('');
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  // --- GIVE CHANGE CALCULATOR STATE ---
  const [billTotalInput, setBillTotalInput] = useState<string>(() =>
    cartGrandTotal > 0 ? String(cartGrandTotal) : ''
  );
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');

  useEffect(() => {
    if (isOpen && cartGrandTotal > 0 && billTotalInput.trim() === '') {
      setBillTotalInput(String(cartGrandTotal));
    }
  }, [isOpen, cartGrandTotal, billTotalInput]);

  useEffect(() => {
    safeSetJSON('rofani_calc_display', calcDisplay);
  }, [calcDisplay]);

  useEffect(() => {
    safeSetJSON('rofani_calc_tape', calcTape.slice(0, 20));
  }, [calcTape]);

  // --- TAB 2: CURRENCY CONVERTER STATE ---
  const [ratesPerUSD, setRatesPerUSD] = useState<Record<string, number>>(() =>
    safeGetJSON<Record<string, number>>('rofani_currency_rates_usd', DEFAULT_RATES_PER_USD)
  );
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('KES');
  const [currencyAmount, setCurrencyAmount] = useState<string>('100');
  const [customPairOverride, setCustomPairOverride] = useState<string>('');

  useEffect(() => {
    safeSetJSON('rofani_currency_rates_usd', ratesPerUSD);
  }, [ratesPerUSD]);

  // --- TAB 3: UNITS & WHOLESALE PACK CONVERTER STATE ---
  const [unitCategory, setUnitCategory] = useState<UnitCategory>('weight');
  const [fromUnit, setFromUnit] = useState<string>('kg');
  const [toUnit, setToUnit] = useState<string>('lb');
  const [unitInputVal, setUnitInputVal] = useState<string>('1');

  const [packCount, setPackCount] = useState<string>('2');
  const [unitsPerPack, setUnitsPerPack] = useState<string>('12');
  const [packPrice, setPackPrice] = useState<string>('1800');

  useEffect(() => {
    const available = UNIT_CONVERSIONS[unitCategory].units;
    if (!available.some((u) => u.code === fromUnit)) {
      setFromUnit(available[0].code);
    }
    if (!available.some((u) => u.code === toUnit)) {
      setToUnit(available[1]?.code || available[0].code);
    }
  }, [unitCategory, fromUnit, toUnit]);

  if (!isOpen) return null;

  const flashNotice = (msg: string) => {
    setCopiedMsg(msg);
    setTimeout(() => setCopiedMsg(null), 2200);
  };

  const pushTape = (expr: string, res: string) => {
    const entry: CalcTapeEntry = {
      id: `tape-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      expression: expr,
      result: res,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setCalcTape((prev) => [entry, ...prev].slice(0, 15));
  };

  const handleCalcKey = (key: string) => {
    if (key === 'AC') {
      setCalcDisplay('0');
      return;
    }
    if (key === '⌫') {
      setCalcDisplay((prev) => (prev.length > 1 && prev !== 'Error' ? prev.slice(0, -1) : '0'));
      return;
    }
    if (key === '+/-') {
      const currentVal = Number(evaluateSafeExpression(calcDisplay));
      if (!Number.isNaN(currentVal) && currentVal !== 0) {
        setCalcDisplay(String(Number((-currentVal).toFixed(4))));
      }
      return;
    }
    if (key === '=') {
      const res = evaluateSafeExpression(calcDisplay);
      if (res !== 'Error' && res !== calcDisplay) {
        pushTape(calcDisplay, res);
      }
      setCalcDisplay(res);
      return;
    }
    const isOperator = ['+', '-', '×', '÷', '%'].includes(key);
    if (calcDisplay === '0' && !isOperator && key !== '.') {
      setCalcDisplay(key);
    } else if (calcDisplay === 'Error') {
      setCalcDisplay(isOperator ? '0' : key);
    } else {
      setCalcDisplay((prev) => prev + key);
    }
  };

  const handleVatAction = (mode: 'add' | 'remove') => {
    const base = Number(evaluateSafeExpression(calcDisplay));
    if (Number.isNaN(base)) return;
    const next = mode === 'add' ? base * 1.16 : base / 1.16;
    const formatted = String(Number(next.toFixed(2)));
    pushTape(`${base} ${mode === 'add' ? '+ 16% VAT' : '- 16% VAT'}`, formatted);
    setCalcDisplay(formatted);
  };

  const currentNumericCalc = Number(evaluateSafeExpression(calcDisplay));
  const vatBreakdownBase = Number.isNaN(currentNumericCalc) ? 0 : currentNumericCalc;

  const handleCopyOrUseInPos = () => {
    const resolved = evaluateSafeExpression(calcDisplay);
    const valToUse = resolved === 'Error' ? calcDisplay : resolved;
    try {
      navigator.clipboard?.writeText(valToUse);
    } catch {}
    const numVal = Number(valToUse);
    if (onUseInPos && !Number.isNaN(numVal) && numVal > 0) {
      onUseInPos(numVal);
      flashNotice(`Copied ${valToUse} & opened POS`);
    } else {
      flashNotice(`Copied ${valToUse} to clipboard`);
    }
  };

  // Margin & Markup helper math
  const costVal = parseFloat(costInput) || 0;
  const sellVal = parseFloat(sellInput) || 0;
  const profitVal = sellVal - costVal;
  const marginPct = sellVal > 0 ? (profitVal / sellVal) * 100 : 0;
  const markupPct = costVal > 0 ? (profitVal / costVal) * 100 : 0;

  // Currency math
  const fromRate = ratesPerUSD[fromCurrency] || DEFAULT_RATES_PER_USD[fromCurrency] || 1;
  const toRate = ratesPerUSD[toCurrency] || DEFAULT_RATES_PER_USD[toCurrency] || 1;
  const impliedPairRate = toRate / fromRate;
  const activePairRate =
    customPairOverride.trim() !== '' && Number(customPairOverride) > 0
      ? Number(customPairOverride)
      : impliedPairRate;
  const parsedCurrAmt = parseFloat(currencyAmount) || 0;
  const convertedCurrAmount = parsedCurrAmt * activePairRate;

  const handleSwapCurrencies = () => {
    const prevFrom = fromCurrency;
    const prevTo = toCurrency;
    setFromCurrency(prevTo);
    setToCurrency(prevFrom);
    setCustomPairOverride('');
  };

  const handleApplyRateOverride = (newRateStr: string) => {
    setCustomPairOverride(newRateStr);
    const numericRate = parseFloat(newRateStr);
    if (!Number.isNaN(numericRate) && numericRate > 0) {
      if (fromCurrency === 'USD') {
        setRatesPerUSD((prev) => ({ ...prev, [toCurrency]: numericRate }));
      } else if (toCurrency === 'USD') {
        setRatesPerUSD((prev) => ({ ...prev, [fromCurrency]: 1 / numericRate }));
      } else {
        setRatesPerUSD((prev) => ({ ...prev, [toCurrency]: fromRate * numericRate }));
      }
    }
  };

  const handleResetCurrencyRates = () => {
    setRatesPerUSD(DEFAULT_RATES_PER_USD);
    setCustomPairOverride('');
    flashNotice('Default offline rates restored');
  };

  // Unit conversion math
  const catUnits = UNIT_CONVERSIONS[unitCategory].units;
  const fromUnitObj = catUnits.find((u) => u.code === fromUnit) || catUnits[0];
  const toUnitObj = catUnits.find((u) => u.code === toUnit) || catUnits[1] || catUnits[0];
  const rawUnitVal = parseFloat(unitInputVal) || 0;
  const convertedUnitVal = (rawUnitVal * fromUnitObj.toBase) / toUnitObj.toBase;

  // Wholesale pack math
  const parsedPacks = Math.max(0, parseFloat(packCount) || 0);
  const parsedPerPack = Math.max(0, parseFloat(unitsPerPack) || 0);
  const parsedPackPrice = Math.max(0, parseFloat(packPrice) || 0);
  const totalPieces = parsedPacks * parsedPerPack;
  const totalWholesaleCost = parsedPacks * parsedPackPrice;
  const perPieceCost = parsedPerPack > 0 ? parsedPackPrice / parsedPerPack : 0;

  return (
    <div
      className="fixed inset-0 z-[240] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-slate-900 border-t sm:border border-slate-700/90 rounded-t-3xl sm:rounded-3xl text-slate-100 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                Calculator &amp; Converter Suite
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                POS Calc, Offline Forex &amp; Wholesale Pack Tools
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Calculator Suite"
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Mode Tabs */}
        <div className="grid grid-cols-4 bg-slate-950 border-b border-slate-800 shrink-0 text-[11px] sm:text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('calc')}
            className={`min-h-[44px] px-1.5 font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'calc'
                ? 'bg-slate-900 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 shrink-0" />
            <span>Calc</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('change')}
            className={`min-h-[44px] px-1.5 font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'change'
                ? 'bg-slate-900 text-teal-400 border-b-2 border-teal-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Banknote className="w-3.5 h-3.5 shrink-0" />
            <span>Give Change</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('currency')}
            className={`min-h-[44px] px-1.5 font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'currency'
                ? 'bg-slate-900 text-emerald-400 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            <span>Currency</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('units')}
            className={`min-h-[44px] px-1.5 font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'units'
                ? 'bg-slate-900 text-amber-400 border-b-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
            <span>Units</span>
          </button>
        </div>

        {/* Feedback Toast */}
        {copiedMsg && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shrink-0">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{copiedMsg}</span>
          </div>
        )}

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* ================= TAB 1: COMPLETE POS CALCULATOR ================= */}
          {activeTab === 'calc' && (
            <div className="space-y-3">
              {/* Running Calculation Tape */}
              {calcTape.length > 0 && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Calculation Tape
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalcTape([])}
                      className="text-[10px] text-slate-400 hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                  <div className="max-h-20 overflow-y-auto space-y-1 pr-1">
                    {calcTape.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setCalcDisplay(entry.result)}
                        className="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-800/80 flex items-center justify-between gap-2 text-[11px] font-mono transition cursor-pointer"
                      >
                        <span className="text-slate-400 truncate">{entry.expression} =</span>
                        <span className="text-blue-400 font-bold tabular-nums shrink-0">
                          {entry.result}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Display */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    POS Business Calculator
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyOrUseInPos}
                    className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {onUseInPos ? (
                      <ShoppingBag className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{onUseInPos ? 'Copy / Use in POS' : 'Copy Result'}</span>
                  </button>
                </div>

                <div className="text-right text-3xl font-extrabold font-mono tabular-nums text-white truncate">
                  {calcDisplay}
                </div>

                {/* Live 16% VAT & Give Change Quick Action Strip */}
                <div className="pt-2 border-t border-slate-800/90 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleVatAction('add')}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                    >
                      +16% VAT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVatAction('remove')}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                    >
                      -16% VAT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const resolved = Number(evaluateSafeExpression(calcDisplay));
                        if (!Number.isNaN(resolved) && resolved > 0) {
                          setBillTotalInput(String(Number(resolved.toFixed(2))));
                        } else if (cartGrandTotal > 0) {
                          setBillTotalInput(String(cartGrandTotal));
                        }
                        setActiveTab('change');
                      }}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/35 border border-teal-500/40 text-teal-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Give Change</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                    VAT (16%): {(vatBreakdownBase * 0.16).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Complete Keypad */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'AC', variant: 'danger' },
                  { label: '⌫', variant: 'fn' },
                  { label: '+/-', variant: 'fn' },
                  { label: '÷', variant: 'op' },
                  { label: '7', variant: 'num' },
                  { label: '8', variant: 'num' },
                  { label: '9', variant: 'num' },
                  { label: '×', variant: 'op' },
                  { label: '4', variant: 'num' },
                  { label: '5', variant: 'num' },
                  { label: '6', variant: 'num' },
                  { label: '-', variant: 'op' },
                  { label: '1', variant: 'num' },
                  { label: '2', variant: 'num' },
                  { label: '3', variant: 'num' },
                  { label: '+', variant: 'op' },
                  { label: '%', variant: 'fn' },
                  { label: '0', variant: 'num' },
                  { label: '.', variant: 'num' },
                  { label: '=', variant: 'eq' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => handleCalcKey(btn.label)}
                    className={`min-h-[46px] rounded-xl font-bold text-base active:scale-95 transition cursor-pointer flex items-center justify-center ${
                      btn.variant === 'eq'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                        : btn.variant === 'op'
                        ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400'
                        : btn.variant === 'danger'
                        ? 'bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/50 text-rose-300 text-xs font-extrabold'
                        : btn.variant === 'fn'
                        ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm'
                        : 'bg-slate-800/90 hover:bg-slate-700 border border-slate-700/60 text-white'
                    }`}
                  >
                    {btn.label === '⌫' ? <Delete className="w-4 h-4" /> : btn.label}
                  </button>
                ))}
              </div>

              {/* Profit Margin / Markup Helper */}
              <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowMarginHelper((prev) => !prev)}
                  className="w-full min-h-[44px] px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Profit Margin &amp; Markup Helper</span>
                  </span>
                  <span className="text-[11px] text-blue-400">
                    {showMarginHelper ? 'Hide' : 'Open'}
                  </span>
                </button>
                {showMarginHelper && (
                  <div className="p-3.5 pt-1 border-t border-slate-700/70 space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                          Buying / Cost (KSh)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={costInput}
                          onChange={(e) => setCostInput(e.target.value)}
                          placeholder="e.g. 1000"
                          className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                          Selling Price (KSh)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={sellInput}
                          onChange={(e) => setSellInput(e.target.value)}
                          placeholder="e.g. 1450"
                          className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 text-center font-mono tabular-nums">
                      <div>
                        <div className="text-[10px] text-slate-400">Profit</div>
                        <div
                          className={`text-xs font-extrabold ${
                            profitVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {profitVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Margin %</div>
                        <div className="text-xs font-extrabold text-blue-400">
                          {marginPct.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Markup %</div>
                        <div className="text-xs font-extrabold text-amber-400">
                          {markupPct.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: GIVE CHANGE CALCULATOR ================= */}
          {activeTab === 'change' && (() => {
            const billVal = Math.max(0, parseFloat(billTotalInput) || 0);
            const tenderedVal = Math.max(0, parseFloat(cashTenderedInput) || 0);
            const changeDelta = tenderedVal - billVal;
            const hasBill = billVal > 0;
            const hasTendered = cashTenderedInput.trim() !== '' && tenderedVal >= 0;
            const denominationBreakdown =
              hasBill && changeDelta > 0 ? computeKesChangeBreakdown(changeDelta) : [];
            const calcResultVal = Number(evaluateSafeExpression(calcDisplay));

            return (
              <div className="space-y-3.5 text-xs">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3.5">
                  {/* Bill Total Field + Quick Fill Chips */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Bill Total (KSh)
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cartGrandTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => setBillTotalInput(String(cartGrandTotal))}
                            className="px-2 py-0.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/35 border border-sky-500/40 text-sky-300 text-[10px] font-bold cursor-pointer"
                          >
                            Use Cart: KSh {cartGrandTotal.toLocaleString()}
                          </button>
                        )}
                        {!Number.isNaN(calcResultVal) && calcResultVal > 0 && (
                          <button
                            type="button"
                            onClick={() => setBillTotalInput(String(Number(calcResultVal.toFixed(2))))}
                            className="px-2 py-0.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-300 text-[10px] font-bold cursor-pointer"
                          >
                            Use Calc: {calcResultVal.toLocaleString()}
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={billTotalInput}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setBillTotalInput(e.target.value)}
                      placeholder="Enter customer bill total (e.g. 650)"
                      className="w-full min-h-[46px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-lg font-extrabold font-mono tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Cash Received Field + Kenyan Shilling Note Buttons */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Cash Received / Customer Gave (KSh)
                      </label>
                      <div className="flex items-center gap-1.5">
                        {billVal > 0 && (
                          <button
                            type="button"
                            onClick={() => setCashTenderedInput(String(billVal))}
                            className="px-2 py-0.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold cursor-pointer"
                          >
                            Exact
                          </button>
                        )}
                        {cashTenderedInput !== '' && (
                          <button
                            type="button"
                            onClick={() => setCashTenderedInput('')}
                            className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={cashTenderedInput}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCashTenderedInput(e.target.value)}
                      placeholder="Enter cash given by customer (e.g. 1000)"
                      className="w-full min-h-[46px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-lg font-extrabold font-mono tabular-nums text-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />

                    {/* Quick Tap Note Adder Chips */}
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Tap notes to add cash received:
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[50, 100, 200, 500, 1000].map((note) => (
                          <button
                            key={note}
                            type="button"
                            onClick={() => {
                              const next = (parseFloat(cashTenderedInput) || 0) + note;
                              setCashTenderedInput(String(next));
                            }}
                            className="min-h-[38px] rounded-xl bg-slate-900 hover:bg-teal-950/70 border border-slate-700 hover:border-teal-500/60 text-slate-100 hover:text-teal-300 font-mono font-bold text-xs transition active:scale-95 cursor-pointer"
                          >
                            +{note}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Change / Shortfall Output Card */}
                <div
                  className={`rounded-2xl p-4 border shadow-lg space-y-3 ${
                    !hasBill || !hasTendered
                      ? 'bg-slate-950 border-slate-800 text-slate-300'
                      : changeDelta > 0
                        ? 'bg-emerald-950/55 border-emerald-500/50 text-emerald-100'
                        : changeDelta === 0
                          ? 'bg-sky-950/55 border-sky-500/50 text-sky-100'
                          : 'bg-rose-950/55 border-rose-500/50 text-rose-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
                        {!hasBill || !hasTendered
                          ? 'Give Change Preview'
                          : changeDelta > 0
                            ? 'Change to Give Customer'
                            : changeDelta === 0
                              ? 'Exact Payment'
                              : 'Balance Shortfall (Still Owed)'}
                      </div>
                      <div className="text-3xl font-black font-mono tabular-nums mt-0.5">
                        {!hasBill || !hasTendered
                          ? 'KSh 0.00'
                          : `KSh ${Math.abs(changeDelta).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                      </div>
                    </div>

                    {hasBill && hasTendered && changeDelta > 0 && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const formatted = changeDelta.toFixed(2);
                            try {
                              navigator.clipboard?.writeText(formatted);
                            } catch {}
                            flashNotice(`Copied change KSh ${formatted}`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            pushTape(
                              `Paid ${tenderedVal.toLocaleString()} - Bill ${billVal.toLocaleString()}`,
                              `Change ${Number(changeDelta.toFixed(2))}`
                            );
                            flashNotice('Logged change calculation to tape');
                          }}
                          className="px-3 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-emerald-500/40 text-emerald-200 font-semibold text-[10px] cursor-pointer"
                        >
                          Save to Tape
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Kenyan Shilling Notes & Coins Breakdown */}
                  {denominationBreakdown.length > 0 && (
                    <div className="pt-2.5 border-t border-emerald-500/30 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        <Coins className="w-3.5 h-3.5" />
                        <span>Notes &amp; Coins Breakdown to Hand Back</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {denominationBreakdown.map((item) => (
                          <span
                            key={item.denom}
                            className="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-emerald-500/35 text-xs font-mono font-bold text-emerald-200"
                          >
                            {item.count} × KSh {item.denom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================= TAB 2: CURRENCY CONVERTER ================= */}
          {activeTab === 'currency' && (
            <div className="space-y-3.5 text-xs">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Amount to Convert
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={currencyAmount}
                    onChange={(e) => setCurrencyAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full min-h-[46px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-lg font-extrabold font-mono tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Quick Amount Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 50, 100, 500, 1000, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCurrencyAmount(String(preset))}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono text-[11px] font-bold cursor-pointer"
                    >
                      {preset.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* From -> Swap -> To */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                      From
                    </label>
                    <select
                      value={fromCurrency}
                      onChange={(e) => {
                        setFromCurrency(e.target.value);
                        setCustomPairOverride('');
                      }}
                      className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwapCurrencies}
                    aria-label="Swap currencies"
                    className="w-11 h-11 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-emerald-400 flex items-center justify-center cursor-pointer transition shrink-0"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                      To
                    </label>
                    <select
                      value={toCurrency}
                      onChange={(e) => {
                        setToCurrency(e.target.value);
                        setCustomPairOverride('');
                      }}
                      className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Result Box */}
                <div className="bg-slate-950 border border-emerald-500/35 rounded-2xl p-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Converted Total ({toCurrency})
                    </div>
                    <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-400 truncate">
                      {SUPPORTED_CURRENCIES.find((c) => c.code === toCurrency)?.symbol}{' '}
                      {convertedCurrAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = convertedCurrAmount.toFixed(2);
                      try {
                        navigator.clipboard?.writeText(clean);
                      } catch {}
                      flashNotice(`Copied ${toCurrency} ${clean}`);
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Offline Exchange Rate Override */}
              <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Offline Exchange Rate Override</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetCurrencyRates}
                    className="text-[11px] text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-mono font-bold whitespace-nowrap">
                    1 {fromCurrency} =
                  </span>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={
                      customPairOverride !== ''
                        ? customPairOverride
                        : Number(impliedPairRate.toFixed(4)).toString()
                    }
                    onChange={(e) => handleApplyRateOverride(e.target.value)}
                    className="flex-1 min-h-[40px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-slate-300 font-mono font-bold whitespace-nowrap">
                    {toCurrency}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Saved locally on this device so forex conversions work 100% offline.
                </p>
              </div>
            </div>
          )}

          {/* ================= TAB 3: UNITS & WHOLESALE PACK CONVERTER ================= */}
          {activeTab === 'units' && (
            <div className="space-y-3.5 text-xs">
              {/* Unit Category Switcher */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(['weight', 'length', 'volume'] as UnitCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setUnitCategory(cat)}
                      className={`min-h-[38px] rounded-lg font-bold capitalize transition cursor-pointer ${
                        unitCategory === cat
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {UNIT_CONVERSIONS[cat].label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                      Value
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={unitInputVal}
                      onChange={(e) => setUnitInputVal(e.target.value)}
                      className="w-full min-h-[42px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                      From Unit
                    </label>
                    <select
                      value={fromUnit}
                      onChange={(e) => setFromUnit(e.target.value)}
                      className="w-full min-h-[42px] bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {catUnits.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                      To Unit
                    </label>
                    <select
                      value={toUnit}
                      onChange={(e) => setToUnit(e.target.value)}
                      className="w-full min-h-[42px] bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {catUnits.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-950 border border-amber-500/35 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Result ({toUnit})
                    </div>
                    <div className="text-xl font-extrabold font-mono tabular-nums text-amber-400">
                      {convertedUnitVal.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}{' '}
                      {toUnit}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const val = convertedUnitVal.toFixed(3);
                      try {
                        navigator.clipboard?.writeText(val);
                      } catch {}
                      flashNotice(`Copied ${val} ${toUnit}`);
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Wholesale Pack Calculator */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    <span>Wholesale Pack Calculator</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'Dozen', qty: '12' },
                      { label: 'Carton', qty: '24' },
                      { label: 'Bale', qty: '50' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setUnitsPerPack(preset.qty)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          unitsPerPack === preset.qty
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        {preset.label} ({preset.qty})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Packs / Ctns</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={packCount}
                      onChange={(e) => setPackCount(e.target.value)}
                      className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Pcs / Pack</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={unitsPerPack}
                      onChange={(e) => setUnitsPerPack(e.target.value)}
                      className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Pack Price</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={packPrice}
                      onChange={(e) => setPackPrice(e.target.value)}
                      className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3 text-center font-mono tabular-nums">
                  <div>
                    <div className="text-[10px] text-slate-400">Total Pcs</div>
                    <div className="text-sm font-extrabold text-white">
                      {totalPieces.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Total Cost</div>
                    <div className="text-sm font-extrabold text-blue-400">
                      {totalWholesaleCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Per Piece</div>
                    <div className="text-sm font-extrabold text-emerald-400">
                      {perPieceCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
