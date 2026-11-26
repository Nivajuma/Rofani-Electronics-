import { GoogleGenAI, ThinkingLevel } from '@google/genai';

function mapGeminiError(err: any): { status: number; error: string } {
  const errMsg = String(err?.message || '');
  const rawStatus = Number(err?.status || err?.code || 0);
  const name = String(err?.name || '');

  if (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    /timeout|timed out|aborted/i.test(errMsg)
  ) {
    return {
      status: 504,
      error: 'The AI service took too long to respond. Please tap Retry in a moment.',
    };
  }

  if (rawStatus === 403 || /PERMISSION_DENIED/i.test(errMsg)) {
    return {
      status: 403,
      error:
        'Gemini API permission denied. Please verify GEMINI_API_KEY in Vercel Environment Variables or AI Studio Secrets.',
    };
  }

  if (rawStatus === 400 && /API_KEY_INVALID|API key not valid/i.test(errMsg)) {
    return {
      status: 400,
      error:
        'The configured GEMINI_API_KEY appears invalid. Please update it in Vercel Environment Variables or AI Studio Secrets.',
    };
  }

  if (
    rawStatus === 429 ||
    /RESOURCE_EXHAUSTED|ResourceExhausted|rate[\s_-]*exceeded|rate[\s_-]*limit|too many requests|quota/i.test(
      errMsg
    )
  ) {
    return {
      status: 429,
      error:
        'AI assistant is busy right now due to high traffic/rate limits. Please wait a moment and tap Retry.',
    };
  }

  if (rawStatus === 404 || /NOT_FOUND|is not found/i.test(errMsg)) {
    return {
      status: 404,
      error: errMsg || 'Requested AI model could not be found.',
    };
  }

  if (rawStatus === 503 || /UNAVAILABLE|high demand/i.test(errMsg)) {
    return {
      status: 503,
      error: 'AI service is temporarily busy. Please try again shortly.',
    };
  }

  return {
    status: 502,
    error: errMsg || 'Unable to get a response from Gemini AI right now. Please try again.',
  };
}

async function generateWithFallback(
  ai: GoogleGenAI,
  contents: any,
  systemInstruction: string
) {
  const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
  let lastError: any = null;

  for (const model of candidateModels) {
    const attemptTimeoutMs = model === 'gemini-4-hydrogen' ? 8500 : 9500;
    try {
      const config: any = {
        systemInstruction,
        abortSignal: AbortSignal.timeout(attemptTimeoutMs),
      };
      if (model === 'gemini-4-hydrogen') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }
      return await ai.models.generateContent({
        model,
        contents,
        config,
      });
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || '');
      const name = String(err?.name || '');
      const status = Number(
        err?.status || err?.code || (errMsg.includes('503') ? 503 : errMsg.includes('429') ? 429 : 0)
      );

      const isTimeout =
        name === 'TimeoutError' ||
        name === 'AbortError' ||
        /timeout|timed out|aborted/i.test(errMsg);
      const isRetryable =
        isTimeout ||
        status === 429 ||
        status === 503 ||
        status === 404 ||
        /RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|not found|is not supported/i.test(errMsg);

      if (isRetryable) {
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
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY;

    if (!apiKey) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on this server. In Vercel, add GEMINI_API_KEY under Project Settings → Environment Variables and redeploy (or in AI Studio Settings → Secrets).',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 15000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const lowStockSummary = context?.topLowStockText
      ? `\n- Low Stock Preview: ${context.topLowStockText}`
      : context?.criticalItemsText
      ? `\n- Critical Stock: ${context.criticalItemsText}`
      : '';

    const systemInstruction = `You are "ROFANI AI Co-Pilot", a concise, practical POS tutor & retail strategist for Rofani POS in Kenya.
Help users with:
1. Sales & Checkout (Cash, M-Pesa STK Push/Till/Paybill, Card, Split Payments, Customer Credit/Layby, Advance Deposits wallet redemption, Calculator Give Change).
2. Inventory & Low Stock (restocking, AI product photo scan, barcode labels, inter-branch stock transfers).
3. Customers, Partial Payments & Returns (customer advance deposits, partial balance settlements, partial/cash goods returns with Credit Note PDFs, resellable stock restoration vs damaged write-off, customer complaints).
4. Multi-Shop Management (adding branches, Multi-Branch Business Group switcher, cloud + local/email backups).
5. Reports & KRA Compliance (daily sales, expenses, profit, worker wages/commissions; KRA & e-TIMS Compliance Center for iTax TOT 1.5%, VAT 16%, Credit Notes, VSCU/OSCU config & JSON payload export).
6. Plans & Customer Care: 7-day free trial (22 days with a referral code), +30 days free per referred shop, paid plans 30d KSh 500 / 3m KSh 1,350 / 6m KSh 2,650 / 12m KSh 5,000. Human Customer Care: rofanipos@gmail.com, WhatsApp +254 734 128 888, Calls +254 734 128 888 / +254 713 128 888.

Active Store Context:
- Store: ${context?.storeName || 'Rofani POS'} | Role: ${context?.role || 'Staff'} | View: ${context?.activeTab || 'POS'}
- Products: ${context?.totalProducts ?? 0} | Low Stock: ${context?.lowStockCount ?? 0} | Out of Stock: ${context?.outOfStockCount ?? 0} | Today Sales: KSh ${Number(context?.totalSalesToday || 0).toLocaleString()}${lowStockSummary}

Formatting Rules:
- Be concise and mobile-friendly (under ~180 words unless detailed steps are requested).
- Use short bullet points (- ) and **bold** key actions or menu paths.
- Mention exact KSh figures or product names from context when relevant.`;

    const response = await generateWithFallback(ai, prompt, systemInstruction);
    const replyText = (response.text || '').trim();
    if (!replyText) {
      res.status(502).json({ error: 'Gemini AI returned an empty response. Please try asking again.' });
      return;
    }

    res.status(200).json({ reply: replyText });
  } catch (err: any) {
    const mapped = mapGeminiError(err);
    if (mapped.status === 504 || mapped.status === 429 || mapped.status === 503) {
      console.warn('Vercel AI Assistant transient response:', mapped.status, err?.message || err);
    } else {
      console.error('Vercel AI Assistant error:', err?.message || err);
    }
    res.status(mapped.status).json({ error: mapped.error });
  }
}
