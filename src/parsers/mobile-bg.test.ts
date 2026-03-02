import { describe, it, expect } from 'vitest';
import { parseListings, parseTotalPages } from './mobile-bg.js';

describe('mobile-bg parser', () => {
  describe('parseListings', () => {
    it('should parse a listing with all fields', () => {
      const html = `<html><body>
        <div class="item" id="ida12345">
          <a class="title" href="//www.mobile.bg/obiava-12345">BMW 320d xDrive</a>
          <div class="price">15 000 €</div>
          <div class="params">
            <span>Автоматик 2019 г.</span>
            <span>120 000 км</span>
            <span>Дизел</span>
            <span>190 к.с.</span>
            <span>2000 куб.см</span>
          </div>
          <div class="location">София</div>
          <div class="photo"><img class="pic" src="//img.mobile.bg/test.jpg"></div>
        </div>
      </body></html>`;

      const listings = parseListings(html);
      expect(listings).toHaveLength(1);

      const listing = listings[0];
      expect(listing.source).toBe('mobile.bg');
      expect(listing.id).toBe('12345');
      expect(listing.title).toBe('BMW 320d xDrive');
      expect(listing.priceEur).toBe(15000);
      expect(listing.year).toBe(2019);
      expect(listing.mileageKm).toBe(120000);
      expect(listing.fuelType).toBe('diesel');
      expect(listing.transmission).toBe('automatic');
      expect(listing.powerHp).toBe(190);
      expect(listing.engineCc).toBe(2000);
      expect(listing.location).toBe('София');
      expect(listing.imageUrl).toBe('https://img.mobile.bg/test.jpg');
    });

    it('should skip ad items (without id="ida..." prefix)', () => {
      const html = `<html><body>
        <div class="item fakti" id="ad-banner"><a class="title" href="/ad">Ad</a></div>
        <div class="item" id="ida999">
          <a class="title" href="/obiava-999">Real Car</a>
          <div class="price">10 000 €</div>
          <div class="params"><span>2020 г.</span></div>
        </div>
      </body></html>`;

      const listings = parseListings(html);
      expect(listings).toHaveLength(1);
      expect(listings[0].title).toBe('Real Car');
    });

    it('should parse petrol fuel type', () => {
      const html = `<html><body>
        <div class="item" id="ida1">
          <a class="title" href="/obiava-1">VW Golf</a>
          <div class="price">8 000 €</div>
          <div class="params"><span>Бензин</span></div>
        </div>
      </body></html>`;

      const listings = parseListings(html);
      expect(listings[0].fuelType).toBe('petrol');
    });

    it('should parse gas+petrol as gas', () => {
      const html = `<html><body>
        <div class="item" id="ida1">
          <a class="title" href="/obiava-1">VW Golf</a>
          <div class="price">6 000 €</div>
          <div class="params"><span>Бензин/Газ</span></div>
        </div>
      </body></html>`;

      const listings = parseListings(html);
      expect(listings[0].fuelType).toBe('gas');
    });

    it('should return empty array for HTML with no listings', () => {
      const html = '<html><body><div>Няма намерени резултати</div></body></html>';
      expect(parseListings(html)).toEqual([]);
    });

    it('should parse BGN price and convert to EUR', () => {
      const html = `<html><body>
        <div class="item" id="ida1">
          <a class="title" href="/obiava-1">Test Car</a>
          <div class="price">19 558 лв.</div>
          <div class="params"><span>2020 г.</span></div>
        </div>
      </body></html>`;

      const listings = parseListings(html);
      expect(listings[0].priceBgn).toBe(19558);
      expect(listings[0].priceEur).toBeGreaterThan(9000);
    });
  });

  describe('parseTotalPages', () => {
    it('should extract max page from pagination links', () => {
      const html = `<html><body>
        <a href="/search/bmw/p-2">2</a>
        <a href="/search/bmw/p-3">3</a>
        <a href="/search/bmw/p-10">10</a>
      </body></html>`;
      expect(parseTotalPages(html)).toBe(10);
    });

    it('should detect page 2 from link rel=next', () => {
      const html = `<html><head><link rel="next" href="/search/bmw/p-2"></head><body></body></html>`;
      expect(parseTotalPages(html)).toBe(2);
    });

    it('should return 1 when no pagination found', () => {
      const html = '<html><body></body></html>';
      expect(parseTotalPages(html)).toBe(1);
    });
  });
});
