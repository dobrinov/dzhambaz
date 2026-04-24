import { useState, useMemo } from "react"
import { useStorage } from "@plasmohq/storage/hook"

import type { CarListing, MarketStats } from "~shared/types"
import { computeStats } from "~shared/stats"
import { type Lang, DEFAULT_LANG, t } from "~shared/i18n"

type SortKey = "source" | "title" | "priceEur" | "year" | "mileageKm"
type SortDir = "asc" | "desc"

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
  const [mobileBgListings] = useStorage<CarListing[]>("listings:mobile.bg", [])
  const [carsBgListings] = useStorage<CarListing[]>("listings:cars.bg", [])
  const [lang, setLang] = useStorage<Lang>("wd-lang", DEFAULT_LANG)

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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Джамбаз</h1>
        <button
          style={styles.langBtn}
          onClick={() => setLang(lang === "en" ? "bg" : "en")}>
          {lang === "en" ? "BG" : "EN"}
        </button>
      </div>

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

      {allListings.length === 0 ? (
        <div style={styles.emptyState}>
          <p>{t("noListings", lang)}</p>
          <p style={styles.emptyHint}>
            {t("noDataYet", lang)}
          </p>
        </div>
      ) : (
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
      )}
    </div>
  )
}

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
  emptyState: {
    padding: "24px 16px",
    textAlign: "center" as const,
    color: "#94a3b8",
  },
  emptyHint: {
    fontSize: 12,
    marginTop: 8,
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
