import type { CarListing } from "./types"

export interface SearchFilters {
  make: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
  priceFrom: number | null
  priceTo: number | null
  fuelType: string | null // normalized: petrol, diesel, gas, hybrid, electric
  transmission: string | null // normalized: manual, automatic
  powerFrom: number | null
  powerTo: number | null
  maxMileage: number | null
  bodyType: string | null // mobile.bg slug: sedan, kombi, dzhip, etc.
  location: string | null // mobile.bg slug: namira-se-v-balgariya, etc.
}

// ── mobile.bg slug ↔ normalized value maps ──────────────────────────────────

const MOBILE_BG_FUEL_SLUG_TO_NORM: Record<string, string> = {
  benzinov: "petrol",
  dizelov: "diesel",
  gazov: "gas",
  hibriden: "hybrid",
  elektricheski: "electric",
}

const MOBILE_BG_BODY_SLUGS = new Set([
  "sedan", "hechbek", "kombi", "kupe", "kabrio", "dzhip", "pikap", "van",
])

// ── Extract search filters from the current page ────────────────────────────

export function extractSearchFilters(
  site: "mobile.bg" | "cars.bg"
): SearchFilters | null {
  if (site === "mobile.bg") return extractFromMobileBg()
  if (site === "cars.bg") return extractFromCarsBg()
  return null
}

function extractFromMobileBg(): SearchFilters | null {
  // Extract make/model from page text
  const text = document.body.textContent ?? ""
  let make: string | null = null
  let model: string | null = null

  const obiaviMatch = text.match(
    /Обяви за\s+([A-Za-z0-9][A-Za-z0-9._-]*)(?:\s+([A-Za-z0-9][A-Za-z0-9._/ -]*))?/
  )
  if (obiaviMatch) {
    make = obiaviMatch[1].trim()
    model = obiaviMatch[2]?.trim() || null
  }
  if (!make) {
    const rubrikaMatch = text.match(/Автомобили и Джипове,\s*([^;]+)/i)
    if (rubrikaMatch) {
      const parts = rubrikaMatch[1].trim().split(/\s+/)
      make = parts[0]
      model = parts.length > 1 ? parts.slice(1).join(" ") : null
    }
  }
  if (!make) return null

  // Extract filters from URL path and query params
  // Path: /obiavi/avtomobili-dzhipove/{make}/{bodyType}/{fuel}/ot-{year}/do-{year}/p-{page}
  // Query: ?price=X&price1=Y&km=Z&engine_power=A&engine_power1=B
  // Also handles shortlinks like /1dnkptb — in that case we parse from page text

  const url = new URL(window.location.href)
  const pathParts = url.pathname.split("/").filter(Boolean)

  let fuelType: string | null = null
  let yearFrom: number | null = null
  let yearTo: number | null = null
  let bodyType: string | null = null
  let location: string | null = null

  for (const part of pathParts) {
    if (MOBILE_BG_FUEL_SLUG_TO_NORM[part]) {
      fuelType = MOBILE_BG_FUEL_SLUG_TO_NORM[part]
    }
    if (MOBILE_BG_BODY_SLUGS.has(part)) {
      bodyType = part
    }
    if (part.startsWith("namira-se-v-")) {
      location = part
    }
    const otMatch = part.match(/^ot-(\d{4})$/)
    if (otMatch) yearFrom = parseInt(otMatch[1])
    const doMatch = part.match(/^do-(\d{4})$/)
    if (doMatch) yearTo = parseInt(doMatch[1])
  }

  // If URL is a shortlink (no path-based filters), try extracting from page text
  if (!fuelType && !yearFrom && !yearTo) {
    // Look for fuel type in "Рубрика" or filter summary text
    const fuelPatterns: [RegExp, string][] = [
      [/дизел/i, "diesel"],
      [/бензин/i, "petrol"],
      [/газ/i, "gas"],
      [/хибрид/i, "hybrid"],
      [/електр/i, "electric"],
    ]
    // Search in the "Рубрика" section only to avoid false matches from listings
    const rubrikaSection = text.match(/Рубрика:([^]*?)Подредени по:/i)?.[1] ?? ""
    for (const [re, fuel] of fuelPatterns) {
      if (re.test(rubrikaSection)) {
        fuelType = fuel
        break
      }
    }

    // Extract transmission from Рубрика
    // (handled below with separate logic)
  }

  const priceFrom = url.searchParams.get("price")
    ? parseInt(url.searchParams.get("price")!)
    : null
  const priceTo = url.searchParams.get("price1")
    ? parseInt(url.searchParams.get("price1")!)
    : null
  const maxMileage = url.searchParams.get("km")
    ? parseInt(url.searchParams.get("km")!)
    : null
  const powerFrom = url.searchParams.get("engine_power")
    ? parseInt(url.searchParams.get("engine_power")!)
    : null
  const powerTo = url.searchParams.get("engine_power1")
    ? parseInt(url.searchParams.get("engine_power1")!)
    : null

  // Transmission from Рубрика text
  let transmission: string | null = null
  const rubrikaFull = text.match(/Рубрика:([^]*?)Подредени по:/i)?.[1] ?? ""
  if (/автоматик|автоматична/i.test(rubrikaFull)) transmission = "automatic"
  else if (/ръчна|механична/i.test(rubrikaFull)) transmission = "manual"

  return {
    make,
    model,
    yearFrom,
    yearTo,
    priceFrom,
    priceTo,
    fuelType,
    transmission,
    powerFrom,
    powerTo,
    maxMileage,
    bodyType,
    location,
  }
}

