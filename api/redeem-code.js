import { getCode, markRedeemed } from './_supabase.js';
import { signToken } from './_token.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const row = await getCode(code.trim().toUpperCase());

    if (!row) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    if (row.redeemed_at) {
      return res.status(400).json({ error: 'This code has already been used' });
    }

    const expiresAt = Date.now() + row.days * DAY_MS;
    await markRedeemed(row.code, expiresAt);

    const token = signToken({ plan: row.plan, expiresAt });

    return res.status(200).json({ token, plan: row.plan, expiresAt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error redeeming code' });
  }
}
