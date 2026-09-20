// Minimal Supabase REST helper — no extra npm package needed.
// Uses the SERVICE ROLE key, which must only ever be used server-side
// (in /api routes), NEVER exposed to the browser.

const BASE = process.env.SUPABASE_URL; // e.g. https://xxxx.supabase.co
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers() {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  };
}

// Fetch a single code row by its code value
export async function getCode(code) {
  const url = `${BASE}/rest/v1/codes?code=eq.${encodeURIComponent(code)}&select=*`;
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error('Supabase read failed: ' + (await r.text()));
  const rows = await r.json();
  return rows[0] || null;
}

// Mark a code as redeemed
export async function markRedeemed(code, redeemedExpiresAt) {
  const url = `${BASE}/rest/v1/codes?code=eq.${encodeURIComponent(code)}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({
      redeemed_at: new Date().toISOString(),
      redeemed_expires_at: new Date(redeemedExpiresAt).toISOString(),
    }),
  });
  if (!r.ok) throw new Error('Supabase update failed: ' + (await r.text()));
}

// Insert a brand-new unredeemed code (used by generate-code.js / payment webhook)
export async function insertCode({ code, plan, days, payment_ref }) {
  const url = `${BASE}/rest/v1/codes`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify([{ code, plan, days, payment_ref: payment_ref || null }]),
  });
  if (!r.ok) throw new Error('Supabase insert failed: ' + (await r.text()));
  const rows = await r.json();
  return rows[0];
}
