import { useEffect } from "react"
import { useStorage } from "@plasmohq/storage/hook"

import { type Lang, DEFAULT_LANG, t } from "~shared/i18n"

export default function Welcome() {
  const [lang, setLang] = useStorage<Lang>("wd-lang", DEFAULT_LANG)

  useEffect(() => {
    document.title =
      lang === "bg"
        ? "Добре дошли в Джамбаз"
        : "Welcome to Джамбаз"
  }, [lang])

  function openSite(host: "mobile.bg" | "cars.bg") {
    window.location.href = `https://www.${host}/`
  }

  return (
    <>
      <style>{styles}</style>

      <nav className="nav">
        <div className="wrap nav-row">
          <a className="brand" href="#top">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5" />
                <circle cx="7.5" cy="16" r="1.6" />
                <circle cx="16.5" cy="16" r="1.6" />
                <path d="M3 13v3a1 1 0 0 0 1 1h1.4M21 13v3a1 1 0 0 1-1 1h-1.4" />
              </svg>
            </span>
            <span className="brand-word">Джамбаз</span>
          </a>
          <div className="nav-right">
            <div className="lang-switcher" role="group" aria-label={lang === "bg" ? "Език" : "Language"}>
              <button
                className={lang === "bg" ? "active" : ""}
                onClick={() => setLang("bg")}
                aria-current={lang === "bg" ? "true" : undefined}>
                BG
              </button>
              <button
                className={lang === "en" ? "active" : ""}
                onClick={() => setLang("en")}
                aria-current={lang === "en" ? "true" : undefined}>
                EN
              </button>
            </div>
          </div>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">
              <span className="dot" />
              {t("welcomeEyebrow", lang)}
            </span>
            <h1 className="hero-title">
              {t("welcomeHeroTitle", lang)}{" "}
              <span className="accent-a">{t("welcomeHeroAccent", lang)}</span>
            </h1>
            <p className="lede">{t("welcomeLede", lang)}</p>
            <div className="cta-row">
              <button className="btn btn-primary" onClick={() => openSite("mobile.bg")}>
                <ArrowSvg />
                {t("welcomeOpenMobileBg", lang)}
              </button>
              <button className="btn btn-ghost" onClick={() => openSite("cars.bg")}>
                <ArrowSvg />
                {t("welcomeOpenCarsBg", lang)}
              </button>
            </div>
            <div className="supported-card">
              <div className="label">{t("welcomeSupportedLabel", lang)}</div>
              <div className="sites">
                <span className="site-chip"><span className="dot-ok" />mobile.bg</span>
                <span className="site-chip"><span className="dot-ok" />cars.bg</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="browser">
              <div className="browser-bar">
                <div className="dots"><i /><i /><i /></div>
                <div className="urlbar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10h8M8 14h5"/></svg>
                  mobile.bg/obiavi/avtomobili
                </div>
                <div className="ext-chip"><span className="badge" /> Джамбаз</div>
              </div>
              <div className="browser-body">
                <div className="ext">
                  <div className="ext-header">
                    <div className="ext-name">Джамбаз</div>
                  </div>
                  <div className="ext-hero">
                    <div className="ext-hero-label">{lang === "bg" ? "Медианна цена" : "Median price"}</div>
                    <div className="ext-hero-value">14 200 €</div>
                    <div className="ext-hero-sub">
                      <span><b>62</b> {lang === "bg" ? "обяви" : "listings"}</span>
                      <span><b>2017</b> {lang === "bg" ? "год." : "yr"}</span>
                    </div>
                  </div>
                  <div className="ext-distro">
                    <div className="ext-distro-head">
                      <span className="k">{lang === "bg" ? "Разпределение" : "Distribution"}</span>
                      <span className="r">9.8k–22k €</span>
                    </div>
                    <div className="ext-hist">
                      {[
                        2, 3, 5, 8, 14, 18, 22, 26, 23, 17, 12, 8, 5, 3, 2,
                      ].map((h, i) => (
                        <div
                          key={i}
                          className={`ext-hist-bar ${i >= 4 && i <= 10 ? "iqr" : ""}`}
                          style={{ height: `${h * 1.2}px` }}
                        />
                      ))}
                    </div>
                    <div className="ext-hist-base" />
                    <div className="ext-hist-axis">
                      <span>9.8k</span>
                      <span className="m">14.2k</span>
                      <span>22k</span>
                    </div>
                  </div>
                  <div className="ext-verdicts">
                    <div className="vrow">
                      <span className="vt">BMW 320d · 2018</span>
                      <span className="ext-verdict ext-verdict-under">▾ {lang === "bg" ? "под пазара" : "under market"}</span>
                    </div>
                    <div className="vrow">
                      <span className="vt">Audi A4 · 2017</span>
                      <span className="ext-verdict ext-verdict-fair">— {lang === "bg" ? "справедлива" : "fair"}</span>
                    </div>
                    <div className="vrow">
                      <span className="vt">Mercedes C220 · 2019</span>
                      <span className="ext-verdict ext-verdict-over">▴ {lang === "bg" ? "над пазара" : "over market"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="how-it-works">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="section-kicker">{t("welcomeStepsKicker", lang)}</div>
              <h2>{t("welcomeStepsTitle", lang)}</h2>
            </div>
            <p>{t("welcomeStepsLede", lang)}</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-n">01</div>
              <h4>{t("welcomeStep1Title", lang)}</h4>
              <p>{t("welcomeStep1Body", lang)}</p>
            </div>
            <div className="step">
              <div className="step-n">02</div>
              <h4>{t("welcomeStep2Title", lang)}</h4>
              <p>{t("welcomeStep2Body", lang)}</p>
            </div>
            <div className="step">
              <div className="step-n">03</div>
              <h4>{t("welcomeStep3Title", lang)}</h4>
              <p>{t("welcomeStep3Body", lang)}</p>
            </div>
          </div>
          <div className="cta-row" style={{ marginTop: 32, justifyContent: "center" }}>
            <button className="btn btn-cyan" onClick={() => openSite("mobile.bg")}>
              <ArrowSvg />
              {t("welcomeGetStarted", lang)}
            </button>
          </div>
        </div>
      </section>

      <section className="privacy">
        <div className="wrap privacy-inner">
          <div>
            <div className="section-kicker">{t("welcomePrivacyKicker", lang)}</div>
            <h2>{t("welcomePrivacyTitle", lang)}</h2>
            <p className="lede small">{t("welcomePrivacyBody", lang)}</p>
            <ul className="privacy-bullets">
              <li><CheckSvg />{t("welcomePrivacyBullet1", lang)}</li>
              <li><CheckSvg />{t("welcomePrivacyBullet2", lang)}</li>
              <li><CheckSvg />{t("welcomePrivacyBullet3", lang)}</li>
            </ul>
          </div>
          <div className="privacy-card">
            <div className="head">
              <b>{lang === "bg" ? "Мрежови повиквания" : "Network calls"}</b>
              <span className="status">{lang === "bg" ? "локално" : "local only"}</span>
            </div>
            <div className="net-row">
              <span className="host">mobile.bg</span>
              <span className="type">read</span>
              <span className="res">200 OK</span>
            </div>
            <div className="net-row">
              <span className="host">cars.bg</span>
              <span className="type">read</span>
              <span className="res">200 OK</span>
            </div>
            <div className="net-row">
              <span className="host">analytics.*</span>
              <span className="type">tracker</span>
              <span className="res blocked">— {lang === "bg" ? "не се ползва" : "not used"}</span>
            </div>
            <div className="net-row">
              <span className="host">ads.*</span>
              <span className="type">ads</span>
              <span className="res blocked">— {lang === "bg" ? "не се ползва" : "not used"}</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="welcome-footer">
        <div className="wrap footer-row">
          <span>{t("welcomeFooterTip", lang)}</span>
          <span className="tag-note">{lang === "bg" ? "приятно карам!" : "happy hunting!"}</span>
        </div>
      </footer>
    </>
  )
}

function ArrowSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function CheckSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  )
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Caveat:wght@600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --ink: #0b1220;
  --ink-2: #23304a;
  --muted: #5a6782;
  --hair: #e6e9f0;
  --paper: #fbfaf7;
  --paper-2: #f3f1eb;
  --brand: #1a3a6b;
  --brand-2: #2458a6;
  --brand-ink: #0b1f3a;
  --cyan: #38bdf8;
  --cyan-2: #7dd3fc;
  --panel-bg: #1e293b;
  --panel-card: #334155;
  --panel-line: #475569;
  --panel-text: #e7edf7;
  --panel-muted: #8397b9;
  --ok: #2fbd78;
  --radius: 14px;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--ink);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

