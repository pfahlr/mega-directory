# Mega Directory

Mega Directory is a server-rendered directory listing platform built with Astro, Express, and Prisma. It supports dynamic subdomains, AI-generated content enrichment, and moderation workflows.

## Features

- 🛰️ Subdomain-based regional directories (e.g. electricians.nyc.example.com)
- ⚡ Express API with JWT-based auth
- 🧠 AI agents for crawling, enrichment, and moderation (via OpenRouter)
- 🧩 Admin dashboard for approving or rejecting listings
- 💅 Tailwind CSS and minimal JavaScript for accessibility and performance
- 🐳 Dockerized and deployable behind Cloudflare with SSR

## Tech Stack

- Astro (SSR)
- Express.js
- Prisma + PostgreSQL
- Tailwind CSS
- OpenRouter (AI Agents)
- Docker + Compose
- Cloudflare (SSL, DNS, Caching)

## Setup

Install dependencies for each JavaScript project individually:

```bash
cd api && npm install
cd astro && npm install
cd admin && npm install
```

Database schema and seed scripts live under `/db`. Run Prisma commands from the `api` workspace once the API server has been configured with a connection string (see future Codex tasks for details).

## Running with Docker Compose

`docker-compose.yml` defines only the core platform services: `api`, `db`, and the Astro frontend. Bring them up together with:

```bash
docker compose up --build
```

Provide an `.env` file for the API service (e.g., JWT secrets, database URLs) before running Compose. Postgres data is stored in the `pgdata` volume declared in the compose file.

## Logging & Monitoring

- The Express API emits JSON logs (request + application events) to stdout. Override the level with `LOG_LEVEL=info` or `debug` as needed—Railway and Docker automatically capture the output.
- `GET /health` now returns uptime metadata so monitors like UptimeRobot or Better Stack can alert when the service fails its liveness probe.
- The Python crawler uses the standard `logging` module; set `CRAWLER_LOG_LEVEL` (defaults to `DEBUG` locally, `INFO` in production) to tune verbosity when running long jobs.
- See `docs/monitoring.md` for tips on wiring the `/health` endpoint into UptimeRobot and for tailing logs via Railway CLI.

## Railway Deployment

The repository is ready to deploy on [Railway](https://railway.app) using the Dockerfiles under `api/` and `astro/`. Follow the step-by-step guide in `docs/deployment/railway.md` to provision the Postgres plugin, deploy the two services, and wire their environment variables together.

## Admin & Crawler Tools

The admin interface and crawler agent run outside Docker so that they can be operated from developer machines or private servers.

- Admin interface:  
  ```bash
  cd admin
  npm run dev
  ```
- Python crawler agent (configure `agents/crawler/config/targets.json` first):  
  ```bash
  cd agents/crawler
  python main.py
  ```
  To replay the built-in demo data against your local API without touching real websites, run:
  ```bash
  python agents/crawler/dev_runner.py --run-once
  ```

Additional details about each agent live in `docs/AGENTS.md`.

### Dev Bootstrap Script

When you need the entire stack (API + Astro + Admin + crawler) running locally, use the helper script:

```bash
./scripts/dev-bootstrap.sh
```

It launches:

- the Express API on `http://localhost:3001` with sensible JWT/crawler secrets,
- the Astro frontend on `http://localhost:3000`,
- the Admin UI on `http://localhost:4000`, and
- a demo crawler loop that replays sample listings into the API every 45 seconds so you always have fresh data to review.

Override any port or secret via environment variables (e.g., `API_PORT`, `ASTRO_PORT`, `ADMIN_PORT`, `CRAWLER_INTERVAL`, `ADMIN_JWT_SECRET`, `CRAWLER_API_TOKEN`). Set `SKIP_CRAWLER=1` if you want to keep the crawler offline. The script requires `npm` and `python3` to be available on your PATH.

The bootstrapper now installs missing dependencies for you: it runs `npm install` for the API, Astro, and admin workspaces when their `node_modules/` folders are absent and installs the crawler's Python requirements from `agents/crawler/requirements-dev.txt` (using `pip --user` unless you're already inside a virtual environment). Set `DEV_BOOTSTRAP_FORCE_INSTALL=1` to force a reinstall if you need to pick up dependency changes.

## Project Structure

```
/astro             - Astro frontend (SSR entry point and UI components)
/api               - Express API placeholder (filled out in later tasks)
/admin             - Standalone moderation UI
/agents/crawler    - Python crawler agent source + configs
/codex/TASKS       - Codex YAML task definitions
/db                - Prisma schema and seeding scripts
/docs              - Developer documentation (see docs/AGENTS.md)
```

## License

MIT
