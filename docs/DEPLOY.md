# Deploying to GCP (Cloud Build → Cloud Run)

BAPI deploys as **one Cloud Run service**: a single container where NestJS serves
both the API (under `/api`) and the built Angular SPA (everything else). One URL,
no CORS, no cross-service wiring.

```
 git push  ─▶  Cloud Build trigger  ─▶  build image (Dockerfile)
                                     ─▶  push to Artifact Registry
                                     ─▶  gcloud run deploy  ─▶  Cloud Run (public URL)
```

- **Region (default):** `europe-west4` — change via the `_REGION` substitution.
- **Image:** `europe-west4-docker.pkg.dev/$PROJECT_ID/bapi/bapi`
- **Pipeline:** [`cloudbuild.yaml`](../cloudbuild.yaml) · **Image:** [`Dockerfile`](../Dockerfile)

---

## 1. One-time setup

Authenticate and select your project, then run the setup script:

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>      # e.g. crucial-binder-479415-n1

bash deploy/setup-gcp.sh
```

It is idempotent and will:

1. Enable the APIs (Run, Cloud Build, Artifact Registry, Secret Manager, IAM).
2. Create the Artifact Registry repo `bapi` in the region.
3. Grant Cloud Build permission to deploy to Cloud Run (`run.admin` + `serviceAccountUser`).
4. Optionally store your `OPENAI_API_KEY` in **Secret Manager** and attach it to the service
   (leave blank to run the AI in deterministic **mock mode**).
5. Build & deploy once, and print the live URL.
6. Create the push-to-deploy trigger (if you pass your GitHub repo — see step 3).

---

## 2. Manual deploy (any time)

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=SHORT_SHA=manual
```

That runs the exact same pipeline the trigger uses.

---

## 3. Auto-deploy on every push

Cloud Build needs your repository connected once, then a trigger.

**a) Connect the repo (one-time):**
- Console → **Cloud Build → Triggers → Connect repository** → GitHub → authorize → pick the repo.
  (Or use Cloud Source Repositories.)

**b) Create the trigger:**

```bash
GITHUB_OWNER=<your-gh-user> GITHUB_REPO=bapi bash deploy/setup-gcp.sh
# or directly:
gcloud builds triggers create github \
  --name=bapi-deploy \
  --repo-owner=<your-gh-user> --repo-name=bapi \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml \
  --region=europe-west4
```

Now every push to `main` builds and deploys automatically. The deploy step passes only
`--image`, so **env vars and the OpenAI secret are preserved** across deploys.

---

## 4. AI key in production

The app works without a key (mock mode). To enable live LLM answers, the setup script
stores the key in Secret Manager. To change it later:

```bash
printf '%s' "sk-..." | gcloud secrets versions add openai-api-key --data-file=-
gcloud run services update bapi --region=europe-west4 \
  --set-secrets=OPENAI_API_KEY=openai-api-key:latest
```

The backend auto-detects the provider; you can also set `AI_MODEL` as an env var
(`gcloud run services update bapi --set-env-vars=AI_MODEL=gpt-4o-mini`).

---

## 5. Notes & troubleshooting

- **Port:** Cloud Run injects `PORT=8080`; the app honours it (`process.env.PORT`).
- **Data:** the seeded CSVs are baked into the image; the store is in-memory per instance.
  Uploads/finding-status changes are per-instance and reset on a new revision — fine for a
  demo. Move `StoreService` to Postgres/Prisma for persistence (see ARCHITECTURE §7).
- **Cold starts:** `--min-instances=0` keeps it free; raise to `1` to avoid cold starts.
- **Build fails on logs bucket:** the pipeline already sets `options.logging:
  CLOUD_LOGGING_ONLY`.
- **Permission denied deploying:** re-run `deploy/setup-gcp.sh` (re-applies the IAM bindings).
- **Verify the image locally:**
  ```bash
  docker build -t bapi:test .
  docker run --rm -p 8080:8080 -e PORT=8080 bapi:test
  # open http://localhost:8080
  ```
