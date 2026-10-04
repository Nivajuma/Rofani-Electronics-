import JsBarcode from 'jsbarcode';

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
    description: '4 cols × 16 rows. Most economical format for Name + Barcode with HP & office printers.',
    recommendedFor: 'Item Name + Barcode (No Price) on HP/Deskjet printers',
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
    description: '4 cols × 10 rows. Standard retail die-cut sheet. Extra vertical height makes it very easy to align.',
    recommendedFor: 'Easy alignment & general boutique/retail items',
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
    description: '5 cols × 13 rows. Compact stickers for small items, cables, earphones, and accessories.',
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
    description: 'Standard single-roll sticker for Xprinter, Rongta, Zebra thermal barcode printers.',
    recommendedFor: 'Dedicated thermal POS barcode printers',
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
    description: 'Wide thermal label for longer product names.',
    recommendedFor: 'Longer product names on thermal printers',
  },
];

/**
 * Generate a random 13-digit EAN-13 / Code128 style barcode string
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

/**
 * Render a barcode onto an HTML SVG (crisp vector) or Canvas element and return Data URL.
 * Produces 100% sharp vector SVG with #000000 on #FFFFFF, quiet zones (>=10px),
 * and optimized bar proportions for camera and hardware laser scanners.
 */
export const generateBarcodeDataUrl = (
  barcodeValue: string,
  text?: string,
  options?: {
    height?: number;
    quietZone?: number;
    fontSize?: number;
  }
): string => {
  if (!barcodeValue) return '';

  const quietZone = Math.max(10, options?.quietZone ?? 12); // At least 10px quiet zone on both sides
  const height = options?.height ?? 58; // Increased bar height relative to sticker height
  const fontSize = options?.fontSize ?? 8.5; // Compact font size to maximize vertical bar visibility
  const displayText = text !== undefined ? text : barcodeValue;

  // 1. Try vector SVG first: infinite DPI, mathematically crisp edges, zero blurring on any printer
  if (typeof document !== 'undefined' && typeof XMLSerializer !== 'undefined') {
    try {
      const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svgNode, barcodeValue, {
        format: 'CODE128',
        lineColor: '#000000',
        background: '#FFFFFF',
        width: 2,
        height,
        displayValue: true,
        text: displayText,
        fontSize,
        font: 'monospace',
        fontOptions: 'bold',
        textMargin: 1,
        margin: 0,
        marginLeft: quietZone,
        marginRight: quietZone,
        marginTop: 2,
        marginBottom: 2,
      });

      svgNode.setAttribute('preserveAspectRatio', 'none');
      svgNode.setAttribute('shape-rendering', 'crispEdges');
      // Ensure all child rects inside the SVG also have crispEdges
      const rects = svgNode.querySelectorAll('rect');
      rects.forEach((r) => r.setAttribute('shape-rendering', 'crispEdges'));

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgNode);
      if (svgString && svgString.includes('<svg')) {
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      }
    } catch {
      // Fallback to high-DPI canvas
    }
  }

  // 2. High-DPI Canvas fallback with smoothing disabled for razor sharp bars
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        (ctx as any).webkitImageSmoothingEnabled = false;
        (ctx as any).mozImageSmoothingEnabled = false;
        (ctx as any).msImageSmoothingEnabled = false;
      }
      JsBarcode(canvas, barcodeValue, {
        format: 'CODE128',
        lineColor: '#000000',
        background: '#FFFFFF',
        width: 2,
        height,
        displayValue: true,
        text: displayText,
        fontSize,
        font: 'monospace',
        fontOptions: 'bold',
        textMargin: 1,
        margin: 0,
        marginLeft: quietZone,
        marginRight: quietZone,
        marginTop: 2,
        marginBottom: 2,
      });
      return canvas.toDataURL('image/png');
    } catch (canvasErr) {
      console.error('Failed to generate barcode canvas:', canvasErr);
    }
  }

  return '';
};

