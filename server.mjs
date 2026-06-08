#!/usr/bin/env node
// Aquatic Haven — a hobby fish store in the clean, dense McMaster-Carr style,
// built with McMaster's performance techniques: app shell + inlined critical CSS,
// zero render-blocking <head>, prefetch-on-hover client nav, immutable versioned
// assets. Bump VER on any asset change to bust the immutable cache.
//   node server.mjs            # http://localhost:8000
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';
import { CATEGORIES, PRODUCTS, catBySlug, bySlug, byCat, featured } from './catalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = +(process.env.PORT || 8000);
const VER = 'v4';
const SKILL_REPO_URL = 'https://github.com/joffewilliam/skills/tree/main/mcmaster-web-performance';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => '$' + n.toFixed(2);
const stars = r => { const f = Math.round(r); return '★★★★★'.slice(0, f) + '☆☆☆☆☆'.slice(0, 5 - f); };
const reviews = p => 6 + (p.n * 13) % 180;
const ICON = { 'freshwater-fish': '🐟', 'saltwater-fish': '🐠', 'live-plants': '🌿', 'tanks': '🪟', 'filtration': '💧', 'lighting': '💡', 'heating': '🌡️', 'food': '🍤', 'water-care': '🧪', 'decor': '🪨' };
const pick = (arr, seed) => arr[seed % arr.length];

function specs(p) {
  const s = p.n;
  if (p.cat === 'freshwater-fish' || p.cat === 'saltwater-fish') return [
    ['Water Type', p.cat === 'saltwater-fish' ? 'Saltwater' : 'Freshwater'],
    ['Care Level', pick(['Easy', 'Easy', 'Moderate', 'Advanced'], s)],
    ['Temperament', pick(['Peaceful', 'Peaceful', 'Semi-aggressive', 'Community'], s + 1)],
    ['Adult Size', pick(['1.5 in', '2 in', '2.5 in', '3 in', '4 in', '6 in'], s + 2)],
    ['Min. Tank', pick(['10 gal', '20 gal', '30 gal', '55 gal'], s + 3)],
    ['Diet', pick(['Omnivore', 'Carnivore', 'Herbivore'], s + 4)],
  ];
  if (p.cat === 'live-plants') return [
    ['Placement', pick(['Foreground', 'Midground', 'Background'], s)],
    ['Lighting', pick(['Low', 'Low–Medium', 'Medium', 'High'], s + 1)],
    ['CO₂', pick(['Not required', 'Optional', 'Recommended'], s + 2)],
    ['Growth Rate', pick(['Slow', 'Moderate', 'Fast'], s + 3)],
    ['Difficulty', pick(['Easy', 'Easy', 'Moderate'], s + 4)],
  ];
  return [
    ['Department', p.catName],
    ['Material', pick(['Glass', 'Acrylic', 'ABS plastic', 'Stainless steel', 'Mixed'], s)],
    ['Warranty', pick(['1 year', '2 years', '3 years', 'Lifetime'], s + 1)],
    ['Ships', 'Same day'],
  ];
}

// ---------- views (content of #app; reused for full render + prefetch fragments) ----------
const card = p => `<a class="card" data-nav href="/p/${p.slug}">
  <span class="thumb"><img src="${p.img}" width="220" height="165" loading="lazy" decoding="async" alt="${esc(p.name)}"></span>
  <span class="pname">${esc(p.name)}</span>
  <span class="pcat">${esc(p.catName)}</span>
  <span class="meta"><b class="price">${money(p.price)}</b><span class="rate" title="${p.rating.toFixed(1)} of 5">${stars(p.rating)}</span></span>
  <span class="cardfoot"><span class="badge ${p.stock ? 'in' : 'out'}">${p.stock ? 'In stock' : 'Backorder'}</span>${p.stock ? `<button class="qadd" type="button" data-add data-id="${p.id}" data-name="${esc(p.name)}" data-price="${p.price}" data-img="${p.img}" data-slug="${p.slug}">Add +</button>` : ''}</span>
</a>`;
const grid = items => `<div class="grid">${items.map(card).join('')}</div>`;

const deptTile = c => {
  const items = byCat[c.slug];
  const thumbs = items.slice(0, 4).map(p => `<img src="${p.img}" alt="" loading="lazy" width="92" height="70" decoding="async">`).join('');
  return `<a class="dept" data-nav href="/c/${c.slug}"><span class="dept-imgs">${thumbs}</span><span class="dept-name"><span class="di">${ICON[c.slug]}</span>${esc(c.name)}<span class="dept-n">${items.length} products</span></span></a>`;
};