// cars.bg known fuelId → normalized fuel type
const CARSBG_FUEL_ID_TO_NORM: Record<string, string> = {
  "1": "petrol",
  "2": "diesel",
  "3": "gas",
  "4": "hybrid",
  "5": "electric",
}

// cars.bg known gearId → normalized transmission
const CARSBG_GEAR_ID_TO_NORM: Record<string, string> = {
  "1": "manual",
  "2": "automatic",
}

// cars.bg doorId → mobile.bg body slug (approximate mapping)
const CARSBG_DOOR_TO_BODY_SLUG: Record<string, string> = {
  "1": "kombi",     // Комби/Wagon
  "2": "sedan",     // Седан
  "3": "hechbek",   // Хечбек
  "4": "kupe",      // Купе
  "5": "kabrio",    // Кабрио
  "6": "dzhip",     // Джип/SUV
  "7": "van",       // Ван
}

function extractFromCarsBg(): SearchFilters | null {
  const url = new URL(window.location.href)
  const params = url.searchParams

  // Make from page title: "AUDI A4 - автомобили - CARS.bg"
  let make: string | null = null
  let model: string | null = null
  const title = document.title
  const titleMatch = title.match(
    /^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\s+([A-Za-z0-9][A-Za-z0-9._/ -]*))?\s*-/i
  )
  if (titleMatch) {
    make = titleMatch[1].trim()
    model = titleMatch[2]?.trim() || null
  }
  if (!make) return null

  const yearFrom = params.get("yearFrom") ? parseInt(params.get("yearFrom")!) : null
  const yearTo = params.get("yearTo") ? parseInt(params.get("yearTo")!) : null
  const priceFrom = params.get("priceFrom") ? parseInt(params.get("priceFrom")!) : null
  const priceTo = params.get("priceTo") ? parseInt(params.get("priceTo")!) : null
  const powerFrom = params.get("powerFrom") ? parseInt(params.get("powerFrom")!) : null
  const powerTo = params.get("powerTo") ? parseInt(params.get("powerTo")!) : null

  // Fuel: first try known fuelId mapping, then fall back to page text
  let fuelType: string | null = null
  const fuelIdParam = params.get("fuelId[]")
  if (fuelIdParam && CARSBG_FUEL_ID_TO_NORM[fuelIdParam]) {
    fuelType = CARSBG_FUEL_ID_TO_NORM[fuelIdParam]
  }
  if (!fuelType) {
    const activeFiltersText = document.body.textContent ?? ""
    const fuelPatterns: [RegExp, string][] = [
      [/дизел|diesel/i, "diesel"],
      [/бензин|petrol|benzin/i, "petrol"],
      [/газ|gas|lpg/i, "gas"],
      [/хибрид|hybrid/i, "hybrid"],
      [/електр|electric/i, "electric"],
    ]
    const filterChips = document.querySelectorAll(".chip, .filter-tag, .active-filter")
    const chipTexts = Array.from(filterChips).map((el) => el.textContent?.toLowerCase() ?? "")
    for (const [re, fuel] of fuelPatterns) {
      if (chipTexts.some((t) => re.test(t))) {
        fuelType = fuel
        break
      }
    }
  }

  // Transmission from known gearId, then page text fallback
  let transmission: string | null = null
  const gearIdParam = params.get("gearId")
  if (gearIdParam && CARSBG_GEAR_ID_TO_NORM[gearIdParam]) {
    transmission = CARSBG_GEAR_ID_TO_NORM[gearIdParam]
  }
  if (!transmission && gearIdParam) {
    const activeFiltersText = document.body.textContent ?? ""
    if (/автоматик|automatic/i.test(activeFiltersText.slice(0, 500))) {
      transmission = "automatic"
    } else if (/ръчна|manual/i.test(activeFiltersText.slice(0, 500))) {
      transmission = "manual"
    }
  }

  // Body type from doorId
  let bodyType: string | null = null
  const doorIdParam = params.get("doorId")
  if (doorIdParam && CARSBG_DOOR_TO_BODY_SLUG[doorIdParam]) {
    bodyType = CARSBG_DOOR_TO_BODY_SLUG[doorIdParam]
  }

  return {
    make,
    model,
    yearFrom,
    yearTo,
    priceFrom,
    priceTo,
    fuelType,
    transmission,
    powerFrom,
    powerTo,
    maxMileage: null,
    bodyType,
    location: null,
  }
}

