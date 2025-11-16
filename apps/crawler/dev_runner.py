#!/usr/bin/env python3

"""Developer-friendly crawler loop that replays sample HTML into the local API."""

from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path
import textwrap
import time
from typing import Any, Dict

import requests

from crawler import run_crawler


SAMPLE_DIRECTORY_HTML = textwrap.dedent(
    """
    <section data-category="electricians">
      <article data-listing>
        <a class="listing-title" href="https://example-electric.com">
          Example Electric Co.
        </a>
        <p class="listing-description">Licensed residential electricians serving West Michigan.</p>
      </article>
      <article data-listing>
        <a class="listing-title" href="https://brightsparks.example.com">
          Bright Sparks
        </a>
        <p class="listing-description">Emergency service crews on call 24/7.</p>
      </article>
      <article data-listing>
        <a class="listing-title" href="https://holland-solar.example.com">
          Holland Solar & Wiring
        </a>
        <p class="listing-description">Solar design, installation, and panel maintenance experts.</p>
      </article>
    </section>
    """
).strip()


class _InlineResponse:
    """Simple response shim so crawler parsing works without HTTP."""

    def __init__(self, html: str) -> None:
        self.text = html
        self.status_code = 200

    def raise_for_status(self) -> None:
        return None


class DevSession:
    """Session that serves sample HTML for GETs and real HTTP for POSTs."""

    def __init__(self, html: str) -> None:
        self._html = html
        self._http = requests.Session()

    def get(self, url: str, timeout: float | None = None) -> _InlineResponse:  # type: ignore[override]
        return _InlineResponse(self._html)

    def post(  # type: ignore[override]
        self,
        url: str,
        json: Any = None,
        headers: Dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> requests.Response:
        return self._http.post(url, json=json, headers=headers, timeout=timeout)

    def close(self) -> None:
        self._http.close()


def build_demo_config(endpoint: str, token: str) -> Dict[str, Any]:
    return {
        "api_endpoint": endpoint,
        "api_token": token,
        "targets": [
            {
                "category": "Electricians",
                "locations": ["Holland, MI", "Grand Rapids, MI"],
                "keywords": ["residential", "commercial"],
                "subdomain": "demo.megadirectory.local",
                "listings_per_location": 3,
            }
        ],
    }


def load_fixture(path: str | None) -> str:
    if not path:
        return SAMPLE_DIRECTORY_HTML
    fixture_path = Path(path)
    if not fixture_path.is_file():
        raise FileNotFoundError(f"Fixture file '{path}' not found")
    return fixture_path.read_text(encoding="utf-8")


def configure_logger() -> logging.Logger:
    logger = logging.getLogger("mega_directory.dev_crawler")
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Replay sample directory HTML into the local API so the dev stack has data."
    )
    parser.add_argument(
        "--api-endpoint",
        default=os.getenv("CRAWLER_API_ENDPOINT")
        or os.getenv("CRAWLER_DEV_API_ENDPOINT")
        or "http://localhost:3030/v1/crawler/listings",
        help="Crawler ingestion endpoint (defaults to http://localhost:3030/v1/crawler/listings).",
    )
    parser.add_argument(
        "--api-token",
        default=os.getenv("CRAWLER_API_TOKEN")
        or os.getenv("CRAWLER_BEARER_TOKEN")
        or "crawler-dev-token",
        help="Bearer token used for crawler POST requests.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=float(os.getenv("CRAWLER_DEV_INTERVAL", "45")),
        help="Seconds to wait between demo runs (default: 45).",
    )
    parser.add_argument(
        "--fixture",
        help="Optional path to HTML that should be used instead of the built-in sample.",
    )
    parser.add_argument(
        "--run-once",
        action="store_true",
        help="Execute a single crawler run instead of looping forever.",
    )
    args = parser.parse_args()

    if not args.api_token:
        parser.error("An API token is required (set CRAWLER_API_TOKEN or CRAWLER_BEARER_TOKEN).")
    if args.interval <= 0:
        parser.error("--interval must be greater than zero seconds.")

    return args


def main() -> None:
    args = parse_args()
    logger = configure_logger()
    fixture_html = load_fixture(args.fixture)
    config = build_demo_config(args.api_endpoint, args.api_token)

    iteration = 1
    while True:
        try:
            logger.info("Starting dev crawler run #%s", iteration)
            session = DevSession(fixture_html)
            try:
                run_crawler(config, session=session, logger=logger)
            finally:
                session.close()
            logger.info("Finished dev crawler run #%s", iteration)
        except KeyboardInterrupt:
            logger.info("Interrupted, exiting crawler loop.")
            break
        except Exception as exc:  # pragma: no cover - defensive logging path
            logger.exception("Crawler run #%s failed: %s", iteration, exc)

        if args.run_once:
            break

        iteration += 1
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
