// Pull a free product image for every catalog item.
// Primary: loremflickr (keyword-based Creative-Commons Flickr photos, no API key).
// Fallback: picsum.photos. Idempotent — skips files already present.
//   node scripts/fetch-images.mjs
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS } from '../catalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'assets', 'v4', 'img');
const CONCURRENCY = 5; // gentle on Wikipedia to avoid transient rate-limit fallbacks
await mkdir(OUT, { recursive: true });

const exists = async f => { try { return (await stat(f)).size > 1000; } catch { return false; } };
const retry = async (fn, tries = 3, delay = 600) => {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise(r => setTimeout(r, delay * (i + 1))); }
  }
  throw last;
};

async function getImage(url, ms = 20000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ac.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 AquaticHaven/1.0' } });
    if (!r.ok) throw new Error('http ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) throw new Error('too small');
    return buf;
  } finally { clearTimeout(t); }
}

// Resolve MANY Wikipedia titles to lead-image URLs in batched API calls (≤40
// titles/call) — the api.php endpoint rate-limits per-request floods, so we make
// ~2 calls instead of one per species. Image bytes come from the CDN afterward.
const WIKI_UA = 'AquaticHavenDemo/1.0 (educational demo; https://example.com/aquatic-haven)';
let wikiMap = new Map(); // title -> thumbnail source URL

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': WIKI_UA } });
  const txt = await r.text();
  if (!r.ok || txt[0] !== '{') throw new Error(`api ${r.status}: ${txt.slice(0, 48)}`);
  return JSON.parse(txt);
}

async function resolveWikiThumbs(titles) {
  const map = new Map();
  const uniq = [...new Set(titles)];
  for (let i = 0; i < uniq.length; i += 40) {
    const chunk = uniq.slice(i, i + 40);
    const api = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=500&redirects=1&titles=${encodeURIComponent(chunk.join('|'))}`;
    const j = await retry(() => fetchJson(api), 6, 5000); // long backoff if throttled
    const norm = {}, redir = {}, byTitle = {};
    (j.query.normalized || []).forEach(x => norm[x.from] = x.to);
    (j.query.redirects || []).forEach(x => redir[x.from] = x.to);
    Object.values(j.query.pages || {}).forEach(p => { if (p.thumbnail) byTitle[p.title] = p.thumbnail.source; });
    for (const t of chunk) { let x = t; x = norm[x] || x; x = redir[x] || x; if (byTitle[x]) map.set(t, byTitle[x]); }
    await new Promise(r => setTimeout(r, 1500)); // polite gap between chunks
  }
  return map;
}

async function wikiImage(p) {
  const src = wikiMap.get(p.wiki);
  if (!src) throw new Error('no wiki image for ' + p.wiki);
  return getImage(src);
}

const FORCE_WIKI = process.env.FORCE_WIKI === '1'; // overwrite species images with the Wikipedia photo

const keyword = p => [
  () => getImage(`https://loremflickr.com/400/300/${encodeURIComponent(p.kw)}?lock=${p.lock}`),
  () => getImage(`https://loremflickr.com/400/300/aquarium?lock=${p.lock}`),
  () => getImage(`https://picsum.photos/seed/aqua${p.lock}/400/300`),
];

// Returns { s:'ok'|'skip'|'fail', src:'wiki'|'flickr' }
async function download(p) {
  const file = join(OUT, `${p.id}.jpg`);
  const have = await exists(file);
  if (p.wiki) {
    if (have && !FORCE_WIKI) return { s: 'skip' };
    try { await writeFile(file, await retry(() => wikiImage(p), 3, 800)); return { s: 'ok', src: 'wiki' }; }
    catch { if (have) return { s: 'skip', src: 'kept' }; } // don't downgrade an existing image
  } else if (have) return { s: 'skip' };
  for (const src of keyword(p)) {
    try { await writeFile(file, await src()); return { s: 'ok', src: 'flickr' }; }
    catch { /* next */ }
  }
  return { s: 'fail' };
}

async function runPool(items, conc, onDone) {
  const q = [...items];
  await Promise.all(Array.from({ length: conc }, async () => {
    let p;
    while ((p = q.shift())) onDone(p, await download(p));
  }));
}

let ok = 0, skip = 0, fail = 0, done = 0;
const notAccurate = [];
function tally(p, r) {
  if (r.s === 'ok') ok++; else if (r.s === 'skip') skip++; else { fail++; console.error('FAIL', p.id, p.name); }
  if (p.wiki && r.src !== 'wiki' && !(r.s === 'skip' && !FORCE_WIKI)) notAccurate.push(`${p.id} ${p.name}`);
  if (++done % 20 === 0 || done === PRODUCTS.length) process.stdout.write(`  ${done}/${PRODUCTS.length} (ok ${ok}, skip ${skip}, fail ${fail})\n`);
}

console.log(`Downloading ${PRODUCTS.length} images -> ${OUT}  (FORCE_WIKI=${FORCE_WIKI ? 1 : 0})`);
const wiki = PRODUCTS.filter(p => p.wiki), rest = PRODUCTS.filter(p => !p.wiki);
// resolve all species thumbnails up front in ~2 batched API calls, then download bytes from the CDN
if (wiki.length && (FORCE_WIKI || (await Promise.all(wiki.map(p => exists(join(OUT, `${p.id}.jpg`))))).some(x => !x))) {
  console.log('Resolving Wikipedia thumbnails (batched)...');
  wikiMap = await resolveWikiThumbs(wiki.map(p => p.wiki));
  console.log(`  resolved ${wikiMap.size}/${new Set(wiki.map(p => p.wiki)).size} titles`);
}
for (const p of wiki) tally(p, await download(p));
await runPool(rest, CONCURRENCY, (p, r) => tally(p, r));
console.log(`Done. ok=${ok} skip=${skip} fail=${fail}`);
if (notAccurate.length) console.log(`Species without a Wikipedia image (kept fallback): ${notAccurate.join(', ')}`);
if (fail) process.exit(1);
