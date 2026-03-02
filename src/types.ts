export interface SearchFilters {
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  fuelType?: 'petrol' | 'diesel' | 'gas' | 'hybrid' | 'electric';
  transmission?: 'manual' | 'automatic';
  maxMileage?: number;
  powerFrom?: number;
  powerTo?: number;
  bodyType?: 'sedan' | 'hatchback' | 'estate' | 'coupe' | 'cabrio' | 'suv' | 'pickup' | 'van';
  maxPages?: number;
}

export interface CrawlOptions {
  delayMs?: number;
  maxRetries?: number;
  fetchDetails?: boolean;
}

export interface CarListing {
  source: 'mobile.bg' | 'cars.bg';
  id: string;
  url: string;
  title: string;
  priceEur: number | null;
  priceBgn: number | null;
  year: number | null;
  mileageKm: number | null;
  fuelType: string | null;
  transmission: string | null;
  powerHp: number | null;
  engineCc: number | null;
  location: string | null;
  imageUrl: string | null;
  description?: string;
  sellerName?: string;
  sellerPhone?: string;
  features?: string[];
}

export interface CrawlResult {
  source: 'mobile.bg' | 'cars.bg';
  filters: SearchFilters;
  totalEstimate: number | null;
  pagesScraped: number;
  listings: CarListing[];
  errors: { page: number; url: string; message: string }[];
}

export interface Crawler {
  crawl(filters: SearchFilters, options?: CrawlOptions): AsyncGenerator<CarListing[]>;
  crawlAll(filters: SearchFilters, options?: CrawlOptions): Promise<CrawlResult>;
}
