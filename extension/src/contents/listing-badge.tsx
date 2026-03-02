import type { PlasmoCSConfig, PlasmoGetInlineAnchorList } from "plasmo"
import { useState, useEffect } from "react"
import { Storage } from "@plasmohq/storage"

import type { CarListing, MarketStats, MarketPosition } from "~shared/types"
import { computeStats } from "~shared/stats"
import { getMarketPosition } from "~shared/market-position"
import { parsePrice, parsePriceFromComment, parsePriceFromText } from "~shared/parse-helpers"
import { type Lang, DEFAULT_LANG, t } from "~shared/i18n"

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

export const config: PlasmoCSConfig = {
  matches: ["*://www.mobile.bg/*", "*://www.cars.bg/*"],
  run_at: "document_idle",
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    .wd-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      font-weight: 600;
      cursor: default;
      position: relative;
      line-height: 1.4;
      margin: 4px 0;
      transition: all 0.15s ease;
    }
    .wd-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .wd-badge-tooltip {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: #1e293b;
      color: #e2e8f0;
      padding: 8px 12px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 12px;
      font-weight: 400;
      white-space: nowrap;
      z-index: 999999;
      min-width: 160px;
    }
    .wd-badge-tooltip-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 2px 0;
    }
    .wd-badge-tooltip-label {
      color: #cbd5e1;
    }
    .wd-badge-tooltip-value {
      font-variant-numeric: tabular-nums;
    }
    .wd-badge-scale {
      position: relative; height: 6px; margin-top: 6px;
      background: #334155; border-radius: 3px; overflow: visible;
    }
    .wd-badge-scale-iqr {
      position: absolute; top: 0; bottom: 0; border-radius: 3px;
      background: #475569;
    }
    .wd-badge-scale-marker {
      position: absolute; top: -1px; width: 4px; height: 8px;
      border-radius: 1px; transform: translateX(-2px);
    }
    .wd-badge-scale-labels {
      display: flex; justify-content: space-between;
      font-size: 9px; color: #94a3b8; margin-top: 2px;
    }
  `
  return style
}

function detectSite(): "mobile.bg" | "cars.bg" | null {
  const host = window.location.hostname
  if (host.includes("mobile.bg")) return "mobile.bg"
  if (host.includes("cars.bg")) return "cars.bg"
  return null
}

function getListingSelector(): string {
  const site = detectSite()
  if (site === "mobile.bg") return 'div.item[id^="ida"]'
  if (site === "cars.bg") return "div.offer-item"
  return ""
}

export const getInlineAnchorList: PlasmoGetInlineAnchorList = async () => {
  const selector = getListingSelector()
  if (!selector) return []
  const elements = document.querySelectorAll(selector)
  return Array.from(elements).map((element) => ({
    element,
    insertPosition: "afterbegin" as const,
  }))
}

function extractPriceFromAnchor(
  anchor: Element,
  site: "mobile.bg" | "cars.bg"
): number | null {
  if (site === "mobile.bg") {
    const priceText = anchor.querySelector("div.price")?.textContent ?? ""
    return parsePrice(priceText).eur
  } else {
    const priceEl = anchor.querySelector("h6.price")
    const priceHtml = priceEl?.innerHTML ?? ""
    let { eur } = parsePriceFromComment(priceHtml)
    if (!eur) {
      eur = parsePriceFromText(priceEl?.textContent ?? "").eur
    }
    return eur
  }
}

const storage = new Storage()

export default function ListingBadge({ anchor }: { anchor: { element: Element } }) {
  const [position, setPosition] = useState<MarketPosition | null>(null)
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [hovered, setHovered] = useState(false)
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG)

  useEffect(() => {
    const site = detectSite()
    if (!site) return

    // Read initial language
    storage.get<Lang>("wd-lang").then((l) => { if (l) setLang(l) })

    async function compute() {
      // Read combined listings from both sites (written by market-panel)
      const listings = (await storage.get<CarListing[]>("listings:combined")) ?? []
      if (listings.length < 2) return

      const computed = computeStats(listings)
      setStats(computed)
      const p = extractPriceFromAnchor(anchor.element, site!)
      setPrice(p)

      if (p === null) return

      const fakeListingForPosition: CarListing = {
        source: site!,
        id: "",
        url: "",
        title: "",
        priceEur: p,
        priceBgn: null,
        year: null,
        mileageKm: null,
        fuelType: null,
        transmission: null,
        powerHp: null,
        engineCc: null,
        location: null,
        imageUrl: null,
      }

      setPosition(getMarketPosition(fakeListingForPosition, computed))
    }

    compute()

    // Listen for storage changes (when panel updates combined listings or language changes)
    const unsubscribe = storage.watch({
      "listings:combined": () => compute(),
      "wd-lang": (c) => { if (c.newValue) setLang(c.newValue as Lang) },
    })

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe()
      } else if (unsubscribe && typeof (unsubscribe as Promise<() => void>).then === "function") {
        (unsubscribe as Promise<() => void>).then((fn) => fn?.())
      }
    }
  }, [anchor.element])

  if (!position || position.pricePercentile === null) return null

  const priceStats = stats?.price
  const scaleRange = priceStats ? priceStats.max - priceStats.min : 0
  const scalePct = (v: number) =>
    scaleRange > 0
      ? Math.max(0, Math.min(100, ((v - priceStats!.min) / scaleRange) * 100))
      : 50

  return (
    <div
      className="wd-badge"
      style={{ background: `${position.color}22`, color: position.color }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <span className="wd-badge-dot" style={{ background: position.color }} />
      <span>{t(position.labelKey, lang)}</span>
      {hovered && (
        <div className="wd-badge-tooltip">
          <div className="wd-badge-tooltip-row">
            <span className="wd-badge-tooltip-label">{t("pricePosition", lang)}</span>
            <span className="wd-badge-tooltip-value">
              {position.pricePercentile !== null ? `${position.pricePercentile}%` : "—"}
            </span>
          </div>
          {position.mileagePercentile !== null && (
            <div className="wd-badge-tooltip-row">
              <span className="wd-badge-tooltip-label">{t("mileagePosition", lang)}</span>
              <span className="wd-badge-tooltip-value">{position.mileagePercentile}%</span>
            </div>
          )}
          {priceStats && price !== null && scaleRange > 0 && (
            <>
              <div className="wd-badge-scale">
                <div
                  className="wd-badge-scale-iqr"
                  style={{
                    left: `${scalePct(priceStats.p25)}%`,
                    width: `${scalePct(priceStats.p75) - scalePct(priceStats.p25)}%`,
                  }}
                />
                <div
                  className="wd-badge-scale-marker"
                  style={{ left: `${scalePct(price)}%`, background: position.color }}
                />
              </div>
              <div className="wd-badge-scale-labels">
                <span>{fmt(priceStats.min)}</span>
                <span>{fmt(priceStats.max)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
