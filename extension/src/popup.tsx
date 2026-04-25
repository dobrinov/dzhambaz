import { useEffect, useMemo, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import type { CarListing, MarketStats } from "~shared/types"
import { computeStats } from "~shared/stats"
import { type Lang, DEFAULT_LANG, t } from "~shared/i18n"

// Listings are written to `local` by the content scripts (sync has an 8 KB
// per-item cap that truncates full crawls).
const listingsStorage = new Storage({ area: "local" })

type SortKey = "source" | "title" | "priceEur" | "year" | "mileageKm"
type SortDir = "asc" | "desc"

type PageState =
  | { kind: "loading" }
  | { kind: "off-site" }
  | { kind: "on-site-no-search"; site: "mobile.bg" | "cars.bg" }
  | { kind: "on-search"; site: "mobile.bg" | "cars.bg" }

function detectPageState(url: string | undefined): PageState {
  if (!url) return { kind: "off-site" }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { kind: "off-site" }
  }
  const host = parsed.hostname.toLowerCase()
  const path = parsed.pathname.toLowerCase()

  if (host.includes("mobile.bg")) {
    const isSearch = path.startsWith("/obiavi") || path.startsWith("/search")
    return isSearch
      ? { kind: "on-search", site: "mobile.bg" }
      : { kind: "on-site-no-search", site: "mobile.bg" }
  }
  if (host.includes("cars.bg")) {
    const isSearch = path.includes("carslist")
    return isSearch
      ? { kind: "on-search", site: "cars.bg" }
      : { kind: "on-site-no-search", site: "cars.bg" }
  }
  return { kind: "off-site" }
}

function formatNumber(n: number | null): string {
  if (n === null) return "—"
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

function StatsRow({ label, stats, lang }: { label: string; stats: MarketStats; lang: Lang }) {
  return (
    <div style={styles.statsRow}>
      <span style={styles.statsLabel}>{label}</span>
      <span style={styles.statsCount}>{stats.count} {t("listings", lang).toLowerCase()}</span>
      {stats.price && (
        <span style={styles.statsPrice}>
          {formatNumber(stats.price.min)} — {formatNumber(stats.price.max)} EUR
        </span>
      )}
    </div>
  )
}

export default function Popup() {
  const [mobileBgListings] = useStorage<CarListing[]>(
    { key: "listings:mobile.bg", instance: listingsStorage },
    []
  )
  const [carsBgListings] = useStorage<CarListing[]>(
    { key: "listings:cars.bg", instance: listingsStorage },
    []
  )
  const [lang, setLang] = useStorage<Lang>("wd-lang", DEFAULT_LANG)

  const [pageState, setPageState] = useState<PageState>({ kind: "loading" })

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setPageState(detectPageState(tabs[0]?.url))
    })
  }, [])

  const [sortKey, setSortKey] = useState<SortKey>("priceEur")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const allListings = useMemo(
    () => [...(mobileBgListings ?? []), ...(carsBgListings ?? [])],
    [mobileBgListings, carsBgListings]
  )

  const mobileBgStats = useMemo(
    () => (mobileBgListings?.length ? computeStats(mobileBgListings) : null),
    [mobileBgListings]
  )
  const carsBgStats = useMemo(
    () => (carsBgListings?.length ? computeStats(carsBgListings) : null),
    [carsBgListings]
  )

  const sortedListings = useMemo(() => {
    const copy = [...allListings]
    copy.sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]
      if (aVal === null) aVal = sortDir === "asc" ? Infinity : -Infinity
      if (bVal === null) bVal = sortDir === "asc" ? Infinity : -Infinity
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
    return copy
  }, [allListings, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return ""
    return sortDir === "asc" ? " ▲" : " ▼"
  }

  function openListing(url: string) {
    chrome.tabs.create({ url })
  }

  function openSite(site: "mobile.bg" | "cars.bg") {
    chrome.tabs.create({ url: `https://www.${site}/` })
    window.close()
  }

  return (
    <div style={styles.container}>
      <style>{popupKeyframes}</style>
      <div style={styles.header}>
        <h1 style={styles.title}>Джамбаз</h1>
        <button
          style={styles.langBtn}
          onClick={() => setLang(lang === "en" ? "bg" : "en")}>
          {lang === "en" ? "BG" : "EN"}
        </button>
      </div>

      {pageState.kind === "loading" ? (
        <div style={styles.guide} />
      ) : pageState.kind === "off-site" ? (
        <OffSiteGuide lang={lang} onOpen={openSite} />
      ) : pageState.kind === "on-site-no-search" ? (
        <NoSearchGuide lang={lang} site={pageState.site} />
      ) : (
        <SearchView
          lang={lang}
          mobileBgStats={mobileBgStats}
          carsBgStats={carsBgStats}
          allListings={allListings}
          sortedListings={sortedListings}
          sortKey={sortKey}
          sortDir={sortDir}
          handleSort={handleSort}
          sortIndicator={sortIndicator}
          openListing={openListing}
        />
      )}
    </div>
  )
}

