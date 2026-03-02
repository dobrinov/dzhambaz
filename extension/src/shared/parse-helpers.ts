export const EUR_TO_BGN = 1.95583

// === mobile.bg helpers ===

export function parsePrice(text: string): { eur: number | null; bgn: number | null } {
  const eurMatch = text.match(/([\d\s]+)\s*(?:€|EUR)/i)
  const bgnMatch = text.match(/([\d\s.,]+)\s*лв/i)

  let eur: number | null = null
  let bgn: number | null = null

  if (eurMatch) {
    eur = parseInt(eurMatch[1].replace(/\s/g, "")) || null
  }
  if (bgnMatch) {
    bgn = parseFloat(bgnMatch[1].replace(/\s/g, "")) || null
  }

  if (eur && !bgn) bgn = Math.round(eur * EUR_TO_BGN * 100) / 100
  if (bgn && !eur) eur = Math.round((bgn / EUR_TO_BGN) * 100) / 100

  return { eur, bgn }
}

export function parseYear(text: string): number | null {
  const match = text.match(/((?:19|20)\d{2})\s*г?\./)
  if (match) return parseInt(match[1])
  const match2 = text.match(/((?:19|20)\d{2})/)
  return match2 ? parseInt(match2[1]) : null
}

export function parseMileage(text: string): number | null {
  const match = text.match(/([\d\s]+)\s*км/)
  return match ? parseInt(match[1].replace(/\s/g, "")) || null : null
}

export function parsePower(text: string): number | null {
  const match = text.match(/(\d+)\s*к\.?\s*с/)
  return match ? parseInt(match[1]) : null
}

export function parseEngine(text: string): number | null {
  const match = text.match(/(\d+)\s*куб\.?\s*см/)
  return match ? parseInt(match[1]) : null
}

export function parseFuel(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes("дизел")) return "diesel"
  if (lower.includes("бензин") && lower.includes("газ")) return "gas"
  if (lower.includes("бензин")) return "petrol"
  if (lower.includes("газ")) return "gas"
  if (lower.includes("хибрид") || lower.includes("plug-in")) return "hybrid"
  if (lower.includes("електр")) return "electric"
  return null
}

export function parseTransmission(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes("автоматик") || lower.includes("автоматична")) return "automatic"
  if (lower.includes("ръчна") || lower.includes("механична")) return "manual"
  return null
}

// === cars.bg helpers ===

export function parsePriceFromComment(html: string): {
  eur: number | null
  bgn: number | null
} {
  const commentMatch = html.match(/<!--\s*([\d,.\s]+)\s*EUR\s*-->/)
  let eur: number | null = null
  let bgn: number | null = null

  if (commentMatch) {
    eur = parseFloat(commentMatch[1].replace(/[,\s]/g, "")) || null
  }

  if (eur) {
    bgn = Math.round(eur * EUR_TO_BGN * 100) / 100
  }

  return { eur, bgn }
}

export function parsePriceFromText(text: string): {
  eur: number | null
  bgn: number | null
} {
  const eurMatch = text.match(/([\d,.\s]+)\s*EUR/i)
  const bgnMatch = text.match(/([\d,.\s]+)\s*(?:BGN|лв)/i)

  let eur: number | null = null
  let bgn: number | null = null

  if (eurMatch) eur = parseFloat(eurMatch[1].replace(/[,\s]/g, "")) || null
  if (bgnMatch) bgn = parseFloat(bgnMatch[1].replace(/[,\s]/g, "")) || null

  if (eur && !bgn) bgn = Math.round(eur * EUR_TO_BGN * 100) / 100
  if (bgn && !eur) eur = Math.round((bgn / EUR_TO_BGN) * 100) / 100

  return { eur, bgn }
}

export function parseFuelCarsBg(text: string): string | null {
  const lower = text.toLowerCase().trim()
  if (lower.includes("дизел") || lower.includes("diesel")) return "diesel"
  if (lower.includes("бензин") || lower.includes("petrol") || lower.includes("benzin"))
    return "petrol"
  if (lower.includes("газ") || lower.includes("gas") || lower.includes("lpg")) return "gas"
  if (lower.includes("хибрид") || lower.includes("hybrid")) return "hybrid"
  if (lower.includes("електр") || lower.includes("electric")) return "electric"
  return text.trim() || null
}
