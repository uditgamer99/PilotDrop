const PLAN_CONFIG = {
  weekly:  { days: 7,   usd: 1.2  },
  monthly: { days: 30,  usd: 3.13 },
  yearly:  { days: 365, usd: 24.08 }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { plan } = req.body;
    const cfg = PLAN_CONFIG[plan];
    if (!cfg) return res.status(400).json({ error: 'Invalid plan' });

    // order_id encodes the plan so the webhook knows what to grant later —
    // random suffix keeps it unique per attempt.
    const orderId = `${plan}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        price_amount: cfg.usd,
        price_currency: 'usd',
        pay_currency: 'usdttrc20',
        order_id: orderId,
        order_description: `PilotDrop ${plan} plan`,
        ipn_callback_url: 'https://pilot-drop.vercel.app/api/nowpayments-webhook',
        success_url: `https://pilot-drop.vercel.app/?paid=1&order_id=${orderId}`,
        cancel_url: 'https://pilot-drop.vercel.app/'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('NowPayments error:', data);
      return res.status(502).json({ error: 'Could not create payment' });
    }

    return res.status(200).json({ invoice_url: data.invoice_url, order_id: orderId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error creating payment' });
  }
}
