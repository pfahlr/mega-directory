from pathlib import Path
from types import SimpleNamespace
import sys

import pytest

AGENT_DIR = Path(__file__).resolve().parents[1]
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))

import crawler
from crawler import run_crawler


SAMPLE_HTML = """
<section>
  <article data-listing>
    <a class="listing-link" href="https://example.com/acme">
      <span class="listing-title">ACME Electric</span>
    </a>
    <p class="listing-description">Licensed and insured electricians.</p>
  </article>
  <article data-listing>
    <a class="listing-link" href="https://example.com/brightsparks">
      <span class="listing-title">Bright Sparks</span>
    </a>
    <p class="listing-description">24/7 emergency specialists.</p>
  </article>
</section>
"""


class DummyResponse:
    def __init__(self, text: str) -> None:
        self.text = text

    def raise_for_status(self) -> None:
        return None


class DummySession:
    def __init__(self, text: str) -> None:
        self.text = text
        self.calls = []
        self.post_calls = []

    def get(self, url: str, timeout: float = 10) -> DummyResponse:
        self.calls.append((url, timeout))
        return DummyResponse(self.text)

    def post(self, url: str, json=None, headers=None, timeout: float = 10) -> DummyResponse:  # type: ignore[no-untyped-def]
        self.post_calls.append(
            {
                "url": url,
                "json": json,
                "headers": dict(headers or {}),
                "timeout": timeout,
            }
        )
        return DummyResponse("")


def test_run_crawler_batches_locations_and_limits_results() -> None:
    config = {
        "api_endpoint": "https://api.example.com",
        "api_token": "token",
        "targets": [
            {
                "category": "Electricians",
                "subdomain": "electric.example.com",
                "locations": ["Holland MI", "Grand Rapids MI"],
                "keywords": ["licensed"],
                "listings_per_location": 1,
            }
        ],
    }
    dummy_session = DummySession(SAMPLE_HTML)

    batches = run_crawler(config, session=dummy_session)

    assert len(batches) == 2
    assert {batch.location for batch in batches} == {"Holland MI", "Grand Rapids MI"}
    assert all(batch.category == "Electricians" for batch in batches)
    assert all(len(batch.listings) == 1 for batch in batches)
    assert all("licensed" in call[0] for call in dummy_session.calls)


def test_parse_listings_honors_custom_selectors() -> None:
    html = """
    <ul>
      <li class="company">
        <h2>Firm A</h2>
        <a href="https://example.com/firm-a" data-role="landing">Visit</a>
        <div class="details">Great service.</div>
      </li>
      <li class="company">
        <h2>Firm B</h2>
        <a href="https://example.com/firm-b" data-role="landing">Visit</a>
        <div class="details">Family owned.</div>
      </li>
    </ul>
    """
    target = {
        "category": "Consultants",
        "locations": ["NYC"],
        "selectors": {
            "listing": ".company",
            "title": "h2",
            "link": "[data-role='landing']",
            "description": ".details",
        },
    }
    crawler_instance = crawler.Crawler(session=DummySession(html))

    parsed = crawler_instance.parse_listings(html, target, "NYC")

    assert len(parsed) == 2
    assert parsed[0].title == "Firm A"
    assert parsed[0].url == "https://example.com/firm-a"
    assert parsed[0].snippet == "Great service."


