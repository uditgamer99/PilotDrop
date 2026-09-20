import { verifyToken } from './_token.js';

const FREE_LIMIT_PER_DAY = 12;

// naive in-memory fallback used only to rate-limit free-tier IPs between
// cold starts of the same serverless instance — NOT a strong guarantee,
// but stops the trivial localStorage-edit bypass. Real accounts would fix
// this properly later; this is a reasonable stopgap for now.
const freeUsage = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model, unlockToken } = req.body;

    // Paid users: token must verify server-side. Its expiry is baked into
    // the signature itself, so editing localStorage does nothing.
    const unlocked = unlockToken ? !!verifyToken(unlockToken) : false;

    if (!unlocked) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const entry = freeUsage.get(ip);
      const count = entry && now - entry.windowStart < dayMs ? entry.count : 0;

      if (count >= FREE_LIMIT_PER_DAY) {
        return res.status(403).json({ error: { message: 'Free daily limit reached. Please unlock a plan.' } });
      }
      freeUsage.set(ip, { windowStart: entry && now - entry.windowStart < dayMs ? entry.windowStart : now, count: count + 1 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-oss-120b',
        messages: messages
      })
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Failed fetching data from Groq' });
  }
}
