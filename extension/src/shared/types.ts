export interface CarListing {
  source: "mobile.bg" | "cars.bg"
  id: string
  url: string
  title: string
  priceEur: number | null
  priceBgn: number | null
  year: number | null
  mileageKm: number | null
  fuelType: string | null
  transmission: string | null
  powerHp: number | null
  engineCc: number | null
  location: string | null
  imageUrl: string | null
}

export interface MarketStats {
  count: number
  price: {
    min: number
    max: number
    median: number
    p25: number
    p75: number
  } | null
  mileage: {
    min: number
    max: number
    median: number
    p25: number
    p75: number
  } | null
}

export interface MarketPosition {
  pricePercentile: number | null
  mileagePercentile: number | null
  label: string
  labelKey: "greatDeal" | "goodPrice" | "aboveMedian" | "expensive" | "noPriceData"
  color: string
}
