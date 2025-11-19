# Mega Directory DevOps Guide

Complete operational guide for deploying and managing Mega Directory in development and production environments.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Production Deployment - Single Node](#production-deployment---single-node)
3. [Production Deployment - Multi-Node](#production-deployment---multi-node)
4. [Database Operations](#database-operations)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

---

## Development Environment Setup

### Prerequisites

Before starting, ensure you have the following tools installed:

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| **Node.js** | 18+ | API, Web, Admin applications |
| **npm** | 8+ | Package management |
| **Python** | 3.10+ | Crawler application |
| **PostgreSQL** | 15+ | Database (or Docker alternative) |
| **Git** | 2.30+ | Version control |

**Optional but recommended:**
- **Docker** / **Podman** - For containerized database
- **SOPS** - For encrypted secrets management
- **GnuPG** - For SOPS encryption
- **jq** - For JSON processing in scripts
- **direnv** - For automatic environment loading

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/mega-directory.git
cd mega-directory
```

### Step 2: Install Dependencies

Install all workspace dependencies from the repository root:

```bash
npm install
```

Install Python dependencies for the crawler:

```bash
python3 -m pip install --user -r apps/crawler/requirements-dev.txt
```

Or if using a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r apps/crawler/requirements-dev.txt
```

### Step 3: Set Up PostgreSQL Database

#### Option A: Using Docker (Recommended for Development)

```bash
docker run -d \
  --name mega-directory-db \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=mega_directory \
  -v mega-directory-pgdata:/var/lib/postgresql/data \
  postgres:17

# Verify it's running
docker ps | grep mega-directory-db
```

#### Option B: Using Docker Compose

```bash
docker compose up -d db
```

#### Option C: Using Local PostgreSQL Installation

```bash
# Create database (adjust command for your OS/setup)
createdb mega_directory

# Or using psql
psql -U postgres
CREATE DATABASE mega_directory;
\q
```

#### Verify Database Connection

```bash
psql -h localhost -U postgres -d mega_directory -c "SELECT version();"
```

### Step 4: Configure Environment Variables

The project uses environment variables for configuration. For development, the bootstrap script provides sensible defaults, but you can customize them.

#### Quick Start (Using Defaults)

The `dev-bootstrap.sh` script uses these defaults:
- `DATABASE_URL`: `postgresql://postgres:password@localhost:5432/mega_directory`
- `CRAWLER_BEARER_TOKEN`: `crawler-dev-token`
- `ADMIN_JWT_SECRET`: `local-dev-secret`
- `ADMIN_LOGIN_EMAIL`: `admin@example.com`
- `ADMIN_LOGIN_PASSCODE`: `localpass`

#### Custom Configuration (Optional)

Create a `.env` file in the repository root:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/mega_directory

# API Configuration
API_PORT=3030
ASTRO_PORT=3000
ADMIN_PORT=4000

# Authentication
ADMIN_JWT_SECRET=your-secret-key-change-in-production
ADMIN_LOGIN_EMAIL=admin@example.com
ADMIN_LOGIN_PASSCODE=your-secure-password
CRAWLER_BEARER_TOKEN=crawler-dev-token
ADMIN_API_TOKEN=admin-dev-token

# Logging
LOG_LEVEL=debug
CRAWLER_LOG_LEVEL=DEBUG

# Optional: External Services
# GEOCODEMAPS_API_KEY=your-key
# GOOGLEMAPS_API_KEY=your-key
# OPENAI_API_KEY=your-key
# OPENROUTER_API_KEY=your-key
```

Then load the environment:

```bash
source .env  # or use direnv
```

#### Using SOPS for Encrypted Secrets (Team Environments)

If your team uses SOPS:

```bash
# Decrypt and load secrets
eval "$(make sops-env-export)"
```

### Step 5: Run Database Migrations

Apply all migrations to set up the database schema:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/mega_directory" \
  npx prisma migrate deploy --schema=db/schema.prisma
```

Generate Prisma Client:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/mega_directory" \
  npx prisma generate --schema=db/schema.prisma
```

### Step 6: Seed the Database (Optional but Recommended)

#### Seed Geographic Data

Load sample geographic data:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/mega_directory" \
  npx ts-node db/scripts/seedGeography.ts
```

For full geographic datasets, set these environment variables:

```bash
GEO_DATASET_DIR="$HOME/datasets/geography" \
GEO_POSTAL_FILE="$HOME/datasets/geography/allCountries.txt" \
DATABASE_URL="postgresql://postgres:password@localhost:5432/mega_directory" \
  npx ts-node db/scripts/seedGeography.ts
```

#### Seed Demo Data

Load sample categories, directories, and listings:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/mega_directory" \
  npx ts-node db/seed.ts
```

### Step 7: Start the Development Stack

#### Option A: Automated Bootstrap (Recommended)

Start all services with one command:

```bash
./scripts/dev-bootstrap.sh
```

This starts:
- **API** on http://localhost:3030
- **Web** on http://localhost:3000
- **Admin** on http://localhost:4000
- **Crawler** (optional, runs every 45 seconds)

To skip the crawler:

```bash
SKIP_CRAWLER=1 ./scripts/dev-bootstrap.sh
```

To customize ports:

```bash
API_PORT=8080 ASTRO_PORT=8000 ADMIN_PORT=8001 ./scripts/dev-bootstrap.sh
```

#### Option B: Manual Service Startup

Start each service in a separate terminal:

**Terminal 1 - API:**
```bash
cd apps/api
DATABASE_URL="postgresql://postgres:password@localhost:5432/mega_directory" \
ADMIN_JWT_SECRET="local-dev-secret" \
ADMIN_LOGIN_EMAIL="admin@example.com" \
ADMIN_LOGIN_PASSCODE="localpass" \
CRAWLER_BEARER_TOKEN="crawler-dev-token" \
  npm run dev
```

**Terminal 2 - Web:**
```bash
cd apps/web
PUBLIC_API_BASE_URL="http://localhost:3030" \
  npm run dev
```

**Terminal 3 - Admin:**
```bash
cd apps/admin
ADMIN_API_BASE_URL="http://localhost:3030" \
ADMIN_API_TOKEN="admin-dev-token" \
  npm run dev
```

**Terminal 4 - Crawler (Optional):**
```bash
cd apps/crawler
python dev_runner.py \
  --api-endpoint http://localhost:3030/v1/crawler/listings \
  --api-token crawler-dev-token \
  --interval 45
```

#### Option C: Docker Compose

Start the entire stack with Docker:

```bash
docker compose up --build
```

This creates containers for:
- PostgreSQL database
- API service
- Web frontend

**Note:** The Docker Compose setup doesn't include Admin or Crawler by default.

### Step 8: Verify Installation

Test each service:

```bash
# API Health Check
curl http://localhost:3030/health

# Web Frontend
curl http://localhost:3000

# Admin Interface
open http://localhost:4000  # or visit in browser

# Test crawler authentication
curl -X POST http://localhost:3030/v1/crawler/ping \
  -H "Authorization: Bearer crawler-dev-token"
```

### Development Workflow

#### Running Tests

```bash
# API tests
cd apps/api
npm test                    # Run all tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:coverage       # With coverage report

# API tests with specific database
DATABASE_URL="postgresql://postgres:password@localhost:5432/mega_directory_test" \
  npm test
```

#### Database Operations

```bash
# Create a new migration
cd apps/api
npx prisma migrate dev --name your_migration_name --schema=../../db/schema.prisma

# Reset database (WARNING: destroys all data)
npx prisma migrate reset --schema=../../db/schema.prisma

# Open Prisma Studio (database GUI)
npx prisma studio --schema=../../db/schema.prisma
```

#### Hot Reloading

- **API**: Uses `ts-node` with watch mode via `npm run dev:watch`
- **Web**: Astro dev server has built-in hot reload
- **Admin**: Changes require restart (simple Node.js + EJS)
- **Crawler**: Restart Python process for code changes

---

## Production Deployment - Single Node

Deploy the entire Mega Directory stack on a single Linux server.

### Prerequisites

- Linux server (Ubuntu 20.04+, Debian 11+, or RHEL 8+)
- Root or sudo access
- Domain name pointed to server IP
- Minimum specs:
  - 2 CPU cores
  - 4GB RAM
  - 20GB disk space
  - Public IP address

### Architecture Overview

Single-node deployment runs all services on one machine:

```
┌─────────────────────────────────────────────┐
│         Linux Server (Single Node)          │
│                                             │
│  ┌─────────────┐      ┌─────────────┐     │
│  │   Nginx     │      │  PostgreSQL │     │
│  │   (Proxy)   │      │   (Port     │     │
│  │   :80/:443  │      │    5432)    │     │
│  └──────┬──────┘      └─────────────┘     │
│         │                                   │
│    ┌────┴─────┬──────────┬──────────┐     │
│    │          │          │          │     │
│  ┌─▼────┐  ┌─▼────┐  ┌─▼────┐  ┌──▼───┐ │
│  │ API  │  │ Web  │  │Admin │  │Crawler│ │
│  │:3030 │  │:3000 │  │:4000 │  │  App  │ │
│  └──────┘  └──────┘  └──────┘  └──────┘ │
└─────────────────────────────────────────────┘
```

### Step 1: Server Preparation

#### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

#### Install Required Software

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 15+
sudo apt install -y postgresql postgresql-contrib

# Python 3.10+
sudo apt install -y python3 python3-pip python3-venv

# Nginx
sudo apt install -y nginx

# Build tools
sudo apt install -y build-essential git curl

# Optional: Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### Create Application User

```bash
sudo useradd -m -s /bin/bash megadir
sudo usermod -aG sudo megadir  # Optional: if user needs sudo
```

### Step 2: Set Up PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE mega_directory;
CREATE USER megadir WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE mega_directory TO megadir;
\q
```

Configure PostgreSQL to accept connections:

```bash
# Edit postgresql.conf
sudo vim /etc/postgresql/15/main/postgresql.conf
# Set: listen_addresses = 'localhost'

# Edit pg_hba.conf
sudo vim /etc/postgresql/15/main/pg_hba.conf
# Add: local   mega_directory   megadir   scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql
```

Test connection:

```bash
psql -U megadir -d mega_directory -h localhost
```

### Step 3: Deploy Application Code

```bash
# Switch to application user
sudo su - megadir

# Clone repository
git clone https://github.com/your-org/mega-directory.git
cd mega-directory

# Install dependencies
npm install
python3 -m pip install --user -r apps/crawler/requirements-dev.txt
```

### Step 4: Configure Environment Variables

Create production environment file:

```bash
# Create secure .env file
sudo vim /home/megadir/mega-directory/.env.production
```

```bash
# Database
DATABASE_URL=postgresql://megadir:YOUR_DB_PASSWORD@localhost:5432/mega_directory

# API Configuration
NODE_ENV=production
PORT=3030
LOG_LEVEL=info

# Authentication - CHANGE THESE!
ADMIN_JWT_SECRET=$(openssl rand -hex 32)
ADMIN_LOGIN_EMAIL=admin@yourdomain.com
ADMIN_LOGIN_PASSCODE=$(openssl rand -hex 16)
CRAWLER_BEARER_TOKEN=$(openssl rand -hex 32)
ADMIN_API_TOKEN=$(openssl rand -hex 32)

# JWT Settings
ADMIN_JWT_ISSUER=mega-directory
ADMIN_JWT_AUDIENCE=admin
ADMIN_TOKEN_TTL_SECONDS=900

# API URLs
API_BASE_URL=https://api.yourdomain.com
PUBLIC_API_BASE_URL=https://api.yourdomain.com
ADMIN_API_BASE_URL=https://api.yourdomain.com

# Optional: External Services
# GEOCODEMAPS_API_KEY=your-key
# GOOGLEMAPS_API_KEY=your-key
# OPENAI_API_KEY=your-key
# OPENROUTER_API_KEY=your-key

# Crawler Configuration
CRAWLER_API_ENDPOINT=https://api.yourdomain.com/v1/crawler/listings
CRAWLER_LOG_LEVEL=INFO
```

Secure the file:

```bash
sudo chmod 600 /home/megadir/mega-directory/.env.production
sudo chown megadir:megadir /home/megadir/mega-directory/.env.production
```

### Step 5: Build Applications

```bash
cd /home/megadir/mega-directory

# Load environment
export $(cat .env.production | xargs)

# Run migrations
npx prisma migrate deploy --schema=db/schema.prisma

# Build API
cd apps/api
npm run build

# Build Web
cd ../web
npm run build

# Build Admin
cd ../admin
npm install
```

### Step 6: Set Up Process Management with systemd

Create systemd service files for each component:

#### API Service

```bash
sudo vim /etc/systemd/system/megadir-api.service
```

```ini
[Unit]
Description=Mega Directory API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=megadir
WorkingDirectory=/home/megadir/mega-directory/apps/api
EnvironmentFile=/home/megadir/mega-directory/.env.production
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=megadir-api

[Install]
WantedBy=multi-user.target
```

#### Web Service

```bash
sudo vim /etc/systemd/system/megadir-web.service
```

```ini
[Unit]
Description=Mega Directory Web Frontend
After=network.target megadir-api.service
Requires=megadir-api.service

[Service]
Type=simple
User=megadir
WorkingDirectory=/home/megadir/mega-directory/apps/web
EnvironmentFile=/home/megadir/mega-directory/.env.production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=megadir-web

[Install]
WantedBy=multi-user.target
```

#### Admin Service

```bash
sudo vim /etc/systemd/system/megadir-admin.service
```

```ini
[Unit]
Description=Mega Directory Admin Interface
After=network.target megadir-api.service
Requires=megadir-api.service

[Service]
Type=simple
User=megadir
WorkingDirectory=/home/megadir/mega-directory/apps/admin
EnvironmentFile=/home/megadir/mega-directory/.env.production
Environment=PORT=4000
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=megadir-admin

[Install]
WantedBy=multi-user.target
```

#### Crawler Service

```bash
sudo vim /etc/systemd/system/megadir-crawler.service
```

```ini
[Unit]
Description=Mega Directory Crawler
After=network.target megadir-api.service
Requires=megadir-api.service

[Service]
Type=simple
User=megadir
WorkingDirectory=/home/megadir/mega-directory/apps/crawler
EnvironmentFile=/home/megadir/mega-directory/.env.production
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=300
StandardOutput=journal
StandardError=journal
SyslogIdentifier=megadir-crawler

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services to start on boot
sudo systemctl enable megadir-api
sudo systemctl enable megadir-web
sudo systemctl enable megadir-admin
sudo systemctl enable megadir-crawler

# Start services
sudo systemctl start megadir-api
sudo systemctl start megadir-web
sudo systemctl start megadir-admin
sudo systemctl start megadir-crawler

# Check status
sudo systemctl status megadir-api
sudo systemctl status megadir-web
sudo systemctl status megadir-admin
sudo systemctl status megadir-crawler
```

### Step 7: Configure Nginx Reverse Proxy

Create Nginx configuration:

```bash
sudo vim /etc/nginx/sites-available/megadirectory
```

```nginx
# API Backend
upstream api_backend {
    server localhost:3030;
    keepalive 32;
}

# Web Frontend
upstream web_backend {
    server localhost:3000;
    keepalive 32;
}

# Admin Interface
upstream admin_backend {
    server localhost:4000;
    keepalive 32;
}

# API Server
server {
    listen 80;
    server_name api.yourdomain.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (after running certbot)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Proxy settings
    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check doesn't need auth
    location /health {
        proxy_pass http://api_backend/health;
        access_log off;
    }
}

# Web Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://web_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Admin Interface (Optional: restrict by IP)
server {
    listen 80;
    server_name admin.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/admin.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.yourdomain.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Optional: Restrict to specific IPs
    # allow 192.168.1.0/24;
    # allow 10.0.0.0/8;
    # deny all;

    location / {
        proxy_pass http://admin_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/megadirectory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: Set Up SSL with Let's Encrypt

```bash
# Obtain certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
sudo certbot --nginx -d admin.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 9: Configure Firewall

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 10: Set Up Log Rotation

```bash
sudo vim /etc/logrotate.d/megadirectory
```

```
/var/log/megadir/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 megadir megadir
    sharedscripts
    postrotate
        systemctl reload megadir-api megadir-web megadir-admin megadir-crawler
    endscript
}
```

### Step 11: Set Up Automated Backups

Create backup script:

```bash
sudo vim /usr/local/bin/backup-megadir.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/backups/megadir"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="mega_directory"
DB_USER="megadir"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup environment file
cp /home/megadir/mega-directory/.env.production "$BACKUP_DIR/env_$DATE"

# Keep only last 7 days
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "env_*" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make it executable and schedule:

```bash
sudo chmod +x /usr/local/bin/backup-megadir.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-megadir.sh >> /var/log/megadir-backup.log 2>&1
```

### Step 12: Verify Deployment

```bash
# Check all services are running
sudo systemctl status megadir-api
sudo systemctl status megadir-web
sudo systemctl status megadir-admin
sudo systemctl status megadir-crawler

# Test endpoints
curl https://api.yourdomain.com/health
curl https://yourdomain.com
curl https://admin.yourdomain.com

# Check logs
sudo journalctl -u megadir-api -f
sudo journalctl -u megadir-web -f
```

---

## Production Deployment - Multi-Node

Deploy Mega Directory across multiple servers for high availability and scalability.

### Architecture Overview

```
                    ┌──────────────┐
                    │ Load Balancer│
                    │ (Nginx/HAProxy)│
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼─────┐       ┌────▼─────┐       ┌────▼─────┐
   │  Web     │       │  Web     │       │  Web     │
   │  Node 1  │       │  Node 2  │       │  Node 3  │
   │  :3000   │       │  :3000   │       │  :3000   │
   └────┬─────┘       └────┬─────┘       └────┬─────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼───────┐
                    │   API Cluster │
                    │   (Load Bal.) │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼─────┐       ┌────▼─────┐       ┌────▼─────┐
   │  API     │       │  API     │       │  API     │
   │  Node 1  │       │  Node 2  │       │  Node 3  │
   │  :3030   │       │  :3030   │       │  :3030   │
   └────┬─────┘       └────┬─────┘       └────┬─────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
       ┌────▼────┐    ┌────▼────┐    ┌───▼────┐
       │PostgreSQL│    │  Redis  │    │Crawler │
       │ Primary │    │  Cache  │    │ Node   │
       │         │    │         │    │        │
       └────┬────┘    └─────────┘    └────────┘
            │
       ┌────▼────┐
       │PostgreSQL│
       │ Replica │
       └─────────┘
```

### Node Requirements

| Node Type | Count | Specs | Purpose |
|-----------|-------|-------|---------|
| **Load Balancer** | 1-2 | 2 CPU, 2GB RAM | Traffic distribution |
| **Web Nodes** | 2-5 | 2 CPU, 4GB RAM | Astro SSR frontend |
| **API Nodes** | 2-5 | 4 CPU, 8GB RAM | Express API |
| **Database Primary** | 1 | 4 CPU, 16GB RAM, SSD | PostgreSQL master |
| **Database Replica** | 1+ | 4 CPU, 16GB RAM, SSD | PostgreSQL read replicas |
| **Cache Node** | 1-2 | 2 CPU, 4GB RAM | Redis (optional) |
| **Admin Node** | 1 | 2 CPU, 4GB RAM | Admin interface |
| **Crawler Node** | 1+ | 2 CPU, 4GB RAM | Background jobs |

### Step 1: Provision Servers

Use your cloud provider (AWS, GCP, Azure, DigitalOcean) or bare metal servers.

#### Recommended Instance Types

**AWS:**
- Web/Admin: t3.medium
- API: t3.large
- Database: r6g.xlarge (with provisioned IOPS)
- Crawler: t3.medium

**DigitalOcean:**
- Web/Admin: 2 vCPU, 4GB RAM
- API: 4 vCPU, 8GB RAM
- Database: 4 vCPU, 16GB RAM, dedicated
- Crawler: 2 vCPU, 4GB RAM

### Step 2: Set Up PostgreSQL Cluster

#### Primary Database Node

```bash
# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# Configure for replication
sudo vim /etc/postgresql/15/main/postgresql.conf
```

```ini
# Connection settings
listen_addresses = '*'
max_connections = 200

# Replication settings
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on

# Performance tuning
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10485kB
min_wal_size = 1GB
max_wal_size = 4GB
```

```bash
# Configure authentication
sudo vim /etc/postgresql/15/main/pg_hba.conf
```

```
# Replication connections
host    replication     replicator      REPLICA_IP/32     scram-sha-256

# Application connections
host    mega_directory  megadir         API_NODE_1_IP/32  scram-sha-256
host    mega_directory  megadir         API_NODE_2_IP/32  scram-sha-256
host    mega_directory  megadir         API_NODE_3_IP/32  scram-sha-256
```

```bash
# Create replication user
sudo -u postgres psql
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'REPLICATION_PASSWORD';
CREATE DATABASE mega_directory;
CREATE USER megadir WITH ENCRYPTED PASSWORD 'DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE mega_directory TO megadir;
\q

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Replica Database Node

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Remove existing data
sudo rm -rf /var/lib/postgresql/15/main/*

# Create base backup from primary
sudo -u postgres pg_basebackup -h PRIMARY_IP -D /var/lib/postgresql/15/main -U replicator -P -v -R -X stream -C -S replica_1

# Create standby signal
sudo -u postgres touch /var/lib/postgresql/15/main/standby.signal

# Start PostgreSQL
sudo systemctl start postgresql

# Verify replication
sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"
```

### Step 3: Set Up Redis Cache (Optional)

Install Redis on cache node:

```bash
sudo apt install -y redis-server

# Configure Redis
sudo vim /etc/redis/redis.conf
```

```ini
bind 0.0.0.0
requirepass YOUR_REDIS_PASSWORD
maxmemory 2gb
maxmemory-policy allkeys-lru
```

```bash
sudo systemctl restart redis-server
```

Update API configuration to use Redis:

```bash
# In .env.production on API nodes
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@CACHE_NODE_IP:6379
```

### Step 4: Deploy API Nodes

On each API node:

```bash
# Clone and build (same as single node)
git clone https://github.com/your-org/mega-directory.git
cd mega-directory
npm install
cd apps/api
npm run build

# Configure environment
# Use PRIMARY database for writes, REPLICA for reads
vim /home/megadir/mega-directory/.env.production
```

```bash
DATABASE_URL=postgresql://megadir:DB_PASSWORD@PRIMARY_IP:5432/mega_directory
DATABASE_REPLICA_URL=postgresql://megadir:DB_PASSWORD@REPLICA_IP:5432/mega_directory
REDIS_URL=redis://:REDIS_PASSWORD@CACHE_IP:6379
```

```bash
# Set up systemd service (same as single node)
# Start service
sudo systemctl enable megadir-api
sudo systemctl start megadir-api
```

### Step 5: Deploy Web Nodes

On each web node:

```bash
git clone https://github.com/your-org/mega-directory.git
cd mega-directory
npm install
cd apps/web
npm run build

# Configure to point to API load balancer
vim /home/megadir/mega-directory/.env.production
```

```bash
API_BASE_URL=https://api-internal.yourdomain.com
PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

```bash
# Set up systemd service
sudo systemctl enable megadir-web
sudo systemctl start megadir-web
```

### Step 6: Set Up Load Balancer

Install and configure Nginx on load balancer node:

```bash
sudo apt install -y nginx
```

#### API Load Balancer Configuration

```bash
sudo vim /etc/nginx/conf.d/api-upstream.conf
```

```nginx
upstream api_cluster {
    least_conn;

    server API_NODE_1_IP:3030 max_fails=3 fail_timeout=30s;
    server API_NODE_2_IP:3030 max_fails=3 fail_timeout=30s;
    server API_NODE_3_IP:3030 max_fails=3 fail_timeout=30s;

    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://api_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Health check
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }

    location /health {
        proxy_pass http://api_cluster/health;
        access_log off;
    }
}
```

#### Web Load Balancer Configuration

```bash
sudo vim /etc/nginx/conf.d/web-upstream.conf
```

```nginx
upstream web_cluster {
    least_conn;

    server WEB_NODE_1_IP:3000 max_fails=3 fail_timeout=30s;
    server WEB_NODE_2_IP:3000 max_fails=3 fail_timeout=30s;
    server WEB_NODE_3_IP:3000 max_fails=3 fail_timeout=30s;

    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://web_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Deploy Admin Node

Deploy admin interface on a separate node (or co-locate with one web node):

```bash
# Same process as single node
# Optionally restrict access by IP at Nginx level
```

### Step 8: Deploy Crawler Nodes

For high-volume crawling, run multiple crawler instances:

```bash
# On crawler node 1
cd /home/megadir/mega-directory/apps/crawler
# Run specific targets
python main.py --config config/targets-set1.json

# On crawler node 2
python main.py --config config/targets-set2.json
```

Or use a job queue system (e.g., Celery with Redis):

```bash
# Install Celery
pip install celery redis

# Start workers
celery -A crawler_tasks worker --loglevel=info --concurrency=4
```

### Step 9: Set Up Health Checks

Configure health checks for each service:

```bash
# API health check script
sudo vim /usr/local/bin/check-api-health.sh
```

```bash
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3030/health)
if [ "$response" != "200" ]; then
    echo "API health check failed: $response"
    systemctl restart megadir-api
fi
```

Add to crontab:

```bash
*/5 * * * * /usr/local/bin/check-api-health.sh
```

### Step 10: Configure Monitoring

Install monitoring tools on all nodes:

```bash
# Install node_exporter for Prometheus
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo vim /etc/systemd/system/node_exporter.service
```

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

Set up centralized logging with ELK Stack or Loki + Grafana.

### Step 11: Deployment Automation

Create deployment script:

```bash
sudo vim /usr/local/bin/deploy-megadir.sh
```

```bash
#!/bin/bash

set -e

NODE_TYPE="${1:-api}"  # api, web, admin
BRANCH="${2:-main}"

echo "Deploying $NODE_TYPE from branch $BRANCH"

cd /home/megadir/mega-directory

# Pull latest code
sudo -u megadir git fetch origin
sudo -u megadir git checkout "$BRANCH"
sudo -u megadir git pull origin "$BRANCH"

# Install dependencies
sudo -u megadir npm install

# Build application
case "$NODE_TYPE" in
    api)
        cd apps/api
        sudo -u megadir npm run build
        sudo systemctl restart megadir-api
        ;;
    web)
        cd apps/web
        sudo -u megadir npm run build
        sudo systemctl restart megadir-web
        ;;
    admin)
        cd apps/admin
        sudo systemctl restart megadir-admin
        ;;
