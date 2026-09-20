import { insertCode } from './_supabase.js';
import crypto from 'crypto';

const PLAN_DAYS = { weekly: 7, monthly: 30, yearly: 365 };

function randomCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Simple shared-secret check for now. Later, your USDT/UPI webhook will
  // call this route directly with this same header instead of you doing it by hand.
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { plan, payment_ref } = req.body;
    if (!PLAN_DAYS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const code = randomCode();
    await insertCode({ code, plan, days: PLAN_DAYS[plan], payment_ref });

    return res.status(200).json({ code, plan });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error generating code' });
  }
}
