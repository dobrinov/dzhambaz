import type { CarListing } from "~shared/types"
import { parsePriceFromComment, parsePriceFromText, parseFuelCarsBg } from "~shared/parse-helpers"

export function parseCarsBgListings(doc: Document = document): CarListing[] {
  const listings: CarListing[] = []
  const cards = doc.querySelectorAll("div.offer-item")

  cards.forEach((el) => {
    try {
      const link = el.querySelector('a[href*="/offer/"]') as HTMLAnchorElement | null
      if (!link) return

      const href = link.getAttribute("href") ?? ""
      const idMatch = href.match(/\/offer\/([a-f0-9]+)/i)
      if (!idMatch) return

      const id = idMatch[1]
      const url = href.startsWith("http") ? href : `https://www.cars.bg${href}`

      const title = link.querySelector("h5")?.textContent?.trim() ?? ""
      if (!title) return

      const priceEl = link.querySelector("h6.price")
      const priceHtml = priceEl?.innerHTML ?? ""
      let { eur, bgn } = parsePriceFromComment(priceHtml)
      if (!eur) {
        ;({ eur, bgn } = parsePriceFromText(priceEl?.textContent ?? ""))
      }

      const specsText =
        link.querySelector("div.card__secondary.black")?.textContent?.trim() ?? ""
      const specParts = specsText.split(/,\s*/)

      let year: number | null = null
      let fuelType: string | null = null
      let mileageKm: number | null = null

      for (const part of specParts) {
        const trimmed = part.trim()
        const yearMatch = trimmed.match(/^(19|20)\d{2}$/)
        if (yearMatch) {
          year = parseInt(yearMatch[0])
          continue
        }
        const kmMatch = trimmed.match(/([\d\s]+)\s*км/)
        if (kmMatch) {
          mileageKm = parseInt(kmMatch[1].replace(/\s/g, "")) || null
          continue
        }
        if (!fuelType && trimmed.length > 1) {
          fuelType = parseFuelCarsBg(trimmed)
        }
      }

      const footerText = el.querySelector("div.card__footer")?.textContent?.trim() ?? ""
      let location: string | null = null
      if (footerText) {
        const parts = footerText.split(/,\s*/)
        if (parts.length >= 2) {
          location = parts.slice(1).join(", ").trim()
        } else {
          location = footerText
        }
      }

      let imageUrl: string | null = null
      const media = link.querySelector(".mdc-card__media") as HTMLElement | null
      if (media) {
        const style = media.getAttribute("style") ?? ""
        const urlMatch = style.match(/url\(["']?([^"')]+)["']?\)/)
        if (urlMatch) {
          imageUrl = urlMatch[1]
          if (imageUrl && !imageUrl.startsWith("http")) {
            imageUrl = `https:${imageUrl}`
          }
        }
      }

      listings.push({
        source: "cars.bg",
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
      })
    } catch {
      // Skip malformed cards
    }
  })

  return listings
}

export function detectCarsBgPagination(doc: Document = document): {
  totalPages: number
} {
  // Try script approach: pageDataList.maxPage = N
  const scripts = doc.querySelectorAll("script")
  for (const script of scripts) {
    const text = script.textContent || ""
    const match = text.match(/pageDataList\.maxPage\s*=\s*(\d+)/)
    if (match) return { totalPages: parseInt(match[1]) }
  }

  // Fallback: check pagination links
  let maxPage = 1
  doc.querySelectorAll('a[href*="page="]').forEach((el) => {
    const href = el.getAttribute("href") ?? ""
    const match = href.match(/page=(\d+)/)
    if (match) {
      const page = parseInt(match[1])
      if (page > maxPage) maxPage = page
    }
  })

  return { totalPages: maxPage }
}

export function buildCarsBgPageUrl(page: number): string {
  const url = new URL(window.location.href)
  url.searchParams.set("page", String(page))
  return url.toString()
}
