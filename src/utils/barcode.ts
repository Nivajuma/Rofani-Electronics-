import QRCode from 'qrcode';

export interface LabelSheetPreset {
  id: string;
  name: string;
  shortName: string;
  category: 'a4_sheet' | 'thermal_roll';
  labelsPerSheet: number;
  widthMm: number;
  heightMm: number;
  columns: number;
  rows: number;
  description: string;
  recommendedFor: string;
}

export const LABEL_SHEET_PRESETS: LabelSheetPreset[] = [
  {
    id: 'a4_64',
    name: 'A4 Sheet — 64 Labels (48.5 × 16.9 mm)',
    shortName: 'A4 64-Up (48.5×16.9mm)',
    category: 'a4_sheet',
    labelsPerSheet: 64,
    widthMm: 48.5,
    heightMm: 16.9,
    columns: 4,
    rows: 16,
    description: '4 cols × 16 rows. Compact stickers for Item Name + QR Code sticker labels.',
    recommendedFor: 'Item Name + QR Code (No Price) on office/laser printers',
  },
  {
    id: 'a4_40',
    name: 'A4 Sheet — 40 Labels (48.5 × 25.4 mm)',
    shortName: 'A4 40-Up (48.5×25.4mm)',
    category: 'a4_sheet',
    labelsPerSheet: 40,
    widthMm: 48.5,
    heightMm: 25.4,
    columns: 4,
    rows: 10,
    description: '4 cols × 10 rows. Standard retail die-cut sheet. Ideal square aspect for QR codes + Price.',
    recommendedFor: 'Easy alignment, QR Code + KSh Price for retail items',
  },
  {
    id: 'a4_65',
    name: 'A4 Sheet — 65 Labels (38.1 × 21.2 mm)',
    shortName: 'A4 65-Up (38.1×21.2mm)',
    category: 'a4_sheet',
    labelsPerSheet: 65,
    widthMm: 38.1,
    heightMm: 21.2,
    columns: 5,
    rows: 13,
    description: '5 cols × 13 rows. Compact QR stickers for accessories, cables, and small items.',
    recommendedFor: 'Small accessories & compact items',
  },
  {
    id: 'thermal_40x30',
    name: 'Thermal Roll — 40 × 30 mm',
    shortName: 'Roll 40×30mm',
    category: 'thermal_roll',
    labelsPerSheet: 1,
    widthMm: 40,
    heightMm: 30,
    columns: 1,
    rows: 1,
    description: 'Standard single-roll sticker for Xprinter, Rongta, Zebra thermal label printers.',
    recommendedFor: 'Dedicated thermal POS label printers',
  },
  {
    id: 'thermal_50x25',
    name: 'Thermal Roll — 50 × 25 mm',
    shortName: 'Roll 50×25mm',
    category: 'thermal_roll',
    labelsPerSheet: 1,
    widthMm: 50,
    heightMm: 25,
    columns: 1,
    rows: 1,
    description: 'Wide thermal label for product names + QR codes.',
    recommendedFor: 'Thermal roll stickers with price and QR',
  },
];

/**
 * Generate a random 13-digit EAN-13 / SKU numeric code string
 */
export const generateAutoBarcode = (): string => {
  const prefix = '890';
  const random8 = Math.floor(10000000 + Math.random() * 90000000).toString();
  const raw = prefix + random8;
  
  // Calculate checksum for EAN-13
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const num = parseInt(raw[i], 10);
    sum += i % 2 === 0 ? num : num * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return raw + checkDigit.toString();
};

export const generateAutoQrCode = generateAutoBarcode;

/**
 * Render a QR code onto an HTML SVG (crisp vector) Data URL synchronously.
 * Produces 100% sharp vector SVG with infinite DPI, zero blurring on any printer,
 * and high scanning reliability.
 */
export const generateQrCodeDataUrl = (
  codeValue: string,
  _text?: string,
  options?: {
    height?: number;
    quietZone?: number;
    fontSize?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): string => {
  if (!codeValue) return '';

  const margin = options?.margin ?? 2;
  const darkColor = options?.darkColor ?? '#000000';
  const lightColor = options?.lightColor ?? '#ffffff';

  try {
    const qr = QRCode.create(codeValue, { errorCorrectionLevel: 'M' });
    const size = qr.modules.size;
    let path = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qr.modules.get(r, c)) {
          path += `M${c + margin},${r + margin}h1v1h-1z`;
        }
      }
    }
    const totalSize = size + margin * 2;
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${lightColor}"/><path d="${path}" fill="${darkColor}"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  } catch (err) {
    console.error('Failed to generate vector QR code SVG:', err);
    return '';
  }
};

