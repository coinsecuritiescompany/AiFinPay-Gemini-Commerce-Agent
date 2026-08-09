#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ID="${PROJECT_ID:-aifinpau}"
REGION="${REGION:-us-central1}"
AR_REPOSITORY="${AR_REPOSITORY:-aifinpay}"
SERVICE="${SERVICE:-aifinpay-gemini-commerce-agent}"
REPO_FULL_NAME="${REPO_FULL_NAME:-coinsecuritiescompany/AiFinPay-Gemini-Commerce-Agent}"
POOL_ID="${POOL_ID:-github-aifinpay}"
PROVIDER_ID="${PROVIDER_ID:-github-main}"
DEPLOY_SA_NAME="${DEPLOY_SA_NAME:-github-aifinpay-deployer}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-aifinpay-gemini-runtime}"

DEPLOY_SA_EMAIL="${DEPLOY_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA_EMAIL="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

log() { printf '\n==> %s\n' "$*"; }

log "Selecting Google Cloud project ${PROJECT_ID}"
gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

log "Enabling required Google Cloud APIs"
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  logging.googleapis.com \
  --project="$PROJECT_ID"

log "Ensuring Artifact Registry repository exists"
if ! gcloud artifacts repositories describe "$AR_REPOSITORY" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="AiFinPay production containers" \
    --project="$PROJECT_ID"
fi

log "Ensuring Firestore Native database exists"
if ! gcloud firestore databases describe --database='(default)' --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud firestore databases create \
    --database='(default)' \
    --location="$REGION" \
    --type=firestore-native \
    --project="$PROJECT_ID"
fi

log "Ensuring dedicated service accounts exist"
if ! gcloud iam service-accounts describe "$RUNTIME_SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
    --display-name="AiFinPay Gemini Commerce Agent runtime" \
    --project="$PROJECT_ID"
fi
if ! gcloud iam service-accounts describe "$DEPLOY_SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$DEPLOY_SA_NAME" \
    --display-name="GitHub deployer for AiFinPay Gemini Commerce Agent" \
    --project="$PROJECT_ID"
fi

log "Granting minimum runtime roles"
for role in roles/aiplatform.user roles/datastore.user roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
    --role="$role" \
    --condition=None \
    --quiet >/dev/null
done

log "Granting deployer roles"
for role in roles/artifactregistry.writer roles/run.admin roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
    --role="$role" \
    --condition=None \
    --quiet >/dev/null
done

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA_EMAIL" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --project="$PROJECT_ID" \
  --quiet >/dev/null

ensure_secret() {
  local name="$1"
  local generator="$2"
  if ! gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$name" --replication-policy=automatic --project="$PROJECT_ID" >/dev/null
    local value
    value="$(eval "$generator")"
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project="$PROJECT_ID" >/dev/null
  fi
  gcloud secrets add-iam-policy-binding "$name" \
    --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet >/dev/null
}

log "Ensuring production secrets exist (values are never printed)"
ensure_secret "aifinpay-admin-token" "openssl rand -hex 32"
ensure_secret "aifinpay-agent-seed" "openssl rand -hex 32"

log "Ensuring GitHub Workload Identity Federation pool exists"
if ! gcloud iam workload-identity-pools describe "$POOL_ID" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --location=global \
    --display-name="GitHub AiFinPay" \
    --project="$PROJECT_ID"
fi

log "Ensuring GitHub OIDC provider exists and is restricted to main"
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --workload-identity-pool="$POOL_ID" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --workload-identity-pool="$POOL_ID" \
    --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${REPO_FULL_NAME}' && assertion.ref=='refs/heads/main'" \
    --display-name="AiFinPay GitHub main" \
    --project="$PROJECT_ID"
fi

WIF_MEMBER="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${REPO_FULL_NAME}"
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA_EMAIL" \
  --member="$WIF_MEMBER" \
  --role="roles/iam.workloadIdentityUser" \
  --project="$PROJECT_ID" \
  --quiet >/dev/null

WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

log "Bootstrap complete"
printf 'GCP_WIF_PROVIDER=%s\n' "$WIF_PROVIDER"
printf 'GCP_DEPLOY_SERVICE_ACCOUNT=%s\n' "$DEPLOY_SA_EMAIL"
printf 'GCP_RUNTIME_SERVICE_ACCOUNT=%s\n' "$RUNTIME_SA_EMAIL"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  log "GitHub CLI is authenticated; setting repository variables automatically"
  gh variable set GCP_WIF_PROVIDER --repo "$REPO_FULL_NAME" --body "$WIF_PROVIDER"
  gh variable set GCP_DEPLOY_SERVICE_ACCOUNT --repo "$REPO_FULL_NAME" --body "$DEPLOY_SA_EMAIL"
  gh variable set GCP_RUNTIME_SERVICE_ACCOUNT --repo "$REPO_FULL_NAME" --body "$RUNTIME_SA_EMAIL"
  printf 'GitHub repository variables configured.\n'
else
  cat <<EOF

GitHub CLI is not authenticated in this shell.
Set these three GitHub Actions repository variables (Settings -> Secrets and variables -> Actions -> Variables):

GCP_WIF_PROVIDER=${WIF_PROVIDER}
GCP_DEPLOY_SERVICE_ACCOUNT=${DEPLOY_SA_EMAIL}
GCP_RUNTIME_SERVICE_ACCOUNT=${RUNTIME_SA_EMAIL}

These values are identifiers, not secrets.
EOF
fi
