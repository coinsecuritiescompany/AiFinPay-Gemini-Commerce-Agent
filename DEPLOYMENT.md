# Google Cloud deployment

## 1. Create or select a project

Enable billing, then enable the required APIs:

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com
```

Create a native Firestore database in the required location before setting `FIRESTORE_ENABLED=true`.

Create the Artifact Registry repository once:

```bash
gcloud artifacts repositories create aifinpay \
  --repository-format=docker \
  --location=us-central1
```

## 2. Secrets

Store these values in Secret Manager. Never pass them as build arguments or commit them:

- `ADMIN_TOKEN`
- `AIFINPAY_AGENT_SEED_HEX`
- `CIRCLE_API_KEY`
- `CIRCLE_ENTITY_SECRET`
- `CIRCLE_WALLET_ID`
- `CIRCLE_USDC_TOKEN_ID`

The automated deployment expects these secret names to exist:

```text
aifinpay-admin-token
aifinpay-agent-seed
```

Create them before running Cloud Build. Add Circle secrets to the Cloud Run revision later when the wallet account is ready.

Non-secret configuration can be set as Cloud Run environment variables.

## 3. IAM

The Cloud Run service account needs only:

- Vertex AI User;
- Cloud Datastore User;
- Secret Manager Secret Accessor for the named secrets;
- Logs Writer (normally provided by the runtime).

Do not grant Owner or Editor.

## 4. Deploy

The repository contains `cloudbuild.yaml`. From the repository root:

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_REGION=us-central1,_SERVICE=aifinpay-gemini-commerce-agent
```

After the first deployment, configure secrets and environment variables on the Cloud Run service. Use a dedicated service account.

## 5. Required production variables

```text
NODE_ENV=production
GOOGLE_CLOUD_PROJECT=<project-id>
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-2.5-flash
FIRESTORE_ENABLED=true
AIFINPAY_API_BASE_URL=https://api.aifinpay.io
AIFINPAY_GATEWAY_ORIGINS=https://gateway.aifinpay.io
AIFINPAY_DAILY_BUDGET_USD=1
AIFINPAY_PER_CALL_BUDGET_USD=0.05
CIRCLE_BLOCKCHAIN=ARC-TESTNET
CIRCLE_MAX_TRANSFER_USD=1
```

Change the Circle blockchain and explorer only after confirming the wallet and USDC token are on the same supported network.

## 6. Verification

```bash
curl -sS "$SERVICE_URL/health"
curl -sS "$SERVICE_URL/v1/metrics"
```

`/health` must show `gemini`, `aifinpay`, `firestore` and, for the optional prize, `circle` as configured.

Capture the Cloud Run revision, Gemini observability view, Cloud Logging traces and monthly billing/cost statements for Devpost.