esac

echo "Deployment complete"
```

For zero-downtime deployments, use blue-green deployment pattern.

---

## Database Operations

### Backup and Restore

#### Manual Backup

```bash
# Full database backup
pg_dump -U megadir -h localhost mega_directory | gzip > backup_$(date +%Y%m%d).sql.gz

# Schema only
pg_dump -U megadir -h localhost -s mega_directory > schema_$(date +%Y%m%d).sql

# Single table
pg_dump -U megadir -h localhost -t listings mega_directory > listings_$(date +%Y%m%d).sql
```

#### Automated Backups

```bash
sudo vim /usr/local/bin/pg-backup.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30
DB_NAME="mega_directory"
DB_USER="megadir"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Full backup
pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$BACKUP_DIR/full_$TIMESTAMP.sql.gz"

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_DIR/full_$TIMESTAMP.sql.gz" s3://your-bucket/backups/

# Clean old backups
find "$BACKUP_DIR" -name "full_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
```

#### Restore from Backup

```bash
# Stop applications
sudo systemctl stop megadir-api megadir-web megadir-admin

# Drop and recreate database
sudo -u postgres psql
DROP DATABASE mega_directory;
CREATE DATABASE mega_directory;
GRANT ALL PRIVILEGES ON DATABASE mega_directory TO megadir;
\q