function OffSiteGuide({
  lang,
  onOpen,
}: {
  lang: Lang
  onOpen: (s: "mobile.bg" | "cars.bg") => void
}) {
  return (
    <div style={styles.guide}>
      <div style={styles.eyebrow}>
        <span style={styles.eyebrowDot} />
        {t("popupGuideOpenSiteEyebrow", lang)}
      </div>
      <h2 style={styles.guideTitle}>{t("popupGuideOpenSiteTitle", lang)}</h2>
      <p style={styles.guideBody}>{t("popupGuideOpenSiteBody", lang)}</p>
      <div style={styles.siteBtnRow}>
        <button style={styles.siteBtn} onClick={() => onOpen("mobile.bg")}>
          <span style={styles.siteBtnArrow}>↗</span>
          <span style={styles.siteBtnLabel}>mobile.bg</span>
        </button>
        <button style={styles.siteBtn} onClick={() => onOpen("cars.bg")}>
          <span style={styles.siteBtnArrow}>↗</span>
          <span style={styles.siteBtnLabel}>cars.bg</span>
        </button>
      </div>
      <Steps lang={lang} active={1} />
    </div>
  )
}

function NoSearchGuide({ lang, site }: { lang: Lang; site: "mobile.bg" | "cars.bg" }) {
  return (
    <div style={styles.guide}>
      <div style={styles.eyebrow}>
        <span style={styles.eyebrowDot} />
        {t("popupGuideSearchEyebrow", lang)}
      </div>
      <h2 style={styles.guideTitle}>{t("popupGuideSearchTitle", lang)}</h2>
      <p style={styles.guideBody}>{t("popupGuideSearchBody", lang)}</p>
      <div style={styles.youAreOn}>
        <span style={styles.youAreOnLabel}>●</span>
        <span style={styles.youAreOnText}>{site}</span>
      </div>
      <Steps lang={lang} active={2} />
    </div>
  )
}

