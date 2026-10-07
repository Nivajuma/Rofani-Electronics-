import React, { useState } from 'react';
import { MessageSquare, ExternalLink, Check, Copy } from 'lucide-react';
import {
  WhatsAppProductDetails,
  getProductWhatsAppUrl,
  formatProductWhatsAppMessage
} from '../../utils/whatsappShare';

interface WhatsAppNotifyButtonProps {
  product?: WhatsAppProductDetails;
  customerPhone?: string;
  customerName?: string;
  customMessage?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'compact' | 'icon';
  className?: string;
  onShared?: () => void;
}

export const WhatsAppNotifyButton: React.FC<WhatsAppNotifyButtonProps> = ({
  product,
  customerPhone,
  customerName,
  customMessage,
  label = 'Notify Customer on WhatsApp',
  variant = 'primary',
  className = '',
  onShared
}) => {
  const [copied, setCopied] = useState(false);

  // Compute final message and link
  const finalMessage = customMessage || (product ? formatProductWhatsAppMessage(product, customerName) : '');
  const url = product
    ? getProductWhatsAppUrl(product, customerPhone, customerName)
    : `https://wa.me/${(customerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(finalMessage)}`;

  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open WhatsApp in a fresh tab / app protocol safely
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onShared) onShared();
  };

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!finalMessage) return;
    navigator.clipboard.writeText(finalMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleOpenWhatsApp}
        title={label}
        className={`p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center ${className}`}
      >
        <MessageSquare className="w-4 h-4" />
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleOpenWhatsApp}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95 ${className}`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleOpenWhatsApp}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <MessageSquare className="w-4 h-4" />
        <span>{label}</span>
        <ExternalLink className="w-3 h-3 opacity-70" />
      </button>

      {/* Optional fast copy fallback for cashier clipboard */}
      {finalMessage && (
        <button
          type="button"
          onClick={handleCopyText}
          title="Copy WhatsApp Message Text to Clipboard"
          className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};