# Restore from backup
gunzip -c backup_20250101.sql.gz | psql -U megadir -h localhost mega_directory

# Start applications
sudo systemctl start megadir-api megadir-web megadir-admin
```

### Migration Management

#### Create New Migration

```bash
cd apps/api
npx prisma migrate dev --name your_migration_description --schema=../../db/schema.prisma
```

#### Apply Migrations in Production

```bash
# Preview migration
npx prisma migrate diff \
  --from-url "postgresql://megadir:PASSWORD@localhost:5432/mega_directory" \
  --to-schema-datamodel db/schema.prisma \
  --script

# Apply migration
DATABASE_URL="postgresql://megadir:PASSWORD@localhost:5432/mega_directory" \
  npx prisma migrate deploy --schema=db/schema.prisma
```

#### Rollback Migration

Prisma doesn't have automatic rollback. Manual process:

```bash
# 1. Restore database from backup before migration
# 2. Or write reverse migration manually

sudo -u postgres psql mega_directory
-- Review migration
\i db/migrations/YOUR_MIGRATION/migration.sql

-- Write and apply reverse migration manually
```

### Database Maintenance

#### Vacuum and Analyze

```bash
# Manual vacuum
psql -U megadir -h localhost -d mega_directory -c "VACUUM ANALYZE;"

