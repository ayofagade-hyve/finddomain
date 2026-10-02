// Clay HTTP API column POSTs here: { job_id, company_name, domain }
import { kvHset, kvSet } from '../lib/kv.js';
import { cleanDomain, normName } from '../lib/normalize.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-callback-secret'] !== process.env.CLAY_CALLBACK_SECRET) {
    return res.status(401).json({ error: 'bad secret' });
  }
  const { job_id, company_name, domain } = req.body || {};
  if (!job_id || !company_name) return res.status(400).json({ error: 'job_id and company_name required' });

  const d = cleanDomain(domain);
  await kvHset(`job:${job_id}`, company_name, d || '-', 60 * 60 * 24);
  if (d) {
    await kvSet(`dom:${normName(company_name)}`, JSON.stringify({ domain: d, source: 'clay' }), 60 * 60 * 24 * 90);
  }
  res.json({ ok: true });
}
