# Architecture

## Scope

The hackathon system adds a Gemini decision and Google Cloud operations layer to the existing AiFinPay payment infrastructure. It does not replace AiFinPay settlement contracts, AIFP-1, AIFP-2, AIFP-3, the Agent SDK, or the MCP server.

## Components

### Objective API

Accepts a goal, untrusted merchant offers and a deterministic spending policy. Zod validates all external input before it enters the orchestration layer.

### Gemini decision engine

Uses the Google Gen AI SDK. The model must call `propose_purchase` and return one structured decision. Merchant descriptions are explicitly treated as untrusted data to reduce prompt-injection risk.

### Policy engine

The policy engine is the payment authority. It compares the model output with the original offer and validates:

- offer and merchant identity;
- exact price and action tier;
- network and asset;
- merchant, network and asset allowlists;
- total budget and auto-approve limit;
- model confidence.

No model output can weaken these controls.

### AiFinPay executor

Creates a persistent AiFinPay agent from `AIFINPAY_AGENT_SEED_HEX`, configures SDK budget caps and calls `fetchPaid()` with exact scope and one billing unit. The SDK performs the AIFP-1 quote, on-chain settlement, receipt exchange and paid retry.

The application hashes the delivered body instead of storing its contents. Receipt bearer JWTs are never returned or logged.

### Circle Wallet service

Uses Circle's Developer-Controlled Wallet SDK. The Circle path is isolated from the objective flow and requires an administrator token plus a transfer cap. This provides a verifiable USDC wallet and transaction for the optional Agentic Economy Prize without giving Gemini direct wallet access.

### Store and observability

Local development uses an in-memory store. Production uses Firestore collections:

- `objectives`
- `decisions`
- `payments`

Fastify writes JSON logs to stdout. Cloud Run captures them in Cloud Logging. Every run has a trace ID, objective ID and decision ID. Payment records include transaction evidence where available, but never private keys or receipt tokens.

## Trust boundaries

| Boundary | Untrusted input | Enforcement |
|---|---|---|
| Public API | objectives and offers | Zod schemas and size limits |
| Merchant data → Gemini | titles and descriptions | data-only prompt instruction and forced function call |
| Gemini → payment | structured proposal | deterministic policy engine |
| API → Circle | transfer request | admin token, explicit confirmation and transfer cap |
| Service → logs | errors and evidence | Fastify redaction and no receipt/private-key serialization |

## Idempotency

The AiFinPay SDK derives AIFP-1 idempotency from quote, asset, chain and transaction reference and applies its on-chain payment ID replay guard. The orchestration layer rejects a second run after an objective reaches `COMPLETED` and Circle uses a UUID idempotency key.

## Revenue accounting

The metrics endpoint separates:

- gross payment volume;
- merchant proceeds (99%);
- AiFinPay protocol revenue (1%).

Only successful payment records count toward revenue. Failed and blocked decisions count as operations evidence but add zero volume.