# Scheduled maintenance
sudo crontab -e
# Add: 0 3 * * 0 psql -U megadir -h localhost -d mega_directory -c "VACUUM ANALYZE;" >> /var/log/pg-maintenance.log 2>&1
```

#### Monitor Database Size

```bash
psql -U megadir -h localhost -d mega_directory -c "
SELECT
    pg_size_pretty(pg_database_size('mega_directory')) as db_size,
    pg_size_pretty(pg_total_relation_size('listings')) as listings_size,
    pg_size_pretty(pg_total_relation_size('categories')) as categories_size;
"
```

#### Index Maintenance

```bash
# Rebuild indexes
psql -U megadir -h localhost -d mega_directory -c "REINDEX DATABASE mega_directory;"
```

---

## Monitoring & Maintenance

### Service Monitoring

#### Check Service Status

```bash
# All services
sudo systemctl status megadir-*

# Individual services
sudo systemctl status megadir-api
sudo systemctl status megadir-web
sudo systemctl status megadir-admin
sudo systemctl status megadir-crawler
```

#### View Logs

```bash
# Real-time logs
sudo journalctl -u megadir-api -f
sudo journalctl -u megadir-web -f

# Last 100 lines
sudo journalctl -u megadir-api -n 100

# Logs from specific time range
sudo journalctl -u megadir-api --since "2025-01-01 00:00:00" --until "2025-01-01 23:59:59"

