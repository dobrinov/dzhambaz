import type { CarListing } from "~shared/types"
import {
  parsePrice,
  parseYear,
  parseMileage,
  parsePower,
  parseEngine,
  parseFuel,
  parseTransmission,
} from "~shared/parse-helpers"

function extractIdFromUrl(url: string): string {
  const match = url.match(/obiava-(\d+)/)
  return match ? match[1] : url.replace(/\D/g, "").slice(0, 15)
}

export function parseMobileBgListings(doc: Document = document): CarListing[] {
  const listings: CarListing[] = []
  const items = doc.querySelectorAll('div.item[id^="ida"]')

  items.forEach((el) => {
    try {
      const titleLink = el.querySelector("a.title") as HTMLAnchorElement | null
      if (!titleLink) return

      const title = titleLink.textContent?.trim() ?? ""
      if (!title) return

      let href = titleLink.getAttribute("href") ?? ""
      if (href.startsWith("//")) href = `https:${href}`
      else if (href.startsWith("/")) href = `https://www.mobile.bg${href}`

      const id = extractIdFromUrl(href)

      const priceEl = el.querySelector("div.price")
      const priceText = priceEl?.textContent ?? ""
      const { eur, bgn } = parsePrice(priceText)

      let year: number | null = null
      let mileageKm: number | null = null
      let fuelType: string | null = null
      let transmission: string | null = null
      let powerHp: number | null = null
      let engineCc: number | null = null

      el.querySelectorAll("div.params span").forEach((span) => {
        const text = span.textContent?.trim() ?? ""
        if (!text) return

        if (!year) {
          const y = parseYear(text)
          if (y) year = y
        }
        if (!mileageKm && text.includes("км")) {
          mileageKm = parseMileage(text)
        }
        if (!fuelType) {
          const f = parseFuel(text)
          if (f) fuelType = f
        }
        if (!transmission) {
          const t = parseTransmission(text)
          if (t) transmission = t
        }
        if (!powerHp && text.includes("к.с")) {
          powerHp = parsePower(text)
        }
        if (!engineCc && text.includes("куб")) {
          engineCc = parseEngine(text)
        }
      })

      const location = el.querySelector("div.location")?.textContent?.trim() || null

      let imageUrl: string | null = null
      const img = el.querySelector("img.pic") as HTMLImageElement | null
      if (img) {
        imageUrl = img.getAttribute("src")
        if (imageUrl?.startsWith("//")) imageUrl = `https:${imageUrl}`
      }

      listings.push({
        source: "mobile.bg",
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
      })
    } catch {
      // Skip malformed items
    }
  })

  return listings
}

export function detectMobileBgPagination(doc: Document = document): {
  totalPages: number
  baseUrl: string
  queryString: string
} {
  let maxPage = 1

  doc.querySelectorAll('a[href*="/p-"]').forEach((el) => {
    const href = el.getAttribute("href") ?? ""
    const match = href.match(/\/p-(\d+)/)
    if (match) {
      const page = parseInt(match[1])
      if (page > maxPage) maxPage = page
    }
  })

  // mobile.bg's pagination UI only renders links to the next 2–3 pages, so
  // always derive total pages from "от общо N" too and take the max.
  // mobile.bg renders either "от общо 2395 Обяви" or, when the count is
  // capped, "от общо 3000+" — accept both.
  const bodyText = doc.body?.textContent ?? ""
  const totalMatch = bodyText.match(/от общо\s+([\d\s]+?)\s*(?:\+|Обяви)/i)
  if (totalMatch) {
    const total = parseInt(totalMatch[1].replace(/\s/g, ""))
    if (total > 0) maxPage = Math.max(maxPage, Math.ceil(total / 20))
  }

  // Preserve query params (e.g. ?engine_power=218) — they contain filters
  const fullUrl = window.location.href.split("#")[0]
  const qIdx = fullUrl.indexOf("?")
  const queryString = qIdx >= 0 ? fullUrl.slice(qIdx) : ""
  let baseUrl = qIdx >= 0 ? fullUrl.slice(0, qIdx) : fullUrl
  baseUrl = baseUrl.replace(/\/p-\d+\/?$/, "")
  baseUrl = baseUrl.replace(/\/$/, "")

  return { totalPages: maxPage, baseUrl, queryString }
}

export function buildMobileBgPageUrl(
  baseUrl: string,
  page: number,
  queryString: string = ""
): string {
  if (page <= 1) return baseUrl + queryString
  return `${baseUrl}/p-${page}${queryString}`
}
