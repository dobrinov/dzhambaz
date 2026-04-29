import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState, useRef, useMemo } from "react"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import type { CarListing, MarketStats } from "~shared/types"
import { computeStats } from "~shared/stats"
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
import {
  type EstimateInputs,
  DEFAULT_INPUTS,
  estimateCarPrice,
} from "~shared/estimate"
import { PANEL_CSS } from "~shared/panel-styles"
import {
  type Verdict,
  type Histogram,
  HIST_BINS,
  VERDICT_STYLE,
  fmt,
  fmtK,
  buildHistogram,
  verdictFor,
  pricePct,
  sortedMedian,
} from "~shared/panel-helpers"

export const config: PlasmoCSConfig = {
  matches: ["*://www.mobile.bg/*", "*://www.cars.bg/*"],
  run_at: "document_idle",
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = PANEL_CSS
  return style
}

// ── Types and helpers ─────────────────────────────────────────────────────

type Tab = "stats" | "listings" | "price"
type SortKey = "deal" | "price" | "year" | "mileage"
type SortDir = "asc" | "desc"

const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  deal: "desc",   // best first
  price: "asc",   // cheapest first
  year: "desc",   // newest first
  mileage: "asc", // lowest km first
}

interface SiteCrawlProgress {
  site: "mobile.bg" | "cars.bg"
  current: number
  total: number
  done: boolean
}

// `local` (10 MB) — `sync` (default) has an 8 KB per-item cap that silently
// fails for full listings arrays, breaking the listing-badge content script.
const storage = new Storage({ area: "local" })
const DELAY_MS = 300
const CROSS_SITE_MAX_PAGES = 50
const VISIBLE_LISTINGS = 100
const SHARE_URL =
  "https://chromewebstore.google.com/detail/%D0%B4%D0%B6%D0%B0%D0%BC%D0%B1%D0%B0%D0%B7/kkophgnekddlppofhboagediccplblgn"

function detectSite(): "mobile.bg" | "cars.bg" | null {
  const host = window.location.hostname
  if (host.includes("mobile.bg")) return "mobile.bg"
  if (host.includes("cars.bg")) return "cars.bg"
  return null
}

