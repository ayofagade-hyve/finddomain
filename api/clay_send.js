// POST { jobId, names: [...] } (max 100) -> pushes each name into the Clay webhook table
import { mapLimit, checkAccess, fetchWithRetry } from '../lib/http_utils.js';
import { kvEnabled } from '../lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!checkAccess(req, res)) return;
  if (!process.env.CLAY_WEBHOOK_URL || !kvEnabled) {
    return res.status(400).json({ error: 'Clay or KV not configured' });
  }
  const { jobId } = req.body || {};
  const names = (req.body?.names || []).slice(0, 100).map(String);
  if (!jobId) return res.status(400).json({ error: 'jobId required' });

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.CLAY_WEBHOOK_TOKEN) {
    headers[process.env.CLAY_WEBHOOK_AUTH_HEADER || 'x-clay-webhook-auth'] = process.env.CLAY_WEBHOOK_TOKEN;
  }

  const sent = await mapLimit(names, 5, async (company_name) => {
    const r = await fetchWithRetry(process.env.CLAY_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ job_id: jobId, company_name }),
    });
    return Boolean(r && r.ok);
  });

  res.json({ sent: sent.filter(Boolean).length, failed: sent.filter((x) => !x).length });
}