function homeView() {
  return `<section class="hero"><div class="hero-txt">
      <span class="eyebrow">Aquarium supply · since 1998</span>
      <h1>Your aquarium, fully stocked</h1>
      <p>${PRODUCTS.length} products across ${CATEGORIES.length} departments — fish, plants, and gear, shipped same day with a live-arrival guarantee.</p>
      <span class="hero-ctas"><a class="btn" href="${SKILL_REPO_URL}" target="_blank" rel="noopener">Use this skill</a><a class="btn ghost" data-nav href="/c/freshwater-fish">Explore the demo</a></span>
    </div></section>
    <h2 class="sec">Shop by department</h2>
    <div class="depts">${CATEGORIES.map(deptTile).join('')}</div>
    <h2 class="sec">Popular this week</h2>
    ${grid(featured.concat(byCat['live-plants'].slice(0, 2)))}`;
}

function categoryView(slug) {
  const c = catBySlug[slug];
  if (!c) return `<h1>Not found</h1><p><a data-nav href="/">Back to store</a></p>`;
  const items = byCat[slug];
  return `<nav class="crumb"><a data-nav href="/">Store</a><span>›</span>${esc(c.name)}</nav>
    <header class="pagehead"><h1><span class="di">${ICON[slug]}</span>${esc(c.name)}</h1>
      <p class="lede">Tank-ready ${c.name.toLowerCase()} for hobbyists and aquascapers, inspected and guaranteed.</p></header>
    <div class="toolbar"><span><b>${items.length}</b> products</span><span class="muted">Sorted by popularity</span></div>
    ${grid(items)}`;
}

function productView(slug) {
  const p = bySlug[slug];
  if (!p) return `<h1>Not found</h1><p><a data-nav href="/">Back to store</a></p>`;
  const sp = specs(p).map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('');
  const rel = byCat[p.cat].filter(x => x.slug !== p.slug).slice(0, 5);
  const buy = p.stock
    ? `<div class="buyrow"><div class="qsel"><button type="button" data-q="-1" aria-label="Decrease">−</button><input id="qv" value="1" readonly aria-label="Quantity"><button type="button" data-q="1" aria-label="Increase">+</button></div>
       <button class="buy" data-add data-qty="qv" data-id="${p.id}" data-name="${esc(p.name)}" data-price="${p.price}" data-img="${p.img}" data-slug="${p.slug}">Add to cart</button></div>`
    : `<div class="buyrow"><button class="buy" disabled>Notify me when in stock</button></div>`;
  return `<nav class="crumb"><a data-nav href="/">Store</a><span>›</span><a data-nav href="/c/${p.cat}">${esc(p.catName)}</a><span>›</span>${esc(p.name)}</nav>
    <div class="detail">
      <div class="detail-media"><img class="detail-img" src="${p.img}" width="460" height="345" decoding="async" alt="${esc(p.name)}"></div>
      <div class="detail-info">
        <span class="pcat">${esc(p.catName)}</span>
        <h1>${esc(p.name)}</h1>
        <p class="rate big">${stars(p.rating)} <span class="muted">${p.rating.toFixed(1)} · ${reviews(p)} reviews · ${p.sku}</span></p>
        <p class="price big">${money(p.price)} <span class="muted unit">each</span></p>
        <p class="badge big ${p.stock ? 'in' : 'out'}">${p.stock ? 'In stock — ships same day' : 'On backorder'}</p>
        <p class="blurb">${esc(p.blurb)}</p>
        ${buy}
        <table class="specs"><caption>Specifications</caption><tbody>${sp}</tbody></table>
      </div>
    </div>
    <h2 class="sec">More from ${esc(p.catName)}</h2>
    ${grid(rel)}`;
}

