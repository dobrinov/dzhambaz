import * as cheerio from 'cheerio';
import type { CarListing } from '../types.js';

const EUR_TO_BGN = 1.95583;

function parsePriceFromComment(html: string): { eur: number | null; bgn: number | null } {
  // HTML comment format: <!--4,000 EUR--> or <!--14,699 EUR-->
  const commentMatch = html.match(/<!--\s*([\d,.\s]+)\s*EUR\s*-->/);
  let eur: number | null = null;
  let bgn: number | null = null;

  if (commentMatch) {
    eur = parseFloat(commentMatch[1].replace(/[,\s]/g, '')) || null;
  }

  if (eur) {
    bgn = Math.round(eur * EUR_TO_BGN * 100) / 100;
  }

  return { eur, bgn };
}

function parsePriceFromText(text: string): { eur: number | null; bgn: number | null } {
  // Fallback: parse from visible text like "4,000 EUR 7,823.32 BGN"
  const eurMatch = text.match(/([\d,.\s]+)\s*EUR/i);
  const bgnMatch = text.match(/([\d,.\s]+)\s*(?:BGN|лв)/i);

  let eur: number | null = null;
  let bgn: number | null = null;

  if (eurMatch) eur = parseFloat(eurMatch[1].replace(/[,\s]/g, '')) || null;
  if (bgnMatch) bgn = parseFloat(bgnMatch[1].replace(/[,\s]/g, '')) || null;

  if (eur && !bgn) bgn = Math.round(eur * EUR_TO_BGN * 100) / 100;
  if (bgn && !eur) eur = Math.round((bgn / EUR_TO_BGN) * 100) / 100;

  return { eur, bgn };
}

function parseFuel(text: string): string | null {
  const lower = text.toLowerCase().trim();
  if (lower.includes('дизел') || lower.includes('diesel')) return 'diesel';
  if (lower.includes('бензин') || lower.includes('petrol') || lower.includes('benzin')) return 'petrol';
  if (lower.includes('газ') || lower.includes('gas') || lower.includes('lpg')) return 'gas';
  if (lower.includes('хибрид') || lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('електр') || lower.includes('electric')) return 'electric';
  return text.trim() || null;
}