# Filter by log level
sudo journalctl -u megadir-api -p err  # errors only
```

### Application Monitoring

#### Set Up UptimeRobot

1. Create HTTP monitor for each endpoint:
   - API: `https://api.yourdomain.com/health`
   - Web: `https://yourdomain.com`
   - Admin: `https://admin.yourdomain.com`

2. Configure alerts (email, Slack, PagerDuty)

3. Set check interval (5 minutes recommended)

#### Prometheus + Grafana Setup

```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz
sudo cp prometheus-2.45.0.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-2.45.0.linux-amd64/promtool /usr/local/bin/

# Configure Prometheus
sudo mkdir -p /etc/prometheus
sudo vim /etc/prometheus/prometheus.yml
```

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets:
        - 'localhost:9100'
        - 'api-node-1:9100'
        - 'api-node-2:9100'
        - 'web-node-1:9100'
```

#### Custom Health Checks

Create health check endpoints:

```typescript
// In apps/api/src/routes/health.ts
router.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };

  const isHealthy = health.database && health.redis;
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### Performance Monitoring

#### Monitor System Resources

```bash
# CPU and memory
htop

# Disk usage
df -h
du -sh /home/megadir/mega-directory

# Network connections
ss -tulpn | grep node

# PostgreSQL connections
psql -U megadir -h localhost -d mega_directory -c "
SELECT count(*) as connections, state
FROM pg_stat_activity
WHERE datname = 'mega_directory'
GROUP BY state;
"
```