// ── cars.bg filter discovery and URL building ───────────────────────────────

export interface CarsBgFilterMaps {
  brands: Map<string, number>
  models: Map<string, number> // label → model ID (from select options)
  fuels: Map<string, number>
  gears: Map<string, number>
}

const FUEL_TO_CARSBG_KEYWORDS: Record<string, string[]> = {
  petrol: ["бензин", "benzin", "petrol"],
  diesel: ["дизел", "diesel"],
  gas: ["газ", "gas", "lpg"],
  hybrid: ["хибрид", "hybrid"],
  electric: ["електр", "electric"],
}

const GEAR_TO_CARSBG_KEYWORDS: Record<string, string[]> = {
  manual: ["ръчна", "ръчни", "manual"],
  automatic: ["автоматик", "автоматична", "automatic"],
}

export function parseCarsBgFilterMaps(doc: Document): CarsBgFilterMaps {
  const brands = new Map<string, number>()
  const models = new Map<string, number>()
  const fuels = new Map<string, number>()
  const gears = new Map<string, number>()

  function getLabel(id: string): string {
    return doc.querySelector(`label[for="${id}"]`)?.textContent?.trim().toLowerCase() ?? ""
  }

  doc.querySelectorAll('input[name="brandId"]').forEach((el) => {
    const val = parseInt(el.getAttribute("value") ?? "")
    const label = getLabel(el.getAttribute("id") ?? "")
    if (label && !isNaN(val) && val > 0) brands.set(label, val)
  })

  doc.querySelectorAll('input[name="fuelId[]"]').forEach((el) => {
    const val = parseInt(el.getAttribute("value") ?? "")
    const label = getLabel(el.getAttribute("id") ?? "")
    if (label && !isNaN(val) && val > 0) fuels.set(label, val)
  })

  doc.querySelectorAll('input[name="gearId"]').forEach((el) => {
    const val = parseInt(el.getAttribute("value") ?? "")
    const label = getLabel(el.getAttribute("id") ?? "")
    if (label && !isNaN(val) && val > 0) gears.set(label, val)
  })

  return { brands, models, fuels, gears }
}

