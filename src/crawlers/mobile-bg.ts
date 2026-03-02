import type { SearchFilters, CrawlOptions, CarListing, CrawlResult, Crawler } from '../types.js';
import { HttpClient } from '../http.js';
import { parseListings, parseDetailPage, parseTotalPages } from '../parsers/mobile-bg.js';

const BASE_URL = 'https://www.mobile.bg';
const SEARCH_BASE = `${BASE_URL}/obiavi/avtomobili-dzhipove`;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

const FUEL_SLUG: Record<string, string> = {
  petrol: 'benzinov',
  diesel: 'dizelov',
  gas: 'gazov',
  hybrid: 'hibriden',
  electric: 'elektricheski',
};

const BODY_TYPE_SLUG: Record<string, string> = {
  sedan: 'sedan',
  hatchback: 'hechbek',
  estate: 'kombi',
  coupe: 'kupe',
  cabrio: 'kabrio',
  suv: 'dzhip',
  pickup: 'pikap',
  van: 'van',
};

function matchesModel(title: string, model: string): boolean {
  const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  return re.test(title);
}

function buildSearchUrl(filters: SearchFilters, page: number): string {
  const segments: string[] = [SEARCH_BASE];

  // Brand
  if (filters.make) {
    segments.push(slugify(filters.make));
  }

  // Body type (path segment)
  if (filters.bodyType) {
    const slug = BODY_TYPE_SLUG[filters.bodyType];
    if (slug) segments.push(slug);
  }

  // Fuel type (path segment)
  if (filters.fuelType) {
    const slug = FUEL_SLUG[filters.fuelType];
    if (slug) segments.push(slug);
  }

  // Year range
  if (filters.yearFrom) segments.push(`ot-${filters.yearFrom}`);
  if (filters.yearTo) segments.push(`do-${filters.yearTo}`);

  // Page
  if (page > 1) segments.push(`p-${page}`);

  let url = segments.join('/');

  // Query parameters
  const params = new URLSearchParams();
  if (filters.priceFrom) params.set('price', String(filters.priceFrom));
  if (filters.priceTo) params.set('price1', String(filters.priceTo));
  if (filters.maxMileage) params.set('km', String(filters.maxMileage));
  if (filters.powerFrom) params.set('engine_power', String(filters.powerFrom));
  if (filters.powerTo) params.set('engine_power1', String(filters.powerTo));

  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;

  return url;
}

export class MobileBgCrawler implements Crawler {
  private http: HttpClient;
  private options: CrawlOptions;
  private customUrl?: string;

  constructor(options?: CrawlOptions & { url?: string }) {
    this.options = options ?? {};
    this.customUrl = options?.url;
    this.http = new HttpClient({
      delayMs: options?.delayMs,
      maxRetries: options?.maxRetries,
    });
  }

  private getPageUrl(filters: SearchFilters, page: number): string {
    if (this.customUrl) {
      if (page === 1) return this.customUrl;
      // Append pagination to custom URL
      const url = new URL(this.customUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Remove existing page segment if any
      const filtered = pathParts.filter(p => !p.startsWith('p-'));
      filtered.push(`p-${page}`);
      url.pathname = '/' + filtered.join('/');
      return url.toString();
    }
    return buildSearchUrl(filters, page);
  }

  async *crawl(filters: SearchFilters, options?: CrawlOptions): AsyncGenerator<CarListing[]> {
    const opts = { ...this.options, ...options };
    const maxPages = filters.maxPages ?? 100;

    for (let page = 1; page <= maxPages; page++) {
      const url = this.getPageUrl(filters, page);
      process.stderr.write(`[mobile.bg] Fetching page ${page}: ${url}\n`);

      const { html } = await this.http.fetchPage(url);
      let listings = parseListings(html);

      if (filters.model) {
        listings = listings.filter(l => matchesModel(l.title, filters.model!));
      }

      if (listings.length === 0) break;

      if (opts.fetchDetails) {
        for (const listing of listings) {
          try {
            process.stderr.write(`[mobile.bg] Fetching details: ${listing.url}\n`);
            const { html: detailHtml } = await this.http.fetchPage(listing.url);
            parseDetailPage(detailHtml, listing);
          } catch (err) {
            process.stderr.write(`[mobile.bg] Detail fetch failed for ${listing.id}: ${err}\n`);
          }
        }
      }

      yield listings;

      // Check if there are more pages
      if (page === 1) {
        const totalPages = parseTotalPages(html);
        if (totalPages <= 1) break;
      }
    }
  }

  async crawlAll(filters: SearchFilters, options?: CrawlOptions): Promise<CrawlResult> {
    const opts = { ...this.options, ...options };
    const maxPages = filters.maxPages ?? 100;

    const result: CrawlResult = {
      source: 'mobile.bg',
      filters,
      totalEstimate: null,
      pagesScraped: 0,
      listings: [],
      errors: [],
    };

    // First page
    const firstUrl = this.getPageUrl(filters, 1);
    process.stderr.write(`[mobile.bg] Fetching page 1: ${firstUrl}\n`);

    try {
      const { html } = await this.http.fetchPage(firstUrl);
      const totalPages = parseTotalPages(html);
      let listings = parseListings(html);

      result.totalEstimate = totalPages * listings.length; // Rough estimate
      if (filters.model) {
        listings = listings.filter(l => matchesModel(l.title, filters.model!));
      }
      result.pagesScraped = 1;

      if (opts.fetchDetails) {
        for (const listing of listings) {
          try {
            process.stderr.write(`[mobile.bg] Fetching details: ${listing.url}\n`);
            const { html: detailHtml } = await this.http.fetchPage(listing.url);
            parseDetailPage(detailHtml, listing);
          } catch (err) {
            process.stderr.write(`[mobile.bg] Detail fetch failed for ${listing.id}: ${err}\n`);
          }
        }
      }

      result.listings.push(...listings);

      if (listings.length === 0 || totalPages <= 1) {
        result.totalEstimate = result.listings.length;
        return result;
      }

      // Remaining pages
      const pagesToFetch = Math.min(totalPages, maxPages);
      for (let page = 2; page <= pagesToFetch; page++) {
        const url = this.getPageUrl(filters, page);
        process.stderr.write(`[mobile.bg] Fetching page ${page}/${pagesToFetch}: ${url}\n`);

        try {
          const { html: pageHtml } = await this.http.fetchPage(url);
          let pageListings = parseListings(pageHtml);
          if (filters.model) {
            pageListings = pageListings.filter(l => matchesModel(l.title, filters.model!));
          }

          if (pageListings.length === 0) break;

          if (opts.fetchDetails) {
            for (const listing of pageListings) {
              try {
                process.stderr.write(`[mobile.bg] Fetching details: ${listing.url}\n`);
                const { html: detailHtml } = await this.http.fetchPage(listing.url);
                parseDetailPage(detailHtml, listing);
              } catch (err) {
                process.stderr.write(`[mobile.bg] Detail fetch failed for ${listing.id}: ${err}\n`);
              }
            }
          }

          result.listings.push(...pageListings);
          result.pagesScraped = page;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          result.errors.push({ page, url, message });
          process.stderr.write(`[mobile.bg] Error on page ${page}: ${message}\n`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ page: 1, url: firstUrl, message });
    }

    return result;
  }
}