function isSearchResultsPage(site: "mobile.bg" | "cars.bg"): boolean {
  const path = window.location.pathname.toLowerCase()
  if (site === "mobile.bg") {
    // `/search/` is the form page, `/obiavi/` (canonical) is the results page.
    return path.startsWith("/obiavi") || path.startsWith("/search")
  }
  if (site === "cars.bg") return path.includes("carslist")
  return false
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

/**
 * Stable key for a search: site + sorted filter entries. Pagination-independent.
 * Changes when the user picks a different make/model/filter; stays stable
 * when they move between pages of the same search.
 */
function searchKeyOf(site: string, filters: SearchFilters | null): string {
  if (!filters) return site
  const parts: string[] = [site]
  const entries = Object.entries(filters)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
  for (const [k, v] of entries) parts.push(`${k}=${v}`)
  return parts.join("|")
}

// ── Main component ──────────────────────────────────────────────────────────

export default function MarketPanel() {
  const [panelState, setPanelState] = useStorage<"open" | "mini">("wd-panel-state", "open")
  const [miniPosStored, setMiniPosStored] = useStorage<{ x: number; y: number } | null>(
    "wd-mini-pos",
    null
  )
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // User preferences
  const [prefAutoOpen, setPrefAutoOpen] = useStorage<boolean>("wd-pref-auto-open", true)
  const [prefCrossSite, setPrefCrossSite] = useStorage<boolean>("wd-pref-cross-site", true)
  const [prefNewTab, setPrefNewTab] = useStorage<boolean>("wd-pref-new-tab", true)
  const [prefOutlierAlerts, setPrefOutlierAlerts] = useStorage<boolean>(
    "wd-pref-outlier-alerts",
    true
  )
  const [lastSearchKey, setLastSearchKey] = useStorage<string | null>("wd-last-search", null)
  const [tab, setTab] = useState<Tab>("stats")
  const [site, setSite] = useState<"mobile.bg" | "cars.bg" | null>(null)
  const [isSearchPage, setIsSearchPage] = useState(false)
  const [currentListings, setCurrentListings] = useState<CarListing[]>([])
  const [otherListings, setOtherListings] = useState<CarListing[]>([])
  const [currentProgress, setCurrentProgress] = useState<SiteCrawlProgress | null>(null)
  const [otherProgress, setOtherProgress] = useState<SiteCrawlProgress | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("deal")
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR.deal)

  function selectSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(DEFAULT_SORT_DIR[key])
    }
  }
  const [listingFilter, setListingFilter] = useState<"all" | "deals" | "outliers">("all")
  const [showAll, setShowAll] = useState(false)
  const [filters, setFilters] = useState<SearchFilters | null>(null)
  const crawlingRef = useRef(false)
  const [lang, setLang] = useStorage<Lang>("wd-lang", DEFAULT_LANG)
  // Use chrome.storage.local — sync caps at 120 writes/minute, which slider
  // drags blow through (each step fires onChange).
  const [estimateInputs, setEstimateInputs] = useStorage<EstimateInputs>(
    { key: "wd-estimate-inputs", instance: storage },
    DEFAULT_INPUTS
  )

  const allListings = useMemo(
    () => [...currentListings, ...otherListings],
    [currentListings, otherListings]
  )
  const combinedStats = useMemo(
    () => (allListings.length >= 2 ? computeStats(allListings) : null),
    [allListings]
  )
  const estimate = useMemo(
    () => estimateCarPrice(allListings, estimateInputs ?? DEFAULT_INPUTS),
    [allListings, estimateInputs]
  )

  // Pre-compute verdicts and histograms
  const verdictByKey = useMemo(() => {
    const m = new Map<string, Verdict>()
    if (!combinedStats?.price) return m
    allListings.forEach((l) => {
      if (l.priceEur == null) return
      m.set(`${l.source}-${l.id}`, verdictFor(l.priceEur, combinedStats.price))
    })
    return m
  }, [allListings, combinedStats])

  // Histograms are built within the stats (outlier-filtered) range so the
  // bins share a coordinate system with the p25/median/p75 markers.
  const priceHist = useMemo(() => {
    const range = combinedStats?.price
    if (!range) return null
    const prices = allListings
      .map((l) => l.priceEur)
      .filter((p): p is number => p != null && p >= range.min && p <= range.max)
    return buildHistogram(prices, HIST_BINS)
  }, [allListings, combinedStats])

  const kmHist = useMemo(() => {
    const range = combinedStats?.mileage
    if (!range) return null
    const km = allListings
      .map((l) => l.mileageKm)
      .filter((m): m is number => m != null && m >= range.min && m <= range.max)
    return buildHistogram(km, HIST_BINS)
  }, [allListings, combinedStats])

  const outlierCount = useMemo(() => {
    let n = 0
    verdictByKey.forEach((v) => { if (v === "outlier") n++ })
    return n
  }, [verdictByKey])

  const dealCount = useMemo(() => {
    let n = 0
    verdictByKey.forEach((v) => { if (v === "under") n++ })
    return n
  }, [verdictByKey])

  function updateInput<K extends keyof EstimateInputs>(
    key: K,
    value: EstimateInputs[K]
  ) {
    setEstimateInputs({ ...(estimateInputs ?? DEFAULT_INPUTS), [key]: value })
  }

  useEffect(() => {
    if (allListings.length > 0) {
      storage.set("listings:combined", allListings)
    }
  }, [allListings])

  const verdictRank: Record<Verdict, number> = { under: 0, fair: 1, over: 2, outlier: 3 }

  const sortedListings = useMemo(() => {
    let arr = [...allListings]
    if (listingFilter === "deals") {
      arr = arr.filter((l) => {
        const v = verdictByKey.get(`${l.source}-${l.id}`)
        return v === "under" || v === "fair"
      })
    } else if (listingFilter === "outliers") {
      arr = arr.filter((l) => verdictByKey.get(`${l.source}-${l.id}`) === "outlier")
    }
    arr.sort((a, b) => {
      if (sortKey === "deal") {
        // desc = best first (low rank, low price tiebreak); asc = worst first.
        const va = verdictByKey.get(`${a.source}-${a.id}`) ?? "fair"
        const vb = verdictByKey.get(`${b.source}-${b.id}`) ?? "fair"
        const sign = sortDir === "desc" ? 1 : -1
        const d = verdictRank[va] - verdictRank[vb]
        if (d !== 0) return d * sign
        return ((a.priceEur ?? Infinity) - (b.priceEur ?? Infinity)) * sign
      }
      let aVal: number | null, bVal: number | null
      if (sortKey === "price") { aVal = a.priceEur; bVal = b.priceEur }
      else if (sortKey === "year") { aVal = a.year; bVal = b.year }
      else { aVal = a.mileageKm; bVal = b.mileageKm }
      const sign = sortDir === "asc" ? 1 : -1
      return ((aVal ?? Infinity) - (bVal ?? Infinity)) * sign
    })
    return arr
  }, [allListings, sortKey, sortDir, listingFilter, verdictByKey])

  const visibleListings = showAll ? sortedListings : sortedListings.slice(0, VISIBLE_LISTINGS)

  useEffect(() => {
    const detectedSite = detectSite()
    if (!detectedSite) return
    setSite(detectedSite)

    const livePage =
      detectedSite === "mobile.bg" ? parseMobileBgListings() : parseCarsBgListings()

    const onSearchPage = livePage.length > 0 || isSearchResultsPage(detectedSite)
    setIsSearchPage(onSearchPage)

    // If this is not a search page (e.g., a listing detail page the user
    // clicked through from our panel), hydrate from the last crawl's cache
    // so the market context follows them across the session.
    if (!onSearchPage) {
      ;(async () => {
        const cachedMob = await storage.get<CarListing[]>("listings:mobile.bg")
        const cachedCar = await storage.get<CarListing[]>("listings:cars.bg")
        if (detectedSite === "mobile.bg") {
          if (cachedMob?.length) setCurrentListings(cachedMob)
          if (cachedCar?.length) setOtherListings(cachedCar)
        } else {
          if (cachedCar?.length) setCurrentListings(cachedCar)
          if (cachedMob?.length) setOtherListings(cachedMob)
        }
      })()
      return
    }

    if (crawlingRef.current) return
    crawlingRef.current = true

    setCurrentListings(livePage)

    const extractedFilters = extractSearchFilters(detectedSite)
    setFilters(extractedFilters)

    // Detect "new search": stable key derived from site + filters. Pagination
    // within the same search keeps the key stable; changing make/model/filters
    // produces a new key. Auto-open the drawer when the key changes (if the
    // user hasn't disabled that preference).
    const key = searchKeyOf(detectedSite, extractedFilters)
    if (key !== lastSearchKey) {
      setLastSearchKey(key)
      if (prefAutoOpen) setPanelState("open")
    }

    if (livePage.length > 0) {
      crawlCurrentSite(detectedSite)
      if (prefCrossSite) crawlOtherSite(detectedSite, extractedFilters)
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
        console.warn(`[Джамбаз] ${currentSite} page ${page} failed:`, err)
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
      console.warn(`[Джамбаз] Cross-site crawl failed:`, err)
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
        console.warn(`[Джамбаз] cars.bg page ${page} failed:`, err)
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
        console.warn(`[Джамбаз] mobile.bg page ${page} failed:`, err)
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

  function toggleLang(e: React.MouseEvent) {
    e.stopPropagation()
    setLang(lang === "en" ? "bg" : "en")
  }

  // Unified scan bar combining current + cross-site progress
  const scanningActive =
    (currentProgress && !currentProgress.done) ||
    (otherProgress && !otherProgress.done)

  if (panelState === "mini") {
    return (
      <MiniIcon
        storedPos={miniPosStored}
        dragPos={dragPos}
        setDragPos={setDragPos}
        onPersistPos={(pos) => setMiniPosStored(pos)}
        onOpen={() => setPanelState("open")}
      />
    )
  }

  return (
    <div className="dbz-panel">
      <div className="dbz-head">
        <span className="dbz-brand">Джамбаз</span>
        <div className="dbz-head-actions">
          <button className="dbz-lang" onClick={toggleLang}>
            {lang === "en" ? "BG" : "EN"}
          </button>
          <button
            className="dbz-hide-btn"
            title={t("share", lang)}
            onClick={() => window.open(SHARE_URL, "_blank", "noopener,noreferrer")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
          <button
            className="dbz-hide-btn"
            title={t("settingsTitle", lang)}
            onClick={() => setShowSettings(!showSettings)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="2.5"/>
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
            </svg>
          </button>
          <button
            className="dbz-hide-btn"
            title="Close"
            onClick={() => setPanelState("mini")}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
          </button>
        </div>
      </div>

      {showSettings ? (
        <SettingsView
          lang={lang}
          autoOpen={prefAutoOpen ?? true}
          setAutoOpen={setPrefAutoOpen}
          crossSite={prefCrossSite ?? true}
          setCrossSite={setPrefCrossSite}
          newTab={prefNewTab ?? true}
          setNewTab={setPrefNewTab}
          outlierAlerts={prefOutlierAlerts ?? true}
          setOutlierAlerts={setPrefOutlierAlerts}
          onBack={() => setShowSettings(false)}
          onClearData={async () => {
            await Promise.all([
              storage.remove("listings:mobile.bg"),
              storage.remove("listings:cars.bg"),
              storage.remove("listings:combined"),
              storage.remove("wd-last-search"),
            ])
            setCurrentListings([])
            setOtherListings([])
            setLastSearchKey(null)
            setShowSettings(false)
          }}
        />
      ) : !isSearchPage && allListings.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <>
          <div className="dbz-tabs">
            <button
              className={`dbz-tab ${tab === "stats" ? "dbz-tab-active" : ""}`}
              onClick={() => setTab("stats")}>
              {t("stats", lang)}
            </button>
            <button
              className={`dbz-tab ${tab === "listings" ? "dbz-tab-active" : ""}`}
              onClick={() => setTab("listings")}>
              {t("listings", lang)}<span className="dbz-count">{allListings.length}</span>
            </button>
            <button
              className={`dbz-tab ${tab === "price" ? "dbz-tab-active" : ""}`}
              onClick={() => setTab("price")}>
              {t("priceMyCar", lang)}
            </button>
          </div>

          {scanningActive && (
            <ScanBar
              current={currentProgress}
              other={otherProgress}
              currentSite={site}
              lang={lang}
            />
          )}

          <div className="dbz-body">
            {tab === "stats" && (
              <StatsTab
                allListings={allListings}
                stats={combinedStats}
                priceHist={priceHist}
                kmHist={kmHist}
                outlierCount={outlierCount}
                showOutlierAlert={prefOutlierAlerts ?? true}
                mobileBgCount={mobileBgCount}
                carsBgCount={carsBgCount}
                filters={filters}
                lang={lang}
              />
            )}

            {tab === "listings" && (
              <ListingsTab
                listings={visibleListings}
                total={sortedListings.length}
                allListings={allListings}
                verdicts={verdictByKey}
                stats={combinedStats?.price ?? null}
                sortKey={sortKey}
                sortDir={sortDir}
                onSelectSort={selectSort}
                filter={listingFilter}
                setFilter={setListingFilter}
                dealCount={dealCount}
                outlierCount={outlierCount}
                showAll={showAll}
                onShowAll={() => setShowAll(true)}
                newTab={prefNewTab ?? true}
                lang={lang}
              />
            )}

            {tab === "price" && (
              <PriceTab
                inputs={estimateInputs ?? DEFAULT_INPUTS}
                updateInput={updateInput}
                estimate={estimate}
                lang={lang}
                haveListings={allListings.length > 0}
                newTab={prefNewTab ?? true}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EmptyState({ lang }: { lang: Lang }) {
  return (
    <div className="dbz-empty">
      <div className="dbz-empty-eyebrow">{t("emptyEyebrow", lang)}</div>
      <h1
        className="dbz-empty-title"
        dangerouslySetInnerHTML={{ __html: t("emptyTitle", lang) }}
      />
      <div className="dbz-empty-body">
        {t("emptyBodyBefore", lang)}{" "}
        <span className="dbz-mono">mobile.bg</span>{" "}{t("emptyBodyOr", lang)}{" "}
        <span className="dbz-mono">cars.bg</span>{t("emptyBodyAfter", lang)}
      </div>
      <div className="dbz-empty-bullets">
        <div className="dbz-empty-bullet"><span className="dbz-n">01</span>{t("emptyBullet1", lang)}</div>
        <div className="dbz-empty-bullet"><span className="dbz-n">02</span>{t("emptyBullet2", lang)}</div>
        <div className="dbz-empty-bullet"><span className="dbz-n">03</span>{t("emptyBullet3", lang)}</div>
        <div className="dbz-empty-bullet"><span className="dbz-n">04</span>{t("emptyBullet4", lang)}</div>
      </div>
      <div className="dbz-footer-fine">{t("emptyFoot", lang)}</div>
    </div>
  )
}

function ScanBar({
  current,
  other,
  currentSite,
  lang,
}: {
  current: SiteCrawlProgress | null
  other: SiteCrawlProgress | null
  currentSite: "mobile.bg" | "cars.bg"
  lang: Lang
}) {
  const p = current ?? other
  if (!p) return null
  const pct = p.total > 0 ? (p.current / p.total) * 100 : 0
  const otherSite = other && other.site !== currentSite ? other : null
  return (
    <div className="dbz-scanbar">
      <span className="dbz-scan-site">
        {t("scan", lang)} <b>{p.site}</b>
      </span>
      <div className="dbz-scan-track">
        <div className="dbz-scan-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="dbz-scan-pct">{p.current}/{p.total}</span>
      {otherSite && (
        <>
          <span style={{ color: "#475569" }}>·</span>
          <span style={{ color: "#475569" }}>
            {otherSite.site} {otherSite.current}/{Math.max(1, otherSite.total)}
          </span>
        </>
      )}
    </div>
  )
}

function StatsTab({
  allListings,
  stats,
  priceHist,
  kmHist,
  outlierCount,
  showOutlierAlert,
  mobileBgCount,
  carsBgCount,
  filters,
  lang,
}: {
  allListings: CarListing[]
  stats: ReturnType<typeof computeStats> | null
  priceHist: Histogram | null
  kmHist: Histogram | null
  outlierCount: number
  showOutlierAlert: boolean
  mobileBgCount: number
  carsBgCount: number
  filters: SearchFilters | null
  lang: Lang
}) {
  if (allListings.length === 0) {
    return <div className="dbz-no-data">{t("navigateToSearch", lang)}</div>
  }

  const years = allListings.map((l) => l.year).filter((y): y is number => y != null && y > 1900)
  const yearMin = years.length ? Math.min(...years) : null
  const yearMax = years.length ? Math.max(...years) : null
  const yearMedian = years.length ? sortedMedian(years) : null

  return (
    <>
      <div className="dbz-context">
        <div>
          <div className="dbz-eyebrow">{t("market", lang)}</div>
          <div className="dbz-context-title">
            {filters?.make
              ? `${filters.make}${filters.model ? ` ${filters.model}` : ""}`
              : allListings[0]?.title?.split(/[·.,]/)[0]?.slice(0, 32) ?? t("listings", lang)}
            {yearMin && yearMax ? ` · ${yearMin}–${yearMax}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="dbz-eyebrow">{t("base", lang)}</div>
          <div className="dbz-mono" style={{ fontSize: 11, color: "#cbd5e1" }}>
            {allListings.length} {t("listingsShort", lang)}
          </div>
        </div>
      </div>

      <div className="dbz-chips">
        <span className={`dbz-chip ${mobileBgCount > 0 ? "dbz-chip-active" : "dbz-chip-dim"}`}>
          mobile.bg · {mobileBgCount}
        </span>
        <span className={`dbz-chip ${carsBgCount > 0 ? "dbz-chip-active" : "dbz-chip-dim"}`}>
          cars.bg · {carsBgCount}
        </span>
      </div>

      {stats?.price ? (
        <div className="dbz-hero">
          <div className="dbz-eyebrow">{t("medianPrice", lang)}</div>
          <div className="dbz-hero-value">€{fmt(stats.price.median)}</div>
          <div className="dbz-hero-sub">
            <span>P25 <b>€{fmt(stats.price.p25)}</b></span>
            <span>P75 <b>€{fmt(stats.price.p75)}</b></span>
            <span>{t("rangeShort", lang)} <b>€{fmtK(stats.price.min)} – €{fmtK(stats.price.max)}</b></span>
          </div>
        </div>
      ) : null}

      <div className="dbz-ministats">
        <MiniStat
          label={t("medianKm", lang)}
          value={stats?.mileage ? fmt(stats.mileage.median) : "—"}
          hint={stats?.mileage ? `${fmtK(stats.mileage.min)} – ${fmtK(stats.mileage.max)}` : ""}
        />
        <MiniStat
          label={t("medianYear", lang)}
          value={yearMedian != null ? String(yearMedian) : "—"}
          hint={yearMin && yearMax ? `${yearMin} – ${yearMax}` : ""}
        />
      </div>

      {priceHist && stats?.price && (
        <Distro
          title={t("priceEur", lang)}
          hist={priceHist}
          stats={stats.price}
          format={(v) => "€" + fmt(v)}
          formatShort={(v) => "€" + fmtK(v)}
          lang={lang}
        />
      )}

      {kmHist && stats?.mileage && (
        <>
          <div className="dbz-divider" />
          <Distro
            title={t("mileageKm", lang)}
            hist={kmHist}
            stats={stats.mileage}
            format={(v) => fmtK(v) + " km"}
            formatShort={(v) => fmtK(v)}
            lang={lang}
          />
        </>
      )}

      {showOutlierAlert && outlierCount > 0 && (
        <div className="dbz-insight">
          <div className="dbz-insight-icon">⚑</div>
          <div>
            <div className="dbz-insight-title">{t("insightTitle", lang)}</div>
            <div className="dbz-insight-body">
              {outlierCount} {outlierCount === 1 ? t("insightBody1", lang) : t("insightBodyN", lang)}
            </div>
          </div>
        </div>
      )}
    </>
  )
}


function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="dbz-ministat">
      <div className="dbz-ministat-label">{label}</div>
      <div className="dbz-ministat-val">{value}</div>
      {hint && <div className="dbz-ministat-hint">{hint}</div>}
    </div>
  )
}

function Distro({
  title,
  hist,
  stats,
  format,
  formatShort,
  lang,
}: {
  title: string
  hist: Histogram
  stats: { min: number; max: number; p25: number; p75: number; median: number }
  format: (v: number) => string
  formatShort: (v: number) => string
  lang: Lang
}) {
  const maxCount = Math.max(...hist.counts)
  // Bins and markers share the same coordinate space (hist.min → hist.max,
  // which was filtered to the stats range by the parent useMemo).
  const coordMin = hist.min
  const coordRange = (hist.max - hist.min) || 1
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - coordMin) / coordRange) * 100))

  return (
    <div className="dbz-distro">
      <div className="dbz-distro-head">
        <span className="dbz-eyebrow">{title}</span>
        <span className="dbz-distro-range">{format(hist.min)} → {format(hist.max)}</span>
      </div>

      <div className="dbz-hist">
        {hist.counts.map((c, i) => {
          const h = maxCount ? (c / maxCount) * 100 : 0
          const binCenter = hist.min + (i + 0.5) * hist.step
          const inIQR = binCenter >= stats.p25 && binCenter <= stats.p75
          return (
            <div
              key={i}
              className={`dbz-hist-bar ${inIQR ? "dbz-hist-bar-iqr" : ""}`}
              style={{ height: `${Math.max(4, h)}%` }}
            />
          )
        })}
        <div className="dbz-hist-median" style={{ left: `${pct(stats.median)}%` }} />
      </div>
      <div className="dbz-hist-base" />
      <div className="dbz-axis">
        <AxisTick pct={pct(stats.p25)} label="P25" value={formatShort(stats.p25)} />
        <AxisTick pct={pct(stats.median)} label={t("median", lang)} value={formatShort(stats.median)} emphasize />
        <AxisTick pct={pct(stats.p75)} label="P75" value={formatShort(stats.p75)} />
      </div>
    </div>
  )
}

function AxisTick({
  pct,
  label,
  value,
  emphasize,
}: {
  pct: number
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div
      className={`dbz-tick ${emphasize ? "dbz-tick-emphasize" : ""}`}
      style={{ left: `${pct}%` }}>
      <div className="dbz-tick-label">{label}</div>
      <div className="dbz-tick-val">{value}</div>
    </div>
  )
}

// ── Listings tab ────────────────────────────────────────────────────────────

function ListingsTab({
  listings,
  total,
  allListings,
  verdicts,
  stats,
  sortKey,
  sortDir,
  onSelectSort,
  filter,
  setFilter,
  dealCount,
  outlierCount,
  showAll,
  onShowAll,
  newTab,
  lang,
}: {
  listings: CarListing[]
  total: number
  allListings: CarListing[]
  verdicts: Map<string, Verdict>
  stats: MarketStats["price"]
  sortKey: SortKey
  sortDir: SortDir
  onSelectSort: (k: SortKey) => void
  filter: "all" | "deals" | "outliers"
  setFilter: (f: "all" | "deals" | "outliers") => void
  dealCount: number
  outlierCount: number
  showAll: boolean
  onShowAll: () => void
  newTab: boolean
  lang: Lang
}) {
  const iqrLeft = stats ? ((stats.p25 - stats.min) / (stats.max - stats.min || 1)) * 100 : 25
  const iqrRight = stats ? 100 - ((stats.p75 - stats.min) / (stats.max - stats.min || 1)) * 100 : 25

  return (
    <>
      <div className="dbz-toolbar">
        <span className="dbz-eyebrow" style={{ marginRight: 4 }}>{t("sort", lang)}</span>
        <SortBtn active={sortKey === "deal"} dir={sortKey === "deal" ? sortDir : DEFAULT_SORT_DIR.deal} onClick={() => onSelectSort("deal")}>
          {t("sortDeal", lang)}
        </SortBtn>
        <SortBtn active={sortKey === "price"} dir={sortKey === "price" ? sortDir : DEFAULT_SORT_DIR.price} onClick={() => onSelectSort("price")}>
          {t("price", lang)}
        </SortBtn>
        <SortBtn active={sortKey === "year"} dir={sortKey === "year" ? sortDir : DEFAULT_SORT_DIR.year} onClick={() => onSelectSort("year")}>
          {t("year", lang)}
        </SortBtn>
        <SortBtn active={sortKey === "mileage"} dir={sortKey === "mileage" ? sortDir : DEFAULT_SORT_DIR.mileage} onClick={() => onSelectSort("mileage")}>
          {t("mileage", lang)}
        </SortBtn>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <span className="dbz-eyebrow" style={{ marginRight: 2 }}>{t("filter", lang)}</span>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={allListings.length}>
          {t("filterAll", lang)}
        </FilterChip>
        <FilterChip active={filter === "deals"} onClick={() => setFilter("deals")} count={dealCount} color="mint">
          {t("filterDeals", lang)}
        </FilterChip>
        <FilterChip active={filter === "outliers"} onClick={() => setFilter("outliers")} count={outlierCount} color="red">
          ⚑ {t("filterOutliers", lang)}
        </FilterChip>
      </div>

      {listings.length === 0 ? (
        <div className="dbz-no-data">{t("noListings", lang)}</div>
      ) : (
        <div className="dbz-list">
          {listings.map((l) => {
            const v = verdicts.get(`${l.source}-${l.id}`) ?? "fair"
            const vs = VERDICT_STYLE[v]
            const isMobile = l.source === "mobile.bg"
            const price = l.priceEur
            const pct = price != null && stats ? pricePct(price, stats) : 50
            return (
              <a
                key={`${l.source}-${l.id}`}
                className="dbz-listing"
                href={l.url}
                target={newTab ? "_blank" : "_self"}
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault()
                  window.open(l.url, newTab ? "_blank" : "_self")
                }}>
                <div className={`dbz-srcbadge ${isMobile ? "dbz-srcbadge-m" : "dbz-srcbadge-c"}`}>
                  {isMobile ? "m" : "c"}
                </div>
                <div className="dbz-listing-info">
                  <div className="dbz-listing-title">{l.title}</div>
                  <div className="dbz-listing-meta">
                    {[l.year, l.mileageKm != null ? `${fmt(l.mileageKm)} km` : null, l.fuelType]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {price != null && stats && (
                    <div className="dbz-posbar">
                      <div className="dbz-posbar-iqr" style={{ left: `${iqrLeft}%`, right: `${iqrRight}%` }} />
                      <div className="dbz-posbar-dot" style={{ left: `${pct}%`, background: vs.color }} />
                    </div>
                  )}
                </div>
                <div className="dbz-listing-right">
                  <div className="dbz-listing-price" style={{ color: vs.color }}>
                    {price != null ? `€${fmt(price)}` : "—"}
                  </div>
                  <div className="dbz-verdict" style={{ color: vs.color }}>
                    <span>{vs.symbol}</span>
                    <span>{t(vs.key, lang)}</span>
                  </div>
                </div>
              </a>
            )
          })}
          {!showAll && total > VISIBLE_LISTINGS && (
            <div className="dbz-show-more" onClick={onShowAll}>
              {t("showAll", lang)} {total} {t("listings", lang).toLowerCase()}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function SortBtn({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean
  dir: SortDir
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      className={`dbz-sortbtn ${active ? "dbz-sortbtn-active" : ""}`}
      onClick={onClick}>
      {children}
      <span className={`dbz-sortbtn-arrow ${active ? "active" : ""}`}>
        {dir === "desc" ? "↓" : "↑"}
      </span>
    </button>
  )
}

function FilterChip({
  active,
  onClick,
  children,
  count,
  color,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count: number
  color?: "mint" | "red"
}) {
  const cls = active
    ? color === "mint" ? "dbz-chip dbz-chip-mint"
      : color === "red" ? "dbz-chip dbz-chip-red"
      : "dbz-chip dbz-chip-active"
    : "dbz-chip"
  return (
    <button
      className={cls}
      style={{ appearance: "none", cursor: "pointer", fontFamily: "inherit" }}
      onClick={onClick}>
      {children}
      <span className="dbz-mono" style={{ fontSize: 9, opacity: 0.7, marginLeft: 3 }}>{count}</span>
    </button>
  )
}

// ── Price mine tab ──────────────────────────────────────────────────────────

function PriceTab({
  inputs,
  updateInput,
  estimate,
  lang,
  haveListings,
  newTab,
}: {
  inputs: EstimateInputs
  updateInput: <K extends keyof EstimateInputs>(k: K, v: EstimateInputs[K]) => void
  estimate: ReturnType<typeof estimateCarPrice>
  lang: Lang
  haveListings: boolean
  newTab: boolean
}) {
  const mileageStr = inputs.mileageKm === null ? "" : String(inputs.mileageKm)
  const yearStr = inputs.year === null ? "" : String(inputs.year)

  function parseNum(s: string, max = 2_000_000): number | null {
    const n = parseInt(s.replace(/\D+/g, ""), 10)
    if (!Number.isFinite(n) || n <= 0) return null
    return Math.min(n, max)
  }

  return (
    <>
      <div className="dbz-eyebrow" style={{ marginBottom: 12 }}>{t("yourCar", lang)}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <div className="dbz-field-label">
            <span>{t("yourMileageShort", lang)}</span>
            <span className="dbz-field-hint">км</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={7}
            className="dbz-input"
            value={mileageStr}
            placeholder="150000"
            onChange={(e) => updateInput("mileageKm", parseNum(e.target.value))}
          />
        </div>
        <div>
          <div className="dbz-field-label">
            <span>{t("yourYearShort", lang)}</span>
            <span className="dbz-field-hint">{t("optionalShort", lang)}</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            className="dbz-input"
            value={yearStr}
            placeholder="2015"
            onChange={(e) => updateInput("year", parseNum(e.target.value, 9999))}
          />
        </div>
      </div>

      <div className="dbz-field">
        <div className="dbz-field-label">{t("urgency", lang)}</div>
        <input
          type="range" min={0} max={100} step={5}
          className="dbz-slider"
          value={inputs.urgency}
          onChange={(e) => updateInput("urgency", parseInt(e.target.value, 10))}
        />
        <div className="dbz-slider-ticks">
          <span>{t("urgencyPatient", lang)}</span>
          <b>{t("urgencyBalanced", lang)}</b>
          <span>{t("urgencyUrgent", lang)}</span>
        </div>
      </div>

      <div className="dbz-field">
        <div className="dbz-field-label">{t("condition", lang)}</div>
        <input
          type="range" min={0} max={100} step={5}
          className="dbz-slider"
          value={inputs.condition}
          onChange={(e) => updateInput("condition", parseInt(e.target.value, 10))}
        />
        <div className="dbz-slider-ticks">
          <span>{t("conditionPoor", lang)}</span>
          <span>{t("conditionExcellent", lang)}</span>
        </div>
      </div>

      <div className="dbz-field">
        <div className="dbz-field-label">{t("extras", lang)}</div>
        <input
          type="range" min={0} max={100} step={5}
          className="dbz-slider"
          value={inputs.extras}
          onChange={(e) => updateInput("extras", parseInt(e.target.value, 10))}
        />
        <div className="dbz-slider-ticks">
          <span>{t("extrasBare", lang)}</span>
          <span>{t("extrasLoaded", lang)}</span>
        </div>
      </div>

      {inputs.mileageKm === null ? (
        <div className="dbz-no-data" style={{ marginTop: 8 }}>{t("enterMileage", lang)}</div>
      ) : !estimate ? (
        <div className="dbz-no-data" style={{ marginTop: 8 }}>
          {haveListings ? t("notEnoughData", lang) : t("navigateToSearch", lang)}
        </div>
      ) : (
        <ValueResult estimate={estimate} lang={lang} />
      )}

      {estimate && estimate.nearest.length > 0 && (
        <>
          <div className="dbz-divider" />
          <div className="dbz-eyebrow" style={{ marginBottom: 10 }}>{t("similarListings", lang)}</div>
          <div className="dbz-list">
            {estimate.nearest.map((l) => {
              const isMobile = l.source === "mobile.bg"
              return (
                <a
                  key={`est-${l.source}-${l.id}`}
                  className="dbz-listing"
                  href={l.url}
                  target={newTab ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault()
                    window.open(l.url, newTab ? "_blank" : "_self")
                  }}>
                  <div className={`dbz-srcbadge ${isMobile ? "dbz-srcbadge-m" : "dbz-srcbadge-c"}`}>
                    {isMobile ? "m" : "c"}
                  </div>
                  <div className="dbz-listing-info">
                    <div className="dbz-listing-title">{l.title}</div>
                    <div className="dbz-listing-meta">
                      {[l.year, l.mileageKm != null ? `${fmt(l.mileageKm)} km` : null, l.fuelType]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="dbz-listing-right">
                    <div className="dbz-listing-price">
                      {l.priceEur != null ? `€${fmt(l.priceEur)}` : "—"}
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

function ValueResult({
  estimate,
  lang,
}: {
  estimate: NonNullable<ReturnType<typeof estimateCarPrice>>
  lang: Lang
}) {
  const confSegs =
    estimate.confidence === "high" ? 5 :
    estimate.confidence === "medium" ? 3 : 2

  const confColor =
    estimate.confidence === "high" ? "dbz-confidence-seg-on-high" :
    estimate.confidence === "low" ? "dbz-confidence-seg-on-low" : "dbz-confidence-seg-on"

  const confidenceLabel =
    estimate.confidence === "high" ? t("confidenceHigh", lang)
      : estimate.confidence === "medium" ? t("confidenceMedium", lang)
      : t("confidenceLow", lang)

  return (
    <div className="dbz-val-hero">
      <div className="dbz-val-hero-label">{t("recommendedAsk", lang)}</div>
      <div className="dbz-val-hero-value">€{fmt(estimate.recommendedPrice)}</div>
      <div className="dbz-val-hero-range">
        {t("rangeShort", lang)}{" "}
        <b>€{fmt(estimate.quickSale)} – €{fmt(estimate.patientAsk)}</b>
      </div>

      <div className="dbz-confidence">
        <div className="dbz-confidence-head">
          <span>{t("confidenceLabel", lang)}</span>
          <span style={{ color: "#38bdf8" }}>
            {confidenceLabel} · {estimate.comparablesCount} {t("comparables", lang)}
          </span>
        </div>
        <div className="dbz-confidence-meter">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`dbz-confidence-seg ${i < confSegs ? confColor : ""}`}
            />
          ))}
        </div>
      </div>

      <div className="dbz-tiers">
        <div className={`dbz-tier ${estimate.recommendedTier === "quick" ? "dbz-tier-active" : ""}`}>
          <span className="dbz-tier-label">{t("quickSale", lang)}</span>
          <span className="dbz-tier-val">€{fmt(estimate.quickSale)}</span>
        </div>
        <div className={`dbz-tier ${estimate.recommendedTier === "fair" ? "dbz-tier-active" : ""}`}>
          <span className="dbz-tier-label">{t("fairAsk", lang)}</span>
          <span className="dbz-tier-val">€{fmt(estimate.fairAsk)}</span>
        </div>
        <div className={`dbz-tier ${estimate.recommendedTier === "patient" ? "dbz-tier-active" : ""}`}>
          <span className="dbz-tier-label">{t("patientAsk", lang)}</span>
          <span className="dbz-tier-val">€{fmt(estimate.patientAsk)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Minimized floating icon (draggable) ─────────────────────────────────

const MINI_SIZE = 48
const DRAG_THRESHOLD = 4

function defaultMiniPos(): { x: number; y: number } {
  return {
    x: Math.max(8, window.innerWidth - MINI_SIZE - 16),
    y: Math.max(8, window.innerHeight - MINI_SIZE - 16),
  }
}

function clampToViewport(pos: { x: number; y: number }) {
  return {
    x: Math.max(4, Math.min(window.innerWidth - MINI_SIZE - 4, pos.x)),
    y: Math.max(4, Math.min(window.innerHeight - MINI_SIZE - 4, pos.y)),
  }
}

// ── Settings view ──────────────────────────────────────────────────────

function SettingsView({
  lang,
  autoOpen, setAutoOpen,
  crossSite, setCrossSite,
  newTab, setNewTab,
  outlierAlerts, setOutlierAlerts,
  onBack,
  onClearData,
}: {
  lang: Lang
  autoOpen: boolean
  setAutoOpen: (v: boolean) => void
  crossSite: boolean
  setCrossSite: (v: boolean) => void
  newTab: boolean
  setNewTab: (v: boolean) => void
  outlierAlerts: boolean
  setOutlierAlerts: (v: boolean) => void
  onBack: () => void
  onClearData: () => void
}) {
  return (
    <div className="dbz-body">
      <div className="dbz-settings-header">
        <button className="dbz-settings-back" onClick={onBack} title={t("settingsBackLabel", lang)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8l5 5"/>
          </svg>
        </button>
        <span className="dbz-settings-title">{t("settingsTitle", lang)}</span>
      </div>

      <div className="dbz-settings-section">{t("settingsBehavior", lang)}</div>
      <SettingRow
        label={t("settingAutoOpen", lang)}
        descOn={t("settingAutoOpenDescOn", lang)}
        descOff={t("settingAutoOpenDescOff", lang)}
        value={autoOpen}
        onChange={setAutoOpen}
      />
      <SettingRow
        label={t("settingNewTab", lang)}
        descOn={t("settingNewTabDescOn", lang)}
        descOff={t("settingNewTabDescOff", lang)}
        value={newTab}
        onChange={setNewTab}
      />
      <SettingRow
        label={t("settingOutlierAlerts", lang)}
        descOn={t("settingOutlierAlertsDescOn", lang)}
        descOff={t("settingOutlierAlertsDescOff", lang)}
        value={outlierAlerts}
        onChange={setOutlierAlerts}
      />

      <div className="dbz-settings-section" style={{ marginTop: 18 }}>{t("settingsData", lang)}</div>
      <SettingRow
        label={t("settingCrossSite", lang)}
        descOn={t("settingCrossSiteDescOn", lang)}
        descOff={t("settingCrossSiteDescOff", lang)}
        value={crossSite}
        onChange={setCrossSite}
      />
      <button className="dbz-settings-action" onClick={onClearData}>
        {t("settingClearData", lang)}
      </button>
      <div
        style={{ fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>
        {t("settingClearDataDesc", lang)}
      </div>

      <div className="dbz-settings-foot">{t("settingsFoot", lang)}</div>
    </div>
  )
}

function SettingRow({
  label, descOn, descOff, value, onChange,
}: {
  label: string
  descOn?: string
  descOff?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  const desc = value ? descOn : descOff
  return (
    <div className="dbz-setting">
      <div className="dbz-setting-info">
        <div className="dbz-setting-label">{label}</div>
        {desc && <div className="dbz-setting-desc">{desc}</div>}
      </div>
      <button
        className={`dbz-switch ${value ? "on" : ""}`}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      />
    </div>
  )
}

function MiniIcon({
  storedPos,
  dragPos,
  setDragPos,
  onPersistPos,
  onOpen,
}: {
  storedPos: { x: number; y: number } | null | undefined
  dragPos: { x: number; y: number } | null
  setDragPos: (p: { x: number; y: number } | null) => void
  onPersistPos: (p: { x: number; y: number }) => void
  onOpen: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const dragMetaRef = useRef<{
    startX: number
    startY: number
    origX: number
    origY: number
    moved: boolean
  } | null>(null)

  const pos = dragPos ?? storedPos ?? defaultMiniPos()

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const clamped = clampToViewport(pos)
    dragMetaRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: clamped.x,
      origY: clamped.y,
      moved: false,
    }
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging) return

    function onMove(e: MouseEvent) {
      const meta = dragMetaRef.current
      if (!meta) return
      const dx = e.clientX - meta.startX
      const dy = e.clientY - meta.startY
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        meta.moved = true
      }
      setDragPos(clampToViewport({ x: meta.origX + dx, y: meta.origY + dy }))
    }

    function onUp() {
      const meta = dragMetaRef.current
      setDragging(false)
      dragMetaRef.current = null
      if (!meta) return
      if (!meta.moved) {
        setDragPos(null)
        onOpen()
      } else if (dragPos) {
        onPersistPos(dragPos)
        setDragPos(null)
      }
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
  }, [dragging, dragPos, onOpen, onPersistPos, setDragPos])

  return (
    <div
      className={`dbz-mini ${dragging ? "dbz-mini-dragging" : ""}`}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
      title="Джамбаз"
      role="button"
      aria-label="Open Джамбаз panel">
      <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeLinejoin="round" width="24" height="24">
        <path d="M4 13l1.6-4.2c.3-.8 1.1-1.3 2-1.3h8.8c.9 0 1.7.5 2 1.3L20 13v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4z"/>
        <circle cx="8" cy="14.5" r="1" fill="#38bdf8"/>
        <circle cx="16" cy="14.5" r="1" fill="#38bdf8"/>
      </svg>
    </div>
  )
}
