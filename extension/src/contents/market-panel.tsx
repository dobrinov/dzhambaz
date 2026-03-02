import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState, useRef, useMemo } from "react"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import type { CarListing, MarketStats } from "~shared/types"
import { computeStats } from "~shared/stats"
import { getMarketPosition } from "~shared/market-position"
import { type Lang, DEFAULT_LANG, t } from "~shared/i18n"
import {
  parseMobileBgListings,
  detectMobileBgPagination,
  buildMobileBgPageUrl,
} from "~parsers/mobile-bg"
import { parseCarsBgListings } from "~parsers/cars-bg"
import {
  type SearchFilters,
  extractSearchFilters,
  parseCarsBgFilterMaps,
  parseCarsBgModels,
  findCarsBgBrandId,
  findCarsBgModelId,
  buildCarsBgSearchUrl,
  buildMobileBgSearchUrl,
  detectTotalPages,
  matchesModel,
} from "~shared/cross-site"

export const config: PlasmoCSConfig = {
  matches: ["*://www.mobile.bg/*", "*://www.cars.bg/*"],
  run_at: "document_idle",
}

// ── Styles ──────────────────────────────────────────────────────────────────

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    .wd-panel {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 999999;
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      width: 340px;
      max-height: calc(100vh - 20px);
      display: flex;
      flex-direction: column;
    }
    .wd-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; cursor: pointer; user-select: none;
      border-bottom: 1px solid #334155; flex-shrink: 0;
    }
    .wd-header:hover { background: #334155; border-radius: 8px 8px 0 0; }
    .wd-header-left { display: flex; align-items: center; gap: 8px; }
    .wd-title { font-weight: 600; font-size: 14px; color: #38bdf8; }
    .wd-lang-btn {
      font-size: 10px; padding: 1px 6px; border-radius: 3px;
      border: 1px solid #475569; background: none; color: #94a3b8;
      cursor: pointer; user-select: none; font-weight: 500;
    }
    .wd-lang-btn:hover { border-color: #64748b; color: #e2e8f0; }
    .wd-toggle { font-size: 11px; color: #cbd5e1; }
    .wd-tabs {
      display: flex; border-bottom: 1px solid #334155; flex-shrink: 0;
    }
    .wd-tab {
      flex: 1; padding: 8px 12px; text-align: center; cursor: pointer;
      font-size: 12px; font-weight: 500; color: #94a3b8; background: none;
      border: none; border-bottom: 2px solid transparent; user-select: none;
    }
    .wd-tab:hover { color: #e2e8f0; background: #334155; }
    .wd-tab-active { color: #38bdf8; border-bottom-color: #38bdf8; }
    .wd-body {
      padding: 12px 14px 14px; overflow-y: auto; flex: 1; min-height: 0;
    }
    .wd-collapsed .wd-body, .wd-collapsed .wd-tabs { display: none; }
    .wd-collapsed .wd-header { border-bottom: none; border-radius: 8px; }

    .wd-progress {
      font-size: 11px; color: #94a3b8; margin-bottom: 6px;
      display: flex; align-items: center; gap: 8px;
    }
    .wd-progress-bar {
      flex: 1; height: 3px; background: #334155; border-radius: 2px; overflow: hidden;
    }
    .wd-progress-fill {
      height: 100%; border-radius: 2px; transition: width 0.3s ease;
    }

    .wd-summary { display: flex; gap: 12px; margin-bottom: 12px; }
    .wd-summary-box {
      flex: 1; background: #334155; border-radius: 6px; padding: 8px 10px;
      text-align: center;
    }
    .wd-summary-val {
      font-size: 20px; font-weight: 700; color: #f1f5f9;
      font-variant-numeric: tabular-nums;
    }
    .wd-summary-label { font-size: 10px; color: #94a3b8; margin-top: 2px; }

    .wd-sources { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
    .wd-source-tag {
      font-size: 10px; padding: 2px 8px; border-radius: 10px;
    }

    .wd-section-title {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
      color: #94a3b8; margin: 12px 0 8px;
    }

    .wd-range-chart { margin-bottom: 14px; }
    .wd-range-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
    }
    .wd-range-label {
      font-size: 11px; color: #94a3b8; width: 52px; text-align: right; flex-shrink: 0;
    }
    .wd-range-bar-wrap {
      flex: 1; height: 20px; background: #0f172a; border-radius: 4px;
      position: relative; overflow: hidden;
    }
    .wd-range-iqr {
      position: absolute; top: 3px; bottom: 3px; border-radius: 3px;
    }
    .wd-range-median {
      position: absolute; top: 0; bottom: 0; width: 2px;
    }
    .wd-range-whisker {
      position: absolute; top: 6px; bottom: 6px; width: 1px; background: #475569;
    }
    .wd-range-value {
      font-size: 10px; color: #94a3b8; width: 56px; flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }
    .wd-range-value-right { text-align: right; }
    .wd-range-labels {
      display: flex; align-items: center; gap: 8px;
      font-size: 9px; color: #64748b; margin-top: -2px; margin-bottom: 4px;
    }
    .wd-range-labels-spacer { width: 52px; flex-shrink: 0; }
    .wd-range-labels-bar { flex: 1; display: flex; justify-content: space-between; }

    .wd-no-data { color: #94a3b8; font-style: italic; font-size: 12px; }

    .wd-listings { display: flex; flex-direction: column; gap: 1px; }
    .wd-listing-row {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 8px; border-radius: 4px; cursor: pointer;
      text-decoration: none; color: #e2e8f0;
    }
    .wd-listing-row:hover { background: #334155; }
    .wd-listing-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .wd-listing-info { flex: 1; min-width: 0; }
    .wd-listing-title {
      font-size: 12px; white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; color: #e2e8f0;
    }
    .wd-listing-meta {
      font-size: 10px; color: #94a3b8; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
    .wd-listing-price {
      font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums;
      white-space: nowrap; flex-shrink: 0;
    }
    .wd-listing-source {
      font-size: 9px; font-weight: 700; padding: 1px 4px;
      border-radius: 3px; flex-shrink: 0;
    }
    .wd-sort-bar { display: flex; gap: 4px; margin-bottom: 8px; }
    .wd-sort-btn {
      font-size: 10px; padding: 2px 8px; border-radius: 3px;
      border: 1px solid #334155; background: none; color: #94a3b8;
      cursor: pointer; user-select: none;
    }
    .wd-sort-btn:hover { border-color: #475569; color: #e2e8f0; }
    .wd-sort-btn-active {
      border-color: #38bdf8; color: #38bdf8; background: #38bdf810;
    }
    .wd-show-more {
      text-align: center; padding: 8px; font-size: 11px;
      color: #38bdf8; cursor: pointer; border-radius: 4px;
    }
    .wd-show-more:hover { background: #334155; }

    .wd-price-scale {
      position: relative; height: 6px; margin-top: 3px;
      background: #1e293b; border-radius: 3px; overflow: visible;
    }
    .wd-price-scale-iqr {
      position: absolute; top: 0; bottom: 0; border-radius: 3px;
      background: #334155;
    }
    .wd-price-scale-marker {
      position: absolute; top: -1px; width: 4px; height: 8px;
      border-radius: 1px; transform: translateX(-2px);
    }
  `
  return style
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type Tab = "stats" | "listings"
type SortKey = "price" | "year" | "mileage"
type SortDir = "asc" | "desc"

interface SiteCrawlProgress {
  site: "mobile.bg" | "cars.bg"
  current: number
  total: number
  done: boolean
}

const storage = new Storage()
const DELAY_MS = 300
const CROSS_SITE_MAX_PAGES = 50
const VISIBLE_LISTINGS = 100

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

function detectSite(): "mobile.bg" | "cars.bg" | null {
  const host = window.location.hostname
  if (host.includes("mobile.bg")) return "mobile.bg"
  if (host.includes("cars.bg")) return "cars.bg"
  return null
}

function theOtherSite(s: "mobile.bg" | "cars.bg"): "mobile.bg" | "cars.bg" {
  return s === "mobile.bg" ? "cars.bg" : "mobile.bg"
}

function fetchViaBackground(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "fetchPage", url }, (resp) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!resp || resp.error) {
        reject(new Error(resp?.error ?? "No response"))
        return
      }
      resolve(resp.html)
    })
  })
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html")
}

// ── Range Chart ─────────────────────────────────────────────────────────────

function RangeChart({
  label,
  data,
  unit,
  lang,
}: {
  label: string
  data: MarketStats["price"]
  unit: string
  lang: Lang
}) {
  if (!data) return <div className="wd-no-data">{t("noData", lang)}</div>

  const { min, max, p25, p75, median } = data
  const range = max - min || 1
  const pct = (v: number) => ((v - min) / range) * 100

  return (
    <div className="wd-range-chart">
      <div className="wd-section-title">{label}</div>
      <div className="wd-range-row">
        <span className="wd-range-value wd-range-value-right">
          {fmt(min)} {unit}
        </span>
        <div className="wd-range-bar-wrap">
          <div className="wd-range-whisker" style={{ left: "0%" }} />
          <div
            className="wd-range-iqr"
            style={{
              left: `${pct(p25)}%`,
              width: `${pct(p75) - pct(p25)}%`,
              background: "#38bdf830",
            }}
          />
          <div
            className="wd-range-median"
            style={{ left: `${pct(median)}%`, background: "#38bdf8" }}
          />
          <div className="wd-range-whisker" style={{ right: "0%" }} />
        </div>
        <span className="wd-range-value">{fmt(max)} {unit}</span>
      </div>
      <div className="wd-range-labels">
        <div className="wd-range-labels-spacer" />
        <div className="wd-range-labels-bar">
          <span>P25: {fmt(p25)}</span>
          <span>{t("median", lang)}: {fmt(median)}</span>
          <span>P75: {fmt(p75)}</span>
        </div>
        <div className="wd-range-value" />
      </div>
    </div>
  )
}

// ── Price Scale ─────────────────────────────────────────────────────────

function PriceScale({
  price,
  stats,
  color,
}: {
  price: number | null
  stats: MarketStats["price"]
  color: string
}) {
  if (!price || !stats) return null
  const { min, max, p25, p75 } = stats
  const range = max - min
  if (range <= 0) return null

  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100))

  return (
    <div className="wd-price-scale">
      <div
        className="wd-price-scale-iqr"
        style={{ left: `${pct(p25)}%`, width: `${pct(p75) - pct(p25)}%` }}
      />
      <div
        className="wd-price-scale-marker"
        style={{ left: `${pct(price)}%`, background: color }}
      />
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function MarketPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [tab, setTab] = useState<Tab>("stats")
  const [site, setSite] = useState<"mobile.bg" | "cars.bg" | null>(null)
  const [currentListings, setCurrentListings] = useState<CarListing[]>([])
  const [otherListings, setOtherListings] = useState<CarListing[]>([])
  const [currentProgress, setCurrentProgress] = useState<SiteCrawlProgress | null>(null)
  const [otherProgress, setOtherProgress] = useState<SiteCrawlProgress | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("price")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [showAll, setShowAll] = useState(false)
  const crawlingRef = useRef(false)
  const [lang, setLang] = useStorage<Lang>("wd-lang", DEFAULT_LANG)

  const allListings = useMemo(
    () => [...currentListings, ...otherListings],
    [currentListings, otherListings]
  )
  const combinedStats = useMemo(
    () => (allListings.length >= 2 ? computeStats(allListings) : null),
    [allListings]
  )

  // Keep storage in sync so listing badges use the same combined data
  useEffect(() => {
    if (allListings.length > 0) {
      storage.set("listings:combined", allListings)
    }
  }, [allListings])

  const sortedListings = useMemo(() => {
    const copy = [...allListings]
    copy.sort((a, b) => {
      let aVal: number | null, bVal: number | null
      if (sortKey === "price") { aVal = a.priceEur; bVal = b.priceEur }
      else if (sortKey === "year") { aVal = a.year; bVal = b.year }
      else { aVal = a.mileageKm; bVal = b.mileageKm }
      const aNum = aVal ?? (sortDir === "asc" ? Infinity : -Infinity)
      const bNum = bVal ?? (sortDir === "asc" ? Infinity : -Infinity)
      return sortDir === "asc" ? aNum - bNum : bNum - aNum
    })
    return copy
  }, [allListings, sortKey, sortDir])

  const visibleListings = showAll ? sortedListings : sortedListings.slice(0, VISIBLE_LISTINGS)

  useEffect(() => {
    const detectedSite = detectSite()
    if (!detectedSite) return
    setSite(detectedSite)

    if (crawlingRef.current) return
    crawlingRef.current = true

    // Parse current page from live DOM as initial data
    const livePage =
      detectedSite === "mobile.bg" ? parseMobileBgListings() : parseCarsBgListings()
    setCurrentListings(livePage)

    // Extract full search filters before starting crawls
    const filters = extractSearchFilters(detectedSite)

    // Crawl current site (all pages starting from 1) and other site in parallel
    if (livePage.length > 0) {
      crawlCurrentSite(detectedSite)
      crawlOtherSite(detectedSite, filters)
    }
  }, [])

  // ── Current site multi-page crawl ──────────────────────────────────────

  async function crawlCurrentSite(currentSite: "mobile.bg" | "cars.bg") {
    let totalPages: number
    let buildUrl: (page: number) => string

    if (currentSite === "mobile.bg") {
      const pag = detectMobileBgPagination()
      totalPages = pag.totalPages
      buildUrl = (p) => buildMobileBgPageUrl(pag.baseUrl, p, pag.queryString)
    } else {
      let maxPage = 1
      document.querySelectorAll("script").forEach((script) => {
        const match = (script.textContent || "").match(
          /pageDataList\.maxPage\s*=\s*(\d+)/
        )
        if (match) maxPage = parseInt(match[1])
      })
      if (maxPage <= 1) {
        document.querySelectorAll('a[href*="page="]').forEach((el) => {
          const match = (el.getAttribute("href") ?? "").match(/page=(\d+)/)
          if (match) {
            const p = parseInt(match[1])
            if (p > maxPage) maxPage = p
          }
        })
      }
      totalPages = maxPage
      buildUrl = (p) => {
        const url = new URL(window.location.href)
        url.searchParams.set("page", String(p))
        return url.toString()
      }
    }

    setCurrentProgress({ site: currentSite, current: 0, total: totalPages, done: false })
    const all: CarListing[] = []

    for (let page = 1; page <= totalPages; page++) {
      try {
        const html = await fetchViaBackground(buildUrl(page))
        const doc = parseHtml(html)
        const pageListings =
          currentSite === "mobile.bg"
            ? parseMobileBgListings(doc)
            : parseCarsBgListings(doc)
        all.push(...pageListings)
        setCurrentListings([...all])
      } catch (err) {
        console.warn(`[WheelerDealer] ${currentSite} page ${page} failed:`, err)
      }
      setCurrentProgress({ site: currentSite, current: page, total: totalPages, done: false })
      if (page < totalPages) await wait(DELAY_MS)
    }

    setCurrentProgress({ site: currentSite, current: totalPages, total: totalPages, done: true })
    storage.set(`listings:${currentSite}`, all)
  }

  // ── Cross-site crawl ──────────────────────────────────────────────────

  async function crawlOtherSite(
    currentSite: "mobile.bg" | "cars.bg",
    filters: SearchFilters | null
  ) {
    if (!filters) {
      setOtherProgress(null)
      return
    }

    const target = theOtherSite(currentSite)
    const allOther: CarListing[] = []

    try {
      if (target === "cars.bg") {
        await crawlCarsBg(filters, allOther)
      } else {
        await crawlMobileBg(filters, allOther)
      }
    } catch (err) {
      console.warn(`[WheelerDealer] Cross-site crawl failed:`, err)
    }

    if (allOther.length > 0) {
      storage.set(`listings:${target}`, allOther)
    }
  }

  async function crawlCarsBg(filters: SearchFilters, results: CarListing[]) {
    setOtherProgress({ site: "cars.bg", current: 0, total: 1, done: false })

    const searchHtml = await fetchViaBackground(
      "https://www.cars.bg/carslist.php?conditions[0]=4&conditions[1]=1"
    )
    const searchDoc = parseHtml(searchHtml)
    const filterMaps = parseCarsBgFilterMaps(searchDoc)
    const brandId = findCarsBgBrandId(filterMaps.brands, filters.make)

    if (!brandId) {
      setOtherProgress({ site: "cars.bg", current: 1, total: 1, done: true })
      return
    }

    let modelId: number | undefined
    if (filters.model) {
      try {
        const modelsHtml = await fetchViaBackground(
          `https://www.cars.bg/carslist.php?brandId=${brandId}`
        )
        const modelsDoc = parseHtml(modelsHtml)
        const modelMap = parseCarsBgModels(modelsDoc)
        modelId = findCarsBgModelId(modelMap, filters.model)
      } catch {
        // Fall back to client-side model filtering
      }
    }

    const url1 = buildCarsBgSearchUrl(filters, filterMaps, 1, modelId)
    const html1 = await fetchViaBackground(url1)
    const doc1 = parseHtml(html1)
    let page1 = parseCarsBgListings(doc1)
    if (filters.model && !modelId) page1 = page1.filter((l) => matchesModel(l.title, filters.model!))
    results.push(...page1)
    setOtherListings([...results])

    const totalPages = Math.min(detectTotalPages(doc1, "cars.bg"), CROSS_SITE_MAX_PAGES)
    setOtherProgress({ site: "cars.bg", current: 1, total: totalPages, done: false })

    for (let page = 2; page <= totalPages; page++) {
      try {
        const html = await fetchViaBackground(
          buildCarsBgSearchUrl(filters, filterMaps, page, modelId)
        )
        let listings = parseCarsBgListings(parseHtml(html))
        if (filters.model && !modelId) listings = listings.filter((l) => matchesModel(l.title, filters.model!))
        if (listings.length === 0) break
        results.push(...listings)
        setOtherListings([...results])
      } catch (err) {
        console.warn(`[WheelerDealer] cars.bg page ${page} failed:`, err)
      }
      setOtherProgress({ site: "cars.bg", current: page, total: totalPages, done: false })
      await wait(DELAY_MS)
    }

    setOtherProgress({ site: "cars.bg", current: totalPages, total: totalPages, done: true })
  }

  async function crawlMobileBg(filters: SearchFilters, results: CarListing[]) {
    setOtherProgress({ site: "mobile.bg", current: 0, total: 1, done: false })

    const url1 = buildMobileBgSearchUrl(filters, 1)
    const html1 = await fetchViaBackground(url1)
    const doc1 = parseHtml(html1)
    let page1 = parseMobileBgListings(doc1)
    if (filters.model) page1 = page1.filter((l) => matchesModel(l.title, filters.model!))
    results.push(...page1)
    setOtherListings([...results])

    const totalPages = Math.min(detectTotalPages(doc1, "mobile.bg"), CROSS_SITE_MAX_PAGES)
    setOtherProgress({ site: "mobile.bg", current: 1, total: totalPages, done: false })

    for (let page = 2; page <= totalPages; page++) {
      try {
        const html = await fetchViaBackground(buildMobileBgSearchUrl(filters, page))
        let listings = parseMobileBgListings(parseHtml(html))
        if (filters.model) listings = listings.filter((l) => matchesModel(l.title, filters.model!))
        if (listings.length === 0) break
        results.push(...listings)
        setOtherListings([...results])
      } catch (err) {
        console.warn(`[WheelerDealer] mobile.bg page ${page} failed:`, err)
      }
      setOtherProgress({ site: "mobile.bg", current: page, total: totalPages, done: false })
      await wait(DELAY_MS)
    }

    setOtherProgress({ site: "mobile.bg", current: totalPages, total: totalPages, done: true })
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (!site) return null

  const mobileBgCount =
    currentListings.filter((l) => l.source === "mobile.bg").length +
    otherListings.filter((l) => l.source === "mobile.bg").length
  const carsBgCount =
    currentListings.filter((l) => l.source === "cars.bg").length +
    otherListings.filter((l) => l.source === "cars.bg").length

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function sortLabel(key: SortKey, label: string) {
    if (sortKey !== key) return label
    return `${label} ${sortDir === "asc" ? "▲" : "▼"}`
  }

  function toggleLang(e: React.MouseEvent) {
    e.stopPropagation()
    setLang(lang === "en" ? "bg" : "en")
  }

  function ProgressBar({ p }: { p: SiteCrawlProgress }) {
    if (p.done) return null
    const pctDone = p.total > 0 ? (p.current / p.total) * 100 : 0
    const color = p.site === "mobile.bg" ? "#3b82f6" : "#8b5cf6"
    return (
      <div className="wd-progress">
        <span>
          {p.site}: {p.current}/{p.total}
        </span>
        <div className="wd-progress-bar">
          <div
            className="wd-progress-fill"
            style={{ width: `${pctDone}%`, background: color }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`wd-panel ${collapsed ? "wd-collapsed" : ""}`}>
      <div className="wd-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="wd-header-left">
          <span className="wd-title">WheelerDealer</span>
          <button className="wd-lang-btn" onClick={toggleLang}>
            {lang === "en" ? "BG" : "EN"}
          </button>
        </div>
        <span className="wd-toggle">{collapsed ? "+" : "–"}</span>
      </div>
      <div className="wd-tabs">
        <button
          className={`wd-tab ${tab === "stats" ? "wd-tab-active" : ""}`}
          onClick={() => setTab("stats")}>
          {t("stats", lang)}
        </button>
        <button
          className={`wd-tab ${tab === "listings" ? "wd-tab-active" : ""}`}
          onClick={() => setTab("listings")}>
          {t("listings", lang)} ({allListings.length})
        </button>
      </div>
      <div className="wd-body">
        {/* Progress bars */}
        {currentProgress && !currentProgress.done && (
          <ProgressBar p={currentProgress} />
        )}
        {otherProgress && !otherProgress.done && <ProgressBar p={otherProgress} />}

        {tab === "stats" && (
          <>
            {/* Summary */}
            <div className="wd-summary">
              <div className="wd-summary-box">
                <div className="wd-summary-val">{allListings.length}</div>
                <div className="wd-summary-label">{t("totalListings", lang)}</div>
              </div>
              <div className="wd-summary-box">
                <div className="wd-summary-val">
                  {combinedStats?.price
                    ? `€${fmt(combinedStats.price.median)}`
                    : "—"}
                </div>
                <div className="wd-summary-label">{t("medianPrice", lang)}</div>
              </div>
              <div className="wd-summary-box">
                <div className="wd-summary-val">
                  {combinedStats?.mileage
                    ? `${fmt(combinedStats.mileage.median)}`
                    : "—"}
                </div>
                <div className="wd-summary-label">{t("medianKm", lang)}</div>
              </div>
            </div>

            {/* Source tags */}
            <div className="wd-sources">
              <span
                className="wd-source-tag"
                style={{
                  background: mobileBgCount > 0 ? "#3b82f620" : "#47556920",
                  color: mobileBgCount > 0 ? "#3b82f6" : "#475569",
                }}>
                mobile.bg: {mobileBgCount}
              </span>
              <span
                className="wd-source-tag"
                style={{
                  background: carsBgCount > 0 ? "#8b5cf620" : "#47556920",
                  color: carsBgCount > 0 ? "#8b5cf6" : "#475569",
                }}>
                cars.bg: {carsBgCount}
              </span>
            </div>

            {/* Range charts */}
            <RangeChart
              label={t("priceEur", lang)}
              data={combinedStats?.price ?? null}
              unit="€"
              lang={lang}
            />
            <RangeChart
              label={t("mileageKm", lang)}
              data={combinedStats?.mileage ?? null}
              unit="km"
              lang={lang}
            />

            {allListings.length === 0 && (
              <div className="wd-no-data" style={{ marginTop: 12 }}>
                {t("navigateToSearch", lang)}
              </div>
            )}
          </>
        )}

        {tab === "listings" && (
          <>
            <div className="wd-sort-bar">
              <button
                className={`wd-sort-btn ${sortKey === "price" ? "wd-sort-btn-active" : ""}`}
                onClick={() => handleSort("price")}>
                {sortLabel("price", t("price", lang))}
              </button>
              <button
                className={`wd-sort-btn ${sortKey === "year" ? "wd-sort-btn-active" : ""}`}
                onClick={() => handleSort("year")}>
                {sortLabel("year", t("year", lang))}
              </button>
              <button
                className={`wd-sort-btn ${sortKey === "mileage" ? "wd-sort-btn-active" : ""}`}
                onClick={() => handleSort("mileage")}>
                {sortLabel("mileage", t("mileage", lang))}
              </button>
            </div>
            {visibleListings.length === 0 ? (
              <div className="wd-no-data">{t("noListings", lang)}</div>
            ) : (
              <div className="wd-listings">
                {visibleListings.map((listing) => {
                  const pos = combinedStats
                    ? getMarketPosition(listing, combinedStats)
                    : null
                  const isMobile = listing.source === "mobile.bg"
                  const posLabel = pos ? t(pos.labelKey, lang) : ""
                  return (
                    <a
                      key={`${listing.source}-${listing.id}`}
                      className="wd-listing-row"
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.preventDefault()
                        window.open(listing.url, "_blank")
                      }}>
                      <span
                        className="wd-listing-dot"
                        style={{ background: pos?.color ?? "#64748b" }}
                        title={posLabel}
                      />
                      <span
                        className="wd-listing-source"
                        style={{
                          background: isMobile ? "#3b82f620" : "#8b5cf620",
                          color: isMobile ? "#3b82f6" : "#8b5cf6",
                        }}>
                        {isMobile ? "M" : "C"}
                      </span>
                      <div className="wd-listing-info">
                        <div className="wd-listing-title">{listing.title}</div>
                        <div className="wd-listing-meta">
                          {[
                            listing.year,
                            listing.mileageKm !== null
                              ? `${fmt(listing.mileageKm)} km`
                              : null,
                            listing.fuelType,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                        <PriceScale
                          price={listing.priceEur}
                          stats={combinedStats?.price ?? null}
                          color={pos?.color ?? "#64748b"}
                        />
                      </div>
                      <span
                        className="wd-listing-price"
                        style={{ color: pos?.color ?? "#e2e8f0" }}>
                        {listing.priceEur !== null
                          ? `€${fmt(listing.priceEur)}`
                          : "—"}
                      </span>
                    </a>
                  )
                })}
                {!showAll && sortedListings.length > VISIBLE_LISTINGS && (
                  <div className="wd-show-more" onClick={() => setShowAll(true)}>
                    {t("showAll", lang)} {sortedListings.length} {t("listings", lang).toLowerCase()}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
