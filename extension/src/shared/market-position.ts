import type { CarListing, MarketPosition, MarketStats } from "./types"

export function getMarketPosition(
  listing: CarListing,
  stats: MarketStats
): MarketPosition {
  let pricePercentile: number | null = null
  let mileagePercentile: number | null = null

  if (listing.priceEur !== null && stats.price) {
    const range = stats.price.max - stats.price.min
    if (range > 0) {
      pricePercentile = Math.round(
        ((listing.priceEur - stats.price.min) / range) * 100
      )
      pricePercentile = Math.max(0, Math.min(100, pricePercentile))
    } else {
      pricePercentile = 50
    }
  }

  if (listing.mileageKm !== null && stats.mileage) {
    const range = stats.mileage.max - stats.mileage.min
    if (range > 0) {
      mileagePercentile = Math.round(
        ((listing.mileageKm - stats.mileage.min) / range) * 100
      )
      mileagePercentile = Math.max(0, Math.min(100, mileagePercentile))
    } else {
      mileagePercentile = 50
    }
  }

  let label: string
  let labelKey: MarketPosition["labelKey"]
  let color: string

  if (pricePercentile === null) {
    label = "No price data"
    labelKey = "noPriceData"
    color = "#888"
  } else if (pricePercentile <= 20) {
    label = "Great deal"
    labelKey = "greatDeal"
    color = "#16a34a"
  } else if (pricePercentile <= 45) {
    label = "Good price"
    labelKey = "goodPrice"
    color = "#65a30d"
  } else if (pricePercentile <= 70) {
    label = "Above median"
    labelKey = "aboveMedian"
    color = "#d97706"
  } else {
    label = "Expensive"
    labelKey = "expensive"
    color = "#dc2626"
  }

  return { pricePercentile, mileagePercentile, label, labelKey, color }
}
