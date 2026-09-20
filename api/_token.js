import crypto from 'crypto';

const SECRET = process.env.UNLOCK_SECRET; // set this in Vercel env vars — any long random string

function b64url(str) {
  return Buffer.from(str).toString('base64url');
}

export function signToken(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

// Returns the decoded payload if valid and not expired, otherwise null.
// This is what makes the system tamper-proof: the expiry is baked INTO
// the signed token itself, so editing localStorage's plain-text copy of
// "expiresAt" does nothing — the server only trusts what it can verify here.
export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig !== expectedSig) return null; // tampered or forged

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch {
    return null;
  }
  if (!payload.expiresAt || Date.now() > payload.expiresAt) return null; // expired
  return payload; // { plan, expiresAt }
}
