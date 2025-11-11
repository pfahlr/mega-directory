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

```bash
git clone https://your-repo-url mega-directory
cd mega-directory
npm install

# Set up the database
npx prisma migrate dev --name init
npx prisma db seed

# Run the development server
npm run dev
```

## Project Structure

```
/astro         - Astro frontend (SSR)
/api           - Express API and middleware
/agents        - AI agent scripts
/db            - Prisma schema and seeding
/codex/TASKS   - Codex YAML task definitions
/docs          - Developer documentation
```

## License

MIT
