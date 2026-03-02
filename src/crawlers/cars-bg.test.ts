import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SearchFilters } from '../types.js';

let capturedUrls: string[] = [];
let mockHtml = '';
let mockFilterHtml = '';

function makeFilterPageHtml(brands: [string, number][], fuels: [string, number][], gears: [string, number][]): string {
  const brandInputs = brands.map(([label, id]) =>
    `<input type="radio" name="brandId" id="brandId_${id}" value="${id}"><label for="brandId_${id}">${label}</label>`
  ).join('');
  const fuelInputs = fuels.map(([label, id]) =>
    `<input type="checkbox" name="fuelId[]" id="fuelId_${id}" value="${id}"><label for="fuelId_${id}">${label}</label>`
  ).join('');
  const gearInputs = gears.map(([label, id]) =>
    `<input type="radio" name="gearId" id="gearId_${id}" value="${id}"><label for="gearId_${id}">${label}</label>`
  ).join('');
  return `<html><body>${brandInputs}${fuelInputs}${gearInputs}</body></html>`;
}

vi.mock('../http.js', () => {
  return {
    HttpClient: class {
      private isFirstRequest = true;
      async fetchPage(url: string) {
        capturedUrls.push(url);
        // First request is always filter discovery
        if (this.isFirstRequest) {
          this.isFirstRequest = false;
          return { html: mockFilterHtml, url, status: 200 };
        }
        return { html: mockHtml, url, status: 200 };
      }
    },
  };
});

const { CarsBgCrawler } = await import('./cars-bg.js');

