import React from 'react';
import { Headphones, MessageCircle, Phone, Mail, ExternalLink } from 'lucide-react';
import {
  SUPPORT_WHATSAPP_NUMBER,
  SUPPORT_WHATSAPP_URL,
  SUPPORT_PHONE_PRIMARY,
  SUPPORT_PHONE_PRIMARY_HREF,
  SUPPORT_PHONE_SECONDARY,
  SUPPORT_PHONE_SECONDARY_HREF,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
} from '../../utils/supportConfig';

interface CustomerCareSupportCardProps {
  compact?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const CustomerCareSupportCard: React.FC<CustomerCareSupportCardProps> = ({
  compact = false,
  title = 'Rofani POS Customer Care',
  subtitle = 'Fast onboarding, M-Pesa Till/Paybill setup & multi-shop backups',
  className = '',
}) => {
  if (compact) {
    return (
      <div
        className={`bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 space-y-1.5 text-xs shrink-0 ${className}`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-200 text-[11px]">
            <Headphones className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{title}</span>
          </span>
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition whitespace-nowrap"
          >
            <MessageCircle className="w-3 h-3 shrink-0" />
            <span>WhatsApp Support: {SUPPORT_WHATSAPP_NUMBER}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-80 shrink-0" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
          <a
            href={SUPPORT_PHONE_PRIMARY_HREF}
            className="inline-flex items-center gap-1 hover:text-sky-400 font-mono font-semibold transition whitespace-nowrap"
          >
            <Phone className="w-3 h-3 text-sky-400 shrink-0" />
            <span>{SUPPORT_PHONE_PRIMARY}</span>
          </a>
          <a
            href={SUPPORT_PHONE_SECONDARY_HREF}
            className="inline-flex items-center gap-1 hover:text-sky-400 font-mono font-semibold transition whitespace-nowrap"
          >
            <Phone className="w-3 h-3 text-sky-400 shrink-0" />
            <span>{SUPPORT_PHONE_SECONDARY}</span>
          </a>
          <a
            href={SUPPORT_EMAIL_HREF}
            className="inline-flex items-center gap-1 hover:text-sky-400 font-medium transition truncate"
          >
            <Mail className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{SUPPORT_EMAIL}</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-3 text-xs shadow-lg ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
          <Headphones className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-white text-sm leading-tight">{title}</h4>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{subtitle}</p>
        </div>
      </div>

      <a
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full min-h-[42px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span>WhatsApp Support: {SUPPORT_WHATSAPP_NUMBER}</span>
        <ExternalLink className="w-3.5 h-3.5 opacity-85 shrink-0" />
      </a>

      <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 inline-flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Call Line 1</span>
          </span>
          <a
            href={SUPPORT_PHONE_PRIMARY_HREF}
            className="font-mono font-bold text-white hover:text-sky-400 transition"
          >
            {SUPPORT_PHONE_PRIMARY}
          </a>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 inline-flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Call Line 2</span>
          </span>
          <a
            href={SUPPORT_PHONE_SECONDARY_HREF}
            className="font-mono font-bold text-white hover:text-sky-400 transition"
          >
            {SUPPORT_PHONE_SECONDARY}
          </a>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <span className="text-slate-400 inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Support Email</span>
          </span>
          <a
            href={SUPPORT_EMAIL_HREF}
            className="font-semibold text-sky-300 hover:text-sky-200 transition break-all"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
};
