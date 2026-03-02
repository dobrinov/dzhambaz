# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

wheelerdealer is a TypeScript web scraper that crawls car listings from two Bulgarian automotive sites (mobile.bg and cars.bg). It extracts structured car data and outputs JSON to stdout.

## Commands

- **Build:** `npm run build` (runs `tsc`, outputs to `dist/`)
- **Test:** `npm test` (runs `vitest run`)
- **Run CLI:** `npm run cli -- [options]` (runs `tsx src/cli.ts`)
- **Example:** `npm run cli -- --site mobile.bg --make BMW --max-pages 3`

## Architecture

The codebase follows a layered architecture with site-specific implementations:

```
CLI (cli.ts) → Crawlers (crawlers/) → Parsers (parsers/) → HTTP Client (http.ts)
```

- **`src/types.ts`** — Core interfaces: `SearchFilters`, `CrawlOptions`, `CarListing`, `CrawlResult`, `Crawler`
- **`src/http.ts`** — HTTP client with rate limiting (default 1500ms delay), exponential backoff retries, 429 handling, and charset detection for non-UTF-8 content
- **`src/crawlers/`** — Site-specific crawling logic. Each crawler implements the `Crawler` interface with both `crawl()` (async generator for streaming) and `crawlAll()` (batch) methods
- **`src/parsers/`** — Site-specific HTML parsing using cheerio. Each parser handles Bulgarian text, price formats, and unit extraction
- **`src/cli.ts`** — CLI that outputs JSON to stdout and progress/errors to stderr
- **`src/index.ts`** — Public exports (types and crawlers)

### Site-specific differences

- **mobile.bg** — URL path-based filtering, slug-based brand/model, client-side model filtering with regex, supports custom search URLs
- **cars.bg** — Query parameter-based filtering, dynamically discovers filter IDs from search page, fixed 50-page/1000-result limit

### Key conventions

- ES modules (`"type": "module"` in package.json, Node16 module resolution)
- TypeScript strict mode enabled
- EUR/BGN conversion uses hardcoded rate: 1.95583
- Tests use `vi.mock()` to mock the HTTP client and test with realistic HTML markup
- Test files are colocated with source files (`*.test.ts` alongside `*.ts`)
