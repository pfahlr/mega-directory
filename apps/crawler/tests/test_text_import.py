from __future__ import annotations

from pathlib import Path
import json
import sys

AGENT_DIR = Path(__file__).resolve().parents[1]
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))

from text_import import (  # type: ignore[import-not-found]
    HTMLListingExtractor,
    TextLLMExtractor,
    JSONListingLoader,
    CSVListingLoader,
    ImportDefaults,
    ListingEnricher,
    ListingAPIIngestor,
    write_intermediate_json,
)


def test_html_extractor_parses_title_and_summary() -> None:
    html = """
    <section>
      <article data-listing>
        <a class="listing-title" href="https://example.com">Example Electric</a>
        <p class="listing-description">Licensed electricians.</p>
      </article>
      <article data-listing>
        <a class="listing-title" href="https://another.example.com">Bright Sparks</a>
        <p class="listing-description">Emergency crews.</p>
      </article>
    </section>
    """.strip()

    listings = HTMLListingExtractor().extract(html)

    assert len(listings) == 2
    assert listings[0]["title"] == "Example Electric"
    assert listings[0]["sourceUrl"] == "https://example.com"
    assert listings[0]["summary"] == "Licensed electricians."


def test_text_extractor_uses_llm_output() -> None:
    prompts: list[str] = []

    def fake_llm(request):  # type: ignore[no-untyped-def]
        prompts.append(request.prompt)
        return json.dumps(
            {
                "listings": [
                    {
                        "title": "Bright Sparks",
                        "summary": "Emergency crews",
                        "categorySlug": "electricians",
                    }
                ]
            }
        )

    extractor = TextLLMExtractor(fake_llm, provider="openrouter", model="gpt-4o-mini")

    listings = extractor.extract("Bright Sparks emergency electricians")

    assert prompts, "expected llm client to be invoked"
    assert listings[0]["title"] == "Bright Sparks"
    assert listings[0]["categorySlug"] == "electricians"


def test_json_loader_accepts_wrapped_payload() -> None:
    payload = json.dumps({"listings": [{"title": "Example", "categorySlug": "electricians"}]})

    listings = JSONListingLoader().load(payload)

    assert listings == [{"title": "Example", "categorySlug": "electricians"}]


def test_csv_loader_returns_row_dicts() -> None:
    csv_data = "title,categorySlug,sourceUrl\nExample Electric,electricians,https://example.com\n"

    listings = CSVListingLoader().load(csv_data)

    assert listings == [
        {
            "title": "Example Electric",
            "categorySlug": "electricians",
            "sourceUrl": "https://example.com",
        }
    ]


def test_enricher_applies_defaults_and_slugifies() -> None:
    defaults = ImportDefaults(
        category="Electricians",
        category_slug="electricians",
        source_name="Manual Import",
        location_label="Grand Rapids, MI",
    )
    enricher = ListingEnricher()
    listings = [{"title": "  Bright Sparks  ", "summary": "Emergency crews"}]

    enriched = enricher.enrich(listings, defaults)

    assert enriched[0]["categorySlug"] == "electricians"
    assert enriched[0]["slug"] == "bright-sparks"
    assert enriched[0]["sourceName"] == "Manual Import"


def test_api_ingestor_posts_batch_with_bearer_token(tmp_path: Path) -> None:
    class FakeResponse:
        def __init__(self) -> None:
            self.status_code = 202

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"ingestedCount": 1}

    class FakeSession:
        def __init__(self) -> None:
            self.calls: list[dict[str, object]] = []

        def post(self, url, json=None, headers=None, timeout=None):  # type: ignore[no-untyped-def]
            self.calls.append({"url": url, "json": json, "headers": headers, "timeout": timeout})
            return FakeResponse()

    session = FakeSession()
    ingestor = ListingAPIIngestor(
        endpoint="https://api.example.com/v1/crawler/listings",
        token="secret-token",
        session=session,  # type: ignore[arg-type]
        timeout=10,
    )

    response = ingestor.ingest(
        [{"title": "Example", "categorySlug": "electricians", "slug": "example"}]
    )

    assert response == {"ingestedCount": 1}
    assert session.calls[0]["headers"] == {
        "Authorization": "Bearer secret-token",
        "Content-Type": "application/json",
    }
    assert session.calls[0]["json"] == {
        "listings": [{"title": "Example", "categorySlug": "electricians", "slug": "example"}]
    }


def test_write_intermediate_json_persists_payload(tmp_path: Path) -> None:
    target = tmp_path / "listings.json"
    listings = [{"title": "Example", "categorySlug": "electricians"}]

    write_intermediate_json(listings, target)

    saved = json.loads(target.read_text(encoding="utf-8"))
    assert saved["listings"][0]["title"] == "Example"
