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

Additional details about each agent live in `docs/AGENTS.md`.

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