export function parseListings(html: string): CarListing[] {
  const $ = cheerio.load(html);
  const listings: CarListing[] = [];

  // Each listing card is a div.offer-item inside a grid cell
  $('div.offer-item').each((_i, el) => {
    try {
      const $card = $(el);

      // Find the main link
      const $link = $card.find('a[href*="/offer/"]').first();
      if (!$link.length) return;

      const href = $link.attr('href') ?? '';
      const idMatch = href.match(/\/offer\/([a-f0-9]+)/i);
      if (!idMatch) return;

      const id = idMatch[1];
      const url = href.startsWith('http') ? href : `https://www.cars.bg${href}`;

      // Title from h5
      const title = $link.find('h5').first().text().trim();
      if (!title) return;

      // Price: first try HTML comment in h6.price, then fallback to text
      const $priceEl = $link.find('h6.price').first();
      const priceHtml = $priceEl.html() ?? '';
      let { eur, bgn } = parsePriceFromComment(priceHtml);
      if (!eur) {
        ({ eur, bgn } = parsePriceFromText($priceEl.text()));
      }

      // Specs from div.card__secondary with class "black": "2009, Дизел, 290000 км."
      const specsText = $link.find('div.card__secondary.black').first().text().trim();
      const specParts = specsText.split(/,\s*/);

      let year: number | null = null;
      let fuelType: string | null = null;
      let mileageKm: number | null = null;

      for (const part of specParts) {
        const trimmed = part.trim();
        const yearMatch = trimmed.match(/^(19|20)\d{2}$/);
        if (yearMatch) {
          year = parseInt(yearMatch[0]);
          continue;
        }
        const kmMatch = trimmed.match(/([\d\s]+)\s*км/);
        if (kmMatch) {
          mileageKm = parseInt(kmMatch[1].replace(/\s/g, '')) || null;
          continue;
        }
        if (!fuelType && trimmed.length > 1) {
          fuelType = parseFuel(trimmed);
        }
      }

      // Location from card__footer (outside the link, in the parent card)
      const footerText = $card.find('div.card__footer').first().text().trim();
      let location: string | null = null;
      if (footerText) {
        // Format: "частно лице, Лясковец" or "дилър, София"
        const parts = footerText.split(/,\s*/);
        if (parts.length >= 2) {
          location = parts.slice(1).join(', ').trim();
        } else {
          location = footerText;
        }
      }

      // Image from background-image style on .mdc-card__media
      let imageUrl: string | null = null;
      const $media = $link.find('.mdc-card__media').first();
      if ($media.length) {
        const style = $media.attr('style') ?? '';
        const urlMatch = style.match(/url\(&quot;([^&]+)&quot;\)|url\(["']?([^"')]+)["']?\)/);
        if (urlMatch) {
          imageUrl = urlMatch[1] || urlMatch[2];
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https:${imageUrl}`;
          }
        }
      }

      listings.push({
        source: 'cars.bg',
        id,
        url,
        title,
        priceEur: eur,
        priceBgn: bgn,
        year,
        mileageKm,
        fuelType,
        transmission: null,
        powerHp: null,
        engineCc: null,
        location,
        imageUrl,
      });
    } catch {
      // Skip malformed cards
    }
  });

  return listings;
}

export function parseDetailPage(html: string, listing: CarListing): CarListing {
  const $ = cheerio.load(html);

  // Description
  const description = $('div.card__secondary').first().text().trim();
  if (description && description.length > 20) listing.description = description;

  // Features from chips/lists
  const features: string[] = [];
  $('span.mdc-chip__text, li').each((_i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2 && text.length < 100) features.push(text);
  });
  if (features.length > 0) listing.features = features;

  // Seller info
  const sellerText = $('div.card__footer').first().text().trim();
  if (sellerText) {
    const parts = sellerText.split(/,\s*/);
    if (parts.length >= 1) listing.sellerName = parts[0].trim();
  }

  const phoneEl = $('a[href^="tel:"]').first();
  if (phoneEl.length) {
    listing.sellerPhone = phoneEl.attr('href')?.replace('tel:', '') ?? phoneEl.text().trim();
  }

  // Additional specs from the full page text
  const bodyText = $('body').text();

  if (!listing.powerHp) {
    const powerMatch = bodyText.match(/(\d+)\s*(?:к\.с\.|к\.с|hp)/i);
    if (powerMatch) listing.powerHp = parseInt(powerMatch[1]);
  }

  if (!listing.engineCc) {
    const ccMatch = bodyText.match(/(\d+)\s*(?:куб\.?\s*см|cc|cm3)/i);
    if (ccMatch) listing.engineCc = parseInt(ccMatch[1]);
  }

  if (!listing.transmission) {
    if (bodyText.includes('Автоматик') || bodyText.includes('Автоматична')) {
      listing.transmission = 'automatic';
    } else if (bodyText.includes('Ръчна') || bodyText.includes('Ръчни')) {
      listing.transmission = 'manual';
    }
  }

  return listing;
}

export function parseTotalPages(html: string): number {
  // Try to extract from JavaScript: pageDataList.maxPage = N
  const scriptMatch = html.match(/pageDataList\.maxPage\s*=\s*(\d+)/);
  if (scriptMatch) {
    return parseInt(scriptMatch[1]);
  }

  const $ = cheerio.load(html);
  let maxPage = 1;

  // Fallback: look for pagination links with page= parameter
  $('a[href*="page="]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/page=(\d+)/);
    if (match) {
      const page = parseInt(match[1]);
      if (page > maxPage) maxPage = page;
    }
  });

  return maxPage;
}

export interface FilterMaps {
  brands: Map<string, number>;
  fuels: Map<string, number>;
  gears: Map<string, number>;
}

export function parseFilterOptions(html: string): FilterMaps {
  const $ = cheerio.load(html);

  const brands = new Map<string, number>();
  const fuels = new Map<string, number>();
  const gears = new Map<string, number>();

  // There are duplicate <label> elements per input; use .first() and clean whitespace
  function getLabel($: cheerio.CheerioAPI, id: string): string {
    return $(`label[for="${id}"]`).first().text().trim().toLowerCase();
  }

  // Brand radio buttons: <input type="radio" name="brandId" id="brandId_10" value="10">
  $('input[name="brandId"]').each((_i, el) => {
    const val = parseInt($(el).attr('value') ?? '');
    const id = $(el).attr('id') ?? '';
    const label = getLabel($, id);
    if (label && !isNaN(val) && val > 0) {
      brands.set(label, val);
    }
  });

  // Fuel checkboxes: <input type="checkbox" name="fuelId[]" id="fuelId_1" value="1">
  $('input[name="fuelId[]"]').each((_i, el) => {
    const val = parseInt($(el).attr('value') ?? '');
    const id = $(el).attr('id') ?? '';
    const label = getLabel($, id);
    if (label && !isNaN(val) && val > 0) {
      fuels.set(label, val);
    }
  });

  // Gear radio buttons: <input type="radio" name="gearId" id="gearId_1" value="1">
  $('input[name="gearId"]').each((_i, el) => {
    const val = parseInt($(el).attr('value') ?? '');
    const id = $(el).attr('id') ?? '';
    const label = getLabel($, id);
    if (label && !isNaN(val) && val > 0) {
      gears.set(label, val);
    }
  });

  return { brands, fuels, gears };
}
