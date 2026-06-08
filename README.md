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
npm run preview:static          # http://localhost:8081/aquatic-haven/
npm run audit:pagespeed         # local PageSpeed regression checks
```

## Publish

This repo is designed to publish through GitHub Pages from `main` using the
`docs/` folder:

https://joffewilliam.github.io/aquatic-haven/

> **Hard-refresh after updating an asset.** Assets are served `immutable`, so the
> browser pins them. We bump the version segment (currently `/assets/v7`,
> the `VER` constant in `server.mjs` + the `img` path in `catalog.mjs`) on every
> change so the URL, and the cache, busts. This is McMaster's cache-busting
> model; it is also why a stale `app.js` can make the cart look broken until you
> bump `VER`.

## Features

- **Left sidebar**: 10 departments with live counts and active-state sync.
- **120 listings** across fish, plants, tanks, filtration, lighting, heating, food, water care, and decor.
- **Real shopping cart**: add/remove, quantity steppers, subtotal, checkout, an orange count badge in the masthead, persisted in `localStorage` across reloads.
- **Real search**: debounced autocomplete dropdown (`/api/suggest`) plus a full results page (`/search?q=`), server-filtered over the catalog in dev and loaded from `catalog.json` in the static build.
- **Accurate product images**: fish and plants use their Wikipedia lead photo where available; equipment uses keyword photos. Pulled by `scripts/fetch-images.mjs`.
- **Generated logo mark**: `public/assets/v7/img/aquatic-haven-logo.png`, created with image generation and exported as transparent PNG/WebP variants.
- **Public skill CTA**: the hero's "Use this skill" button points at `SKILL_REPO_URL` in `server.mjs`: `https://github.com/joffewilliam/skills`.

## Performance Techniques

| Technique | Where |
|---|---|
| App shell + **inlined critical CSS**, zero render-blocking `<head>` | `server.mjs` `CRITICAL` / `shell()` |
| Non-critical CSS via `preload` + `media=print/onload` swap; JS `defer` | `server.mjs` `shell()` |
| **Prefetch-on-hover** + memoize + `#app` swap + `pushState` (no reload) | `public/assets/v7/app.js`, served as `app.min.js` |
| **Immutable, version-prefixed assets** (`/assets/v7/...`, `max-age=31536000, immutable`); `no-cache` document | `server.mjs` headers, `VER` |
| Personalized parts (cart) kept `no-cache` / client-rendered | `cartShellView()`, `app.js` cart module |
| Persistent **sidebar** with active-state sync on client nav | `server.mjs` `sidebar()`, `app.js` `setActive()` |
| Priority hero LCP preload (`fetchpriority="high"`) plus compressed WebP hero/logo assets | `server.mjs` `shell()` / `CRITICAL` |
| Separate WebP thumbnail sizes for department tiles and cards; lazy images stay lazy | `public/assets/v7/dept/`, `public/assets/v7/thumb/`, `wakeImages()` |
| Static search catalog loaded from versioned JSON instead of inlined in every page | `docs/assets/v7/catalog.json`, `scripts/build-static.mjs` |

## Verified

Graded locally against the generated static GitHub Pages artifact:

```bash
npm run audit:pagespeed
# PageSpeed-focused static checks passed

node .agents/skills/mcmaster-web-performance/audit.mjs http://localhost:8081/aquatic-haven/
# all McMaster targets PASS

npx --yes lighthouse@13.0.1 http://localhost:8081/aquatic-haven/ --preset=desktop --only-categories='performance,accessibility,best-practices,seo'
# Performance 100 / Accessibility 100 / Best Practices 100 / SEO 100
# LCP ~0.6s
```

## Layout

- `catalog.mjs`: deterministic 120-product catalog (10 departments).
- `server.mjs`: app shell, sidebar, routes (`/`, `/c/:cat`, `/p/:product`), `/fragment/*` prefetch endpoints, immutable asset serving.
- `public/assets/v7/app.js`: prefetch-on-hover engine.
- `public/assets/v7/app.min.js`: served minified client bundle.
- `public/assets/v7/main.css`: non-critical deferred styles.
- `public/assets/v7/img/`: source product images, compressed hero background, and generated logo assets.
- `public/assets/v7/thumb/`, `public/assets/v7/dept/`: generated WebP thumbnails sized for cards and department tiles.
- `scripts/audit-pagespeed.mjs`: regression checks for LCP priority, contrast, heading order, static thumbnails, and bundle size.
- `scripts/preview-static.mjs`: serves `docs/` at `/aquatic-haven/` with production-like immutable asset headers.
- `scripts/fetch-images.mjs`: idempotent image downloader.

Images are free Creative-Commons Flickr photos pulled by keyword (loremflickr),
so they are on-theme aquarium/fish photos rather than exact species shots.
