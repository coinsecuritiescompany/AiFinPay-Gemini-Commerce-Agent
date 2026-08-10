export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#07111f" />
  <title>AiFinPay Gemini Commerce Agent</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --bg: #06101d;
      --surface: #0b1828;
      --surface2: #0f2135;
      --line: rgba(122, 169, 220, .18);
      --text: #f4f8ff;
      --muted: #9bb0c8;
      --blue: #5aa8ff;
      --cyan: #54d8ff;
      --green: #42dfac;
      --violet: #9c7cff;
      --amber: #ffcf70;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(900px 480px at 90% -10%, rgba(78, 91, 255, .18), transparent 60%),
        radial-gradient(700px 380px at -10% 28%, rgba(20, 171, 255, .12), transparent 62%),
        var(--bg);
      color: var(--text);
    }
    a { color: inherit; text-decoration: none; }
    button { font: inherit; }
    .shell { width: min(1180px, calc(100% - 28px)); margin: 0 auto; }
    .nav {
      min-height: 76px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      border-bottom: 1px solid var(--line);
    }
    .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .brand-mark {
      width: 48px; height: 48px; border-radius: 13px; display:grid; place-items:center;
      background: linear-gradient(145deg, #eef7ff, #ffffff); box-shadow: 0 0 0 1px rgba(255,255,255,.12), 0 10px 34px rgba(47,124,255,.16);
    }
    .brand-mark img { width: 100%; height: 100%; border-radius: 13px; object-fit: cover; display: block; }
    .brand-name { font-weight: 800; font-size: 18px; letter-spacing: -.02em; }
    .brand-sub { color: var(--muted); font-size: 11px; margin-top: 2px; letter-spacing: .11em; text-transform: uppercase; }
    .nav-links { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; justify-content: flex-end; }
    .nav-link {
      color: #b9c9dc; font-size: 13px; padding: 9px 12px;
      border: 1px solid var(--line); border-radius: 999px; background: rgba(12,27,45,.62);
    }
    .nav-link:hover { border-color: rgba(90,168,255,.48); color: #fff; }
    .hero {
      padding: 66px 0 34px;
      display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
      gap: 34px; align-items: center;
    }
    .kicker { display: flex; align-items: center; gap: 9px; color: #79d9ff; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; font-size: 11px; }
    .gemini-star {
      display: inline-grid; place-items: center; width: 24px; height: 24px; font-size: 22px;
      background: linear-gradient(135deg, #63c7ff, #9b79ff); -webkit-background-clip: text; color: transparent;
      filter: drop-shadow(0 0 12px rgba(117,132,255,.42));
    }
    h1 {
      margin: 16px 0 18px; max-width: 780px;
      font-size: clamp(42px, 7vw, 78px); line-height: .96; letter-spacing: -.055em;
    }
    .gradient-text {
      background: linear-gradient(90deg, #f7fbff 3%, #99d4ff 52%, #c4b1ff 92%);
      -webkit-background-clip: text; color: transparent;
    }
    .lead { margin: 0; max-width: 760px; color: #aabbd0; font-size: clamp(16px, 2vw, 19px); line-height: 1.65; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      min-height: 44px; padding: 0 15px; border-radius: 12px; border: 1px solid var(--line);
      background: #0b1b2e; color: #dbeaff; font-weight: 700; font-size: 13px;
    }
    .btn.primary { background: linear-gradient(135deg, #2f82ff, #7559f7); border-color: transparent; box-shadow: 0 12px 40px rgba(64,111,255,.24); }
    .hero-panel {
      position: relative; overflow: hidden; min-height: 340px; padding: 24px;
      border: 1px solid rgba(118,151,255,.25); border-radius: 26px;
      background: linear-gradient(155deg, rgba(15,31,57,.92), rgba(8,18,33,.96));
      box-shadow: 0 28px 80px rgba(0,0,0,.26);
    }
    .hero-panel:before {
      content: ""; position: absolute; width: 290px; height: 290px; border-radius: 50%; top: -110px; right: -80px;
      background: radial-gradient(circle, rgba(119,89,255,.28), transparent 67%); pointer-events: none;
    }
    .live-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 24px; position: relative; }
    .live-badge {
      display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: #c9d8eb;
      padding: 8px 10px; border: 1px solid var(--line); border-radius: 999px; background: rgba(5,14,26,.62);
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 14px var(--green); flex: 0 0 auto; }
    .version { color: #91a7c0; font-size: 12px; }
    .agent-title { font-size: 26px; font-weight: 800; letter-spacing: -.035em; margin-bottom: 6px; position: relative; }
    .agent-sub { color: #92a8c1; line-height: 1.5; font-size: 14px; position: relative; }
    .mini-flow { display: grid; gap: 9px; margin-top: 23px; position: relative; }
    .mini-node {
      display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 10px;
      padding: 11px 12px; border-radius: 13px; background: rgba(10,27,47,.76); border: 1px solid var(--line);
    }
    .mini-icon { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: rgba(90,168,255,.11); color: #8dc7ff; font-weight: 900; }
    .mini-node strong { font-size: 13px; }
    .mini-node small { display: block; margin-top: 2px; color: #8097b0; }
    .mini-state { color: #77e3bb; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
    .section { padding: 34px 0; }
    .section-head { display: flex; justify-content: space-between; gap: 18px; align-items: end; margin-bottom: 18px; }
    .section h2 { margin: 0; font-size: clamp(27px, 4vw, 38px); letter-spacing: -.04em; }
    .section-copy { max-width: 680px; color: var(--muted); line-height: 1.55; font-size: 14px; }
    .cap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .cap-card {
      min-height: 210px; padding: 22px; border: 1px solid var(--line); border-radius: 20px;
      background: linear-gradient(145deg, rgba(14,31,51,.9), rgba(7,18,31,.94)); position: relative; overflow: hidden;
    }
    .cap-card:after { content:""; position:absolute; width:140px;height:140px;border-radius:50%;right:-70px;bottom:-70px;background:rgba(90,168,255,.08); }
    .cap-num { color: #6fbfff; font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
    .cap-card h3 { margin: 12px 0 9px; font-size: 22px; letter-spacing: -.025em; }
    .cap-card p { margin: 0; color: #91a6bf; font-size: 14px; line-height: 1.58; }
    .cap-tag { margin-top: 18px; display: inline-flex; border: 1px solid var(--line); border-radius: 999px; padding: 7px 9px; color: #bfd0e3; font-size: 11px; background: rgba(3,12,22,.45); }
    .metrics-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
    .metric {
      min-height: 120px; padding: 18px; border: 1px solid var(--line); border-radius: 18px; background: rgba(11,27,46,.8);
    }
    .metric-label { color: #8299b3; font-size: 11px; line-height: 1.3; min-height: 29px; }
    .metric-value { margin-top: 9px; font-size: clamp(22px, 3vw, 30px); font-weight: 850; letter-spacing: -.04em; }
    .system-layout { display: grid; grid-template-columns: 1.05fr .95fr; gap: 14px; }
    .panel { border: 1px solid var(--line); border-radius: 22px; background: rgba(9,23,39,.84); padding: 20px; }
    .panel-title { font-size: 16px; font-weight: 800; margin-bottom: 14px; }
    .service-list { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
    .service {
      display: flex; justify-content: space-between; align-items: center; gap: 10px;
      border: 1px solid rgba(122,169,220,.13); border-radius: 13px; padding: 11px 12px; background: rgba(5,15,27,.45);
    }
    .service strong { font-size: 12px; }
    .state { font-size: 10px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
    .state.on { color: #62e0b6; }
    .state.off { color: #8da2b9; }
    .wallet { display: grid; gap: 10px; }
    .wallet-row { padding: 12px; border: 1px solid rgba(122,169,220,.13); border-radius: 13px; background: rgba(5,15,27,.45); }
    .wallet-row .k { color: #8299b3; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; }
    .wallet-row .v { margin-top: 6px; color: #e8f2ff; font-size: 13px; font-weight: 700; word-break: break-all; }
    .wallet-inline { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .pipeline {
      position: relative; display: grid; grid-template-columns: repeat(6, 1fr); gap: 9px;
    }
    .flow-card {
      border: 1px solid var(--line); background: linear-gradient(150deg, #0c2035, #091727); border-radius: 17px; padding: 16px 14px; min-height: 150px;
    }
    .flow-card .n { color: #67b8ff; font-size: 10px; font-weight: 900; letter-spacing: .1em; }
    .flow-card strong { display: block; margin-top: 9px; font-size: 14px; }
    .flow-card span { display: block; color: #849ab4; margin-top: 7px; font-size: 12px; line-height: 1.45; }
    .evidence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .evidence-item { display: flex; gap: 10px; padding: 12px 0; border-bottom: 1px solid rgba(122,169,220,.1); }
    .evidence-item:last-child { border-bottom: 0; }
    .check, .pending { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; flex: 0 0 auto; font-size: 11px; font-weight: 900; }
    .check { color: #07151e; background: #55ddb1; }
    .pending { color: #d9e3ef; background: #26384c; }
    .evidence-item strong { display:block; font-size: 13px; }
    .evidence-item span { display:block; color: #8198b2; font-size: 12px; margin-top: 3px; line-height: 1.4; }
    .footer {
      margin-top: 34px; padding: 28px 0 38px; border-top: 1px solid var(--line);
      display: flex; justify-content: space-between; gap: 18px; color: #7188a2; font-size: 12px; flex-wrap: wrap;
    }
    .footer-links { display:flex; gap:14px; flex-wrap:wrap; }
    .footer a:hover { color:#cde3ff; }
    .muted { color: var(--muted); }
    code { color: #73e0bd; }
    @media (max-width: 980px) {
      .hero { grid-template-columns: 1fr; padding-top: 44px; }
      .hero-panel { min-height: 0; }
      .cap-grid { grid-template-columns: 1fr; }
      .metrics-grid { grid-template-columns: repeat(3, 1fr); }
      .system-layout, .evidence-grid { grid-template-columns: 1fr; }
      .pipeline { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 620px) {
      .shell { width: min(100% - 22px, 1180px); }
      .nav { align-items: flex-start; padding: 14px 0; }
      .brand-mark { width: 42px; height: 42px; }
      .brand-mark img { width: 100%; height: 100%; border-radius: 13px; object-fit: cover; display: block; }
      .brand-sub { display: none; }
      .nav-link:nth-child(3) { display: none; }
      .hero { padding-top: 32px; gap: 24px; }
      h1 { font-size: 45px; }
      .lead { font-size: 15px; }
      .hero-panel { padding: 18px; border-radius: 20px; }
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .metric { min-height: 108px; padding: 15px; }
      .service-list, .wallet-inline { grid-template-columns: 1fr; }
      .pipeline { grid-template-columns: 1fr 1fr; }
      .section { padding: 27px 0; }
      .section-head { display:block; }
      .section-copy { margin-top: 8px; }
    }
  </style>
</head>
<body>
  <header class="shell nav">
    <a class="brand" href="/">
      <span class="brand-mark"><img src="data:image/webp;base64,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" alt="AiFinPay logo" /></span>
      <div>
        <div class="brand-name">AiFinPay</div>
        <div class="brand-sub">AI Agent Payment Protocol</div>
      </div>
    </a>
    <nav class="nav-links" aria-label="Project links">
      <a class="nav-link" href="https://www.npmjs.com/package/aifinpay-gemini-commerce-agent" target="_blank" rel="noreferrer">npm v0.2.1</a>
      <a class="nav-link" href="https://github.com/coinsecuritiescompany/AiFinPay-Gemini-Commerce-Agent" target="_blank" rel="noreferrer">GitHub</a>
      <a class="nav-link" href="https://aifinpay.io" target="_blank" rel="noreferrer">aifinpay.io</a>
    </nav>
  </header>

  <main class="shell">
    <section class="hero">
      <div>
        <div class="kicker"><span class="gemini-star">✦</span> Build with Gemini XPRIZE</div>
        <h1><span class="gradient-text">Gemini Commerce Agent.</span><br />Autonomous procurement with financial guardrails.</h1>
        <p class="lead">
          See what is needed, discover offers, negotiate price, enforce deterministic spending policy,
          pay through AiFinPay AIFP-1, recover from transient failures, verify delivery, and leave an auditable trail.
        </p>
        <div class="hero-actions">
          <a class="btn primary" href="#live">View live system</a>
          <a class="btn" href="https://github.com/coinsecuritiescompany/AiFinPay-Gemini-Commerce-Agent/blob/main/ADVANCED_COMMERCE.md" target="_blank" rel="noreferrer">Advanced commerce docs ↗</a>
        </div>
      </div>

      <aside class="hero-panel">
        <div class="live-row">
          <div class="live-badge"><span class="dot"></span><span id="hero-live">Checking production…</span></div>
          <div class="version">v0.2.1</div>
        </div>
        <div class="agent-title">Gemini <span class="muted">×</span> AiFinPay</div>
        <div class="agent-sub">Reasoning stays separate from financial authority. Gemini proposes. Policy authorizes. AiFinPay executes.</div>
        <div class="mini-flow">
          <div class="mini-node"><div class="mini-icon">✦</div><div><strong>Gemini</strong><small>Vision + structured commerce decision</small></div><div class="mini-state" id="mini-gemini">—</div></div>
          <div class="mini-node"><div class="mini-icon">✓</div><div><strong>Deterministic policy</strong><small>Budget, merchant, network and asset controls</small></div><div class="mini-state">Always</div></div>
          <div class="mini-node"><div class="mini-icon">402</div><div><strong>AiFinPay AIFP-1</strong><small>Exact approved HTTP 402 execution</small></div><div class="mini-state" id="mini-aifp">—</div></div>
          <div class="mini-node"><div class="mini-icon">↻</div><div><strong>Self-healing</strong><small>Bounded retry and allowlisted failover</small></div><div class="mini-state">Enabled</div></div>
        </div>
      </aside>
    </section>

    <section class="section">
      <div class="section-head">
        <div><div class="kicker">v0.2 capabilities</div><h2>From payment script to procurement operator.</h2></div>
        <div class="section-copy">The AI layer can reason across visual and merchant data, but it cannot expand budgets, allowlists, or signing authority.</div>
      </div>
      <div class="cap-grid">
        <article class="cap-card">
          <div class="cap-num">01 · See</div>
          <h3>Multimodal procurement</h3>
          <p>Upload a server-part photo, product image, invoice, chart, or analytics screenshot. Gemini extracts procurement facts and converts them into a bounded objective and merchant-search query.</p>
          <div class="cap-tag" id="vision-tag">Gemini vision status: checking</div>
        </article>
        <article class="cap-card">
          <div class="cap-num">02 · Negotiate</div>
          <h3>Dynamic negotiation</h3>
          <p>When merchant and policy allow it, Gemini may propose a counter-offer. Discount limits, price floors, budget thresholds, origin checks and final payment authorization stay deterministic.</p>
          <div class="cap-tag">Counter-offers are re-validated before payment</div>
        </article>
        <article class="cap-card">
          <div class="cap-num">03 · Recover</div>
          <h3>Self-healing payments</h3>
          <p>Gas spikes, RPC outages and transient network failures are classified and retried within a bounded attempt budget. Alternative paths are used only when pre-supplied and allowlisted.</p>
          <div class="cap-tag">No uncontrolled network or asset switching</div>
        </article>
      </div>
    </section>

    <section class="section" id="live">
      <div class="section-head">
        <div><div class="kicker">Live commerce telemetry</div><h2>Production metrics.</h2></div>
        <div class="section-copy" id="updated-at">Refreshing from the live service…</div>
      </div>
      <div class="metrics-grid" id="metrics"></div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><div class="kicker">Runtime</div><h2>System and wallet status.</h2></div>
        <div class="section-copy">Unavailable optional integrations are shown as not configured — not as successful evidence.</div>
      </div>
      <div class="system-layout">
        <article class="panel">
          <div class="panel-title">Service integrations</div>
          <div class="service-list" id="services"></div>
        </article>
        <article class="panel">
          <div class="panel-title">AiFinPay execution wallet</div>
          <div class="wallet" id="wallet">
            <div class="wallet-row"><div class="k">Status</div><div class="v">Loading safe public wallet data…</div></div>
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><div class="kicker">Execution path</div><h2>One bounded commerce loop.</h2></div>
        <div class="section-copy">Every step preserves the trust boundary between AI reasoning and financial authority.</div>
      </div>
      <div class="pipeline">
        <div class="flow-card"><div class="n">01</div><strong>Observe</strong><span>Text, JSON, photo, invoice, chart or dashboard screenshot.</span></div>
        <div class="flow-card"><div class="n">02</div><strong>Source</strong><span>Validated offers from supplied data or configured merchant catalogs.</span></div>
        <div class="flow-card"><div class="n">03</div><strong>Decide</strong><span>Gemini proposes PAY, NEGOTIATE, ASK_USER or REJECT.</span></div>
        <div class="flow-card"><div class="n">04</div><strong>Authorize</strong><span>Deterministic policy checks exact offer, budget and allowlists.</span></div>
        <div class="flow-card"><div class="n">05</div><strong>Pay / Recover</strong><span>AIFP-1 executes HTTP 402; bounded recovery handles transient failures.</span></div>
        <div class="flow-card"><div class="n">06</div><strong>Verify</strong><span>Receipt metadata, settlement evidence and delivery hash are recorded.</span></div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><div class="kicker">Hackathon evidence</div><h2>Verified vs. still pending.</h2></div>
        <div class="section-copy">The dashboard does not convert code coverage into claims about external merchants or real settlement events.</div>
      </div>
      <div class="evidence-grid">
        <article class="panel">
          <div class="panel-title">Verified now</div>
          <div class="evidence-item"><div class="check">✓</div><div><strong>Production service</strong><span>Render-hosted public runtime with live health and metrics endpoints.</span></div></div>
          <div class="evidence-item"><div class="check">✓</div><div><strong>Gemini structured call</strong><span>Production Gemini 3.6 Flash smoke call previously completed successfully.</span></div></div>
          <div class="evidence-item"><div class="check">✓</div><div><strong>20 automated tests</strong><span>Policy, API, config and advanced-commerce tests pass in CI/release validation.</span></div></div>
          <div class="evidence-item"><div class="check">✓</div><div><strong>npm distribution</strong><span><code>aifinpay-gemini-commerce-agent@0.2.1</code> is published.</span></div></div>
        </article>
        <article class="panel">
          <div class="panel-title">Production evidence to earn</div>
          <div class="evidence-item"><div class="pending">•</div><div><strong id="settlement-evidence">First funded AIFP-1 settlement</strong><span id="settlement-evidence-copy">Awaiting a real paid transaction and receipt / tx reference.</span></div></div>
          <div class="evidence-item"><div class="pending">•</div><div><strong>External merchant negotiation</strong><span>Logic is implemented and tested; real merchant acceptance is not yet claimed.</span></div></div>
          <div class="evidence-item"><div class="pending">•</div><div><strong>Real failover event</strong><span>Recovery code is implemented; real cross-network recovery is not yet claimed.</span></div></div>
          <div class="evidence-item"><div class="pending">•</div><div><strong>Firestore / Circle proof</strong><span>Optional integrations remain separately visible in live service status.</span></div></div>
        </article>
      </div>
    </section>
  </main>

  <footer class="shell footer">
    <div>AiFinPay Gemini Commerce Agent · policy-controlled autonomous commerce</div>
    <div class="footer-links">
      <a href="/health">/health</a>
      <a href="/v1/metrics">/v1/metrics</a>
      <a href="/v1/aifinpay/status">/v1/aifinpay/status</a>
      <a href="https://github.com/coinsecuritiescompany/AiFinPay-Gemini-Commerce-Agent" target="_blank" rel="noreferrer">GitHub ↗</a>
    </div>
  </footer>

<script>
const metricFields = [
  ['Autonomous decisions', 'decisions'],
  ['Successful payments', 'successfulPayments'],
  ['Gross volume', 'grossPaymentVolumeUsd', true],
  ['AiFinPay revenue', 'protocolRevenueUsd', true],
  ['Merchant revenue', 'merchantRevenueUsd', true],
  ['Paying users', 'payingRequesters']
];
const serviceLabels = [
  ['gemini', 'Gemini reasoning'],
  ['multimodalVision', 'Multimodal vision'],
  ['merchantDiscovery', 'Merchant discovery'],
  ['aifinpay', 'AiFinPay executor'],
  ['firestore', 'Google Firestore'],
  ['circle', 'Circle wallet']
];
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 8 });
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function shortAddress(value) { if (!value) return 'Unavailable'; const s = String(value); return s.length > 24 ? s.slice(0, 12) + '…' + s.slice(-10) : s; }
function displayBalance(balance) {
  if (balance == null) return 'Unavailable';
  if (typeof balance === 'number' || typeof balance === 'string') return String(balance);
  const candidates = [['POL / Polygon', balance.polygon ?? balance.pol ?? balance.matic], ['SOL / Solana', balance.solana ?? balance.sol], ['Native', balance.native]].filter(([,v]) => v !== undefined && v !== null);
  if (candidates.length) return candidates.map(([k,v]) => k + ': ' + String(v)).join(' · ');
  try { const compact = JSON.stringify(balance); return compact.length > 120 ? compact.slice(0,117) + '…' : compact; } catch { return 'Available'; }
}
function stateMarkup(on) { return '<span class="state ' + (on ? 'on' : 'off') + '">' + (on ? 'Active' : 'Not configured') + '</span>'; }
function walletRow(k, v) { return '<div class="wallet-row"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div>'; }
async function refresh() {
  const [health, metrics, wallet] = await Promise.all([
    fetch('/health', { cache: 'no-store' }).then(r => r.json()),
    fetch('/v1/metrics', { cache: 'no-store' }).then(r => r.json()),
    fetch('/v1/aifinpay/status', { cache: 'no-store' }).then(r => r.json())
  ]);
  document.getElementById('hero-live').textContent = 'Production online · Gemini ' + (health.services?.gemini ? 'live' : 'not configured') + ' · AiFinPay ' + (health.services?.aifinpay ? 'ready' : 'not configured');
  document.getElementById('mini-gemini').textContent = health.services?.gemini ? 'Live' : 'Pending';
  document.getElementById('mini-aifp').textContent = health.services?.aifinpay ? 'Ready' : 'Pending';
  document.getElementById('vision-tag').textContent = 'Gemini vision: ' + (health.services?.multimodalVision ? 'active in production' : 'not configured');
  document.getElementById('metrics').innerHTML = metricFields.map(([label, key, isMoney]) => {
    const raw = metrics[key] ?? 0; const value = isMoney ? money.format(Number(raw) || 0) : String(raw);
    return '<article class="metric"><div class="metric-label">' + label + '</div><div class="metric-value">' + value + '</div></article>';
  }).join('');
  document.getElementById('services').innerHTML = serviceLabels.map(([key, label]) => '<div class="service"><strong>' + label + '</strong>' + stateMarkup(Boolean(health.services?.[key])) + '</div>').join('');
  document.getElementById('wallet').innerHTML = [
    walletRow('Funding network', wallet.recommendedFundingNetwork || 'polygon'),
    walletRow('EVM address', shortAddress(wallet.evmAddress)),
    walletRow('Balance snapshot', displayBalance(wallet.balance)),
    '<div class="wallet-inline">' + walletRow('Daily budget', money.format(Number(wallet.dailyBudgetUsd) || 0)) + walletRow('Per-call cap', money.format(Number(wallet.perCallBudgetUsd) || 0)) + '</div>'
  ].join('');
  const paid = Number(metrics.successfulPayments || 0);
  if (paid > 0) { document.getElementById('settlement-evidence').textContent = 'Funded AIFP-1 settlement recorded'; document.getElementById('settlement-evidence-copy').textContent = paid + ' successful payment(s) recorded by the production metrics store.'; }
  const time = health.timestamp ? new Date(health.timestamp) : new Date();
  document.getElementById('updated-at').textContent = 'Live refresh every 15 seconds · last health update ' + time.toLocaleTimeString();
}
refresh().catch(() => {
  document.getElementById('hero-live').textContent = 'Live telemetry temporarily unavailable';
  document.getElementById('metrics').innerHTML = metricFields.map(([label]) => '<article class="metric"><div class="metric-label">' + label + '</div><div class="metric-value">—</div></article>').join('');
});
setInterval(refresh, 15000);
</script>
</body>
</html>`;
