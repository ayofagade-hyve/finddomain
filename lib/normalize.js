const SUFFIXES = new Set([
  'ltd', 'limited', 'inc', 'incorporated', 'llc', 'llp', 'lp', 'plc', 'corp', 'corporation',
  'co', 'company', 'gmbh', 'ag', 'sa', 'sas', 'sarl', 'bv', 'nv', 'srl', 'spa', 'pty', 'pte',
  'group', 'holdings', 'the', 'oy', 'ab', 'as', 'kk', 'uk', 'international',
]);

export function normName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !SUFFIXES.has(t))
    .join(' ')
    .trim();
}

// Conservative match so fuzzy autocomplete results don't sneak through
export function nameMatches(input, candidate) {
  const a = normName(input);
  const b = normName(candidate);
  if (!a || !b) return false;
  if (a === b || a.replace(/ /g, '') === b.replace(/ /g, '')) return true;
  const ta = new Set(a.split(' '));
  const tb = new Set(b.split(' '));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  return inter / union >= 0.67;
}

export function cleanDomain(d) {
  if (!d) return '';
  return String(d).trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0];
}