/**
 * Print barcode label sheet for an item (defaults to only item name and barcode on stickers)
 */
export const printBarcodeLabels = (
  productName: string,
  price: number | string,
  barcode: string,
  count: number = 8,
  includePrice: boolean = false
) => {
  const numPrice = typeof price === 'number' ? price : (parseFloat(String(price)) || 0);
  const dataUrl = generateBarcodeDataUrl(barcode, barcode, { height: 56, quietZone: 12, fontSize: 8.5 });
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  let labelsHtml = '';
  for (let i = 0; i < count; i++) {
    labelsHtml += `
      <div style="border: 1px dashed #cbd5e1; padding: 4px 6px; border-radius: 4px; text-align: center; width: 180px; box-sizing: border-box; background: #ffffff; page-break-inside: avoid; display: flex; flex-direction: column; justify-content: space-between; align-items: center; min-height: 80px;">
        <div style="font-size: clamp(8px, 2.2vw, 11px); font-weight: 800; font-family: sans-serif; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #000000; line-height: 1.1; word-break: break-word; text-align: center; width: 100%; margin-bottom: 2px;">
          ${productName}
        </div>
        ${includePrice ? `
        <div style="font-size: 11px; font-weight: 800; color: #0284c7; font-family: sans-serif; margin: 1px 0; line-height: 1;">
          KSh ${Math.round(numPrice).toLocaleString()}
        </div>
        ` : ''}
        <div style="width: 100%; flex: 1 1 auto; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 0;">
          <img src="${dataUrl}" style="max-width: 100%; width: 100%; height: auto; max-height: 48px; display: block; margin: 0 auto; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; image-rendering: pixelated;" alt="${barcode}" />
        </div>
      </div>
    `;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Barcode Labels - ${productName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 20px; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
          @media print {
            body { margin: 0; background: transparent; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0; font-size: 18px; color: #000000;">Barcode Label Sheet (${count} labels)</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Format: <strong>${includePrice ? `Item Name + Price (KSh ${Math.round(numPrice).toLocaleString()}) + Barcode` : 'Only Item Name + Barcode'}</strong></p>
          </div>
          <button onclick="window.print()" style="padding: 10px 20px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Print Labels</button>
        </div>
        <div class="grid">
          ${labelsHtml}
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Print batch barcode labels for multiple products or entire catalog with tailored sheet formats
 */
export const printBatchBarcodes = (
  items: { name: string; price?: number; barcode: string; count?: number }[],
  title: string = 'All Inventory Items Barcode Catalog',
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

  const barHeight = preset.heightMm <= 18 ? 44 : preset.heightMm <= 26 ? 56 : 64;

  items.forEach((item) => {
    if (!item.barcode) return;
    const count = item.count && item.count > 0 ? item.count : 1;
    const dataUrl = generateBarcodeDataUrl(item.barcode, item.barcode, {
      height: barHeight,
      quietZone: 12,
      fontSize: 8.5,
    });

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
          <div class="barcode-wrapper">
            <img src="${dataUrl}" class="barcode-img" alt="${item.barcode}" />
          </div>
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

          .barcode-wrapper {
            width: 100%;
            flex: 1 1 auto;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            min-height: 0;
            margin-top: 1px;
          }

          .barcode-img {
            width: 100%;
            max-width: 100%;
            height: 100%;
            max-height: ${preset.heightMm <= 18 ? '26px' : preset.heightMm <= 26 ? '38px' : '48px'};
            display: block;
            object-fit: contain;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
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
              Format: <strong>${preset.name}</strong> • Total Labels: <strong>${totalLabels}</strong> (${items.length} products)
            </p>
            <div class="instructions-box">
              💡 <strong>HP Printer Advice:</strong> In your print dialog, select <strong>Actual Size (Scale: 100%)</strong> rather than "Fit to Page" for exact alignment with pre-cut sticker lines.
            </div>
          </div>
          <button class="print-btn" onclick="window.print()">Print Labels Now</button>
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
