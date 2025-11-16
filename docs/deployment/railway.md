# Railway Deployment Guide

Deploy the Mega Directory API, Astro frontend, and PostgreSQL database on [Railway](https://railway.app) using the Dockerfiles that live in this repository. Railway treats each runtime as an isolated service, so you will provision three services inside a single project:

1. **PostgreSQL database** (managed by Railway)
2. **Express API** built from `apps/api/Dockerfile`
3. **Astro web frontend** built from `apps/web/Dockerfile`

The sections below walk through prerequisites, per-service configuration, and an end-to-end deployment workflow.

## Prerequisites

- Railway account with a project created (free tier works for small tests).
- [Railway CLI](https://docs.railway.app/reference/cli/installation) installed locally **or** access to the Railway dashboard.
- Docker installed locally so the CLI can build the images defined in this repo.
- Environment secrets (JWT secret, admin login, crawler token, etc.).

> **Tip:** Run `docker build` locally before pushing to Railway if you want to catch Dockerfile issues early:
>
> ```bash
> docker build -t mega-directory-api -f apps/api/Dockerfile ./apps/api
> docker build -t mega-directory-web -f apps/web/Dockerfile ./apps/web
> ```

## Provision the PostgreSQL service

1. In the Railway project, click **New** → **Database** → **PostgreSQL**.
2. Rename the service to something like `postgres`.
3. Copy the generated `DATABASE_URL`. Railway also exposes it automatically to other services when you create a variable with the value `${{postgres.DATABASE_URL}}`.

_No Dockerfile is required for this step because Railway manages the database container for you._

## Deploy the Express API service

| Setting | Value |
| --- | --- |
| Build context | `./apps/api` |
| Dockerfile | `apps/api/Dockerfile` |
| Default port | `3030` (Railway sets `PORT`, so no manual mapping needed) |
| Health check | `GET /health` |

### Required environment variables

| Variable | Description |
| --- | --- |
| `PORT` | Railway injects this automatically. Keep the default `3030` locally. |
| `DATABASE_URL` | Set to `${{postgres.DATABASE_URL}}` (from the database service). |
| `ADMIN_JWT_SECRET` | Secret used to sign admin tokens. |
| `ADMIN_JWT_ISSUER` | Optional, defaults to `mega-directory`. |
| `ADMIN_JWT_AUDIENCE` | Optional, defaults to `admin`. |
| `ADMIN_LOGIN_EMAIL` | Email that is allowed to sign in to the admin interface. |
| `ADMIN_LOGIN_PASSCODE` | Passcode paired with the admin email. |
| `CRAWLER_BEARER_TOKEN` | Token shared with the crawler agent for ingestion endpoints. |
| `ADMIN_TOKEN_TTL_SECONDS` | Optional TTL override for admin tokens (defaults to 900). |
| `LOG_LEVEL` | Optional log verbosity for the API (`info` recommended in production). |

### Deploying via CLI

```bash
# Authenticate and select the project (one-time)
railway login
railway link

# Deploy the API container
railway up --service api --path apps/api --dockerfile apps/api/Dockerfile
```

If you prefer the dashboard, choose **New** → **Deploy from Repo** (or **Deploy from tarball**), point it at this repository, and set the build context to `api/` with the Dockerfile located at `api/Dockerfile`.

## Deploy the Astro web frontend service

| Setting | Value |
| --- | --- |
| Build context | `./apps/web` |
| Dockerfile | `apps/web/Dockerfile` |
| Default port | `3000` |
| Health check | `GET /` |

### Required environment variables

| Variable | Description |
| --- | --- |
| `PORT` | Provided by Railway, keep `3000` locally. |
| `API_BASE_URL` | The public URL of the API service (e.g., `https://api-production.up.railway.app`). |

The Astro Dockerfile performs a production build in a first stage and serves the static output with `serve`, so no additional adapters are required.

### Deploying via CLI

```bash
railway up --service web --path apps/web --dockerfile apps/web/Dockerfile
```

Again, the dashboard workflow mirrors the API deployment—point to `astro/` as the path and keep the Dockerfile selection at `astro/Dockerfile`.

## Wiring services together

1. **Connect DATABASE_URL:** In the API service variables screen, add `DATABASE_URL` with the value `${{postgres.DATABASE_URL}}` so it automatically tracks the credentials managed by Railway.
2. **Expose the API URL to Astro:** Once the API deployment finishes, Railway shows a public domain (e.g., `https://api-production.up.railway.app`). Set that value as the `API_BASE_URL` variable for the Astro service so server-side rendering can fetch listings.
3. **Lock down secrets:** Add the same admin and crawler secrets you use locally to the API service variables. None of these should be committed to git.

## Optional: multiple environments

Railway supports environments (e.g., `staging`, `production`). After you clone an environment, redeploy each service with the same Dockerfiles and override variables as needed. Because Docker images are immutable, you can promote a build between environments without rebuilding by selecting the existing deployment inside Railway.

## Verification & monitoring

- Use the **Metrics** tab on each service to watch container CPU/memory after deployment.
- The API service exposes `GET /health`; add a Railway Healthcheck or external monitor (UptimeRobot, BetterStack) against that endpoint.
- Tail logs with `railway logs --service api` or via the dashboard if something fails during boot.
- Refer to `docs/monitoring.md` for a quick checklist that pairs the `/health` endpoint with UptimeRobot and shows how to trace crawler logs.

With these steps complete, the Mega Directory API, frontend, and database all run on Railway using the Dockerfiles checked into this repository.
