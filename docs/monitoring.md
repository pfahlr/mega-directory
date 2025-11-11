# Monitoring & Logging Guide

This document summarizes how to observe the Mega Directory platform across the API service and the external crawler agent.

## API Service

- **Structured logs:** The Express API now emits JSON logs to stdout. When running on Railway or Docker, those logs automatically stream to the platform log viewer. Adjust verbosity with the `LOG_LEVEL` environment variable (`info` is recommended in production, `debug` is useful locally).
- **Request tracing:** Every HTTP request is logged with its method, path, status code, and latency so you can correlate spikes or failures with specific routes.
- **Health endpoint:** `GET /health` returns uptime metadata (`status`, `startedAt`, `timestamp`, `uptime`, and `environment`). Attach any external monitor to this endpoint.
- **Railway hook:** Add a Railway Healthcheck that pings `/health` and configure alerts through Railway's dashboard. You can also tail logs with `railway logs --service api`.

### UptimeRobot example

1. Create a new *HTTP(s)* monitor and point it at `https://<your-api-domain>/health`.
2. Set the interval (e.g., 5 minutes) and choose contacts for alerts.
3. Optionally set keyword checking for `"status":"ok"` to ensure JSON parsing succeeds.

Because the endpoint responds quickly and does not hit the database yet, the monitor can be aggressive without load concerns.

## Crawler Agent

- The crawler uses Python's standard `logging` module. It defaults to `DEBUG` locally and `INFO` in production unless you override `CRAWLER_LOG_LEVEL`.
- Each ingestion batch logs the category, location, and API endpoint before it is POSTed so you can see progress in long-running jobs.
- When running on a long-lived box (e.g., Railway worker, EC2 instance, or a cron host), redirect stdout/stderr to your preferred log collector or use `tmux`/`systemd`'s journaling to retain the output.
- Run `CRAWLER_LOG_LEVEL=debug python main.py` while testing new selectors so you see each target/keyword combination as it executes.

## Quick checklist

- [ ] Configure `LOG_LEVEL=info` (API) and `CRAWLER_LOG_LEVEL=info` (crawler) in production.
- [ ] Add a Railway Healthcheck and an external UptimeRobot monitor targeting `/health`.
- [ ] Wire your alerting platform (Railway, UptimeRobot, PagerDuty) to the monitors so failures reach the on-call developer.