#### Application Performance

```bash
# API response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.yourdomain.com/health

# Create curl-format.txt
cat > curl-format.txt << EOF
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
----------\n
time_total:  %{time_total}\n
EOF
```

### Log Analysis

#### Analyze API Logs

```bash
# Count errors
sudo journalctl -u megadir-api --since today | grep ERROR | wc -l

# Most common errors
sudo journalctl -u megadir-api --since today | grep ERROR | sort | uniq -c | sort -rn | head -10

# Response time analysis
sudo journalctl -u megadir-api --since today | grep "took" | awk '{print $NF}' | sort -n | tail -10
```

#### Set Up Log Aggregation

Install and configure ELK Stack or Grafana Loki for centralized logging.

### Alerting

#### Set Up Email Alerts

```bash
# Install mailutils
sudo apt install -y mailutils

# Create alert script
sudo vim /usr/local/bin/alert-megadir.sh
```

```bash
#!/bin/bash

SERVICE="$1"
STATUS="$2"
EMAIL="ops@yourdomain.com"

if [ "$STATUS" != "ok" ]; then
    echo "Service $SERVICE is $STATUS" | mail -s "ALERT: Mega Directory $SERVICE Down" "$EMAIL"
fi
```

#### Integrate with PagerDuty

Use PagerDuty API to send alerts:

