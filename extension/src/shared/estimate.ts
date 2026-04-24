import type { CarListing } from "./types"
import { percentile } from "./stats"

export interface EstimateInputs {
  mileageKm: number | null
  year: number | null
  urgency: number   // 0 = patient, 100 = urgent
  condition: number // 0 = poor, 100 = excellent
  extras: number    // 0 = bare, 100 = loaded
}

export type Confidence = "low" | "medium" | "high"
export type Tier = "quick" | "fair" | "patient"

export interface EstimateResult {
  quickSale: number
  fairAsk: number
  patientAsk: number
  recommendedTier: Tier
  recommendedPrice: number
  baseline: number
  comparablesCount: number
  yearBand: number | null        // +/- years used for comparables, null if year filter dropped
  confidence: Confidence
  perKmDepreciation: number | null  // €/km, only when regression succeeded
  nearest: CarListing[]
}

export const DEFAULT_INPUTS: EstimateInputs = {
  mileageKm: null,
  year: null,
  urgency: 50,
  condition: 60,
  extras: 30,
}

function filterPriceOutliers(values: number[]): number[] {
  if (values.length < 4) return [...values].sort((a, b) => a - b)
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = percentile(sorted, 25)
  const q3 = percentile(sorted, 75)
  const iqr = q3 - q1
  if (iqr === 0) return sorted
  const lo = q1 - 2 * iqr
  const hi = q3 + 2 * iqr
  return sorted.filter((v) => v >= lo && v <= hi)
}

interface ComparableSet {
  listings: CarListing[]
  yearBand: number | null
}

function pickComparables(listings: CarListing[], year: number | null): ComparableSet {
  const base = listings.filter(
    (l) =>
      l.priceEur !== null &&
      l.priceEur >= 200 &&
      l.mileageKm !== null &&
      l.mileageKm > 0
  )
  if (year === null) return { listings: base, yearBand: null }

  for (const band of [2, 4, 6]) {
    const filtered = base.filter(
      (l) => l.year !== null && Math.abs(l.year - year) <= band
    )
    if (filtered.length >= 5) return { listings: filtered, yearBand: band }
  }
  return { listings: base, yearBand: null }
}

interface Regression {
  slope: number
  intercept: number
}

function linearRegression(points: Array<{ x: number; y: number }>): Regression | null {
  if (points.length < 3) return null
  const n = points.length
  const meanX = points.reduce((s, p) => s + p.x, 0) / n
  const meanY = points.reduce((s, p) => s + p.y, 0) / n
  let num = 0
  let den = 0
  for (const p of points) {
    const dx = p.x - meanX
    num += dx * (p.y - meanY)
    den += dx * dx
  }
  if (den === 0) return null
  const slope = num / den
  const intercept = meanY - slope * meanX
  return { slope, intercept }
}

function findNearest(
  listings: CarListing[],
  mileage: number,
  year: number | null,
  count: number
): CarListing[] {
  if (listings.length === 0) return []
  const mileageValues = listings.map((l) => l.mileageKm!).filter((m) => m > 0)
  const mileageRange =
    mileageValues.length > 0
      ? Math.max(...mileageValues) - Math.min(...mileageValues) || 1
      : 1

  return [...listings]
    .map((l) => {
      const dMileage = Math.abs((l.mileageKm ?? mileage) - mileage) / mileageRange
      const dYear =
        year !== null && l.year !== null ? Math.abs(l.year - year) / 10 : 0
      return { l, d: Math.hypot(dMileage, dYear) }
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((e) => e.l)
}

export function estimateCarPrice(
  listings: CarListing[],
  inputs: EstimateInputs
): EstimateResult | null {
  if (inputs.mileageKm === null || inputs.mileageKm <= 0) return null

  const { listings: comparables, yearBand } = pickComparables(listings, inputs.year)
  if (comparables.length < 3) return null

  const cleanPriceSet = new Set(
    filterPriceOutliers(comparables.map((l) => l.priceEur!))
  )
  const clean = comparables.filter((l) => cleanPriceSet.has(l.priceEur!))
  if (clean.length < 3) return null

  const regression = linearRegression(
    clean.map((l) => ({ x: l.mileageKm!, y: l.priceEur! }))
  )

  // Don't extrapolate the regression far outside the comparable range —
  // typos like 100,150,000 km would otherwise ride the slope into nonsense.
  const cleanMileages = clean.map((l) => l.mileageKm!)
  const maxComparableKm = Math.max(...cleanMileages)
  const inRange = inputs.mileageKm <= maxComparableKm * 1.25

  let baseline: number
  let perKm: number | null = null
  if (regression && regression.slope < 0 && clean.length >= 8 && inRange) {
    baseline = regression.slope * inputs.mileageKm + regression.intercept
    perKm = regression.slope
  } else {
    const sorted = clean.map((l) => l.priceEur!).sort((a, b) => a - b)
    baseline = percentile(sorted, 50)
  }
  baseline = Math.max(200, baseline)

  const conditionMult = 0.9 + (inputs.condition / 100) * 0.2  // 0.90–1.10
  const extrasMult = 1.0 + (inputs.extras / 100) * 0.08       // 1.00–1.08
  const qualityAdjusted = baseline * conditionMult * extrasMult

  const quickSale = Math.round(qualityAdjusted * 0.88)
  const fairAsk = Math.round(qualityAdjusted)
  const patientAsk = Math.round(qualityAdjusted * 1.10)

  let recommendedTier: Tier
  if (inputs.urgency >= 67) recommendedTier = "quick"
  else if (inputs.urgency >= 34) recommendedTier = "fair"
  else recommendedTier = "patient"
  const recommendedPrice =
    recommendedTier === "quick" ? quickSale :
    recommendedTier === "patient" ? patientAsk : fairAsk

  let confidence: Confidence
  if (!inRange) confidence = "low"
  else if (clean.length >= 30) confidence = "high"
  else if (clean.length >= 10) confidence = "medium"
  else confidence = "low"

  const nearest = findNearest(clean, inputs.mileageKm, inputs.year, 5)

  return {
    quickSale,
    fairAsk,
    patientAsk,
    recommendedTier,
    recommendedPrice,
    baseline: Math.round(baseline),
    comparablesCount: clean.length,
    yearBand,
    confidence,
    perKmDepreciation: perKm,
    nearest,
  }
}
