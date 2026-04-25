export const PANEL_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .dbz-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483647;
      width: 360px;
      display: flex; flex-direction: column;
      background: #1e293b;
      color: #e2e8f0;
      border-left: 1px solid #334155;
      border-radius: 0;
      box-shadow: -20px 0 60px -20px rgba(0,0,0,0.5), -2px 0 10px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
      font-size: 12.5px;
      animation: dbz-drawer-in 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes dbz-drawer-in {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    /* Minimized (floating) icon — drags freely, clicks open the drawer */
    .dbz-mini {
      position: fixed;
      z-index: 2147483647;
      width: 48px; height: 48px;
      border-radius: 50%;
      background: #1e293b;
      border: 1px solid #38bdf8;
      display: grid; place-items: center;
      cursor: grab;
      user-select: none;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 0 0 rgba(56,189,248,0);
      transition: box-shadow 0.2s ease, transform 0.15s ease;
      animation: dbz-mini-in 0.2s ease;
    }
    .dbz-mini svg { pointer-events: none; }
    .dbz-mini:hover {
      box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 0 4px rgba(56,189,248,0.18);
      transform: scale(1.05);
    }
    .dbz-mini-dragging {
      cursor: grabbing;
      box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 0 4px rgba(56,189,248,0.3);
      transform: scale(1.08);
    }
    @keyframes dbz-mini-in {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
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
      user-select: none;
      flex-shrink: 0;
    }
    .dbz-brand {
      font-family: -apple-system, "system-ui", "Segoe UI", Inter, sans-serif;
      font-weight: 700;
      display: inline-block;
      transform: translateY(0.04em);
      letter-spacing: -0.01em;
      font-size: 22px;
      color: #38bdf8;
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
    .dbz-hide-btn {
      width: 26px; height: 26px;
      display: grid; place-items: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
      font-family: inherit;
      transition: all 0.12s ease;
    }
    .dbz-hide-btn:hover {
      background: rgba(255,255,255,0.06);
      color: #e2e8f0;
      border-color: #334155;
    }
    .dbz-hide-btn svg { width: 14px; height: 14px; display: block; }

    /* Settings view */
    .dbz-settings { padding: 6px 4px 14px; }
    .dbz-settings-header {
      display: flex; align-items: center; gap: 10px;
      padding: 4px 10px 14px;
      border-bottom: 1px solid #334155;
      margin: 0 -14px 14px;
    }
    .dbz-settings-back {
      width: 26px; height: 26px; border-radius: 6px;
      display: grid; place-items: center;
      background: transparent; border: 1px solid transparent;
      color: #94a3b8; cursor: pointer;
      padding: 0; font-family: inherit;
    }
    .dbz-settings-back:hover {
      background: rgba(255,255,255,0.06); color: #e2e8f0; border-color: #334155;
    }
    .dbz-settings-title {
      font-weight: 600; font-size: 15px; color: #e2e8f0;
      letter-spacing: -0.005em;
    }
    .dbz-settings-section {
      font-family: "JetBrains Mono", monospace;
      font-size: 10px; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600;
      margin: 4px 0 10px 2px;
    }
    .dbz-setting {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid #334155;
      border-radius: 9px;
      margin-bottom: 6px;
    }
    .dbz-setting-info { min-width: 0; }
    .dbz-setting-label {
      font-size: 12.5px; color: #e2e8f0; font-weight: 500;
    }
    .dbz-setting-desc {
      font-size: 11px; color: #94a3b8; margin-top: 2px; line-height: 1.4;
    }
    .dbz-switch {
      flex-shrink: 0;
      width: 32px; height: 18px;
      border-radius: 10px;
      background: #334155;
      position: relative;
      cursor: pointer;
      border: none; padding: 0;
      transition: background 0.15s ease;
    }
    .dbz-switch::after {
      content: "";
      position: absolute; top: 2px; left: 2px;
      width: 14px; height: 14px;
      border-radius: 50%;
      background: #94a3b8;
      transition: transform 0.15s ease, background 0.15s ease;
    }
    .dbz-switch.on { background: rgba(56,189,248,0.25); }
    .dbz-switch.on::after { transform: translateX(14px); background: #38bdf8; }
    .dbz-settings-action {
      margin-top: 14px;
      width: 100%;
      padding: 9px 12px;
      background: rgba(248,113,113,0.08);
      border: 1px solid rgba(248,113,113,0.3);
      color: #f87171;
      border-radius: 8px;
      font-family: inherit; font-size: 12px; font-weight: 500;
      cursor: pointer;
    }
    .dbz-settings-action:hover {
      background: rgba(248,113,113,0.15);
    }
    .dbz-settings-foot {
      margin-top: 12px;
      font-family: "JetBrains Mono", monospace;
      font-size: 9.5px; color: #475569;
      text-align: center; letter-spacing: 0.04em;
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
      white-space: nowrap;
      background: var(--panel-bg, #1e293b);
      padding: 0 3px;
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
