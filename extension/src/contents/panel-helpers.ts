import type { MarketStats } from "~shared/types"

export type Verdict = "under" | "fair" | "over" | "outlier"

export interface Histogram {
  counts: number[]
  min: number
  max: number
  step: number
}

export const HIST_BINS = 22

export function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

export function fmtK(n: number): string {
  if (Math.abs(n) >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, "") + "к"
  }
  return fmt(n)
}

export function buildHistogram(values: number[], bins: number): Histogram | null {
  const clean = values.filter((v) => Number.isFinite(v))
  if (clean.length === 0) return null
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const step = (max - min) / bins || 1
  const counts = new Array(bins).fill(0)
  clean.forEach((v) => {
    let i = Math.floor((v - min) / step)
    if (i >= bins) i = bins - 1
    if (i < 0) i = 0
    counts[i]++
  })
  return { counts, min, max, step }
}

export function verdictFor(price: number, s: MarketStats["price"]): Verdict {
  if (!s) return "fair"
  const iqr = s.p75 - s.p25
  const outlierLow = s.p25 - 2 * iqr
  const outlierHigh = s.p75 + 2 * iqr
  if (price < Math.max(outlierLow, 200) || price > outlierHigh) return "outlier"
  if (price < s.p25) return "under"
  if (price > s.p75) return "over"
  return "fair"
}

export const VERDICT_STYLE: Record<
  Verdict,
  { color: string; symbol: string; key: "under" | "fair" | "over" | "outlier" }
> = {
  under:   { color: "#4ade80", symbol: "↓", key: "under" },
  fair:    { color: "#94a3b8", symbol: "≈", key: "fair" },
  over:    { color: "#fbbf24", symbol: "↑", key: "over" },
  outlier: { color: "#f87171", symbol: "⚑", key: "outlier" },
}

/** Normalized [0..100] position of `price` across the stats range. */
export function pricePct(price: number, s: MarketStats["price"]): number {
  if (!s) return 50
  const range = s.max - s.min || 1
  return Math.max(0, Math.min(100, ((price - s.min) / range) * 100))
}

export function sortedMedian(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
