import { describe, it, expect } from 'vitest';
import { parseListings, parseTotalPages, parseFilterOptions } from './cars-bg.js';

describe('cars-bg parser', () => {
  describe('parseListings', () => {
    it('should parse a listing card with all fields', () => {
      const html = `<html><body>
        <div class="offer-item">
          <a href="/offer/abc123">
            <h5>BMW 320d xDrive</h5>
            <h6 class="price"><!--15000 EUR--></h6>
            <div class="card__secondary black">2019, Дизел, 120000 км.</div>
            <div class="mdc-card__media" style="background-image:url('https://img.cars.bg/test.jpg')"></div>
          </a>
          <div class="card__footer">частно лице, София</div>
        </div>
      </body></html>`;

      const listings = parseListings(html);
      expect(listings).toHaveLength(1);

      const listing = listings[0];
      expect(listing.source).toBe('cars.bg');
      expect(listing.id).toBe('abc123');
      expect(listing.title).toBe('BMW 320d xDrive');
      expect(listing.priceEur).toBe(15000);
      expect(listing.priceBgn).toBeCloseTo(29337.45, 0);
      expect(listing.year).toBe(2019);
      expect(listing.fuelType).toBe('diesel');
      expect(listing.mileageKm).toBe(120000);
      expect(listing.location).toBe('София');
      expect(listing.imageUrl).toBe('https://img.cars.bg/test.jpg');
    });

    it('should parse petrol fuel type', () => {
      const html = `<html><body>
        <div class="offer-item">
          <a href="/offer/def456">
            <h5>BMW 318i</h5>
            <h6 class="price"><!--10000 EUR--></h6>
            <div class="card__secondary black">2018, Бензин, 80000 км.</div>
          </a>
        </div>
      </body></html>`;

      const listings = parseListings(html);
      expect(listings[0].fuelType).toBe('petrol');
    });

    it('should return empty array for HTML with no listings', () => {
      const html = '<html><body><div>No results</div></body></html>';
      expect(parseListings(html)).toEqual([]);
    });

    it('should handle multiple listings', () => {
      const html = `<html><body>
        <div class="offer-item">
          <a href="/offer/aaa111"><h5>Car One</h5><h6 class="price"><!--5000 EUR--></h6>
          <div class="card__secondary black">2015, Дизел</div></a>
        </div>
        <div class="offer-item">
          <a href="/offer/bbb222"><h5>Car Two</h5><h6 class="price"><!--8000 EUR--></h6>
          <div class="card__secondary black">2016, Бензин</div></a>
        </div>
        <div class="offer-item">
          <a href="/offer/ccc333"><h5>Car Three</h5><h6 class="price"><!--12000 EUR--></h6>
          <div class="card__secondary black">2017, Хибрид</div></a>
        </div>
      </body></html>`;

      const listings = parseListings(html);
      expect(listings).toHaveLength(3);
      expect(listings[0].title).toBe('Car One');
      expect(listings[1].title).toBe('Car Two');
      expect(listings[2].title).toBe('Car Three');
    });
  });

  describe('parseTotalPages', () => {
    it('should extract maxPage from JavaScript variable', () => {
      const html = '<html><script>pageDataList.maxPage = 25;</script></html>';
      expect(parseTotalPages(html)).toBe(25);
    });

    it('should fallback to pagination links', () => {
      const html = `<html><body>
        <a href="?page=1">1</a>
        <a href="?page=2">2</a>
        <a href="?page=5">5</a>
      </body></html>`;
      expect(parseTotalPages(html)).toBe(5);
    });

    it('should return 1 when no pagination found', () => {
      const html = '<html><body></body></html>';
      expect(parseTotalPages(html)).toBe(1);
    });
  });

  describe('parseFilterOptions', () => {
    it('should parse brand radio buttons', () => {
      const html = `<html><body>
        <input type="radio" name="brandId" id="brandId_10" value="10">
        <label for="brandId_10">BMW</label>
        <input type="radio" name="brandId" id="brandId_8" value="8">
        <label for="brandId_8">Audi</label>
      </body></html>`;

      const maps = parseFilterOptions(html);
      expect(maps.brands.get('bmw')).toBe(10);
      expect(maps.brands.get('audi')).toBe(8);
    });

    it('should parse fuel checkboxes', () => {
      const html = `<html><body>
        <input type="checkbox" name="fuelId[]" id="fuelId_1" value="1">
        <label for="fuelId_1">Бензин</label>
        <input type="checkbox" name="fuelId[]" id="fuelId_2" value="2">
        <label for="fuelId_2">Дизел</label>
      </body></html>`;

      const maps = parseFilterOptions(html);
      expect(maps.fuels.get('бензин')).toBe(1);
      expect(maps.fuels.get('дизел')).toBe(2);
    });

    it('should parse gear radio buttons', () => {
      const html = `<html><body>
        <input type="radio" name="gearId" id="gearId_1" value="1">
        <label for="gearId_1">Ръчна</label>
        <input type="radio" name="gearId" id="gearId_2" value="2">
        <label for="gearId_2">Автоматик</label>
      </body></html>`;

      const maps = parseFilterOptions(html);
      expect(maps.gears.get('ръчна')).toBe(1);
      expect(maps.gears.get('автоматик')).toBe(2);
    });
  });
});