button { font-family: inherit; cursor: pointer; }
a { color: inherit; }

.wrap { max-width: 1200px; margin: 0 auto; padding: 0 28px; }

.nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(251, 250, 247, 0.85);
  backdrop-filter: saturate(140%) blur(10px);
  -webkit-backdrop-filter: saturate(140%) blur(10px);
  border-bottom: 1px solid var(--hair);
}
.nav-row {
  display: flex; align-items: center; justify-content: space-between;
  height: 64px;
}
.brand {
  display: inline-flex; align-items: center; gap: 12px;
  font-weight: 700; color: var(--ink);
  text-decoration: none;
}
.brand-mark {
  width: 32px; height: 32px; border-radius: 9px;
  background: var(--brand); color: #fff;
  display: grid; place-items: center;
  box-shadow: 0 6px 16px -6px rgba(26, 58, 107, 0.5);
}
.brand-mark svg { width: 20px; height: 20px; }
.brand-word {
  font-family: 'Caveat', 'Georgia', serif;
  font-size: 28px; line-height: 1; color: var(--brand);
  font-weight: 700; letter-spacing: -0.01em;
}
.nav-right { display: inline-flex; align-items: center; gap: 14px; }

.lang-switcher {
  display: inline-flex;
  background: rgba(15, 23, 42, 0.05);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
}
.lang-switcher button {
  padding: 4px 11px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: 999px;
  color: var(--muted);
  background: transparent;
  border: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.lang-switcher button:hover { color: var(--ink); background: rgba(15, 23, 42, 0.04); }
.lang-switcher button.active {
  background: white; color: var(--brand);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.hero {
  background:
    radial-gradient(1100px 480px at 85% -10%, rgba(26, 58, 107, 0.10), transparent 60%),
    radial-gradient(800px 380px at -5% 20%, rgba(26, 58, 107, 0.06), transparent 60%),
    var(--paper);
  padding: 72px 0 64px;
  border-bottom: 1px solid var(--hair);
  position: relative;
  overflow: hidden;
}
.hero-grid {
  display: grid; grid-template-columns: 1.05fr 1fr; gap: 56px; align-items: center;
}
.eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 600; color: var(--brand);
  padding: 6px 11px; border: 1px solid rgba(26, 58, 107, 0.25);
  border-radius: 999px; background: rgba(26, 58, 107, 0.06);
  letter-spacing: 0.02em;
}
.eyebrow .dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--ok);
  box-shadow: 0 0 0 3px rgba(47, 189, 120, 0.2);
}