```bash
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "API service is down",
      "severity": "critical",
      "source": "production-api-node-1"
    }
  }'
```

### Maintenance Tasks

#### Weekly Maintenance Checklist

```bash
# 1. Check service status
sudo systemctl status megadir-*

# 2. Review error logs
sudo journalctl -u megadir-api --since "1 week ago" -p err

# 3. Check disk space
df -h

# 4. Review database size
psql -U megadir -h localhost -d mega_directory -c "
SELECT pg_size_pretty(pg_database_size('mega_directory'));"

# 5. Verify backups
ls -lh /backups/megadir/

# 6. Check SSL certificate expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# 7. Review security updates
sudo apt update && sudo apt list --upgradable
```

#### Monthly Maintenance

```bash
# Update dependencies
cd /home/megadir/mega-directory
sudo -u megadir npm audit
sudo -u megadir npm update

# Rebuild applications
sudo -u megadir npm run build
sudo systemctl restart megadir-*

# Database maintenance
psql -U megadir -h localhost -d mega_directory -c "VACUUM ANALYZE;"

# Review and rotate logs
sudo logrotate -f /etc/logrotate.d/megadirectory
```

---

## Troubleshooting

### Common Issues

#### API Won't Start

```bash
# Check logs
sudo journalctl -u megadir-api -n 50

# Common causes:
# 1. Database connection failure
psql -U megadir -h localhost -d mega_directory -c "SELECT 1;"

# 2. Port already in use
sudo lsof -i :3030

# 3. Environment variables missing
sudo -u megadir cat /home/megadir/mega-directory/.env.production

# 4. Build errors
cd /home/megadir/mega-directory/apps/api
sudo -u megadir npm run build
```

#### Database Connection Issues

```bash
# Test connection
psql -U megadir -h DATABASE_HOST -d mega_directory

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Verify pg_hba.conf allows connection
sudo vim /etc/postgresql/15/main/pg_hba.conf

# Check firewall
sudo ufw status | grep 5432
```

#### High CPU Usage

```bash
# Identify process
top -o %CPU

# Check Node.js process
ps aux | grep node

# Check for CPU-intensive queries
psql -U megadir -h localhost -d mega_directory -c "
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;
"

# Kill long-running query
psql -U megadir -h localhost -d mega_directory -c "SELECT pg_terminate_backend(PID);"
```

#### Memory Leaks

```bash
# Monitor memory over time
watch -n 5 'ps aux | grep node | grep -v grep'

# Generate heap dump (if Node.js built with --inspect)
node --inspect dist/server.js
# Connect Chrome DevTools, take heap snapshot

# Restart service to reclaim memory
sudo systemctl restart megadir-api
```

#### Slow Database Queries

```bash
# Enable slow query logging
sudo vim /etc/postgresql/15/main/postgresql.conf
# Set: log_min_duration_statement = 1000  # Log queries > 1 second

# Reload config
sudo systemctl reload postgresql

# View slow queries
sudo tail -f /var/log/postgresql/postgresql-15-main.log | grep "duration:"

# Analyze specific query
psql -U megadir -h localhost -d mega_directory
EXPLAIN ANALYZE SELECT * FROM listings WHERE status = 'APPROVED';
```

#### SSL Certificate Issues

```bash
# Check certificate expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew certificates manually
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Crawler Authentication Failures

```bash
# Check crawler logs
sudo journalctl -u megadir-crawler -n 50

# Test authentication manually
curl -X POST https://api.yourdomain.com/v1/crawler/ping \
  -H "Authorization: Bearer YOUR_CRAWLER_TOKEN" \
  -v

# Verify token matches in API and crawler config
grep CRAWLER_BEARER_TOKEN /home/megadir/mega-directory/.env.production
```

### Debug Mode

Enable debug logging:

```bash
# Stop service
sudo systemctl stop megadir-api

# Run in foreground with debug logging
cd /home/megadir/mega-directory/apps/api
LOG_LEVEL=debug node dist/server.js

# Or update environment
sudo vim /home/megadir/mega-directory/.env.production
# Set: LOG_LEVEL=debug

