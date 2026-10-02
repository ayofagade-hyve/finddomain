import { cleanDomain, nameMatches } from './normalize.js';
import { fetchWithRetry } from './http_utils.js';

// Step 1: Clearbit Autocomplete (free, no key). Only accept close name matches.
export async function clearbitLookup(name) {
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`;
  const r = await fetchWithRetry(url);
  if (!r || !r.ok) return null;
  const list = await r.json().catch(() => []);
  const hit = (Array.isArray(list) ? list : []).find((c) => c.domain && nameMatches(name, c.name));
  return hit ? { domain: cleanDomain(hit.domain), source: 'clearbit', matched_name: hit.name } : null;
}

// Step 2: Cognism company Enrich (no credits), falling back to company Redeem (also no credits).
const COG_BASE = process.env.COGNISM_BASE_URL || 'https://app.cognism.com';

function cognismHeaders() {
  return { Authorization: `Bearer ${process.env.COGNISM_API_KEY}`, 'Content-Type': 'application/json' };
}

function pickDomain(o) {
  if (!o || typeof o !== 'object') return '';
  const d = o.domain || o.website || o.companyDomain || o.companyWebsite
    || (Array.isArray(o.domains) && o.domains[0])
    || o.account?.domain || o.account?.website
    || o.company?.domain || o.company?.website;
  return cleanDomain(d);
}

function firstRecord(data) {
  if (Array.isArray(data)) return data[0];
  return data?.results?.[0] || data?.result || data?.data?.[0] || data?.data || data;
}

export async function cognismEnrichRaw(name) {
  const r = await fetchWithRetry(`${COG_BASE}/api/enrich/company/enrich`, {
    method: 'POST',
    headers: cognismHeaders(),
    body: JSON.stringify({ name, minMatchScore: Number(process.env.COGNISM_MIN_SCORE || 30) }),
  });
  if (!r) return { status: 0, data: null };
  return { status: r.status, data: await r.json().catch(() => null) };
}

export async function cognismRedeemRaw(redeemId) {
  const r = await fetchWithRetry(`${COG_BASE}/api/redeem/company/redeem`, {
    method: 'POST',
    headers: cognismHeaders(),
    body: JSON.stringify({ redeemIds: [redeemId] }),
  });
  if (!r) return { status: 0, data: null };
  return { status: r.status, data: await r.json().catch(() => null) };
}

export async function cognismLookup(name) {
  if (!process.env.COGNISM_API_KEY) return null;
  const { status, data } = await cognismEnrichRaw(name);
  if (status !== 200 || !data) return null;
  const rec = firstRecord(data);
  let domain = pickDomain(rec);
  if (!domain && rec?.redeemId) {
    const red = await cognismRedeemRaw(rec.redeemId);
    if (red.status === 200) domain = pickDomain(firstRecord(red.data));
  }
  return domain ? { domain, source: 'cognism', matched_name: rec?.name || '' } : null;
}
