import { parseArgs } from 'node:util';
import type { SearchFilters, CrawlOptions, CrawlResult } from './types.js';
import { CarsBgCrawler } from './crawlers/cars-bg.js';
import { MobileBgCrawler } from './crawlers/mobile-bg.js';

const { values } = parseArgs({
  options: {
    site: { type: 'string', default: 'both' },
    make: { type: 'string' },
    model: { type: 'string' },
    'year-from': { type: 'string' },
    'year-to': { type: 'string' },
    'price-from': { type: 'string' },
    'price-to': { type: 'string' },
    fuel: { type: 'string' },
    transmission: { type: 'string' },
    'max-mileage': { type: 'string' },
    'power-from': { type: 'string' },
    'power-to': { type: 'string' },
    'body-type': { type: 'string' },
    'max-pages': { type: 'string' },
    delay: { type: 'string' },
    'fetch-details': { type: 'boolean', default: false },
    url: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
});

if (values.help) {
  process.stderr.write(`
wheelerdealer - Car listing crawler for mobile.bg and cars.bg

Usage:
  npx tsx src/cli.ts [options]

Options:
  --site <site>          Site to crawl: mobile.bg, cars.bg, or both (default: both)
  --make <make>          Car make (e.g., BMW, Mercedes-Benz)
  --model <model>        Car model
  --year-from <year>     Minimum year
  --year-to <year>       Maximum year
  --price-from <eur>     Minimum price in EUR
  --price-to <eur>       Maximum price in EUR
  --fuel <type>          Fuel type: petrol, diesel, gas, hybrid, electric
  --transmission <type>  Transmission: manual, automatic
  --max-mileage <km>     Maximum mileage in km
  --power-from <hp>      Minimum horsepower
  --power-to <hp>        Maximum horsepower
  --body-type <type>     Body type: sedan, hatchback, estate, coupe, cabrio, suv, pickup, van
  --max-pages <n>        Max pages to crawl (default: all)
  --delay <ms>           Delay between requests in ms (default: 1500)
  --fetch-details        Fetch detail pages for richer data
  --url <url>            Custom search URL (mobile.bg)
  -h, --help             Show this help

Examples:
  npx tsx src/cli.ts --site mobile.bg --make BMW --max-pages 3
  npx tsx src/cli.ts --site cars.bg --make BMW --fuel diesel --year-from 2018
  npx tsx src/cli.ts --site both --make "Mercedes-Benz" --price-to 20000
  npx tsx src/cli.ts --site mobile.bg --url "https://www.mobile.bg/obiavi/avtomobili-dzhipove/bmw/ot-2018?slink=abc123"

Output: JSON to stdout. Progress/errors to stderr.
`);
  process.exit(0);
}

const filters: SearchFilters = {};
if (values.make) filters.make = values.make;
if (values.model) filters.model = values.model;
if (values['year-from']) filters.yearFrom = parseInt(values['year-from']);
if (values['year-to']) filters.yearTo = parseInt(values['year-to']);
if (values['price-from']) filters.priceFrom = parseInt(values['price-from']);
if (values['price-to']) filters.priceTo = parseInt(values['price-to']);
if (values.fuel) filters.fuelType = values.fuel as SearchFilters['fuelType'];
if (values.transmission) filters.transmission = values.transmission as SearchFilters['transmission'];
if (values['max-mileage']) filters.maxMileage = parseInt(values['max-mileage']);
if (values['power-from']) filters.powerFrom = parseInt(values['power-from']);
if (values['power-to']) filters.powerTo = parseInt(values['power-to']);
if (values['body-type']) filters.bodyType = values['body-type'] as SearchFilters['bodyType'];
if (values['max-pages']) filters.maxPages = parseInt(values['max-pages']);

const crawlOptions: CrawlOptions = {
  fetchDetails: values['fetch-details'],
};
if (values.delay) crawlOptions.delayMs = parseInt(values.delay);

const site = values.site ?? 'both';

async function run() {
  const results: CrawlResult[] = [];

  if (site === 'cars.bg' || site === 'both') {
    process.stderr.write('Starting cars.bg crawl...\n');
    const crawler = new CarsBgCrawler(crawlOptions);
    const result = await crawler.crawlAll(filters, crawlOptions);
    results.push(result);
    process.stderr.write(`cars.bg: ${result.listings.length} listings from ${result.pagesScraped} pages\n`);
  }

  if (site === 'mobile.bg' || site === 'both') {
    process.stderr.write('Starting mobile.bg crawl...\n');
    const crawler = new MobileBgCrawler({ ...crawlOptions, url: values.url });
    const result = await crawler.crawlAll(filters, crawlOptions);
    results.push(result);
    process.stderr.write(`mobile.bg: ${result.listings.length} listings from ${result.pagesScraped} pages\n`);
  }

  if (results.length === 0) {
    process.stderr.write(`Unknown site: ${site}. Use mobile.bg, cars.bg, or both.\n`);
    process.exit(1);
  }

  // Output
  if (results.length === 1) {
    process.stdout.write(JSON.stringify(results[0], null, 2) + '\n');
  } else {
    // Merged output for "both"
    const merged = {
      filters,
      sources: results.map(r => ({
        source: r.source,
        pagesScraped: r.pagesScraped,
        totalEstimate: r.totalEstimate,
        listingCount: r.listings.length,
        errors: r.errors,
      })),
      totalListings: results.reduce((sum, r) => sum + r.listings.length, 0),
      listings: results.flatMap(r => r.listings),
    };
    process.stdout.write(JSON.stringify(merged, null, 2) + '\n');
  }
}

run().catch(err => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