/**
 * Discover model IDs for a brand from cars.bg's AJAX endpoint.
 * Returns a map of lowercase model name → model ID.
 */
export function parseCarsBgModels(doc: Document): Map<string, number> {
  const models = new Map<string, number>()
  // cars.bg returns models as checkboxes: input[name="models[]"]
  doc.querySelectorAll('input[name="models[]"]').forEach((el) => {
    const val = parseInt(el.getAttribute("value") ?? "")
    const id = el.getAttribute("id") ?? ""
    const label = doc.querySelector(`label[for="${id}"]`)?.textContent?.trim().toLowerCase() ?? ""
    if (label && !isNaN(val) && val > 0) models.set(label, val)
  })
  // Also try select options as fallback
  if (models.size === 0) {
    doc.querySelectorAll('select[name="models[]"] option, select[name="modelId"] option').forEach((el) => {
      const val = parseInt(el.getAttribute("value") ?? "")
      const label = el.textContent?.trim().toLowerCase() ?? ""
      if (label && !isNaN(val) && val > 0) models.set(label, val)
    })
  }
  return models
}

export function findCarsBgModelId(
  models: Map<string, number>,
  model: string
): number | undefined {
  const lower = model.toLowerCase()
  if (models.has(lower)) return models.get(lower)
  for (const [label, id] of models) {
    if (label.includes(lower) || lower.includes(label)) return id
  }
  return undefined
}

export function findCarsBgBrandId(
  brands: Map<string, number>,
  make: string
): number | undefined {
  const lower = make.toLowerCase()
  if (brands.has(lower)) return brands.get(lower)
  for (const [label, id] of brands) {
    if (label.includes(lower) || lower.includes(label)) return id
  }
  return undefined
}

function findFilterId(
  map: Map<string, number>,
  keywords: string[]
): number | undefined {
  for (const [label, id] of map) {
    for (const kw of keywords) {
      if (label.includes(kw)) return id
    }
  }
  return undefined
}

export function buildCarsBgSearchUrl(
  filters: SearchFilters,
  filterMaps: CarsBgFilterMaps,
  page: number,
  modelId?: number
): string {
  const params = new URLSearchParams()
  params.set("conditions[0]", "4")
  params.set("conditions[1]", "1")

  const brandId = findCarsBgBrandId(filterMaps.brands, filters.make)
  if (brandId !== undefined) params.set("brandId", String(brandId))

  // Include model ID for server-side filtering (instead of client-side title matching)
  if (modelId !== undefined) params.set("models[]", String(modelId))

  if (filters.fuelType) {
    const keywords = FUEL_TO_CARSBG_KEYWORDS[filters.fuelType]
    if (keywords) {
      const fuelId = findFilterId(filterMaps.fuels, keywords)
      if (fuelId !== undefined) params.set("fuelId[]", String(fuelId))
    }
  }

  if (filters.transmission) {
    const keywords = GEAR_TO_CARSBG_KEYWORDS[filters.transmission]
    if (keywords) {
      const gearId = findFilterId(filterMaps.gears, keywords)
      if (gearId !== undefined) params.set("gearId", String(gearId))
    }
  }

  if (filters.yearFrom) params.set("yearFrom", String(filters.yearFrom))
  if (filters.yearTo) params.set("yearTo", String(filters.yearTo))
  if (filters.priceFrom) params.set("priceFrom", String(filters.priceFrom))
  if (filters.priceTo) params.set("priceTo", String(filters.priceTo))
  if (filters.powerFrom) params.set("powerFrom", String(filters.powerFrom))
  if (filters.powerTo) params.set("powerTo", String(filters.powerTo))

  if (page > 1) params.set("page", String(page))

  return `https://www.cars.bg/carslist.php?${params.toString()}`
}

