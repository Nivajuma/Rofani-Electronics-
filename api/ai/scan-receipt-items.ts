import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

async function generateWithFallback(
  ai: GoogleGenAI,
  requestParams: { contents: any; config?: any }
) {
  const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
  let lastError: any = null;

  for (const model of candidateModels) {
    const attemptTimeoutMs = model === 'gemini-4-hydrogen' ? 5000 : 4000;
    try {
      const config: any = {
        ...(requestParams.config || {}),
        abortSignal: AbortSignal.timeout(attemptTimeoutMs),
      };
      if (model === 'gemini-4-hydrogen' && !config.thinkingConfig) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }
      return await ai.models.generateContent({
        model,
        contents: requestParams.contents,
        config,
      });
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || '');
      const name = String(err?.name || '');
      const status =
        err?.status ||
        err?.code ||
        (errMsg.includes('503') ? 503 : errMsg.includes('429') ? 429 : errMsg.includes('404') ? 404 : 0);

      const isRetryable =
        name === 'TimeoutError' ||
        name === 'AbortError' ||
        status === 503 ||
        status === 429 ||
        status === 404 ||
        /timeout|timed out|aborted|high demand|UNAVAILABLE|RESOURCE_EXHAUSTED|temporarily unavailable|not found|is not supported/i.test(
          errMsg
        );

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
    const { imageBase64, productsCatalog = [], storeCategories = [] } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'imageBase64 image is required' });
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
          'GEMINI_API_KEY is not configured on this server. Add GEMINI_API_KEY in AI Studio Secrets or Vercel Environment Variables to use AI photo scanning.',
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

    let mimeType = 'image/jpeg';
    let cleanData = imageBase64;
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '') || 'image/jpeg';
      cleanData = (parts[1] || '').trim();
    } else {
      cleanData = imageBase64.trim();
    }

    if (!cleanData || cleanData.length < 32) {
      res.status(400).json({ error: 'Uploaded image data is empty or invalid.' });
      return;
    }

    const catalogSummary = (productsCatalog || []).slice(0, 180).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      barcode: p.barcode || '',
      price: p.sellingPrice,
      category: p.category || '',
      stock: p.stockQuantity || 0,
      unit: p.unit || 'pcs',
    }));

    const categoriesHint =
      Array.isArray(storeCategories) && storeCategories.length > 0
        ? `Available store categories: ${storeCategories.join(', ')}.`
        : 'Store categories include Electronics, Phones & Accessories, Household, Clothes (Men, Women & Kids Wear), Shoes, Beauty Products, Hardware Products.';

    const prompt = `You are an expert AI retail cashier and inventory vision specialist for "ROFANI ELECTRONICS AND BOUTIQUE" in Kenya.
Carefully examine this image (it may show one or more physical products on a counter/shelf, packaging boxes with brand labels, price tags, or a printed/handwritten receipt or order list).

${categoriesHint}

Current store catalog:
${JSON.stringify(catalogSummary, null, 1)}

TASK:
1. Identify EVERY distinct physical product or line item visible in the photo. Read visible brand names, model numbers, volumes/wattages/sizes, and any printed price stickers or receipt totals.
2. If an item matches an existing product in the store catalog above, add it to "matchedItems" with exact "productId", "matchedProductName", detected "quantity", "confidence" (0.0-1.0), and brief "reason".
3. If an item is visible in the photo or receipt but NOT in the store catalog, add it to "unmatchedItems" with:
   - "detectedName": Exact, specific retail product name including brand/model/size (NEVER generic names like "Household Product" or "Scanned Item").
   - "quantity": Integer count visible or listed (default 1).
   - "suggestedPriceKSh": Exact printed/written price if shown, otherwise a realistic Kenyan retail selling price in KSh tailored specifically to that exact item (NEVER default blindly to 1200).
   - "suggestedCostKSh": Realistic wholesale cost in KSh (~65-75% of suggestedPriceKSh).
   - "category": Matching store category from the actual item shown.
   - "subcategory": Relevant subcategory.
   - "sizeCapacity": Exact size, capacity, volume, wattage, or "Standard".
   - "unit": Retail unit (e.g. "pcs", "pair", "bottle", "pack", "box").
   - "suggestedSku": Clean uppercase SKU code (e.g. "ROF-JBL-110").
   - "suggestedBarcode": Numeric barcode if readable on packaging, else "".
   - "description": Concrete 1-2 sentence description specifying brand, type, color, material, capacity, or key features visible in the photo.
4. Provide a concise "summaryNote" stating what was detected.`;

    const response = await generateWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanData,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  matchedProductName: { type: Type.STRING },
                  quantity: { type: Type.INTEGER },
                  confidence: { type: Type.NUMBER },
                  reason: { type: Type.STRING },
                },
                required: ['productId', 'matchedProductName', 'quantity', 'confidence'],
              },
            },
            unmatchedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  detectedName: { type: Type.STRING },
                  quantity: { type: Type.INTEGER },
                  suggestedPriceKSh: { type: Type.NUMBER },
                  suggestedCostKSh: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                  subcategory: { type: Type.STRING },
                  sizeCapacity: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  suggestedSku: { type: Type.STRING },
                  suggestedBarcode: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: [
                  'detectedName',
                  'quantity',
                  'suggestedPriceKSh',
                  'suggestedCostKSh',
                  'category',
                  'description',
                ],
              },
            },
            summaryNote: { type: Type.STRING },
          },
          required: ['matchedItems', 'unmatchedItems', 'summaryNote'],
        },
      },
    });

    const replyText = (response.text || '').trim();
    if (!replyText) {
      res.status(502).json({ error: 'Gemini AI returned an empty response. Please try a clearer photo.' });
      return;
    }

    const parsed = JSON.parse(replyText);
    res.status(200).json(parsed);
  } catch (err: any) {
    console.error('Receipt/item vision scan error:', err);
    const status = err?.status === 429 ? 429 : err?.status === 403 ? 403 : 502;
    res.status(status).json({
      error: err?.message || 'AI vision service could not analyze the photo. Please retry.',
    });
  }
}
