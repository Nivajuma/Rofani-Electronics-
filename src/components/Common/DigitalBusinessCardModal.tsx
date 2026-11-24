import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  CreditCard,
  User as UserIcon,
  Store,
  Phone,
  Mail,
  Link2,
  Upload,
  Trash2,
  Download,
  Share2,
  Check,
  Copy,
  RotateCcw,
  Save,
  MessageCircle,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { DigitalBusinessCard, StoreSubscriptionProfile, User } from '../../types';
import { generateStoreReferralCode } from '../../lib/cloudSync';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_PRIMARY,
  SUPPORT_PHONE_SECONDARY,
} from '../../utils/supportConfig';

export const BUSINESS_CARD_STORAGE_KEY = 'rofani_digital_business_card_v1';

export interface DigitalBusinessCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  storeId?: string;
  currentUser?: User;
  storeProfile?: StoreSubscriptionProfile | null;
  onSaveCard: (card: DigitalBusinessCard) => Promise<void> | void;
}

type AccentKey = 'sky' | 'emerald' | 'amber' | 'indigo';

const ACCENT_PALETTES: Record<
  AccentKey,
  {
    label: string;
    primaryHex: string;
    secondaryHex: string;
    ringClass: string;
    textClass: string;
    borderClass: string;
    badgeBgClass: string;
  }
> = {
  sky: {
    label: 'Ocean Sky',
    primaryHex: '#0ea5e9',
    secondaryHex: '#0284c7',
    ringClass: 'ring-sky-500/40',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/40',
    badgeBgClass: 'bg-sky-500/15',
  },
  emerald: {
    label: 'Emerald',
    primaryHex: '#10b981',
    secondaryHex: '#059669',
    ringClass: 'ring-emerald-500/40',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    badgeBgClass: 'bg-emerald-500/15',
  },
  amber: {
    label: 'Gold',
    primaryHex: '#f59e0b',
    secondaryHex: '#d97706',
    ringClass: 'ring-amber-500/40',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/40',
    badgeBgClass: 'bg-amber-500/15',
  },
  indigo: {
    label: 'Royal Blue',
    primaryHex: '#6366f1',
    secondaryHex: '#4f46e5',
    ringClass: 'ring-indigo-500/40',
    textClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/40',
    badgeBgClass: 'bg-indigo-500/15',
  },
};

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function compressPhotoDataUrl(file: File): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  const img = await loadHtmlImage(rawDataUrl);
  const maxDim = 256;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return rawDataUrl;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let compressed = canvas.toDataURL('image/jpeg', 0.82);
  if (compressed.length > 160000) {
    compressed = canvas.toDataURL('image/jpeg', 0.65);
  }
  return compressed;
}