function Steps({ lang, active }: { lang: Lang; active: 1 | 2 | 3 }) {
  const steps: Array<{ n: number; key: "popupGuideOpenSiteTitle" | "popupGuideSearchTitle" | "stats" }> = [
    { n: 1, key: "popupGuideOpenSiteTitle" },
    { n: 2, key: "popupGuideSearchTitle" },
    { n: 3, key: "stats" },
  ]
  return (
    <div style={styles.steps}>
      {steps.map((s) => {
        const state = s.n < active ? "done" : s.n === active ? "active" : "todo"
        return (
          <div key={s.n} style={styles.step}>
            <span
              style={{
                ...styles.stepDot,
                ...(state === "active" ? styles.stepDotActive : {}),
                ...(state === "done" ? styles.stepDotDone : {}),
              }}>
              {state === "done" ? "✓" : s.n}
            </span>
            <span
              style={{
                ...styles.stepLabel,
                ...(state === "todo" ? styles.stepLabelTodo : {}),
              }}>
              {t(s.key, lang)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SearchView({
  lang,
  mobileBgStats,
  carsBgStats,
  allListings,
  sortedListings,
  sortKey,
  sortDir,
  handleSort,
  sortIndicator,
  openListing,
}: {
  lang: Lang
  mobileBgStats: MarketStats | null
  carsBgStats: MarketStats | null
  allListings: CarListing[]
  sortedListings: CarListing[]
  sortKey: SortKey
  sortDir: SortDir
  handleSort: (k: SortKey) => void
  sortIndicator: (k: SortKey) => string
  openListing: (url: string) => void
}) {
  if (allListings.length === 0) {
    return (
      <div style={styles.guide}>
        <div style={styles.eyebrow}>
          <span style={{ ...styles.eyebrowDot, ...styles.eyebrowDotPulse }} />
          {t("popupScanningTitle", lang)}
        </div>
        <h2 style={styles.guideTitle}>{t("popupScanningTitle", lang)}</h2>
        <p style={styles.guideBody}>{t("popupScanningBody", lang)}</p>
        <Steps lang={lang} active={3} />
      </div>
    )
  }

  return (
    <>
      <div style={styles.statsSection}>
        {mobileBgStats ? (
          <StatsRow label="mobile.bg" stats={mobileBgStats} lang={lang} />
        ) : (
          <div style={styles.noData}>mobile.bg — {t("noDataYet", lang)}</div>
        )}
        {carsBgStats ? (
          <StatsRow label="cars.bg" stats={carsBgStats} lang={lang} />
        ) : (
          <div style={styles.noData}>cars.bg — {t("noDataYet", lang)}</div>
        )}
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th} onClick={() => handleSort("source")}>
                {t("source", lang)}{sortIndicator("source")}
              </th>
              <th style={{ ...styles.th, ...styles.thTitle }} onClick={() => handleSort("title")}>
                {t("title", lang)}{sortIndicator("title")}
              </th>
              <th style={styles.th} onClick={() => handleSort("priceEur")}>
                {t("priceEur", lang)}{sortIndicator("priceEur")}
              </th>
              <th style={styles.th} onClick={() => handleSort("year")}>
                {t("year", lang)}{sortIndicator("year")}
              </th>
              <th style={styles.th} onClick={() => handleSort("mileageKm")}>
                {t("mileage", lang)}{sortIndicator("mileageKm")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedListings.map((listing) => (
              <tr
                key={`${listing.source}-${listing.id}`}
                style={styles.row}
                onClick={() => openListing(listing.url)}>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.siteBadge,
                      background:
                        listing.source === "mobile.bg" ? "#3b82f620" : "#8b5cf620",
                      color: listing.source === "mobile.bg" ? "#3b82f6" : "#8b5cf6",
                    }}>
                    {listing.source === "mobile.bg" ? "M" : "C"}
                  </span>
                </td>
                <td style={{ ...styles.td, ...styles.tdTitle }}>{listing.title}</td>
                <td style={{ ...styles.td, ...styles.tdNum }}>
                  {formatNumber(listing.priceEur)}
                </td>
                <td style={{ ...styles.td, ...styles.tdNum }}>
                  {listing.year ?? "—"}
                </td>
                <td style={{ ...styles.td, ...styles.tdNum }}>
                  {listing.mileageKm !== null
                    ? `${formatNumber(listing.mileageKm)} km`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const popupKeyframes = `
  @keyframes wd-pulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18); }
    50%      { box-shadow: 0 0 0 6px rgba(56, 189, 248, 0.32); }
  }
`

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 520,
    maxHeight: 500,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 13,
    background: "#0f172a",
    color: "#e2e8f0",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "12px 16px 8px",
    borderBottom: "1px solid #1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  langBtn: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#94a3b8",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    lineHeight: 1.4,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#38bdf8",
  },
  statsSection: {
    padding: "8px 16px",
    borderBottom: "1px solid #1e293b",
  },
  statsRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "4px 0",
  },
  statsLabel: {
    fontWeight: 600,
    minWidth: 70,
    color: "#f1f5f9",
  },
  statsCount: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  statsPrice: {
    marginLeft: "auto",
    fontVariantNumeric: "tabular-nums",
    color: "#cbd5e1",
    fontSize: 12,
  },
  noData: {
    color: "#64748b",
    fontStyle: "italic",
    padding: "4px 0",
    fontSize: 12,
  },
  guide: {
    padding: "20px 20px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 220,
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.8px",
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: "#38bdf8",
    boxShadow: "0 0 0 3px rgba(56, 189, 248, 0.18)",
  },
  eyebrowDotPulse: {
    animation: "wd-pulse 1.4s ease-in-out infinite",
  },
  guideTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.2,
    color: "#f1f5f9",
    letterSpacing: "-0.01em",
  },
  guideBody: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.55,
    color: "#94a3b8",
  },
  siteBtnRow: {
    display: "flex",
    gap: 8,
    marginTop: 4,
  },
  siteBtn: {
    flex: 1,
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#e2e8f0",
    borderRadius: 6,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "ui-monospace, SFMono-Regular, 'JetBrains Mono', monospace",
  },
  siteBtnArrow: {
    color: "#38bdf8",
    fontSize: 14,
    lineHeight: 1,
  },
  siteBtnLabel: {
    flex: 1,
    textAlign: "left" as const,
  },
  youAreOn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(56, 189, 248, 0.08)",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    color: "#7dd3fc",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
    alignSelf: "flex-start",
    fontFamily: "ui-monospace, SFMono-Regular, 'JetBrains Mono', monospace",
    marginTop: 4,
  },
  youAreOnLabel: {
    color: "#22c55e",
    fontSize: 9,
  },
  youAreOnText: {
    letterSpacing: "0.02em",
  },
  steps: {
    marginTop: "auto",
    paddingTop: 14,
    borderTop: "1px solid #1e293b",
    display: "flex",
    gap: 8,
  },
  step: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#64748b",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 10,
    flexShrink: 0,
  },
  stepDotActive: {
    background: "#38bdf8",
    border: "1px solid #38bdf8",
    color: "#0f172a",
    boxShadow: "0 0 0 3px rgba(56, 189, 248, 0.18)",
  },
  stepDotDone: {
    background: "#1e293b",
    border: "1px solid #38bdf8",
    color: "#38bdf8",
  },
  stepLabel: {
    color: "#cbd5e1",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  stepLabelTodo: {
    color: "#64748b",
    fontWeight: 500,
  },
  tableWrap: {
    overflow: "auto",
    flex: 1,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 12,
  },
  th: {
    position: "sticky" as const,
    top: 0,
    background: "#1e293b",
    padding: "6px 10px",
    textAlign: "left" as const,
    fontWeight: 600,
    cursor: "pointer",
    userSelect: "none" as const,
    whiteSpace: "nowrap" as const,
    color: "#cbd5e1",
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  thTitle: {
    width: "45%",
  },
  row: {
    cursor: "pointer",
    borderBottom: "1px solid #1e293b",
  },
  td: {
    padding: "6px 10px",
    verticalAlign: "middle" as const,
  },
  tdTitle: {
    maxWidth: 200,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  tdNum: {
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap" as const,
  },
  siteBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: 4,
    fontWeight: 700,
    fontSize: 11,
  },
}
