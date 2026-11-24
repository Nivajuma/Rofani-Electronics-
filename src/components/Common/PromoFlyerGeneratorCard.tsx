import React, { useCallback, useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Download,
  Share2,
  Smartphone,
  Square,
  Sparkles,
  Palette,
  Store,
  LayoutGrid,
  X,
  Printer,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_PRIMARY,
  SUPPORT_PHONE_SECONDARY,
} from '../../utils/supportConfig';

export type FlyerFormat = '1:1' | '9:16';
export type FlyerStyle = 'classic_blue' | 'dark_studio';
export type FlyerTemplate = 'standard_retail' | 'boutique_sale' | 'minimalist';
export type FlyerPdfPaperSize = 'a4' | 'letter' | 'a5';
export type FlyerPdfDpi = 150 | 300 | 600;

export interface FlyerPdfExportOptions {
  logicalWidth: number;
  logicalHeight: number;
  renderToContext?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  fallbackCanvas?: HTMLCanvasElement | null;
  paperSize?: FlyerPdfPaperSize;
  marginMm?: number;
  dpi?: FlyerPdfDpi;
  includeCropMarks?: boolean;
  filename?: string;
  title?: string;
}

const PAPER_DIMENSIONS_MM: Record<FlyerPdfPaperSize, { width: number; height: number; label: string }> = {
  a4: { width: 210, height: 297, label: 'A4 (210 × 297 mm)' },
  letter: { width: 215.9, height: 279.4, label: 'US Letter (8.5 × 11 in)' },
  a5: { width: 148, height: 210, label: 'A5 (148 × 210 mm)' },
};

/**
 * Exports the flyer canvas at high print resolution (scaled cleanly to target DPI and print margins)
 * into a portrait PDF document via jsPDF.
 */
export function exportFlyerCanvasToPdf({
  logicalWidth,
  logicalHeight,
  renderToContext,
  fallbackCanvas,
  paperSize = 'a4',
  marginMm = 10,
  dpi = 300,
  includeCropMarks = true,
  filename = 'rofani-pos-flyer.pdf',
  title = 'Rofani POS Promotional Flyer',
}: FlyerPdfExportOptions): { actualDpi: number; widthMm: number; heightMm: number } {
  const page = PAPER_DIMENSIONS_MM[paperSize];
  const safeMargin = Math.max(0, Math.min(marginMm, Math.min(page.width, page.height) / 3));
  const availW = page.width - safeMargin * 2;
  const availH = page.height - safeMargin * 2;

  const aspect = logicalWidth / logicalHeight;
  let drawW = availW;
  let drawH = drawW / aspect;
  if (drawH > availH) {
    drawH = availH;
    drawW = drawH * aspect;
  }

  const drawX = (page.width - drawW) / 2;
  const drawY = (page.height - drawH) / 2;

  // Compute exact target pixel dimensions from physical print size (inches) * DPI
  const targetPxW = (drawW / 25.4) * dpi;
  const targetPxH = (drawH / 25.4) * dpi;
  const maxCanvasSide = 4096;
  const memoryClamp = Math.min(1, maxCanvasSide / Math.max(targetPxW, targetPxH));
  const scaleFactor = Math.max(1, (targetPxW * memoryClamp) / logicalWidth);

  let sourceCanvas: HTMLCanvasElement | null = null;
  if (renderToContext && typeof document !== 'undefined') {
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(logicalWidth * scaleFactor);
    offscreen.height = Math.round(logicalHeight * scaleFactor);
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      offCtx.save();
      offCtx.scale(scaleFactor, scaleFactor);
      renderToContext(offCtx, logicalWidth, logicalHeight);
      offCtx.restore();
      sourceCanvas = offscreen;
    }
  }

  if (!sourceCanvas) {
    sourceCanvas = fallbackCanvas ?? null;
  }
  if (!sourceCanvas) {
    throw new Error('Flyer canvas is not ready for PDF export.');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: paperSize,
    compress: true,
  });

  pdf.setProperties({
    title,
    subject: 'Print-Ready Promotional Flyer',
    creator: 'Rofani POS',
  });

  const imgData = sourceCanvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST');

  // Optional subtle corner print crop/trim marks when print margin >= 4mm
  if (includeCropMarks && safeMargin >= 4) {
    const gap = 1.2;
    const tick = Math.min(3.8, safeMargin - gap - 0.5);
    if (tick >= 1.5) {
      pdf.setDrawColor(100, 116, 139);
      pdf.setLineWidth(0.25);

      // Top-left
      pdf.line(drawX - gap - tick, drawY, drawX - gap, drawY);
      pdf.line(drawX, drawY - gap - tick, drawX, drawY - gap);
      // Top-right
      pdf.line(drawX + drawW + gap, drawY, drawX + drawW + gap + tick, drawY);
      pdf.line(drawX + drawW, drawY - gap - tick, drawX + drawW, drawY - gap);
      // Bottom-left
      pdf.line(drawX - gap - tick, drawY + drawH, drawX - gap, drawY + drawH);
      pdf.line(drawX, drawY + drawH + gap, drawX, drawY + drawH + gap + tick);
      // Bottom-right
      pdf.line(drawX + drawW + gap, drawY + drawH, drawX + drawW + gap + tick, drawY + drawH);
      pdf.line(drawX + drawW, drawY + drawH + gap, drawX + drawW, drawY + drawH + gap + tick);
    }
  }

  pdf.save(filename);

  const actualDpi = Math.round((sourceCanvas.width / drawW) * 25.4);
  return {
    actualDpi,
    widthMm: Math.round(drawW),
    heightMm: Math.round(drawH),
  };
}

export interface PromoFlyerGeneratorCardProps {
  referralCode: string;
  hasReferralCode: boolean;
  inviteUrl: string;
  promoCaption: string;
  onNotify: (message: string) => void;
}

const FONT_STACK =
  '"Plus Jakarta Sans", "Manrope", "Segoe UI", system-ui, -apple-system, sans-serif';
const MONO_STACK =
  '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace';

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle: string | CanvasGradient
) {
  drawRoundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  strokeStyle: string,
  lineWidth = 2
) {
  drawRoundedRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitTextSingleLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight = '700',
  family = FONT_STACK
): number {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
    size -= 1;
  }
  return minSize;
}

function fitWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  maxLines: number,
  weight = '900',
  family = FONT_STACK
): { size: number; lines: string[] } {
  for (let size = startSize; size >= minSize; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrapTextLines(ctx, text, maxWidth);
    const widest = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
    if (lines.length <= maxLines && widest <= maxWidth) {
      return { size, lines };
    }
  }
  ctx.font = `${weight} ${minSize}px ${family}`;
  const rawLines = wrapTextLines(ctx, text, maxWidth);
  if (rawLines.length <= maxLines) {
    return { size: minSize, lines: rawLines };
  }
  const clamped = rawLines.slice(0, maxLines);
  let last = clamped[maxLines - 1];
  while (last.length > 3 && ctx.measureText(`${last}...`).width > maxWidth) {
    last = last.slice(0, -1).trimEnd();
  }
  clamped[maxLines - 1] = `${last}...`;
  return { size: minSize, lines: clamped };
}

/**
 * Draws Apple, Windows, and Google Play platform icons on the top-right of the blue promo card.
 */
