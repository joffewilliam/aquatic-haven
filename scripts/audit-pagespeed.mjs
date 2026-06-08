#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, PRODUCTS, VER, homeView, shell } from '../server.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = shell(homeView(), 'Store', '/');

function fail(message) {
  throw new Error(message);
}

function hexToRgb(hex) {
  const [, r, g, b] = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i) || [];
  if (!r) fail(`Invalid hex color: ${hex}`);
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
}

function luminance(hex) {
  return hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function cssVar(name) {
  return html.match(new RegExp(`${name}:([^;]+)`))?.[1]?.trim() || fail(`Missing ${name}`);
}

assert.ok(
  html.includes('fetchpriority="high"') && html.includes(`href="/assets/${VER}/img/hero-aquarium-bg.webp"`),
  'hero LCP image must be preloaded with fetchpriority="high"',
);
assert.ok(!html.includes(`href="/assets/${VER}/app.js"`), 'the page must preload the served minified bundle, not source app.js');

assert.equal((html.match(/<h4\b/g) || []).length, 0, 'footer must not skip heading levels with h4');

const demoMessage = 'This is just a demo silly goose';
const helpLinks = [...html.matchAll(/<a href="#" data-demo-link>/g)].length;
assert.equal(helpLinks, 5, 'footer Help links should be demo-only links');

const sea = cssVar('--sea');
const activeBg = '#e9f5f9';
const countColor = html.match(/\.dn-n\{[^}]*color:([^;]+);/)?.[1]?.trim() || fail('Missing .dn-n color');
const countBg = cssVar('--bg');
assert.ok(contrast(sea, activeBg) >= 4.5, `active sidebar contrast is ${contrast(sea, activeBg).toFixed(2)}`);
assert.ok(contrast(countColor, countBg) >= 4.5, `sidebar count contrast is ${contrast(countColor, countBg).toFixed(2)}`);

const eagerImages = [...html.matchAll(/<img\b[^>]*loading="eager"/g)].length;
assert.ok(eagerImages <= 8, `home should eagerly load only the first-view images, found ${eagerImages}`);

for (const product of PRODUCTS) {
  const thumb = join(root, 'public', 'assets', VER, 'thumb', `${product.id}.webp`);
  const dept = join(root, 'public', 'assets', VER, 'dept', `${product.id}.webp`);
  assert.ok(existsSync(thumb), `missing generated thumbnail ${thumb}`);
  assert.ok(existsSync(dept), `missing generated department thumbnail ${dept}`);
}

const appJs = await readFile(new URL(`../public/assets/${VER}/app.min.js`, import.meta.url), 'utf8');
assert.ok(appJs.length < 11000, `served app.min.js should stay compact, found ${appJs.length} bytes`);
assert.ok(appJs.includes('data-demo-link'), 'client bundle should intercept footer demo links');
assert.ok(appJs.includes(demoMessage), 'client bundle should show the demo-only footer popup copy');

assert.equal(CATEGORIES.length, 10, 'catalog still has the expected department count');
console.log('PageSpeed-focused static checks passed');