def test_run_crawler_uses_cached_session(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = {}

    class FakeCachedSession:
        def __init__(self, *args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs

        def get(self, *_args, **_kwargs):
            return DummyResponse(SAMPLE_HTML)

        def post(self, *_args, **_kwargs):  # type: ignore[no-untyped-def]
            return DummyResponse("")

    monkeypatch.setattr(
        crawler,
        "requests_cache",
        SimpleNamespace(CachedSession=FakeCachedSession),
    )

    config = {
        "api_endpoint": "https://api.example.com",
        "api_token": "token",
        "targets": [
            {
                "category": "Electricians",
                "subdomain": "electric.example.com",
                "locations": ["Holland MI"],
            }
        ],
    }

    batches = run_crawler(config)

    assert captured["kwargs"]["expire_after"] > 0
    assert len(batches) == 1


def test_run_crawler_populates_ai_fields_using_jinja_tokens() -> None:
    llm_requests = []

    def fake_llm_client(request):  # type: ignore[no-untyped-def]
        llm_requests.append(request)
        return f"LLM::{request.field_name}::{request.prompt}"

    config = {
        "api_endpoint": "https://api.example.com",
        "api_token": "token",
        "targets": [
            {
                "category": "Electricians",
                "subdomain": "electric.example.com",
                "locations": ["Holland MI"],
                "fields": {
                    "title": {"source": "scrape"},
                    "display_link": {"source": "scrape", "attribute": "link_text"},
                    "description": {
                        "source": "ai",
                        "provider": "openai",
                        "model": "gpt-4",
                        "prompt_template": "Describe {{ listing.link_text }} located in {{ location }} for {{ tokens.category }}.",
                    },
                },
            }
        ],
    }

    batches = run_crawler(config, session=DummySession(SAMPLE_HTML), llm_client=fake_llm_client)

    listing = batches[0].listings[0]
    assert listing.fields["title"] == "ACME Electric"
    assert listing.fields["display_link"] == "ACME Electric"
    assert listing.fields["description"].startswith("LLM::description::Describe ACME Electric located in Holland MI")
    assert llm_requests, "expected llm_client to run at least once"
    rendered_prompt = llm_requests[0].prompt
    assert "Electricians" in rendered_prompt


def test_run_crawler_errors_if_ai_field_without_llm_client() -> None:
    config = {
        "api_endpoint": "https://api.example.com",
        "api_token": "token",
        "targets": [
            {
                "category": "Electricians",
                "locations": ["Holland MI"],
                "fields": {
                    "description": {
                        "source": "ai",
                        "provider": "openai",
                        "model": "gpt-4",
                        "prompt_template": "Describe {{ listing.title }}",
                    }
                },
            }
        ],
    }

    with pytest.raises(RuntimeError):
        run_crawler(config, session=DummySession(SAMPLE_HTML))


def test_run_crawler_posts_batches_to_api_endpoint() -> None:
    config = {
        "api_endpoint": "https://api.example.com/v1/crawler/listings",
        "api_token": "crawler-token",
        "targets": [
            {
                "category": "Electricians",
                "locations": ["Holland MI"],
                "listings_per_location": 1,
            }
        ],
    }
    session = DummySession(SAMPLE_HTML)

    batches = run_crawler(config, session=session)

    assert len(batches) == 1
    assert len(session.post_calls) == 1
    payload = session.post_calls[0]["json"]
    assert payload["listings"][0]["title"] == "ACME Electric"
    assert payload["listings"][0]["categorySlug"] == "electricians"
    assert payload["listings"][0]["summary"] == "Licensed and insured electricians."
    assert payload["listings"][0]["sourceUrl"] == "https://example.com/acme"
    assert session.post_calls[0]["headers"]["Authorization"] == "Bearer crawler-token"


def test_run_crawler_can_post_to_dev_and_prod_targets() -> None:
    config = {
        "api_targets": [
            {
                "name": "dev",
                "endpoint": "https://dev.example.com/v1/crawler/listings",
                "token": "dev-token",
            },
            {
                "name": "prod",
                "endpoint": "https://prod.example.com/v1/crawler/listings",
                "token": "prod-token",
            },
        ],
        "targets": [
            {
                "category": "Photographers",
                "locations": ["Grand Rapids MI"],
                "listings_per_location": 1,
            }
        ],
    }
    session = DummySession(SAMPLE_HTML)

    run_crawler(config, session=session)

    assert len(session.post_calls) == 2
    assert {
        call["headers"]["Authorization"] for call in session.post_calls
    } == {"Bearer dev-token", "Bearer prod-token"}
    assert {
        call["url"] for call in session.post_calls
    } == {
        "https://dev.example.com/v1/crawler/listings",
        "https://prod.example.com/v1/crawler/listings",
    }
