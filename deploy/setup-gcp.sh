#!/usr/bin/env bash
#
# One-time GCP setup for deploying BAPI to Cloud Run via Cloud Build.
# Safe to re-run (creates are idempotent). Requires: gcloud (authenticated).
#
#   bash deploy/setup-gcp.sh
#
set -euo pipefail

# ---- Config (override via env vars) ---------------------------------------
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-europe-west4}"
REPO="${REPO:-bapi}"
SERVICE="${SERVICE:-bapi}"
# For the auto-deploy trigger (GitHub). Leave empty to skip trigger creation.
GITHUB_OWNER="${GITHUB_OWNER:-}"
GITHUB_REPO="${GITHUB_REPO:-bapi}"
BRANCH="${BRANCH:-^main$}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "✗ No project set. Run: gcloud config set project <PROJECT_ID>" >&2
  exit 1
fi

echo "▶ Project: $PROJECT_ID | Region: $REGION | Service: $SERVICE"
gcloud config set project "$PROJECT_ID" >/dev/null
gcloud config set run/region "$REGION" >/dev/null

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# ---- 1) Enable APIs --------------------------------------------------------
echo "▶ Enabling APIs…"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com

# ---- 2) Artifact Registry repo --------------------------------------------
echo "▶ Ensuring Artifact Registry repo '$REPO'…"
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="BAPI container images" 2>/dev/null \
  || echo "  (repo already exists)"

# ---- 3) IAM for Cloud Build to deploy to Cloud Run ------------------------
echo "▶ Granting Cloud Build permission to deploy…"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/run.admin" --condition=None >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/iam.serviceAccountUser" >/dev/null

# ---- 4) Optional: OpenAI key as a secret ----------------------------------
read -r -p "▶ Paste OPENAI_API_KEY for live AI (blank = mock mode): " OPENAI_KEY || true
if [[ -n "${OPENAI_KEY}" ]]; then
  echo "  Creating/updating secret 'openai-api-key'…"
  if gcloud secrets describe openai-api-key >/dev/null 2>&1; then
    printf '%s' "$OPENAI_KEY" | gcloud secrets versions add openai-api-key --data-file=-
  else
    printf '%s' "$OPENAI_KEY" | gcloud secrets create openai-api-key --data-file=-
  fi
  gcloud secrets add-iam-policy-binding openai-api-key \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
  ATTACH_SECRET=1
else
  echo "  Skipping — AI runs in deterministic mock mode."
  ATTACH_SECRET=0
fi

# ---- 5) First build + deploy ----------------------------------------------
echo "▶ Building & deploying (first time)…"
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=SHORT_SHA=manual,_REGION="$REGION",_REPO="$REPO",_SERVICE="$SERVICE"

# Attach the secret once; future deploys preserve it automatically.
if [[ "$ATTACH_SECRET" == "1" ]]; then
  echo "▶ Attaching OPENAI_API_KEY secret to the service…"
  gcloud run services update "$SERVICE" --region="$REGION" \
    --set-secrets=OPENAI_API_KEY=openai-api-key:latest
fi

URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"
echo "✓ Live at: $URL"

# ---- 6) Auto-deploy trigger (push → deploy) -------------------------------
if [[ -n "$GITHUB_OWNER" ]]; then
  echo "▶ Creating push trigger for ${GITHUB_OWNER}/${GITHUB_REPO}…"
  gcloud builds triggers create github \
    --name="${SERVICE}-deploy" \
    --repo-owner="$GITHUB_OWNER" \
    --repo-name="$GITHUB_REPO" \
    --branch-pattern="$BRANCH" \
    --build-config="cloudbuild.yaml" \
    --region="$REGION" 2>/dev/null \
    || echo "  ⚠ Could not create trigger — connect the repo first (see docs/DEPLOY.md)."
else
  echo "ℹ Skipping trigger. To enable push-to-deploy, connect your GitHub repo and re-run with:"
  echo "    GITHUB_OWNER=<you> GITHUB_REPO=<repo> bash deploy/setup-gcp.sh"
fi

echo "✓ Done."
