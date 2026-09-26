import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  X,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  BookOpen,
  QrCode,
  ArrowRightLeft,
  Barcode,
  CreditCard,
  Building2,
  Copy,
  Check,
  TrendingUp,
  Package,
  AlertTriangle
} from 'lucide-react';
import { Product, Transaction } from '../../types';
import { calculateReplenishmentPlan } from '../../utils/replenishment';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStoreName: string;
  workerRole: string;
  activeTab: string;
  lowStockCount: number;
  totalProductsCount: number;
  totalSalesToday: number;
  products?: Product[];
  transactions?: Transaction[];
  onOpenPredictiveRestock?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const QUICK_QUESTIONS = [
  {
    icon: Sparkles,
    label: 'Smart Inventory Replenishment & Velocity Forecast',
    prompt: 'Provide smart inventory replenishment suggestions based on our current sales velocity and stock levels. Which products need urgent reordering, what are the recommended reorder quantities, and how much working capital is required?'
  },
  {
    icon: TrendingUp,
    label: 'Fastest Depleting Stock & Runway Analysis',
    prompt: 'Which products are selling the fastest (highest sales velocity) and how many days of stock runway remain before we run out of stock?'
  },
  {
    icon: CreditCard,
    label: 'How do I process M-Pesa sales?',
    prompt: 'How do I process an M-Pesa transaction step-by-step in POS and verify customer payment?'
  },
  {
    icon: QrCode,
    label: 'Generating KRA eTIMS invoice?',
    prompt: 'Explain how to generate KRA TIMS / e-TIMS compliant tax receipts with QR code for customer sales.'
  },
  {
    icon: ArrowRightLeft,
    label: 'Inter-branch stock transfer?',
    prompt: 'How do I transfer stock inventory from Main Store to another branch outlet?'
  },
  {
    icon: Barcode,
    label: 'Adding items & barcode tags?',
    prompt: 'How do I add new electronics or boutique products and print barcode labels?'
  },
  {
    icon: HelpCircle,
    label: 'Handling customer debt credit?',
    prompt: 'How do I record a partial payment or layby debt for a customer and settle balance later?'
  },
  {
    icon: BookOpen,
    label: 'Returns & refund policy?',
    prompt: 'What is our store policy for returns, exchanges, or replacing damaged goods?'
  }
];

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  activeStoreName,
  workerRole,
  activeTab,
  lowStockCount,
  totalProductsCount,
  totalSalesToday,
  products = [],
  transactions = [],
  onOpenPredictiveRestock
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `Hujambo! 👋 Welcome to **ROFANI Electronics & Boutique**.\n\nI am your **Gemini AI Staff Co-Pilot & Inventory Strategist**. I analyze real-time sales velocity across customer transactions to give you **predictive inventory replenishment suggestions**, stockout forecasts, and step-by-step guides for POS sales, KRA tax invoices, and branch transfers.\n\nClick any quick topic below or ask me any question!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute replenishment metrics for live context
  const replenishmentData = useMemo(() => {
    if (!products || products.length === 0) return null;
    return calculateReplenishmentPlan(products, transactions, 21, 30);
  }, [products, transactions]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      // Build top critical items and fast movers summary text for prompt context
      let criticalItemsText = '';
      let fastMoversText = '';

      if (replenishmentData) {
        const criticalItems = replenishmentData.items
          .filter((i) => i.urgency === 'critical' || i.urgency === 'out_of_stock')
          .slice(0, 5);

        criticalItemsText = criticalItems
          .map(
            (i) =>
              `${i.productName} (Current Stock: ${i.currentStock} ${i.unit}, Velocity: ${i.dailyVelocity}/day, Runway: ${i.daysRemaining}d, Reorder: ${i.recommendedOrderQty} ${i.unit} ~ KSh ${i.estimatedCost.toLocaleString()})`
          )
          .join('; ');

        const fastMovers = replenishmentData.items
          .filter((i) => i.dailyVelocity > 0)
          .sort((a, b) => b.dailyVelocity - a.dailyVelocity)
          .slice(0, 5);

        fastMoversText = fastMovers
          .map((i) => `${i.productName} (${i.dailyVelocity}/day, ${i.weeklyVelocity}/wk, stock: ${i.currentStock})`)
          .join('; ');
      }

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          context: {
            storeName: activeStoreName,
            role: workerRole,
            activeTab,
            lowStockCount,
            totalProducts: totalProductsCount,
            totalSalesToday,
            replenishmentSummary: replenishmentData ? replenishmentData.summary : null,
            criticalItemsText,
            fastMoversText
          }
        })
      });

      const data = await response.json();
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Sorry, I could not complete your request. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Error asking AI Assistant:', err);
      const errorMsg: Message = {
        id: `bot-err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Connection Note:** Could not connect to AI service. Please check network or try clicking one of the quick guide topics below.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-sky-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  ROFANI Gemini 3.5 AI Co-Pilot
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Gemini 3.5 AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Instant training, POS workflow steps, KRA rules, and store guidance for staff
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Context Banner */}
        <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between overflow-x-auto gap-4 text-xs">
          <div className="flex items-center gap-3 text-slate-300 shrink-0">
            <span className="flex items-center gap-1 font-semibold text-sky-400">
              <Building2 className="w-3.5 h-3.5" /> {activeStoreName}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Role: <strong className="text-slate-200">{workerRole}</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">View: <strong className="text-slate-200 uppercase">{activeTab}</strong></span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onOpenPredictiveRestock && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPredictiveRestock();
                }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Open Predictive Restock & Velocity Table"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Predictive Restock</span>
              </button>
            )}
            {lowStockCount > 0 && (
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[11px] font-bold">
                ⚠️ {lowStockCount} items low in stock
              </span>
            )}
            <span className="text-slate-400 text-[11px]">
              Today Sales: <strong className="text-emerald-400 font-mono">KSh {totalSalesToday.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Quick Topic Chips */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800/60 overflow-x-auto flex items-center gap-2 no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Lightbulb className="w-3 h-3 text-amber-400" /> Quick Topics:
          </span>
          {QUICK_QUESTIONS.map((q, idx) => {
            const Icon = q.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(q.prompt)}
                disabled={loading}
                className="bg-slate-800/80 hover:bg-indigo-900/40 text-slate-200 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/40 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 shrink-0"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
                {q.label}
              </button>
            );
          })}
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-900/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[88%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                  msg.sender === 'user'
                    ? 'bg-sky-600'
                    : 'bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-600/30'
                }`}
              >
                {msg.sender === 'user' ? 'You' : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-sky-600 text-white font-medium rounded-tr-none'
                    : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none shadow-xl'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-white/10 text-[10px] text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-indigo-300">
                    {msg.sender === 'user' ? 'Worker Question' : 'AI Assistant Guide'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="text-slate-400 hover:text-slate-200 transition"
                        title="Copy guide text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="whitespace-pre-wrap space-y-1 font-sans">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-[80%] mr-auto items-center text-xs text-indigo-400 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
              <span>ROFANI AI Co-Pilot is thinking & retrieving staff steps...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything (e.g., 'How do I void an invoice?' or 'How do I check electronics stock?')..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-2xl text-xs transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