h1.hero-title {
  font-size: clamp(38px, 5vw, 60px);
  line-height: 1.05;
  letter-spacing: -0.025em;
  margin: 20px 0 18px;
  font-weight: 800;
  color: var(--ink);
  text-wrap: balance;
}
h1.hero-title .accent-a {
  color: var(--brand);
  font-family: 'Caveat', cursive;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.lede {
  font-size: 19px; line-height: 1.55; color: var(--ink-2); max-width: 560px;
  margin: 0 0 28px;
  text-wrap: pretty;
}
.lede.small { font-size: 16px; max-width: none; }

.cta-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 13px 20px; border-radius: 10px; font-weight: 600; font-size: 15px;
  text-decoration: none; border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}
.btn:active { transform: translateY(1px); }
.btn-primary {
  background: var(--brand); color: white;
  box-shadow: 0 10px 24px -10px rgba(26, 58, 107, 0.6),
              inset 0 1px 0 rgba(255, 255, 255, 0.14);
}
.btn-primary:hover { background: var(--brand-ink); }
.btn-ghost {
  background: white; color: var(--ink); border-color: var(--hair);
}
.btn-ghost:hover { border-color: #cfd4df; }
.btn-cyan {
  background: var(--cyan); color: var(--brand-ink);
  box-shadow: 0 10px 24px -10px rgba(56, 189, 248, 0.55),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.btn-cyan:hover { background: var(--cyan-2); }

.supported-card {
  margin-top: 22px; padding: 14px 16px;
  background: white; border: 1px solid var(--hair); border-radius: 12px;
  display: flex; align-items: center; gap: 14px;
  max-width: 520px;
}
.supported-card .label {
  font-size: 11px; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.06em; font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}
.supported-card .sites { display: flex; gap: 8px; flex-wrap: wrap; }
.site-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 999px; background: var(--paper-2);
  font-size: 13px; font-weight: 600; color: var(--ink);
}
.site-chip .dot-ok {
  width: 6px; height: 6px; border-radius: 50%; background: var(--ok);
}

.hero-visual { position: relative; }
.browser {
  background: white; border: 1px solid var(--hair); border-radius: 14px;
  box-shadow: 0 40px 80px -40px rgba(10, 20, 50, 0.28),
              0 2px 6px rgba(10, 20, 50, 0.04);
  overflow: hidden;
}
.browser-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-bottom: 1px solid var(--hair);
  background: #fafbfd;
}
.dots { display: flex; gap: 6px; }
.dots i { width: 10px; height: 10px; border-radius: 50%; background: #e2e5ec; display: inline-block; }
.urlbar {
  flex: 1; height: 26px; border-radius: 6px; background: #eef0f5;
  display: flex; align-items: center; padding: 0 10px;
  font-size: 11.5px; color: var(--muted); gap: 6px;
  font-family: 'JetBrains Mono', monospace;
}
.urlbar svg { width: 10px; height: 10px; }
.ext-chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: white; border: 1px solid var(--hair); border-radius: 6px;
  padding: 3px 8px; font-size: 11px; color: var(--brand);
  font-weight: 600;
}
.ext-chip .badge { width: 6px; height: 6px; border-radius: 50%; background: var(--ok); }

