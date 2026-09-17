import JsBarcode from 'jsbarcode';

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
 * Render a barcode onto an HTML SVG or Canvas element or return base64 Data URL
 */
export const generateBarcodeDataUrl = (barcodeValue: string, text?: string): string => {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcodeValue, {
      format: 'CODE128',
      lineColor: '#0f172a',
      width: 2,
      height: 60,
      displayValue: true,
      text: text || barcodeValue,
      fontSize: 14,
      fontOptions: 'bold',
      margin: 10,
      background: '#ffffff'
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to generate barcode:', err);
    return '';
  }
};

/**
 * Print barcode label sheet for an item
 */
export const printBarcodeLabels = (productName: string, price: number | string, barcode: string, count: number = 8) => {
  const numPrice = typeof price === 'number' ? price : (parseFloat(String(price)) || 0);
  const dataUrl = generateBarcodeDataUrl(barcode, barcode);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  let labelsHtml = '';
  for (let i = 0; i < count; i++) {
    labelsHtml += `
      <div style="border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px; text-align: center; width: 180px; box-sizing: border-box; background: #ffffff;">
        <div style="font-size: 11px; font-weight: bold; font-family: sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${productName}
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #1e293b; font-family: sans-serif; margin: 2px 0;">
          KSh ${numPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <img src="${dataUrl}" style="max-width: 100%; height: 45px;" />
      </div>
    `;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Barcode Labels - ${productName}</title>
        <style>
          body { font-family: sans-serif; margin: 20px; background: #fff; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <h2>Barcode Label Sheet (${count} labels)</h2>
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
 * Print batch barcode labels for multiple products or entire catalog
 */
export const printBatchBarcodes = (
  items: { name: string; price: number; barcode: string; count?: number }[],
  title: string = 'All Inventory Items Barcode Catalog'
) => {
  if (!items || items.length === 0) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  let labelsHtml = '';
  let totalLabels = 0;

  items.forEach((item) => {
    if (!item.barcode) return;
    const count = item.count && item.count > 0 ? item.count : 1;
    const dataUrl = generateBarcodeDataUrl(item.barcode, item.barcode);

    for (let i = 0; i < count; i++) {
      totalLabels++;
      labelsHtml += `
        <div style="border: 1px dashed #cbd5e1; padding: 8px; border-radius: 6px; text-align: center; width: 175px; box-sizing: border-box; background: #ffffff; page-break-inside: avoid;">
          <div style="font-size: 11px; font-weight: bold; font-family: sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #0f172a;">
            ${item.name}
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #0284c7; font-family: sans-serif; margin: 2px 0;">
            KSh ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <img src="${dataUrl}" style="max-width: 100%; height: 42px; display: block; margin: 0 auto;" />
        </div>
      `;
    }
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; margin: 20px; background: #fff; color: #0f172a; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 10px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
          <div>
            <h2 style="margin: 0; font-size: 18px; color: #0f172a;">${title}</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Total Barcode Labels: <strong>${totalLabels}</strong> (${items.length} unique items)</p>
          </div>
          <button onclick="window.print()" style="padding: 10px 20px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">Print Barcode Sheet</button>
        </div>
        <div class="grid">
          ${labelsHtml}
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
};
