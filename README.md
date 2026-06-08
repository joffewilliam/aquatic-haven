# Aquatic Haven

A hobby fish-store clone built with **McMaster-Carr performance techniques**
(via the `mcmaster-web-performance` skill). 120 listings across 10 departments,
a persistent left sidebar, and prefetch-on-hover client navigation that feels
instant.

## Run

```bash
node scripts/fetch-images.mjs   # one-time: pull 120 free product images (~3 MB)
node server.mjs                 # http://localhost:8000
npm run build:static            # write GitHub Pages output to docs/
```

## Publish

This repo is designed to publish through GitHub Pages from `main` using the
`docs/` folder:

https://joffewilliam.github.io/aquatic-haven/

> **Hard-refresh after updating an asset.** Assets are served `immutable`, so the
> browser pins them. We bump the version segment (currently `/assets/v4`,
> the `VER` constant in `server.mjs` + the `img` path in `catalog.mjs`) on every
> change so the URL — and the cache — busts. This is McMaster's cache-busting
> model; it's also why a stale `app.js` can make the cart look broken until you
> bump `VER`.

## Features

- **Left sidebar** — 10 departments with live counts and active-state sync.
- **120 listings** across fish, plants, tanks, filtration, lighting, heating, food, water care, and decor.
- **Real shopping cart** — add/remove, quantity steppers, subtotal, checkout, an
  orange count badge in the masthead, persisted in `localStorage` across reloads.
- **Real search** — debounced autocomplete dropdown (`/api/suggest`) plus a full
  results page (`/search?q=`), both server-filtered over the catalog.
- **Accurate product images** — fish & plants use their Wikipedia lead photo
  (55/56 species); equipment uses keyword photos. Pulled by `scripts/fetch-images.mjs`.
- **Public skill CTA** — the hero's "Use this skill" button points at `SKILL_REPO_URL`
  in `server.mjs`: `https://github.com/joffewilliam/skills/tree/main/mcmaster-web-performance`.

## Performance techniques

| Technique | Where |
|---|---|
| App shell + **inlined critical CSS**, zero render-blocking `<head>` | `server.mjs` `CRITICAL` / `shell()` |
| Non-critical CSS via `preload` + `media=print/onload` swap; JS `defer` | `server.mjs` `shell()` |
| **Prefetch-on-hover** + memoize + `#app` swap + `pushState` (no reload) | `public/assets/v4/app.js` |
| **Immutable, version-prefixed assets** (`/assets/v4/...`, `max-age=31536000, immutable`); `no-cache` document | `server.mjs` headers, `VER` |
| Personalized parts (cart) kept `no-cache` / client-rendered — McMaster's dynamic split | `cartShellView()`, `app.js` cart module |
| Persistent **sidebar** with active-state sync on client nav | `server.mjs` `sidebar()`, `app.js` `setActive()` |
| Lazy-loaded product images with fixed dimensions (no CLS) | `card()` in `server.mjs` |

## Verified

Graded with the skill's verifier — **all McMaster targets PASS**:

```
node .claude/skills/mcmaster-web-performance/audit.mjs http://localhost:8000
# TTFB 3ms · FCP 0ms · doc 10.7KB · render-blocking 0 · inline CSS 3576ch
# preload 2 · dns-prefetch 1 · hover-prefetch YES (22 fragments fetched on hover)
```

## Layout

- `catalog.mjs` — deterministic 120-product catalog (10 departments).
- `server.mjs` — app shell, sidebar, routes (`/`, `/c/:cat`, `/p/:product`), `/fragment/*` prefetch endpoints, immutable asset serving.
- `public/assets/v4/app.js` — prefetch-on-hover engine.
- `public/assets/v4/main.css` — non-critical (deferred) styles.
- `public/assets/v4/img/` — 120 free images plus the generated hero background.
- `scripts/fetch-images.mjs` — idempotent image downloader.

Images are free Creative-Commons Flickr photos pulled by keyword (loremflickr),
so they are on-theme aquarium/fish photos rather than exact species shots.