.browser-body { display: block; }
.ext {
  background: var(--panel-bg);
  color: var(--panel-text);
  padding: 16px 16px 18px;
  font-size: 12.5px;
}
.ext-header {
  display: flex; align-items: center;
  padding: 2px 2px 14px;
  border-bottom: 1px solid var(--panel-line);
  margin-bottom: 14px;
}
.ext-name {
  font-family: 'Caveat', 'Georgia', serif;
  font-weight: 700; font-size: 22px; color: var(--cyan);
  line-height: 1; letter-spacing: -0.01em;
}
.ext-hero {
  padding: 14px 16px 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0));
  border: 1px solid var(--panel-line);
  border-radius: 10px;
  margin-bottom: 12px;
}
.ext-hero-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px; color: var(--panel-muted);
  letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600;
}
.ext-hero-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 30px; line-height: 1;
  color: #fff; font-weight: 600;
  letter-spacing: -0.02em;
  margin-top: 6px;
}
.ext-hero-sub {
  font-size: 11px; color: var(--panel-muted);
  margin-top: 8px; display: flex; gap: 14px; flex-wrap: wrap;
}
.ext-hero-sub b { color: #cbd5e1; font-weight: 500; }
.ext-distro { margin: 8px 4px 14px; }
.ext-distro-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 8px;
}
.ext-distro-head .k {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px; color: var(--panel-muted);
  letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600;
}
.ext-distro-head .r {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; color: var(--panel-muted);
}
.ext-hist {
  height: 40px;
  display: flex; align-items: flex-end; gap: 2px;
}
.ext-hist-bar {
  flex: 1; min-height: 3px;
  background: #64748b; opacity: 0.4;
  border-radius: 1.5px 1.5px 0 0;
}
.ext-hist-bar.iqr { background: var(--cyan); opacity: 0.85; }
.ext-hist-base { height: 1px; background: var(--panel-line); margin-top: 2px; }
.ext-hist-axis {
  display: flex; justify-content: space-between;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; color: var(--panel-muted);
  margin-top: 6px;
}
.ext-hist-axis .m { color: var(--cyan); font-weight: 600; }

