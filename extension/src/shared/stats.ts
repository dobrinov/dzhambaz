import type { CarListing, MarketStats } from "./types"

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]

  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower

  if (upper >= sorted.length) return sorted[sorted.length - 1]
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

/**
 * Remove placeholder/fake prices (< €200) then apply IQR-based outlier removal.
 * Returns a sorted array of clean prices.
 */
function filterPriceOutliers(raw: number[]): number[] {
  // Step 1: absolute floor — no real car costs < €200
  let filtered = raw.filter((v) => v >= 200)
  if (filtered.length < 4) return filtered.sort((a, b) => a - b)

  // Step 2: IQR fence — remove statistical outliers
  filtered.sort((a, b) => a - b)
  const q1 = percentile(filtered, 25)
  const q3 = percentile(filtered, 75)
  const iqr = q3 - q1
  if (iqr === 0) return filtered

  const lower = q1 - 2 * iqr
  const upper = q3 + 2 * iqr
  return filtered.filter((v) => v >= lower && v <= upper)
}

/**
 * IQR-based outlier removal for mileage values.
 */
function filterMileageOutliers(raw: number[]): number[] {
  if (raw.length < 4) return raw.sort((a, b) => a - b)

  const sorted = [...raw].sort((a, b) => a - b)
  const q1 = percentile(sorted, 25)
  const q3 = percentile(sorted, 75)
  const iqr = q3 - q1
  if (iqr === 0) return sorted

  const lower = q1 - 2 * iqr
  const upper = q3 + 2 * iqr
  return sorted.filter((v) => v >= lower && v <= upper)
}

export function computeStats(listings: CarListing[]): MarketStats {
  const rawPrices = listings
    .map((l) => l.priceEur)
    .filter((p): p is number => p !== null && p > 0)

  const rawMileages = listings
    .map((l) => l.mileageKm)
    .filter((m): m is number => m !== null && m > 0)

  const prices = filterPriceOutliers(rawPrices)
  const mileages = filterMileageOutliers(rawMileages)

  return {
    count: listings.length,
    price:
      prices.length >= 2
        ? {
            min: prices[0],
            max: prices[prices.length - 1],
            median: percentile(prices, 50),
            p25: percentile(prices, 25),
            p75: percentile(prices, 75),
          }
        : null,
    mileage:
      mileages.length >= 2
        ? {
            min: mileages[0],
            max: mileages[mileages.length - 1],
            median: percentile(mileages, 50),
            p25: percentile(mileages, 25),
            p75: percentile(mileages, 75),
          }
        : null,
  }
}
