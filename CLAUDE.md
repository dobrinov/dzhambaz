# CLAUDE.md

This file provides guidance to Claude Code when working in this repo.

## What this repo is

**Джамбаз** — a Chrome extension that shows the real market price of
cars on Bulgarian listing sites (mobile.bg, cars.bg), with a valuation
tool for your own car. Its marketing site lives on a separate branch.

- `main` branch → extension source (`extension/`) + this file + README
- `website` branch → the public marketing/legal site hosted at
  <https://dobrinov.github.io/dzhambaz/>

## Commands (extension)

All extension commands run from `extension/`.

- **Dev:** `npm run dev` — Plasmo hot-reloading dev build
- **Build:** `npm run build` — production bundle → `build/chrome-mv3-prod/`
- **Zip for CWS:** `npm run build -- --zip`
- **Typecheck:** `npx tsc --noEmit`

## Extension architecture

MV3 + Plasmo + React (content scripts, not a SPA). Two content scripts
run on mobile.bg and cars.bg pages:

```
background.ts              service worker; one job: fetch URLs and
                           decode the response with the right charset
                           (mobile.bg is windows-1251).

contents/
  market-panel.tsx         fixed-right panel on search-results pages.
                           3 tabs: Статистика · Обяви · Оцени моята.
                           Owns the crawl orchestration: current-site
                           pagination + a cross-site crawl that
                           translates the filters into the other site's
                           URL shape.
  listing-badge.tsx        per-listing verdict overlay (under/fair/
                           over/outlier) using stats from the panel.

popup.tsx                  toolbar popup — combined-listings summary,
                           language toggle.

parsers/                   per-site HTML → CarListing[].
shared/
  types.ts                 CarListing, MarketStats, MarketPosition
  stats.ts                 percentiles + outlier filtering
  estimate.ts              linear regression price estimate + nearest-
                           neighbours
  market-position.ts       verdict/colour for a single listing vs stats
  cross-site.ts            URL building + filter translation for the
                           cross-site crawl
  parse-helpers.ts         price/year/mileage/power extractors for BG
                           listing text
  i18n.ts                  BG + EN strings (BG is primary language)
```

### How the panel works

1. Content script mounts on load (`document_idle`).
2. Detects site, checks we're on a search-results page (URL prefix +
   `от общо N` text marker — handles mobile.bg short-URL redirects).
3. Parses the current page's listings from the live DOM, then starts
   two crawls in parallel:
   - `crawlCurrentSite` — paginates the current site.
   - `crawlOtherSite` — translates filters into the other site's URL
     and crawls there (capped at 50 pages for cross-site).
4. Listings stream into React state as each page completes; Stats/
   Listings/Price-mine views react.

The crawl is scoped to one content-script lifetime — navigating
between search pages restarts it. (A background-service-worker
implementation is the obvious upgrade but not currently shipped.)

### Styling

`market-panel.tsx` has its own `getStyle()` that injects a `<style>`
tag. Classes are prefixed `.dbz-*` and the styling token family
(`--panel-bg` etc.) is dark navy + cyan. Fonts (Inter / JetBrains
Mono / Caveat) load from Google Fonts via `@import` — if the host page
has a restrictive CSP the wordmark falls back to Georgia serif.

`listing-badge.tsx` has its own `getStyle()` with `.wd-*` classes
(older prefix, kept separate because it's scoped to its own injected
style element).

## Conventions

- ES modules, Node16 resolution, TypeScript strict mode.
- EUR/BGN conversion uses a fixed rate of 1.95583.
- Tests (where present) colocate as `*.test.ts` next to source.
- Storage keys:
  - `listings:mobile.bg`, `listings:cars.bg`, `listings:combined` —
    used by both content scripts + popup.
  - `wd-lang` — language toggle (kept as-is for back-compat).
  - `wd-estimate-inputs` — price-my-car form state.

## Marketing site

On the `website` branch, a static HTML/CSS site using the same design
language (Inter + Caveat + JBMono, navy + cyan). BG is the default
language; EN lives under `en/`. `.nojekyll` is present because Pages
defaults to Jekyll processing. The site is served from the repo's
GitHub Pages configuration (Settings → Pages → Branch: `website`).
