export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const callbackData = req.body?.Body?.stkCallback || req.body;
    console.log('[M-PESA Callback Received]:', JSON.stringify(callbackData));
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
