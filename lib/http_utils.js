export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retries on 429/5xx/timeouts with backoff. Returns null if it never succeeds.
export async function fetchWithRetry(url, opts = {}, tries = 3, timeoutMs = 8000) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
      if (r.status !== 429 && r.status < 500) return r;
    } catch { /* timeout or network, retry */ }
    await sleep(600 * 2 ** i);
  }
  return null;
}

export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export function checkAccess(req, res) {
  const code = process.env.ACCESS_CODE;
  if (code && req.headers['x-access-code'] !== code) {
    res.status(401).json({ error: 'Wrong access code' });
    return false;
  }
  return true;
}
