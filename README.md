# Джамбаз

A Chrome extension that shows the real market price of the car you're
looking at, with a recommended asking price for your own — directly in
the browser. Works on **mobile.bg** and **cars.bg**.

- **Landing page:** <https://dobrinov.github.io/dzhambaz/>
- **Extension:** `extension/` (Plasmo + React)
- **Marketing site:** `website` branch (GitHub Pages)

## Repo layout

```
extension/       Chrome extension (MV3, built with Plasmo)
  src/
    background.ts              service worker (HTTP fetches, charset handling)
    contents/
      market-panel.tsx         right-side panel on search-results pages
      listing-badge.tsx        per-listing verdict badge
    popup.tsx                  toolbar popup
    parsers/                   per-site listing parsers
    shared/                    cross-site URL building, stats, estimate, i18n
```

The marketing site (index, privacy, terms, support — BG + EN) lives on
the `website` branch and is deployed via GitHub Pages.

## Working on the extension

```bash
cd extension
npm install
npm run dev           # Plasmo dev build, hot-reload
npm run build         # production build → build/chrome-mv3-prod/
npm run build -- --zip
```

Load the dev build via `chrome://extensions` → Developer mode → Load
unpacked → `extension/build/chrome-mv3-dev`. Navigate to a mobile.bg or
cars.bg search page and the panel appears in the top-right corner.

## Working on the marketing site

```bash
git checkout website
# edit index.html / en/index.html / styles.css
git commit -am "..." && git push
# GitHub Pages auto-deploys (usually within 1 minute)
```
