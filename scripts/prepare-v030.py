from pathlib import Path
import re

p = Path("src/dashboard.ts")
s = p.read_text()

css_old = """    .wallet { display: grid; gap: 10px; }
    .wallet-row { padding: 12px; border: 1px solid rgba(122,169,220,.13); border-radius: 13px; background: rgba(5,15,27,.45); }
    .wallet-row .k { color: #8299b3; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; }
    .wallet-row .v { margin-top: 6px; color: #e8f2ff; font-size: 13px; font-weight: 700; word-break: break-all; }
    .wallet-inline { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
"""
css_new = """    .onboarding { display: grid; gap: 12px; }
    .onboarding-note { color: #97abc3; font-size: 13px; line-height: 1.55; }
    .onboarding-note strong { color: #eaf4ff; }
    .command-card { border: 1px solid rgba(122,169,220,.15); border-radius: 15px; background: rgba(4,13,24,.62); overflow: hidden; }
    .command-head { display:flex; justify-content:space-between; align-items:center; gap:10px; padding: 10px 12px; border-bottom:1px solid rgba(122,169,220,.1); }
    .command-head strong { font-size: 12px; }
    .command-head span { color:#7890aa; font-size:10px; text-transform:uppercase; letter-spacing:.08em; }
    .command-body { display:grid; grid-template-columns: minmax(0,1fr) auto; gap:10px; align-items:center; padding: 12px; }
    .command-code { color:#78e5c0; font: 600 12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; overflow-x:auto; white-space:nowrap; }
    .copy-btn { border:1px solid rgba(90,168,255,.28); background:#10243a; color:#d9eaff; border-radius:10px; padding:8px 10px; cursor:pointer; font-weight:800; font-size:11px; }
    .copy-btn:hover { border-color:rgba(90,168,255,.65); }
    .self-sovereign { display:flex; gap:9px; align-items:flex-start; padding:11px 12px; border-radius:13px; background:rgba(66,223,172,.07); border:1px solid rgba(66,223,172,.18); color:#b9d9cf; font-size:12px; line-height:1.5; }
    .self-sovereign b { color:#69e2ba; }
"""
if css_old not in s:
    raise SystemExit("dashboard wallet CSS block not found")
s = s.replace(css_old, css_new, 1)
s = s.replace(
    "      .service-list, .wallet-inline { grid-template-columns: 1fr; }",
    "      .service-list { grid-template-columns: 1fr; }\n      .command-body { grid-template-columns: 1fr; }\n      .copy-btn { justify-self: start; }",
    1,
)

html_old = """    <section class=\"section\">
      <div class=\"section-head\">
        <div><div class=\"kicker\">Runtime</div><h2>System and wallet status.</h2></div>
        <div class=\"section-copy\">Unavailable optional integrations are shown as not configured — not as successful evidence.</div>
      </div>
      <div class=\"system-layout\">
        <article class=\"panel\">
          <div class=\"panel-title\">Service integrations</div>
          <div class=\"service-list\" id=\"services\"></div>
        </article>
        <article class=\"panel\">
          <div class=\"panel-title\">AiFinPay execution wallet</div>
          <div class=\"wallet\" id=\"wallet\">
            <div class=\"wallet-row\"><div class=\"k\">Status</div><div class=\"v\">Loading safe public wallet data…</div></div>
          </div>
        </article>
      </div>
    </section>
"""
html_new = """    <section class=\"section\" id=\"start\">
      <div class=\"section-head\">
        <div><div class=\"kicker\">Self-serve onboarding</div><h2>Create your own agent. Your wallet, your keys.</h2></div>
        <div class=\"section-copy\">The Render wallet is only the hackathon service runtime. Every user creates a separate encrypted non-custodial wallet locally; keys are never copied from this website or shared with the Render service.</div>
      </div>
      <div class=\"system-layout\">
        <article class=\"panel\">
          <div class=\"panel-title\">Start in your terminal</div>
          <div class=\"onboarding\">
            <div class=\"command-card\">
              <div class=\"command-head\"><strong>1. Create a unique local agent + wallet</strong><span>encrypted locally</span></div>
              <div class=\"command-body\"><code class=\"command-code\" id=\"cmd-init\">npx aifinpay-gemini-commerce-agent@0.3.0 init</code><button class=\"copy-btn\" type=\"button\" onclick=\"copyCommand('cmd-init', this)\">Copy</button></div>
            </div>
            <div class=\"command-card\">
              <div class=\"command-head\"><strong>2. Show your public funding addresses</strong><span>no private key output</span></div>
              <div class=\"command-body\"><code class=\"command-code\" id=\"cmd-address\">npx aifinpay-gemini-commerce-agent@0.3.0 address</code><button class=\"copy-btn\" type=\"button\" onclick=\"copyCommand('cmd-address', this)\">Copy</button></div>
            </div>
            <div class=\"command-card\">
              <div class=\"command-head\"><strong>3. Pay a supported HTTP 402 / x402 URL</strong><span>local spending cap</span></div>
              <div class=\"command-body\"><code class=\"command-code\" id=\"cmd-fetch\">npx aifinpay-gemini-commerce-agent@0.3.0 fetch https://merchant.example/paid --max-usd 0.05</code><button class=\"copy-btn\" type=\"button\" onclick=\"copyCommand('cmd-fetch', this)\">Copy</button></div>
            </div>
            <div class=\"self-sovereign\"><b>✓</b><span><strong>No landing-page merchant registration is required for direct payment.</strong> The client requests the URL, handles AiFinPay AIFP-1 first, then auto-detects other x402 facilitators supported by the installed SDK. Merchant catalog APIs are optional discovery sources only.</span></div>
          </div>
        </article>
        <article class=\"panel\">
          <div class=\"panel-title\">Live hackathon service</div>
          <div class=\"onboarding-note\">This hosted Render instance demonstrates Gemini reasoning, deterministic policy, metrics and hackathon evidence. It is <strong>not a shared customer wallet</strong> and it is not where users should store funds.</div>
          <div class=\"service-list\" id=\"services\" style=\"margin-top:14px\"></div>
        </article>
      </div>
    </section>
"""
if html_old not in s:
    raise SystemExit("dashboard runtime/wallet HTML block not found")