// ── mobile.bg URL building with filters ─────────────────────────────────────

const NORM_TO_MOBILE_BG_FUEL_SLUG: Record<string, string> = {
  petrol: "benzinov",
  diesel: "dizelov",
  gas: "gazov",
  hybrid: "hibriden",
  electric: "elektricheski",
}

export function buildMobileBgSearchUrl(filters: SearchFilters, page: number): string {
  // Use /search/ URL pattern (current mobile.bg format)
  const segments: string[] = [
    "https://www.mobile.bg/search/avtomobili-dzhipove",
  ]

  segments.push(
    filters.make.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
  )

  // Include model slug if available (e.g. /audi/a4/)
  if (filters.model) {
    const modelSlug = filters.model.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
    if (modelSlug && !MOBILE_BG_BODY_SLUGS.has(modelSlug)) {
      segments.push(modelSlug)
    }
  }

  // Body type (kombi, sedan, dzhip, etc.)
  if (filters.bodyType) {
    segments.push(filters.bodyType)
  }

  if (filters.fuelType && NORM_TO_MOBILE_BG_FUEL_SLUG[filters.fuelType]) {
    segments.push(NORM_TO_MOBILE_BG_FUEL_SLUG[filters.fuelType])
  }

  if (filters.yearFrom) segments.push(`ot-${filters.yearFrom}`)
  if (filters.yearTo) segments.push(`do-${filters.yearTo}`)

  // Location filter (e.g. namira-se-v-balgariya)
  if (filters.location) {
    segments.push(filters.location)
  }

  if (page > 1) segments.push(`p-${page}`)

  let url = segments.join("/")

  const params = new URLSearchParams()
  if (filters.priceFrom) params.set("price", String(filters.priceFrom))
  if (filters.priceTo) params.set("price1", String(filters.priceTo))
  if (filters.maxMileage) params.set("km", String(filters.maxMileage))
  if (filters.powerFrom) params.set("engine_power", String(filters.powerFrom))
  if (filters.powerTo) params.set("engine_power1", String(filters.powerTo))

  const qs = params.toString()
  if (qs) url += `?${qs}`

  return url
}

// ── Total pages detection for fetched pages ─────────────────────────────────

export function detectTotalPages(
  doc: Document,
  site: "mobile.bg" | "cars.bg"
): number {
  if (site === "mobile.bg") {
    let maxPage = 1
    doc.querySelectorAll('a[href*="/p-"]').forEach((el) => {
      const href = el.getAttribute("href") ?? ""
      const match = href.match(/\/p-(\d+)/)
      if (match) {
        const page = parseInt(match[1])
        if (page > maxPage) maxPage = page
      }
    })
    if (maxPage <= 1) {
      const bodyText = doc.body?.textContent ?? ""
      const totalMatch = bodyText.match(/от общо\s+([\d\s]+)\s+Обяви/i)
      if (totalMatch) {
        const total = parseInt(totalMatch[1].replace(/\s/g, ""))
        if (total > 0) maxPage = Math.ceil(total / 20)
      }
    }
    return maxPage
  }

  // cars.bg
  const scripts = doc.querySelectorAll("script")
  for (const script of scripts) {
    const text = script.textContent || ""
    const match = text.match(/pageDataList\.maxPage\s*=\s*(\d+)/)
    if (match) return parseInt(match[1])
  }
  let maxPage = 1
  doc.querySelectorAll('a[href*="page="]').forEach((el) => {
    const href = el.getAttribute("href") ?? ""
    const match = href.match(/page=(\d+)/)
    if (match) {
      const page = parseInt(match[1])
      if (page > maxPage) maxPage = page
    }
  })
  return maxPage
}

// ── Model matching ──────────────────────────────────────────────────────────

export function matchesModel(title: string, model: string): boolean {
  const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`\\b${escaped}\\b`, "i")
  return re.test(title)
}
