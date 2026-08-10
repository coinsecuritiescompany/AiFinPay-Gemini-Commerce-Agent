# AiFinPay Gemini Commerce Agent — Current Hackathon Architecture

This document is the current production architecture reference for the Build with Gemini XPRIZE submission.

It intentionally separates **what is live now** from **optional or planned integrations** so judges can distinguish verified production behavior from code that is present but not yet configured.

## 1. Core design rule

**Gemini may propose a financial action, but it cannot authorize or sign it.**

Financial authority remains in deterministic TypeScript policy and the operator's non-custodial wallet.

## 2. End-user self-serve flow

```text
User / external agent
      |
      v
npx ... init
      |
      v
Local encrypted wallet
(AES-256-GCM + scrypt)
      |
      +--> public EVM / Solana / Casper addresses
      |
      v
Known paid URL or discovered offer
      |
      v
Gemini reasoning
(PAY / NEGOTIATE / ASK_USER / REJECT)
      |
      v
Deterministic policy
(budget, per-call cap, merchant, network, asset, confidence)
      |
      v
AiFinPay payment client
      |
      +--> AIFP-1 HTTP 402 + receipt flow first
      |
      +--> supported generic x402 facilitator path
      |
      v
Merchant / API / digital service
      |
      v
Receipt metadata + delivery hash + local/output evidence
```

The public Render deployment is **not a shared customer wallet**. Each operator creates a separate local wallet.

A merchant does not need to register on the hackathon landing page for the agent to pay a known compatible x402 URL. Merchant catalogs are optional discovery inputs.

## 3. Hosted production runtime

```text
Internet
   |
   v
Render Web Service
   |
   +--> Fastify API
   +--> Gemini decision adapter
   +--> Deterministic policy engine
   +--> AiFinPay AIFP-1 executor
   +--> Metrics / evidence dashboard
   +--> In-memory production demo store
   |
   +--> Google Gemini API
   +--> AiFinPay payment infrastructure
```

Current production URL:

`https://aifinpay-gemini-commerce-agent.onrender.com`

The hosted service demonstrates Gemini reasoning, deterministic authorization, AiFinPay execution readiness, metrics, and evidence. It is separate from each user's local wallet.

## 4. Current production status

| Component | Status | Notes |
|---|---|---|
| Render runtime | **LIVE** | Public production web service |
| Gemini structured call | **VERIFIED** | Production structured-function-call smoke test completed |
| Deterministic policy | **LIVE** | Budget / allowlist / confidence enforcement |
| AiFinPay executor | **ACTIVE** | AIFP-1 executor configured |
| Self-serve local wallet | **VERIFIED** | Clean consumer install + persistent encrypted wallet test |
| npm package | **LIVE** | `aifinpay-gemini-commerce-agent@0.3.0` |
| Automated validation | **VERIFIED** | 24 tests + production build |
| Firestore | **NOT CONFIGURED IN CURRENT PUBLIC RUNTIME** | Adapter exists; do not count as production evidence yet |
| Circle transaction | **NOT YET VERIFIED** | Integration path exists; no funded transaction claimed |
| Funded AIFP-1 settlement | **NOT YET VERIFIED** | Awaiting verifiable external settlement evidence |
| Third-party revenue | **NOT CLAIMED** | Must be supported by hackathon-period evidence |

## 5. Reasoning / authorization boundary

Gemini receives:

- goal or procurement context;
- non-secret policy summary;
- untrusted merchant / offer metadata;
- optional multimodal input.

Gemini does **not** receive:

- private keys;
- agent seed;
- keystore passphrase;
- admin token;
- Circle entity secret;
- authority to increase budgets or change allowlists.

The policy engine re-validates the selected offer against the original data before payment.

## 6. Local wallet security

`npx aifinpay-gemini-commerce-agent@0.3.0 init`:

1. generates a fresh 32-byte seed locally;
2. derives public wallet identities;
3. derives an encryption key with `scrypt`;
4. encrypts the seed using AES-256-GCM;
5. writes only the encrypted keystore under `~/.aifinpay/` with restrictive filesystem permissions;
6. never sends the seed to the Render service.

The operator may configure local daily and per-call limits.

## 7. Direct HTTP 402 / x402 payment path

For a known paid URL:

```bash
npx aifinpay-gemini-commerce-agent@0.3.0 fetch https://merchant.example/paid --max-usd 0.05
```

Execution order:

1. AIFP-1 gets first refusal so AiFinPay receipt batching/reuse remains available.
2. If the response remains HTTP 402, the installed AiFinPay SDK can use its generic payment path for facilitator formats it supports.
3. `--max-usd` and the locally stored per-call limit are hard ceilings before authorization.

“Supported x402” means facilitator formats recognized by the installed SDK; it is not a claim of compatibility with every proprietary HTTP 402 implementation on the internet.

## 8. Hosted objective execution path

```text
POST objective
   |
   v
Schema validation
   |
   v
Gemini structured proposal
   |
   v
Exact deterministic policy check
   |                    \
   | approved            \ blocked / approval required
   v                      v
AiFinPay executor       REJECT / ASK_USER
   |
   v
HTTP 402 merchant flow
   |
   v
Sanitized payment result
   |
   v
Receipt metadata + delivery SHA-256 + metrics
```

## 9. Optional integrations present in code

### Google Cloud Firestore

A Firestore adapter exists for transactional objective claiming, persistence, and evidence. The current public Render runtime must not be presented as using Firestore until credentials are configured and production evidence is captured.

### Circle Developer-Controlled Wallets

A protected Circle transfer path exists for the optional Agentic Economy Prize. It is isolated from Gemini decision execution and requires explicit administrative confirmation and caps. No Circle transaction is claimed until a wallet address, transaction, and explorer proof exist.

## 10. Google Cloud requirement

The hackathon requires at least one Google Cloud product and, because the project uses an LLM, at least one Gemini API call.

The Gemini production call is already verified. Separate Google Cloud product usage and the required billing / observability evidence should be captured before final submission. Firestore is the prepared integration path, but the project page does not claim it as live until that evidence exists.

## 11. Evidence principles

The submission follows these rules:

- code coverage is not described as external customer usage;
- an integration is not described as live merely because code exists;
- a wallet is not described as funded without on-chain / provider evidence;
- transaction-fee revenue is not claimed without a successful external transaction;
- pre-existing AiFinPay traction is disclosed separately from new Gemini Commerce Agent traction.

## 12. Related documentation

- `README.md` — product overview and installation
- `ADVANCED_COMMERCE.md` — multimodal, negotiation, recovery, direct URL behavior
- `HACKATHON_DISCLOSURE.md` — new vs. pre-existing work
- `EVIDENCE.md` — evidence checklist
- `DEPLOYMENT.md` / `RENDER_DEPLOYMENT.md` — deployment configuration