s = s.replace(html_old, html_new, 1)

s = s.replace(
    "Validated offers from supplied data or configured merchant catalogs.",
    "Direct URL, discovered web resource, supplied offer, or optional merchant catalog. No landing-page registration is required for x402.",
    1,
)
s = s.replace(
    "AIFP-1 executes HTTP 402; bounded recovery handles transient failures.",
    "AIFP-1 receipt flow runs first; supported x402 facilitators are auto-detected for direct URLs. Bounded recovery handles transient failures.",
    1,
)
s = s.replace('      <a href="/v1/aifinpay/status">/v1/aifinpay/status</a>\n', "", 1)

s = re.sub(
    r"function shortAddress\(value\) \{.*?function walletRow\(k, v\) \{.*?\}\n",
    "",
    s,
    count=1,
    flags=re.S,
)
old_fetch = """  const [health, metrics, wallet] = await Promise.all([
    fetch('/health', { cache: 'no-store' }).then(r => r.json()),
    fetch('/v1/metrics', { cache: 'no-store' }).then(r => r.json()),
    fetch('/v1/aifinpay/status', { cache: 'no-store' }).then(r => r.json())
  ]);"""
new_fetch = """  const [health, metrics] = await Promise.all([
    fetch('/health', { cache: 'no-store' }).then(r => r.json()),
    fetch('/v1/metrics', { cache: 'no-store' }).then(r => r.json())
  ]);"""
if old_fetch not in s:
    raise SystemExit("dashboard refresh Promise.all block not found")
s = s.replace(old_fetch, new_fetch, 1)
s = re.sub(
    r"  document\.getElementById\('wallet'\)\.innerHTML = \[.*?\n  \]\.join\(''\);\n",
    "",
    s,
    count=1,
    flags=re.S,
)
marker = "const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 8 });\n"
copy_js = """async function copyCommand(id, button) {
  const text = document.getElementById(id)?.textContent || '';
  try {
    await navigator.clipboard.writeText(text);
    const before = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = before; }, 1200);
  } catch {
    const area = document.createElement('textarea');
    area.value = text; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = 'Copy'; }, 1200);
  }
}
"""
if marker not in s:
    raise SystemExit("dashboard JS insertion marker not found")
s = s.replace(marker, marker + copy_js, 1)
p.write_text(s)

app = Path("src/app.ts")
a = app.read_text().replace('version: "0.2.1"', 'version: "0.3.0"', 1)
a = a.replace(
    'capabilities: ["multimodal-procurement", "dynamic-negotiation", "self-healing-payments"]',
    'capabilities: ["multimodal-procurement", "dynamic-negotiation", "self-healing-payments", "local-encrypted-wallet", "universal-x402"]',
    1,
)
app.write_text(a)

