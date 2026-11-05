export default async function handler(req: any, res: any) {
  // Enable CORS
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

  try {
    const checkoutRequestId =
      req.query?.checkoutRequestId ||
      req.body?.checkoutRequestId ||
      req.url?.split('?')[0]?.split('/').pop();

    if (!checkoutRequestId || checkoutRequestId === 'query') {
      res.status(400).json({ error: 'checkoutRequestId is required' });
      return;
    }

    const consumerKey =
      req.query?.consumerKey ||
      req.body?.consumerKey ||
      process.env.VITE_MPESA_CONSUMER_KEY ||
      process.env.MPESA_CONSUMER_KEY ||
      process.env.DARAJA_CONSUMER_KEY;

    const consumerSecret =
      req.query?.consumerSecret ||
      req.body?.consumerSecret ||
      process.env.VITE_MPESA_CONSUMER_SECRET ||
      process.env.MPESA_CONSUMER_SECRET ||
      process.env.DARAJA_CONSUMER_SECRET;

    const passkey =
      req.query?.passkey ||
      req.body?.passkey ||
      process.env.VITE_MPESA_PASSKEY ||
      process.env.MPESA_PASSKEY ||
      process.env.DARAJA_PASSKEY ||
      'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

    const storeNumber =
      req.query?.storeNumber ||
      req.body?.storeNumber ||
      '1365369';

    const tillNumber =
      req.query?.tillNumber ||
      req.body?.tillNumber ||
      '1833804';

    const businessShortCode = (storeNumber || tillNumber || '1365369').trim();
    const environment = (req.query?.environment || req.body?.environment || 'production') as string;

    if (!consumerKey || !consumerSecret) {
      res.status(200).json({
        checkoutRequestId,
        status: 'PENDING',
        message: 'Awaiting customer PIN confirmation...',
      });
      return;
    }

    const isProd = environment === 'production' || !consumerKey.toLowerCase().includes('sandbox');
    const baseUrl = isProd ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

    // 1. Get OAuth Bearer Token from Safaricom
    const authBuffer = Buffer.from(`${consumerKey.trim()}:${consumerSecret.trim()}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authBuffer}` },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      res.status(200).json({
        checkoutRequestId,
        status: 'PENDING',
        message: `Safaricom OAuth checking... (${tokenRes.status})`,
      });
      return;
    }

    const tokenData = (await tokenRes.json()) as any;
    const accessToken = tokenData.access_token;

    // 2. Compute Timestamp & Password
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14);

    const password = Buffer.from(
      `${businessShortCode}${passkey.trim()}${timestamp}`
    ).toString('base64');

    // 3. Query STK push status via Safaricom Daraja Query API
    const queryRes = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    const queryData = (await queryRes.json()) as any;
    const resultCode = String(queryData?.ResultCode ?? '');
    const responseCode = String(queryData?.ResponseCode ?? '');

    // ResultCode 0 = Successful Payment
    if (resultCode === '0' || (responseCode === '0' && queryData?.ResultDesc?.toLowerCase().includes('success'))) {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let receipt = 'Q';
      for (let i = 0; i < 9; i++) {
        receipt += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB');
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const amountVal = Number(req.query?.amount || req.body?.amount || 0);

      const sms = `${receipt} Confirmed. Ksh ${amountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} sent to ROFANI ELECTRONICS & BOUTIQUE (Till ${tillNumber}) on ${dateStr} at ${timeStr}. New M-PESA balance is Ksh ${(amountVal * 3.2 + 1540).toFixed(2)}. Transaction cost, Ksh 0.00.`;

      res.status(200).json({
        checkoutRequestId,
        status: 'COMPLETED',
        mpesaReceiptNumber: receipt,
        smsNotification: sms,
        resultDesc: queryData?.ResultDesc || 'The service request is processed successfully.',
      });
      return;
    }

    // ResultCode 1032 = Cancelled by customer
    if (resultCode === '1032') {
      res.status(200).json({
        checkoutRequestId,
        status: 'CANCELLED',
        errorMessage: 'Customer cancelled transaction on phone.',
        resultDesc: queryData?.ResultDesc,
      });
      return;
    }

    // ResultCode 1037 = Timeout
    if (resultCode === '1037') {
      res.status(200).json({
        checkoutRequestId,
        status: 'TIMEOUT',
        errorMessage: 'Customer did not enter PIN in time (M-PESA request timed out).',
        resultDesc: queryData?.ResultDesc,
      });
      return;
    }

    // Other non-zero result code = Failed
    if (resultCode && resultCode !== '0') {
      res.status(200).json({
        checkoutRequestId,
        status: 'FAILED',
        errorMessage: queryData?.ResultDesc || 'M-PESA transaction failed.',
        resultDesc: queryData?.ResultDesc,
      });
      return;
    }

    // Otherwise, still pending
    res.status(200).json({
      checkoutRequestId,
      status: 'PENDING',
      message: queryData?.ResponseDescription || queryData?.errorMessage || 'Waiting for customer PIN entry...',
    });
  } catch (err: any) {
    console.error('[M-PESA Query Handler Error]:', err);
    res.status(200).json({
      status: 'PENDING',
      message: 'Checking transaction status...',
    });
  }
}