export const DigitalBusinessCardModal: React.FC<DigitalBusinessCardModalProps> = ({
  isOpen,
  onClose,
  storeName,
  storeId,
  currentUser,
  storeProfile,
  onSaveCard,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultReferralCode = useMemo(() => {
    if (storeProfile?.referralCode?.trim()) {
      return storeProfile.referralCode.trim();
    }
    if (storeProfile?.id || storeId) {
      return generateStoreReferralCode(
        storeProfile?.storeName || storeName || 'Rofani POS',
        storeProfile?.id || storeId || 'rofani-pos'
      );
    }
    return 'ROFANI-POS01';
  }, [storeProfile?.referralCode, storeProfile?.id, storeProfile?.storeName, storeId, storeName]);

  const defaultReferralUrl = useMemo(() => {
    return `https://rofani-electronics.vercel.app/?ref=${encodeURIComponent(defaultReferralCode)}`;
  }, [defaultReferralCode]);

  const buildInitialCard = useCallback((): DigitalBusinessCard => {
    const localSaved = safeGetJSON<DigitalBusinessCard | null>(BUSINESS_CARD_STORAGE_KEY, null);
    const cloudSaved = storeProfile?.businessCard;
    const source = cloudSaved || localSaved;

    const cleanShopName =
      source?.shopName?.trim() ||
      storeProfile?.storeName?.trim() ||
      storeName?.trim() ||
      'Rofani POS';

    const cleanOwnerName =
      source?.ownerName?.trim() ||
      currentUser?.name?.trim() ||
      'Store Owner';

    const cleanPhone =
      source?.phone?.trim() ||
      storeProfile?.phone?.trim() ||
      SUPPORT_PHONE_PRIMARY;

    const cleanEmail =
      source?.email?.trim() ||
      storeProfile?.ownerEmail?.trim() ||
      currentUser?.email?.trim() ||
      SUPPORT_EMAIL;

    const cleanReferral = source?.referralLink?.trim() || defaultReferralUrl;

    return {
      ownerName: cleanOwnerName,
      roleTitle: source?.roleTitle?.trim() || currentUser?.role || 'Founder & Manager',
      tagline: source?.tagline?.trim() || 'Fast Retail Checkout · M-Pesa Enabled',
      photoDataUrl: source?.photoDataUrl || '',
      shopName: cleanShopName,
      phone: cleanPhone,
      whatsapp: source?.whatsapp?.trim() || cleanPhone,
      email: cleanEmail,
      referralLink: cleanReferral,
      accentColor: source?.accentColor || 'sky',
      updatedAt: source?.updatedAt,
    };
  }, [
    storeProfile?.businessCard,
    storeProfile?.storeName,
    storeProfile?.phone,
    storeProfile?.ownerEmail,
    storeName,
    currentUser?.name,
    currentUser?.role,
    currentUser?.email,
    defaultReferralUrl,
  ]);

  const [card, setCard] = useState<DigitalBusinessCard>(() => buildInitialCard());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync from cloud storeProfile / store switch whenever modal opens or store switches
  useEffect(() => {
    if (!isOpen) return;
    setCard(buildInitialCard());
  }, [isOpen, storeId, storeProfile?.id, storeProfile?.businessCard?.updatedAt, buildInitialCard]);

  // Real-time QR code generation for referral / card link
  const effectiveQrUrl = (card.referralLink || '').trim() || defaultReferralUrl;
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    QRCode.toDataURL(effectiveQrUrl, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
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
  }, [isOpen, effectiveQrUrl]);

  if (!isOpen) return null;

  const accent: AccentKey = (card.accentColor as AccentKey) || 'sky';
  const palette = ACCENT_PALETTES[accent] || ACCENT_PALETTES.sky;

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((curr) => (curr === msg ? null : curr));
    }, 3600);
  };

  const updateField = <K extends keyof DigitalBusinessCard>(key: K, value: DigitalBusinessCard[K]) => {
    setCard((prev) => {
      const next = { ...prev, [key]: value };
      safeSetJSON(BUSINESS_CARD_STORAGE_KEY, next);
      return next;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressPhotoDataUrl(file);
      updateField('photoDataUrl', compressed);
      showToast('Photo / logo updated!');
    } catch {
      showToast('Could not read that image file. Try a PNG or JPG image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveToStore = async () => {
    const payload: DigitalBusinessCard = {
      ...card,
      ownerName: card.ownerName.trim() || 'Store Owner',
      roleTitle: (card.roleTitle || '').trim() || 'Founder & Manager',
      tagline: (card.tagline || '').trim(),
      shopName: card.shopName.trim() || storeName || 'Rofani POS',
      phone: card.phone.trim() || SUPPORT_PHONE_PRIMARY,
      whatsapp: (card.whatsapp || card.phone).trim(),
      email: card.email.trim() || SUPPORT_EMAIL,
      referralLink: effectiveQrUrl,
      accentColor: accent,
      updatedAt: new Date().toISOString(),
    };
    setCard(payload);
    safeSetJSON(BUSINESS_CARD_STORAGE_KEY, payload);
    try {
      setIsSaving(true);
      await onSaveCard(payload);
      showToast('Business card saved to your store profile.');
    } catch {
      showToast('Saved locally on this device. Cloud sync will retry automatically.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderCardToPngBlob = async (): Promise<Blob> => {
    const width = 1050;
    const height = 600;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');

    // Deep slate gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.55, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle geometric accent glow (top-right)
    const radial = ctx.createRadialGradient(width - 140, 110, 20, width - 140, 110, 320);
    radial.addColorStop(0, `${palette.primaryHex}33`);
    radial.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // Outer subtle card border
    drawRoundedRectPath(ctx, 20, 20, width - 40, height - 40, 28);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Accent bar along top edge
    drawRoundedRectPath(ctx, 20, 20, width - 40, 10, 5);
    ctx.fillStyle = palette.primaryHex;
    ctx.fill();

    // Avatar / Logo circle (left side)
    const avatarX = 64;
    const avatarY = 74;
    const avatarSize = 112;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    let drewPhoto = false;
    if (card.photoDataUrl) {
      try {
        const photoImg = await loadHtmlImage(card.photoDataUrl);
        const scale = Math.max(avatarSize / photoImg.width, avatarSize / photoImg.height);
        const dw = photoImg.width * scale;
        const dh = photoImg.height * scale;
        ctx.drawImage(
          photoImg,
          avatarX + (avatarSize - dw) / 2,
          avatarY + (avatarSize - dh) / 2,
          dw,
          dh
        );
        drewPhoto = true;
      } catch {
        drewPhoto = false;
      }
    }

    if (!drewPhoto) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.fillStyle = palette.primaryHex;
      ctx.font = '800 44px "Plus Jakarta Sans", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initial = (card.shopName || card.ownerName || 'R').trim().charAt(0).toUpperCase();
      ctx.fillText(initial, avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 2);
    }
    ctx.restore();

    // Avatar ring stroke
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = palette.primaryHex;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Header Text (right of avatar)
    const textLeft = avatarX + avatarSize + 28;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = palette.primaryHex;
    ctx.font = '700 17px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillText((card.shopName || 'Rofani POS').toUpperCase(), textLeft, 102, 460);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 38px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillText(card.ownerName || 'Store Owner', textLeft, 148, 460);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 20px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillText(card.roleTitle || 'Founder & Manager', textLeft, 180, 460);

    if (card.tagline?.trim()) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 18px "Plus Jakarta Sans", "Segoe UI", sans-serif';
      ctx.fillText(card.tagline.trim(), 64, 240, 590);
    }

    // Divider line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(64, 272);
    ctx.lineTo(660, 272);
    ctx.stroke();

    // Contact Details Rows
    const drawContactLine = (label: string, value: string, yPos: number) => {
      ctx.fillStyle = palette.primaryHex;
      ctx.font = '700 14px "Plus Jakarta Sans", "Segoe UI", sans-serif';
      ctx.fillText(label, 64, yPos);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 22px "Plus Jakarta Sans", "Segoe UI", sans-serif';
      ctx.fillText(value, 64, yPos + 28, 590);
    };

    drawContactLine('PHONE / WHATSAPP', card.phone || SUPPORT_PHONE_PRIMARY, 316);
    drawContactLine('EMAIL', card.email || SUPPORT_EMAIL, 392);
    drawContactLine('REFERRAL & SHOP LINK', effectiveQrUrl, 468);

    // Right QR Panel
    const qrPanelX = 700;
    const qrPanelY = 92;
    const qrPanelW = 286;
    const qrPanelH = 382;
    drawRoundedRectPath(ctx, qrPanelX, qrPanelY, qrPanelW, qrPanelH, 24);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // White QR quiet box
    const qrBoxSize = 232;
    const qrBoxX = qrPanelX + (qrPanelW - qrBoxSize) / 2;
    const qrBoxY = qrPanelY + 26;
    drawRoundedRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const qrPngUrl =
      qrDataUrl ||
      (await QRCode.toDataURL(effectiveQrUrl, {
        width: 420,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' },
      }));
    const qrImg = await loadHtmlImage(qrPngUrl);
    ctx.drawImage(qrImg, qrBoxX + 10, qrBoxY + 10, qrBoxSize - 20, qrBoxSize - 20);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 18px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillText('Scan to Connect & Join', qrPanelX + qrPanelW / 2, qrBoxY + qrBoxSize + 44);

    ctx.fillStyle = palette.primaryHex;
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText(defaultReferralCode, qrPanelX + qrPanelW / 2, qrBoxY + qrBoxSize + 72);

    // Bottom support strip
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '600 14px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillText(
      `Powered by Rofani POS · Support: ${SUPPORT_PHONE_PRIMARY} / ${SUPPORT_PHONE_SECONDARY} · ${SUPPORT_EMAIL}`,
      64,
      556,
      width - 128
    );

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode card image.'));
      }, 'image/png');
    });
  };

  const handleDownloadCard = async () => {
    try {
      setIsExporting(true);
      const blob = await renderCardToPngBlob();
      const slug = (card.shopName || card.ownerName || 'rofani-card')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const filename = `${slug || 'rofani'}-business-card.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast(`Downloaded ${filename}!`);
    } catch {
      showToast('Could not export business card image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareCard = async () => {
    const shareText =
      `${card.ownerName || 'Store Owner'} — ${card.shopName || 'Rofani POS'}\n` +
      `📞 ${card.phone}\n` +
      `✉️ ${card.email}\n` +
      `🔗 ${effectiveQrUrl}`;
    try {
      setIsExporting(true);
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          const blob = await renderCardToPngBlob();
          const slug = (card.shopName || 'rofani').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const file = new File([blob], `${slug || 'rofani'}-business-card.png`, {
            type: 'image/png',
          });
          const canShareFiles =
            typeof (navigator as any).canShare === 'function' &&
            (navigator as any).canShare({ files: [file] });
          if (canShareFiles) {
            await navigator.share({
              title: `${card.shopName} — Digital Business Card`,
              text: shareText,
              files: [file],
            });
            showToast('Business card shared!');
            return;
          }
        } catch {
          // Fall through to link share
        }

        await navigator.share({
          title: `${card.shopName} — Digital Business Card`,
          text: shareText,
          url: effectiveQrUrl,
        });
        showToast('Business card details shared!');
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        showToast('Card details & referral link copied to clipboard!');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(shareText).catch(() => {});
        }
        showToast('Card details copied — ready to paste in WhatsApp or email!');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyReferralLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(effectiveQrUrl).catch(() => {});
    }
    setCopiedLink(true);
    showToast('Referral link copied!');
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(
    `*${card.shopName}*\n${card.ownerName}${card.roleTitle ? ` · ${card.roleTitle}` : ''}\n📞 ${card.phone}\n✉️ ${card.email}\n🔗 ${effectiveQrUrl}`
  )}`;

  const initials = (card.shopName || card.ownerName || 'R')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div
      className="fixed inset-0 z-[275] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Digital Business Card Creator"
    >
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/35 text-sky-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                Digital Business Card Creator
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Customize, scan QR &amp; share your store card · Saved per store
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close Business Card Creator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {feedback && (
            <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 font-semibold">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-emerald-300 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN: Editable Fields */}
            <div className="lg:col-span-6 bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-3.5">
              {/* Photo / Logo Upload Row */}
              <div className="flex items-center gap-3.5 pb-3 border-b border-slate-700/70">
                <div
                  className={`w-16 h-16 rounded-2xl bg-slate-900 border-2 ${palette.borderClass} overflow-hidden flex items-center justify-center shrink-0`}
                >
                  {card.photoDataUrl ? (
                    <img
                      src={card.photoDataUrl}
                      alt={card.shopName || 'Logo'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className={`text-lg font-black ${palette.textClass}`}>
                      {initials || 'R'}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="text-xs font-bold text-white">Photo / Shop Logo</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 border border-slate-600 text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      <span>{card.photoDataUrl ? 'Change Photo' : 'Upload Photo / Logo'}</span>
                    </button>
                    {card.photoDataUrl && (
                      <button
                        type="button"
                        onClick={() => updateField('photoDataUrl', '')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal / Owner Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Personal / Owner Name</span>
                  </label>
                  <input
                    type="text"
                    value={card.ownerName}
                    onChange={(e) => updateField('ownerName', e.target.value)}
                    placeholder="e.g. Niva Juma"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={card.roleTitle || ''}
                    onChange={(e) => updateField('roleTitle', e.target.value)}
                    placeholder="Founder & Manager"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Shop Name & Tagline */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-sky-400" />
                  <span>Shop Name</span>
                </label>
                <input
                  type="text"
                  value={card.shopName}
                  onChange={(e) => updateField('shopName', e.target.value)}
                  placeholder="Rofani POS"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tagline / Specialty</span>
                </label>
                <input
                  type="text"
                  value={card.tagline || ''}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  placeholder="Fast Retail Checkout · M-Pesa Enabled"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Phone / WhatsApp & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Phone / WhatsApp</span>
                  </label>
                  <input
                    type="tel"
                    value={card.phone}
                    onChange={(e) => {
                      updateField('phone', e.target.value);
                      updateField('whatsapp', e.target.value);
                    }}
                    placeholder="+254 734 128 888"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    <span>Email</span>
                  </label>
                  <input
                    type="email"
                    value={card.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="rofanipos@gmail.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Referral Link */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Referral Link</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => updateField('referralLink', defaultReferralUrl)}
                    className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Store Link</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={card.referralLink}
                    onChange={(e) => updateField('referralLink', e.target.value)}
                    placeholder={defaultReferralUrl}
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-sky-300 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleCopyReferralLink}
                    className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Copy referral URL"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                  </button>
                </div>
              </div>

              {/* Card Accent Theme Selector */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-semibold text-slate-300">Card Accent</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(ACCENT_PALETTES) as AccentKey[]).map((key) => {
                    const active = accent === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField('accentColor', key)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          active
                            ? 'border-sky-500 bg-sky-950/40 text-white'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ACCENT_PALETTES[key].primaryHex }}
                        />
                        <span className="truncate">{ACCENT_PALETTES[key].label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Business Card Preview + QR Code + Share / Download */}
            <div className="lg:col-span-6 space-y-4">
              {/* Live Executive Dark Business Card Preview */}
              <div
                id="digital-business-card-preview"
                className="bg-slate-800 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl"
              >
                {/* Top Accent Strip */}
                <div
                  className="h-1.5 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${palette.primaryHex}, ${palette.secondaryHex})`,
                  }}
                />

                <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 space-y-4">
                  {/* Top Identity Block */}
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-slate-900 border-2 ${palette.borderClass} overflow-hidden flex items-center justify-center shrink-0 shadow-lg`}
                    >
                      {card.photoDataUrl ? (
                        <img
                          src={card.photoDataUrl}
                          alt={card.shopName || 'Shop Logo'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={`text-xl font-black ${palette.textClass}`}>
                          {initials || 'R'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[11px] font-bold uppercase tracking-wider truncate ${palette.textClass}`}
                      >
                        {card.shopName || 'Rofani POS'}
                      </div>
                      <h4 className="text-lg font-extrabold text-white truncate leading-tight">
                        {card.ownerName || 'Store Owner'}
                      </h4>
                      <p className="text-xs text-slate-300 font-medium truncate">
                        {card.roleTitle || 'Founder & Manager'}
                      </p>
                    </div>
                  </div>

                  {card.tagline?.trim() && (
                    <p className="text-xs text-slate-400 leading-relaxed border-b border-slate-700/70 pb-3">
                      {card.tagline}
                    </p>
                  )}

                  {/* Contact Info + Scannable QR Code Split */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-7 space-y-2.5 text-xs min-w-0">
                      <div className="flex items-start gap-2.5">
                        <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                            Phone / WhatsApp
                          </div>
                          <div className="font-mono font-bold text-white truncate">
                            {card.phone || SUPPORT_PHONE_PRIMARY}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Mail className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                            Email
                          </div>
                          <div className="font-semibold text-slate-100 truncate">
                            {card.email || SUPPORT_EMAIL}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <QrCode className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                            Referral Link
                          </div>
                          <div className="font-mono text-[11px] text-sky-300 break-all line-clamp-2">
                            {effectiveQrUrl}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scannable QR Code Box */}
                    <div className="sm:col-span-5 flex flex-col items-center justify-center bg-slate-900/90 border border-slate-700/70 rounded-xl p-3">
                      <div className="bg-white p-2 rounded-xl shadow-md">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Business Card Referral QR Code"
                            className="w-28 h-28 object-contain"
                          />
                        ) : (
                          <div className="w-28 h-28 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                            QR Loading...
                          </div>
                        )}
                      </div>
                      <span className="mt-2 text-[10px] font-semibold text-slate-300 text-center">
                        Scan to Visit &amp; Join
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Save / Download Card / Share Card / WhatsApp */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  id="btn-save-business-card"
                  onClick={handleSaveToStore}
                  disabled={isSaving}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4 text-sky-400" />
                  <span>{isSaving ? 'Saving...' : 'Save to Store'}</span>
                </button>

                <button
                  type="button"
                  id="btn-download-business-card"
                  onClick={handleDownloadCard}
                  disabled={isExporting}
                  className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-md shadow-sky-900/30"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Rendering...' : 'Download Card'}</span>
                </button>

                <button
                  type="button"
                  id="btn-share-business-card"
                  onClick={handleShareCard}
                  disabled={isExporting}
                  className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Card</span>
                </button>

                <a
                  href={whatsappShareHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </div>

              {/* Support line */}
              <div className="text-[11px] text-slate-400 text-center pt-1">
                Support: {SUPPORT_PHONE_PRIMARY} / {SUPPORT_PHONE_SECONDARY} · {SUPPORT_EMAIL}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
