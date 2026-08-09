# Changelog

## 0.2.0 — 2026-08-10

- Added Gemini-native multimodal procurement via `POST /v1/visual-objectives`.
- Added configured merchant API discovery with validated offer ingestion.
- Added bounded `NEGOTIATE` decisions and deterministic counter-offer policy.
- Added merchant negotiation contract with same-origin payment URL enforcement.
- Added deterministic self-healing classification, retry/backoff and allowlisted recovery paths.
- Added settlement-price mismatch protection for negotiated offers.
- Added recovery/negotiation evidence records and production health capability reporting.
- Added advanced tests for negotiation bounds, image-to-objective conversion, raw-image non-persistence and Polygon→Base recovery simulation.

All material changes to AiFinPay Gemini Commerce Agent are documented here.

## [0.1.1] — 2026-08-09

### Documentation and governance

- redesigned the repository landing page and visual identity;
- expanded the architecture with context, component, sequence, state, deployment, trust-boundary, and data views;
- replaced the permissive MIT license with the AiFinPay Source-Available License 1.0;
- added trademark, notice, contribution, support, issue, and pull-request policies.

## [0.1.0] — 2026-08-09

### Initial hackathon implementation

- Gemini forced-function commerce decision engine;
- deterministic budget and allowlist policy;
- AiFinPay AIFP-1 HTTP 402 payment execution;
- protected Circle USDC transfer path;
- Firestore persistence and structured operational evidence;
- Cloud Run and Cloud Build configuration;
- API, dashboard, tests, CI, deployment guide, evidence checklist, and hackathon disclosure.