.ext-verdicts { display: flex; flex-direction: column; gap: 6px; }
.vrow {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--panel-line);
  border-radius: 8px;
  font-size: 12px;
}
.vrow .vt { color: #fff; font-weight: 500; }
.ext-verdict {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.02em;
}
.ext-verdict-under { color: #4ade80; }
.ext-verdict-fair { color: var(--panel-muted); }
.ext-verdict-over { color: #fbbf24; }

section { padding: 96px 0; border-bottom: 1px solid var(--hair); }
.section-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 40px; margin-bottom: 48px;
}
.section-kicker {
  font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--brand);
  text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600;
  margin-bottom: 12px;
}
h2 {
  font-size: clamp(30px, 3.4vw, 42px); line-height: 1.05; letter-spacing: -0.02em;
  margin: 0; font-weight: 800; max-width: 640px; text-wrap: balance;
}
.section-head p {
  font-size: 16px; color: var(--ink-2); max-width: 380px; margin: 0;
  text-wrap: pretty;
}

.how-it-works { background: var(--panel-bg); color: var(--panel-text); border-bottom: 0; }
.how-it-works .section-kicker { color: var(--cyan); }
.how-it-works h2 { color: white; }
.how-it-works .section-head p { color: rgba(255, 255, 255, 0.75); }

.steps {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
}
.step {
  background: var(--panel-card);
  border: 1px solid var(--panel-line);
  border-radius: var(--radius); padding: 26px;
}
.step-n {
  font-family: 'Caveat', cursive; font-size: 44px; color: var(--cyan);
  line-height: 1; margin-bottom: 10px;
}
.step h4 { margin: 0 0 10px; font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.005em; }
.step p { margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.78); line-height: 1.55; }

.privacy { background: var(--paper); }
.privacy-inner {
  display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;
}
.privacy-bullets {
  list-style: none; padding: 0; margin: 18px 0 0;
  display: flex; flex-direction: column; gap: 10px;
}
.privacy-bullets li {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 14.5px; color: var(--ink-2);
}
.privacy-bullets svg { color: var(--ok); flex-shrink: 0; }
.privacy-card {
  background: var(--panel-bg); color: var(--panel-text);
  border: 1px solid var(--panel-line); border-radius: var(--radius);
  padding: 22px;
}
.privacy-card .head {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 12px; margin-bottom: 10px; border-bottom: 1px solid var(--panel-line);
}
.privacy-card .head b { font-size: 12.5px; color: #fff; }
.privacy-card .head .status {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  color: var(--ok); display: inline-flex; align-items: center; gap: 6px;
}
.privacy-card .head .status::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--ok);
  box-shadow: 0 0 0 3px rgba(47, 189, 120, 0.2);
}
.net-row {
  display: grid; grid-template-columns: 1fr auto auto;
  gap: 16px; align-items: center;
  padding: 9px 0; border-bottom: 1px dashed var(--panel-line);
  font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
}
.net-row:last-child { border-bottom: 0; }
.net-row .host { color: #fff; }
.net-row .type { color: var(--panel-muted); }
.net-row .res { color: var(--ok); font-weight: 600; }
.net-row .res.blocked { color: var(--panel-muted); font-weight: 500; }

.welcome-footer {
  padding: 30px 0;
  background: var(--ink); color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}
.welcome-footer .footer-row {
  display: flex; justify-content: space-between; align-items: center;
  gap: 20px; flex-wrap: wrap;
}
.tag-note { font-family: 'Caveat', cursive; font-size: 28px; color: var(--cyan); line-height: 1; }

@media (max-width: 960px) {
  .hero-grid { grid-template-columns: 1fr; gap: 40px; }
  .steps { grid-template-columns: 1fr; }
  .privacy-inner { grid-template-columns: 1fr; gap: 30px; }
  .section-head { flex-direction: column; align-items: flex-start; gap: 12px; }
  section { padding: 64px 0; }
}

@media (max-width: 640px) {
  .wrap { padding: 0 18px; }
  .hero { padding: 48px 0 40px; }
  h1.hero-title { font-size: clamp(28px, 9vw, 40px); }
  .lede { font-size: 17px; }
  h2 { font-size: clamp(24px, 6.5vw, 30px); }
  .nav-row { height: 56px; }
  section { padding: 48px 0; }
  .welcome-footer .footer-row { flex-direction: column; text-align: center; gap: 10px; }
}
`
