import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  QrCode,
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Package,
  Layers,
  Sparkles,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { Product } from '../../types';
import { formatKSh } from '../../utils/currency';
import QRCode from 'qrcode';

interface ProductQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  storeName?: string;
  onOpenMiniPage: (product: Product) => void;
}

export const ProductQrCodeModal: React.FC<ProductQrCodeModalProps> = ({
  isOpen,
  onClose,
  product,
  storeName = 'Rofani Electronics',
  onOpenMiniPage,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Construct direct audit URL
  const auditUrl = useMemo(() => {
    if (!product) return '';
    if (typeof window !== 'undefined') {
      const base = `${window.location.origin}${window.location.pathname}`;
      return `${base}?itemAudit=${encodeURIComponent(product.id)}`;
    }
    return `?itemAudit=${encodeURIComponent(product.id)}`;
  }, [product]);

  // Generate QR code whenever modal opens or product changes
  useEffect(() => {
    if (!isOpen || !product || !auditUrl) return;

    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(auditUrl, {
      width: 340,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to generate product audit QR code:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, product, auditUrl]);

  if (!isOpen || !product) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(auditUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${product.sku || product.name.replace(/\s+/g, '_')}_Audit.png`;
    a.click();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*ITEM AUDIT QR CODE - ${storeName}*\n` +
      `Product: *${product.name}*\n` +
      `SKU: ${product.sku} | Barcode: ${product.barcode}\n` +
      `Current Stock: ${product.stockQuantity} ${product.unit}\n` +
      `Price: ${formatKSh(product.sellingPrice, { showDecimals: true })}\n\n` +
      `Scan QR or tap to inspect history, stock level & recent restock batches:\n${auditUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handlePrintShelfTag = () => {
    const printWindow = window.open('', '_blank', 'width=480,height=620');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shelf Audit QR Tag - ${product.name}</title>
          <style>
            @page { size: auto; margin: 8mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 14px; color: #0f172a; text-align: center; }
            .tag { border: 2.5px dashed #0f172a; border-radius: 12px; padding: 16px; max-width: 300px; margin: 0 auto; box-sizing: border-box; }
            .store { font-size: 11px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #0284c7; margin-bottom: 4px; }
            .name { font-size: 16px; font-weight: 900; line-height: 1.25; margin: 6px 0 4px; }
            .category { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
            .sku { font-size: 11px; font-family: monospace; font-weight: 700; color: #334155; }
            .price { font-size: 22px; font-weight: 900; color: #0f172a; margin: 8px 0; }
            .stock-badge { font-size: 11px; font-weight: 800; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; display: inline-block; margin-bottom: 10px; }
            .qr-wrapper { background: #fff; padding: 6px; border-radius: 8px; display: inline-block; margin: 0 auto 8px; }
            .qr { width: 150px; height: 150px; display: block; }
            .instructions { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; }
            .barcode-text { font-size: 10px; font-family: monospace; color: #64748b; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="store">${storeName}</div>
            <div class="name">${product.name}</div>
            <div class="category">${product.category} ${product.sizeCapacity ? `• ${product.sizeCapacity}` : ''}</div>
            <div class="sku">SKU: ${product.sku}</div>
            <div class="price">${formatKSh(product.sellingPrice, { showDecimals: true })}</div>
            <div class="stock-badge">Stock: ${product.stockQuantity} ${product.unit}</div>
            <div class="qr-wrapper">
              ${qrDataUrl ? `<img src="${qrDataUrl}" class="qr" alt="Audit QR" />` : ''}
            </div>
            <div class="instructions">Store Manager Audit QR • Scan for History & Batches</div>
            <div class="barcode-text">Barcode: ${product.barcode}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Store Manager Audit QR Code
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Scannable direct link to item history, stock level & batches
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Product Info Strip */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center shrink-0">
                <Package className="w-7 h-7" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-sm truncate">{product.name}</h4>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                <span>SKU: <strong className="text-slate-200">{product.sku}</strong></span>
                <span>•</span>
                <span>Barcode: <strong className="text-sky-300">{product.barcode}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-xs mt-1">
                <span className="font-mono font-bold text-emerald-400">
                  {formatKSh(product.sellingPrice, { showDecimals: true })}
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300">
                  Stock: {product.stockQuantity} {product.unit}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-5 text-center space-y-3 shadow-inner">
            <div className="relative inline-block bg-white p-3.5 rounded-2xl shadow-xl">
              {isGenerating ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <QrCode className="w-10 h-10 animate-pulse text-sky-500" />
                  <span className="text-xs font-mono">Generating QR Tag...</span>
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${product.name}`}
                  className="w-56 h-56 object-contain block mx-auto"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-500 text-xs">
                  Failed to generate QR code.
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Scan with Camera to Open Mini-Page</span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                When the store manager scans this QR code with any mobile device, it directly opens the dedicated mini-page showing current stock level, recent restock batches, and transaction history.
              </p>
            </div>

            {/* Direct Audit Link Pill */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2 flex items-center justify-between gap-2 text-left">
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[280px]">
                {auditUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Manager Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMiniPage(product);
              }}
              className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-600/20 cursor-pointer active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>Open Mini-Page</span>
            </button>

            <button
              type="button"
              onClick={handlePrintShelfTag}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Shelf Tag</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Share WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            {storeName} • Inventory Management System
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