function searchProducts(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return PRODUCTS.map(p => {
    const hay = `${p.name} ${p.catName} ${p.sku}`.toLowerCase();
    let score = 0;
    for (const t of terms) { if (!hay.includes(t)) return null; score += p.name.toLowerCase().startsWith(t) ? 3 : 1; }
    return { p, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score).map(x => x.p);
}
function searchView(q) {
  const items = searchProducts(q);
  const head = `<nav class="crumb"><a data-nav href="/">Store</a><span>›</span>Search</nav>
    <header class="pagehead"><h1>Search results</h1><p class="lede">“${esc(q)}” — ${items.length} match${items.length === 1 ? '' : 'es'}</p></header>`;
  if (!items.length) return `${head}<p class="empty">No products match “${esc(q)}”. Try <a data-nav href="/c/freshwater-fish">freshwater fish</a>, “filter”, “plant”, or “tank”.</p>`;
  return head + grid(items);
}

const cartShellView = () => `<div data-cart-root><h1>Your Cart</h1><p class="muted">Loading your cart…</p></div>`;

// ---------- app shell ----------
const sidebar = active => `<aside class="sidebar"><div class="side-h">Shop by Department</div><nav class="deptnav">
  <a data-nav href="/"${active === '/' ? ' class="active"' : ''}><span class="di">🏠</span><span class="dn-name">Home</span></a>
  ${CATEGORIES.map(c => `<a data-nav href="/c/${c.slug}"${active === '/c/' + c.slug ? ' class="active"' : ''}><span class="di">${ICON[c.slug]}</span><span class="dn-name">${esc(c.name)}</span><span class="dn-n">${byCat[c.slug].length}</span></a>`).join('')}
  </nav>
  <div class="side-promo"><b>🐟 Live arrival guarantee</b><span>Free shipping over $49 · ships same day</span></div></aside>`;

const footer = `<footer class="site"><div class="foot-in">
  <div class="foot-col"><h4>Shop</h4>${CATEGORIES.slice(0, 6).map(c => `<a data-nav href="/c/${c.slug}">${esc(c.name)}</a>`).join('')}</div>
  <div class="foot-col"><h4>More</h4>${CATEGORIES.slice(6).map(c => `<a data-nav href="/c/${c.slug}">${esc(c.name)}</a>`).join('')}</div>
  <div class="foot-col"><h4>Help</h4><a>Shipping &amp; delivery</a><a>Live arrival guarantee</a><a>Returns</a><a>Care guides</a><a>Contact us</a></div>
  <div class="foot-col foot-brand"><div class="brand-f">Aquatic&nbsp;Haven</div><p>Fish, plants &amp; aquarium gear, shipped same day from our facility. 98% of orders ship within 24 hours.</p></div>
  </div><div class="foot-bot">© 2026 Aquatic Haven · A demo store built with McMaster-Carr performance techniques.</div></footer>`;

const CRITICAL = `:root{--ink:#13262e;--mut:#5d7079;--sea:#0b7a9b;--deep:#063b4c;--green:#137a42;--gold:#f4b81f;--coral:#f5793b;--line:#dde7ea;--bg:#f3f7f8;--tile:#f8fbfc;--mh:56px}
*{box-sizing:border-box}html,body{margin:0}body{font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:#fff}
a{color:inherit;text-decoration:none}button{font:inherit}
.promo{background:var(--deep);color:#d7eef5;font-size:12.5px;text-align:center;padding:5px 12px;letter-spacing:.01em}
.promo b{color:var(--gold)}
.masthead{display:flex;align-items:center;gap:18px;height:var(--mh);padding:0 20px;background:linear-gradient(90deg,#063b4c,#0b7a9b);color:#fff;position:sticky;top:0;z-index:30}
.brand{font-size:19px;font-weight:800;letter-spacing:-.4px;white-space:nowrap;color:#fff}.brand span{font-weight:500;opacity:.82}
.search{position:relative;flex:1;max-width:600px;display:flex}
.search input{min-width:0;flex:1;height:36px;padding:0 13px;border:0;border-radius:5px 0 0 5px;font-size:14px;color:var(--ink)}
.search input:focus{outline:2px solid var(--gold)}
.sbtn{height:36px;border:0;border-left:1px solid #d7a30f;border-radius:0 5px 5px 0;background:var(--gold);color:#3a2c00;font-size:13px;font-weight:800;padding:0 14px;cursor:pointer}
.suggest{position:absolute;top:calc(100% + 5px);left:0;right:0;background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:7px;box-shadow:0 14px 40px rgba(2,40,55,.26);overflow:hidden;z-index:40}
.suggest a{display:flex;justify-content:space-between;gap:10px;padding:9px 13px;border-bottom:1px solid var(--line);font-size:13.5px}
.suggest a:last-child{border-bottom:0}.suggest a:hover,.suggest a.hi{background:#eef7fa}
.suggest .s-cat{color:var(--mut);font-size:12px}.suggest .s-price{color:var(--green);font-weight:700}
.acct{margin-left:auto;display:flex;gap:16px;align-items:center;font-size:13px;white-space:nowrap}
.acct a{color:#fff}.cartlink{display:inline-flex;align-items:center;gap:6px;font-weight:600}
.cc{background:var(--coral);color:#fff;border-radius:11px;min-width:19px;text-align:center;padding:1px 6px;font-size:12px;font-weight:800}
.shellwrap{display:flex;align-items:flex-start}
.sidebar{width:250px;flex:none;background:#fff;border-right:1px solid var(--line);position:sticky;top:var(--mh);height:calc(100vh - var(--mh));overflow-y:auto;padding:14px 0 22px}
.side-h{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--mut);font-weight:700;padding:4px 18px 8px}
.deptnav{display:flex;flex-direction:column}
.deptnav a{display:flex;align-items:center;gap:10px;padding:8px 18px;font-size:13.5px;border-left:3px solid transparent}
.deptnav a:hover{background:var(--bg)}.deptnav a.active{background:#e9f5f9;color:var(--sea);font-weight:700;border-left-color:var(--sea)}
.deptnav .di{font-size:15px;width:18px;text-align:center}.dn-name{flex:1}.dn-n{font-size:11px;color:#90a6ad;background:var(--bg);border-radius:9px;padding:1px 7px}
.side-promo{margin:14px 14px 0;padding:12px;background:linear-gradient(135deg,#e9f5f9,#f3f7f8);border:1px solid var(--line);border-radius:9px;font-size:12px;display:flex;flex-direction:column;gap:4px;color:var(--mut)}.side-promo b{color:var(--ink)}
.content{flex:1;min-width:0;padding:18px 26px 30px;max-width:1320px}
main{min-width:0}
h1{font-size:22px;margin:.1em 0 .5em}.di{margin-right:.35em}
h2.sec{font-size:16px;margin:26px 0 13px;padding-bottom:7px;border-bottom:2px solid var(--line)}
.crumb{color:var(--mut);font-size:12.5px;margin-bottom:8px;display:flex;gap:7px;flex-wrap:wrap}.crumb a{color:var(--sea)}.crumb span{color:#b7c6cb}
.pagehead h1{margin-bottom:.1em}.lede{color:var(--mut);margin:.1em 0 .2em;max-width:70ch}
.toolbar{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--line);background:var(--tile);border-radius:7px;padding:8px 13px;margin:12px 0 14px;font-size:13px}
.hero{background:linear-gradient(90deg,rgba(4,34,42,.92),rgba(4,48,57,.72) 44%,rgba(4,48,57,.16)),url('/assets/${VER}/img/hero-aquarium-bg.jpg') center right/cover;color:#fff;border-radius:12px;padding:30px 32px;overflow:hidden;min-height:210px;display:flex;align-items:center}
.hero-txt{max-width:680px}
.hero .eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#bfe6f0}
.hero h1{font-size:30px;margin:.2em 0;color:#fff}.hero p{max-width:62ch;color:#e4f3f7;margin:.2em 0 1em}
.hero-ctas{display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-block;background:var(--gold);color:#3a2c00;font-weight:700;padding:10px 18px;border-radius:7px}
.btn.ghost{background:rgba(255,255,255,.14);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)}
.depts{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:14px}
.dept{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff;display:flex;flex-direction:column}
.dept-imgs{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line)}
.dept-imgs img{width:100%;height:70px;object-fit:cover;display:block;background:var(--tile)}
.dept-name{padding:11px 13px;font-weight:700;font-size:14.5px;display:flex;flex-direction:column;gap:1px}
.dept-name .dept-n{font-weight:400;font-size:12px;color:var(--mut)}.dept-name .di{font-size:15px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:14px}
.card{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:10px;background:#fff;padding:12px;color:inherit}
.thumb{display:block;border-radius:7px;overflow:hidden;background:var(--tile);aspect-ratio:4/3;margin-bottom:10px}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.pname{font-weight:600;font-size:14px;line-height:1.32;min-height:2.6em}
.pcat{color:var(--mut);font-size:11.5px;text-transform:uppercase;letter-spacing:.03em;margin-top:2px}
.meta{display:flex;align-items:center;justify-content:space-between;margin-top:7px}
.price{color:var(--green);font-size:16px;font-weight:800}.rate{color:var(--gold);font-size:13px;letter-spacing:1px}
.cardfoot{display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:8px}
.badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:11px}
.badge.in{background:#e3f5ea;color:var(--green)}.badge.out{background:#fdeadf;color:#c2531a}.badge.big{font-size:12.5px;padding:4px 11px;align-self:flex-start}
.qadd{background:#fff;color:var(--sea);border:1px solid var(--sea);border-radius:7px;padding:5px 11px;font-size:12.5px;font-weight:700;cursor:pointer}
.qadd:hover{background:var(--sea);color:#fff}
.detail{display:grid;grid-template-columns:460px 1fr;gap:30px;align-items:start}
.detail-media{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--tile)}
.detail-img{width:100%;height:auto;display:block}
.detail-info h1{margin:.1em 0}.detail-info .pcat{font-size:12px}
.price.big{font-size:30px;color:var(--green)}.price .unit{font-size:14px;font-weight:400}.rate.big{font-size:16px;color:var(--gold)}
.blurb{max-width:60ch;color:#37535e;margin:.6em 0 1em}
.buyrow{display:flex;gap:12px;align-items:center;margin:6px 0 18px;flex-wrap:wrap}
.qsel{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.qsel button{background:var(--bg);border:0;width:36px;height:40px;font-size:18px;cursor:pointer;color:var(--ink)}
.qsel input{width:44px;height:40px;border:0;text-align:center;font-size:15px;font-weight:600}
.buy{background:var(--green);color:#fff;border:0;border-radius:8px;padding:0 26px;height:42px;font-size:15px;font-weight:700;cursor:pointer}
.buy:disabled{background:#9bb3bc;cursor:not-allowed}
.specs{border-collapse:collapse;width:100%;max-width:460px;font-size:13.5px;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.specs caption{text-align:left;font-weight:700;padding:0 0 7px;font-size:14px}
.specs th,.specs td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line)}
.specs th{background:var(--tile);color:var(--mut);font-weight:600;width:42%}.specs tr:last-child th,.specs tr:last-child td{border-bottom:0}
.empty{color:var(--mut);padding:18px 0}.empty a{color:var(--sea)}
.cart{max-width:780px}.cart-row{display:grid;grid-template-columns:72px 1fr auto auto;gap:15px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line)}
.cart-row img{width:72px;height:54px;object-fit:cover;border-radius:6px;background:var(--tile)}
.ci-name{font-weight:600;color:inherit}.ci-sub{color:var(--mut);font-size:12px;margin-top:2px}
.qty{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:7px;overflow:hidden}
.qty button{background:var(--bg);border:0;width:30px;height:30px;font-size:16px;cursor:pointer;color:var(--ink)}.qty span{min-width:32px;text-align:center;font-weight:600}
.ci-line{font-weight:800;min-width:70px;text-align:right;color:var(--ink)}
.ci-rm{background:none;border:0;color:#c2531a;cursor:pointer;font-size:12.5px;padding:0}
.cart-tot{display:flex;justify-content:space-between;align-items:center;margin-top:18px;font-size:17px}.cart-tot b{font-size:24px;color:var(--green)}
.cart-empty{color:var(--mut);padding:18px 0}.cart-empty a{color:var(--sea)}
.checkout{background:var(--green);color:#fff;border:0;border-radius:8px;padding:13px 30px;font-size:15px;font-weight:700;cursor:pointer;margin-top:16px}
.ordered{background:#e3f5ea;border:1px solid #bfe6cd;color:#13693c;padding:18px;border-radius:11px;max-width:620px}.ordered a{color:var(--green);font-weight:700}
footer.site{background:var(--deep);color:#bcd9e2;margin-top:40px}
.foot-in{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;max-width:1100px;margin:0 auto;padding:34px 26px}
.foot-col h4{color:#fff;font-size:13px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.05em}
.foot-col a{display:block;color:#bcd9e2;font-size:13px;padding:3px 0}.foot-col a:hover{color:#fff}
.brand-f{font-size:18px;font-weight:800;color:#fff;margin-bottom:8px}.foot-col p{font-size:12.5px;line-height:1.55}
.foot-bot{border-top:1px solid rgba(255,255,255,.12);text-align:center;font-size:12px;padding:14px;color:#8fb6c2}
#flash{position:fixed;right:16px;bottom:16px;background:#0f2c36;color:#fff;padding:9px 15px;border-radius:8px;font-size:13px;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:50}
#flash.on{opacity:.97;transform:none}`;

const shell = (main, title, active) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Aquatic Haven</title>
<meta name="description" content="Aquatic Haven — fish, plants, and aquarium gear shipped same day.">
<link rel="dns-prefetch" href="//upload.wikimedia.org">
<link rel="preload" href="/assets/${VER}/app.js" as="script">
<link rel="preload" href="/assets/${VER}/main.css" as="style">
<style>${CRITICAL}</style>
</head><body>
<div class="promo">🐟 <b>Live arrival guarantee</b> · Free shipping over $49 · 98% of orders ship same day</div>
<header class="masthead"><a class="brand" data-nav href="/">Aquatic&nbsp;Haven <span>· aquarium supply</span></a>
<form class="search" role="search" autocomplete="off"><input id="q" name="q" type="search" placeholder="Search ${PRODUCTS.length} products — fish, plants, gear" aria-label="Search" autocomplete="off"><button class="sbtn" type="submit">Search</button><div id="suggest" class="suggest" hidden></div></form>
<span class="acct"><a>Account</a><a class="cartlink" data-cart href="/cart">🛒 Cart <span id="cc" class="cc" hidden>0</span></a></span></header>
<div class="shellwrap">${sidebar(active)}<div class="content"><main id="app">${main}</main></div></div>
${footer}
<div id="flash"></div>
<link rel="stylesheet" href="/assets/${VER}/main.css" media="print" onload="this.media='all'">
<script src="/assets/${VER}/app.js" defer></script>
</body></html>`;

// ---------- routing ----------
const send = (res, status, body, headers = {}) => { res.writeHead(status, headers); res.end(body); };
const DOC = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' };
const IMMUTABLE = { 'cache-control': 'public, max-age=31536000, immutable' };
const NOCACHE = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' };
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = decodeURIComponent(url.pathname);
  try {
    if (p.startsWith('/assets/')) {
      const file = join(__dirname, 'public', normalize(p).replace(/^(\.\.[/\\])+/, ''));
      const body = await readFile(file);
      return send(res, 200, body, { 'content-type': MIME[extname(p)] || 'application/octet-stream', ...IMMUTABLE });
    }
    if (p === '/api/suggest') {
      const items = searchProducts(url.searchParams.get('q') || '').slice(0, 7)
        .map(x => ({ name: x.name, slug: x.slug, catName: x.catName, price: x.price }));
      return send(res, 200, JSON.stringify(items), { 'content-type': 'application/json', 'cache-control': 'no-cache' });
    }
    if (p === '/fragment/search') return send(res, 200, searchView(url.searchParams.get('q') || ''), NOCACHE);
    if (p.startsWith('/fragment/')) {
      const rest = p.slice('/fragment'.length);
      const main = rest === '/home' ? homeView()
        : rest === '/cart' ? cartShellView()
        : rest.startsWith('/c/') ? categoryView(rest.slice(3))
        : rest.startsWith('/p/') ? productView(rest.slice(3))
        : null;
      if (main == null) return send(res, 404, 'no fragment', { 'content-type': 'text/plain' });
      return send(res, 200, main, { 'content-type': 'text/html; charset=utf-8', ...(rest === '/cart' ? { 'cache-control': 'no-cache' } : IMMUTABLE) });
    }
    if (p === '/') return send(res, 200, shell(homeView(), 'Store', '/'), DOC);
    if (p === '/search') return send(res, 200, shell(searchView(url.searchParams.get('q') || ''), 'Search', ''), DOC);
    if (p === '/cart') return send(res, 200, shell(cartShellView(), 'Your Cart', ''), DOC);
    if (p.startsWith('/c/')) {
      const slug = p.slice(3).replace(/\/$/, '');
      const c = catBySlug[slug];
      return send(res, c ? 200 : 404, shell(categoryView(slug), c ? c.name : 'Not found', '/c/' + slug), DOC);
    }
    if (p.startsWith('/p/')) {
      const slug = p.slice(3).replace(/\/$/, '');
      const pr = bySlug[slug];
      return send(res, pr ? 200 : 404, shell(productView(slug), pr ? pr.name : 'Not found', '/c/' + (pr ? pr.cat : '')), DOC);
    }
    return send(res, 404, shell('<h1>404 — not found</h1><p><a data-nav href="/">Back to store</a></p>', 'Not found', ''), DOC);
  } catch (e) {
    return send(res, 500, 'error: ' + e.message);
  }
});

export { CATEGORIES, PRODUCTS, VER, cartShellView, categoryView, homeView, productView, searchProducts, searchView, shell };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`Aquatic Haven -> http://localhost:${PORT}  (${PRODUCTS.length} products, assets ${VER})`));
}
