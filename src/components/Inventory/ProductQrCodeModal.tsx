import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  QrCode,
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  Package,
  Sparkles,
  Eye,
  Tag,
  AlertCircle,
  CheckCircle2,
  Layers,
  FileDown
} from 'lucide-react';
import { Product } from '../../types';
import { formatKSh } from '../../utils/currency';
import QRCode from 'qrcode';

interface ProductQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  storeName?: string;
  onOpenMiniPage?: (product: Product) => void;
  initialMode?: 'qr_price' | 'qr_only';
}

/**
 * Canvas utility to draw clean rounded rectangles across all browsers
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Canvas text wrap helper with line truncation ellipsis
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 2
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let linesCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      if (linesCount + 1 >= maxLines && n < words.length - 1) {
        ctx.fillText(line.trim() + '...', x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
      linesCount++;
      if (linesCount >= maxLines) break;
    } else {
      line = testLine;
    }
  }

  if (linesCount < maxLines) {
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

export const ProductQrCodeModal: React.FC<ProductQrCodeModalProps> = ({
  isOpen,
  onClose,
  product,
  storeName = 'Rofani Electronics',
  onOpenMiniPage,
  initialMode = 'qr_price',
}) => {
  // Mode selection: 'qr_price' ("Show QR + Price") vs 'qr_only' ("QR Code Only")
  const [exportMode, setExportMode] = useState<'qr_price' | 'qr_only'>(initialMode);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rawQrDataUrl, setRawQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-dismiss toast feedback after 3.5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Construct direct audit URL
  const auditUrl = useMemo(() => {
    if (!product) return '';
    if (typeof window !== 'undefined') {
      const base = `${window.location.origin}${window.location.pathname}`;
      return `${base}?itemAudit=${encodeURIComponent(product.id)}`;
    }
    return `?itemAudit=${encodeURIComponent(product.id)}`;
  }, [product]);

  // Generate base QR code Data URL
  useEffect(() => {
    if (!isOpen || !product || !auditUrl) return;

    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(auditUrl, {
      width: 480,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (isMounted) {
          setRawQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.warn('Failed to generate raw QR code:', err);
        if (isMounted) {
          setIsGenerating(false);
          setToastMessage({
            type: 'error',
            text: 'Failed to generate QR code data.',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, product, auditUrl]);

  // Render to canvas whenever raw QR or export mode changes
  useEffect(() => {
    if (!isOpen || !product || !rawQrDataUrl || !canvasRef.current) return;

    let isCancelled = false;
    setIsGenerating(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const qrImg = new Image();
    qrImg.onload = () => {
      if (isCancelled) return;

      if (exportMode === 'qr_only') {
        // --- 1. QR CODE ONLY MODE (Clean 500x500 high-resolution symbol) ---
        canvas.width = 500;
        canvas.height = 500;

        // Clean white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw centered QR code image with silent margin
        const qrSize = 440;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = (canvas.height - qrSize) / 2;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } else {
        // --- 2. SHOW QR + PRICE MODE (Complete Shelf Label with Item Name, SKU & Price in KSh) ---
        canvas.width = 600;
        canvas.height = 760;

        // Card Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Outer Card Border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 24);
        ctx.stroke();

        // 1. Store Header Banner
        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(storeName.toUpperCase(), canvas.width / 2, 45);

        // Header separator line
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(35, 60);
        ctx.lineTo(canvas.width - 35, 60);
        ctx.stroke();

        // 2. Product Name (wrapped up to 2 lines)
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        const nextY = wrapCanvasText(ctx, product.name, canvas.width / 2, 95, 520, 30, 2);

        // 3. Category & Variant Line
        const catVariantText = [
          product.category,
          product.subcategory,
          product.sizeCapacity
        ].filter(Boolean).join(' • ');

        ctx.fillStyle = '#64748b';
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(catVariantText || 'Retail Inventory', canvas.width / 2, nextY + 6);

        // 4. SKU & Barcode Row
        ctx.fillStyle = '#334155';
        ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        const skuLine = `SKU: ${product.sku}   |   BARCODE: ${product.barcode}`;
        ctx.fillText(skuLine, canvas.width / 2, nextY + 28);

        // 5. Price & Stock Pill Badge Container
        const priceBoxY = nextY + 44;
        const priceBoxHeight = 56;
        const priceBoxWidth = 520;
        const priceBoxX = (canvas.width - priceBoxWidth) / 2;

        // Price Container Background
        ctx.fillStyle = '#f0fdf4';
        drawRoundedRect(ctx, priceBoxX, priceBoxY, priceBoxWidth, priceBoxHeight, 14);
        ctx.fill();
        ctx.strokeStyle = '#bbf7d0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Price Text in Kenyan Shillings (KSh)
        ctx.fillStyle = '#15803d';
        ctx.font = '900 28px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        ctx.textAlign = 'left';
        const formattedPrice = formatKSh(product.sellingPrice, { showDecimals: true });
        ctx.fillText(formattedPrice, priceBoxX + 24, priceBoxY + 38);

        // Current Stock Indicator on the right
        ctx.fillStyle = '#0369a1';
        ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Stock: ${product.stockQuantity} ${product.unit}`, priceBoxX + priceBoxWidth - 24, priceBoxY + 35);

        // 6. QR Code Image in Center
        const qrSize = 310;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = priceBoxY + priceBoxHeight + 22;

        // Inner white plate with subtle shadow box
        ctx.fillStyle = '#ffffff';
        drawRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 16);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw the QR image
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // 7. Footer Instructions
        ctx.fillStyle = '#475569';
        ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('STORE MANAGER AUDIT QR • SCAN FOR HISTORY & RESTOCK BATCHES', canvas.width / 2, qrY + qrSize + 32);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        ctx.fillText(auditUrl, canvas.width / 2, qrY + qrSize + 48);
      }

      setIsGenerating(false);
    };

    qrImg.onerror = () => {
      if (!isCancelled) {
        setIsGenerating(false);
        setToastMessage({
          type: 'error',
          text: 'Failed to load QR code image into canvas.',
        });
      }
    };

    qrImg.src = rawQrDataUrl;

    return () => {
      isCancelled = true;
    };
  }, [isOpen, product, rawQrDataUrl, exportMode, storeName, auditUrl]);

  if (!isOpen || !product) return null;

  /**
   * Primary PNG Export Handler Function:
   * 1. Targets the generated QR code <canvas> element via canvasRef
   * 2. Converts element into high-resolution PNG image blob using canvas.toDataURL('image/png') or URL.createObjectURL()
   * 3. Programmatically triggers an automatic file download using a temporary <a> element with [SKU]-QRCode.png (e.g. SKU-88912-QRCode.png)
   * 4. Gracefully displays a toast or alert message indicating the QR code is still generating if canvas isn't rendered yet
   */
  const downloadQRCode = () => {
    const canvas = canvasRef.current;
    if (!canvas || isGenerating) {
      setToastMessage({
        type: 'warning',
        text: 'QR code is still generating. Please wait a moment.',
      });
      return;
    }

    try {
      // Requirement: Filename pattern set to [SKU]-QRCode.png (e.g., SKU-88912-QRCode.png)
      const rawSku = product.sku ? product.sku.trim() : 'PROD';
      const sanitizedSku = rawSku.replace(/[^a-zA-Z0-9_-]/g, '_');
      const downloadFileName = `${sanitizedSku}-QRCode.png`;

      const triggerDownloadAnchor = (hrefUrl: string) => {
        const link = document.createElement('a');
        link.href = hrefUrl;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      // Convert using Blob & URL.createObjectURL with fallback to canvas.toDataURL('image/png')
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const dataUrl = canvas.toDataURL('image/png', 1.0);
              if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
                setToastMessage({
                  type: 'error',
                  text: 'QR code canvas is not rendered yet. Please wait a moment.',
                });
                return;
              }
              triggerDownloadAnchor(dataUrl);
            } else {
              const blobUrl = URL.createObjectURL(blob);
              triggerDownloadAnchor(blobUrl);
              setTimeout(() => {
                try {
                  URL.revokeObjectURL(blobUrl);
                } catch (_) {}
              }, 4000);
            }

            setToastMessage({
              type: 'success',
              text: `Exported ${downloadFileName} successfully!`,
            });
          },
          'image/png',
          1.0
        );
      } else {
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
          setToastMessage({
            type: 'error',
            text: 'QR code canvas is not rendered yet. Please wait a moment.',
          });
          return;
        }
        triggerDownloadAnchor(dataUrl);
        setToastMessage({
          type: 'success',
          text: `Exported ${downloadFileName} successfully!`,
        });
      }
    } catch (err) {
      console.error('Failed to export QR code PNG:', err);
      setToastMessage({
        type: 'error',
        text: 'Failed to export QR code. Please try again.',
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(auditUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      setToastMessage({
        type: 'success',
        text: 'Audit link copied to clipboard!',
      });
    });
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
    const canvas = canvasRef.current;
    const tagDataUrl = canvas ? canvas.toDataURL('image/png') : rawQrDataUrl;

    const printWindow = window.open('', '_blank', 'width=520,height=720');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shelf Tag - ${product.sku || product.name}</title>
          <style>
            @page { size: auto; margin: 6mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; color: #0f172a; text-align: center; }
            .container { max-width: 380px; margin: 0 auto; text-align: center; }
            img { max-width: 100%; height: auto; display: block; margin: 0 auto; border: 2px dashed #0f172a; border-radius: 12px; }
            .hint { font-size: 10px; color: #64748b; margin-top: 8px; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            ${tagDataUrl ? `<img src="${tagDataUrl}" alt="Shelf Tag" />` : ''}
            <div class="hint">Print Quality: 300 DPI • Scan to Audit Item</div>
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
                Direct link to item history, stock level & restock batches
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Toast / Error Alert Message Banner */}
          {toastMessage && (
            <div
              className={`p-3 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold shadow-lg animate-in fade-in transition ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/90 border border-emerald-500/40 text-emerald-200'
                  : toastMessage.type === 'warning'
                  ? 'bg-amber-950/90 border border-amber-500/40 text-amber-200'
                  : 'bg-rose-950/90 border border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {toastMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span className="truncate">{toastMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="p-1 hover:bg-white/10 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Product Info Strip */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-xs sm:text-sm truncate">{product.name}</h4>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                <span>SKU: <strong className="text-slate-200">{product.sku}</strong></span>
                <span>•</span>
                <span>Barcode: <strong className="text-sky-300">{product.barcode}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-xs mt-1">
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  {formatKSh(product.sellingPrice, { showDecimals: true })}
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300">
                  Stock: {product.stockQuantity} {product.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs: Show QR + Price vs QR Code Only */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-400">Export Layout:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                id="btn-qr-mode-price"
                onClick={() => setExportMode('qr_price')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  exportMode === 'qr_price'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Includes Item Name, SKU, and Price in KSh on the shelf tag"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Show QR + Price</span>
              </button>

              <button
                type="button"
                id="btn-qr-mode-only"
                onClick={() => setExportMode('qr_only')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  exportMode === 'qr_only'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Only the clean QR code graphic"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code Only</span>
              </button>
            </div>
          </div>

          {/* Live High-Resolution QR Canvas Container */}
          <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-4 text-center space-y-3 shadow-inner relative overflow-hidden">
            <div className="relative inline-block max-w-full">
              {/* HTML5 Canvas Element targeted by downloadQRCode() */}
              <canvas
                ref={canvasRef}
                id="product-qr-canvas"
                className={`max-w-full h-auto max-h-[300px] object-contain rounded-2xl shadow-xl border border-slate-200 transition ${
                  isGenerating ? 'opacity-30 blur-xs' : 'opacity-100'
                }`}
                style={{ imageRendering: 'crisp-edges' }}
              />

              {/* Generating Loading Overlay */}
              {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 rounded-2xl backdrop-blur-xs text-sky-400">
                  <QrCode className="w-8 h-8 animate-pulse text-sky-400" />
                  <span className="text-xs font-mono font-bold text-slate-200">
                    Generating High-Res QR...
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {exportMode === 'qr_price'
                    ? 'Shelf Tag Preview (Name, SKU, KSh Price & QR)'
                    : 'Pure Symbol Preview (Direct Audit Target)'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                Scan with any mobile camera to view stock level, recent restock batches, and transaction history.
              </p>
            </div>

            {/* Direct Audit Link Bar */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2 flex items-center justify-between gap-2 text-left">
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[270px]">
                {auditUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                title="Copy URL"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* PRIMARY ACTION: "📥 Download PNG" / "Export QR Code" Button */}
          <div>
            <button
              type="button"
              id="btn-download-qrcode"
              onClick={downloadQRCode}
              disabled={isGenerating}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition cursor-pointer active:scale-95 group"
              title={`Download high-resolution PNG image named ${product.sku || 'ITEM'}-QRCode.png`}
            >
              <Download className="w-4 h-4 text-white group-hover:translate-y-0.5 transition" />
              <span>📥 Download PNG</span>
              <span className="text-sky-100 font-bold">• Export QR Code</span>
              <span className="text-sky-200 text-xs font-mono font-normal">
                ({product.sku ? `${product.sku}-QRCode.png` : 'QRCode.png'})
              </span>
            </button>
          </div>

          {/* Secondary Action Grid */}
          <div className="grid grid-cols-3 gap-2">
            {onOpenMiniPage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMiniPage(product);
                }}
                className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Open Manager Stock & Batches Mini-Page"
              >
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>Mini-Page</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintShelfTag}
              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Print Physical Shelf Tag"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print Tag</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-2.5 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Share via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono text-[11px] truncate max-w-[280px]">
            {storeName} • PNG QR Export Terminal
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