# Restart service
sudo systemctl restart megadir-api
```

### Emergency Procedures

#### Service Down

```bash
# 1. Check service status
sudo systemctl status megadir-api

# 2. Attempt restart
sudo systemctl restart megadir-api

# 3. Check logs for errors
sudo journalctl -u megadir-api -n 100

# 4. If persistent, rollback to previous version
cd /home/megadir/mega-directory
git checkout PREVIOUS_COMMIT
npm install
npm run build
sudo systemctl restart megadir-api
```

#### Database Corruption

```bash
# 1. Stop all API services
sudo systemctl stop megadir-api

# 2. Restore from backup
sudo -u postgres psql
DROP DATABASE mega_directory;
CREATE DATABASE mega_directory;
\q

gunzip -c /backups/megadir/db_LATEST.sql.gz | psql -U megadir mega_directory

# 3. Verify database
psql -U megadir -d mega_directory -c "SELECT count(*) FROM listings;"

# 4. Start services
sudo systemctl start megadir-api
```

#### Security Breach

```bash
# 1. Immediately rotate all secrets
# Generate new tokens
NEW_JWT_SECRET=$(openssl rand -hex 32)
NEW_CRAWLER_TOKEN=$(openssl rand -hex 32)
NEW_ADMIN_TOKEN=$(openssl rand -hex 32)

# 2. Update .env.production on all nodes
# 3. Restart all services

# 4. Review access logs
sudo journalctl -u megadir-api --since "24 hours ago" | grep -E "(401|403|500)"

# 5. Check for unauthorized database access
psql -U megadir -d mega_directory -c "
SELECT * FROM pg_stat_activity WHERE state = 'active';
"

# 6. Update firewall rules
sudo ufw reload

# 7. Force password resets for admin users
```

---

## Security Best Practices

### Environment Variables

```bash
# Never commit .env files
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore

# Use strong secrets
openssl rand -hex 32  # Generate 32-byte random hex

# Restrict file permissions
chmod 600 .env.production
chown megadir:megadir .env.production
```

### Database Security

```bash
# Use strong passwords
openssl rand -hex 20

# Restrict connections in pg_hba.conf
# Allow only specific IPs
host    mega_directory  megadir  10.0.0.0/8  scram-sha-256

# Enable SSL for PostgreSQL
sudo vim /etc/postgresql/15/main/postgresql.conf
# Set: ssl = on

# Regular security updates
sudo apt update
sudo apt upgrade postgresql-15
```

### API Security

```bash
# Rate limiting (already configured in code)
# Monitor for abuse
sudo journalctl -u megadir-api | grep "Rate limit exceeded"

# Keep dependencies updated
cd apps/api
npm audit
npm audit fix

# Use security headers (configured in Nginx)
# HSTS, X-Frame-Options, X-Content-Type-Options
```

### Server Hardening

```bash
# Disable root SSH login
sudo vim /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### SSL/TLS Configuration

```nginx
# Modern SSL configuration in Nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_stapling on;
ssl_stapling_verify on;
```

### Regular Security Audits

```bash
# Weekly audit script
sudo vim /usr/local/bin/security-audit.sh
```

```bash
#!/bin/bash

echo "=== Security Audit $(date) ==="

# Check for failed login attempts
echo "Failed SSH logins:"
grep "Failed password" /var/log/auth.log | tail -10

# Check for sudo usage
echo "Recent sudo commands:"
grep "sudo" /var/log/auth.log | tail -10

# Check open ports
echo "Open ports:"
ss -tulpn

# Check for security updates
echo "Available security updates:"
apt list --upgradable 2>/dev/null | grep -i security

# Check file permissions
echo "Checking critical file permissions:"
ls -la /home/megadir/mega-directory/.env.production

# Check PostgreSQL users
echo "PostgreSQL users:"
psql -U postgres -c "\du"

echo "=== Audit Complete ==="
```

---

## Appendix

### Quick Reference Commands

```bash
# Start all services
sudo systemctl start megadir-api megadir-web megadir-admin megadir-crawler

# Stop all services
sudo systemctl stop megadir-api megadir-web megadir-admin megadir-crawler

# Restart all services
sudo systemctl restart megadir-api megadir-web megadir-admin megadir-crawler

# View all logs
sudo journalctl -u megadir-* -f

# Check all service status
sudo systemctl status megadir-*

# Run database backup
/usr/local/bin/backup-megadir.sh

# Test API health
curl https://api.yourdomain.com/health

# Deploy latest code
/usr/local/bin/deploy-megadir.sh api main
```

### Environment Variable Reference

See complete list in the main [README.md](./README.md#environment-variables) and [docs/development/setup.md](./docs/development/setup.md).

### Port Reference

| Service | Default Port | Purpose |
|---------|--------------|---------|
| API | 3030 | Express API server |
| Web | 3000 | Astro SSR frontend |
| Admin | 4000 | Admin interface |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache (optional) |
| Prometheus | 9090 | Metrics collection |
| Node Exporter | 9100 | System metrics |

### Support and Resources

- **Documentation**: [docs/](./docs/)
- **Issues**: GitHub Issues
- **Deployment Guide**: [docs/deployment/railway.md](./docs/deployment/railway.md)
- **Monitoring Guide**: [docs/monitoring.md](./docs/monitoring.md)
- **Development Setup**: [docs/development/setup.md](./docs/development/setup.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-19
**Maintainer**: DevOps Team
