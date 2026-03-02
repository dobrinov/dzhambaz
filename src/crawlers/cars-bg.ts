import type { SearchFilters, CrawlOptions, CarListing, CrawlResult, Crawler } from '../types.js';
import { HttpClient } from '../http.js';
import { parseListings, parseDetailPage, parseTotalPages, parseFilterOptions, type FilterMaps } from '../parsers/cars-bg.js';

const BASE_URL = 'https://www.cars.bg';
const SEARCH_URL = `${BASE_URL}/carslist.php`;
const MAX_PAGES = 50; // cars.bg limit: 1000 results / 20 per page
const RESULTS_PER_PAGE = 20;

const FUEL_MAP: Record<string, string[]> = {
  petrol: ['бензин', 'benzin', 'petrol'],
  diesel: ['дизел', 'diesel'],
  gas: ['газ', 'gas', 'lpg'],
  hybrid: ['хибрид', 'hybrid'],
  electric: ['електр', 'electric'],
};

const GEAR_MAP: Record<string, string[]> = {
  manual: ['ръчна', 'ръчни', 'manual'],
  automatic: ['автоматик', 'автоматична', 'automatic'],
};

const BODY_TYPE_CATEGORY_ID: Record<string, number> = {
  sedan: 1,
  hatchback: 2,
  estate: 4,
  coupe: 5,
  cabrio: 6,
  suv: 7,
  pickup: 8,
  van: 9,
};

function findFilterId(filterMaps: FilterMaps, type: 'fuels' | 'gears', value: string): number | undefined {
  const map = filterMaps[type];
  const keywords = type === 'fuels' ? FUEL_MAP[value] : GEAR_MAP[value];
  if (!keywords) return undefined;

  for (const [label, id] of map) {
    for (const kw of keywords) {
      if (label.includes(kw)) return id;
    }
  }
  return undefined;
}

function findBrandId(filterMaps: FilterMaps, make: string): number | undefined {
  const lower = make.toLowerCase();
  // Exact match first
  if (filterMaps.brands.has(lower)) return filterMaps.brands.get(lower);
  // Partial match
  for (const [label, id] of filterMaps.brands) {
    if (label.includes(lower) || lower.includes(label)) return id;
  }
  return undefined;
}

function matchesModel(title: string, model: string): boolean {
  // Match model as a whole word (case-insensitive) to avoid "A4" matching "A40" etc.
  const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  return re.test(title);
}

function buildSearchUrl(filters: SearchFilters, filterMaps: FilterMaps, page: number): string {
  const params = new URLSearchParams();
  params.set('conditions[0]', '4'); // used cars category
  params.set('conditions[1]', '1');

  if (filters.make) {
    const brandId = findBrandId(filterMaps, filters.make);
    if (brandId !== undefined) params.set('brandId', String(brandId));
  }

  if (filters.fuelType) {
    const fuelId = findFilterId(filterMaps, 'fuels', filters.fuelType);
    if (fuelId !== undefined) params.set('fuelId[]', String(fuelId));
  }

  if (filters.transmission) {
    const gearId = findFilterId(filterMaps, 'gears', filters.transmission);
    if (gearId !== undefined) params.set('gearId', String(gearId));
  }

  if (filters.yearFrom) params.set('yearFrom', String(filters.yearFrom));
  if (filters.yearTo) params.set('yearTo', String(filters.yearTo));
  if (filters.priceFrom) params.set('priceFrom', String(filters.priceFrom));
  if (filters.priceTo) params.set('priceTo', String(filters.priceTo));
  if (filters.powerFrom) params.set('powerFrom', String(filters.powerFrom));
  if (filters.powerTo) params.set('powerTo', String(filters.powerTo));
  if (filters.bodyType) {
    const categoryId = BODY_TYPE_CATEGORY_ID[filters.bodyType];
    if (categoryId !== undefined) params.set('categoryId', String(categoryId));
  }

  if (page > 1) params.set('page', String(page));

  return `${SEARCH_URL}?${params.toString()}`;
}

export class CarsBgCrawler implements Crawler {
  private http: HttpClient;
  private options: CrawlOptions;
  private filterMaps: FilterMaps | null = null;

  constructor(options?: CrawlOptions) {
    this.options = options ?? {};
    this.http = new HttpClient({
      delayMs: options?.delayMs,
      maxRetries: options?.maxRetries,
    });
  }

