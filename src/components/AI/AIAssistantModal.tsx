import React, { useState, useMemo, useEffect, useRef } from 'react';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  X,
  HelpCircle,
  Lightbulb,
  QrCode,
  ArrowRightLeft,
  Barcode,
  CreditCard,
  Building2,
  Copy,
  Check,
  TrendingUp,
  Package,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Product, Transaction } from '../../types';
import { CustomerCareSupportCard } from '../Common/CustomerCareSupportCard';
import {
  isRateLimitTextOrStatus,
  parseAiHttpResponse,
  RATE_LIMIT_ASSISTANT_MESSAGE,
} from '../../utils/aiErrorHandling';
import {
  AppLanguageCode,
  getAiWelcomeText,
  useI18n,
} from '../../utils/i18n';

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
  isError?: boolean;
  retryPrompt?: string;
}

const QUICK_QUESTIONS = [
  {
    icon: Building2,
    label: 'Add New Shop',
    prompt: 'How do I add a new shop or branch outlet in Rofani POS and switch between stores?',
  },
  {
    icon: Package,
    label: 'Low Stock',
    prompt: 'Which items are currently low on stock or out of stock, and how should I prioritize restocking?',
  },
  {
    icon: TrendingUp,
    label: 'Daily Profit',
    prompt: 'How do I check my daily sales, expenses, and net profit in Rofani POS?',
  },
  {
    icon: CreditCard,
    label: 'M-Pesa Setup',
    prompt: 'How do I configure M-Pesa Till or Paybill payments and verify STK Push checkout?',
  },
  {
    icon: ArrowRightLeft,
    label: 'Stock Transfer',
    prompt: 'How do I transfer stock inventory from one Rofani POS branch to another?',
  },
  {
    icon: Barcode,
    label: 'Barcode & Items',
    prompt: 'How do I add new products using AI photo scan or print barcode labels?',
  },
  {
    icon: HelpCircle,
    label: 'Credit & Debt',
    prompt: 'How do I record a customer credit or partial payment and settle balances later?',
  },
  {
    icon: Sparkles,
    label: 'Plans & Referrals',
    prompt: 'How does the 7-day free trial work, what are the paid plans, and how do I earn +30 days free with referrals?',
  },
  {
    icon: QrCode,
    label: 'Optional Tax',
    prompt: 'How do I customize receipts and enable optional sales tax or levy settings if my shop needs them?',
  },
];

// Clean inline markdown parser: renders **bold**, *italic*, and `code` without raw asterisks
const renderInlineFormatting = (text: string): React.ReactNode[] => {
  const cleaned = text.replace(/\*\*\*/g, '**');
  const tokens: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+?\*\*|`[^`]+?`|\*[^*\s][^*]*?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = pattern.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(cleaned.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={`b-${keyIdx++}`} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={`c-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={`i-${keyIdx++}`} className="italic text-slate-200">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    tokens.push(cleaned.slice(lastIndex));
  }

  // Strip any stray unmatched double asterisks
  return tokens.map((part) =>
    typeof part === 'string' ? part.replace(/\*\*/g, '') : part
  );
};