function drawPlatformIcons(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  centerY: number,
  scale = 1
) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  const s = scale;

  // 1. Google Play triangle (far right)
  const playW = 24 * s;
  const playH = 26 * s;
  const playX = rightX - playW;
  const playY = centerY - playH / 2;
  ctx.beginPath();
  ctx.moveTo(playX, playY);
  ctx.lineTo(playX + playW, centerY);
  ctx.lineTo(playX, playY + playH);
  ctx.closePath();
  ctx.fill();

  // Subtle play cross lines
  ctx.strokeStyle = '#4c8ed8';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(playX + 1.5 * s, playY + 2 * s);
  ctx.lineTo(playX + playW * 0.65, centerY + 4 * s);
  ctx.moveTo(playX + 1.5 * s, playY + playH - 2 * s);
  ctx.lineTo(playX + playW * 0.65, centerY - 4 * s);
  ctx.stroke();

  // 2. Windows 4-pane grid (middle)
  const winSize = 24 * s;
  const winX = playX - 18 * s - winSize;
  const winY = centerY - winSize / 2;
  const pane = (winSize - 3 * s) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(winX, winY, pane, pane);
  ctx.fillRect(winX + pane + 3 * s, winY, pane, pane);
  ctx.fillRect(winX, winY + pane + 3 * s, pane, pane);
  ctx.fillRect(winX + pane + 3 * s, winY + pane + 3 * s, pane, pane);

  // 3. Apple silhouette (left)
  const appX = winX - 28 * s;
  const appY = centerY + 1 * s;
  ctx.beginPath();
  ctx.arc(appX - 4 * s, appY + 1 * s, 8 * s, 0, Math.PI * 2);
  ctx.arc(appX + 4 * s, appY + 1 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
  // Stem leaf
  ctx.beginPath();
  ctx.ellipse(appX + 2 * s, appY - 11 * s, 4.5 * s, 2.5 * s, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Bite cutout
  ctx.fillStyle = '#4e91d8';
  ctx.beginPath();
  ctx.arc(appX + 11.5 * s, appY, 5.2 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws crisp circular contact badge icons (link/globe, phone, email).
 */
function drawContactBadgeIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  kind: 'web' | 'phone' | 'mail'
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  if (kind === 'web') {
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.26, r * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.54, cy);
    ctx.lineTo(cx + r * 0.54, cy);
    ctx.stroke();
  } else if (kind === 'phone') {
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx + r * 0.15, cy - r * 0.15, r * 0.48, Math.PI * 0.65, Math.PI * 1.45);
    ctx.stroke();
    ctx.fillRect(cx - r * 0.36, cy - r * 0.42, r * 0.22, r * 0.22);
    ctx.fillRect(cx + r * 0.14, cy + r * 0.14, r * 0.22, r * 0.22);
  } else {
    ctx.lineWidth = 1.8;
    const ew = r * 1.05;
    const eh = r * 0.72;
    ctx.strokeRect(cx - ew / 2, cy - eh / 2, ew, eh);
    ctx.beginPath();
    ctx.moveTo(cx - ew / 2, cy - eh / 2);
    ctx.lineTo(cx, cy + eh * 0.12);
    ctx.lineTo(cx + ew / 2, cy - eh / 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws the multi-device POS Hardware & Software cluster for the Classic Blue flyer
 * (Desktop/Tablet POS screen, 80mm thermal receipt printer, mini printer, smartphone POS, and handheld Android terminal).
 */
function drawClassicHardwareCluster(
  ctx: CanvasRenderingContext2D,
  areaX: number,
  areaY: number,
  areaW: number,
  areaH: number
) {
  ctx.save();

  // Soft ground shadow beneath hardware cluster
  const groundShadow = ctx.createRadialGradient(
    areaX + areaW * 0.52,
    areaY + areaH * 0.9,
    20,
    areaX + areaW * 0.52,
    areaY + areaH * 0.9,
    areaW * 0.52
  );
  groundShadow.addColorStop(0, 'rgba(9, 20, 44, 0.48)');
  groundShadow.addColorStop(1, 'rgba(9, 20, 44, 0)');
  ctx.fillStyle = groundShadow;
  ctx.fillRect(areaX, areaY + areaH * 0.68, areaW, areaH * 0.34);

  // 1. MAIN TABLET / DESKTOP POS REGISTER (Back Center-Right)
  const tabW = areaW * 0.78;
  const tabH = tabW * 0.68;
  const tabX = areaX + areaW * 0.13;
  const tabY = areaY + areaH * 0.02;

  ctx.save();
  ctx.shadowColor = 'rgba(10, 22, 48, 0.42)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  fillRoundedRect(ctx, tabX, tabY, tabW, tabH, 20, '#111827');
  ctx.restore();
  strokeRoundedRect(ctx, tabX, tabY, tabW, tabH, 20, '#374151', 2.5);

  const scrX = tabX + 12;
  const scrY = tabY + 12;
  const scrW = tabW - 24;
  const scrH = tabH - 24;
  fillRoundedRect(ctx, scrX, scrY, scrW, scrH, 10, '#f8fafc');

  // POS screen top nav
  fillRoundedRect(ctx, scrX, scrY, scrW, 28, 6, '#e2e8f0');
  ctx.fillStyle = '#0f172a';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.max(10, Math.round(scrW * 0.032))}px ${FONT_STACK}`;
  ctx.fillText('Rofani POS · Quick Till', scrX + 10, scrY + 14);

  // Quick action pills on tablet screen
  const pillStripY = scrY + 36;
  const actionPills = [
    { label: 'New Sale', bg: '#2563eb' },
    { label: 'M-Pesa STK', bg: '#16a34a' },
    { label: 'Print', bg: '#0ea5e9' },
    { label: 'Clear', bg: '#ef4444' },
  ];
  let apX = scrX + 10;
  const apW = (scrW - 38) / 4;
  actionPills.forEach((ap) => {
    fillRoundedRect(ctx, apX, pillStripY, apW, 20, 5, ap.bg);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.max(7, Math.round(scrW * 0.022))}px ${FONT_STACK}`;
    ctx.fillText(ap.label, apX + 6, pillStripY + 10);
    apX += apW + 6;
  });

  // Search input + Cart table inside tablet POS
  const tblX = scrX + 10;
  const tblY = pillStripY + 28;
  const tblW = scrW * 0.58;
  const tblH = scrH - 80;
  fillRoundedRect(ctx, tblX, tblY, tblW, 20, 5, '#ffffff');
  strokeRoundedRect(ctx, tblX, tblY, tblW, 20, 5, '#cbd5e1', 1);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `600 8px ${FONT_STACK}`;
  ctx.fillText('Search product or scan barcode...', tblX + 8, tblY + 10);

  fillRoundedRect(ctx, tblX, tblY + 26, tblW, tblH - 26, 6, '#ffffff');
  strokeRoundedRect(ctx, tblX, tblY + 26, tblW, tblH - 26, 6, '#e2e8f0', 1);
  fillRoundedRect(ctx, tblX, tblY + 26, tblW, 18, 4, '#f1f5f9');
  ctx.fillStyle = '#475569';
  ctx.font = `700 8px ${FONT_STACK}`;
  ctx.fillText('Item                     Qty      Total', tblX + 8, tblY + 35);

  const sampleItems = [
    ['Cooking Oil 2L', 'x2', 'KSh 920'],
    ['Sugar 2Kg Pack', 'x1', 'KSh 340'],
    ['Milk 500ml', 'x3', 'KSh 190'],
  ];
  sampleItems.forEach((row, idx) => {
    const ry = tblY + 54 + idx * 20;
    if (ry + 12 < tblY + tblH) {
      ctx.fillStyle = '#0f172a';
      ctx.font = `600 8px ${FONT_STACK}`;
      ctx.fillText(row[0], tblX + 8, ry);
      ctx.fillText(row[1], tblX + tblW * 0.62, ry);
      ctx.fillStyle = '#059669';
      ctx.font = `700 8px ${FONT_STACK}`;
      ctx.fillText(row[2], tblX + tblW - 48, ry);
    }
  });

  // Right checkout panel on tablet screen
  const chkX = tblX + tblW + 8;
  const chkW = scrW - tblW - 28;
  fillRoundedRect(ctx, chkX, tblY, chkW, tblH, 6, '#ffffff');
  strokeRoundedRect(ctx, chkX, tblY, chkW, tblH, 6, '#e2e8f0', 1);
  ctx.fillStyle = '#64748b';
  ctx.font = `700 8px ${FONT_STACK}`;
  ctx.fillText('TOTAL DUE', chkX + 8, tblY + 14);
  ctx.fillStyle = '#0f172a';
  ctx.font = `900 ${Math.max(11, Math.round(scrW * 0.036))}px ${FONT_STACK}`;
  ctx.fillText('KSh 1,450', chkX + 8, tblY + 34);
  fillRoundedRect(ctx, chkX + 8, tblY + 50, chkW - 16, 22, 5, '#16a34a');
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 8px ${FONT_STACK}`;
  ctx.fillText('M-PESA STK', chkX + 14, tblY + 61);
  fillRoundedRect(ctx, chkX + 8, tblY + 78, chkW - 16, 20, 5, '#2563eb');
  ctx.fillStyle = '#ffffff';
  ctx.fillText('COMPLETE', chkX + 16, tblY + 88);

  // 2. 80MM THERMAL RECEIPT PRINTER (Foreground Left)
  const pW = areaW * 0.34;
  const pH = areaH * 0.34;
  const pX = areaX + 2;
  const pY = areaY + areaH - pH - 8;

  // Paper receipt curling upward
  const recW = pW * 0.62;
  const recH = pH * 0.68;
  const recX = pX + pW * 0.19;
  const recY = pY - recH * 0.56;
  ctx.save();
  ctx.translate(recX + recW / 2, recY + recH / 2);
  ctx.rotate(-0.08);
  fillRoundedRect(ctx, -recW / 2, -recH / 2, recW, recH, 5, '#ffffff');
  strokeRoundedRect(ctx, -recW / 2, -recH / 2, recW, recH, 5, '#cbd5e1', 1);
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 9px ${MONO_STACK}`;
  ctx.fillText('ROFANI POS', -recW / 2 + 8, -recH / 2 + 16);
  ctx.fillStyle = '#475569';
  ctx.font = `600 8px ${MONO_STACK}`;
  ctx.fillText('M-PESA PAID', -recW / 2 + 8, -recH / 2 + 31);
  ctx.fillStyle = '#059669';
  ctx.font = `800 9px ${MONO_STACK}`;
  ctx.fillText('KSh 1,450', -recW / 2 + 8, -recH / 2 + 48);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  const prGrad = ctx.createLinearGradient(pX, pY, pX + pW, pY + pH);
  prGrad.addColorStop(0, '#334155');
  prGrad.addColorStop(0.5, '#1e293b');
  prGrad.addColorStop(1, '#0f172a');
  fillRoundedRect(ctx, pX, pY, pW, pH, 18, prGrad);
  ctx.restore();
  strokeRoundedRect(ctx, pX, pY, pW, pH, 18, '#475569', 1.5);
  fillRoundedRect(ctx, pX + pW * 0.14, pY + 12, pW * 0.72, 10, 4, '#020617');
  fillRoundedRect(ctx, pX + 16, pY + pH * 0.42, pW - 32, 10, 5, '#0f172a');
  ctx.beginPath();
  ctx.arc(pX + pW - 22, pY + pH - 22, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e';
  ctx.fill();

  // 3. PORTABLE BLUETOOTH MINI PRINTER (Foreground Center)
  const mpW = areaW * 0.23;
  const mpH = areaH * 0.21;
  const mpX = pX + pW - 14;
  const mpY = areaY + areaH - mpH - 4;

  // Receipt paper sticking out of mini printer
  fillRoundedRect(ctx, mpX + mpW * 0.24, mpY - 34, mpW * 0.52, 42, 4, '#ffffff');
  ctx.fillStyle = '#334155';
  ctx.font = `700 7px ${MONO_STACK}`;
  ctx.fillText('RECEIPT', mpX + mpW * 0.3, mpY - 18);

  const mpGrad = ctx.createLinearGradient(mpX, mpY, mpX, mpY + mpH);
  mpGrad.addColorStop(0, '#1f2937');
  mpGrad.addColorStop(1, '#090d16');
  fillRoundedRect(ctx, mpX, mpY, mpW, mpH, 14, mpGrad);
  strokeRoundedRect(ctx, mpX, mpY, mpW, mpH, 14, '#475569', 1.5);
  ctx.beginPath();
  ctx.arc(mpX + mpW * 0.28, mpY + mpH * 0.55, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();

  // 4. SMARTPHONE POS TERMINAL (Foreground Center-Right)
  const spW = areaW * 0.24;
  const spH = areaH * 0.54;
  const spX = mpX + mpW - 10;
  const spY = areaY + areaH - spH - 4;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  fillRoundedRect(ctx, spX, spY, spW, spH, 20, '#0f172a');
  ctx.restore();
  strokeRoundedRect(ctx, spX, spY, spW, spH, 20, '#64748b', 2.5);

  const sScrX = spX + 6;
  const sScrY = spY + 8;
  const sScrW = spW - 12;
  const sScrH = spH - 16;
  fillRoundedRect(ctx, sScrX, sScrY, sScrW, sScrH, 14, '#ffffff');
  fillRoundedRect(ctx, sScrX, sScrY, sScrW, 34, 8, '#1e3a8a');
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 9px ${FONT_STACK}`;
  ctx.fillText('ROFANI', sScrX + 10, sScrY + 14);
  ctx.fillStyle = '#93c5fd';
  ctx.font = `700 8px ${FONT_STACK}`;
  ctx.fillText('Mobile POS', sScrX + 10, sScrY + 26);

  // Sales card on smartphone
  fillRoundedRect(ctx, sScrX + 8, sScrY + 42, sScrW - 16, 44, 8, '#eff6ff');
  ctx.fillStyle = '#2563eb';
  ctx.font = `700 8px ${FONT_STACK}`;
  ctx.fillText('M-PESA STK', sScrX + 14, sScrY + 56);
  ctx.fillStyle = '#0f172a';
  ctx.font = `900 12px ${FONT_STACK}`;
  ctx.fillText('KSh 48,200', sScrX + 14, sScrY + 74);

  // Mini feature tiles on smartphone
  const tileW = (sScrW - 22) / 2;
  const tileColors = ['#3b82f6', '#10b981', '#0ea5e9', '#f59e0b'];
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const tx = sScrX + 8 + col * (tileW + 6);
    const ty = sScrY + 94 + row * 38;
    if (ty + 30 < sScrY + sScrH - 10) {
      fillRoundedRect(ctx, tx, ty, tileW, 30, 7, tileColors[i]);
    }
  }

  // 5. HANDHELD ANDROID POS TERMINAL WITH RECEIPT & QR (Far Right)
  const hhW = areaW * 0.25;
  const hhH = areaH * 0.63;
  const hhX = areaX + areaW - hhW - 2;
  const hhY = areaY + areaH - hhH - 6;

  // Receipt roll peeking out top of handheld POS
  const hRecW = hhW * 0.66;
  const hRecX = hhX + (hhW - hRecW) / 2;
  const hRecY = hhY - 46;
  fillRoundedRect(ctx, hRecX, hRecY, hRecW, 56, 5, '#ffffff');
  strokeRoundedRect(ctx, hRecX, hRecY, hRecW, 56, 5, '#cbd5e1', 1);
  // Mini QR squares on handheld receipt
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(hRecX + hRecW / 2 - 12, hRecY + 10, 24, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(hRecX + hRecW / 2 - 7, hRecY + 15, 14, 14);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(hRecX + hRecW / 2 - 4, hRecY + 18, 8, 8);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  fillRoundedRect(ctx, hhX, hhY, hhW, hhH, 20, '#111827');
  ctx.restore();
  strokeRoundedRect(ctx, hhX, hhY, hhW, hhH, 20, '#475569', 2.5);

  const hhScrX = hhX + 8;
  const hhScrY = hhY + 14;
  const hhScrW = hhW - 16;
  const hhScrH = hhH - 28;
  fillRoundedRect(ctx, hhScrX, hhScrY, hhScrW, hhScrH, 12, '#0b1630');
  ctx.fillStyle = '#38bdf8';
  ctx.font = `800 9px ${FONT_STACK}`;
  ctx.fillText('ROFANI TILL', hhScrX + 10, hhScrY + 16);

  // App launcher icons grid on handheld terminal
  const iconColors = ['#2563eb', '#16a34a', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6'];
  const icCols = 3;
  const icGap = 8;
  const icSize = (hhScrW - 20 - icGap * (icCols - 1)) / icCols;
  for (let i = 0; i < 6; i++) {
    const c = i % icCols;
    const r = Math.floor(i / icCols);
    const ix = hhScrX + 10 + c * (icSize + icGap);
    const iy = hhScrY + 32 + r * (icSize + 12);
    if (iy + icSize < hhScrY + hhScrH - 36) {
      fillRoundedRect(ctx, ix, iy, icSize, icSize, 7, iconColors[i]);
    }
  }
  fillRoundedRect(ctx, hhScrX + 10, hhScrY + hhScrH - 34, hhScrW - 20, 24, 8, '#16a34a');
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 9px ${FONT_STACK}`;
  ctx.fillText('PAY M-PESA', hhScrX + 18, hhScrY + hhScrH - 22);

  ctx.restore();
}

function drawHardwareShowcase(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  isVertical: boolean
) {
  ctx.save();

  // Stage container
  const stageGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
  stageGrad.addColorStop(0, '#0f1b33');
  stageGrad.addColorStop(1, '#091122');
  fillRoundedRect(ctx, boxX, boxY, boxW, boxH, 28, stageGrad);
  strokeRoundedRect(ctx, boxX, boxY, boxW, boxH, 28, 'rgba(56, 189, 248, 0.28)', 2);

  // Ambient spotlight behind hardware
  const glow = ctx.createRadialGradient(
    boxX + boxW * 0.55,
    boxY + boxH * 0.44,
    20,
    boxX + boxW * 0.55,
    boxY + boxH * 0.44,
    boxW * 0.65
  );
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
  glow.addColorStop(0.55, 'rgba(16, 185, 129, 0.11)');
  glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  fillRoundedRect(ctx, boxX, boxY, boxW, boxH, 28, glow);

  const pad = isVertical ? 34 : 24;
  const contentW = boxW - pad * 2;
  const contentH = boxH - pad * 2 - 48;
  const originX = boxX + pad;
  const originY = boxY + pad;

  // 1. LAPTOP RUNNING ROFANI POS DARK-MODE DASHBOARD
  const rawLaptopW = isVertical ? contentW * 0.72 : contentW * 0.85;
  const maxLaptopH = contentH * (isVertical ? 0.56 : 0.72);
  const laptopH = Math.min(rawLaptopW * 0.62, maxLaptopH);
  const laptopW = Math.min(rawLaptopW, laptopH / 0.62);
  const laptopX = originX + (isVertical ? 14 : 4);
  const laptopY = originY + (isVertical ? 20 : 10);

  fillRoundedRect(ctx, laptopX, laptopY, laptopW, laptopH, 16, '#1e293b');
  strokeRoundedRect(ctx, laptopX, laptopY, laptopW, laptopH, 16, '#475569', 2);

  const scrPad = 10;
  const scrX = laptopX + scrPad;
  const scrY = laptopY + scrPad;
  const scrW = laptopW - scrPad * 2;
  const scrH = laptopH - scrPad * 2;
  fillRoundedRect(ctx, scrX, scrY, scrW, scrH, 10, '#070d19');

  // Laptop dashboard header bar
  fillRoundedRect(ctx, scrX + 10, scrY + 10, scrW - 20, 26, 6, '#0f172a');
  ctx.fillStyle = '#38bdf8';
  ctx.font = `800 ${isVertical ? 14 : 11}px ${FONT_STACK}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('ROFANI POS · DASHBOARD', scrX + 20, scrY + 23);

  fillRoundedRect(ctx, scrX + scrW - 76, scrY + 15, 56, 16, 8, 'rgba(16, 185, 129, 0.22)');
  ctx.fillStyle = '#34d399';
  ctx.font = `700 ${isVertical ? 10 : 8}px ${FONT_STACK}`;
  ctx.fillText('ONLINE', scrX + scrW - 64, scrY + 23);

  // Laptop KPI cards
  const kpiY = scrY + 46;
  const kpiW = (scrW - 32) / 3;
  const kpiH = isVertical ? 54 : 42;
  const kpis = [
    { label: 'SALES', val: 'KSh 48.2K', color: '#38bdf8' },
    { label: 'M-PESA', val: 'KSh 31.5K', color: '#34d399' },
    { label: 'STOCK', val: '184 SKUs', color: '#fbbf24' },
  ];
  kpis.forEach((k, idx) => {
    const kx = scrX + 10 + idx * (kpiW + 6);
    fillRoundedRect(ctx, kx, kpiY, kpiW, kpiH, 8, '#111c33');
    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 ${isVertical ? 10 : 8}px ${FONT_STACK}`;
    ctx.fillText(k.label, kx + 8, kpiY + 13);
    ctx.fillStyle = k.color;
    ctx.font = `800 ${isVertical ? 14 : 11}px ${FONT_STACK}`;
    ctx.fillText(k.val, kx + 8, kpiY + (isVertical ? 34 : 28));
  });

  // Laptop chart + live cart panel
  const chartY = kpiY + kpiH + 10;
  const chartH = Math.max(40, scrY + scrH - chartY - 12);
  fillRoundedRect(ctx, scrX + 10, chartY, scrW * 0.56, chartH, 8, '#0f172a');
  const bars = [0.42, 0.68, 0.55, 0.85, 0.72, 0.94];
  const barAreaW = scrW * 0.56 - 24;
  const barGap = 8;
  const barW = (barAreaW - barGap * (bars.length - 1)) / bars.length;
  bars.forEach((ratio, idx) => {
    const bh = Math.max(12, (chartH - 22) * ratio);
    const bx = scrX + 22 + idx * (barW + barGap);
    const by = chartY + chartH - 10 - bh;
    fillRoundedRect(
      ctx,
      bx,
      by,
      barW,
      bh,
      4,
      idx === bars.length - 1 ? '#10b981' : '#38bdf8'
    );
  });

  const miniListX = scrX + 10 + scrW * 0.56 + 8;
  const miniListW = scrW - 28 - scrW * 0.56;
  fillRoundedRect(ctx, miniListX, chartY, miniListW, chartH, 8, '#0f172a');
  const rows = [0.8, 0.65, 0.84];
  rows.forEach((wRatio, idx) => {
    const ry = chartY + 12 + idx * (isVertical ? 24 : 17);
    if (ry + 10 < chartY + chartH) {
      fillRoundedRect(ctx, miniListX + 10, ry, (miniListW - 20) * wRatio, 7, 3, '#334155');
    }
  });

  // Laptop base deck
  const deckW = laptopW + 26;
  const deckX = laptopX - 13;
  const deckY = laptopY + laptopH - 2;
  fillRoundedRect(ctx, deckX, deckY, deckW, 16, 8, '#334155');
  fillRoundedRect(ctx, deckX + deckW * 0.36, deckY + 4, deckW * 0.28, 5, 3, '#64748b');

  // 2. THERMAL RECEIPT PRINTER (bottom-left)
  const printerW = Math.min(isVertical ? contentW * 0.38 : contentW * 0.44, 240);
  const printerH = Math.min(isVertical ? 146 : 112, contentH * 0.46);
  const printerX = originX + (isVertical ? 18 : 10);
  const printerY = originY + contentH - printerH - 6;

  const paperW = printerW * 0.66;
  const paperX = printerX + (printerW - paperW) / 2;
  const paperH = Math.min(isVertical ? 112 : 88, printerH * 0.82);
  const paperY = printerY - paperH + 20;
  fillRoundedRect(ctx, paperX, paperY, paperW, paperH, 6, '#f8fafc');
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 ${isVertical ? 12 : 10}px ${MONO_STACK}`;
  ctx.fillText('ROFANI POS', paperX + 10, paperY + 18);
  ctx.fillStyle = '#64748b';
  ctx.font = `600 ${isVertical ? 10 : 8}px ${MONO_STACK}`;
  ctx.fillText('M-PESA PAID', paperX + 10, paperY + 35);
  fillRoundedRect(ctx, paperX + 10, paperY + 45, paperW - 20, 2, 1, '#cbd5e1');
  ctx.fillStyle = '#059669';
  ctx.font = `800 ${isVertical ? 12 : 9}px ${MONO_STACK}`;
  ctx.fillText('KSh 1,450.00', paperX + 10, paperY + 62);

  const printerBodyGrad = ctx.createLinearGradient(
    printerX,
    printerY,
    printerX,
    printerY + printerH
  );
  printerBodyGrad.addColorStop(0, '#334155');
  printerBodyGrad.addColorStop(1, '#1e293b');
  fillRoundedRect(ctx, printerX, printerY, printerW, printerH, 16, printerBodyGrad);
  strokeRoundedRect(ctx, printerX, printerY, printerW, printerH, 16, '#475569', 2);

  fillRoundedRect(ctx, paperX - 6, printerY + 12, paperW + 12, 10, 4, '#090f1d');
  fillRoundedRect(ctx, printerX + 16, printerY + 38, printerW - 32, 12, 6, '#0f172a');
  ctx.beginPath();
  ctx.arc(printerX + printerW - 24, printerY + printerH - 24, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.font = `700 ${isVertical ? 11 : 9}px ${FONT_STACK}`;
  ctx.fillText('80MM THERMAL', printerX + 16, printerY + printerH - 24);

  // 3. SMARTPHONE POS TERMINAL (right foreground)
  const phoneH = isVertical ? contentH * 0.72 : contentH * 0.82;
  const phoneW = Math.min(isVertical ? contentW * 0.36 : contentW * 0.43, phoneH * 0.54);
  const phoneX = originX + contentW - phoneW - (isVertical ? 14 : 6);
  const phoneY = originY + contentH - phoneH - 4;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  fillRoundedRect(ctx, phoneX, phoneY, phoneW, phoneH, 26, '#0f172a');
  ctx.restore();

  strokeRoundedRect(ctx, phoneX, phoneY, phoneW, phoneH, 26, '#64748b', 3);
  const pScrX = phoneX + 9;
  const pScrY = phoneY + 12;
  const pScrW = phoneW - 18;
  const pScrH = phoneH - 24;
  fillRoundedRect(ctx, pScrX, pScrY, pScrW, pScrH, 18, '#070d19');

  // Phone notch
  fillRoundedRect(ctx, phoneX + phoneW * 0.34, pScrY + 6, phoneW * 0.32, 8, 4, '#1e293b');

  // Phone POS header
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${isVertical ? 15 : 11}px ${FONT_STACK}`;
  ctx.fillText('QUICK SALE', pScrX + 14, pScrY + 34);
  ctx.fillStyle = '#38bdf8';
  ctx.font = `700 ${isVertical ? 12 : 9}px ${FONT_STACK}`;
  ctx.fillText('Mobile POS', pScrX + 14, pScrY + 52);

  // STK Prompt success card
  const stkY = pScrY + 72;
  const stkH = isVertical ? 104 : 78;
  const stkGrad = ctx.createLinearGradient(pScrX + 10, stkY, pScrX + pScrW - 10, stkY + stkH);
  stkGrad.addColorStop(0, '#059669');
  stkGrad.addColorStop(1, '#10b981');
  fillRoundedRect(ctx, pScrX + 10, stkY, pScrW - 20, stkH, 12, stkGrad);

  ctx.fillStyle = '#ecfdf5';
  ctx.font = `700 ${isVertical ? 12 : 9}px ${FONT_STACK}`;
  ctx.fillText('M-PESA STK PROMPT', pScrX + 20, stkY + 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${isVertical ? 22 : 16}px ${FONT_STACK}`;
  ctx.fillText('KSh 1,450', pScrX + 20, stkY + (isVertical ? 54 : 44));
  ctx.fillStyle = '#d1fae5';
  ctx.font = `700 ${isVertical ? 12 : 9}px ${FONT_STACK}`;
  ctx.fillText('Prompt Sent ✓', pScrX + 20, stkY + (isVertical ? 82 : 64));

  const itemStartY = stkY + stkH + 14;
  for (let i = 0; i < 3; i++) {
    const iy = itemStartY + i * (isVertical ? 34 : 26);
    if (iy + 24 < pScrY + pScrH - 46) {
      fillRoundedRect(ctx, pScrX + 10, iy, pScrW - 20, isVertical ? 24 : 18, 6, '#111c33');
      fillRoundedRect(
        ctx,
        pScrX + 18,
        iy + (isVertical ? 8 : 6),
        (pScrW - 50) * 0.65,
        6,
        3,
        '#475569'
      );
    }
  }

  const ctaH = isVertical ? 42 : 32;
  fillRoundedRect(
    ctx,
    pScrX + 10,
    pScrY + pScrH - ctaH - 12,
    pScrW - 20,
    ctaH,
    10,
    '#0284c7'
  );
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${isVertical ? 14 : 10}px ${FONT_STACK}`;
  const btnText = 'PRINT RECEIPT';
  const btnTW = ctx.measureText(btnText).width;
  ctx.fillText(btnText, pScrX + (pScrW - btnTW) / 2, pScrY + pScrH - ctaH / 2 - 12);

  // Bottom capability strip inside showcase box
  const stripY = boxY + boxH - 42;
  fillRoundedRect(ctx, boxX + 18, stripY - 6, boxW - 36, 34, 10, 'rgba(15, 23, 42, 0.88)');
  ctx.fillStyle = '#cbd5e1';
  const capText = 'Stock Control  •  M-Pesa STK  •  Multi-Shop  •  Backups';
  const capSize = fitTextSingleLine(
    ctx,
    capText,
    boxW - 60,
    isVertical ? 18 : 13,
    10,
    '700'
  );
  ctx.font = `700 ${capSize}px ${FONT_STACK}`;
  const capW = ctx.measureText(capText).width;
  ctx.fillText(capText, boxX + (boxW - capW) / 2, stripY + 11);

  ctx.restore();
}

export const PromoFlyerGeneratorCard: React.FC<PromoFlyerGeneratorCardProps> = ({
  referralCode,
  hasReferralCode,
  inviteUrl,
  promoCaption,
  onNotify,
}) => {
  const [format, setFormat] = useState<FlyerFormat>('1:1');
  const [flyerStyle, setFlyerStyle] = useState<FlyerStyle>('classic_blue');
  const [template, setTemplate] = useState<FlyerTemplate>('standard_retail');
  const [customHeadline, setCustomHeadline] = useState('');
  const [customOffer, setCustomOffer] = useState('');
  const [paperSize, setPaperSize] = useState<FlyerPdfPaperSize>('a4');
  const [printMarginMm, setPrintMarginMm] = useState<number>(10);
  const [printDpi, setPrintDpi] = useState<FlyerPdfDpi>(300);
  const [includeCropMarks, setIncludeCropMarks] = useState<boolean>(true);
  const [showPrintSettings, setShowPrintSettings] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const canvasWidth = 1080;
  const canvasHeight = format === '1:1' ? 1080 : 1920;

  const renderClassicBlueFlyer = useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number, isVertical: boolean) => {
      // 1. Clean bright blurred retail header strip at top
      const topStripH = isVertical ? 265 : 192;
      const topGrad = ctx.createLinearGradient(0, 0, W, topStripH + 40);
      topGrad.addColorStop(0, '#f8fafc');
      topGrad.addColorStop(0.5, '#e8eef5');
      topGrad.addColorStop(1, '#f3f6fa');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle warm store-shelf bokeh blobs on the top strip
      const bokehBlobs = [
        { x: W * 0.16, y: topStripH * 0.45, r: 90, color: 'rgba(186, 230, 253, 0.35)' },
        { x: W * 0.46, y: topStripH * 0.3, r: 110, color: 'rgba(253, 230, 138, 0.25)' },
        { x: W * 0.78, y: topStripH * 0.45, r: 100, color: 'rgba(187, 247, 208, 0.32)' },
      ];
      bokehBlobs.forEach((b) => {
        const g = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.r);
        g.addColorStop(0, b.color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, topStripH + 40);
      });

      // Top-Left: "Rofani POS" bold sky/cobalt wordmark with signature dots
      const topPadX = isVertical ? 58 : 54;
      const logoCenterY = isVertical ? 116 : 82;
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#3b82f6';
      ctx.font = `900 ${isVertical ? 82 : 66}px ${FONT_STACK}`;
      const brandWord = 'Rofani';
      ctx.fillText(brandWord, topPadX, logoCenterY);
      const brandW = ctx.measureText(brandWord).width;

      ctx.fillStyle = '#0f172a';
      ctx.font = `900 ${isVertical ? 34 : 26}px ${FONT_STACK}`;
      ctx.fillText('POS', topPadX + brandW + 10, logoCenterY - (isVertical ? 16 : 12));

      ctx.fillStyle = '#64748b';
      ctx.font = `700 ${isVertical ? 20 : 16}px ${FONT_STACK}`;
      ctx.fillText('™', topPadX + brandW + 8, logoCenterY + (isVertical ? 18 : 14));

      // Three signature dots below Rofani wordmark
      const dotY = logoCenterY + (isVertical ? 46 : 36);
      ['#60a5fa', '#3b82f6', '#2563eb'].forEach((col, i) => {
        ctx.beginPath();
        ctx.arc(topPadX + 94 + i * 24, dotY, isVertical ? 5.5 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      });

      // Top-Right: Authentic M-PESA wordmark with mobile icon + red ribbon
      const mpesaRight = W - topPadX;
      ctx.font = `900 ${isVertical ? 66 : 52}px ${FONT_STACK}`;
      const pesaW = ctx.measureText('PESA').width;
      const phoneIconW = isVertical ? 38 : 30;
      const mW = ctx.measureText('M').width;
      const mpesaStartX = mpesaRight - (mW + phoneIconW + 14 + pesaW);

      ctx.fillStyle = '#16a34a';
      ctx.fillText('M', mpesaStartX, logoCenterY);

      // Stylized phone silhouette between M and PESA
      const phX = mpesaStartX + mW + 7;
      const phY = logoCenterY - (isVertical ? 28 : 22);
      const phH = isVertical ? 56 : 44;
      fillRoundedRect(ctx, phX, phY, phoneIconW, phH, 6, '#94a3b8');
      fillRoundedRect(ctx, phX + 4, phY + 7, phoneIconW - 8, phH - 18, 3, '#f8fafc');
      // Red M-Pesa swoosh ribbon
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(phX - 4, logoCenterY - 2);
      ctx.lineTo(phX + phoneIconW + 4, logoCenterY - 9);
      ctx.lineTo(phX + phoneIconW - 2, logoCenterY + 6);
      ctx.lineTo(phX + 2, logoCenterY + 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#16a34a';
      ctx.fillText('PESA', phX + phoneIconW + 7, logoCenterY);

      ctx.fillStyle = '#475569';
      ctx.font = `800 ${isVertical ? 16 : 13}px ${FONT_STACK}`;
      const readyLabel = 'DIRECT STK PUSH READY';
      const readyW = ctx.measureText(readyLabel).width;
      ctx.fillText(readyLabel, mpesaRight - readyW, dotY);

      // 2. MAIN VIBRANT SKY-BLUE / COBALT ROUNDED CARD
      const cardX = isVertical ? 24 : 20;
      const cardY = isVertical ? 228 : 162;
      const cardW = W - cardX * 2;
      const cardH = H - cardY - (isVertical ? 24 : 20);

      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.24)';
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 8;
      const blueGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
      blueGrad.addColorStop(0, '#5a9be0');
      blueGrad.addColorStop(0.5, '#4689d6');
      blueGrad.addColorStop(1, '#3977c6');
      fillRoundedRect(ctx, cardX, cardY, cardW, cardH, 28, blueGrad);
      ctx.restore();

      const innerPad = isVertical ? 48 : 42;
      const contentX = cardX + innerPad;
      const contentW = cardW - innerPad * 2;

      // Top tagline row + Apple/Windows/Play platform icons
      const tagY = cardY + (isVertical ? 48 : 38);
      ctx.fillStyle = '#ffffff';
      const tagline = 'Run Your Business with Peace of Mind';
      const tagSize = fitTextSingleLine(
        ctx,
        tagline,
        contentW - (isVertical ? 170 : 140),
        isVertical ? 32 : 27,
        16,
        '800'
      );
      ctx.font = `800 ${tagSize}px ${FONT_STACK}`;
      ctx.fillText(tagline, contentX, tagY);

      drawPlatformIcons(ctx, contentX + contentW, tagY, isVertical ? 1.05 : 0.88);

      // Bold Italic Uppercase Hero Headline
      const headlineY = tagY + (isVertical ? 76 : 64);
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#ffffff';

      const drawItalicLine = (text: string, x: number, y: number, size: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.transform(1, 0, -0.15, 1, 0, 0);
        ctx.font = `900 ${size}px ${FONT_STACK}`;
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };

      const trimmedHeadline = customHeadline.trim();
      if (!trimmedHeadline) {
        const headlineSize = isVertical ? 66 : 57;
        drawItalicLine('RELIABLE POS FOR', contentX + 10, headlineY, headlineSize);
        drawItalicLine(
          'FAST-MOVING SHOPS',
          contentX + 10,
          headlineY + (isVertical ? 74 : 62),
          headlineSize
        );
      } else {
        const { size: hSize, lines: hLines } = fitWrappedLines(
          ctx,
          trimmedHeadline,
          contentW - 24,
          isVertical ? 64 : 54,
          24,
          2,
          '900'
        );
        const lineStep = Math.round(hSize * 1.12);
        const startY = hLines.length === 1 ? headlineY + lineStep * 0.45 : headlineY;
        hLines.forEach((line, idx) => {
          drawItalicLine(line, contentX + 10, startY + idx * lineStep, hSize);
        });
      }
      ctx.restore();

      // White Rounded Highlight Card ("Free M-Pesa Integration & STK Prompts")
      const boxY = headlineY + (isVertical ? 124 : 106);
      const boxW = isVertical ? contentW : 576;
      const boxH = isVertical ? 156 : 126;

      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 8;
      fillRoundedRect(ctx, contentX, boxY, boxW, boxH, 20, '#ffffff');
      ctx.restore();

      ctx.fillStyle = '#15803d';
      const greenLine1 = 'Free M-Pesa Integration';
      const greenLine2 = '& STK Prompts';
      const gSize = fitTextSingleLine(ctx, greenLine1, boxW - 56, isVertical ? 48 : 38, 22, '800');
      ctx.font = `800 ${gSize}px ${FONT_STACK}`;
      ctx.fillText(greenLine1, contentX + 28, boxY + boxH * 0.34);
      ctx.fillText(greenLine2, contentX + 28, boxY + boxH * 0.72);

      const codeLabel = referralCode || 'ROFANI-POS';

      if (!isVertical) {
        // ==================== 1:1 SQUARE BOTTOM SECTION ====================
        // Dotted-border oval price badge on bottom-left
        const ovalW = 352;
        const ovalH = 148;
        const ovalX = contentX + 4;
        const ovalY = boxY + boxH + 38;
        const ovalCx = ovalX + ovalW / 2;
        const ovalCy = ovalY + ovalH / 2;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ovalCx, ovalCy, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.setLineDash([4, 6]);
        ctx.lineCap = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        const trimmedOffer = customOffer.trim();
        if (!trimmedOffer) {
          ctx.font = `900 48px ${FONT_STACK}`;
          const priceTxt = 'KSh 500/=';
          const priceW = ctx.measureText(priceTxt).width;
          ctx.fillText(priceTxt, ovalCx - priceW / 2, ovalCy - 20);

          ctx.font = `800 32px ${FONT_STACK}`;
          const monthlyTxt = 'Monthly';
          const monthlyW = ctx.measureText(monthlyTxt).width;
          ctx.fillText(monthlyTxt, ovalCx - monthlyW / 2, ovalCy + 28);
        } else {
          const { size: oSize, lines: oLines } = fitWrappedLines(
            ctx,
            trimmedOffer,
            ovalW - 56,
            38,
            17,
            2,
            '900'
          );
          const step = Math.round(oSize * 1.18);
          const firstY = ovalCy - ((oLines.length - 1) * step) / 2;
          ctx.font = `900 ${oSize}px ${FONT_STACK}`;
          oLines.forEach((line, idx) => {
            const lw = ctx.measureText(line).width;
            ctx.fillText(line, ovalCx - lw / 2, firstY + idx * step);
          });
        }

        // Trial + Referral pill cleanly below oval
        const trialY = ovalY + ovalH + 22;
        const trialW = 398;
        fillRoundedRect(ctx, contentX, trialY, trialW, 44, 12, 'rgba(9, 25, 56, 0.36)');
        strokeRoundedRect(ctx, contentX, trialY, trialW, 44, 12, 'rgba(255, 255, 255, 0.32)', 1.5);
        const trialStr = hasReferralCode
          ? `22+7 Days Free  •  Ref: ${codeLabel}`
          : `22 + 7 Days Free Trial  •  ${codeLabel}`;
        const tSize = fitTextSingleLine(ctx, trialStr, trialW - 24, 17, 11, '800');
        ctx.fillStyle = '#fde68a';
        ctx.font = `800 ${tSize}px ${FONT_STACK}`;
        ctx.fillText(trialStr, contentX + 12, trialY + 22);

        // CONTACT US section on bottom-left
        const contactY = trialY + 80;
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 26px ${FONT_STACK}`;
        ctx.fillText('CONTACT US', contentX, contactY);

        const cItems: Array<{ kind: 'web' | 'phone' | 'mail'; text: string }> = [
          { kind: 'web', text: inviteUrl },
          { kind: 'phone', text: `${SUPPORT_PHONE_PRIMARY} / ${SUPPORT_PHONE_SECONDARY}` },
          { kind: 'mail', text: SUPPORT_EMAIL },
        ];

        cItems.forEach((item, idx) => {
          const rowY = contactY + 44 + idx * 45;
          drawContactBadgeIcon(ctx, contentX + 15, rowY, 14, item.kind);
          const itemSize = fitTextSingleLine(ctx, item.text, 378, 20, 12, '700');
          ctx.fillStyle = '#ffffff';
          ctx.font = `700 ${itemSize}px ${FONT_STACK}`;
          ctx.fillText(item.text, contentX + 38, rowY);
        });

        ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
        ctx.font = `700 14px ${FONT_STACK}`;
        ctx.fillText('Web App  •  Android  •  Desktop POS', contentX, contactY + 178);

        // Hardware Showcase Cluster on Bottom-Right
        const hwX = contentX + 416;
        const hwY = boxY + boxH + 18;
        const hwW = contentW - 416 + 14;
        const hwH = cardY + cardH - hwY - 12;
        drawClassicHardwareCluster(ctx, hwX, hwY, hwW, hwH);
      } else {
        // ==================== 9:16 VERTICAL STATUS / TIKTOK LAYOUT ====================
        const offerRowY = boxY + boxH + 34;

        // Dotted oval price badge (left)
        const ovalW = 420;
        const ovalH = 186;
        const ovalCx = contentX + ovalW / 2;
        const ovalCy = offerRowY + ovalH / 2;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ovalCx, ovalCy, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.fill();
        ctx.setLineDash([4, 6]);
        ctx.lineCap = 'round';
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        const trimmedOffer = customOffer.trim();
        if (!trimmedOffer) {
          ctx.font = `900 56px ${FONT_STACK}`;
          const priceTxt = 'KSh 500/=';
          const priceW = ctx.measureText(priceTxt).width;
          ctx.fillText(priceTxt, ovalCx - priceW / 2, ovalCy - 26);

          ctx.font = `800 36px ${FONT_STACK}`;
          const monthlyTxt = 'Monthly';
          const monthlyW = ctx.measureText(monthlyTxt).width;
          ctx.fillText(monthlyTxt, ovalCx - monthlyW / 2, ovalCy + 32);
        } else {
          const { size: oSize, lines: oLines } = fitWrappedLines(
            ctx,
            trimmedOffer,
            ovalW - 64,
            44,
            19,
            2,
            '900'
          );
          const step = Math.round(oSize * 1.18);
          const firstY = ovalCy - ((oLines.length - 1) * step) / 2;
          ctx.font = `900 ${oSize}px ${FONT_STACK}`;
          oLines.forEach((line, idx) => {
            const lw = ctx.measureText(line).width;
            ctx.fillText(line, ovalCx - lw / 2, firstY + idx * step);
          });
        }

        // Trial & Referral Card (right)
        const refX = contentX + ovalW + 24;
        const refW = contentW - ovalW - 24;
        fillRoundedRect(ctx, refX, offerRowY, refW, ovalH, 24, 'rgba(9, 25, 56, 0.42)');
        strokeRoundedRect(ctx, refX, offerRowY, refW, ovalH, 24, 'rgba(255, 255, 255, 0.38)', 2);

        ctx.fillStyle = '#fde68a';
        ctx.font = `800 20px ${FONT_STACK}`;
        ctx.fillText('22 + 7 DAYS FREE TRIAL', refX + 24, offerRowY + 40);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `700 18px ${FONT_STACK}`;
        ctx.fillText(hasReferralCode ? 'USE REFERRAL CODE' : 'START CODE', refX + 24, offerRowY + 84);

        const cSize = fitTextSingleLine(ctx, codeLabel, refW - 48, 36, 18, '800', MONO_STACK);
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${cSize}px ${MONO_STACK}`;
        ctx.fillText(codeLabel, refX + 24, offerRowY + 128);

        // Hardware Cluster Center Stage
        const hwY = offerRowY + ovalH + 38;
        const hwH = 540;
        drawClassicHardwareCluster(ctx, contentX, hwY, contentW, hwH);

        // CONTACT US Footer inside blue card
        const contactBoxY = hwY + hwH + 34;
        const contactBoxH = cardY + cardH - contactBoxY - 26;
        fillRoundedRect(ctx, contentX, contactBoxY, contentW, contactBoxH, 24, 'rgba(9, 25, 56, 0.36)');
        strokeRoundedRect(ctx, contentX, contactBoxY, contentW, contactBoxH, 24, 'rgba(255, 255, 255, 0.28)', 1.5);

        ctx.fillStyle = '#ffffff';
        ctx.font = `900 30px ${FONT_STACK}`;
        ctx.fillText('CONTACT US', contentX + 28, contactBoxY + 42);

        const cItems: Array<{ kind: 'web' | 'phone' | 'mail'; text: string }> = [
          { kind: 'web', text: inviteUrl },
          { kind: 'phone', text: `${SUPPORT_PHONE_PRIMARY}  •  ${SUPPORT_PHONE_SECONDARY}` },
          { kind: 'mail', text: SUPPORT_EMAIL },
        ];
        cItems.forEach((item, idx) => {
          const rowY = contactBoxY + 102 + idx * 54;
          drawContactBadgeIcon(ctx, contentX + 46, rowY, 18, item.kind);
          const itemSize = fitTextSingleLine(ctx, item.text, contentW - 110, 26, 15, '700');
          ctx.fillStyle = '#ffffff';
          ctx.font = `700 ${itemSize}px ${FONT_STACK}`;
          ctx.fillText(item.text, contentX + 78, rowY);
        });
      }
    },
    [customHeadline, customOffer, hasReferralCode, inviteUrl, referralCode]
  );

  const renderDarkStudioFlyer = useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number, isVertical: boolean) => {
      // 1. Deep dark-navy gradient canvas background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#070d1c');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#111c33');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      const topGlow = ctx.createRadialGradient(
        W * 0.85,
        H * 0.12,
        20,
        W * 0.85,
        H * 0.12,
        W * 0.65
      );
      topGlow.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
      topGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, W, H);

      const botGlow = ctx.createRadialGradient(
        W * 0.18,
        H * 0.82,
        20,
        W * 0.18,
        H * 0.82,
        W * 0.6
      );
      botGlow.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
      botGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = botGlow;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.10)';
      for (let gx = 48; gx < W - 40; gx += 44) {
        for (let gy = 48; gy < 280; gy += 44) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      strokeRoundedRect(ctx, 20, 20, W - 40, H - 40, 32, 'rgba(148, 163, 184, 0.16)', 2);

      const margin = 56;
      const innerW = W - margin * 2;

      // 2. TOP BRAND HEADER: ROFANI POS + M-PESA READY BADGE
      const headerY = isVertical ? 58 : 48;
      const logoSize = isVertical ? 68 : 58;
      const logoGrad = ctx.createLinearGradient(margin, headerY, margin + logoSize, headerY + logoSize);
      logoGrad.addColorStop(0, '#0284c7');
      logoGrad.addColorStop(1, '#38bdf8');
      fillRoundedRect(ctx, margin, headerY, logoSize, logoSize, 16, logoGrad);

      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${isVertical ? 38 : 32}px ${FONT_STACK}`;
      ctx.fillText('R', margin + (isVertical ? 20 : 17), headerY + logoSize / 2 + 2);

      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${isVertical ? 40 : 34}px ${FONT_STACK}`;
      ctx.fillText('ROFANI', margin + logoSize + 18, headerY + logoSize * 0.38);
      ctx.fillStyle = '#38bdf8';
      ctx.font = `800 ${isVertical ? 24 : 20}px ${FONT_STACK}`;
      ctx.fillText('POS SYSTEM', margin + logoSize + 18, headerY + logoSize * 0.78);

      const badgeW = isVertical ? 276 : 244;
      const badgeH = isVertical ? 54 : 46;
      const badgeX = W - margin - badgeW;
      const badgeY = headerY + (logoSize - badgeH) / 2;
      fillRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 999, '#064e3b');
      strokeRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 999, '#10b981', 2.5);

      ctx.fillStyle = '#6ee7b7';
      ctx.font = `800 ${isVertical ? 21 : 18}px ${FONT_STACK}`;
      const mpesaText = '✓  M-PESA READY';
      const mpesaTW = ctx.measureText(mpesaText).width;
      ctx.fillText(mpesaText, badgeX + (badgeW - mpesaTW) / 2, badgeY + badgeH / 2 + 1);

      fillRoundedRect(ctx, margin, headerY + logoSize + 22, innerW, 2, 1, 'rgba(51, 65, 85, 0.7)');

      const footerH = isVertical ? 272 : 206;
      const footerY = H - margin - footerH;

      if (!isVertical) {
        const contentTop = headerY + logoSize + 44;
        const contentBottom = footerY - 26;
        const contentH = contentBottom - contentTop;

        const leftW = 492;
        const colGap = 28;
        const rightX = margin + leftW + colGap;
        const rightW = innerW - leftW - colGap;

        const headlineText = customHeadline.trim() || 'RELIABLE POS FOR FAST-MOVING SHOPS';
        const { size: hSize, lines: headlineLines } = fitWrappedLines(
          ctx,
          headlineText,
          leftW,
          50,
          24,
          3,
          '900'
        );
        const lineStep = Math.round(hSize * 1.12);
        let lineY = contentTop + 26;
        headlineLines.forEach((line, idx) => {
          ctx.fillStyle = idx >= headlineLines.length - 1 ? '#38bdf8' : '#ffffff';
          ctx.font = `900 ${hSize}px ${FONT_STACK}`;
          ctx.fillText(line, margin, lineY);
          lineY += lineStep;
        });

        const pillY = lineY + 6;
        const pillH = 56;
        const pillGrad = ctx.createLinearGradient(margin, pillY, margin + leftW, pillY);
        pillGrad.addColorStop(0, '#059669');
        pillGrad.addColorStop(1, '#10b981');
        fillRoundedRect(ctx, margin, pillY, leftW, pillH, 14, pillGrad);

        const pillText = 'Free M-Pesa Integration & STK Prompts';
        const pillSize = fitTextSingleLine(ctx, pillText, leftW - 36, 21, 14, '800');
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${pillSize}px ${FONT_STACK}`;
        const pTW = ctx.measureText(pillText).width;
        ctx.fillText(pillText, margin + (leftW - pTW) / 2, pillY + pillH / 2 + 1);

        const offerY = pillY + pillH + 22;
        const offerH = contentBottom - offerY;
        const offerGrad = ctx.createLinearGradient(margin, offerY, margin, offerY + offerH);
        offerGrad.addColorStop(0, '#132038');
        offerGrad.addColorStop(1, '#0b1426');
        fillRoundedRect(ctx, margin, offerY, leftW, offerH, 22, offerGrad);
        strokeRoundedRect(ctx, margin, offerY, leftW, offerH, 22, 'rgba(245, 158, 11, 0.5)', 2.5);

        ctx.fillStyle = '#fbbf24';
        ctx.font = `800 15px ${FONT_STACK}`;
        ctx.fillText('STARTER OFFER · NO HIDDEN FEES', margin + 22, offerY + 30);

        const offerHeadline = customOffer.trim() || '22 + 7 Days Free Trial';
        const offerHeadlineSz = fitTextSingleLine(ctx, offerHeadline, leftW - 44, 38, 18, '900');
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${offerHeadlineSz}px ${FONT_STACK}`;
        ctx.fillText(offerHeadline, margin + 22, offerY + 72);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `700 20px ${FONT_STACK}`;
        ctx.fillText('KSh 500/mo after trial • Cancel anytime', margin + 22, offerY + 108);

        const refBoxY = offerY + offerH - 86;
        fillRoundedRect(ctx, margin + 20, refBoxY, leftW - 40, 66, 14, '#070d19');
        strokeRoundedRect(
          ctx,
          margin + 20,
          refBoxY,
          leftW - 40,
          66,
          14,
          'rgba(56, 189, 248, 0.45)',
          1.5
        );

        ctx.fillStyle = '#94a3b8';
        ctx.font = `700 13px ${FONT_STACK}`;
        ctx.fillText(
          hasReferralCode ? 'USE REFERRAL CODE' : 'START TODAY',
          margin + 36,
          refBoxY + 21
        );

        const codeLabel = referralCode || 'ROFANI-POS';
        const codeSize = fitTextSingleLine(
          ctx,
          codeLabel,
          leftW - 88,
          28,
          16,
          '800',
          MONO_STACK
        );
        ctx.fillStyle = '#fbbf24';
        ctx.font = `800 ${codeSize}px ${MONO_STACK}`;
        ctx.fillText(codeLabel, margin + 36, refBoxY + 46);

        drawHardwareShowcase(ctx, rightX, contentTop, rightW, contentH, false);
      } else {
        const headlineTop = headerY + logoSize + 64;
        const headlineText = customHeadline.trim() || 'RELIABLE POS FOR FAST-MOVING SHOPS';
        const { size: hSize, lines: headlineLines } = fitWrappedLines(
          ctx,
          headlineText,
          innerW,
          66,
          30,
          3,
          '900'
        );
        const lineStep = Math.round(hSize * 1.15);
        let lineY = headlineTop;
        headlineLines.forEach((line, idx) => {
          ctx.fillStyle = idx === headlineLines.length - 1 ? '#38bdf8' : '#ffffff';
          ctx.font = `900 ${hSize}px ${FONT_STACK}`;
          const lw = ctx.measureText(line).width;
          ctx.fillText(line, margin + (innerW - lw) / 2, lineY);
          lineY += lineStep;
        });

        const pillY = lineY + 14;
        const pillH = 74;
        const pillGrad = ctx.createLinearGradient(margin, pillY, margin + innerW, pillY);
        pillGrad.addColorStop(0, '#059669');
        pillGrad.addColorStop(1, '#10b981');
        fillRoundedRect(ctx, margin, pillY, innerW, pillH, 999, pillGrad);

        const pillText = 'Free M-Pesa Integration & STK Prompts';
        const pillSize = fitTextSingleLine(ctx, pillText, innerW - 60, 31, 18, '800');
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${pillSize}px ${FONT_STACK}`;
        const pTW = ctx.measureText(pillText).width;
        ctx.fillText(pillText, margin + (innerW - pTW) / 2, pillY + pillH / 2 + 1);

        const offerY = pillY + pillH + 34;
        const offerH = 224;
        const offerGrad = ctx.createLinearGradient(margin, offerY, margin + innerW, offerY + offerH);
        offerGrad.addColorStop(0, '#132038');
        offerGrad.addColorStop(1, '#0b1426');
        fillRoundedRect(ctx, margin, offerY, innerW, offerH, 24, offerGrad);
        strokeRoundedRect(ctx, margin, offerY, innerW, offerH, 24, 'rgba(245, 158, 11, 0.55)', 2.5);

        ctx.fillStyle = '#fbbf24';
        ctx.font = `800 18px ${FONT_STACK}`;
        ctx.fillText('LIMITED MERCHANT OFFER', margin + 28, offerY + 38);

        const offerHeadline = customOffer.trim() || '22 + 7 Days Free Trial';
        const offerHeadlineSz = fitTextSingleLine(
          ctx,
          offerHeadline,
          innerW - 356 - 68,
          48,
          20,
          '900'
        );
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${offerHeadlineSz}px ${FONT_STACK}`;
        ctx.fillText(offerHeadline, margin + 28, offerY + 94);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `700 24px ${FONT_STACK}`;
        ctx.fillText('KSh 500/mo after trial', margin + 28, offerY + 142);

        const refBoxW = 356;
        const refBoxH = 148;
        const refBoxX = margin + innerW - refBoxW - 24;
        const refBoxY = offerY + (offerH - refBoxH) / 2;
        fillRoundedRect(ctx, refBoxX, refBoxY, refBoxW, refBoxH, 18, '#070d19');
        strokeRoundedRect(ctx, refBoxX, refBoxY, refBoxW, refBoxH, 18, 'rgba(56, 189, 248, 0.5)', 2);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `700 16px ${FONT_STACK}`;
        ctx.fillText(hasReferralCode ? 'REFERRAL CODE' : 'ROFANI CODE', refBoxX + 24, refBoxY + 36);

        const codeLabel = referralCode || 'ROFANI-POS';
        const codeSize = fitTextSingleLine(ctx, codeLabel, refBoxW - 44, 34, 18, '800', MONO_STACK);
        ctx.fillStyle = '#fbbf24';
        ctx.font = `800 ${codeSize}px ${MONO_STACK}`;
        ctx.fillText(codeLabel, refBoxX + 24, refBoxY + 84);

        ctx.fillStyle = '#34d399';
        ctx.font = `700 16px ${FONT_STACK}`;
        ctx.fillText('22 Days Free w/ Code', refBoxX + 24, refBoxY + 122);

        const stageY = offerY + offerH + 34;
        const stageH = footerY - stageY - 32;
        drawHardwareShowcase(ctx, margin, stageY, innerW, stageH, true);
      }

      // 3. CONTACT US FOOTER BAR
      const footerGrad = ctx.createLinearGradient(margin, footerY, margin, footerY + footerH);
      footerGrad.addColorStop(0, '#091122');
      footerGrad.addColorStop(1, '#060b16');
      fillRoundedRect(ctx, margin, footerY, innerW, footerH, 24, footerGrad);
      strokeRoundedRect(ctx, margin, footerY, innerW, footerH, 24, 'rgba(56, 189, 248, 0.35)', 2);

      const fPadX = isVertical ? 32 : 28;
      ctx.fillStyle = '#f59e0b';
      ctx.font = `900 ${isVertical ? 22 : 17}px ${FONT_STACK}`;
      ctx.fillText('CONTACT US', margin + fPadX, footerY + (isVertical ? 42 : 34));

      const urlSize = fitTextSingleLine(
        ctx,
        inviteUrl,
        innerW - fPadX * 2,
        isVertical ? 26 : 22,
        14,
        '700',
        MONO_STACK
      );
      ctx.fillStyle = '#38bdf8';
      ctx.font = `700 ${urlSize}px ${MONO_STACK}`;
      ctx.fillText(inviteUrl, margin + fPadX, footerY + (isVertical ? 90 : 74));

      fillRoundedRect(
        ctx,
        margin + fPadX,
        footerY + (isVertical ? 124 : 102),
        innerW - fPadX * 2,
        1.5,
        1,
        'rgba(51, 65, 85, 0.7)'
      );

      const phoneLine = `WhatsApp / Calls: ${SUPPORT_PHONE_PRIMARY}  •  ${SUPPORT_PHONE_SECONDARY}`;
      const phoneSize = fitTextSingleLine(
        ctx,
        phoneLine,
        innerW - fPadX * 2,
        isVertical ? 28 : 22,
        14,
        '800'
      );
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${phoneSize}px ${FONT_STACK}`;
      ctx.fillText(phoneLine, margin + fPadX, footerY + (isVertical ? 166 : 138));

      const emailLine = `Email: ${SUPPORT_EMAIL}   •   Web App · Android · Desktop`;
      const emailSize = fitTextSingleLine(
        ctx,
        emailLine,
        innerW - fPadX * 2,
        isVertical ? 24 : 18,
        12,
        '600'
      );
      ctx.fillStyle = '#cbd5e1';
      ctx.font = `600 ${emailSize}px ${FONT_STACK}`;
      ctx.fillText(emailLine, margin + fPadX, footerY + (isVertical ? 216 : 174));
    },
    [customHeadline, customOffer, hasReferralCode, inviteUrl, referralCode]
  );

  const renderBoutiqueSaleFlyer = useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number, isVertical: boolean, isDark: boolean) => {
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      if (isDark) {
        bgGrad.addColorStop(0, '#140b1a');
        bgGrad.addColorStop(0.5, '#251233');
        bgGrad.addColorStop(1, '#120a18');
      } else {
        bgGrad.addColorStop(0, '#fdf8f3');
        bgGrad.addColorStop(0.55, '#fceee6');
        bgGrad.addColorStop(1, '#f9e4dc');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Soft luxury ambient glow
      const glow = ctx.createRadialGradient(W * 0.8, H * 0.14, 20, W * 0.8, H * 0.14, W * 0.65);
      glow.addColorStop(0, isDark ? 'rgba(244, 114, 182, 0.22)' : 'rgba(244, 63, 94, 0.12)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Editorial gold double frame
      strokeRoundedRect(
        ctx,
        24,
        24,
        W - 48,
        H - 48,
        30,
        isDark ? 'rgba(251, 191, 36, 0.42)' : 'rgba(190, 24, 93, 0.28)',
        2.5
      );
      strokeRoundedRect(
        ctx,
        36,
        36,
        W - 72,
        H - 72,
        22,
        isDark ? 'rgba(244, 114, 182, 0.22)' : 'rgba(217, 119, 6, 0.25)',
        1.5
      );

      const margin = 64;
      const innerW = W - margin * 2;
      ctx.textBaseline = 'middle';

      // Top Boutique Brand Header
      const headerY = isVertical ? 76 : 64;
      const logoSize = isVertical ? 66 : 56;
      const monogramGrad = ctx.createLinearGradient(margin, headerY, margin + logoSize, headerY + logoSize);
      monogramGrad.addColorStop(0, '#be185d');
      monogramGrad.addColorStop(1, '#d97706');
      fillRoundedRect(ctx, margin, headerY, logoSize, logoSize, 16, monogramGrad);
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${isVertical ? 36 : 30}px ${FONT_STACK}`;
      ctx.fillText('R', margin + (isVertical ? 20 : 17), headerY + logoSize / 2 + 1);

      ctx.fillStyle = isDark ? '#ffffff' : '#3b0724';
      ctx.font = `900 ${isVertical ? 38 : 32}px ${FONT_STACK}`;
      ctx.fillText('ROFANI POS', margin + logoSize + 18, headerY + logoSize * 0.36);

      ctx.fillStyle = isDark ? '#fbbf24' : '#be185d';
      ctx.font = `800 ${isVertical ? 19 : 16}px ${FONT_STACK}`;
      ctx.fillText('BOUTIQUE & LIFESTYLE EDITION', margin + logoSize + 18, headerY + logoSize * 0.78);

      const mBadgeW = isVertical ? 256 : 226;
      const mBadgeH = isVertical ? 48 : 42;
      const mBadgeX = W - margin - mBadgeW;
      const mBadgeY = headerY + (logoSize - mBadgeH) / 2;
      fillRoundedRect(
        ctx,
        mBadgeX,
        mBadgeY,
        mBadgeW,
        mBadgeH,
        999,
        isDark ? '#064e3b' : '#ecfdf5'
      );
      strokeRoundedRect(ctx, mBadgeX, mBadgeY, mBadgeW, mBadgeH, 999, '#10b981', 2);
      ctx.fillStyle = isDark ? '#6ee7b7' : '#047857';
      ctx.font = `800 ${isVertical ? 19 : 16}px ${FONT_STACK}`;
      const mTxt = '✓  M-PESA READY';
      ctx.fillText(mTxt, mBadgeX + (mBadgeW - ctx.measureText(mTxt).width) / 2, mBadgeY + mBadgeH / 2 + 1);

      fillRoundedRect(
        ctx,
        margin,
        headerY + logoSize + 22,
        innerW,
        1.5,
        1,
        isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(190, 24, 93, 0.2)'
      );

      const footerH = isVertical ? 260 : 194;
      const footerY = H - margin - footerH;
      const codeLabel = referralCode || 'ROFANI-POS';

      if (!isVertical) {
        const contentTop = headerY + logoSize + 44;
        const leftW = 472;
        const colGap = 28;
        const rightX = margin + leftW + colGap;
        const rightW = innerW - leftW - colGap;
        const contentH = footerY - contentTop - 22;

        // Editorial Tag Pill
        fillRoundedRect(
          ctx,
          margin,
          contentTop,
          292,
          34,
          999,
          isDark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(190, 24, 93, 0.1)'
        );
        ctx.fillStyle = isDark ? '#fde68a' : '#9d174d';
        ctx.font = `800 14px ${FONT_STACK}`;
        ctx.fillText('BOUTIQUE SALE & CHECKOUT POS', margin + 18, contentTop + 17);

        // Headline
        const bHeadline = customHeadline.trim() || 'CURATED POS FOR BOUTIQUES & SHOPS';
        const { size: hSize, lines: hLines } = fitWrappedLines(
          ctx,
          bHeadline,
          leftW,
          48,
          24,
          3,
          '900'
        );
        const lineStep = Math.round(hSize * 1.12);
        let ly = contentTop + 74;
        hLines.forEach((line, idx) => {
          ctx.fillStyle =
            idx === hLines.length - 1
              ? isDark
                ? '#fbbf24'
                : '#be185d'
              : isDark
              ? '#ffffff'
              : '#1f0918';
          ctx.font = `900 ${hSize}px ${FONT_STACK}`;
          ctx.fillText(line, margin, ly);
          ly += lineStep;
        });

        // Emerald M-Pesa STK Ribbon
        const pillY = ly + 8;
        const pillH = 54;
        const pillGrad = ctx.createLinearGradient(margin, pillY, margin + leftW, pillY);
        pillGrad.addColorStop(0, '#047857');
        pillGrad.addColorStop(1, '#10b981');
        fillRoundedRect(ctx, margin, pillY, leftW, pillH, 14, pillGrad);
        const pTxt = 'Free M-Pesa Integration & STK Prompts';
        const pSz = fitTextSingleLine(ctx, pTxt, leftW - 30, 20, 13, '800');
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${pSz}px ${FONT_STACK}`;
        ctx.fillText(pTxt, margin + (leftW - ctx.measureText(pTxt).width) / 2, pillY + pillH / 2 + 1);

        // Boutique Offer & Referral Box
        const offerY = pillY + pillH + 20;
        const offerH = footerY - offerY - 22;
        fillRoundedRect(
          ctx,
          margin,
          offerY,
          leftW,
          offerH,
          20,
          isDark ? 'rgba(38, 17, 52, 0.92)' : '#ffffff'
        );
        strokeRoundedRect(
          ctx,
          margin,
          offerY,
          leftW,
          offerH,
          20,
          isDark ? 'rgba(251, 191, 36, 0.55)' : 'rgba(190, 24, 93, 0.35)',
          2
        );

        ctx.fillStyle = isDark ? '#fbbf24' : '#be185d';
        ctx.font = `800 14px ${FONT_STACK}`;
        ctx.fillText('22 + 7 DAYS FREE TRIAL', margin + 22, offerY + 28);

        const bOffer = customOffer.trim() || 'KSh 500/= Monthly';
        const bOfferSz = fitTextSingleLine(ctx, bOffer, leftW - 44, 36, 17, '900');
        ctx.fillStyle = isDark ? '#ffffff' : '#1f0918';
        ctx.font = `900 ${bOfferSz}px ${FONT_STACK}`;
        ctx.fillText(bOffer, margin + 22, offerY + 68);

        ctx.fillStyle = isDark ? '#e2e8f0' : '#475569';
        ctx.font = `600 16px ${FONT_STACK}`;
        ctx.fillText('Size/Color Variants • VIP Loyalty • Receipts', margin + 22, offerY + 102);

        const refY = offerY + offerH - 76;
        fillRoundedRect(
          ctx,
          margin + 18,
          refY,
          leftW - 36,
          58,
          12,
          isDark ? '#120819' : '#fdf2f8'
        );
        strokeRoundedRect(
          ctx,
          margin + 18,
          refY,
          leftW - 36,
          58,
          12,
          isDark ? 'rgba(244, 114, 182, 0.45)' : 'rgba(190, 24, 93, 0.35)',
          1.5
        );
        ctx.fillStyle = isDark ? '#f9a8d4' : '#9d174d';
        ctx.font = `700 12px ${FONT_STACK}`;
        ctx.fillText(hasReferralCode ? 'BOUTIQUE REFERRAL CODE' : 'ROFANI CODE', margin + 32, refY + 18);
        const cSz = fitTextSingleLine(ctx, codeLabel, leftW - 76, 25, 14, '800', MONO_STACK);
        ctx.fillStyle = isDark ? '#fbbf24' : '#be185d';
        ctx.font = `800 ${cSz}px ${MONO_STACK}`;
        ctx.fillText(codeLabel, margin + 32, refY + 41);

        drawHardwareShowcase(ctx, rightX, contentTop, rightW, contentH, false);
      } else {
        // 9:16 Vertical Boutique Sale Layout
        const topY = headerY + logoSize + 52;
        fillRoundedRect(
          ctx,
          margin + (innerW - 380) / 2,
          topY,
          380,
          44,
          999,
          isDark ? 'rgba(251, 191, 36, 0.18)' : 'rgba(190, 24, 93, 0.1)'
        );
        ctx.fillStyle = isDark ? '#fde68a' : '#9d174d';
        ctx.font = `800 18px ${FONT_STACK}`;
        const pillLabel = 'BOUTIQUE SALE & CHECKOUT POS';
        ctx.fillText(pillLabel, margin + (innerW - ctx.measureText(pillLabel).width) / 2, topY + 22);

        const bHeadline = customHeadline.trim() || 'CURATED POS FOR BOUTIQUES & SHOPS';
        const { size: hSize, lines: hLines } = fitWrappedLines(
          ctx,
          bHeadline,
          innerW,
          62,
          28,
          3,
          '900'
        );
        const lineStep = Math.round(hSize * 1.15);
        let ly = topY + 94;
        hLines.forEach((line, idx) => {
          ctx.fillStyle =
            idx === hLines.length - 1
              ? isDark
                ? '#fbbf24'
                : '#be185d'
              : isDark
              ? '#ffffff'
              : '#1f0918';
          ctx.font = `900 ${hSize}px ${FONT_STACK}`;
          ctx.fillText(line, margin + (innerW - ctx.measureText(line).width) / 2, ly);
          ly += lineStep;
        });

        const pillY = ly + 12;
        const pillH = 72;
        const pillGrad = ctx.createLinearGradient(margin, pillY, margin + innerW, pillY);
        pillGrad.addColorStop(0, '#047857');
        pillGrad.addColorStop(1, '#10b981');
        fillRoundedRect(ctx, margin, pillY, innerW, pillH, 999, pillGrad);
        const pTxt = 'Free M-Pesa Integration & STK Prompts';
        const pSz = fitTextSingleLine(ctx, pTxt, innerW - 56, 30, 18, '800');
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${pSz}px ${FONT_STACK}`;
        ctx.fillText(pTxt, margin + (innerW - ctx.measureText(pTxt).width) / 2, pillY + pillH / 2 + 1);

        const offerY = pillY + pillH + 30;
        const offerH = 216;
        fillRoundedRect(
          ctx,
          margin,
          offerY,
          innerW,
          offerH,
          24,
          isDark ? 'rgba(38, 17, 52, 0.92)' : '#ffffff'
        );
        strokeRoundedRect(
          ctx,
          margin,
          offerY,
          innerW,
          offerH,
          24,
          isDark ? 'rgba(251, 191, 36, 0.55)' : 'rgba(190, 24, 93, 0.35)',
          2.5
        );

        ctx.fillStyle = isDark ? '#fbbf24' : '#be185d';
        ctx.font = `800 18px ${FONT_STACK}`;
        ctx.fillText('22 + 7 DAYS FREE TRIAL', margin + 28, offerY + 38);
        const bOffer = customOffer.trim() || 'KSh 500/= Monthly';
        const bOfferSz = fitTextSingleLine(ctx, bOffer, innerW - 344 - 68, 46, 20, '900');
        ctx.fillStyle = isDark ? '#ffffff' : '#1f0918';
        ctx.font = `900 ${bOfferSz}px ${FONT_STACK}`;
        ctx.fillText(bOffer, margin + 28, offerY + 94);
        ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
        ctx.font = `600 22px ${FONT_STACK}`;
        ctx.fillText('Variants · VIP Loyalty · Smart Receipts', margin + 28, offerY + 144);

        const rBoxW = 344;
        const rBoxH = 144;
        const rBoxX = margin + innerW - rBoxW - 24;
        const rBoxY = offerY + (offerH - rBoxH) / 2;
        fillRoundedRect(ctx, rBoxX, rBoxY, rBoxW, rBoxH, 18, isDark ? '#120819' : '#fdf2f8');
        strokeRoundedRect(
          ctx,
          rBoxX,
          rBoxY,
          rBoxW,
          rBoxH,
          18,
          isDark ? 'rgba(244, 114, 182, 0.5)' : 'rgba(190, 24, 93, 0.35)',
          2
        );
        ctx.fillStyle = isDark ? '#f9a8d4' : '#9d174d';
        ctx.font = `700 15px ${FONT_STACK}`;
        ctx.fillText(hasReferralCode ? 'REFERRAL CODE' : 'ROFANI CODE', rBoxX + 22, rBoxY + 36);
        const cSz = fitTextSingleLine(ctx, codeLabel, rBoxW - 44, 32, 16, '800', MONO_STACK);
        ctx.fillStyle = isDark ? '#fbbf24' : '#be185d';
        ctx.font = `800 ${cSz}px ${MONO_STACK}`;
        ctx.fillText(codeLabel, rBoxX + 22, rBoxY + 82);
        ctx.fillStyle = '#10b981';
        ctx.font = `700 15px ${FONT_STACK}`;
        ctx.fillText('22 Days Free w/ Code', rBoxX + 22, rBoxY + 118);

        const stageY = offerY + offerH + 30;
        const stageH = footerY - stageY - 30;
        drawHardwareShowcase(ctx, margin, stageY, innerW, stageH, true);
      }

      // Boutique Footer
      fillRoundedRect(
        ctx,
        margin,
        footerY,
        innerW,
        footerH,
        22,
        isDark ? 'rgba(20, 10, 28, 0.92)' : '#3b0724'
      );
      strokeRoundedRect(
        ctx,
        margin,
        footerY,
        innerW,
        footerH,
        22,
        isDark ? 'rgba(251, 191, 36, 0.38)' : 'rgba(217, 119, 6, 0.45)',
        2
      );
      const fPadX = isVertical ? 32 : 28;
      ctx.fillStyle = '#fbbf24';
      ctx.font = `900 ${isVertical ? 22 : 17}px ${FONT_STACK}`;
      ctx.fillText('CONTACT US', margin + fPadX, footerY + (isVertical ? 40 : 32));

      const urlSz = fitTextSingleLine(
        ctx,
        inviteUrl,
        innerW - fPadX * 2,
        isVertical ? 25 : 21,
        13,
        '700',
        MONO_STACK
      );
      ctx.fillStyle = '#f9a8d4';
      ctx.font = `700 ${urlSz}px ${MONO_STACK}`;
      ctx.fillText(inviteUrl, margin + fPadX, footerY + (isVertical ? 88 : 72));

      const phoneLine = `WhatsApp / Calls: ${SUPPORT_PHONE_PRIMARY}  •  ${SUPPORT_PHONE_SECONDARY}`;
      const phSz = fitTextSingleLine(ctx, phoneLine, innerW - fPadX * 2, isVertical ? 26 : 21, 13, '800');
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${phSz}px ${FONT_STACK}`;
      ctx.fillText(phoneLine, margin + fPadX, footerY + (isVertical ? 148 : 122));

      const emLine = `Email: ${SUPPORT_EMAIL}   •   Web App · Android · Desktop`;
      const emSz = fitTextSingleLine(ctx, emLine, innerW - fPadX * 2, isVertical ? 22 : 17, 12, '600');
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `600 ${emSz}px ${FONT_STACK}`;
      ctx.fillText(emLine, margin + fPadX, footerY + (isVertical ? 198 : 158));
    },
    [customHeadline, customOffer, hasReferralCode, inviteUrl, referralCode]
  );

  const renderMinimalistFlyer = useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number, isVertical: boolean, isDark: boolean) => {
      const bg = isDark ? '#090d16' : '#f8fafc';
      const surface = isDark ? '#0f172a' : '#ffffff';
      const borderCol = isDark ? '#1e293b' : '#cbd5e1';
      const inkPrimary = isDark ? '#ffffff' : '#0f172a';
      const inkMuted = isDark ? '#94a3b8' : '#475569';
      const accentBlue = isDark ? '#38bdf8' : '#0284c7';
      const accentGreen = isDark ? '#34d399' : '#059669';

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = 'middle';

      const margin = isVertical ? 64 : 56;
      const innerW = W - margin * 2;
      const codeLabel = referralCode || 'ROFANI-POS';

      // Crisp Swiss Hairline Outer Frame
      strokeRoundedRect(ctx, 28, 28, W - 56, H - 56, 20, borderCol, 1.5);

      // Minimalist Top Header
      const headerY = isVertical ? 76 : 62;
      fillRoundedRect(ctx, margin, headerY, 44, 44, 10, accentBlue);
      ctx.fillStyle = isDark ? '#090d16' : '#ffffff';
      ctx.font = `900 26px ${FONT_STACK}`;
      ctx.fillText('R', margin + 13, headerY + 23);

      ctx.fillStyle = inkPrimary;
      ctx.font = `900 ${isVertical ? 32 : 28}px ${FONT_STACK}`;
      ctx.fillText('ROFANI POS', margin + 60, headerY + 22);

      // Minimal status badge right
      const mpTxt = '✓  M-PESA READY';
      ctx.font = `800 ${isVertical ? 18 : 15}px ${FONT_STACK}`;
      const mpW = ctx.measureText(mpTxt).width + 36;
      const mpX = W - margin - mpW;
      fillRoundedRect(ctx, mpX, headerY + 3, mpW, 38, 999, surface);
      strokeRoundedRect(ctx, mpX, headerY + 3, mpW, 38, 999, accentGreen, 1.5);
      ctx.fillStyle = accentGreen;
      ctx.fillText(mpTxt, mpX + 18, headerY + 22);

      fillRoundedRect(ctx, margin, headerY + 64, innerW, 1.5, 1, borderCol);

      // Clean Minimalist Hero Typography
      const heroY = headerY + (isVertical ? 132 : 112);
      const mHeadline = customHeadline.trim() || 'SIMPLE. FAST. RELIABLE POS.';
      const { size: heroSize, lines: hLines } = fitWrappedLines(
        ctx,
        mHeadline,
        innerW,
        isVertical ? 72 : 56,
        28,
        3,
        '900'
      );
      const heroStep = Math.round(heroSize * 1.14);
      let ly = heroY;
      hLines.forEach((line, idx) => {
        ctx.fillStyle = idx === hLines.length - 1 ? accentBlue : inkPrimary;
        ctx.font = `900 ${heroSize}px ${FONT_STACK}`;
        ctx.fillText(line, margin, ly);
        ly += heroStep;
      });

      const subTxt = 'Free M-Pesa Integration & STK Prompts • Built for fast-moving shops';
      const subSz = fitTextSingleLine(ctx, subTxt, innerW, isVertical ? 26 : 21, 14, '600');
      ctx.fillStyle = inkMuted;
      ctx.font = `600 ${subSz}px ${FONT_STACK}`;
      ctx.fillText(subTxt, margin, ly + 8);

      // Two-Column Minimal Swiss Grid Cards (Pricing + Referral)
      const gridY = ly + (isVertical ? 56 : 44);
      const colGap = 22;
      const cardW = (innerW - colGap) / 2;
      const cardH = isVertical ? 176 : 146;

      // Card 1: Pricing & Trial
      fillRoundedRect(ctx, margin, gridY, cardW, cardH, 16, surface);
      strokeRoundedRect(ctx, margin, gridY, cardW, cardH, 16, borderCol, 1.5);
      ctx.fillStyle = accentGreen;
      ctx.font = `800 ${isVertical ? 16 : 13}px ${FONT_STACK}`;
      ctx.fillText('22 + 7 DAYS FREE TRIAL', margin + 24, gridY + 34);
      const mOffer = customOffer.trim() || 'KSh 500/mo';
      const mOfferSz = fitTextSingleLine(
        ctx,
        mOffer,
        cardW - 48,
        isVertical ? 48 : 38,
        18,
        '900'
      );
      ctx.fillStyle = inkPrimary;
      ctx.font = `900 ${mOfferSz}px ${FONT_STACK}`;
      ctx.fillText(mOffer, margin + 24, gridY + (isVertical ? 88 : 76));
      ctx.fillStyle = inkMuted;
      ctx.font = `600 ${isVertical ? 19 : 15}px ${FONT_STACK}`;
      ctx.fillText('All-in-one billing & inventory', margin + 24, gridY + (isVertical ? 136 : 114));

      // Card 2: Referral Code
      const c2X = margin + cardW + colGap;
      fillRoundedRect(ctx, c2X, gridY, cardW, cardH, 16, surface);
      strokeRoundedRect(ctx, c2X, gridY, cardW, cardH, 16, accentBlue, 1.5);
      ctx.fillStyle = accentBlue;
      ctx.font = `800 ${isVertical ? 16 : 13}px ${FONT_STACK}`;
      ctx.fillText(hasReferralCode ? 'REFERRAL CODE' : 'START CODE', c2X + 24, gridY + 34);
      const cSz = fitTextSingleLine(
        ctx,
        codeLabel,
        cardW - 48,
        isVertical ? 38 : 30,
        16,
        '800',
        MONO_STACK
      );
      ctx.fillStyle = inkPrimary;
      ctx.font = `800 ${cSz}px ${MONO_STACK}`;
      ctx.fillText(codeLabel, c2X + 24, gridY + (isVertical ? 88 : 76));
      ctx.fillStyle = inkMuted;
      ctx.font = `600 ${isVertical ? 19 : 15}px ${FONT_STACK}`;
      ctx.fillText('Unlock 22 days free trial', c2X + 24, gridY + (isVertical ? 136 : 114));

      // Hardware Preview Stage
      const footerH = isVertical ? 236 : 168;
      const footerY = H - margin - footerH;
      const stageY = gridY + cardH + (isVertical ? 32 : 24);
      const stageH = footerY - stageY - (isVertical ? 32 : 22);
      drawHardwareShowcase(ctx, margin, stageY, innerW, stageH, isVertical);

      // Minimalist Hairline Footer
      fillRoundedRect(ctx, margin, footerY, innerW, 1.5, 1, borderCol);
      ctx.fillStyle = accentBlue;
      ctx.font = `800 ${isVertical ? 20 : 15}px ${FONT_STACK}`;
      ctx.fillText('CONTACT US', margin, footerY + (isVertical ? 36 : 28));

      const urlSz = fitTextSingleLine(
        ctx,
        inviteUrl,
        innerW,
        isVertical ? 26 : 20,
        13,
        '700',
        MONO_STACK
      );
      ctx.fillStyle = inkPrimary;
      ctx.font = `700 ${urlSz}px ${MONO_STACK}`;
      ctx.fillText(inviteUrl, margin, footerY + (isVertical ? 82 : 64));

      const phLine = `${SUPPORT_PHONE_PRIMARY}  •  ${SUPPORT_PHONE_SECONDARY}  •  ${SUPPORT_EMAIL}`;
      const phSz = fitTextSingleLine(ctx, phLine, innerW, isVertical ? 24 : 18, 12, '700');
      ctx.fillStyle = inkMuted;
      ctx.font = `700 ${phSz}px ${FONT_STACK}`;
      ctx.fillText(phLine, margin, footerY + (isVertical ? 134 : 104));

      ctx.fillStyle = accentGreen;
      ctx.font = `700 ${isVertical ? 20 : 15}px ${FONT_STACK}`;
      ctx.fillText('Web App  •  Android  •  Desktop POS', margin, footerY + (isVertical ? 182 : 140));
    },
    [customHeadline, customOffer, hasReferralCode, inviteUrl, referralCode]
  );

  const drawFlyerToContext = useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number) => {
      const isVertical = format === '9:16';
      const isDark = flyerStyle === 'dark_studio';

      ctx.clearRect(0, 0, W, H);
      if (template === 'boutique_sale') {
        renderBoutiqueSaleFlyer(ctx, W, H, isVertical, isDark);
      } else if (template === 'minimalist') {
        renderMinimalistFlyer(ctx, W, H, isVertical, isDark);
      } else if (flyerStyle === 'classic_blue') {
        renderClassicBlueFlyer(ctx, W, H, isVertical);
      } else {
        renderDarkStudioFlyer(ctx, W, H, isVertical);
      }
    },
    [
      flyerStyle,
      format,
      renderBoutiqueSaleFlyer,
      renderClassicBlueFlyer,
      renderDarkStudioFlyer,
      renderMinimalistFlyer,
      template,
    ]
  );

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawFlyerToContext(ctx, canvasWidth, canvasHeight);
  }, [canvasHeight, canvasWidth, drawFlyerToContext]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const triggerDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'rofani-pos-flyer.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  };

  const handleDownloadFlyer = () => {
    if (triggerDownloadPng()) {
      onNotify('Flyer PNG downloaded as rofani-pos-flyer.png!');
    }
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      // Yield a frame so the loading state paints smoothly before high-DPI offscreen rendering
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      const { actualDpi } = exportFlyerCanvasToPdf({
        logicalWidth: canvasWidth,
        logicalHeight: canvasHeight,
        renderToContext: drawFlyerToContext,
        fallbackCanvas: canvasRef.current,
        paperSize,
        marginMm: printMarginMm,
        dpi: printDpi,
        includeCropMarks,
        filename: `rofani-pos-flyer-${paperSize}-${printDpi}dpi.pdf`,
        title: customHeadline.trim() || 'Rofani POS Promotional Flyer',
      });
      onNotify(
        `Print PDF exported (${paperSize.toUpperCase()} · ${printMarginMm}mm margin · ~${actualDpi} DPI)!`
      );
    } catch (err) {
      console.error('Failed to export flyer PDF:', err);
      onNotify('Could not generate PDF. Please try again or use PNG download.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleShareFlyerImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isSharing) return;
    setIsSharing(true);

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );

      if (blob && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const pngFile = new File([blob], 'rofani-pos-flyer.png', { type: 'image/png' });
        const canShareFiles =
          typeof navigator.canShare === 'function'
            ? navigator.canShare({ files: [pngFile] })
            : true;

        if (canShareFiles) {
          try {
            await navigator.share({
              title: 'Rofani POS — Reliable POS for Fast-Moving Shops',
              text: promoCaption,
              files: [pngFile],
            });
            onNotify('Flyer shared successfully!');
            return;
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              return;
            }
          }
        }
      }

      triggerDownloadPng();
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(promoCaption).catch(() => {});
      }
      onNotify(
        'Flyer PNG downloaded & promo caption copied—attach rofani-pos-flyer.png in WhatsApp, Facebook, or TikTok!'
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="bg-slate-950/80 border border-slate-700/80 rounded-2xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate">
              Rofani POS Promo Flyer Generator
            </h4>
            <p className="text-[11px] text-slate-400">
              Official Rofani POS software &amp; hardware poster with your referral code
            </p>
          </div>
        </div>
      </div>

      {/* Template Selection Row */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 px-0.5">
          <span>Template Selection</span>
          <span className="text-[10px] text-slate-400">Live canvas update</span>
        </div>
        <div
          className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl"
          role="group"
          aria-label="Template Selection"
        >
          <button
            type="button"
            aria-pressed={template === 'standard_retail'}
            onClick={() => setTemplate('standard_retail')}
            className={`min-h-[38px] px-1.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
              template === 'standard_retail'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Store className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Standard Retail</span>
          </button>
          <button
            type="button"
            aria-pressed={template === 'boutique_sale'}
            onClick={() => setTemplate('boutique_sale')}
            className={`min-h-[38px] px-1.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
              template === 'boutique_sale'
                ? 'bg-pink-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Boutique Sale</span>
          </button>
          <button
            type="button"
            aria-pressed={template === 'minimalist'}
            onClick={() => setTemplate('minimalist')}
            className={`min-h-[38px] px-1.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
              template === 'minimalist'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Minimalist</span>
          </button>
        </div>
      </div>

      {/* Style Switcher (Classic Blue Promo vs Dark Studio) */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setFlyerStyle('classic_blue')}
          className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
            flyerStyle === 'classic_blue'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Palette className="w-3.5 h-3.5 shrink-0" />
          <span>Classic Blue Ad</span>
        </button>
        <button
          type="button"
          onClick={() => setFlyerStyle('dark_studio')}
          className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
            flyerStyle === 'dark_studio'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>Dark Studio</span>
        </button>
      </div>

      {/* Format Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setFormat('1:1')}
          className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
            format === '1:1'
              ? 'bg-sky-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Square className="w-3.5 h-3.5 shrink-0" />
          <span>Facebook / Group Flyer (1:1)</span>
        </button>
        <button
          type="button"
          onClick={() => setFormat('9:16')}
          className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
            format === '9:16'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>WhatsApp Status / TikTok (9:16)</span>
        </button>
      </div>

      {/* High-Resolution Canvas Preview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className={
            format === '1:1'
              ? 'w-full max-w-[330px] aspect-square rounded-xl border border-slate-700/80 shadow-lg block mx-auto'
              : 'w-auto max-w-full max-h-[380px] aspect-[9/16] rounded-xl border border-slate-700/80 shadow-lg block mx-auto'
          }
        />
      </div>

      {/* Custom Headline & Custom Offer Real-Time Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <label
              htmlFor="promo-custom-headline"
              className="text-[11px] font-semibold text-slate-300"
            >
              Custom Headline
            </label>
            {customHeadline && (
              <button
                type="button"
                onClick={() => setCustomHeadline('')}
                className="text-[10px] font-semibold text-slate-400 hover:text-white inline-flex items-center gap-0.5 cursor-pointer"
                aria-label="Reset Custom Headline"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
          <input
            id="promo-custom-headline"
            type="text"
            maxLength={64}
            value={customHeadline}
            onChange={(e) => setCustomHeadline(e.target.value)}
            placeholder="RELIABLE POS FOR FAST-MOVING SHOPS"
            className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <label
              htmlFor="promo-custom-offer"
              className="text-[11px] font-semibold text-slate-300"
            >
              Custom Offer
            </label>
            {customOffer && (
              <button
                type="button"
                onClick={() => setCustomOffer('')}
                className="text-[10px] font-semibold text-slate-400 hover:text-white inline-flex items-center gap-0.5 cursor-pointer"
                aria-label="Reset Custom Offer"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
          <input
            id="promo-custom-offer"
            type="text"
            maxLength={48}
            value={customOffer}
            onChange={(e) => setCustomOffer(e.target.value)}
            placeholder="KSh 500/= Monthly · 22 + 7 Days Free"
            className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Print PDF Layout Settings (Paper Size, Margin, DPI, Crop Marks) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPrintSettings((prev) => !prev)}
          aria-expanded={showPrintSettings}
          className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-800/50 cursor-pointer transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-200 truncate">
              PDF Print Layout
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono text-slate-400">
              {paperSize.toUpperCase()} · {printMarginMm}mm · {printDpi} DPI
            </span>
            {showPrintSettings ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {showPrintSettings && (
          <div className="px-3 pb-3 pt-2 border-t border-slate-800 space-y-2.5">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="promo-pdf-paper"
                  className="block text-[10px] font-semibold text-slate-400"
                >
                  Paper
                </label>
                <select
                  id="promo-pdf-paper"
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as FlyerPdfPaperSize)}
                  className="w-full min-h-[36px] px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-semibold text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                  <option value="a5">A5</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="promo-pdf-margin"
                  className="block text-[10px] font-semibold text-slate-400"
                >
                  Margin
                </label>
                <select
                  id="promo-pdf-margin"
                  value={printMarginMm}
                  onChange={(e) => setPrintMarginMm(Number(e.target.value))}
                  className="w-full min-h-[36px] px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-semibold text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={0}>0 mm (Bleed)</option>
                  <option value={5}>5 mm</option>
                  <option value={10}>10 mm</option>
                  <option value={15}>15 mm</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="promo-pdf-dpi"
                  className="block text-[10px] font-semibold text-slate-400"
                >
                  Resolution
                </label>
                <select
                  id="promo-pdf-dpi"
                  value={printDpi}
                  onChange={(e) => setPrintDpi(Number(e.target.value) as FlyerPdfDpi)}
                  className="w-full min-h-[36px] px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-semibold text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={150}>150 DPI</option>
                  <option value={300}>300 DPI</option>
                  <option value={600}>600 DPI</option>
                </select>
              </div>
            </div>

            <label className="flex items-center justify-between gap-2 text-[11px] text-slate-300 cursor-pointer select-none pt-0.5">
              <span>Include corner trim / crop marks (when margin ≥ 4mm)</span>
              <input
                type="checkbox"
                checked={includeCropMarks}
                onChange={(e) => setIncludeCropMarks(e.target.checked)}
                disabled={printMarginMm < 4}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer disabled:opacity-40"
              />
            </label>
          </div>
        )}
      </div>

      {/* Download PNG, Export Print PDF & Share Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleDownloadFlyer}
          className="min-h-[44px] px-3 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer transition"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Download PNG</span>
        </button>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExportingPdf}
          className="min-h-[44px] px-3 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer transition"
        >
          <Printer className="w-4 h-4 shrink-0" />
          <span>{isExportingPdf ? 'Building PDF...' : 'Export Print PDF'}</span>
        </button>
        <button
          type="button"
          onClick={handleShareFlyerImage}
          disabled={isSharing}
          className="min-h-[44px] px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer transition"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          <span>{isSharing ? 'Preparing Flyer...' : 'Share Flyer'}</span>
        </button>
      </div>
    </div>
  );
};
