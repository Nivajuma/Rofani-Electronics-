import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

async function generateWithFallback(ai: GoogleGenAI, contents: any, config: any) {
  const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
  let lastError: any = null;

  for (const model of candidateModels) {
    const attemptTimeoutMs = model === 'gemini-4-hydrogen' ? 5000 : 4000;
    try {
      const nextConfig: any = {
        ...config,
        abortSignal: AbortSignal.timeout(attemptTimeoutMs),
      };
      if (model === 'gemini-4-hydrogen') {
        nextConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }
      return await ai.models.generateContent({
        model,
        contents,
        config: nextConfig,
      });
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || '');
      const name = String(err?.name || '');
      const status = Number(
        err?.status || err?.code || (errMsg.includes('503') ? 503 : errMsg.includes('429') ? 429 : 0)
      );
      if (
        name === 'TimeoutError' ||
        name === 'AbortError' ||
        status === 429 ||
        status === 503 ||
        status === 404 ||
        /timeout|timed out|aborted|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|not found|is not supported/i.test(
          errMsg
        )
      ) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const {
      audience,
      customerName,
      customerType,
      campaignGoal,
      offerType,
      discountValue,
      promoCode,
      selectedProducts,
      tone,
      customNotes,
      storeName,
      storePhone,
      validityDays,
    } = body;

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY;

    if (!apiKey) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on this server. Add GEMINI_API_KEY in Vercel Environment Variables or AI Studio Secrets.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 9000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const audienceDescription = customerName
      ? `Individual Customer: "${customerName}" (${customerType || 'Retail Client'})`
      : audience === 'vip'
      ? 'VIP High Spender Customers'
      : audience === 'debtors'
      ? 'Customers with outstanding debt (incentivize paying balance with a reward discount)'
      : audience === 'wholesalers'
      ? 'Wholesale / Bulk buyers'
      : audience === 'inactive'
      ? "Lapsed / Inactive Customers who haven't shopped in 30+ days"
      : 'All Registered Retail Customers';

    const offerDescription =
      offerType === 'percentage'
        ? `${discountValue || 15}% OFF`
        : offerType === 'fixed_voucher'
        ? `KSh ${Number(discountValue || 500).toLocaleString()} OFF voucher on purchases`
        : offerType === 'bogo'
        ? 'Buy One Get One (BOGO) Special'
        : offerType === 'clearance'
        ? `${discountValue || 25}% OFF Clearance Stock Liquidation`
        : `${discountValue || 10}% Discount + Free Delivery / Gift`;

    const prompt = `You are an elite retail marketing strategist and copywriter in Kenya crafting customer promotions for "${storeName || 'ROFANI Electronics & Boutique'}" (Retail store selling electronics, smartphones, fashion, shoes, and beauty products).

Campaign Specifications:
- Target Audience: ${audienceDescription}
- Goal: ${campaignGoal || 'Seasonal Promotion / Flash Sale'}
- Offer: ${offerDescription}
- Promo Code: ${promoCode || 'ROFANI-SPECIAL'}
- Validity: Next ${validityDays || 3} days
- Tone: ${tone || 'Friendly Kenyan English with touch of Sheng/Swahili buzzwords'}
- Featured Items/Categories: ${selectedProducts && selectedProducts.length > 0 ? selectedProducts.join(', ') : 'Store-wide electronics and boutique clothing'}
- Store Contact / Location: ${storePhone || '0700 000 000'}, Nairobi, Kenya
${customNotes ? `- Manager's Custom Directive: ${customNotes}` : ''}

Generate high-converting, realistic copy in JSON format with these exact keys:
1. "headline": Catchy campaign title with emojis.
2. "whatsappMessage": Highly engaging WhatsApp copy formatted with bolding (*text*), emojis, line breaks, promo code, and clear call-to-action to reply or visit.
3. "smsMessage": Concise SMS text strictly under 160 characters (ready for Kenyan bulk SMS gateway).
4. "emailSubject": Compelling high open-rate email subject line.
5. "emailBody": 2-3 paragraph personalized email body.
6. "socialFlyerCopy": Short headline + 3 bullet points suitable for an in-store printed poster or Instagram/Facebook story.
7. "suggestedCallToAction": A direct 1-sentence prompt for the customer.
8. "marketingTip": A tactical retail tip for the manager (e.g. ideal broadcast time, follow-up advice).`;

    const response = await generateWithFallback(ai, prompt, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          whatsappMessage: { type: Type.STRING },
          smsMessage: { type: Type.STRING },
          emailSubject: { type: Type.STRING },
          emailBody: { type: Type.STRING },
          socialFlyerCopy: { type: Type.STRING },
          suggestedCallToAction: { type: Type.STRING },
          marketingTip: { type: Type.STRING },
        },
        required: [
          'headline',
          'whatsappMessage',
          'smsMessage',
          'emailSubject',
          'emailBody',
          'socialFlyerCopy',
          'suggestedCallToAction',
          'marketingTip',
        ],
      },
    });

    const replyText = (response.text || '').trim();
    if (!replyText) {
      res.status(502).json({ error: 'Gemini AI returned an empty promotion response. Please retry.' });
      return;
    }

    res.status(200).json(JSON.parse(replyText));
  } catch (err: any) {
    console.error('Vercel Promotion Generator error:', err?.message || err);
    const status = err?.status === 429 ? 429 : err?.status === 403 ? 403 : 502;
    res.status(status).json({
      error: err?.message || 'Unable to generate promotion copy right now. Please try again.',
    });
  }
}
