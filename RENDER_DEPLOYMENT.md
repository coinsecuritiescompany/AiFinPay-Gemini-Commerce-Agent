# Render production deployment

This repository can run on Render while keeping Google Cloud integrations available for Gemini/Vertex AI, Firestore, and hackathon evidence.

## Runtime

- Runtime: Node.js 22+
- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Health check: `/health`
- Default port: Render injects `PORT`; the application reads it automatically.

Because `NODE_ENV=production` is present during Render builds, `--include=dev` is required so TypeScript and the build-time toolchain are installed.

## Required environment variables

```text
NODE_ENV=production
LOG_LEVEL=info
ADMIN_TOKEN=<long random secret>
GEMINI_MODEL=gemini-3.6-flash
GEMINI_STARTUP_SMOKE_TEST=false
FIRESTORE_ENABLED=false
AIFINPAY_AGENT_SEED_HEX=<64 hex characters>
AIFINPAY_API_BASE_URL=https://api.aifinpay.io
AIFINPAY_GATEWAY_ORIGINS=https://gateway.aifinpay.io
AIFINPAY_DAILY_BUDGET_USD=1
AIFINPAY_PER_CALL_BUDGET_USD=0.05
```

## Gemini configuration

For the fastest live Gemini path on Render, set:

```text
GEMINI_API_KEY=<Gemini API key>
```

`GOOGLE_API_KEY` remains a backwards-compatible alias, but new deployments should use `GEMINI_API_KEY`.

`GEMINI_STARTUP_SMOKE_TEST=true` performs one structured Gemini function-call test at application startup. It never executes a payment. Use it only for deployment verification, then return it to `false` to avoid consuming a Gemini request on every restart.

For Google Cloud / Vertex AI production credentials, prefer a dedicated Google Cloud service account with least-privilege access and a secure credential injection strategy. Do not commit credential JSON to the repository.

## Firestore

The first Render deployment may use:

```text
FIRESTORE_ENABLED=false
```

When Google Cloud credentials are configured for the service, switch to:

```text
FIRESTORE_ENABLED=true
GOOGLE_CLOUD_PROJECT=<project id>
GOOGLE_CLOUD_LOCATION=global
FIRESTORE_DATABASE_ID=(default)
```

## Verification

After deploy:

```bash
curl -sS https://<service>.onrender.com/health
curl -sS https://<service>.onrender.com/v1/metrics
```

The `/health` response is the source of truth for which integrations are configured. Do not claim live Firestore, Circle, or funded AiFinPay settlement until the corresponding production integration has been verified.

For Gemini, a successful `gemini.startup_smoke.success` event in the Render application logs proves that the deployed service completed a real Gemini API request and received a structured function call response.

## XPRIZE evidence

Render may host the application, but the submission still needs verifiable Google Cloud usage. Capture Google Cloud billing/cost evidence and Gemini/Vertex AI or other Google Cloud product observability separately, together with Render runtime evidence and AiFinPay payment evidence.