readme = Path("README.md")
r = readme.read_text()
start = r.index("## Install from npm")
end = r.index("## Repository map", start)
onboarding = """## Install and create your own agent

The hosted Render service is the hackathon runtime, **not a shared user wallet**. Every operator should create a separate local non-custodial agent.

### 1. Create a unique encrypted local wallet

```bash
npx aifinpay-gemini-commerce-agent@0.3.0 init
```

The command generates a fresh 32-byte seed locally, derives the agent's EVM, Solana and Casper identities, encrypts the seed with AES-256-GCM using a scrypt-derived key, and stores only the encrypted keystore under `~/.aifinpay/` with restrictive filesystem permissions. The seed is not sent to the AiFinPay Render service.

Optional local limits:

```bash
npx aifinpay-gemini-commerce-agent@0.3.0 init --daily-budget 5 --per-call 0.10
```

### 2. Show your public funding addresses

```bash
npx aifinpay-gemini-commerce-agent@0.3.0 address
```

This decrypts the local keystore after passphrase entry and prints public addresses only.

### 3. Pay a supported HTTP 402 / x402 URL directly

```bash
npx aifinpay-gemini-commerce-agent@0.3.0 fetch https://merchant.example/paid --max-usd 0.05
```

The direct URL flow does **not** require the merchant to register on this landing page. The client gives AIFP-1 first refusal so AiFinPay receipt batching/reuse remains available; if the response is still HTTP 402, the installed AiFinPay SDK auto-detects another supported x402 facilitator and refuses a quote above the local `--max-usd` / per-call policy before authorizing payment. Support is limited to facilitator formats recognized by the installed SDK; this is not a claim that every proprietary 402 variant on the internet is automatically compatible.

`MERCHANT_API_ENDPOINTS` remains optional. It is for procurement discovery/catalog search, not a prerequisite for paying a known x402 URL.

### 4. Run the full local Gemini commerce service

```bash
export GEMINI_API_KEY=...
npx aifinpay-gemini-commerce-agent@0.3.0 start
```

The package also exports the Fastify application builder for embedding:

```ts
import { buildApp } from "aifinpay-gemini-commerce-agent";

const app = buildApp();
await app.listen({ port: 8080 });
```

For non-interactive local automation, the keystore passphrase can be supplied through `AIFINPAY_KEYSTORE_PASSPHRASE`; do not commit it or place it in public logs.

"""
r = r[:start] + onboarding + r[end:]
r = r.replace("The current suite contains 20 tests", "The current suite contains 24 tests")
readme.write_text(r)

arch = Path("ARCHITECTURE.md")
x = arch.read_text()
if "## Per-user local wallet and universal x402" not in x:
    x += """

## Per-user local wallet and universal x402

The public Render service is a hackathon runtime, not a custody surface for end users. `npx aifinpay-gemini-commerce-agent init` creates a distinct local seed for each operator, encrypts it at rest, and derives the agent's EVM/Solana/Casper identities locally. Direct URL execution uses AIFP-1 first to preserve receipt batching; an unresolved HTTP 402 then falls back to the installed SDK's generic facilitator detection (`Agent.pay`) with a deterministic maximum-amount cap. Merchant catalog integrations are optional sourcing inputs rather than a payment prerequisite.
"""
arch.write_text(x)

adv = Path("ADVANCED_COMMERCE.md")
x = adv.read_text()
if "## Universal direct-URL payment" not in x:
    x += """

## Universal direct-URL payment

A known paid URL can be called without onboarding its merchant into the discovery layer. The local CLI first attempts the AIFP-1 flow; if the server returns a non-AIFP-1 HTTP 402, the AiFinPay SDK's generic payment client detects a supported facilitator and retries with the appropriate authorization. `maxAmountUsd` and the locally stored per-call/daily policy remain hard ceilings. “Universal” here means a unified client path across the facilitator formats recognized by the installed SDK, not arbitrary unsupported 402 schemas.
"""
adv.write_text(x)

disclosure = Path("HACKATHON_DISCLOSURE.md")
x = disclosure.read_text()
if "local encrypted wallet onboarding" not in x.lower():
    x += """

### v0.3 hackathon work
- Local encrypted wallet onboarding for each agent operator.
- Direct URL HTTP 402 execution with AIFP-1-first handling and supported x402 facilitator auto-detection.
- Self-serve landing-page onboarding that no longer presents the Render evidence wallet as an end-user wallet.
"""
disclosure.write_text(x)

changelog = Path("CHANGELOG.md")
x = changelog.read_text()
if "## 0.3.0" not in x:
    x = """## 0.3.0 — self-serve agent wallets and direct x402

- Added `init` for a unique encrypted local non-custodial agent wallet.
- Added `address` for public funding addresses without private-key output.
- Added `fetch` for direct AIFP-1 and supported x402 URL payment with local spending caps.
- Reworked the public dashboard from a shared Render-wallet view into copyable self-serve onboarding.
- Clarified that merchant catalog APIs are optional discovery, not a prerequisite for direct x402 payment.
- Expanded the automated suite to 24 tests.

""" + x
changelog.write_text(x)
