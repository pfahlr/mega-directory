from __future__ import annotations

import json
from pathlib import Path

import jsonschema
import pytest


AGENT_DIR = Path(__file__).resolve().parents[1]
SCHEMA_PATH = AGENT_DIR / "config" / "targets.schema.json"
EXAMPLE_PATH = AGENT_DIR / "targets.example.json"


@pytest.fixture(scope="module")
def schema() -> dict:
    """Load the crawler configuration schema once per test module."""
    with SCHEMA_PATH.open("r", encoding="utf-8") as fp:
        return json.load(fp)


def _collect_errors(schema: dict, instance: dict) -> list[jsonschema.ValidationError]:
    validator = jsonschema.Draft202012Validator(schema)
    return sorted(validator.iter_errors(instance), key=lambda err: list(err.path))


def test_example_config_matches_schema(schema: dict) -> None:
    with EXAMPLE_PATH.open("r", encoding="utf-8") as fp:
        config = json.load(fp)

    errors = _collect_errors(schema, config)

    assert not errors, f"example config failed schema validation: {[e.message for e in errors]}"


def test_schema_rejects_targets_missing_required_fields(schema: dict) -> None:
    invalid_config = {
        "api_targets": [
            {
                "name": "dev",
                "endpoint": "https://dev.example.com/v1/crawler/listings",
                "token": "token",
            }
        ],
        "targets": [
            {
                # Missing category and locations entries to trigger schema errors
                "fields": {
                    "description": {
                        "source": "ai",
                        "model": "gpt-4",
                        "prompt_template": "Describe {{ listing.title }}",
                    }
                },
            }
        ],
    }

    errors = _collect_errors(schema, invalid_config)

    messages = "\n".join(error.message for error in errors)
    assert errors, "expected schema to flag invalid target configuration"
    assert "'category'" in messages
    assert "'locations'" in messages or "minItems" in messages
    assert "'provider'" in messages


def test_schema_rejects_category_rules_missing_slug(schema: dict) -> None:
    invalid_config = {
        "api_endpoint": "https://api.example.com/v1/crawler/listings",
        "api_token": "token",
        "targets": [
            {
                "category": "Services",
                "locations": ["NYC"],
                "category_rules": [
                    {
                        # Missing slug on purpose to trigger schema validation failure.
                        "pattern": r"\bhvac",
                        "flags": "i",
                    }
                ],
            }
        ],
    }

    errors = _collect_errors(schema, invalid_config)

    assert errors, "expected schema to enforce slug requirement"
    messages = "\n".join(error.message for error in errors)
    assert "slug" in messages


def test_schema_accepts_post_processing_config(schema: dict) -> None:
    config = {
        "api_endpoint": "https://api.example.com/v1/crawler/listings",
        "api_token": "token",
        "post_processing": {
            "summary": {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "prompt_template": "Summarize {{ title }} for {{ location }}.",
            }
        },
        "targets": [
            {
                "category": "Electricians",
                "locations": ["Grand Rapids, MI"],
                "post_processing": {
                    "description": {
                        "provider": "openai",
                        "model": "gpt-4o-mini",
                        "prompt_template": "Describe {{ title }} in {{ location }}",
                    },
                },
            }
        ],
    }

    errors = _collect_errors(schema, config)

    assert not errors, f"post_processing config failed schema validation: {[e.message for e in errors]}"


def test_schema_rejects_invalid_post_processing_llm(schema: dict) -> None:
    invalid_config = {
        "api_endpoint": "https://api.example.com/v1/crawler/listings",
        "api_token": "token",
        "targets": [
            {
                "category": "Electricians",
                "locations": ["Grand Rapids, MI"],
                "post_processing": {
                    "summary": {
                        # Missing provider + model to trigger validation failure
                        "prompt_template": "Summarize {{ title }}",
                    }
                },
            }
        ],
    }

    errors = _collect_errors(schema, invalid_config)

    assert errors, "expected schema to reject incomplete post_processing"
    messages = "\n".join(error.message for error in errors)
    assert "provider" in messages or "model" in messages
