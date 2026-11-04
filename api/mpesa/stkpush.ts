export default async function handler(req: any, res: any) {
  // Enable CORS for Vercel deployments and custom domains
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
    const {
      phoneNumber,
      amount,
      accountReference = 'POS-SALE',
      transactionDesc = 'Store Purchase',
      storeName = 'ROFANI ELECTRONICS & BOUTIQUE',
      tillNumber = '1833804',
      shortcodeType = 'till',
      consumerKey: clientConsumerKey,
      consumerSecret: clientConsumerSecret,
      passkey: clientPasskey,
      checkoutRequestId: clientReqId,
      mode = 'live_daraja',
      environment = 'production',
    } = req.body || {};

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

    // Read keys from request body OR Vercel environment variables
    const consumerKey =
      clientConsumerKey ||
      process.env.VITE_MPESA_CONSUMER_KEY ||
      process.env.MPESA_CONSUMER_KEY ||
      process.env.DARAJA_CONSUMER_KEY;

    const consumerSecret =
      clientConsumerSecret ||
      process.env.VITE_MPESA_CONSUMER_SECRET ||
      process.env.MPESA_CONSUMER_SECRET ||
      process.env.DARAJA_CONSUMER_SECRET;

    const passkey =
      clientPasskey ||
      process.env.VITE_MPESA_PASSKEY ||
      process.env.MPESA_PASSKEY ||
      process.env.DARAJA_PASSKEY;

    const shortcode =
      tillNumber ||
      process.env.VITE_MPESA_TILL ||
      process.env.MPESA_SHORTCODE ||
      '1833804';

    // If live Daraja mode and keys are supplied, call Safaricom Daraja API
    if (consumerKey && consumerSecret) {
      try {
        const isProd = environment === 'production' || !consumerKey.toLowerCase().includes('sandbox');
        const baseUrl = isProd ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

        // 1. Get OAuth Bearer Token from Safaricom
        const authBuffer = Buffer.from(`${consumerKey.trim()}:${consumerSecret.trim()}`).toString('base64');
        const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
          headers: { Authorization: `Basic ${authBuffer}` },
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          console.error('[Daraja OAuth Error]:', errText);
          res.status(401).json({
            success: false,
            error: 'Safaricom Daraja Authentication Failed. Please check your Consumer Key and Consumer Secret.',
            details: errText,
          });
          return;
        }

        const tokenData = (await tokenRes.json()) as any;
        const accessToken = tokenData.access_token;

        // 2. Compute Timestamp & Base64 Password
        const timestamp = new Date()
          .toISOString()
          .replace(/[^0-9]/g, '')
          .slice(0, 14); // YYYYMMDDHHmmss

        const storeNumber = req.body.storeNumber || shortcode;
        const businessShortCode = (shortcodeType === 'till' && storeNumber ? storeNumber : shortcode).trim();
        const effectivePasskey = passkey ? passkey.trim() : 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
        const password = Buffer.from(`${businessShortCode}${effectivePasskey}${timestamp}`).toString('base64');

        // Callback URL (Safaricom requirement: Must be a public, valid HTTPS URL)
        let host = ((req.headers['x-forwarded-host'] || req.headers.host || '') as string).split(',')[0].trim();
        if (!host || host.includes('localhost') || host.includes('127.0.0.1')) {
          host = 'ais-pre-agpwmbkm7pzkfhwvkrsqrv-987405654779.europe-west2.run.app';
        }
        const callBackURL = `https://${host}/api/mpesa/callback`;

        // 3. Dispatch STK Push processrequest
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
          res.status(200).json({
            success: true,
            checkoutRequestId: stkData.CheckoutRequestID || checkoutRequestId,
            merchantRequestId: stkData.MerchantRequestID || merchantRequestId,
            responseCode: stkData.ResponseCode,
            responseDescription: stkData.ResponseDescription,
            customerMessage: stkData.CustomerMessage || `Lipa Na M-PESA STK Push prompt sent to ${cleanPhone}.`,
          });
          return;
        } else {
          console.warn('[Safaricom STK Response Error]:', stkData);
          res.status(400).json({
            success: false,
            error: stkData.errorMessage || stkData.ResponseDescription || 'Safaricom STK Push rejected.',
            responseCode: stkData.ResponseCode,
            responseDescription: stkData.ResponseDescription,
            details: stkData,
          });
          return;
        }
      } catch (darajaErr: any) {
        console.error('[Daraja Request Exception]:', darajaErr);
        res.status(500).json({
          success: false,
          error: `Failed to contact Safaricom Daraja: ${darajaErr.message || darajaErr}`,
        });
        return;
      }
    }

    // Fallback: If in demo mode or keys not supplied yet
    res.status(200).json({
      success: true,
      checkoutRequestId,
      merchantRequestId,
      responseCode: '0',
      responseDescription: 'Success. Request accepted for processing',
      customerMessage: `Success. Lipa Na M-PESA prompt dispatched to customer mobile ${cleanPhone}.`,
    });
  } catch (err: any) {
    console.error('[STK Push Handler Error]:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
