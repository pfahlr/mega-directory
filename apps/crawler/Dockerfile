# syntax=docker/dockerfile:1

# Stage 1: Build with dependencies
FROM python:3.11-slim AS builder
WORKDIR /app

# Install dependencies in a virtual environment
COPY requirements-dev.txt ./
RUN python -m venv /opt/venv && \
  /opt/venv/bin/pip install --upgrade pip && \
  /opt/venv/bin/pip install --no-cache-dir -r requirements-dev.txt

# Stage 2: Runtime
FROM python:3.11-slim AS runner
WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY . .

# Create non-root user
RUN useradd -r -u 1000 -m -s /bin/bash appuser && \
  chown -R appuser:appuser /app

USER appuser

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Healthcheck: verify modules can import
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD python -c "import crawler; import requests; import bs4" || exit 1

CMD ["python", "main.py"]
