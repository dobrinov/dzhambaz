import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SearchFilters } from '../types.js';

let capturedUrls: string[] = [];
let defaultMockHtml = '<html><body></body></html>';

vi.mock('../http.js', () => {
  return {
    HttpClient: class {
      async fetchPage(url: string) {
        capturedUrls.push(url);
        return { html: defaultMockHtml, url, status: 200 };
      }
    },
  };
});

const { MobileBgCrawler } = await import('./mobile-bg.js');

describe('MobileBgCrawler', () => {
  beforeEach(() => {
    capturedUrls = [];
    defaultMockHtml = '<html><body></body></html>';
  });

  describe('URL building', () => {
    it('should include body type as path segment', async () => {
      const crawler = new MobileBgCrawler();
      const filters: SearchFilters = { make: 'Audi', bodyType: 'estate', maxPages: 1 };
      await crawler.crawlAll(filters);

      const url = capturedUrls.find(u => u.includes('obiavi'));
      expect(url).toContain('/audi/kombi');
    });

    it('should include fuel type as path segment', async () => {
      const crawler = new MobileBgCrawler();
      const filters: SearchFilters = { make: 'BMW', fuelType: 'diesel', maxPages: 1 };
      await crawler.crawlAll(filters);

      const url = capturedUrls.find(u => u.includes('obiavi'));
      expect(url).toContain('/bmw/dizelov');
    });

    it('should include power as query params', async () => {
      const crawler = new MobileBgCrawler();
      const filters: SearchFilters = { make: 'BMW', powerFrom: 200, powerTo: 400, maxPages: 1 };
      await crawler.crawlAll(filters);

      const url = capturedUrls.find(u => u.includes('obiavi'));
      expect(url).toBeDefined();
      const parsed = new URL(url!);
      expect(parsed.searchParams.get('engine_power')).toBe('200');
      expect(parsed.searchParams.get('engine_power1')).toBe('400');
    });

    it('should combine all filters in the correct URL structure', async () => {
      const crawler = new MobileBgCrawler();
      const filters: SearchFilters = {
        make: 'Audi',
        bodyType: 'estate',
        fuelType: 'diesel',
        yearFrom: 2017,
        yearTo: 2017,
        powerFrom: 218,
        maxPages: 1,
      };
      await crawler.crawlAll(filters);

      const url = capturedUrls.find(u => u.includes('obiavi'));
      expect(url).toBeDefined();
      // Path segments: /audi/kombi/dizelov/ot-2017/do-2017
      expect(url).toContain('/audi/kombi/dizelov/ot-2017/do-2017');
      // Query param for power
      const parsed = new URL(url!);
      expect(parsed.searchParams.get('engine_power')).toBe('218');
    });

    it('should map all body types to correct slugs', async () => {
      const expected: Record<string, string> = {
        sedan: 'sedan', hatchback: 'hechbek', estate: 'kombi', coupe: 'kupe',
        cabrio: 'kabrio', suv: 'dzhip', pickup: 'pikap', van: 'van',
      };

      for (const [bodyType, slug] of Object.entries(expected)) {
        capturedUrls = [];
        const crawler = new MobileBgCrawler();
        const filters: SearchFilters = { bodyType: bodyType as SearchFilters['bodyType'], maxPages: 1 };
        await crawler.crawlAll(filters);

        const url = capturedUrls.find(u => u.includes('obiavi'));
        expect(url, `bodyType=${bodyType}`).toContain(`/${slug}`);
      }
    });

    it('should map all fuel types to correct slugs', async () => {
      const expected: Record<string, string> = {
        petrol: 'benzinov', diesel: 'dizelov', gas: 'gazov',
        hybrid: 'hibriden', electric: 'elektricheski',
      };

      for (const [fuel, slug] of Object.entries(expected)) {
        capturedUrls = [];
        const crawler = new MobileBgCrawler();
        const filters: SearchFilters = { fuelType: fuel as SearchFilters['fuelType'], maxPages: 1 };
        await crawler.crawlAll(filters);

        const url = capturedUrls.find(u => u.includes('obiavi'));
        expect(url, `fuelType=${fuel}`).toContain(`/${slug}`);
      }
    });

    it('should include price and mileage as query params', async () => {
      const crawler = new MobileBgCrawler();
      const filters: SearchFilters = { make: 'BMW', priceFrom: 5000, priceTo: 20000, maxMileage: 150000, maxPages: 1 };
      await crawler.crawlAll(filters);

      const url = capturedUrls.find(u => u.includes('obiavi'));
      expect(url).toBeDefined();
      const parsed = new URL(url!);
      expect(parsed.searchParams.get('price')).toBe('5000');
      expect(parsed.searchParams.get('price1')).toBe('20000');
      expect(parsed.searchParams.get('km')).toBe('150000');
    });

    it('should use URL builder when only make/year filters are set (no form POST)', async () => {
      const crawler = new MobileBgCrawler();
      const filters: SearchFilters = { make: 'BMW', yearFrom: 2018, maxPages: 1 };
      await crawler.crawlAll(filters);

      expect(capturedUrls).toHaveLength(1);
      expect(capturedUrls[0]).toContain('obiavi/avtomobili-dzhipove/bmw/ot-2018');
    });
  });

  describe('model filtering', () => {
    it('should filter listings by model name', async () => {
      defaultMockHtml = `<html><body>
        <div class="item" id="ida1"><a class="title" href="/obiava-1001">Audi A4 3.0 TDI</a><div class="price">15 000 €</div><div class="params"><span>2017 г.</span></div></div>
        <div class="item" id="ida2"><a class="title" href="/obiava-1002">Audi A6 Avant 3.0 TDI</a><div class="price">18 000 €</div><div class="params"><span>2017 г.</span></div></div>
      </body></html>`;

      const crawler = new MobileBgCrawler();
      const filters: SearchFilters = { make: 'Audi', model: 'A4', maxPages: 1 };
      const result = await crawler.crawlAll(filters);

      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].title).toContain('A4');
    });

    it('should not match partial model names', async () => {
      defaultMockHtml = `<html><body>
        <div class="item" id="ida1"><a class="title" href="/obiava-1003">Audi A40 Special</a><div class="price">20 000 €</div><div class="params"><span>2017 г.</span></div></div>
      </body></html>`;

      const crawler = new MobileBgCrawler();
      const filters: SearchFilters = { model: 'A4', maxPages: 1 };
      const result = await crawler.crawlAll(filters);

      expect(result.listings).toHaveLength(0);
    });
  });
});
