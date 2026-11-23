import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Share2,
  Smartphone,
  Square,
  Sparkles,
} from 'lucide-react';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_PRIMARY,
  SUPPORT_PHONE_SECONDARY,
} from '../../utils/supportConfig';

export type FlyerFormat = '1:1' | '9:16';

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
  const laptopW = isVertical ? contentW * 0.72 : contentW * 0.85;
  const laptopH = laptopW * 0.62;
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
  const printerW = isVertical ? contentW * 0.38 : contentW * 0.44;
  const printerH = isVertical ? 146 : 112;
  const printerX = originX + (isVertical ? 18 : 10);
  const printerY = originY + contentH - printerH - 6;

  const paperW = printerW * 0.66;
  const paperX = printerX + (printerW - paperW) / 2;
  const paperH = isVertical ? 112 : 88;
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
  const phoneW = isVertical ? contentW * 0.36 : contentW * 0.43;
  const phoneH = isVertical ? contentH * 0.72 : contentH * 0.7;
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
  const [isSharing, setIsSharing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const canvasWidth = 1080;
  const canvasHeight = format === '1:1' ? 1080 : 1920;

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvasWidth;
    const H = canvasHeight;
    const isVertical = format === '9:16';

    ctx.clearRect(0, 0, W, H);

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
      // ==================== 1:1 SQUARE LAYOUT ====================
      const contentTop = headerY + logoSize + 44;
      const contentBottom = footerY - 26;
      const contentH = contentBottom - contentTop;

      const leftW = 492;
      const colGap = 28;
      const rightX = margin + leftW + colGap;
      const rightW = innerW - leftW - colGap;

      ctx.font = `900 50px ${FONT_STACK}`;
      const headlineLines = wrapTextLines(ctx, 'RELIABLE POS FOR FAST-MOVING SHOPS', leftW);
      let lineY = contentTop + 26;
      headlineLines.forEach((line, idx) => {
        ctx.fillStyle = idx >= headlineLines.length - 2 ? '#38bdf8' : '#ffffff';
        ctx.font = `900 50px ${FONT_STACK}`;
        ctx.fillText(line, margin, lineY);
        lineY += 56;
      });

      // Green Highlight Banner
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

      // Offer + Referral Card
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

      ctx.fillStyle = '#ffffff';
      ctx.font = `900 38px ${FONT_STACK}`;
      ctx.fillText('22 + 7 Days Free Trial', margin + 22, offerY + 72);

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

      // Pure Rofani POS Hardware & App Showcase
      drawHardwareShowcase(ctx, rightX, contentTop, rightW, contentH, false);
    } else {
      // ==================== 9:16 VERTICAL STATUS / TIKTOK LAYOUT ====================
      const headlineTop = headerY + logoSize + 64;
      ctx.font = `900 66px ${FONT_STACK}`;
      const headlineLines = wrapTextLines(ctx, 'RELIABLE POS FOR FAST-MOVING SHOPS', innerW);
      let lineY = headlineTop;
      headlineLines.forEach((line, idx) => {
        ctx.fillStyle = idx === headlineLines.length - 1 ? '#38bdf8' : '#ffffff';
        ctx.font = `900 66px ${FONT_STACK}`;
        const lw = ctx.measureText(line).width;
        ctx.fillText(line, margin + (innerW - lw) / 2, lineY);
        lineY += 76;
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

      ctx.fillStyle = '#ffffff';
      ctx.font = `900 48px ${FONT_STACK}`;
      ctx.fillText('22 + 7 Days Free Trial', margin + 28, offerY + 94);

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

      // Pure Rofani POS Hardware & App Showcase
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
  }, [canvasHeight, canvasWidth, format, hasReferralCode, inviteUrl, referralCode]);

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

      {/* Download & Share Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleDownloadFlyer}
          className="min-h-[44px] px-3 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer transition"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Download Flyer PNG</span>
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
