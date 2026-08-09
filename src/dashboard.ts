export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AiFinPay Gemini Commerce Agent</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #07111f; color: #e9f2ff; }
    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 80px; }
    .eyebrow { color: #62d6ff; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; font-size: 12px; }
    h1 { max-width: 760px; margin: 10px 0 12px; font-size: clamp(36px, 7vw, 68px); line-height: .98; }
    .lead { color: #a9bbd2; max-width: 760px; font-size: 18px; line-height: 1.6; }
    .status { display: inline-flex; gap: 8px; align-items: center; border: 1px solid #25405f; border-radius: 999px; padding: 8px 12px; color: #b9cbe2; }
    .dot { width: 9px; height: 9px; background: #25d890; border-radius: 50%; box-shadow: 0 0 18px #25d890; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-top: 34px; }
    .card { border: 1px solid #1e3652; background: linear-gradient(145deg, #0d1d31, #0a1728); border-radius: 18px; padding: 22px; }
    .label { color: #8fa6c1; font-size: 13px; }
    .value { margin-top: 8px; font-size: 32px; font-weight: 750; }
    .flow { margin-top: 38px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
    .step { padding: 18px; border-left: 3px solid #4db9ff; background: #0a182a; border-radius: 8px; }
    .step strong { display: block; margin-bottom: 5px; }
    .step span { color: #90a8c4; font-size: 14px; line-height: 1.45; }
    footer { margin-top: 42px; color: #7890ac; font-size: 13px; }
    code { color: #74e3be; }
  </style>
</head>
<body>
<main>
  <div class="eyebrow">Build with Gemini XPRIZE</div>
  <h1>Autonomous commerce with deterministic guardrails.</h1>
  <p class="lead">Gemini evaluates paid digital services. AiFinPay enforces policy, executes HTTP 402 payments, verifies receipts, and records auditable evidence on Google Cloud.</p>
  <div class="status"><span class="dot"></span><span id="health">Checking production services…</span></div>

  <section class="grid" id="metrics"></section>

  <section class="flow">
    <div class="step"><strong>1. Objective</strong><span>Goal, budget, merchants, networks and assets.</span></div>
    <div class="step"><strong>2. Gemini</strong><span>Function-calling decision from the supplied offers.</span></div>
    <div class="step"><strong>3. Policy</strong><span>Independent deterministic validation before signing.</span></div>
    <div class="step"><strong>4. AiFinPay</strong><span>HTTP 402 settlement, receipt verification and delivery.</span></div>
    <div class="step"><strong>5. Evidence</strong><span>Firestore records and structured Cloud Logging traces.</span></div>
  </section>
  <footer>AiFinPay Gemini Commerce Agent · <code>/health</code> · <code>/v1/metrics</code></footer>
</main>
<script>
const fields = [
  ['Autonomous decisions', 'decisions'],
  ['Successful payments', 'successfulPayments'],
  ['Gross volume', 'grossPaymentVolumeUsd', true],
  ['AiFinPay revenue', 'protocolRevenueUsd', true],
  ['Merchant revenue', 'merchantRevenueUsd', true],
  ['Paying users', 'payingRequesters']
];
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 8 });
async function refresh() {
  const [health, metrics] = await Promise.all([fetch('/health').then(r => r.json()), fetch('/v1/metrics').then(r => r.json())]);
  document.getElementById('health').textContent = 'API online · Gemini ' + (health.services.gemini ? 'configured' : 'awaiting credentials') + ' · AiFinPay ' + (health.services.aifinpay ? 'configured' : 'awaiting wallet');
  document.getElementById('metrics').innerHTML = fields.map(([label, key, isMoney]) => '<article class="card"><div class="label">' + label + '</div><div class="value">' + (isMoney ? money.format(metrics[key] || 0) : (metrics[key] || 0)) + '</div></article>').join('');
}
refresh().catch(() => { document.getElementById('health').textContent = 'Metrics temporarily unavailable'; });
setInterval(refresh, 15000);
</script>
</body>
</html>`;
