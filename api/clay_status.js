// GET ?job=ID -> { results: { "Company": "domain.com" | "-" } }
import { kvHgetall, kvEnabled } from '../lib/kv.js';
import { checkAccess } from '../lib/http_utils.js';

export default async function handler(req, res) {
  if (!checkAccess(req, res)) return;
  if (!kvEnabled) return res.status(400).json({ error: 'KV not configured' });
  res.json({ results: await kvHgetall(`job:${req.query.job}`) });
}
