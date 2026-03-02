# wheelerdealer

TypeScript scraper for Bulgarian car listing sites (mobile.bg, cars.bg) plus a Chrome extension that surfaces market analytics on the same sites.

## Repo layout

```
.
├── src/              # CLI scraper (Node, tsx/tsc)
│   ├── cli.ts        # entry point — JSON to stdout, progress to stderr
│   ├── crawlers/     # per-site crawl loop (mobile.bg, cars.bg)
│   ├── parsers/      # per-site HTML parsing (cheerio)
│   ├── http.ts       # rate-limited fetch with retries + charset detection
│   └── types.ts      # shared interfaces
├── extension/        # Plasmo-based Chrome MV3 extension
│   ├── src/contents/ # content scripts injected into listing pages
│   ├── src/popup.tsx
│   └── src/background.ts
└── CLAUDE.md
```

Root and `extension/` are independent npm projects with separate `package.json` and `node_modules`.

## Prerequisites

- Node.js 20+
- npm
- Chrome / Chromium (only for the extension)

## Scraper (root)

### Install

```sh
npm install
```

### Run the CLI

Runs directly from source via `tsx` — no build step needed.

```sh
npm run cli -- --help
npm run cli -- --site mobile.bg --make BMW --max-pages 3
npm run cli -- --site cars.bg --make BMW --fuel diesel --year-from 2018
npm run cli -- --site both --make "Mercedes-Benz" --price-to 20000
```

Output: JSON on stdout, progress/errors on stderr. Redirect to capture:

```sh
npm run cli -- --site mobile.bg --make BMW --max-pages 3 > out.json
```

### Build

Emits `dist/` for consumption as a library (see `src/index.ts` for public exports).

```sh
npm run build
```

### Test

```sh
npm test
```

Vitest runs colocated `*.test.ts` files. Tests mock `src/http.ts` and assert against realistic HTML fixtures.

## Extension (`extension/`)

Built with [Plasmo](https://docs.plasmo.com/). The extension requests host permissions for `www.mobile.bg` and `www.cars.bg` and injects content scripts into listing pages.

### Install

```sh
cd extension
npm install
```

### Dev (hot-reload)

```sh
npm run dev
```

Outputs an unpacked dev build to `extension/build/chrome-mv3-dev/`. Load it in Chrome:

1. Open `chrome://extensions`
2. Toggle **Developer mode**
3. Click **Load unpacked** and point at `extension/build/chrome-mv3-dev/`

Plasmo watches sources and rebuilds; reload the extension in `chrome://extensions` (or use Plasmo's auto-reload) after changes.

### Production build

```sh
npm run build
```

Output lands in `extension/build/chrome-mv3-prod/` — load the same way, or zip it for distribution.

## Conventions

- ES modules (`"type": "module"`, Node16 resolution) — imports must include the `.js` extension even in `.ts` source.
- TypeScript `strict` is on in both projects.
- Prices convert between EUR/BGN with the hardcoded rate `1.95583`.
- Each crawler implements the `Crawler` interface from `src/types.ts`, exposing both streaming (`crawl()` async generator) and batch (`crawlAll()`) methods.

## Site-specific notes

- **mobile.bg** — path-based filters, slug brand/model, client-side model filtering via regex. Supports passing a custom search URL with `--url`.
- **cars.bg** — query-param filters, filter IDs discovered dynamically from the search page. Site caps results at 50 pages / 1000 listings.
