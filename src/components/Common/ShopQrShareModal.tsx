import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Check,
  Share2,
  Download,
  ExternalLink,
  Store,
  MessageCircle,
} from 'lucide-react';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_PRIMARY,
  SUPPORT_WHATSAPP_NUMBER,
} from '../../utils/supportConfig';

interface ShopQrShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  storeId?: string;
  referralCode?: string;
}

export const ShopQrShareModal: React.FC<ShopQrShareModalProps> = ({
  isOpen,
  onClose,
  storeName,
  storeId,
  referralCode,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const cleanStoreName = (storeName || 'Rofani POS').trim() || 'Rofani POS';
  const baseUrl =
    typeof window !== 'undefined' &&
    window.location?.origin &&
    !window.location.origin.includes('localhost')
      ? window.location.origin
      : 'https://rofani-electronics.vercel.app';

  const shareUrl = (() => {
    const params = new URLSearchParams();
    if (storeId && storeId.trim()) {
      params.set('store', storeId.trim());
    }
    if (referralCode && referralCode.trim()) {
      params.set('ref', referralCode.trim());
    }
    const qs = params.toString();
    return qs ? `${baseUrl}/?${qs}` : `${baseUrl}/`;
  })();

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    QRCode.toDataURL(shareUrl, {
      width: 440,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const shareCaption =
    `Visit ${cleanStoreName} on Rofani POS!\n` +
    `🔗 Shop Link: ${shareUrl}\n` +
    (referralCode?.trim() ? `🎁 Referral Code: ${referralCode.trim()}\n` : '') +
    `💬 WhatsApp: ${SUPPORT_WHATSAPP_NUMBER} | Support: ${SUPPORT_PHONE_PRIMARY} | ${SUPPORT_EMAIL}`;

  const showToast = (msg: string) => {
    setShareFeedback(msg);
    setTimeout(() => {
      setShareFeedback((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopied(true);
    showToast('Shop link copied to clipboard!');
    setTimeout(() => setCopied(false), 2400);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${cleanStoreName} — Shop Link & QR`,
          text: shareCaption,
          url: shareUrl,
        });
        showToast('Shared successfully!');
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopy();
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareCaption)}`;
  const qrFileName = `${cleanStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'shop'}-qr.png`;

  return (
    <div
      className="fixed inset-0 z-[270] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/35 text-sky-400 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-white truncate">Shop QR &amp; Share Link</h3>
              <p className="text-[11px] text-slate-400 truncate">{cleanStoreName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {shareFeedback && (
            <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-2 rounded-xl flex items-center gap-2 font-semibold">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{shareFeedback}</span>
            </div>
          )}

          {/* Printable / Scannable QR Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col items-center text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-300">
              <Store className="w-3.5 h-3.5" />
              <span>{cleanStoreName}</span>
            </div>

            <div className="bg-white p-3 rounded-2xl shadow-lg border-4 border-slate-800">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`${cleanStoreName} QR Code`}
                  className="w-44 h-44 object-contain"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-500 text-xs font-mono">
                  Generating QR...
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              Customers or staff can scan this QR code or open the link below to access your shop link and invite.
            </p>
          </div>

          {/* Share URL Copy Box */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 block">
              Direct Shareable Shop Link
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 bg-transparent text-xs font-mono text-sky-300 focus:outline-none px-1.5"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleNativeShare}
              className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Link</span>
            </button>

            {qrDataUrl ? (
              <a
                href={qrDataUrl}
                download={qrFileName}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition whitespace-nowrap"
              >
                <Download className="w-4 h-4 text-sky-400" />
                <span>Save QR</span>
              </a>
            ) : (
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition whitespace-nowrap"
              >
                <ExternalLink className="w-4 h-4 text-sky-400" />
                <span>Open Link</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
