// GET ?name=Hyve%20Group -> raw Cognism enrich + redeem responses, for checking field names
import { checkAccess } from '../lib/http_utils.js';
import { cognismEnrichRaw, cognismRedeemRaw } from '../lib/domain_sources.js';

export default async function handler(req, res) {
  if (!checkAccess(req, res)) return;
  const enrich = await cognismEnrichRaw(req.query.name || 'Hyve Group');
  const rec = enrich.data?.results?.[0] || enrich.data;
  const redeem = rec?.redeemId ? await cognismRedeemRaw(rec.redeemId) : null;
  res.json({ enrich, redeem });
}
