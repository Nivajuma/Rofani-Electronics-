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
    const { items, summary, storeName, targetDaysCover } = body;

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

    const itemsSample = (items || []).slice(0, 15).map((item: any) => ({
      name: item.productName,
      category: item.category,
      currentStock: item.currentStock,
      minStock: item.minStockAlert,
      dailyVelocity: item.dailyVelocity,
      weeklyVelocity: item.weeklyVelocity,
      daysRemaining: item.daysRemaining,
      urgency: item.urgency,
      recommendedOrderQty: item.recommendedOrderQty,
      estimatedCostKSh: item.estimatedCost,
      sellingPriceKSh: item.sellingPrice,
    }));

    const prompt = `You are a retail inventory and supply chain optimization AI specialist analyzing stock for "${storeName || 'ROFANI Electronics & Boutique'}" in Kenya.
We evaluated current sales velocity across customer transactions and calculated days of stock runway remaining for each product.
Target stock buffer: ${targetDaysCover || 21} days.

Summary Metrics:
- Health Score: ${summary?.overallHealthScore ?? 80}/100
- Out of Stock Items: ${summary?.outOfStockCount ?? 0}
- Critical Items (<4 days stock runway left): ${summary?.criticalCount ?? 0}
- Reorder Soon Items: ${summary?.reorderSoonCount ?? 0}
- Total Working Capital Needed: KSh ${(summary?.totalWorkingCapitalNeeded ?? 0).toLocaleString()}
- Total Units to Restock: ${summary?.totalRecommendedUnits ?? 0}

Sample Catalog Items with Real Velocity:
${JSON.stringify(itemsSample, null, 2)}

Provide a concise, high-value strategic replenishment briefing for the store manager in JSON:
{
  "executiveSummary": "2-3 sentences summarizing current stock risks, lost sales vulnerabilities, and capital requirement in KSh.",
  "priorityActions": ["Array of 3-4 specific prioritized action items for the inventory manager"],
  "workingCapitalTip": "Practical Kenya retail cash-flow advice on allocating working capital between fast-turnover and high-margin goods.",
  "demandOutlook": "Brief forecast on category demand trends (Electronics, Boutique, Accessories)."
}`;

    const response = await generateWithFallback(ai, prompt, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: { type: Type.STRING },
          priorityActions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          workingCapitalTip: { type: Type.STRING },
          demandOutlook: { type: Type.STRING },
        },
        required: ['executiveSummary', 'priorityActions', 'workingCapitalTip', 'demandOutlook'],
      },
    });

    const replyText = (response.text || '').trim();
    if (!replyText) {
      res.status(502).json({ error: 'Gemini AI returned an empty replenishment forecast. Please retry.' });
      return;
    }

    res.status(200).json(JSON.parse(replyText));
  } catch (err: any) {
    console.error('Vercel Replenishment Forecast error:', err?.message || err);
    const status = err?.status === 429 ? 429 : err?.status === 403 ? 403 : 502;
    res.status(status).json({
      error: err?.message || 'Unable to generate AI replenishment forecast right now.',
    });
  }
}
