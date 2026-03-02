import * as cheerio from 'cheerio';
import type { CarListing } from '../types.js';

const EUR_TO_BGN = 1.95583;

function parsePrice(text: string): { eur: number | null; bgn: number | null } {
  // EUR format: "19 999 €" or "19 999 EUR"
  // BGN format: "39 114.64 лв." or "39 114 лв"
  // Combined: "19 999 €\n39 114.64 лв."
  const eurMatch = text.match(/([\d\s]+)\s*(?:€|EUR)/i);
  const bgnMatch = text.match(/([\d\s.,]+)\s*лв/i);

  let eur: number | null = null;
  let bgn: number | null = null;

  if (eurMatch) {
    eur = parseInt(eurMatch[1].replace(/\s/g, '')) || null;
  }
  if (bgnMatch) {
    bgn = parseFloat(bgnMatch[1].replace(/\s/g, '')) || null;
  }

  if (eur && !bgn) bgn = Math.round(eur * EUR_TO_BGN * 100) / 100;
  if (bgn && !eur) eur = Math.round((bgn / EUR_TO_BGN) * 100) / 100;

  return { eur, bgn };
}

function parseYear(text: string): number | null {
  const match = text.match(/((?:19|20)\d{2})\s*г?\./);
  if (match) return parseInt(match[1]);
  const match2 = text.match(/((?:19|20)\d{2})/);
  return match2 ? parseInt(match2[1]) : null;
}

function parseMileage(text: string): number | null {
  const match = text.match(/([\d\s]+)\s*км/);
  return match ? parseInt(match[1].replace(/\s/g, '')) || null : null;
}

function parsePower(text: string): number | null {
  const match = text.match(/(\d+)\s*к\.?\s*с/);
  return match ? parseInt(match[1]) : null;
}

function parseEngine(text: string): number | null {
  const match = text.match(/(\d+)\s*куб\.?\s*см/);
  return match ? parseInt(match[1]) : null;
}

function parseFuel(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('дизел')) return 'diesel';
  if (lower.includes('бензин') && lower.includes('газ')) return 'gas';
  if (lower.includes('бензин')) return 'petrol';
  if (lower.includes('газ')) return 'gas';
  if (lower.includes('хибрид') || lower.includes('plug-in')) return 'hybrid';
  if (lower.includes('електр')) return 'electric';
  return null;
}

function parseTransmission(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('автоматик') || lower.includes('автоматична')) return 'automatic';
  if (lower.includes('ръчна') || lower.includes('механична')) return 'manual';
  return null;
}

function extractIdFromUrl(url: string): string {
  const match = url.match(/obiava-(\d+)/);
  return match ? match[1] : url.replace(/\D/g, '').slice(0, 15);
}

