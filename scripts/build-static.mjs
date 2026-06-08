#!/usr/bin/env node
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES,
  PRODUCTS,
  VER,
  cartShellView,
  categoryView,
  homeView,
  productView,
  searchView,
  shell,
} from '../server.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const out = join(root, 'docs');
const base = (process.env.BASE_PATH || '/aquatic-haven').replace(/\/$/, '');

const staticProducts = PRODUCTS.map(p => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  catName: p.catName,
  sku: p.sku,
  price: p.price,
  img: withBase(p.img),
  rating: p.rating,
  stock: p.stock,
}));

function withBase(path) {
  return path && path.startsWith('/') ? base + path : path;
}

function injectStaticData(html) {
  const productsJson = JSON.stringify(staticProducts).replace(/</g, '\\u003c');
  const data = `<script type="application/json" id="ah-products">${productsJson}</script><script>window.AH_BASE=${JSON.stringify(base)};window.AH_PRODUCTS=JSON.parse(document.getElementById('ah-products').textContent);</script>`;
  return html.replace('</head>', `${data}\n</head>`);
}

function withStaticBase(html) {
  return html
    .replace(/(href|src|data-img)="\/(?!\/)/g, `$1="${base}/`)
    .replace(/url\('\/assets/g, `url('${base}/assets`);
}

async function writeRoute(route, html, fullPage = true) {
  const dir = route === '/' ? out : join(out, route.replace(/^\//, ''));
  await mkdir(dir, { recursive: true });
  const finalHtml = fullPage ? injectStaticData(withStaticBase(html)) : withStaticBase(html);
  await writeFile(join(dir, 'index.html'), finalHtml);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(join(root, 'public', 'assets', VER), join(out, 'assets', VER), { recursive: true });

await writeRoute('/', shell(homeView(), 'Store', '/'));
await writeRoute('/cart', shell(cartShellView(), 'Your Cart', ''));
await writeRoute('/search', shell(searchView(''), 'Search', ''));
await writeRoute('/fragment/home', homeView(), false);
await writeRoute('/fragment/cart', cartShellView(), false);

for (const category of CATEGORIES) {
  await writeRoute(`/c/${category.slug}`, shell(categoryView(category.slug), category.name, `/c/${category.slug}`));
  await writeRoute(`/fragment/c/${category.slug}`, categoryView(category.slug), false);
}

for (const product of PRODUCTS) {
  await writeRoute(`/p/${product.slug}`, shell(productView(product.slug), product.name, `/c/${product.cat}`));
  await writeRoute(`/fragment/p/${product.slug}`, productView(product.slug), false);
}

await writeFile(join(out, '404.html'), injectStaticData(withStaticBase(shell(homeView(), 'Store', '/'))));
console.log(`Static build written to ${out} with base path ${base}`);
