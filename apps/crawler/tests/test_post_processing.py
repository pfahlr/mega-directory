from __future__ import annotations

from pathlib import Path
import sys

import pytest

AGENT_DIR = Path(__file__).resolve().parents[1]
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))

from post_processing import ListingPostProcessor, PostProcessingContext  # type: ignore[import-not-found]


def test_processor_normalizes_existing_fields_without_llm() -> None:
    processor = ListingPostProcessor()
    context = PostProcessingContext(
        title="  ACME   Electric  ",
        snippet="Licensed and insured electricians serving the lakeshore.",
        category="Electricians",
        location="Holland, MI",
    )
    payload = {
        "title": "  ACME   Electric  \n",
        "summary": " Trusted  residential   crews.  ",
    }

    processed = processor.process(payload, context, config={"normalize_titles": True, "summary_max_chars": 80})

    assert processed["title"] == "ACME Electric"
    assert processed["summary"] == "Trusted residential crews."


def test_processor_populates_summary_from_snippet_when_missing() -> None:
    processor = ListingPostProcessor()
    context = PostProcessingContext(
        title="Bright Sparks",
        snippet="Emergency electricians available 24/7 with EV charger installs.",
        category="Electricians",
        location="Grand Rapids, MI",
    )

    processed = processor.process({"title": "Bright Sparks"}, context, config={"summary_max_chars": 64})

    assert processed["summary"] == "Emergency electricians available 24/7 with EV charger installs."


def test_processor_invokes_llm_for_summary_and_description() -> None:
    requests = []

    def fake_llm(request):  # type: ignore[no-untyped-def]
        requests.append(request)
        return f"LLM::{request.field_name}::{request.prompt}"

    processor = ListingPostProcessor(llm_client=fake_llm)
    context = PostProcessingContext(
        title="Bright Sparks",
        snippet="Emergency electricians available 24/7",
        category="Electricians",
        location="Grand Rapids, MI",
    )
    config = {
        "summary": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "prompt_template": "Summarize {{ title }} for {{ location }} using {{ snippet }}.",
        },
        "description": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "prompt_template": "Write a detailed overview of {{ title }} in {{ location }}. Details: {{ snippet }}.",
        },
    }

    processed = processor.process({"title": "Bright Sparks"}, context, config=config)

    assert processed["summary"].startswith("LLM::summary::Summarize Bright Sparks")
    assert processed["description"].startswith("LLM::description::Write a detailed overview")
    assert len(requests) == 2
    assert all(req.provider == "openai" for req in requests)
    assert any("Grand Rapids" in req.prompt for req in requests)


def test_processor_requires_llm_when_configured() -> None:
    processor = ListingPostProcessor(llm_client=None)
    context = PostProcessingContext(title="Bright Sparks", snippet="Emergency service")
    config = {
        "summary": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "prompt_template": "Summarize {{ title }}.",
        }
    }

    with pytest.raises(RuntimeError):
        processor.process({"title": "Bright Sparks"}, context, config=config)
