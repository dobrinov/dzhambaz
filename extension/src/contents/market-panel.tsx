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

export const config: PlasmoCSConfig = {
  matches: ["*://www.mobile.bg/*", "*://www.cars.bg/*"],
  run_at: "document_idle",
}

// ── Styles ──────────────────────────────────────────────────────────────────

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .dbz-panel {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 999999;
      width: 340px;
      max-height: calc(100vh - 20px);
      display: flex; flex-direction: column;
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 20px 60px -20px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
      font-size: 12.5px;
    }
    .dbz-mono { font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace; font-variant-numeric: tabular-nums; }
    .dbz-display { font-family: "Caveat", "Georgia", serif; font-weight: 700; letter-spacing: -0.01em; line-height: 1; }
    .dbz-eyebrow {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 9.5px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #64748b;
    }

    .dbz-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 11px 14px 10px;
      border-bottom: 1px solid #334155;
      background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
      cursor: pointer; user-select: none;
      flex-shrink: 0;
    }
    .dbz-head:hover { background: rgba(255,255,255,0.03); }
    .dbz-brand {
      font-family: "Caveat", "Georgia", serif;
      font-weight: 700;
      font-size: 22px;
      color: #38bdf8;
      letter-spacing: -0.01em;
      line-height: 1;
    }
    .dbz-head-actions { display: flex; align-items: center; gap: 6px; }
    .dbz-lang {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px;
      padding: 3px 7px;
      border-radius: 5px;
      border: 1px solid #334155;
      background: #0f172a;
      color: #94a3b8;
      letter-spacing: 0.08em;
      cursor: pointer;
    }
    .dbz-lang:hover { color: #e2e8f0; border-color: #475569; }
    .dbz-toggle {
      font-size: 11px; color: #94a3b8;
      width: 20px; text-align: center; user-select: none;
    }

    .dbz-tabs {
      display: flex; padding: 0 8px;
      border-bottom: 1px solid #334155;
      background: #0f172a;
      flex-shrink: 0;
    }
    .dbz-tab {
      flex: 1;
      padding: 11px 4px 10px;
      font-size: 12px; font-weight: 500;
      color: #64748b;
      text-align: center;
      cursor: pointer;
      background: none; border: none;
      border-bottom: 1.5px solid transparent;
      font-family: inherit;
      letter-spacing: -0.005em;
    }
    .dbz-tab:hover { color: #94a3b8; }
    .dbz-tab-active { color: #38bdf8; border-bottom-color: #38bdf8; font-weight: 600; }
    .dbz-tab .dbz-count {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px;
      color: #64748b;
      margin-left: 4px; font-weight: 400;
    }
    .dbz-tab-active .dbz-count { color: #38bdf8; opacity: 0.8; }

    .dbz-scanbar {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 14px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid #334155;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10.5px;
      flex-shrink: 0;
    }
    .dbz-scan-site { color: #64748b; letter-spacing: 0.02em; }
    .dbz-scan-site b { color: #e2e8f0; font-weight: 500; }
    .dbz-scan-track {
      flex: 1; height: 3px; background: #334155; border-radius: 2px; overflow: hidden;
    }
    .dbz-scan-fill { height: 100%; background: #38bdf8; border-radius: 2px; transition: width 0.3s ease; }
    .dbz-scan-pct { color: #94a3b8; }

    .dbz-body {
      padding: 14px; overflow-y: auto; flex: 1; min-height: 0;
    }
    .dbz-body::-webkit-scrollbar { width: 6px; }
    .dbz-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
    .dbz-collapsed .dbz-body,
    .dbz-collapsed .dbz-tabs,
    .dbz-collapsed .dbz-scanbar,
    .dbz-collapsed .dbz-empty { display: none; }
    .dbz-collapsed .dbz-head { border-bottom: none; border-radius: 12px; }

    /* ── Empty state ── */
    .dbz-empty {
      padding: 26px 22px 22px;
      display: flex; flex-direction: column; gap: 16px;
    }
    .dbz-empty-eyebrow {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #38bdf8;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .dbz-empty-eyebrow::before {
      content: ""; width: 6px; height: 6px; border-radius: 50%;
      background: #38bdf8; display: inline-block;
      box-shadow: 0 0 0 3px rgba(56,189,248,0.18);
    }
    .dbz-empty-title {
      font-family: "Caveat", "Georgia", serif;
      font-weight: 700;
      font-size: 28px;
      color: #e2e8f0;
      line-height: 1.1;
      margin: 0;
    }
    .dbz-empty-title em {
      font-style: italic;
      color: #38bdf8;
    }
    .dbz-empty-body {
      font-size: 13px; line-height: 1.55; color: #94a3b8;
    }
    .dbz-empty-body .dbz-mono { color: #e2e8f0; }
    .dbz-empty-bullets {
      padding: 12px 13px 13px;
      background: rgba(255,255,255,0.03);
      border: 1px solid #334155;
      border-radius: 9px;
    }
    .dbz-empty-bullet {
      display: flex; align-items: center; gap: 10px;
      padding: 4px 0;
      font-size: 12.5px; color: #e2e8f0;
    }
    .dbz-empty-bullet .dbz-n {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; color: #38bdf8; opacity: 0.75;
      width: 22px; flex-shrink: 0;
    }
    .dbz-footer-fine {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 9.5px; color: #475569;
      text-align: center; letter-spacing: 0.05em;
      margin-top: 4px;
    }

    /* ── Context row + source chips ── */
    .dbz-context {
      display: flex; align-items: baseline; justify-content: space-between;
      margin-bottom: 10px;
    }
    .dbz-context-title {
      font-size: 14px; color: #e2e8f0; font-weight: 500;
      max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .dbz-chips {
      display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 14px;
    }
    .dbz-chip {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 500;
      padding: 3px 8px; border-radius: 5px;
      background: rgba(255,255,255,0.04); color: #94a3b8;
      border: 1px solid #334155;
    }
    .dbz-chip-active { background: rgba(56,189,248,0.12); color: #38bdf8; border-color: rgba(56,189,248,0.3); }
    .dbz-chip-mint { background: rgba(74,222,128,0.12); color: #4ade80; border-color: rgba(74,222,128,0.3); }
    .dbz-chip-red { background: rgba(248,113,113,0.12); color: #f87171; border-color: rgba(248,113,113,0.3); }
    .dbz-chip-mono { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 10px; padding: 2px 6px; letter-spacing: 0.03em; }
    .dbz-chip-dim { opacity: 0.5; }

    /* ── Hero price card ── */
    .dbz-hero {
      padding: 16px 16px 18px;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0));
      border: 1px solid #334155;
      border-radius: 10px;
      margin-bottom: 10px;
    }
    .dbz-hero-value {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 34px; line-height: 1;
      color: #e2e8f0; font-weight: 600;
      letter-spacing: -0.02em;
      margin-top: 4px;
    }
    .dbz-hero-sub {
      font-size: 11px; color: #64748b;
      margin-top: 6px; display: flex; gap: 10px; flex-wrap: wrap;
    }
    .dbz-hero-sub b { color: #94a3b8; font-weight: 500; }

    /* ── Mini stats ── */
    .dbz-ministats {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      margin-bottom: 14px;
    }
    .dbz-ministat {
      padding: 10px 12px 11px;
      background: rgba(255,255,255,0.03);
      border: 1px solid #334155;
      border-radius: 9px;
    }
    .dbz-ministat-label {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 9px; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.06em;
      margin-bottom: 4px; font-weight: 600;
    }
    .dbz-ministat-val {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 16px; font-weight: 500; color: #e2e8f0;
      letter-spacing: -0.01em;
    }
    .dbz-ministat-hint {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; color: #475569; margin-top: 2px;
    }

    /* ── Histogram distribution block ── */
    .dbz-distro {
      margin-top: 8px; margin-bottom: 8px;
    }
    .dbz-distro-head {
      display: flex; align-items: baseline; justify-content: space-between;
      margin-bottom: 10px;
    }
    .dbz-distro-range {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; color: #64748b;
    }
    .dbz-hist {
      position: relative; height: 48px;
      display: flex; align-items: flex-end; gap: 2px;
    }
    .dbz-hist-bar {
      flex: 1; min-height: 2px; border-radius: 1.5px 1.5px 0 0;
      background: #475569; opacity: 0.45;
    }
    .dbz-hist-bar-iqr {
      background: #38bdf8; opacity: 0.85;
    }
    .dbz-hist-base { height: 1px; background: #334155; margin-top: 2px; }
    .dbz-hist-median {
      position: absolute; top: -6px; bottom: 0;
      width: 1.5px; background: #e2e8f0; opacity: 0.9;
      transform: translateX(-50%); pointer-events: none;
    }
    .dbz-hist-median::before {
      content: "M";
      position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 9px; color: #e2e8f0; font-weight: 600;
    }
    .dbz-axis {
      position: relative; height: 32px; margin-top: 4px;
    }
    .dbz-tick {
      position: absolute; text-align: center; line-height: 1.2;
      transform: translateX(-50%);
    }
    .dbz-tick-label {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 9px;
      color: #475569;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .dbz-tick-emphasize .dbz-tick-label { color: #38bdf8; }
    .dbz-tick-val {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; color: #94a3b8; font-weight: 500;
      margin-top: 2px;
    }
    .dbz-tick-emphasize .dbz-tick-val { color: #e2e8f0; font-weight: 600; }

    /* Your-value callout on distribution */
    .dbz-your {
      margin-top: 8px; height: 24px;
      background: #0f172a; border-radius: 5px;
      border: 1px solid #334155; position: relative;
    }
    .dbz-your-pin {
      position: absolute; top: 0; bottom: 0;
      display: flex; align-items: center;
      transform: translateX(-50%);
    }
    .dbz-your-pill {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; font-weight: 600;
      padding: 3px 7px; border-radius: 4px;
      background: #38bdf8; color: #0f172a;
      white-space: nowrap;
    }

    /* ── Insight callout ── */
    .dbz-insight {
      padding: 11px 13px;
      background: rgba(251,191,36,0.08);
      border: 1px solid rgba(251,191,36,0.28);
      border-radius: 9px;
      display: flex; gap: 10px; align-items: flex-start;
      margin-top: 12px;
    }
    .dbz-insight-icon { font-size: 14px; margin-top: 1px; }
    .dbz-insight-title {
      font-size: 12px; font-weight: 600; color: #fbbf24;
      margin-bottom: 2px;
    }
    .dbz-insight-body {
      font-size: 11.5px; color: #cbd5e1; line-height: 1.45;
    }
    .dbz-insight-body b { color: #e2e8f0; }

    .dbz-divider { height: 1px; background: #334155; margin: 14px 0; }

    /* ── Sort / filter bar ── */
    .dbz-toolbar {
      display: flex; align-items: center; gap: 6px;
      padding-bottom: 10px;
      border-bottom: 1px solid #334155;
      margin: -6px -14px 10px;
      padding: 10px 14px;
      flex-wrap: wrap;
    }
    .dbz-sortbtn {
      padding: 4px 9px; border-radius: 6px;
      border: 1px solid #334155;
      background: transparent; color: #94a3b8;
      font-size: 11px; font-weight: 500; cursor: pointer;
      font-family: inherit;
    }
    .dbz-sortbtn:hover { color: #e2e8f0; border-color: #475569; }
    .dbz-sortbtn-active {
      border-color: rgba(56,189,248,0.4);
      background: rgba(56,189,248,0.1);
      color: #38bdf8;
    }

    /* ── Listing row ── */
    .dbz-list { display: flex; flex-direction: column; }
    .dbz-listing {
      display: grid; grid-template-columns: 22px 1fr auto;
      gap: 10px; align-items: center;
      padding: 10px 4px;
      border-bottom: 1px solid #334155;
      text-decoration: none; color: inherit;
      cursor: pointer; transition: background 0.1s;
    }
    .dbz-listing:hover { background: rgba(255,255,255,0.03); }
    .dbz-listing:last-child { border-bottom: 0; }
    .dbz-srcbadge {
      width: 20px; height: 20px; border-radius: 4px;
      display: grid; place-items: center;
      font-size: 9.5px; font-weight: 700;
      color: #fff;
    }
    .dbz-srcbadge-m { background: #3b82f6; }
    .dbz-srcbadge-c { background: #8b5cf6; }
    .dbz-listing-info { min-width: 0; }
    .dbz-listing-title {
      font-size: 12px; color: #e2e8f0; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin-bottom: 3px;
    }
    .dbz-listing-meta {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; color: #64748b;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .dbz-posbar {
      margin-top: 6px; height: 2px; background: #0f172a;
      border-radius: 1px; position: relative;
    }
    .dbz-posbar-iqr {
      position: absolute; top: 0; bottom: 0;
      background: #334155;
    }
    .dbz-posbar-dot {
      position: absolute; top: -2px; width: 6px; height: 6px;
      border-radius: 50%; transform: translateX(-50%);
    }
    .dbz-listing-right { text-align: right; min-width: 76px; }
    .dbz-listing-price {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 13px; font-weight: 600;
      letter-spacing: -0.01em; white-space: nowrap;
    }
    .dbz-verdict {
      display: inline-flex; align-items: center; gap: 3px;
      margin-top: 3px;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 9.5px; letter-spacing: 0.02em;
      opacity: 0.9; white-space: nowrap;
    }
    .dbz-show-more {
      text-align: center; padding: 10px;
      font-size: 11px; color: #38bdf8;
      cursor: pointer; border-radius: 6px;
      margin-top: 4px;
    }
    .dbz-show-more:hover { background: rgba(56,189,248,0.08); }

    /* ── Form (Оцени моята) ── */
    .dbz-field { margin-bottom: 14px; }
    .dbz-field-label {
      display: flex; align-items: baseline; justify-content: space-between;
      font-size: 11px; color: #cbd5e1; margin-bottom: 6px; font-weight: 500;
    }
    .dbz-field-hint {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; color: #64748b;
    }
    .dbz-input {
      width: 100%; box-sizing: border-box; padding: 9px 11px;
      background: #0f172a; color: #e2e8f0;
      border: 1px solid #334155; border-radius: 7px;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 13px; font-variant-numeric: tabular-nums;
      outline: none; transition: border-color 0.12s;
    }
    .dbz-input:focus { border-color: rgba(56,189,248,0.6); }

    .dbz-slider {
      width: 100%; -webkit-appearance: none; appearance: none;
      height: 20px; background: transparent;
    }
    .dbz-slider::-webkit-slider-runnable-track {
      height: 3px; background: #334155; border-radius: 2px;
    }
    .dbz-slider::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 14px; height: 14px; border-radius: 50%;
      background: #38bdf8; border: 3px solid #1e293b;
      margin-top: -6px; cursor: pointer;
      box-shadow: 0 0 0 1px #38bdf8;
    }
    .dbz-slider::-moz-range-track {
      height: 3px; background: #334155; border-radius: 2px;
    }
    .dbz-slider::-moz-range-thumb {
      width: 12px; height: 12px; border-radius: 50%;
      background: #38bdf8; border: 2px solid #1e293b; cursor: pointer;
    }
    .dbz-slider-ticks {
      display: flex; justify-content: space-between;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; color: #64748b; margin-top: 2px;
    }
    .dbz-slider-ticks b { color: #38bdf8; font-weight: 600; }

    /* ── Valuation result card ── */
    .dbz-val-head {
      display: flex; align-items: baseline; justify-content: space-between;
      margin-bottom: 12px;
    }
    .dbz-val-context {
      font-size: 13px; color: #e2e8f0; font-weight: 500;
    }
    .dbz-val-hero {
      padding: 18px 18px 16px;
      background: linear-gradient(155deg, rgba(56,189,248,0.08) 0%, rgba(15,23,42,0.4) 60%);
      border: 1px solid rgba(56,189,248,0.28);
      border-radius: 12px;
      position: relative; overflow: hidden;
      margin-bottom: 12px;
    }
    .dbz-val-hero-label {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; color: #38bdf8;
      letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600;
      display: inline-flex; align-items: center; gap: 7px;
      margin-bottom: 6px;
    }
    .dbz-val-hero-label::before {
      content: ""; width: 5px; height: 5px; border-radius: 50%;
      background: #38bdf8;
    }
    .dbz-val-hero-value {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 40px; line-height: 1;
      color: #e2e8f0; font-weight: 700;
      letter-spacing: -0.03em;
    }
    .dbz-val-hero-range {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 11px; color: #64748b;
      margin-top: 8px;
    }
    .dbz-val-hero-range b { color: #94a3b8; font-weight: 500; }
    .dbz-confidence {
      margin-top: 14px;
    }
    .dbz-confidence-head {
      display: flex; justify-content: space-between;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; color: #64748b;
      margin-bottom: 5px; letter-spacing: 0.06em; text-transform: uppercase;
    }
    .dbz-confidence-meter {
      display: flex; gap: 3px; height: 5px;
    }
    .dbz-confidence-seg {
      flex: 1; border-radius: 2px;
      background: #334155;
    }
    .dbz-confidence-seg-on { background: #38bdf8; }
    .dbz-confidence-seg-on-high { background: #4ade80; }
    .dbz-confidence-seg-on-low { background: #f87171; }

    /* ── Tier cards ── */
    .dbz-tiers {
      display: flex; flex-direction: column; gap: 6px;
      margin-top: 12px;
    }
    .dbz-tier {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 12px;
      background: rgba(255,255,255,0.02);
      border: 1px solid #334155;
      border-radius: 8px;
    }
    .dbz-tier-label {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px; color: #94a3b8;
      letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600;
    }
    .dbz-tier-val {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 14px; font-weight: 600; color: #e2e8f0;
      letter-spacing: -0.01em;
    }
    .dbz-tier-active {
      background: rgba(56,189,248,0.08);
      border-color: rgba(56,189,248,0.3);
    }
    .dbz-tier-active .dbz-tier-label,
    .dbz-tier-active .dbz-tier-val { color: #38bdf8; }

    .dbz-no-data { color: #94a3b8; font-style: italic; font-size: 12px; }
  `
  return style
}

// ── Types and helpers ─────────────────────────────────────────────────────

type Tab = "stats" | "listings" | "price"
type SortKey = "deal" | "price" | "year" | "mileage"
type Verdict = "under" | "fair" | "over" | "outlier"

interface SiteCrawlProgress {
  site: "mobile.bg" | "cars.bg"
  current: number
  total: number
  done: boolean
}

interface Histogram {
  counts: number[]
  min: number
  max: number
  step: number
}

const storage = new Storage()
const DELAY_MS = 300
const CROSS_SITE_MAX_PAGES = 50
const VISIBLE_LISTINGS = 100
const HIST_BINS = 22

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

function fmtK(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "к"
  return fmt(n)
}

function detectSite(): "mobile.bg" | "cars.bg" | null {
  const host = window.location.hostname
  if (host.includes("mobile.bg")) return "mobile.bg"
  if (host.includes("cars.bg")) return "cars.bg"
  return null
}

function isSearchResultsPage(site: "mobile.bg" | "cars.bg"): boolean {
  const path = window.location.pathname.toLowerCase()
  if (site === "mobile.bg") return path.startsWith("/search")
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

function buildHistogram(values: number[], bins: number): Histogram | null {
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

function verdictFor(price: number, s: MarketStats["price"]): Verdict {
  if (!s) return "fair"
  const iqr = s.p75 - s.p25
  const outlierLow = s.p25 - 2 * iqr
  const outlierHigh = s.p75 + 2 * iqr
  if (price < Math.max(outlierLow, 200) || price > outlierHigh) return "outlier"
  if (price < s.p25) return "under"
  if (price > s.p75) return "over"
  return "fair"
}

const VERDICT_STYLE: Record<Verdict, { color: string; symbol: string; key: "under" | "fair" | "over" | "outlier" }> = {
  under:   { color: "#4ade80", symbol: "↓", key: "under" },
  fair:    { color: "#94a3b8", symbol: "≈", key: "fair" },
  over:    { color: "#fbbf24", symbol: "↑", key: "over" },
  outlier: { color: "#f87171", symbol: "⚑", key: "outlier" },
}

// Locate a listing's price in a histogram (for inline position bar)
function pricePct(price: number, s: MarketStats["price"]): number {
  if (!s) return 50
  const range = s.max - s.min || 1
  return Math.max(0, Math.min(100, ((price - s.min) / range) * 100))
}

// ── Main component ──────────────────────────────────────────────────────────

export default function MarketPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [tab, setTab] = useState<Tab>("stats")
  const [site, setSite] = useState<"mobile.bg" | "cars.bg" | null>(null)
  const [isSearchPage, setIsSearchPage] = useState(false)
  const [currentListings, setCurrentListings] = useState<CarListing[]>([])
  const [otherListings, setOtherListings] = useState<CarListing[]>([])
  const [currentProgress, setCurrentProgress] = useState<SiteCrawlProgress | null>(null)
  const [otherProgress, setOtherProgress] = useState<SiteCrawlProgress | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("deal")
  const [listingFilter, setListingFilter] = useState<"all" | "deals" | "outliers">("all")
  const [showAll, setShowAll] = useState(false)
  const crawlingRef = useRef(false)
  const [lang, setLang] = useStorage<Lang>("wd-lang", DEFAULT_LANG)
  const [estimateInputs, setEstimateInputs] = useStorage<EstimateInputs>(
    "wd-estimate-inputs",
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

  const priceHist = useMemo(() => {
    const prices = allListings
      .map((l) => l.priceEur)
      .filter((p): p is number => p != null && p > 0)
    return buildHistogram(prices, HIST_BINS)
  }, [allListings])

  const kmHist = useMemo(() => {
    const km = allListings
      .map((l) => l.mileageKm)
      .filter((m): m is number => m != null && m > 0)
    return buildHistogram(km, HIST_BINS)
  }, [allListings])

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
        const va = verdictByKey.get(`${a.source}-${a.id}`) ?? "fair"
        const vb = verdictByKey.get(`${b.source}-${b.id}`) ?? "fair"
        const d = verdictRank[va] - verdictRank[vb]
        if (d !== 0) return d
        return (a.priceEur ?? Infinity) - (b.priceEur ?? Infinity)
      }
      let aVal: number | null, bVal: number | null
      if (sortKey === "price") { aVal = a.priceEur; bVal = b.priceEur }
      else if (sortKey === "year") { aVal = b.year; bVal = a.year }   // year: newest first
      else { aVal = a.mileageKm; bVal = b.mileageKm }                 // mileage: lowest first
      return (aVal ?? Infinity) - (bVal ?? Infinity)
    })
    return arr
  }, [allListings, sortKey, listingFilter, verdictByKey])

  const visibleListings = showAll ? sortedListings : sortedListings.slice(0, VISIBLE_LISTINGS)

  useEffect(() => {
    const detectedSite = detectSite()
    if (!detectedSite) return
    setSite(detectedSite)

    const livePage =
      detectedSite === "mobile.bg" ? parseMobileBgListings() : parseCarsBgListings()

    const onSearchPage = livePage.length > 0 || isSearchResultsPage(detectedSite)
    setIsSearchPage(onSearchPage)
    if (!onSearchPage) return

    if (crawlingRef.current) return
    crawlingRef.current = true

    setCurrentListings(livePage)

    const filters = extractSearchFilters(detectedSite)

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

  return (
    <div className={`dbz-panel ${collapsed ? "dbz-collapsed" : ""}`}>
      <div className="dbz-head" onClick={() => setCollapsed(!collapsed)}>
        <span className="dbz-brand">Джамбаз</span>
        <div className="dbz-head-actions">
          <button className="dbz-lang" onClick={toggleLang}>
            {lang === "en" ? "BG" : "EN"}
          </button>
          <span className="dbz-toggle">{collapsed ? "+" : "–"}</span>
        </div>
      </div>

      {!isSearchPage ? (
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
                mobileBgCount={mobileBgCount}
                carsBgCount={carsBgCount}
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
                setSortKey={setSortKey}
                filter={listingFilter}
                setFilter={setListingFilter}
                dealCount={dealCount}
                outlierCount={outlierCount}
                showAll={showAll}
                onShowAll={() => setShowAll(true)}
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
  mobileBgCount,
  carsBgCount,
  lang,
}: {
  allListings: CarListing[]
  stats: ReturnType<typeof computeStats> | null
  priceHist: Histogram | null
  kmHist: Histogram | null
  outlierCount: number
  mobileBgCount: number
  carsBgCount: number
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
            {allListings[0]?.title?.split(/[·.,]/)[0]?.slice(0, 32) ?? t("listings", lang)}
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
          unit="EUR"
          hist={priceHist}
          stats={stats.price}
          format={(v) => "€" + fmt(v)}
        />
      )}

      {kmHist && stats?.mileage && (
        <>
          <div className="dbz-divider" />
          <Distro
            title={t("mileageKm", lang)}
            unit="KM"
            hist={kmHist}
            stats={stats.mileage}
            format={(v) => fmtK(v) + " km"}
          />
        </>
      )}

      {outlierCount > 0 && (
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

function sortedMedian(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
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
  unit,
  hist,
  stats,
  format,
}: {
  title: string
  unit: string
  hist: Histogram
  stats: { min: number; max: number; p25: number; p75: number; median: number }
  format: (v: number) => string
}) {
  const maxCount = Math.max(...hist.counts)
  const range = stats.max - stats.min || 1
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - stats.min) / range) * 100))

  return (
    <div className="dbz-distro">
      <div className="dbz-distro-head">
        <div>
          <span className="dbz-eyebrow">{title}</span>
          <span className="dbz-mono" style={{ fontSize: 10, color: "#475569", marginLeft: 6 }}>{unit}</span>
        </div>
        <span className="dbz-distro-range">{format(stats.min)} → {format(stats.max)}</span>
      </div>

      <div className="dbz-hist">
        {hist.counts.map((c, i) => {
          const h = maxCount ? (c / maxCount) * 100 : 0
          const binCenter = stats.min + (i + 0.5) * hist.step
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
        <AxisTick pct={pct(stats.p25)} label="P25" value={format(stats.p25)} />
        <AxisTick pct={pct(stats.median)} label={t("median", "bg")} value={format(stats.median)} emphasize />
        <AxisTick pct={pct(stats.p75)} label="P75" value={format(stats.p75)} />
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
  setSortKey,
  filter,
  setFilter,
  dealCount,
  outlierCount,
  showAll,
  onShowAll,
  lang,
}: {
  listings: CarListing[]
  total: number
  allListings: CarListing[]
  verdicts: Map<string, Verdict>
  stats: MarketStats["price"]
  sortKey: SortKey
  setSortKey: (k: SortKey) => void
  filter: "all" | "deals" | "outliers"
  setFilter: (f: "all" | "deals" | "outliers") => void
  dealCount: number
  outlierCount: number
  showAll: boolean
  onShowAll: () => void
  lang: Lang
}) {
  const iqrLeft = stats ? ((stats.p25 - stats.min) / (stats.max - stats.min || 1)) * 100 : 25
  const iqrRight = stats ? 100 - ((stats.p75 - stats.min) / (stats.max - stats.min || 1)) * 100 : 25

  return (
    <>
      <div className="dbz-toolbar">
        <span className="dbz-eyebrow" style={{ marginRight: 4 }}>{t("sort", lang)}</span>
        <SortBtn active={sortKey === "deal"} onClick={() => setSortKey("deal")}>
          {t("sortDeal", lang)} ↓
        </SortBtn>
        <SortBtn active={sortKey === "price"} onClick={() => setSortKey("price")}>
          {t("price", lang)}
        </SortBtn>
        <SortBtn active={sortKey === "year"} onClick={() => setSortKey("year")}>
          {t("year", lang)}
        </SortBtn>
        <SortBtn active={sortKey === "mileage"} onClick={() => setSortKey("mileage")}>
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
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault()
                  window.open(l.url, "_blank")
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

function SortBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`dbz-sortbtn ${active ? "dbz-sortbtn-active" : ""}`}
      onClick={onClick}>
      {children}
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
}: {
  inputs: EstimateInputs
  updateInput: <K extends keyof EstimateInputs>(k: K, v: EstimateInputs[K]) => void
  estimate: ReturnType<typeof estimateCarPrice>
  lang: Lang
  haveListings: boolean
}) {
  const mileageStr = inputs.mileageKm === null ? "" : String(inputs.mileageKm)
  const yearStr = inputs.year === null ? "" : String(inputs.year)

  function parseNum(s: string): number | null {
    const n = parseInt(s.replace(/\D+/g, ""), 10)
    return Number.isFinite(n) && n > 0 ? n : null
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
            className="dbz-input"
            value={yearStr}
            placeholder="2015"
            onChange={(e) => updateInput("year", parseNum(e.target.value))}
          />
        </div>
      </div>

      <div className="dbz-field">
        <div className="dbz-field-label">{t("urgency", lang)}</div>
        <input
          type="range" min={0} max={100}
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
          type="range" min={0} max={100}
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
          type="range" min={0} max={100}
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
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault()
                    window.open(l.url, "_blank")
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
