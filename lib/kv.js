// Minimal Upstash Redis REST client (no dependencies)
const URL_ = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;
export const kvEnabled = Boolean(URL_ && TOKEN);

async function cmd(args) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`KV ${r.status}`);
  return (await r.json()).result;
}

export async function kvGet(key) {
  if (!kvEnabled) return null;
  try { return await cmd(['GET', key]); } catch { return null; }
}

export async function kvSet(key, value, ttlSeconds) {
  if (!kvEnabled) return;
  try {
    await cmd(ttlSeconds ? ['SET', key, value, 'EX', String(ttlSeconds)] : ['SET', key, value]);
  } catch { /* cache is best effort */ }
}

export async function kvHset(key, field, value, ttlSeconds) {
  await cmd(['HSET', key, field, value]);
  if (ttlSeconds) await cmd(['EXPIRE', key, String(ttlSeconds)]);
}

export async function kvHgetall(key) {
  const flat = (await cmd(['HGETALL', key])) || [];
  const out = {};
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}
