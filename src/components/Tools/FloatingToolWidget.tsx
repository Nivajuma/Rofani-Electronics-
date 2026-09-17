import React, { useState } from 'react';
import {
  Calculator,
  DollarSign,
  ArrowLeftRight,
  X,
  Sparkles,
  ShoppingBag,
  TrendingDown,
  Copy,
  Check,
  Zap,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CURRENCIES: Record<string, { symbol: string; rateToUSD: number; name: string }> = {
  USD: { symbol: '$', rateToUSD: 1, name: 'US Dollar' },
  EUR: { symbol: '€', rateToUSD: 0.92, name: 'Euro' },
  GBP: { symbol: '£', rateToUSD: 0.78, name: 'British Pound' },
  KES: { symbol: 'KSh', rateToUSD: 129.50, name: 'Kenyan Shilling (M-Pesa)' },
  INR: { symbol: '₹', rateToUSD: 83.50, name: 'Indian Rupee (UPI)' },
  NGN: { symbol: '₦', rateToUSD: 1520.00, name: 'Nigerian Naira' },
  ZAR: { symbol: 'R', rateToUSD: 18.20, name: 'South African Rand' },
  AED: { symbol: 'AED', rateToUSD: 3.67, name: 'UAE Dirham' },
  CAD: { symbol: 'C$', rateToUSD: 1.36, name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', rateToUSD: 1.51, name: 'Australian Dollar' },
};

interface FloatingToolWidgetProps {
  onNavigateTab?: (tab: 'pos' | 'inventory' | 'stocktake' | 'contacts' | 'cashmanagement' | 'expenses' | 'attendance' | 'reports' | 'onlinestore' | 'onlineorders' | 'settings') => void;
}

export const FloatingToolWidget: React.FC<FloatingToolWidgetProps> = ({ onNavigateTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calc' | 'currency' | 'units'>('calc');
  const [copied, setCopied] = useState(false);

  // Calculator State
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcTotalPaid, setCalcTotalPaid] = useState('');
  const [calcChangeDue, setCalcChangeDue] = useState<number | null>(null);

  // Currency Converter State
  const [fromCurr, setFromCurr] = useState('USD');
  const [toCurr, setToCurr] = useState('KES');
  const [currAmount, setCurrAmount] = useState('100');

  // Unit Converter State
  const [unitCategory, setUnitCategory] = useState<'mass' | 'volume' | 'length'>('mass');
  const [fromUnit, setFromUnit] = useState('kg');
  const [toUnit, setToUnit] = useState('lbs');
  const [unitVal, setUnitVal] = useState('1');

  const handleCopyResult = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculator logic
  const handleCalcBtn = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcChangeDue(null);
      return;
    }
    if (val === 'DEL') {
      setCalcDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (val === '=') {
      try {
        // Sanitize string for simple math evaluation
        const sanitized = calcDisplay.replace(/×/g, '*').replace(/÷/g, '/');
        // eslint-disable-next-line no-eval
        const res = eval(sanitized);
        setCalcDisplay(String(Number(res.toFixed(4))));
      } catch (e) {
        setCalcDisplay('Error');
      }
      return;
    }
    if (calcDisplay === '0' || calcDisplay === 'Error') {
      setCalcDisplay(val);
    } else {
      setCalcDisplay((prev) => prev + val);
    }
  };

  const calculateChange = () => {
    const total = parseFloat(calcDisplay);
    const paid = parseFloat(calcTotalPaid);
    if (!isNaN(total) && !isNaN(paid)) {
      setCalcChangeDue(paid - total);
    }
  };

  // Currency conversion calculation
  const getConvertedCurrency = () => {
    const amt = parseFloat(currAmount) || 0;
    const fromRate = CURRENCIES[fromCurr]?.rateToUSD || 1;
    const toRate = CURRENCIES[toCurr]?.rateToUSD || 1;
    // convert from curr to USD, then USD to target
    const inUSD = amt / fromRate;
    const result = inUSD * toRate;
    return result.toFixed(2);
  };

  // Unit conversion calculation
  const getConvertedUnit = () => {
    const v = parseFloat(unitVal) || 0;
    if (unitCategory === 'mass') {
      // kg, g, lbs, oz
      let inKg = v;
      if (fromUnit === 'g') inKg = v / 1000;
      if (fromUnit === 'lbs') inKg = v * 0.453592;
      if (fromUnit === 'oz') inKg = v * 0.0283495;

      if (toUnit === 'kg') return inKg.toFixed(3);
      if (toUnit === 'g') return (inKg * 1000).toFixed(1);
      if (toUnit === 'lbs') return (inKg / 0.453592).toFixed(3);
      if (toUnit === 'oz') return (inKg / 0.0283495).toFixed(2);
    } else if (unitCategory === 'volume') {
      // liters, ml, gal, fl_oz
      let inL = v;
      if (fromUnit === 'ml') inL = v / 1000;
      if (fromUnit === 'gal') inL = v * 3.78541;
      if (fromUnit === 'fl_oz') inL = v * 0.0295735;

      if (toUnit === 'liters') return inL.toFixed(3);
      if (toUnit === 'ml') return (inL * 1000).toFixed(1);
      if (toUnit === 'gal') return (inL / 3.78541).toFixed(3);
      if (toUnit === 'fl_oz') return (inL / 0.0295735).toFixed(2);
    } else {
      // length: m, cm, km, inch, ft
      let inM = v;
      if (fromUnit === 'cm') inM = v / 100;
      if (fromUnit === 'km') inM = v * 1000;
      if (fromUnit === 'inch') inM = v * 0.0254;
      if (fromUnit === 'ft') inM = v * 0.3048;

      if (toUnit === 'm') return inM.toFixed(3);
      if (toUnit === 'cm') return (inM * 100).toFixed(1);
      if (toUnit === 'km') return (inM / 1000).toFixed(4);
      if (toUnit === 'inch') return (inM / 0.0254).toFixed(2);
      if (toUnit === 'ft') return (inM / 0.3048).toFixed(2);
    }
    return '0';
  };

  return (
    <>
      {/* Floating Draggable Action Toggle Button */}
      <motion.div
        drag
        dragMomentum={false}
        whileDrag={{ scale: 1.08 }}
        className="fixed bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing touch-none"
      >
        <button
          id="btn-floating-tools-toggle"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-full shadow-2xl hover:bg-slate-800 transition-all border border-slate-700 select-none"
        >
          <GripVertical className="w-4 h-4 text-slate-400 -ml-1" />
          <Calculator className="w-5 h-5 text-sky-400" />
          <span className="text-xs font-semibold tracking-wide">Quick Tools</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
        </button>
      </motion.div>

      {/* Floating Draggable Modal Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden select-none"
          >
            {/* Header / Drag Handle */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-400" />
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-semibold text-slate-200">Retail Tool Utility (Drag Me)</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Nav Shortcuts Bar */}
            <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Shortcuts
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  id="shortcut-btn-sell"
                  onClick={() => {
                    onNavigateTab?.('pos');
                    setIsOpen(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition flex items-center gap-1 shadow-sm"
                >
                  <ShoppingBag className="w-3 h-3" />
                  <span>POS / Sell</span>
                </button>
                <button
                  id="shortcut-btn-expenses"
                  onClick={() => {
                    onNavigateTab?.('expenses');
                    setIsOpen(false);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-bold px-2.5 py-1 rounded-lg text-[11px] transition flex items-center gap-1"
                >
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                  <span>Log Expense</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-3 bg-slate-950 border-b border-slate-800 text-xs text-slate-400">
              <button
                onClick={() => setActiveTab('calc')}
                className={`py-2.5 font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'calc' ? 'bg-slate-900 text-sky-400 border-b-2 border-sky-400 font-semibold' : 'hover:text-slate-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                Calc
              </button>
              <button
                onClick={() => setActiveTab('currency')}
                className={`py-2.5 font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'currency' ? 'bg-slate-900 text-sky-400 border-b-2 border-sky-400 font-semibold' : 'hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Currency
              </button>
              <button
                onClick={() => setActiveTab('units')}
                className={`py-2.5 font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'units' ? 'bg-slate-900 text-sky-400 border-b-2 border-sky-400 font-semibold' : 'hover:text-slate-200'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Units
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4">
              {/* TAB 1: CALCULATOR */}
              {activeTab === 'calc' && (
                <div className="space-y-3">
                  {/* Screen */}
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>Formula Display</span>
                      <button
                        onClick={() => handleCopyResult(calcDisplay)}
                        className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                        title="Copy calculated value"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="text-2xl font-bold font-mono text-sky-400 tracking-wider truncate text-right">
                      {calcDisplay}
                    </div>

                    {/* Value Action Shortcuts */}
                    {calcDisplay !== '0' && calcDisplay !== 'Error' && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] gap-2">
                        <button
                          onClick={() => {
                            onNavigateTab?.('pos');
                            setIsOpen(false);
                          }}
                          className="flex-1 bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 font-bold py-1 px-2 rounded-lg transition text-center flex items-center justify-center gap-1"
                          title="Switch to POS / Sell view"
                        >
                          <ShoppingBag className="w-3 h-3 text-blue-400" />
                          <span>Use in Sell (${calcDisplay})</span>
                        </button>

                        <button
                          onClick={() => {
                            onNavigateTab?.('expenses');
                            setIsOpen(false);
                          }}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold py-1 px-2 rounded-lg transition text-center flex items-center justify-center gap-1"
                          title="Switch to Expenses view"
                        >
                          <TrendingDown className="w-3 h-3 text-rose-400" />
                          <span>To Expenses</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Calculator Buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {['C', 'DEL', '%', '÷'].map((b) => (
                      <button
                        key={b}
                        onClick={() => handleCalcBtn(b)}
                        className="py-2 bg-slate-800/80 hover:bg-slate-700 font-bold text-sky-400 rounded-lg transition active:scale-95 text-xs"
                      >
                        {b}
                      </button>
                    ))}
                    {['7', '8', '9', '×'].map((b) => (
                      <button
                        key={b}
                        onClick={() => handleCalcBtn(b)}
                        className={`py-2.5 font-semibold rounded-lg transition active:scale-95 text-sm ${
                          b === '×' ? 'bg-slate-800/80 text-sky-400 hover:bg-slate-700' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                    {['4', '5', '6', '-'].map((b) => (
                      <button
                        key={b}
                        onClick={() => handleCalcBtn(b)}
                        className={`py-2.5 font-semibold rounded-lg transition active:scale-95 text-sm ${
                          b === '-' ? 'bg-slate-800/80 text-sky-400 hover:bg-slate-700' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                    {['1', '2', '3', '+'].map((b) => (
                      <button
                        key={b}
                        onClick={() => handleCalcBtn(b)}
                        className={`py-2.5 font-semibold rounded-lg transition active:scale-95 text-sm ${
                          b === '+' ? 'bg-slate-800/80 text-sky-400 hover:bg-slate-700' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                    {['0', '.', '='].map((b) => (
                      <button
                        key={b}
                        onClick={() => handleCalcBtn(b)}
                        className={`py-2.5 font-semibold rounded-lg transition active:scale-95 text-sm ${
                          b === '=' ? 'col-span-2 bg-sky-600 hover:bg-sky-500 text-white font-bold' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {/* Cash Change Helper */}
                  <div className="pt-2 border-t border-slate-800 text-xs space-y-2">
                    <div className="text-slate-400 font-medium flex justify-between">
                      <span>Quick Change Calculator</span>
                      <span className="text-slate-500">Bill total = {calcDisplay}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Cash tendered ($)"
                        value={calcTotalPaid}
                        onChange={(e) => setCalcTotalPaid(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg w-full text-xs focus:outline-none focus:border-sky-500"
                      />
                      <button
                        onClick={calculateChange}
                        className="bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold px-3 py-1.5 rounded-lg transition whitespace-nowrap text-xs"
                      >
                        Calculate
                      </button>
                    </div>
                    {calcChangeDue !== null && (
                      <div className={`p-2 rounded-lg text-center font-semibold text-xs ${calcChangeDue >= 0 ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400' : 'bg-red-950/60 border border-red-800/80 text-red-400'}`}>
                        {calcChangeDue >= 0 ? `Change to return: $${calcChangeDue.toFixed(2)}` : `Shortfall amount: $${Math.abs(calcChangeDue).toFixed(2)}`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CURRENCY CONVERTER */}
              {activeTab === 'currency' && (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Amount to Convert</label>
                      <input
                        type="number"
                        value={currAmount}
                        onChange={(e) => setCurrAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-base px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">From Currency</label>
                        <select
                          value={fromCurr}
                          onChange={(e) => setFromCurr(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-2 rounded-lg focus:outline-none"
                        >
                          {Object.keys(CURRENCIES).map((c) => (
                            <option key={c} value={c}>
                              {c} ({CURRENCIES[c].symbol}) - {CURRENCIES[c].name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">To Currency</label>
                        <select
                          value={toCurr}
                          onChange={(e) => setToCurr(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-2 rounded-lg focus:outline-none"
                        >
                          {Object.keys(CURRENCIES).map((c) => (
                            <option key={c} value={c}>
                              {c} ({CURRENCIES[c].symbol}) - {CURRENCIES[c].name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Result display */}
                  <div className="p-4 bg-sky-950/40 border border-sky-800/60 rounded-xl text-center space-y-1">
                    <div className="text-xs text-sky-300">Converted Value</div>
                    <div className="text-2xl font-bold font-mono text-sky-400">
                      {CURRENCIES[toCurr]?.symbol} {getConvertedCurrency()} {toCurr}
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      1 {fromCurr} ≈ {(CURRENCIES[toCurr]?.rateToUSD / CURRENCIES[fromCurr]?.rateToUSD).toFixed(4)} {toCurr}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: UNIT CONVERTER */}
              {activeTab === 'units' && (
                <div className="space-y-4">
                  {/* Category switcher */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg text-xs">
                    {(['mass', 'volume', 'length'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setUnitCategory(cat);
                          if (cat === 'mass') { setFromUnit('kg'); setToUnit('lbs'); }
                          if (cat === 'volume') { setFromUnit('liters'); setToUnit('gal'); }
                          if (cat === 'length') { setFromUnit('m'); setToUnit('ft'); }
                        }}
                        className={`py-1.5 capitalize rounded-md font-medium transition ${
                          unitCategory === cat ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Value</label>
                      <input
                        type="number"
                        value={unitVal}
                        onChange={(e) => setUnitVal(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-base px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">From</label>
                        <select
                          value={fromUnit}
                          onChange={(e) => setFromUnit(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-2 rounded-lg focus:outline-none capitalize"
                        >
                          {unitCategory === 'mass' && ['kg', 'g', 'lbs', 'oz'].map((u) => <option key={u} value={u}>{u}</option>)}
                          {unitCategory === 'volume' && ['liters', 'ml', 'gal', 'fl_oz'].map((u) => <option key={u} value={u}>{u}</option>)}
                          {unitCategory === 'length' && ['m', 'cm', 'km', 'inch', 'ft'].map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">To</label>
                        <select
                          value={toUnit}
                          onChange={(e) => setToUnit(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-2 rounded-lg focus:outline-none capitalize"
                        >
                          {unitCategory === 'mass' && ['kg', 'g', 'lbs', 'oz'].map((u) => <option key={u} value={u}>{u}</option>)}
                          {unitCategory === 'volume' && ['liters', 'ml', 'gal', 'fl_oz'].map((u) => <option key={u} value={u}>{u}</option>)}
                          {unitCategory === 'length' && ['m', 'cm', 'km', 'inch', 'ft'].map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-center space-y-1">
                    <div className="text-xs text-emerald-300">Equivalent Result</div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      {getConvertedUnit()} <span className="text-sm font-normal text-emerald-200">{toUnit}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