  private async discoverFilters(): Promise<FilterMaps> {
    if (this.filterMaps) return this.filterMaps;

    process.stderr.write('[cars.bg] Discovering filter options...\n');
    const { html } = await this.http.fetchPage(`${SEARCH_URL}?conditions[0]=4&conditions[1]=1`);
    this.filterMaps = parseFilterOptions(html);
    process.stderr.write(`[cars.bg] Found ${this.filterMaps.brands.size} brands, ${this.filterMaps.fuels.size} fuels, ${this.filterMaps.gears.size} gears\n`);
    return this.filterMaps;
  }

  async *crawl(filters: SearchFilters, options?: CrawlOptions): AsyncGenerator<CarListing[]> {
    const opts = { ...this.options, ...options };
    const filterMaps = await this.discoverFilters();
    const maxPages = Math.min(filters.maxPages ?? MAX_PAGES, MAX_PAGES);

    for (let page = 1; page <= maxPages; page++) {
      const url = buildSearchUrl(filters, filterMaps, page);
      process.stderr.write(`[cars.bg] Fetching page ${page}: ${url}\n`);

      const { html } = await this.http.fetchPage(url);
      let listings = parseListings(html);

      if (filters.model) {
        listings = listings.filter(l => matchesModel(l.title, filters.model!));
      }

      if (listings.length === 0) break;

      if (opts.fetchDetails) {
        for (const listing of listings) {
          try {
            process.stderr.write(`[cars.bg] Fetching details: ${listing.url}\n`);
            const { html: detailHtml } = await this.http.fetchPage(listing.url);
            parseDetailPage(detailHtml, listing);
          } catch (err) {
            process.stderr.write(`[cars.bg] Detail fetch failed for ${listing.id}: ${err}\n`);
          }
        }
      }

      yield listings;

      if (listings.length < RESULTS_PER_PAGE) break;
    }
  }

  async crawlAll(filters: SearchFilters, options?: CrawlOptions): Promise<CrawlResult> {
    const opts = { ...this.options, ...options };
    const filterMaps = await this.discoverFilters();
    const maxPages = Math.min(filters.maxPages ?? MAX_PAGES, MAX_PAGES);

    const result: CrawlResult = {
      source: 'cars.bg',
      filters,
      totalEstimate: null,
      pagesScraped: 0,
      listings: [],
      errors: [],
    };

    // Get first page to estimate total
    const firstUrl = buildSearchUrl(filters, filterMaps, 1);
    process.stderr.write(`[cars.bg] Fetching page 1: ${firstUrl}\n`);

    try {
      const { html } = await this.http.fetchPage(firstUrl);
      const totalPages = parseTotalPages(html);
      result.totalEstimate = totalPages * RESULTS_PER_PAGE;

      let listings = parseListings(html);
      if (filters.model) {
        listings = listings.filter(l => matchesModel(l.title, filters.model!));
      }
      if (opts.fetchDetails) {
        for (const listing of listings) {
          try {
            process.stderr.write(`[cars.bg] Fetching details: ${listing.url}\n`);
            const { html: detailHtml } = await this.http.fetchPage(listing.url);
            parseDetailPage(detailHtml, listing);
          } catch (err) {
            process.stderr.write(`[cars.bg] Detail fetch failed for ${listing.id}: ${err}\n`);
          }
        }
      }
      result.listings.push(...listings);
      result.pagesScraped = 1;

      if (listings.length === 0) {
        result.totalEstimate = 0;
        return result;
      }

      // Remaining pages
      const pagesToFetch = Math.min(totalPages, maxPages);
      for (let page = 2; page <= pagesToFetch; page++) {
        const url = buildSearchUrl(filters, filterMaps, page);
        process.stderr.write(`[cars.bg] Fetching page ${page}/${pagesToFetch}: ${url}\n`);

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
                process.stderr.write(`[cars.bg] Fetching details: ${listing.url}\n`);
                const { html: detailHtml } = await this.http.fetchPage(listing.url);
                parseDetailPage(detailHtml, listing);
              } catch (err) {
                process.stderr.write(`[cars.bg] Detail fetch failed for ${listing.id}: ${err}\n`);
              }
            }
          }

          result.listings.push(...pageListings);
          result.pagesScraped = page;

          if (pageListings.length < RESULTS_PER_PAGE) break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          result.errors.push({ page, url, message });
          process.stderr.write(`[cars.bg] Error on page ${page}: ${message}\n`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ page: 1, url: firstUrl, message });
    }

    return result;
  }
}
