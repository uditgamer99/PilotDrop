import crypto from 'crypto';
import { insertCode } from './_supabase.js';

const PLAN_DAYS = { weekly: 7, monthly: 30, yearly: 365 };

// NowPayments signs the callback body as JSON with keys sorted alphabetically
// (recursively) — this must match exactly or the signature check fails.
function sortObject(obj) {
  if (Array.isArray(obj)) return obj.map(sortObject);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = sortObject(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

function randomCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Vercel parses JSON bodies by default, which is fine here since we only
// need the parsed object to re-sort and re-stringify for signature checking.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const signature = req.headers['x-nowpayments-sig'];
    const sorted = sortObject(req.body);
    const expected = crypto
      .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET)
      .update(JSON.stringify(sorted))
      .digest('hex');

    if (signature !== expected) {
      console.warn('NowPayments webhook: bad signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { payment_status, order_id } = req.body;

    if (payment_status === 'finished' || payment_status === 'confirmed') {
      const plan = (order_id || '').split('-')[0];
      const days = PLAN_DAYS[plan];

      if (days) {
        const code = randomCode();
        await insertCode({ code, plan, days, payment_ref: order_id });
        console.log(`Generated code ${code} for order ${order_id}`);
      } else {
        console.warn('Unrecognized plan in order_id:', order_id);
      }
    }

    // Always 200 so NowPayments doesn't keep retrying — we've logged anything unusual above.
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}