describe('CarsBgCrawler', () => {
  beforeEach(() => {
    capturedUrls = [];
    mockHtml = '<html><body></body></html>';
    mockFilterHtml = makeFilterPageHtml(
      [['audi', 8], ['bmw', 10], ['mercedes-benz', 48]],
      [['бензин', 1], ['дизел', 2], ['газ/бензин', 3], ['хибрид', 4], ['електрически', 5]],
      [['ръчна', 1], ['автоматик', 2]],
    );
  });

  describe('URL building', () => {
    it('should include powerFrom and powerTo params', async () => {
      const crawler = new CarsBgCrawler();
      const filters: SearchFilters = { make: 'BMW', powerFrom: 200, powerTo: 400, maxPages: 1 };
      await crawler.crawlAll(filters);

      const searchUrl = capturedUrls.find(u => u.includes('powerFrom'));
      expect(searchUrl).toBeDefined();
      const url = new URL(searchUrl!);
      expect(url.searchParams.get('powerFrom')).toBe('200');
      expect(url.searchParams.get('powerTo')).toBe('400');
    });

    it('should include categoryId for bodyType', async () => {
      const crawler = new CarsBgCrawler();
      const filters: SearchFilters = { make: 'Audi', bodyType: 'estate', maxPages: 1 };
      await crawler.crawlAll(filters);

      const searchUrl = capturedUrls.find(u => u.includes('categoryId'));
      expect(searchUrl).toBeDefined();
      const url = new URL(searchUrl!);
      expect(url.searchParams.get('categoryId')).toBe('4');
    });

    it('should map all body types to correct categoryIds', async () => {
      const expected: Record<string, string> = {
        sedan: '1', hatchback: '2', estate: '4', coupe: '5',
        cabrio: '6', suv: '7', pickup: '8', van: '9',
      };

      for (const [bodyType, expectedId] of Object.entries(expected)) {
        capturedUrls = [];
        const crawler = new CarsBgCrawler();
        const filters: SearchFilters = { bodyType: bodyType as SearchFilters['bodyType'], maxPages: 1 };
        await crawler.crawlAll(filters);

        const searchUrl = capturedUrls.find(u => u.includes('categoryId'));
        expect(searchUrl, `bodyType=${bodyType} should produce a URL with categoryId`).toBeDefined();
        const url = new URL(searchUrl!);
        expect(url.searchParams.get('categoryId')).toBe(expectedId);
      }
    });

    it('should include brandId, fuelId, year, and price params', async () => {
      const crawler = new CarsBgCrawler();
      const filters: SearchFilters = {
        make: 'BMW',
        fuelType: 'diesel',
        yearFrom: 2018,
        yearTo: 2022,
        priceFrom: 5000,
        priceTo: 30000,
        maxPages: 1,
      };
      await crawler.crawlAll(filters);

      const searchUrl = capturedUrls.find(u => u.includes('brandId'));
      expect(searchUrl).toBeDefined();
      const url = new URL(searchUrl!);
      expect(url.searchParams.get('brandId')).toBe('10');
      expect(url.searchParams.get('fuelId[]')).toBe('2');
      expect(url.searchParams.get('yearFrom')).toBe('2018');
      expect(url.searchParams.get('yearTo')).toBe('2022');
      expect(url.searchParams.get('priceFrom')).toBe('5000');
      expect(url.searchParams.get('priceTo')).toBe('30000');
    });

    it('should combine power, bodyType, and other filters', async () => {
      const crawler = new CarsBgCrawler();
      const filters: SearchFilters = {
        make: 'Audi',
        bodyType: 'estate',
        powerFrom: 218,
        fuelType: 'diesel',
        yearFrom: 2017,
        yearTo: 2017,
        maxPages: 1,
      };
      await crawler.crawlAll(filters);

      const searchUrl = capturedUrls.find(u => u.includes('powerFrom'));
      expect(searchUrl).toBeDefined();
      const url = new URL(searchUrl!);
      expect(url.searchParams.get('brandId')).toBe('8');
      expect(url.searchParams.get('categoryId')).toBe('4');
      expect(url.searchParams.get('powerFrom')).toBe('218');
      expect(url.searchParams.get('fuelId[]')).toBe('2');
      expect(url.searchParams.get('yearFrom')).toBe('2017');
    });
  });

  describe('model filtering', () => {
    it('should filter listings by model name', async () => {
      mockHtml = `<html><body>
        <div class="offer-item">
          <a href="/offer/aaa111"><h5>Audi A4 3.0 TDI</h5><h6 class="price"><!--15000 EUR--></h6>
          <div class="card__secondary black">2017, Дизел, 200000 км.</div>
          <div class="mdc-card__media" style="background-image:url('img.jpg')"></div></a>
          <div class="card__footer">частно лице, София</div>
        </div>
        <div class="offer-item">
          <a href="/offer/bbb222"><h5>Audi A6 Avant 3.0 TDI</h5><h6 class="price"><!--18000 EUR--></h6>
          <div class="card__secondary black">2017, Дизел, 160000 км.</div>
          <div class="mdc-card__media" style="background-image:url('img2.jpg')"></div></a>
          <div class="card__footer">дилър, Пловдив</div>
        </div>
      </body></html>`;

      const crawler = new CarsBgCrawler();
      const filters: SearchFilters = { make: 'Audi', model: 'A4', maxPages: 1 };
      const result = await crawler.crawlAll(filters);

      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].title).toContain('A4');
    });

    it('should not match partial model names (A4 vs A40)', async () => {
      mockHtml = `<html><body>
        <div class="offer-item">
          <a href="/offer/ccc333"><h5>Audi A40 Special</h5><h6 class="price"><!--20000 EUR--></h6>
          <div class="card__secondary black">2017, Дизел, 100000 км.</div>
          <div class="mdc-card__media" style="background-image:url('img.jpg')"></div></a>
          <div class="card__footer">частно лице, София</div>
        </div>
      </body></html>`;

      const crawler = new CarsBgCrawler();
      const filters: SearchFilters = { model: 'A4', maxPages: 1 };
      const result = await crawler.crawlAll(filters);

      expect(result.listings).toHaveLength(0);
    });

    it('should return all listings when no model filter is set', async () => {
      mockHtml = `<html><body>
        <div class="offer-item">
          <a href="/offer/aaa111"><h5>Audi A4 3.0 TDI</h5><h6 class="price"><!--15000 EUR--></h6>
          <div class="card__secondary black">2017, Дизел, 200000 км.</div>
          <div class="mdc-card__media" style="background-image:url('img.jpg')"></div></a>
          <div class="card__footer">частно лице, София</div>
        </div>
        <div class="offer-item">
          <a href="/offer/bbb222"><h5>Audi A6 Avant 3.0 TDI</h5><h6 class="price"><!--18000 EUR--></h6>
          <div class="card__secondary black">2017, Дизел, 160000 км.</div>
          <div class="mdc-card__media" style="background-image:url('img2.jpg')"></div></a>
          <div class="card__footer">дилър, Пловдив</div>
        </div>
      </body></html>`;

      const crawler = new CarsBgCrawler();
      const filters: SearchFilters = { make: 'Audi', maxPages: 1 };
      const result = await crawler.crawlAll(filters);

      expect(result.listings).toHaveLength(2);
    });
  });
});
