import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Gemini AI Client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Helper to generate content using recommended Gemini models with automatic retry & fallback on transient 503 / 429 errors
  const generateContentWithFallback = async (
    ai: GoogleGenAI,
    requestParams: {
      contents: any;
      config?: any;
    }
  ) => {
    // Try recommended gemini-3.8-flash first, then fallback to gemini-3.1-flash-lite and gemini-flash-latest
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: requestParams.contents,
            config: requestParams.config,
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || '';
          const status = err?.status || err?.code || (errMsg.includes('503') ? 503 : errMsg.includes('429') ? 429 : 0);
          const isTransient =
            status === 503 ||
            status === 429 ||
            errMsg.includes('high demand') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('ResourceExhausted') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('temporarily unavailable');

          if (isTransient) {
            if (attempt === 1) {
              // Wait 600ms before second attempt
              await new Promise((resolve) => setTimeout(resolve, 600));
              continue;
            } else {
              console.warn(`[Gemini API] Model ${model} is experiencing high demand (attempt ${attempt}). Trying fallback model...`);
              break; // Try next candidate model
            }
          } else {
            // If model is not available/supported, fall through to next model
            if (status === 404 || errMsg.includes('not found') || errMsg.includes('is not supported')) {
              console.warn(`[Gemini API] Model ${model} unavailable (${errMsg}). Trying fallback model...`);
              break;
            }
            throw err;
          }
        }
      }
    }

    throw lastError;
  };

  // API Endpoint: AI Multimodal Product Camera Identification
  app.post('/api/ai/identify-product', async (req, res) => {
    try {
      const { imageBase64 } = req.body;

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'imageBase64 is required' });
        return;
      }

      const ai = getGeminiClient();

      if (!ai) {
        // Fallback response if GEMINI_API_KEY is not set
        res.json({
          name: 'Identified Store Item',
          category: 'Electronics',
          subcategory: 'General Accessories',
          suggestedPriceKSh: 1500,
          suggestedCostKSh: 1000,
          description: 'Product photo captured. Please adjust details if needed.',
          suggestedSku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          confidenceScore: 0.85,
          note: 'Offline mode active.'
        });
        return;
      }

      // Format image for inlineData
      let mimeType = 'image/jpeg';
      let cleanData = imageBase64;

      if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
        try {
          const imgFetch = await fetch(imageBase64);
          const buffer = await imgFetch.arrayBuffer();
          const contentType = imgFetch.headers.get('content-type') || 'image/jpeg';
          mimeType = contentType;
          cleanData = Buffer.from(buffer).toString('base64');
        } catch (fetchErr) {
          console.warn('Could not fetch external image URL, using fallback:', fetchErr);
        }
      } else if (imageBase64.includes(';base64,')) {
        const parts = imageBase64.split(';base64,');
        mimeType = parts[0].replace('data:', '') || 'image/jpeg';
        cleanData = (parts[1] || '').trim();
      } else {
        cleanData = imageBase64.trim();
      }

      const prompt = `Analyze this camera photo of a product taken in a Kenya retail store.
Identify the product accurately and provide stock entry data. Select "category" strictly from one of these exact store categories:
- Household
- Electronics
- Beauty Products
- Hardware Products
- Phones & Accessories
- Clothes (Men, Women & Kids Wear)
- Shoes

Provide:
1. "name": Always write exactly "Scanned Item".
2. "category": Must be one of the exact categories above.
3. "subcategory": Specific subcategory matching the category.
4. "suggestedPriceKSh": Estimated retail selling price in Kenya Shillings (numeric integer).
5. "suggestedCostKSh": Estimated wholesale purchase cost in Kenya Shillings (numeric integer).
6. "description": Concise 1-2 sentence specification or description.
7. "suggestedSku": A short 6-digit stock code (e.g. "SKU-8821").
8. "confidenceScore": Confidence score between 0.0 and 1.0.`;

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
              suggestedPriceKSh: { type: Type.NUMBER },
              suggestedCostKSh: { type: Type.NUMBER },
              description: { type: Type.STRING },
              suggestedSku: { type: Type.STRING },
              confidenceScore: { type: Type.NUMBER },
            },
            required: ['name', 'category', 'suggestedPriceKSh', 'suggestedCostKSh', 'description', 'suggestedSku'],
          },
        },
      });

      const replyText = response.text || '{}';
      try {
        const parsed = JSON.parse(replyText);
        parsed.name = 'Scanned Item';
        res.json(parsed);
      } catch (parseErr) {
        res.json({
          name: 'Scanned Item',
          category: 'Electronics',
          subcategory: 'General',
          suggestedPriceKSh: 1200,
          suggestedCostKSh: 800,
          description: replyText.slice(0, 200) || 'Scanned retail item.',
          suggestedSku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`
        });
      }
    } catch (err: any) {
      console.warn('Gemini Product Vision notice (safe fallback applied):', err?.message || err);
      // Return safe fallback instead of hard 500 error so UI never crashes or goes blank
      res.json({
        name: 'Scanned Item',
        category: 'Electronics',
        subcategory: 'General',
        suggestedPriceKSh: 1200,
        suggestedCostKSh: 800,
        description: 'Photo attached. Please verify and confirm specifications.',
        suggestedSku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        confidenceScore: 0.5,
        note: 'AI could not fully parse label, default values provided.'
      });
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

      // System instruction for staff assistant
      const systemInstruction = `You are "ROFANI Gemini AI Co-Pilot", an expert, patient, and ultra-helpful staff assistant powered by Gemini AI to onboard and guide new cashiers, store clerks, and managers at ROFANI Electronics & Boutique.
You give step-by-step instructions on:
1. Processing POS sales (Cash, M-Pesa, Card, Split Payments, Layby / Debt balance).
2. KRA TIMS / e-TIMS Tax Compliance & Invoice QR codes.
3. Multi-Store Branch Operations & Inter-Branch Stock Transfers.
4. Inventory Management, Barcode Printing, and Restocking.
5. Customer Credit, Debt Settlement, and Return/Refund guidelines.
6. Daily Sales Reports, Cash Drawer Reconciliation, and Expense Tracking.

Context about current session:
- Store Branch: ${context?.storeName || 'ROFANI Flagship Store'}
- Worker Role: ${context?.role || 'New Staff / Cashier'}
- Current View: ${context?.activeTab || 'General Store View'}
- Low Stock Items: ${context?.lowStockCount ?? 'N/A'}
- Total Products Registered: ${context?.totalProducts ?? 'N/A'}
- Today's Sales Volume: KSh ${context?.totalSalesToday ? context.totalSalesToday.toLocaleString() : '0'}

Style Guidelines:
- Keep answers practical, clear, and actionable for a retail worker on shift.
- Use bullet points, bold key terms, and short paragraphs.
- Offer practical Kenya retail tips (e.g., verifying M-Pesa transaction reference code, checking unit quantities, barcode scanning tips).
- Include friendly English / Swahili greetings when appropriate (e.g. "Hujambo! Here's how to handle that...").`;

      if (!ai) {
        // Safe fallback response if API key is missing
        res.json({
          reply: `**ROFANI AI Staff Assistant (Offline / Quick Guide)**\n\nHere are quick guidelines for new workers at ROFANI Electronics & Boutique:\n\n` +
            `• **Processing a Sale:** Scan item barcode or click product card -> Select payment method (Cash, M-Pesa, Card, Debt) -> Click Complete Order.\n` +
            `• **M-Pesa Payments:** Verify M-Pesa code on customer phone before handing over receipt.\n` +
            `• **Stock Transfers:** Click 'Transfer Stock / Outlets' in top bar -> Choose source & target store -> Specify quantity -> Dispatched.\n` +
            `• **KRA Invoices:** In Sales History or POS checkout, select KRA e-TIMS button to auto-generate KRA QR invoice code.\n\n` +
            `*(Note: To unlock live conversational Gemini AI capabilities, ensure GEMINI_API_KEY is configured in AI Studio Secrets).*`
        });
        return;
      }

      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || 'I apologize, I could not generate a response right now. Please try again or ask your shift manager.';
      res.json({ reply: replyText });
    } catch (err: any) {
      console.warn('Gemini AI Assistant notice (safe fallback applied):', err?.message || err);
      res.json({
        reply: `**ROFANI AI Staff Assistant (Standby / Operational Guide)**\n\n` +
          `*Notice: The AI service is currently experiencing high demand. Here are essential shift guidelines:*\n\n` +
          `• **Processing a Sale:** Scan barcode or click product card -> Select payment method (Cash, M-Pesa, Card, Debt) -> Click Complete Order.\n` +
          `• **M-Pesa Payments:** Verify M-Pesa transaction reference code on customer phone before handing over receipt.\n` +
          `• **Stock Transfers:** Click 'Transfer Stock / Outlets' in top bar -> Choose source & target store -> Specify quantity -> Dispatched.\n` +
          `• **KRA Invoices:** In Sales History or POS checkout, select KRA e-TIMS button to auto-generate KRA QR invoice code.\n\n` +
          `*(Please re-ask your question in a moment once server traffic settles).*`
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