export function parseListings(html: string): CarListing[] {
  const $ = cheerio.load(html);
  const listings: CarListing[] = [];

  // Real listings have id="ida..." - skip ads (e.g. div.item.fakti)
  $('div.item[id^="ida"]').each((_i, el) => {
    try {
      const $item = $(el);

      // Title link: a.title.saveSlink
      const $titleLink = $item.find('a.title').first();
      if (!$titleLink.length) return;

      const title = $titleLink.text().trim();
      if (!title) return;

      let href = $titleLink.attr('href') ?? '';
      if (href.startsWith('//')) href = `https:${href}`;
      else if (href.startsWith('/')) href = `https://www.mobile.bg${href}`;

      const id = extractIdFromUrl(href);

      // Price from div.price
      const priceText = $item.find('div.price').first().text();
      const { eur, bgn } = parsePrice(priceText);

      // Params: div.params contains spans with individual specs
      // e.g., <span>Автоматик 2014 г.</span> <span> 260 000 км</span> <span>Дизел</span> etc.
      let year: number | null = null;
      let mileageKm: number | null = null;
      let fuelType: string | null = null;
      let transmission: string | null = null;
      let powerHp: number | null = null;
      let engineCc: number | null = null;

      $item.find('div.params span').each((_j, span) => {
        const text = $(span).text().trim();
        if (!text) return;

        // Year: "2014 г." or "Автоматик 2014 г."
        if (!year) {
          const y = parseYear(text);
          if (y) year = y;
        }

        // Mileage: "260 000 км"
        if (!mileageKm && text.includes('км')) {
          mileageKm = parseMileage(text);
        }

        // Fuel type
        if (!fuelType) {
          const f = parseFuel(text);
          if (f) fuelType = f;
        }

        // Transmission: "Автоматик" or "Ръчна"
        if (!transmission) {
          const t = parseTransmission(text);
          if (t) transmission = t;
        }

        // Power: "313 к.с."
        if (!powerHp && text.includes('к.с')) {
          powerHp = parsePower(text);
        }

        // Engine: "3000 куб.см"
        if (!engineCc && text.includes('куб')) {
          engineCc = parseEngine(text);
        }
      });

      // Location from div.location
      const location = $item.find('div.location').first().text().trim() || null;

      // Image: img.pic in div.photo
      let imageUrl: string | null = null;
      const $img = $item.find('img.pic').first();
      if ($img.length) {
        imageUrl = $img.attr('src') ?? null;
        if (imageUrl && imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`;
      }

      listings.push({
        source: 'mobile.bg',
        id,
        url: href,
        title,
        priceEur: eur,
        priceBgn: bgn,
        year,
        mileageKm,
        fuelType,
        transmission,
        powerHp,
        engineCc,
        location,
        imageUrl,
      });
    } catch {
      // Skip malformed items
    }
  });

  return listings;
}

export function parseDetailPage(html: string, listing: CarListing): CarListing {
  const $ = cheerio.load(html);

  // Description from div.info
  const description = $('div.info').first().text().trim();
  if (description) listing.description = description;

  // Features - extract from the description after "Допълнителна информация"
  // or from div.info content after <br> tag
  const features: string[] = [];
  const infoText = $('div.info').first().text();
  const featureMatch = infoText.match(/(?:допълнително|информация)\s*[-–]\s*(.*)/i);
  if (featureMatch) {
    const feats = featureMatch[1].split(/,\s*/);
    for (const f of feats) {
      const trimmed = f.trim();
      if (trimmed.length > 2 && trimmed.length < 100) features.push(trimmed);
    }
  }
  if (features.length > 0) listing.features = features;

  // Seller info
  const sellerName = $('div.seller div.name').first().text().trim().replace(/^\s*Дилър:\s*|^\s*Частно лице\s*/i, '').trim();
  if (sellerName) listing.sellerName = sellerName;

  const phoneEl = $('a[href^="tel:"]').first();
  if (phoneEl.length) {
    listing.sellerPhone = phoneEl.attr('href')?.replace('tel:', '') ?? phoneEl.text().trim();
  }

  // Fill in missing specs from detail page body
  const bodyText = $('body').text();
  if (!listing.powerHp) listing.powerHp = parsePower(bodyText);
  if (!listing.engineCc) listing.engineCc = parseEngine(bodyText);
  if (!listing.transmission) listing.transmission = parseTransmission(bodyText);
  if (!listing.fuelType) listing.fuelType = parseFuel(bodyText);

  return listing;
}

export function parseTotalPages(html: string): number {
  const $ = cheerio.load(html);
  let maxPage = 1;

  // mobile.bg pagination: links with /p-{num} pattern
  $('a[href*="/p-"]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/\/p-(\d+)/);
    if (match) {
      const page = parseInt(match[1]);
      if (page > maxPage) maxPage = page;
    }
  });

  // Also look at the <link rel="next"> to confirm pagination exists
  if (maxPage === 1) {
    const nextLink = $('link[rel="next"]').attr('href') ?? '';
    if (nextLink.includes('/p-')) {
      // There's at least a page 2
      maxPage = 2;
    }
  }

  return maxPage;
}
