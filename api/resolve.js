// POST { names: [...] } (max 50) -> { results: [{ name, domain, source, matched_name }] }
import { normName } from '../lib/normalize.js';
import { kvGet, kvSet } from '../lib/kv.js';
import { mapLimit, checkAccess } from '../lib/http_utils.js';
import { clearbitLookup, cognismLookup } from '../lib/domain_sources.js';

const CACHE_TTL = 60 * 60 * 24 * 90; // 90 days

async function resolveOne(name) {
  const base = { name, domain: '', source: '', matched_name: '' };
  const key = `dom:${normName(name)}`;
  if (!normName(name)) return base;

  const cached = await kvGet(key);
  if (cached) {
    const c = JSON.parse(cached);
    return { ...base, ...c, source: `${c.source} (cached)` };
  }

  const hit = (await clearbitLookup(name)) || (await cognismLookup(name));
  if (hit) {
    await kvSet(key, JSON.stringify(hit), CACHE_TTL);
    return { ...base, ...hit };
  }
  return base;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!checkAccess(req, res)) return;
  const names = (req.body?.names || []).slice(0, 50).map(String);
  const results = await mapLimit(names, 5, resolveOne);
  res.json({ results });
}