// Backwards-compatible alias for existing components
export const generateBarcodeDataUrl = generateQrCodeDataUrl;

/**
 * Print QR code label sheet for an item with toggle for "QR Code + Price (KSh)" or "QR Code Only"
 */
export const printBarcodeLabels = (
  productName: string,
  price: number | string,
  code: string,
  count: number = 8,
  includePrice: boolean = false
) => {
  const numPrice = typeof price === 'number' ? price : (parseFloat(String(price)) || 0);
  const dataUrl = generateQrCodeDataUrl(code);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const modeTitle = includePrice ? 'QR Code + Price (KSh)' : 'QR Code Only';

  let labelsHtml = '';
  for (let i = 0; i < count; i++) {
    labelsHtml += `
      <div class="label-item">
        <div class="product-title">${productName}</div>
        ${includePrice ? `<div class="product-price">KSh ${Math.round(numPrice).toLocaleString()}</div>` : ''}
        <div class="qr-container">
          <img src="${dataUrl}" class="qr-code-img" alt="QR ${code}" />
        </div>
        <div class="code-caption">${code}</div>
      </div>
    `;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print QR Code Labels - ${productName}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 20px;
            background: #fff;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            margin-bottom: 20px;
            padding: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
          }
          .no-print h2 { font-size: 18px; color: #0f172a; margin-bottom: 4px; }
          .no-print p { font-size: 12px; color: #64748b; }
          .btn-group { display: flex; gap: 8px; }
          .btn {
            padding: 9px 18px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            border: none;
            transition: opacity 0.2s;
          }
          .btn-primary { background: #0284c7; color: white; }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
          }
          .label-item {
            border: 1px dashed #cbd5e1;
            padding: 8px;
            border-radius: 6px;
            text-align: center;
            width: 100%;
            background: #ffffff;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            min-height: 100px;
          }
          .product-title {
            font-size: 11px;
            font-weight: 800;
            line-height: 1.15;
            color: #0f172a;
            max-height: 28px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            margin-bottom: 2px;
          }
          .product-price {
            font-size: 13px;
            font-weight: 900;
            color: #0284c7;
            margin: 2px 0;
            line-height: 1;
          }
          .qr-container {
            width: 72px;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 4px auto;
          }
          .qr-code-img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: contain;
            image-rendering: pixelated;
          }
          .code-caption {
            font-size: 9px;
            font-family: monospace;
            color: #475569;
            font-weight: 700;
          }
          @media print {
            body { margin: 0; background: transparent; }
            .no-print { display: none !important; }
            .label-item { border: 1px dashed #94a3b8; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <div>
            <h2>QR Code Sticker Labels (${count} stickers)</h2>
            <p>Layout Mode: <strong>${modeTitle}</strong> • SKU / Code: <strong>${code}</strong></p>
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" onclick="window.print()">Print Labels Now</button>
          </div>
        </div>
        <div class="grid">
          ${labelsHtml}
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const printQrCodeLabels = printBarcodeLabels;

/**
 * Print batch QR code labels for multiple products or catalog with tailored sheet formats
 */
export const printBatchBarcodes = (
  items: { name: string; price?: number; barcode: string; sku?: string; count?: number }[],
  title: string = 'All Inventory Items QR Code Catalog',
  includePrice: boolean = false,
  formatId: string = 'a4_64',
  fontSize: 'small' | 'medium' | 'large' = 'medium',
  storeName?: string
) => {
  if (!items || items.length === 0) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const preset = LABEL_SHEET_PRESETS.find((p) => p.id === formatId) || LABEL_SHEET_PRESETS[0];

  let labelsHtml = '';
  let totalLabels = 0;

  // Dynamic font sizing for labels
  const nameClamp =
    fontSize === 'small' || preset.heightMm < 20
      ? 'clamp(7.5px, 1.8vw, 9.5px)'
      : fontSize === 'large'
      ? 'clamp(9px, 2.5vw, 12.5px)'
      : 'clamp(8px, 2.2vw, 11px)';

  items.forEach((item) => {
    const code = item.barcode || item.sku;
    if (!code) return;
    const count = item.count && item.count > 0 ? item.count : 1;
    const dataUrl = generateQrCodeDataUrl(code);

    for (let i = 0; i < count; i++) {
      totalLabels++;
      labelsHtml += `
        <div class="label-box">
          <div class="label-header">
            ${storeName ? `<span class="store-tag">${storeName}</span>` : ''}
            <div class="product-name" title="${item.name}">${item.name}</div>
          </div>
          ${
            includePrice && item.price !== undefined
              ? `<div class="product-price">KSh ${Math.round(Number(item.price)).toLocaleString()}</div>`
              : ''
          }
          <div class="qr-wrapper">
            <img src="${dataUrl}" class="qr-img" alt="${code}" />
          </div>
          <div class="sku-tag">${code}</div>
        </div>
      `;
    }
  });

  const isThermal = preset.category === 'thermal_roll';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} (${preset.shortName})</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: #f8fafc;
            color: #000000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            background: #ffffff;
            border-bottom: 2px solid #e2e8f0;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            margin-bottom: 16px;
          }

          .no-print h2 { font-size: 18px; color: #0f172a; margin-bottom: 4px; }
          .no-print p { font-size: 12px; color: #64748b; line-height: 1.4; }
          .print-btn {
            background: #0284c7;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 10px 22px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);
          }

          .instructions-box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 11px;
            color: #0369a1;
            margin-top: 6px;
            display: inline-block;
          }

          .sheet-container {
            margin: 0 auto;
            background: #ffffff;
            padding: 8px;
            width: fit-content;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(${preset.columns}, ${preset.widthMm}mm);
            gap: 1.5mm;
            justify-content: center;
          }

          .label-box {
            width: ${preset.widthMm}mm;
            height: ${preset.heightMm}mm;
            border: 1px dashed #cbd5e1;
            border-radius: 3px;
            background: #ffffff;
            padding: 1mm 1.5mm;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            overflow: hidden;
            page-break-inside: avoid;
            box-sizing: border-box;
          }

          .label-header {
            width: 100%;
            overflow: hidden;
            line-height: 1.1;
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }

          .store-tag {
            font-size: 7px;
            font-weight: 900;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: block;
            margin-bottom: 1px;
            line-height: 1;
          }

          .product-name {
            font-size: ${nameClamp};
            font-weight: 800;
            color: #000000;
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.1;
            word-break: break-word;
            width: 100%;
            letter-spacing: -0.2px;
            text-align: center;
          }

          .product-price {
            font-size: 10px;
            font-weight: 800;
            color: #0284c7;
            margin: 0.5mm 0;
            line-height: 1;
            flex-shrink: 0;
          }

          .qr-wrapper {
            width: 100%;
            flex: 1 1 auto;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            min-height: 0;
            margin: 1px 0;
          }

          .qr-img {
            max-width: 100%;
            height: 100%;
            max-height: ${preset.heightMm <= 18 ? '26px' : preset.heightMm <= 26 ? '38px' : '48px'};
            display: block;
            object-fit: contain;
            image-rendering: pixelated;
          }

          .sku-tag {
            font-size: 7px;
            font-family: monospace;
            font-weight: 700;
            color: #475569;
            line-height: 1;
          }

          @media print {
            body { background: transparent; }
            .no-print { display: none !important; }
            .sheet-container { padding: 0; margin: 0; background: transparent; }
            .label-box { border: 1px dashed #e2e8f0; }
            @page {
              size: ${isThermal ? `${preset.widthMm}mm ${preset.heightMm}mm` : 'A4 portrait'};
              margin: ${isThermal ? '0' : '6mm 4mm'};
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <div>
            <h2>${title}</h2>
            <p>
              Format: <strong>${preset.name}</strong> • Mode: <strong>${includePrice ? 'QR Code + Price (KSh)' : 'QR Code Only'}</strong> • Total Labels: <strong>${totalLabels}</strong> (${items.length} products)
            </p>
            <div class="instructions-box">
              💡 <strong>Printer Advice:</strong> Select <strong>Actual Size (Scale: 100%)</strong> rather than "Fit to Page" for exact alignment with pre-cut sticker lines.
            </div>
          </div>
          <button class="print-btn" onclick="window.print()">Print QR Labels Now</button>
        </div>

        <div class="sheet-container">
          <div class="grid">
            ${labelsHtml}
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const printBatchQrCodes = printBatchBarcodes;