const renderFormattedMessage = (rawText: string): React.ReactNode => {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');

  return (
    <div className="space-y-1.5 text-xs leading-relaxed break-words">
      {lines.map((rawLine, idx) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          return <div key={`sp-${idx}`} className="h-1" />;
        }

        // Heading lines (### Title, ## Title, # Title)
        const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
        if (headingMatch) {
          return (
            <div
              key={`h-${idx}`}
              className="font-bold text-indigo-300 text-[13px] pt-1 border-b border-slate-800/70 pb-0.5"
            >
              {renderInlineFormatting(headingMatch[1])}
            </div>
          );
        }

        // Bullet lines (- item, * item, • item)
        const bulletMatch = rawLine.match(/^(\s*)(?:[-*•])\s+(.+)$/);
        if (bulletMatch) {
          const isNested = bulletMatch[1].length >= 2;
          return (
            <div
              key={`li-${idx}`}
              className={`flex items-start gap-2 ${isNested ? 'pl-4' : 'pl-0.5'}`}
            >
              <span className="text-sky-400 font-bold leading-5 shrink-0">•</span>
              <span className="flex-1 min-w-0 text-slate-200">
                {renderInlineFormatting(bulletMatch[2])}
              </span>
            </div>
          );
        }

        // Numbered list lines (1. Step one)
        const numMatch = rawLine.match(/^\s*(\d+\.)\s+(.+)$/);
        if (numMatch) {
          return (
            <div key={`ol-${idx}`} className="flex items-start gap-2 pl-0.5">
              <span className="text-indigo-300 font-bold tabular-nums shrink-0">
                {numMatch[1]}
              </span>
              <span className="flex-1 min-w-0 text-slate-200">
                {renderInlineFormatting(numMatch[2])}
              </span>
            </div>
          );
        }

        return (
          <p key={`p-${idx}`} className="text-slate-200">
            {renderInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

const createInitialWelcomeMessage = (
  storeName: string,
  lang: AppLanguageCode
): Message => ({
  id: 'init-1',
  sender: 'assistant',
  text: getAiWelcomeText(lang, storeName),
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

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
  onOpenPredictiveRestock,
}) => {
  const { lang, langConfig, dir, t } = useI18n();
  const [messages, setMessages] = useState<Message[]>(() =>
    safeGetJSON<Message[]>(
      'retail_pos_ai_messages',
      [createInitialWelcomeMessage(activeStoreName, lang)],
      (val) => Array.isArray(val) && val.length > 0
    )
  );
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'init-1') {
        const nextText = getAiWelcomeText(lang, activeStoreName);
        if (prev[0].text !== nextText) {
          return [{ ...prev[0], text: nextText }];
        }
      }
      return prev;
    });
  }, [lang, activeStoreName]);
  useEffect(() => {
    safeSetJSON('retail_pos_ai_messages', messages.slice(-30));
  }, [messages]);

  const [inputQuery, setInputQuery] = useState<string>(() =>
    safeGetJSON<string>('retail_pos_ai_query', '', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_ai_query', inputQuery);
  }, [inputQuery]);

  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requestInFlightRef = useRef(false);
  const lastSendTapRef = useRef(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  // Lightweight store summary computed only while modal is open (never sends raw arrays)
  const lightweightStoreSummary = useMemo(() => {
    if (!isOpen) return null;
    const lowItems = products
      .filter((p) => Number(p.stockQuantity || 0) <= Number(p.minStockAlert ?? 5))
      .slice(0, 5)
      .map((p) => `${p.name} (${Number(p.stockQuantity || 0)} left)`);

    const outOfStockCount = products.filter((p) => Number(p.stockQuantity || 0) <= 0).length;

    return {
      lowItemsPreview: lowItems.join(', '),
      outOfStockCount,
    };
  }, [isOpen, products]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length, loading]);

  if (!isOpen) return null;

  const isAdminRole = /admin|owner/i.test(workerRole || '');
  const userQuestionLabel = isAdminRole ? 'ADMIN QUESTION' : 'WORKER QUESTION';

  const fetchAssistantReply = async (payloadBody: string) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 28000);
    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadBody,
        signal: controller.signal,
      });
      return await parseAiHttpResponse<{ reply?: string; error?: string }>(
        response,
        `AI service returned HTTP ${response.status || 'error'}. Please tap Retry.`,
        RATE_LIMIT_ASSISTANT_MESSAGE
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleSend = async (queryText?: string) => {
    const now = Date.now();
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading || requestInFlightRef.current || cooldownSeconds > 0) return;
    if (now - lastSendTapRef.current < 800) return;

    lastSendTapRef.current = now;
    requestInFlightRef.current = true;

    const userMsg: Message = {
      id: `user-${now}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const payloadBody = JSON.stringify({
        prompt: textToSend,
        context: {
          storeName: activeStoreName,
          role: workerRole,
          activeTab,
          language: lang,
          languageName: langConfig.label,
          lowStockCount,
          outOfStockCount: lightweightStoreSummary?.outOfStockCount ?? 0,
          totalProducts: totalProductsCount,
          totalSalesToday,
          topLowStockText: lightweightStoreSummary?.lowItemsPreview || '',
        },
      });

      const parsed = await fetchAssistantReply(payloadBody);

      if (!parsed.ok || !parsed.data?.reply) {
        if (parsed.isRateLimited) {
          setCooldownSeconds(5);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            sender: 'assistant',
            text: parsed.isRateLimited
              ? `**Rate Limit Reached:** ${RATE_LIMIT_ASSISTANT_MESSAGE}`
              : `**AI Co-Pilot Notice:** ${parsed.errorMessage}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isError: true,
            retryPrompt: textToSend,
          },
        ]);
        return;
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: parsed.data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errMsgText = String(err?.message || '');
      const hitRateLimit = isRateLimitTextOrStatus(undefined, errMsgText);
      if (hitRateLimit) {
        setCooldownSeconds(5);
      }
      console.warn('AI Assistant request could not complete:', errMsgText || err);
      const isTimeout = err?.name === 'AbortError' || /timeout|timed out|aborted/i.test(errMsgText);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'assistant',
          text: hitRateLimit
            ? `**Rate Limit Reached:** ${RATE_LIMIT_ASSISTANT_MESSAGE}`
            : isTimeout
            ? '**Slow Network Timeout:** The response took longer than expected on this connection. Tap Retry below to ask again.'
            : '**Connection Issue:** Could not reach AI Co-Pilot right now. Check your internet connection or use Live Human Support below.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
          retryPrompt: textToSend,
        },
      ]);
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([createInitialWelcomeMessage(activeStoreName, lang)]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-hidden">
      <div className="w-full max-w-md sm:max-w-3xl mx-auto max-h-[88vh] flex flex-col rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-2xl">
        {/* Header */}
        <div className="px-3.5 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500 to-sky-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  {t('ai.title')}
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Gemini AI
                </span>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                  {langConfig.nativeName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                {t('ai.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleResetChat}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
              title="New conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              aria-label="Close AI Co-Pilot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Balanced Sub-Header Context Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between gap-2 px-3 py-2 text-xs shrink-0 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 font-semibold text-sky-400 flex-1 min-w-0 truncate">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{activeStoreName}</span>
            </span>
            <span className="text-slate-600 shrink-0">•</span>
            <span className="text-slate-400 shrink-0 whitespace-nowrap text-[11px]">
              Role: <strong className="text-slate-200">{workerRole}</strong>
            </span>
            <span className="hidden sm:inline text-slate-600 shrink-0">•</span>
            <span className="hidden sm:inline text-slate-400 shrink-0 whitespace-nowrap text-[11px]">
              Today: <strong className="text-emerald-400 font-mono">KSh {totalSalesToday.toLocaleString()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {lowStockCount > 0 && (
              <span
                className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0"
                title={`${lowStockCount} items low in stock`}
              >
                ⚠️ {lowStockCount} <span className="hidden sm:inline">low</span>
              </span>
            )}
            {onOpenPredictiveRestock && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPredictiveRestock();
                }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-2 py-0.5 rounded-lg text-[11px] flex items-center gap-1 shadow-sm transition cursor-pointer whitespace-nowrap shrink-0"
                title="Open Predictive Restock & Velocity Table"
              >
                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                <span>Restock</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Topic Pills (Horizontal Scroll) */}
        <div className="flex items-center px-3 py-1.5 gap-2 overflow-x-auto no-scrollbar shrink-0 bg-slate-950/60 border-b border-slate-800/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 whitespace-nowrap">
            <Lightbulb className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{t('ai.topics')}</span>
          </span>
          {QUICK_QUESTIONS.map((q, idx) => {
            const Icon = q.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q.prompt)}
                disabled={loading || cooldownSeconds > 0}
                className="bg-slate-800/90 hover:bg-indigo-900/50 text-slate-200 hover:text-indigo-200 border border-slate-700/70 hover:border-indigo-500/50 px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{q.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Chat Messages Area */}
        <div
          dir={dir}
          className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5 min-h-[180px] bg-slate-900/50"
        >
          {messages.map((msg) =>
            msg.sender === 'user' ? (
              <div
                key={msg.id}
                className="max-w-[88%] ml-auto px-3.5 py-2.5 rounded-2xl rounded-tr-none bg-sky-600 text-white text-xs font-medium break-words shadow"
              >
                <div className="flex items-center justify-between gap-3 mb-1 pb-1 border-b border-white/15 text-[10px] text-sky-100">
                  <span className="font-bold uppercase tracking-wider">{userQuestionLabel}</span>
                  <span className="text-[10px] opacity-85 shrink-0">{msg.timestamp}</span>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap break-words text-white">
                  {msg.text}
                </p>
              </div>
            ) : (
              <div
                key={msg.id}
                className="w-full max-w-full px-3.5 py-3 rounded-2xl rounded-tl-none bg-slate-950 text-slate-200 border border-slate-800 text-xs min-w-0 break-words shadow-lg"
              >
                <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-white/10 text-[10px] text-slate-300/80">
                  <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-indigo-300">
                    <span className="w-4 h-4 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 text-white inline-flex items-center justify-center shrink-0">
                      <Bot className="w-2.5 h-2.5" />
                    </span>
                    <span>AI Co-Pilot</span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] opacity-80">{msg.timestamp}</span>
                    {!msg.isError && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="text-slate-400 hover:text-slate-200 transition"
                        title="Copy answer"
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

                {renderFormattedMessage(msg.text)}

                {msg.isError && msg.retryPrompt && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleSend(msg.retryPrompt)}
                      disabled={loading || cooldownSeconds > 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold transition disabled:opacity-50"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      {cooldownSeconds > 0 ? `Retry in ${cooldownSeconds}s` : 'Retry Question'}
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {loading && (
            <div className="w-full max-w-full flex items-center gap-2.5 text-xs text-indigo-300 bg-slate-950 px-3.5 py-2.5 rounded-2xl border border-slate-800 shadow">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
              <span>{t('ai.answering')}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Compact Support Block & Input Bar */}
        <div className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2 shrink-0">
          <CustomerCareSupportCard compact title="Need Live Human Support?" />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            dir={dir}
            className="flex items-center gap-2 w-full"
          >
            <input
              type="text"
              placeholder={
                cooldownSeconds > 0
                  ? `Rate limit cooldown (${cooldownSeconds}s)...`
                  : t('ai.askPlaceholder')
              }
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={loading}
              className="flex-1 min-w-0 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading || cooldownSeconds > 0}
              className="shrink-0 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:opacity-50 text-white font-bold px-3 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>{cooldownSeconds > 0 ? `${cooldownSeconds}s` : t('ai.send')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
