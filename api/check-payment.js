const BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { order_id } = req.query;
    if (!order_id) return res.status(400).json({ error: 'Missing order_id' });

    const url = `${BASE}/rest/v1/codes?payment_ref=eq.${encodeURIComponent(order_id)}&select=code,plan`;
    const r = await fetch(url, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
    });
    const rows = await r.json();

    if (rows[0]) {
      return res.status(200).json({ ready: true, code: rows[0].code, plan: rows[0].plan });
    }
    return res.status(200).json({ ready: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error checking payment' });
  }
}
