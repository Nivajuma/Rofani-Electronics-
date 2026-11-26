import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const DEFAULT_STORE_CATEGORIES = [
  'Electronics',
  'Phones & Accessories',
  'Household',
  'Clothes (Men, Women & Kids Wear)',
  'Shoes',
  'Beauty Products',
  'Hardware Products',
];

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
    const { imageBase64, existingProducts, fileName, storeCategories } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'imageBase64 is required' });
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
          'GEMINI_API_KEY is not configured on this server. Add GEMINI_API_KEY in AI Studio Secrets or Vercel Environment Variables to identify products from photos.',
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

    if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
      const imgFetch = await fetch(imageBase64);
      if (!imgFetch.ok) {
        res.status(400).json({ error: `Could not fetch image URL (HTTP ${imgFetch.status}).` });
        return;
      }
      const buffer = await imgFetch.arrayBuffer();
      mimeType = imgFetch.headers.get('content-type') || 'image/jpeg';
      cleanData = Buffer.from(buffer).toString('base64');
    } else if (imageBase64.includes(';base64,')) {
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

    const allowedCategories: string[] =
      Array.isArray(storeCategories) && storeCategories.length > 0
        ? storeCategories.map((c: any) => String(c)).filter(Boolean)
        : DEFAULT_STORE_CATEGORIES;

    let catalogContextStr = '';
    if (Array.isArray(existingProducts) && existingProducts.length > 0) {
      const sample = existingProducts
        .slice(0, 60)
        .map(
          (p: any) =>
            `- ID: ${p.id} | Name: "${p.name}" | Category: ${p.category} | SKU: ${p.sku} | Barcode: ${p.barcode || 'N/A'} | Price: KSh ${p.sellingPrice}`
        )
        .join('\n');
      catalogContextStr = `\nExisting Local Product Catalog (Total: ${existingProducts.length} items):\n${sample}\n\nIf the photographed item clearly matches an existing item above, set "isExistingMatch": true, "matchedProductId" to its ID, and match its exact name/price unless a new price sticker is visible.\n`;
    }

    const prompt = `Inspect this product photo carefully for a retail shop in Kenya ("Rofani Electronics & Boutique").
Read EVERY visible word, brand logo, model number, size/volume/wattage/capacity label, barcode digits, and price sticker in the image.

Choose "category" strictly from this store category list:
${allowedCategories.map((c) => `- ${c}`).join('\n')}
${catalogContextStr}
${fileName && !/^(Camera_Product|IMG|PXL|PHOTO|Screenshot)/i.test(fileName) ? `Filename hint: "${fileName}"\n` : ''}
OUTPUT REQUIREMENTS:
1. "name": Exact, specific product name including brand, model, variant, color, or capacity visible in the photo (e.g., "Samsung 25W USB-C Super Fast Wall Charger", "Oraimo FreePods 4 ANC Earbuds - Black", "Nivea Perfect & Radiant Body Lotion 400ml", "Ramtons RM/329 Electric Kettle 1.7L", "Men Slim Fit Stretch Jeans - Dark Blue").
   NEVER return vague labels like "Household Product", "New Product", "Scanned Item", or "Unknown Product".
2. "category": One exact category from the list above matching what is actually shown in the photo.
3. "subcategory": Specific subcategory (e.g. "Audio & Earbuds", "Chargers & Cables", "Skincare & Lotions", "Kitchen Appliances", "Footwear").
4. "sizeCapacity": Exact size, capacity, wattage, storage, volume, or clothing/shoe size visible or standard for the item (e.g. "400ml", "1.7L", "25W", "128GB", "Size 42", "Standard").
5. "unit": Retail selling unit (e.g. "pcs", "pack", "bottle", "pair", "box").
6. "suggestedPriceKSh": If a price tag/sticker is visible in the photo, use that exact number. Otherwise estimate a realistic Kenyan retail selling price in KSh specifically for THIS exact item and brand (e.g., USB cable ~350, 400ml lotion ~650, electric kettle ~2500, smartphone ~18500 — DO NOT default everything to 1200). Must be a positive integer.
7. "suggestedCostKSh": Realistic wholesale buying cost in KSh (roughly 65-75% of suggestedPriceKSh). Must be a positive integer.
8. "description": 1-2 concrete sentences describing the visible product specifications, brand/model, material, color, capacity/size, and usage based strictly on what is seen in the image.
9. "suggestedSku": Clean uppercase stock SKU code tailored to the product (e.g., "ROF-SAM-25W").
10. "suggestedBarcode": Exact numeric barcode if clearly readable in the photo, otherwise empty string "".
11. "confidenceScore": Number from 0.0 to 1.0.
12. "isExistingMatch": Boolean.
13. "matchedProductId": Matched product ID string if isExistingMatch is true, otherwise "".`;

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
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            subcategory: { type: Type.STRING },
            sizeCapacity: { type: Type.STRING },
            unit: { type: Type.STRING },
            suggestedPriceKSh: { type: Type.NUMBER },
            suggestedCostKSh: { type: Type.NUMBER },
            description: { type: Type.STRING },
            suggestedSku: { type: Type.STRING },
            suggestedBarcode: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            isExistingMatch: { type: Type.BOOLEAN },
            matchedProductId: { type: Type.STRING },
          },
          required: [
            'name',
            'category',
            'subcategory',
            'suggestedPriceKSh',
            'suggestedCostKSh',
            'description',
            'suggestedSku',
          ],
        },
      },
    });

    const replyText = (response.text || '').trim();
    if (!replyText) {
      res.status(502).json({ error: 'Gemini AI returned an empty response. Please try a clearer photo.' });
      return;
    }

    const parsed = JSON.parse(replyText);
    const cleanName = String(parsed.name || '').trim();
    if (!cleanName || /^(new\s+household\s+product|scanned\s+item|unknown\s+product|item)$/i.test(cleanName)) {
      res.status(422).json({
        error: 'Could not clearly identify the product from this image. Please capture a sharper photo showing the item or label.',
      });
      return;
    }

    const sellingPrice = Math.max(1, Math.round(Number(parsed.suggestedPriceKSh) || 0));
    const costPrice = Math.max(
      1,
      Math.round(Number(parsed.suggestedCostKSh) || Math.round(sellingPrice * 0.7))
    );

    res.status(200).json({
      ...parsed,
      name: cleanName,
      suggestedPriceKSh: sellingPrice,
      suggestedCostKSh: costPrice,
      matchedProductId: parsed.isExistingMatch && parsed.matchedProductId ? parsed.matchedProductId : null,
      needsNameReview: false,
    });
  } catch (err: any) {
    console.error('Product identification error:', err);
    const status = err?.status === 429 ? 429 : err?.status === 403 ? 403 : 502;
    res.status(status).json({
      error: err?.message || 'AI vision service failed to analyze the product photo. Please retry.',
    });
  }
}
