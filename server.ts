import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Gemini AI Client
  const getGeminiClient = () => {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 25000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Map upstream Gemini errors to clear HTTP status & user-actionable error messages
  const mapGeminiHttpError = (err: any, fallbackMessage: string): { status: number; error: string } => {
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
        error: 'The AI service took too long to respond. Please tap retry in a moment.',
      };
    }

    if (rawStatus === 403 || /PERMISSION_DENIED/i.test(errMsg)) {
      return {
        status: 403,
        error: 'Gemini API permission denied. Please check your GEMINI_API_KEY in Settings > Secrets.',
      };
    }

    if (rawStatus === 400 && /API_KEY_INVALID|API key not valid/i.test(errMsg)) {
      return {
        status: 400,
        error: 'The configured GEMINI_API_KEY appears invalid. Please update it in Settings > Secrets.',
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
      error: errMsg || fallbackMessage,
    };
  };

  // Helper to generate content using recommended Gemini models with low-latency thinking, bounded timeouts, and fallback
  const generateContentWithFallback = async (
    ai: GoogleGenAI,
    requestParams: {
      contents: any;
      config?: any;
      timeoutMs?: number;
    }
  ) => {
    // Try recommended gemini-4-hydrogen (with ThinkingLevel.LOW for fast responsiveness), then fallback to gemini-3.1-flash-lite
    const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
    const perAttemptTimeoutMs = requestParams.timeoutMs || 15000;
    let lastError: any = null;

    for (const model of candidateModels) {
      const attemptTimeoutMs =
        requestParams.timeoutMs || (model === 'gemini-4-hydrogen' ? 11000 : 15000);
      try {
        const baseConfig = requestParams.config ? { ...requestParams.config } : {};
        if (!baseConfig.abortSignal) {
          baseConfig.abortSignal = AbortSignal.timeout(attemptTimeoutMs);
        }
        // Avoid default ThinkingLevel.HIGH multi-second reasoning stalls on interactive requests
        if (model === 'gemini-4-hydrogen' && !baseConfig.thinkingConfig) {
          baseConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const response = await ai.models.generateContent({
          model,
          contents: requestParams.contents,
          config: baseConfig,
        });
        return response;
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
        const isRateLimit =
          status === 429 ||
          /RESOURCE_EXHAUSTED|ResourceExhausted|rate[\s_-]*exceeded|rate[\s_-]*limit|too many requests|quota/i.test(
            errMsg
          );
        const isTransient =
          status === 503 ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('temporarily unavailable');

        if (isTimeout) {
          console.warn(`[Gemini API] Model ${model} timed out after ${attemptTimeoutMs}ms (limit ${perAttemptTimeoutMs}ms). Switching to fallback model...`);
          continue;
        }

        if (isRateLimit) {
          console.warn(`[Gemini API] Model ${model} hit rate limit (429). Switching to fallback model once...`);
          continue;
        }

        if (isTransient) {
          console.warn(`[Gemini API] Model ${model} temporarily busy (${status || 'transient'}). Trying fallback model...`);
          continue;
        }

        if (status === 404 || errMsg.includes('not found') || errMsg.includes('is not supported')) {
          console.warn(`[Gemini API] Model ${model} unavailable (${errMsg}). Trying fallback model...`);
          continue;
        }

        throw err;
      }
    }

    throw lastError;
  };

  // Helper: Extract intelligent product name, category, and specifications from file name or retail context
  const cleanProductNameFromContext = (
    fileName?: string,
    hintCategory: string = 'Electronics'
  ): { name: string; category: string; subcategory: string; description: string; price: number; cost: number; needsNameReview: boolean } => {
    let raw = (fileName || '').trim();

    // Strip extension
    raw = raw.replace(/\.[a-zA-Z0-9]{2,5}$/i, '');

    // Strip common camera/phone/screenshot prefixes e.g. IMG_20261108_..., PXL_..., Screenshot_..., Camera_Product_...
    raw = raw.replace(/^(Camera_Product|Camera_Snap|CameraSnap)[_\-\s\d]*/i, '');
    raw = raw.replace(/^(IMG|PXL|PHOTO|Screenshot|PIC|CAM|WP|DSC|DCIM)[_\-\s]+(\d+)*/i, '');
    raw = raw.replace(/^(IMG|PXL|PHOTO|Screenshot|PIC|CAM|WP|DSC|DCIM)(\d{4,})/i, '');

    // Replace underscores, hyphens, pluses, dots with spaces
    let clean = raw.replace(/[_\-+.]+/g, ' ').replace(/\s+/g, ' ').trim();

    // If remaining text is just numbers or very short, fallback to a descriptive retail title
    let isGeneric = !clean || clean.length < 3 || /^\d+$/.test(clean);

    let category = hintCategory;
    let subcategory = 'General Accessories';
    let detectedName = clean;

    const lower = clean.toLowerCase();
    if (/phone|samsung|iphone|tecno|infinix|redmi|oppo|charger|cable|earbud|airpod|headphone|powerbank|tempered|case|screen protector|adapter/i.test(lower)) {
      category = 'Phones & Accessories';
      subcategory = /charger|cable|adapter/.test(lower) ? 'Chargers & Cables' : /earbud|airpod|headphone/.test(lower) ? 'Audio & Earphones' : 'Phone Cases & Accessories';
    } else if (/tv|speaker|soundbar|subwoofer|radio|kettle|iron|blender|microwave|remote|audio|display|extension|kettle/i.test(lower)) {
      category = 'Electronics';
      subcategory = /kettle|iron|blender|microwave/.test(lower) ? 'Kitchen Appliances' : 'Audio & Home Entertainment';
    } else if (/dress|shirt|trouser|jean|jacket|hoodie|suit|blouse|skirt|boxer|t-shirt|tee|polo|kurta|sweater|cloth|wear/i.test(lower)) {
      category = 'Clothes (Men, Women & Kids Wear)';
      subcategory = /dress|skirt|blouse/.test(lower) ? 'Ladies Fashion' : /jean|trouser|shirt|suit/.test(lower) ? "Men's Apparel" : 'Casual Wear';
    } else if (/shoe|sneaker|boot|loafer|sandal|heel|slippers|slides|crocs/i.test(lower)) {
      category = 'Shoes';
      subcategory = /sneaker|boot/.test(lower) ? 'Sneakers & Boots' : /heel|sandal/.test(lower) ? 'Ladies Footwear' : 'Casual Footwear';
    } else if (/lotion|perfume|cream|soap|oil|makeup|powder|shampoo|cologne|beauty|serum|lipstick/i.test(lower)) {
      category = 'Beauty Products';
      subcategory = /perfume|cologne/.test(lower) ? 'Fragrances & Perfumes' : 'Skincare & Cosmetics';
    } else if (/cement|paint|pipe|wire|bulb|screw|hammer|padlock|socket|switch|hardware|tool/i.test(lower)) {
      category = 'Hardware Products';
      subcategory = 'Tools & Electrical';
    } else if (/plate|cup|flask|mop|bucket|curtain|towel|bedsheet|duvet|kitchen|utensil|household/i.test(lower)) {
      category = 'Household';
      subcategory = 'Kitchen & Homeware';
    }

    if (isGeneric) {
      detectedName = `New ${category} Product`;
    } else {
      // Capitalize each word nicely
      detectedName = clean
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    const price = category === 'Phones & Accessories' ? 1800 : category === 'Clothes (Men, Women & Kids Wear)' ? 1600 : 1200;
    const cost = Math.round(price * 0.7);

    return {
      name: detectedName,
      category,
      subcategory,
      description: `${detectedName} (${category} - ${subcategory}). Captured from product photo. Ready for review and sale.`,
      price,
      cost,
      needsNameReview: isGeneric,
    };
  };

  // API Endpoint: AI Multimodal Product Camera Identification with Local Catalog Context Matching (0 Firestore Reads)
  app.post('/api/ai/identify-product', async (req, res) => {
    try {
      const {
        imageBase64,
        existingProducts,
        fileName,
        storeCategories,
        allowPartialOnUnclear = false,
      } = req.body || {};

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'imageBase64 is required' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets or your deployment environment variables to identify products from photos.',
        });
        return;
      }

      // Format image for inlineData
      let mimeType = 'image/jpeg';
      let cleanData = imageBase64;

      if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
        try {
          const imgFetch = await fetch(imageBase64);
          if (!imgFetch.ok) {
            res.status(400).json({ error: `Could not fetch image URL (HTTP ${imgFetch.status}).` });
            return;
          }
          const buffer = await imgFetch.arrayBuffer();
          const contentType = imgFetch.headers.get('content-type') || 'image/jpeg';
          mimeType = contentType;
          cleanData = Buffer.from(buffer).toString('base64');
        } catch (fetchErr: any) {
          res.status(400).json({ error: `Could not fetch image URL: ${fetchErr?.message || 'Invalid URL'}` });
          return;
        }
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

      const defaultCats = [
        'Electronics',
        'Phones & Accessories',
        'Household',
        'Clothes (Men, Women & Kids Wear)',
        'Shoes',
        'Beauty Products',
        'Hardware Products',
      ];
      const allowedCategories: string[] =
        Array.isArray(storeCategories) && storeCategories.length > 0
          ? storeCategories.map((c: any) => String(c)).filter(Boolean)
          : defaultCats;

      // Prepare local catalog context if provided (Zero Firestore reads)
      let catalogContextStr = '';
      if (Array.isArray(existingProducts) && existingProducts.length > 0) {
        const sample = existingProducts.slice(0, 60).map((p: any) =>
          `- ID: ${p.id} | Name: "${p.name}" | Category: ${p.category} | SKU: ${p.sku} | Barcode: ${p.barcode || 'N/A'} | Price: KSh ${p.sellingPrice}`
        ).join('\n');
        catalogContextStr = `\nExisting Local Product Catalog (Total: ${existingProducts.length} items):\n${sample}\n\nIf the photographed item clearly matches an existing item above, set "isExistingMatch": true, "matchedProductId" to its ID, and match its exact name/price unless a new price sticker is visible.\n`;
      }

      const prompt = `Inspect this product photo carefully for a retail shop in Kenya ("Rofani POS").
Read EVERY visible word, brand logo, model number, size/volume/wattage/capacity label, barcode/SKU digits, and price sticker in the image.

Select "category" strictly from this store category list whenever possible:
${allowedCategories.map((c) => `- ${c}`).join('\n')}
${catalogContextStr}
${fileName && !/^(Camera_Product|IMG|PXL|PHOTO|Screenshot)/i.test(fileName) ? `Original file/photo label hint: "${fileName}"\n` : ''}
CRITICAL REQUIREMENTS:
1. "name": Exact, specific product name including brand, model, variant, color, or capacity visible in the photo (e.g. "Samsung 25W USB-C Super Fast Wall Charger", "Oraimo FreePods 4 ANC Earbuds - Black", "Nivea Perfect & Radiant Body Lotion 400ml", "Ramtons RM/329 Cordless Kettle 1.7L", "Men Slim Fit Stretch Jeans - Dark Blue").
   If the photo is too blurry, dark, or obstructed to read clearly, set "isUnclearImage": true, explain why briefly in "clarityMessage", and leave "name" empty "" or provide only a verified visible partial name — NEVER invent random text.
2. "category": Exact category from the store category list above matching what is shown.
3. "subcategory": Specific subcategory matching the category (e.g. "Audio & Earbuds", "Chargers & Cables", "Skincare & Lotions", "Kitchen Appliances", "Footwear").
4. "sizeCapacity": Exact size, capacity, wattage, storage, volume, or apparel/shoe size visible or standard for the item (e.g. "400ml", "1.7L", "25W", "128GB", "Size 42", "Standard").
5. "unit": Retail selling unit — prefer one of "pcs", "box", "pack", "kg", "m", "liters", "pair", "bottle".
6. "suggestedPriceKSh": If a price tag/sticker is visible in the photo, use that exact number. Otherwise estimate a realistic Kenyan retail selling price in KSh specifically for THIS exact item (or 0 if image is unclear).
7. "suggestedCostKSh": Realistic wholesale/buying cost in KSh (roughly 65-75% of suggestedPriceKSh, or 0 if image is unclear).
8. "description": 1-2 short descriptive notes detailing visible specifications, brand/model, material, color, or usage based strictly on what is seen.
9. "suggestedSku": Clean uppercase stock SKU code tailored to the product (e.g. "ROF-SAM-25W").
10. "suggestedBarcode": Exact numeric barcode if clearly readable in the photo, otherwise "".
11. "confidenceScore": Confidence score between 0.0 and 1.0.
12. "isExistingMatch": Boolean indicating if it matches an item from the local catalog context.
13. "matchedProductId": String ID of the matched product if isExistingMatch is true, otherwise "".
14. "isUnclearImage": Boolean true if the image is too blurry, dark, cropped, or lacks an identifiable retail item.
15. "clarityMessage": Friendly 1-sentence guidance if isUnclearImage is true, otherwise "".`;

      const response = await generateContentWithFallback(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanData,
              },
            },
            {
              text: prompt,
            },
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
              isUnclearImage: { type: Type.BOOLEAN },
              clarityMessage: { type: Type.STRING },
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
        if (allowPartialOnUnclear) {
          res.json({
            isUnclearImage: true,
            clarityMessage: 'Photo could not be read clearly. You can fill in the item fields manually or retake the photo.',
            name: '',
            suggestedName: '',
            category: allowedCategories[0] || 'Electronics',
            suggestedCategory: allowedCategories[0] || 'Electronics',
            subcategory: 'General',
            unit: 'pcs',
            suggestedUnit: 'pcs',
            suggestedBarcode: '',
            suggestedSku: '',
            suggestedPriceKSh: 0,
            suggestedCostKSh: 0,
            description: '',
            suggestedNotes: '',
            needsNameReview: true,
          });
          return;
        }
        res.status(502).json({ error: 'Gemini AI returned an empty response. Please capture a clearer product photo.' });
        return;
      }

      const parsed = JSON.parse(replyText);
      const rawName = String(parsed.name || '').trim();
      const isVague = !rawName || /^(new\s+household\s+product|scanned\s+item|unknown\s+product|unknown|item)$/i.test(rawName);
      const isUnclear = Boolean(parsed.isUnclearImage) || isVague;

      if (isVague && !allowPartialOnUnclear) {
        res.status(422).json({
          error: 'Could not clearly identify the product from this photo. Please retake with better lighting or label focus.',
        });
        return;
      }

      const finalName = isVague ? '' : rawName;
      const finalCategory = String(parsed.category || '').trim() || allowedCategories[0] || 'Electronics';
      const rawUnit = String(parsed.unit || 'pcs').trim().toLowerCase();
      const finalUnit = rawUnit || 'pcs';
      const finalBarcode = String(parsed.suggestedBarcode || '').replace(/[^0-9A-Za-z\-]/g, '').trim();
      const finalSku = String(parsed.suggestedSku || '').trim();
      const finalNotes = String(parsed.description || '').trim();
      const sellingPrice = Math.max(0, Math.round(Number(parsed.suggestedPriceKSh) || 0));
      const costPrice = Math.max(
        0,
        Math.round(Number(parsed.suggestedCostKSh) || (sellingPrice > 0 ? Math.round(sellingPrice * 0.7) : 0))
      );

      res.json({
        ...parsed,
        name: finalName,
        suggestedName: finalName,
        category: finalCategory,
        suggestedCategory: finalCategory,
        unit: finalUnit,
        suggestedUnit: finalUnit,
        suggestedBarcode: finalBarcode,
        suggestedSku: finalSku,
        description: finalNotes,
        suggestedNotes: finalNotes,
        suggestedPriceKSh: isUnclear && sellingPrice === 0 ? 0 : Math.max(isUnclear ? 0 : 1, sellingPrice),
        suggestedCostKSh: isUnclear && costPrice === 0 ? 0 : Math.max(isUnclear ? 0 : 1, costPrice),
        matchedProductId: parsed.isExistingMatch && parsed.matchedProductId ? parsed.matchedProductId : null,
        isUnclearImage: isUnclear,
        clarityMessage: isUnclear
          ? String(parsed.clarityMessage || '').trim() ||
            'Photo looks blurry or obscured. Review or type any missing fields below before applying.'
          : '',
        needsNameReview: isUnclear,
      });
    } catch (err: any) {
      console.error('Gemini Product Vision error:', err?.message || err);
      const mapped = mapGeminiHttpError(err, 'AI product vision failed to analyze the photo. Please retry.');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // API Endpoint: AI Multimodal Receipt Vision Scanner (Auto-identify items and add to receipt)
  app.post('/api/ai/scan-receipt-items', async (req, res) => {
    try {
      const { imageBase64, productsCatalog = [] } = req.body;

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'imageBase64 image is required' });
        return;
      }

      const ai = getGeminiClient();

      // Format image for inlineData
      let mimeType = 'image/jpeg';
      let cleanData = imageBase64;

      if (imageBase64.includes(';base64,')) {
        const parts = imageBase64.split(';base64,');
        mimeType = parts[0].replace('data:', '') || 'image/jpeg';
        cleanData = (parts[1] || '').trim();
      } else {
        cleanData = imageBase64.trim();
      }

      // Compact catalog summary for Gemini (limit to 180 products)
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

      if (!ai) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in AI Studio Secrets or Vercel Environment Variables to use AI photo scanning.',
        });
        return;
      }

      const prompt = `You are an expert AI retail cashier and inventory assistant for "ROFANI ELECTRONICS AND BOUTIQUE".
A cashier or store manager has taken a camera photo or uploaded an image of:
- A physical receipt, bill, or supplier invoice
- A customer's handwritten or printed order sheet / shopping list
- Physical items placed on the checkout counter / shelf
- Product packaging boxes, retail tags, or price stickers

Here is the store's current active product catalog:
${JSON.stringify(catalogSummary, null, 1)}

TASK:
1. Thoroughly inspect the image and identify every distinct item, product, or line item visible in the photo or listed on the paper.
2. For each detected item, determine if it matches an existing product in the store catalog (by matching name, brand, model, SKU, barcode, or category).
3. If it MATCHES an existing catalog product:
   Provide its exact "productId", "matchedProductName", the detected "quantity" (count how many units are visible or specified on the receipt, default 1), "confidence" (0.0 to 1.0), and a brief "reason".
4. If an item is clearly on the receipt / photo but is NOT in the store catalog (a NEW ITEM):
   Place it in "unmatchedItems" so the store can add it as a new product to their catalog and receipt. Extract or suggest:
   - "detectedName": Clear, professional retail product name (e.g., "Oraimo 20000mAh Power Bank", "Floral Chiffon Wrap Dress", "USB-C to Lightning Braided Cable")
   - "quantity": Number of units indicated on the receipt or visible in photo (integer, default 1)
   - "suggestedPriceKSh": Realistic retail selling price in Kenya Shillings (KSh)
   - "suggestedCostKSh": Realistic wholesale/cost buying price in Kenya Shillings (KSh, approximately 65-75% of selling price)
   - "category": Fitting store category (e.g. "Electronics", "Clothing & Boutique", "Mobile Accessories", "Shoes & Footwear", "Beauty & Perfumes", "Groceries & Household")
   - "subcategory": Relevant subcategory (e.g. "Audio", "Cables", "Dresses", "Footwear")
   - "sizeCapacity": Size or capacity if detected (e.g. "L", "M", "20000mAh", "128GB", "500ml", or "Standard")
   - "unit": Retail unit (e.g. "pcs", "pairs", "kg", "pack", "box")
   - "suggestedSku": A clean SKU code like "ROF-ELEC-4921"
   - "suggestedBarcode": 13-digit EAN barcode (digits only, e.g. "616400012345") or barcode visible in photo
   - "description": 1 concise sentence describing the product specifications
5. Provide a friendly "summaryNote" describing what was identified, how many catalog matches were found, and what new items are ready to be added to inventory and receipt.`;

      const response = await generateContentWithFallback(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanData,
              },
            },
            {
              text: prompt,
            },
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
                  required: ['detectedName', 'quantity'],
                },
              },
              summaryNote: { type: Type.STRING },
            },
            required: ['matchedItems', 'summaryNote'],
          },
        },
      });

      const replyText = (response.text || '').trim();
      if (!replyText) {
        res.status(502).json({ error: 'Gemini AI returned an empty response. Please try a clearer photo.' });
        return;
      }

      const parsed = JSON.parse(replyText);
      res.json(parsed);
    } catch (err: any) {
      console.error('Gemini Receipt Vision Scanner error:', err?.message || err);
      const mapped = mapGeminiHttpError(err, 'AI vision service could not analyze the photo. Please retry.');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // API Endpoint: Staff AI Assistance
  app.post('/api/ai/assistant', async (req, res) => {
    try {
      const { prompt, context } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      const ai = getGeminiClient();

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
4. Multi-Shop Management (adding new branches, Multi-Branch Business Group switcher, cloud + local/email backups).
5. Reports & KRA Compliance (daily sales, expenses, profit, staff wages/commissions; KRA & e-TIMS Compliance Center for iTax TOT 1.5%, VAT 16%, Credit Notes, VSCU/OSCU config & JSON payload export).
6. Plans & Customer Care: 7-day free trial (22 days with a referral code), +30 days free per referred shop, paid plans 30d KSh 500 / 3m KSh 1,350 / 6m KSh 2,650 / 12m KSh 5,000. Human Customer Care: rofanipos@gmail.com, WhatsApp +254 734 128 888, Calls +254 734 128 888 / +254 713 128 888.

Active Store Context:
- Store: ${context?.storeName || 'Rofani POS'} | Role: ${context?.role || 'Staff'} | View: ${context?.activeTab || 'POS'}
- Products: ${context?.totalProducts ?? 0} | Low Stock: ${context?.lowStockCount ?? 0} | Out of Stock: ${context?.outOfStockCount ?? 0} | Today Sales: KSh ${Number(context?.totalSalesToday || 0).toLocaleString()}${lowStockSummary}

Formatting Rules:
- Be concise and mobile-friendly (under ~180 words unless detailed steps are requested).
- Use short bullet points (- ) and **bold** key actions or menu paths.
- Mention exact KSh figures or product names from context when relevant.`;

      if (!ai) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets or your deployment environment variables to use the AI Assistant.',
        });
        return;
      }

      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      const replyText = (response.text || '').trim();
      if (!replyText) {
        res.status(502).json({ error: 'Gemini AI returned an empty response. Please try asking again.' });
        return;
      }
      res.json({ reply: replyText });
    } catch (err: any) {
      const mapped = mapGeminiHttpError(err, 'Unable to get a response from Gemini AI right now. Please try again.');
      if (mapped.status === 504 || mapped.status === 429 || mapped.status === 503) {
        console.warn('Gemini AI Assistant transient response:', mapped.status, err?.message || err);
      } else {
        console.error('Gemini AI Assistant error:', err?.message || err);
      }
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // API Endpoint: AI Predictive Inventory Replenishment & Demand Forecast
  app.post('/api/ai/replenishment-forecast', async (req, res) => {
    try {
      const { items, summary, storeName, targetDaysCover } = req.body;

      const ai = getGeminiClient();

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

      if (!ai) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to generate AI replenishment insights.',
        });
        return;
      }

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

      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
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
        },
      });

      const replyText = (response.text || '').trim();
      if (!replyText) {
        res.status(502).json({ error: 'Gemini AI returned an empty replenishment forecast. Please retry.' });
        return;
      }
      const parsed = JSON.parse(replyText);
      res.json(parsed);
    } catch (err: any) {
      console.error('Gemini Replenishment Forecast error:', err?.message || err);
      const mapped = mapGeminiHttpError(err, 'Unable to generate AI replenishment forecast right now.');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // API Endpoint: AI Customer Promotion & Multi-Channel Marketing Generator
  app.post('/api/ai/generate-promotion', async (req, res) => {
    try {
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
      } = req.body;

      const ai = getGeminiClient();

      const audienceDescription = customerName
        ? `Individual Customer: "${customerName}" (${customerType || 'Retail Client'})`
        : audience === 'vip'
        ? 'VIP High Spender Customers'
        : audience === 'debtors'
        ? 'Customers with outstanding debt (incentivize paying balance with a reward discount)'
        : audience === 'wholesalers'
        ? 'Wholesale / Bulk buyers'
        : audience === 'inactive'
        ? 'Lapsed / Inactive Customers who haven\'t shopped in 30+ days'
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

      if (!ai) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to generate AI promotions.',
        });
        return;
      }

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

      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
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
        },
      });

      const replyText = (response.text || '').trim();
      if (!replyText) {
        res.status(502).json({ error: 'Gemini AI returned an empty promotion response. Please retry.' });
        return;
      }
      const parsed = JSON.parse(replyText);
      res.json(parsed);
    } catch (err: any) {
      console.error('Gemini Promotion Generator error:', err?.message || err);
      const mapped = mapGeminiHttpError(err, 'Unable to generate promotion copy right now. Please try again.');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // ==========================================
  // SAFARICOM M-PESA DARAJA & STK PUSH API
  // ==========================================
  interface MpesaTransactionState {
    checkoutRequestId: string;
    merchantRequestId: string;
    phoneNumber: string;
    amount: number;
    accountReference: string;
    storeName: string;
    tillNumber: string;
    storeNumber?: string;
    businessShortCode?: string;
    passkey?: string;
    consumerKey?: string;
    consumerSecret?: string;
    environment?: 'sandbox' | 'production';
    mode?: 'instant_demo' | 'live_daraja';
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'TIMEOUT';
    mpesaReceiptNumber?: string;
    smsNotification?: string;
    errorMessage?: string;
    createdAt: string;
    lastQueriedAt?: string;
  }

  const mpesaTxStore = new Map<string, MpesaTransactionState>();

  // Helper to generate Safaricom receipt code (e.g. QHJ8291KLM)
  const generateReceiptCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const prefixes = ['Q', 'R', 'S', 'T'];
    let code = prefixes[Math.floor(Math.random() * prefixes.length)];
    for (let i = 0; i < 9; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Helper to query Safaricom Daraja STK Push Query API directly
  const querySafaricomDarajaStatus = async (
    checkoutRequestId: string,
    params: {
      businessShortCode: string;
      passkey: string;
      consumerKey: string;
      consumerSecret: string;
      environment?: string;
    }
  ) => {
    const isProd =
      params.environment === 'production' ||
      (!params.consumerKey.toLowerCase().includes('sandbox') &&
        !params.consumerSecret.toLowerCase().includes('sandbox'));
    const baseUrl = isProd ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

    // 1. Get OAuth Access Token
    const authBuffer = Buffer.from(`${params.consumerKey.trim()}:${params.consumerSecret.trim()}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authBuffer}` },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Safaricom OAuth failed (${tokenRes.status}): ${errText}`);
    }

    const tokenData = (await tokenRes.json()) as any;
    const accessToken = tokenData.access_token;

    // 2. Compute Timestamp & Password
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14); // YYYYMMDDHHmmss

    const password = Buffer.from(
      `${params.businessShortCode.trim()}${params.passkey.trim()}${timestamp}`
    ).toString('base64');

    // 3. Call Safaricom STK Push Query API
    const queryRes = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: params.businessShortCode.trim(),
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    const queryData = (await queryRes.json()) as any;
    return queryData;
  };

  // Endpoint 1: Dispatch STK Push Prompt to Customer Phone
  app.post('/api/mpesa/stkpush', async (req, res) => {
    try {
      const {
        phoneNumber,
        amount,
        accountReference = 'POS-SALE',
        transactionDesc = 'Store Purchase',
        storeName = 'ROFANI ELECTRONICS & BOUTIQUE',
        tillNumber = '1833804',
        shortcodeType = 'till',
        checkoutRequestId: clientReqId,
        mode = 'live_daraja',
      } = req.body;

      if (!phoneNumber || !amount) {
        res.status(400).json({ error: 'phoneNumber and amount are required' });
        return;
      }

      // Normalize phone number to 254...
      let cleanPhone = String(phoneNumber).replace(/[\s\-\(\)\+]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '254' + cleanPhone.slice(1);
      } else if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) {
        cleanPhone = '254' + cleanPhone;
      }

      const checkoutRequestId = clientReqId || `ws_CO_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const merchantRequestId = `REQ_${Date.now()}`;

      // Check if real Daraja keys exist (from request body or server environment variables)
      const consumerKey = req.body.consumerKey || process.env.MPESA_CONSUMER_KEY || process.env.VITE_MPESA_CONSUMER_KEY;
      const consumerSecret = req.body.consumerSecret || process.env.MPESA_CONSUMER_SECRET || process.env.VITE_MPESA_CONSUMER_SECRET;
      const passkey = req.body.passkey || process.env.MPESA_PASSKEY || process.env.VITE_MPESA_PASSKEY;
      const shortcode = req.body.tillNumber || process.env.MPESA_SHORTCODE || process.env.VITE_MPESA_SHORTCODE || tillNumber;
      const storeNumber = req.body.storeNumber || shortcode;

      const environment = req.body.environment || process.env.VITE_MPESA_ENV || 'production';

      if (mode === 'live_daraja') {
        if (!consumerKey || !consumerSecret) {
          res.status(400).json({
            success: false,
            error: 'Missing Daraja API Credentials. Please enter your Safaricom Consumer Key and Consumer Secret in M-PESA settings.',
          });
          return;
        }

        try {
          const isProd = environment === 'production' || (!consumerKey.toLowerCase().includes('sandbox') && !consumerSecret.toLowerCase().includes('sandbox'));
          const baseUrl = isProd ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

          // 1. Live Safaricom Daraja OAuth Token Request
          const authBuffer = Buffer.from(`${consumerKey.trim()}:${consumerSecret.trim()}`).toString('base64');
          const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${authBuffer}` },
          });

          if (!tokenRes.ok) {
            const tokenErrText = await tokenRes.text();
            console.error('[Safaricom OAuth Error]:', tokenErrText);
            res.status(401).json({
              success: false,
              error: `Safaricom Daraja Authentication Failed (${tokenRes.status}). Please verify your Consumer Key and Consumer Secret on the Safaricom Daraja Portal.`,
              details: tokenErrText,
            });
            return;
          }

          const tokenData = (await tokenRes.json()) as any;
          const accessToken = tokenData.access_token;

          // 2. Compute Timestamp & Password
          const timestamp = new Date()
            .toISOString()
            .replace(/[^0-9]/g, '')
            .slice(0, 14); // YYYYMMDDHHmmss

          const businessShortCode = (shortcodeType === 'till' && storeNumber ? storeNumber : shortcode).trim();
          const effectivePasskey = passkey ? passkey.trim() : 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
          const password = Buffer.from(`${businessShortCode}${effectivePasskey}${timestamp}`).toString('base64');

          // Callback URL (Safaricom requirement: Must be a public, valid HTTPS URL)
          let callbackHost = ((req.headers['x-forwarded-host'] || req.headers.host || '') as string).split(',')[0].trim();
          if (!callbackHost || callbackHost.includes('localhost') || callbackHost.includes('127.0.0.1')) {
            callbackHost = process.env.APP_URL
              ? process.env.APP_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')
              : 'ais-pre-agpwmbkm7pzkfhwvkrsqrv-987405654779.europe-west2.run.app';
          }
          const callBackURL = `https://${callbackHost}/api/mpesa/callback`;

          const transactionType = shortcodeType === 'paybill' ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline';

          const stkPayload = {
            BusinessShortCode: businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: transactionType,
            Amount: Math.round(Number(amount)),
            PartyA: cleanPhone,
            PartyB: shortcode.trim(),
            PhoneNumber: cleanPhone,
            CallBackURL: callBackURL,
            AccountReference: (accountReference || 'ROFANI').slice(0, 12),
            TransactionDesc: (transactionDesc || `Purchase at ${storeName}`).slice(0, 13),
          };

          const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stkPayload),
          });

          const stkData = (await stkRes.json()) as any;

          if (stkRes.ok && stkData.ResponseCode === '0') {
            const actualCheckoutId = stkData.CheckoutRequestID || checkoutRequestId;
            mpesaTxStore.set(actualCheckoutId, {
              checkoutRequestId: actualCheckoutId,
              merchantRequestId: stkData.MerchantRequestID || merchantRequestId,
              phoneNumber: cleanPhone,
              amount: Number(amount),
              accountReference,
              storeName,
              tillNumber: shortcode,
              storeNumber,
              businessShortCode,
              passkey: effectivePasskey,
              consumerKey,
              consumerSecret,
              environment: isProd ? 'production' : 'sandbox',
              mode: 'live_daraja',
              status: 'PENDING',
              createdAt: new Date().toISOString(),
            });

            res.json({
              success: true,
              checkoutRequestId: actualCheckoutId,
              merchantRequestId: stkData.MerchantRequestID,
              responseCode: stkData.ResponseCode,
              responseDescription: stkData.ResponseDescription,
              customerMessage: stkData.CustomerMessage || `Lipa Na M-PESA STK Push prompt sent to ${cleanPhone}.`,
            });
            return;
          } else {
            console.error('[Safaricom STK Error]:', stkData);
            res.status(400).json({
              success: false,
              error: stkData.errorMessage || stkData.ResponseDescription || 'Safaricom rejected the STK Push request.',
              responseCode: stkData.ResponseCode,
              responseDescription: stkData.ResponseDescription,
              details: stkData,
            });
            return;
          }
        } catch (darajaErr: any) {
          console.error('Live Daraja call failed:', darajaErr);
          res.status(500).json({
            success: false,
            error: `Failed to communicate with Safaricom Daraja: ${darajaErr.message || darajaErr}`,
          });
          return;
        }
      }

      // Default/Demo/Simulated STK Push
      const txRecord: MpesaTransactionState = {
        checkoutRequestId,
        merchantRequestId,
        phoneNumber: cleanPhone,
        amount: Number(amount),
        accountReference,
        storeName,
        tillNumber,
        storeNumber,
        businessShortCode: storeNumber || tillNumber,
        mode: 'instant_demo',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      mpesaTxStore.set(checkoutRequestId, txRecord);

      res.json({
        success: true,
        checkoutRequestId,
        merchantRequestId,
        responseCode: '0',
        responseDescription: 'Success. Request accepted for processing',
        customerMessage: `Success. Lipa Na M-PESA STK Push prompt sent to customer ${cleanPhone}.`,
      });
    } catch (err: any) {
      console.error('M-PESA STK Push error:', err);
      res.status(500).json({ error: err.message || 'Internal server error processing M-PESA request' });
    }
  });

  // Handler for querying transaction status (active query via Safaricom STK Push Query API)
  const handleMpesaStatusQuery = async (req: any, res: any) => {
    try {
      const checkoutRequestId = req.params?.checkoutRequestId || req.query?.checkoutRequestId || req.body?.checkoutRequestId;

      if (!checkoutRequestId) {
        res.status(400).json({ error: 'checkoutRequestId is required' });
        return;
      }

      let tx = mpesaTxStore.get(checkoutRequestId);

      // If already resolved to a terminal state (COMPLETED / CANCELLED / FAILED), return immediately
      if (tx && (tx.status === 'COMPLETED' || tx.status === 'CANCELLED' || tx.status === 'FAILED')) {
        res.json(tx);
        return;
      }

      // Gather Daraja credentials from existing record or incoming request
      const consumerKey =
        tx?.consumerKey ||
        req.query?.consumerKey ||
        req.body?.consumerKey ||
        process.env.MPESA_CONSUMER_KEY ||
        process.env.VITE_MPESA_CONSUMER_KEY;

      const consumerSecret =
        tx?.consumerSecret ||
        req.query?.consumerSecret ||
        req.body?.consumerSecret ||
        process.env.MPESA_CONSUMER_SECRET ||
        process.env.VITE_MPESA_CONSUMER_SECRET;

      const passkey =
        tx?.passkey ||
        req.query?.passkey ||
        req.body?.passkey ||
        process.env.MPESA_PASSKEY ||
        process.env.VITE_MPESA_PASSKEY ||
        'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

      const storeNumber =
        tx?.storeNumber ||
        req.query?.storeNumber ||
        req.body?.storeNumber ||
        '1365369';

      const tillNumber =
        tx?.tillNumber ||
        req.query?.tillNumber ||
        req.body?.tillNumber ||
        '1833804';

      const businessShortCode = (tx?.businessShortCode || storeNumber || tillNumber || '1365369').trim();
      const environment = (tx?.environment || req.query?.environment || req.body?.environment || 'production') as string;

      // Active live query against Safaricom Daraja API
      if (consumerKey && consumerSecret && businessShortCode) {
        try {
          const queryResult = await querySafaricomDarajaStatus(checkoutRequestId, {
            businessShortCode,
            passkey,
            consumerKey,
            consumerSecret,
            environment,
          });

          // Safaricom ResultCode 0 / "0" = Payment Successful!
          const resultCode = String(queryResult?.ResultCode ?? '');
          const responseCode = String(queryResult?.ResponseCode ?? '');
          const resultDesc = String(queryResult?.ResultDesc || queryResult?.ResponseDescription || queryResult?.errorMessage || '');
          const lowerDesc = resultDesc.toLowerCase();

          if (resultCode === '0' || (responseCode === '0' && (lowerDesc.includes('success') || lowerDesc.includes('accept') || lowerDesc.includes('complete')))) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB');
            const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

            const receipt = tx?.mpesaReceiptNumber || generateReceiptCode();
            const amountVal = tx?.amount || Number(req.query?.amount || req.body?.amount || 0);
            const storeNameVal = tx?.storeName || 'ROFANI ELECTRONICS & BOUTIQUE';
            const sms =
              tx?.smsNotification ||
              `${receipt} Confirmed. Ksh ${amountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} sent to ${storeNameVal.toUpperCase()} (Till ${tillNumber}) on ${dateStr} at ${timeStr}. New M-PESA balance is Ksh ${(amountVal * 3.2 + 1540).toFixed(2)}. Transaction cost, Ksh 0.00.`;

            if (tx) {
              tx.status = 'COMPLETED';
              tx.mpesaReceiptNumber = receipt;
              tx.smsNotification = sms;
              tx.lastQueriedAt = now.toISOString();
            } else {
              tx = {
                checkoutRequestId,
                merchantRequestId: queryResult?.MerchantRequestID || `REQ_${Date.now()}`,
                phoneNumber: '254700000000',
                amount: amountVal,
                accountReference: 'POS-SALE',
                storeName: storeNameVal,
                tillNumber,
                status: 'COMPLETED',
                mpesaReceiptNumber: receipt,
                smsNotification: sms,
                createdAt: now.toISOString(),
                lastQueriedAt: now.toISOString(),
              };
              mpesaTxStore.set(checkoutRequestId, tx);
            }

            res.json({
              checkoutRequestId,
              status: 'COMPLETED',
              mpesaReceiptNumber: receipt,
              smsNotification: sms,
              resultDesc: queryResult?.ResultDesc || 'The service request is processed successfully.',
              amount: tx.amount,
              phoneNumber: tx.phoneNumber,
            });
            return;
          }

          // In-Progress / Customer Entering PIN (ResultCode 49, "being processed", or 500.001.1001)
          const isPending =
            lowerDesc.includes('being processed') ||
            lowerDesc.includes('in progress') ||
            lowerDesc.includes('processing') ||
            lowerDesc.includes('pending') ||
            lowerDesc.includes('wait') ||
            resultCode === '49' ||
            queryResult?.errorCode === '500.001.1001';

          if (isPending) {
            res.json({
              checkoutRequestId,
              status: 'PENDING',
              message: 'Customer entering PIN on Safaricom M-PESA...',
              resultDesc: queryResult?.ResultDesc,
            });
            return;
          }

          // ResultCode 1032 = Request cancelled by user
          if (resultCode === '1032' || lowerDesc.includes('cancel')) {
            if (tx) tx.status = 'CANCELLED';
            res.json({
              checkoutRequestId,
              status: 'CANCELLED',
              errorMessage: 'Customer cancelled transaction on phone.',
              resultDesc: queryResult?.ResultDesc,
            });
            return;
          }

          // ResultCode 1037 = User did not enter PIN (timeout)
          if (resultCode === '1037' || lowerDesc.includes('timed out') || lowerDesc.includes('timeout')) {
            if (tx) tx.status = 'TIMEOUT';
            res.json({
              checkoutRequestId,
              status: 'TIMEOUT',
              errorMessage: 'Customer did not enter PIN in time (M-PESA request timed out).',
              resultDesc: queryResult?.ResultDesc,
            });
            return;
          }

          // ResultCode 1 = Insufficient balance
          if (resultCode === '1' || lowerDesc.includes('insufficient')) {
            if (tx) tx.status = 'FAILED';
            res.json({
              checkoutRequestId,
              status: 'FAILED',
              errorMessage: 'Customer M-PESA balance is insufficient for this payment.',
              resultDesc: queryResult?.ResultDesc,
            });
            return;
          }

          // ResultCode 2001 = Invalid PIN
          if (resultCode === '2001' || lowerDesc.includes('wrong pin') || lowerDesc.includes('invalid pin')) {
            if (tx) tx.status = 'FAILED';
            res.json({
              checkoutRequestId,
              status: 'FAILED',
              errorMessage: 'Customer entered an incorrect M-PESA PIN.',
              resultDesc: queryResult?.ResultDesc,
            });
            return;
          }

          // Confirmed terminal error
          if (resultCode && resultCode !== '0' && (lowerDesc.includes('fail') || lowerDesc.includes('reject') || lowerDesc.includes('invalid') || lowerDesc.includes('error'))) {
            if (tx) tx.status = 'FAILED';
            res.json({
              checkoutRequestId,
              status: 'FAILED',
              errorMessage: queryResult?.ResultDesc || 'M-PESA transaction failed.',
              resultDesc: queryResult?.ResultDesc,
            });
            return;
          }

          // Still in progress / processing
          res.json({
            checkoutRequestId,
            status: 'PENDING',
            message: queryResult?.ResponseDescription || queryResult?.errorMessage || 'Waiting for customer PIN entry...',
          });
          return;
        } catch (queryErr: any) {
          // If query throws (e.g. transient network or "Transaction is being processed"), remain PENDING
          console.warn('[Safaricom Query Check]:', queryErr.message || queryErr);
        }
      }

      // If no Daraja keys or still pending
      res.json(
        tx || {
          checkoutRequestId,
          status: 'PENDING',
          message: 'Waiting for payment confirmation...',
        }
      );
    } catch (err: any) {
      console.error('Error during M-PESA query:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  };

  // Endpoint 2: Query Transaction Status (GET & POST)
  app.get('/api/mpesa/query/:checkoutRequestId', handleMpesaStatusQuery);
  app.get('/api/mpesa/query', handleMpesaStatusQuery);
  app.post('/api/mpesa/query', handleMpesaStatusQuery);

  // Endpoint 3: Simulate Customer PIN Entry
  app.post('/api/mpesa/simulate-pin', (req, res) => {
    const { checkoutRequestId, action = 'CONFIRM' } = req.body;
    let tx = mpesaTxStore.get(checkoutRequestId);

    if (!tx) {
      tx = {
        checkoutRequestId: checkoutRequestId || `ws_CO_${Date.now()}`,
        merchantRequestId: `REQ_${Date.now()}`,
        phoneNumber: '254712345678',
        amount: 1000,
        accountReference: 'POS-SALE',
        storeName: 'ROFANI ELECTRONICS & BOUTIQUE',
        tillNumber: '174379',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      mpesaTxStore.set(checkoutRequestId, tx);
    }

    if (action === 'CANCEL') {
      tx.status = 'CANCELLED';
      res.json({ success: false, status: 'CANCELLED', message: 'Transaction cancelled by customer' });
      return;
    }

    const receipt = generateReceiptCode();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    tx.status = 'COMPLETED';
    tx.mpesaReceiptNumber = receipt;
    tx.smsNotification = `${receipt} Confirmed. Ksh ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} sent to ${tx.storeName.toUpperCase()} (Till ${tx.tillNumber}) on ${dateStr} at ${timeStr}. New M-PESA balance is Ksh ${(tx.amount * 3.2 + 1540).toFixed(2)}. Transaction cost, Ksh 0.00.`;

    res.json({
      success: true,
      status: 'COMPLETED',
      mpesaReceiptNumber: receipt,
      smsNotification: tx.smsNotification,
    });
  });

  // Endpoint 4: Safaricom Webhook Callback Receiver
  app.post('/api/mpesa/callback', (req, res) => {
    try {
      const callbackData = req.body?.Body?.stkCallback;
      if (callbackData) {
        const checkoutRequestId = callbackData.CheckoutRequestID;
        const resultCode = callbackData.ResultCode;
        const tx = mpesaTxStore.get(checkoutRequestId);

        if (tx) {
          if (resultCode === 0) {
            const metaItems = callbackData.CallbackMetadata?.Item || [];
            const receiptItem = metaItems.find((item: any) => item.Name === 'MpesaReceiptNumber');
            tx.status = 'COMPLETED';
            tx.mpesaReceiptNumber = receiptItem ? receiptItem.Value : generateReceiptCode();
          } else {
            tx.status = 'FAILED';
          }
        }
      }
    } catch (e) {
      console.error('Error handling Safaricom callback:', e);
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  });

  // ==========================================
  // MOCK TRANSACTION SUMMARY SMS GATEWAY API
  // ==========================================
  interface SmsLogRecord {
    id: string;
    transactionId: string;
    receiptNumber: string;
    phoneNumber: string;
    customerName: string;
    messageText: string;
    senderId: string;
    status: 'DELIVERED' | 'SENT' | 'FAILED';
    carrier: string;
    cost: number;
    segments: number;
    sentAt: string;
    details: string;
  }

  const smsLogsStore: SmsLogRecord[] = [];

  // Endpoint: Send Automated Transaction Summary SMS
  app.post('/api/sms/send-transaction-summary', (req, res) => {
    try {
      const {
        phoneNumber,
        customerName = 'Valued Customer',
        transactionId,
        receiptNumber,
        summaryMessage,
        storeName = 'ROFANI',
        senderId = 'ROFANI',
        grandTotal,
        amountPaid,
        balanceDue,
      } = req.body;

      if (!phoneNumber || !summaryMessage) {
        res.status(400).json({ error: 'phoneNumber and summaryMessage are required' });
        return;
      }

      // Normalize phone number
      let cleanPhone = String(phoneNumber).replace(/[\s\-\(\)\+]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '254' + cleanPhone.slice(1);
      } else if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) {
        cleanPhone = '254' + cleanPhone;
      }

      const segments = Math.ceil(summaryMessage.length / 160) || 1;
      let carrier = 'SAFARICOM';
      if (cleanPhone.startsWith('25473') || cleanPhone.startsWith('25475') || cleanPhone.startsWith('25478') || cleanPhone.startsWith('25410')) {
        carrier = 'AIRTEL';
      } else if (cleanPhone.startsWith('25477')) {
        carrier = 'TELKOM';
      }

      const messageId = `MSG-AT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const newSmsRecord: SmsLogRecord = {
        id: messageId,
        transactionId: transactionId || `tx-${Date.now()}`,
        receiptNumber: receiptNumber || 'INV-SALE',
        phoneNumber: cleanPhone,
        customerName,
        messageText: summaryMessage,
        senderId: senderId.slice(0, 11).toUpperCase(),
        status: 'DELIVERED',
        carrier,
        cost: parseFloat((segments * 0.8).toFixed(2)),
        segments,
        sentAt: new Date().toISOString(),
        details: `Delivered to handset via ${carrier} bulk SMS gateway channel`,
      };

      smsLogsStore.unshift(newSmsRecord);
      if (smsLogsStore.length > 200) {
        smsLogsStore.pop();
      }

      console.log(`[Mock SMS Gateway] Automated summary SMS sent to +${cleanPhone} (Ref: ${messageId})`);

      res.json({
        success: true,
        messageId,
        status: 'DELIVERED',
        carrier,
        cost: `KES ${newSmsRecord.cost.toFixed(2)}`,
        segments,
        sentAt: newSmsRecord.sentAt,
        details: newSmsRecord.details,
      });
    } catch (err: any) {
      console.error('Error sending transaction SMS:', err);
      res.status(500).json({ error: err.message || 'Failed to dispatch SMS notification' });
    }
  });

  // Endpoint: Get SMS Gateway Delivery Logs
  app.get('/api/sms/logs', (req, res) => {
    res.json({
      success: true,
      count: smsLogsStore.length,
      logs: smsLogsStore,
    });
  });

  // Endpoint: Resend / Retry SMS
  app.post('/api/sms/retry', (req, res) => {
    const { messageId } = req.body;
    const existing = smsLogsStore.find((log) => log.id === messageId);
    if (!existing) {
      res.status(404).json({ error: 'Message not found in delivery logs' });
      return;
    }

    const retriedRecord: SmsLogRecord = {
      ...existing,
      id: `MSG-AT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      sentAt: new Date().toISOString(),
      status: 'DELIVERED',
      details: `Re-sent successfully to handset via ${existing.carrier}`,
    };

    smsLogsStore.unshift(retriedRecord);
    res.json({
      success: true,
      record: retriedRecord,
      message: `SMS re-sent successfully to +${existing.phoneNumber}`,
    });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middleware for development vs static build in production.
  // Bind port 3000 immediately so healthchecks pass without waiting for Vite cold-start.
  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    }).catch((err) => {
      console.error('Failed to initialize Vite dev middleware:', err);
      throw err;
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
