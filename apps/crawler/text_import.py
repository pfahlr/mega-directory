"""Text, HTML, JSON, and CSV ingestion utilities for manual data imports."""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
import io
import json
import os
from pathlib import Path
import re
import sys
import textwrap
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

import requests
from bs4 import BeautifulSoup
from jinja2 import Environment, StrictUndefined, TemplateError

from llm import LLMClient, LLMRequest
from post_processing import ListingPostProcessor, PostProcessingContext
from import_result import ImportResult


DEFAULT_HTML_SELECTORS = {
    "listing": "[data-listing], article",
    "title": ".listing-title, h1, h2, h3, a",
    "link": "a",
    "summary": ".listing-description, p",
}
DEFAULT_TEXT_PROMPT = textwrap.dedent(
    """
    You are a data extraction assistant. Convert the provided text into JSON.
    - Return a JSON object with a top-level "listings" array.
    - Each listing must include at least: title, summary (or snippet), and sourceUrl when available.
    - Include categorySlug, contactEmail, websiteUrl, phone, and location fields when present.
    - Infer structured locations with addressLine1, city, region, postalCode, and country keys when possible.
    - Never return prose, markdown, or commentary — valid JSON only.

    TEXT TO PARSE:
    {{ raw_text }}
    """
).strip()
DEFAULT_INTERMEDIATE_PATH = "text-import-output.json"
DEFAULT_TEXT_PROVIDER = "openrouter"
LOCATION_FIELDS = (
    "addressLine1",
    "addressLine2",
    "city",
    "region",
    "postalCode",
    "country",
)
MAX_SLUG_LENGTH = 80
_SLUG_INVALID_CHARS = re.compile(r"[^a-z0-9]+")
_WHITESPACE_PATTERN = re.compile(r"\s+")
_PROVIDER_ENDPOINTS = {
    "openrouter": "https://openrouter.ai/api/v1/chat/completions",
    "openai": "https://api.openai.com/v1/chat/completions",
}


@dataclass
class ImportDefaults:
    category: Optional[str] = None
    category_slug: Optional[str] = None
    source_name: Optional[str] = None
    location_label: Optional[str] = None


class HTMLListingExtractor:
    def __init__(self, selectors: Optional[Mapping[str, str]] = None) -> None:
        self.selectors = dict(selectors or DEFAULT_HTML_SELECTORS)

    def extract(self, html: str) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html or "", "html.parser")
        listing_selector = self.selectors.get("listing") or DEFAULT_HTML_SELECTORS["listing"]
        listings: List[Dict[str, Any]] = []
        for node in soup.select(listing_selector):
            title = self._select_text(node, self.selectors.get("title"))
            if not title:
                continue
            summary = self._select_text(node, self.selectors.get("summary"))
            link = self._select_link(node, self.selectors.get("link"))
            payload: Dict[str, Any] = {"title": title}
            if summary:
                payload["summary"] = summary
            if link:
                payload["sourceUrl"] = link
            listings.append(payload)
        return listings

    @staticmethod
    def _select_text(node: Any, selector: Optional[str]) -> Optional[str]:
        if selector:
            selected = node.select_one(selector)
            if selected:
                return _collapse_whitespace(selected.get_text(separator=" ").strip())
        text = node.get_text(separator=" ").strip()
        return _collapse_whitespace(text) if text else None

    @staticmethod
    def _select_link(node: Any, selector: Optional[str]) -> Optional[str]:
        target = node.select_one(selector) if selector else node.find("a")
        if target and target.has_attr("href"):
            href = str(target["href"]).strip()
            return href or None
        return None


class TextLLMExtractor:
    def __init__(
        self,
        llm_client: LLMClient,
        provider: str,
        model: str,
        prompt_template: str = DEFAULT_TEXT_PROMPT,
    ) -> None:
        if not llm_client:
            raise ValueError("TextLLMExtractor requires an llm_client instance")
        if not provider:
            raise ValueError("TextLLMExtractor requires a provider identifier")
        if not model:
            raise ValueError("TextLLMExtractor requires a model identifier")
        self.llm_client = llm_client
        self.provider = provider
        self.model = model
        self.prompt_template = prompt_template
        self._env = Environment(
            autoescape=False,
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def extract(self, text: str) -> List[Dict[str, Any]]:
        normalized = text.strip()
        if not normalized:
            return []
        prompt = self._render_prompt(normalized)
        response = self.llm_client(
            LLMRequest(
                provider=self.provider,
                model=self.model,
                prompt=prompt,
                field_name="text_import",
                options={"temperature": 0.2},
            )
        )
        return self._parse_response(response)

    def _render_prompt(self, text: str) -> str:
        try:
            template = self._env.from_string(self.prompt_template)
            return template.render(raw_text=text)
        except TemplateError as exc:  # pragma: no cover - defensive
            raise ValueError(f"Failed to render LLM prompt: {exc}") from exc

    @staticmethod
    def _parse_response(raw: str) -> List[Dict[str, Any]]:
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError("LLM response was not valid JSON") from exc
        return _coerce_listing_array(parsed)


class JSONListingLoader:
    def load(self, raw: str | bytes) -> List[Dict[str, Any]]:
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        payload = raw.strip()
        if not payload:
            return []
        parsed = json.loads(payload)
        return _coerce_listing_array(parsed)


class CSVListingLoader:
    def load(self, raw: str | bytes) -> List[Dict[str, Any]]:
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        buffer = io.StringIO(raw)
        reader = csv.DictReader(buffer)
        listings: List[Dict[str, Any]] = []
        for row in reader:
            cleaned = {key: value for key, value in row.items() if value not in (None, "")}
            if cleaned:
                listings.append(cleaned)
        return listings


class ListingEnricher:
    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        post_processing_config: Optional[Mapping[str, Any]] = None,
    ) -> None:
        self.post_processor = ListingPostProcessor(llm_client=llm_client)
        self.post_processing_config = (
            dict(post_processing_config) if isinstance(post_processing_config, Mapping) else None
        )

    def enrich(
        self,
        listings: Sequence[Mapping[str, Any]],
        defaults: ImportDefaults,
        result: Optional[ImportResult] = None
    ) -> List[Dict[str, Any]]:
        enriched: List[Dict[str, Any]] = []
        for index, listing in enumerate(listings):
            line_number = index + 1
            try:
                payload = self._normalize_payload(listing, defaults, index)

                # Validate data quality if result tracker provided
                if result:
                    self._validate_listing_quality(payload, result, line_number)

                context = self._build_context(payload, listing, defaults)
                processed = self.post_processor.process(
                    payload,
                    context,
                    config=self.post_processing_config,
                )
                final = {key: value for key, value in processed.items() if value is not None}
                enriched.append(final)

                if result:
                    result.add_success(final, line_number)
            except Exception as exc:
                if result:
                    result.add_error(listing, exc, line_number)
                else:
                    raise
        return enriched

    def _validate_listing_quality(
        self,
        payload: Dict[str, Any],
        result: ImportResult,
        line_number: int
    ) -> None:
        """Validate listing data quality and add warnings."""
        # Check optional but recommended fields
        result.check_optional_field(payload, 'summary', line_number)
        result.check_optional_field(payload, 'description', line_number)
        result.check_optional_field(payload, 'websiteUrl', line_number)
        result.check_optional_field(payload, 'contactEmail', line_number)
        result.check_optional_field(payload, 'location', line_number)

        # Validate URLs
        result.validate_url(payload, 'websiteUrl', line_number)
        result.validate_url(payload, 'sourceUrl', line_number)

        # Validate emails
        result.validate_email(payload, 'contactEmail', line_number)

    def _normalize_payload(
        self,
        listing: Mapping[str, Any],
        defaults: ImportDefaults,
        index: int,
    ) -> Dict[str, Any]:
        normalized: Dict[str, Any] = {}
        title = _normalize_string(listing.get("title"))
        if not title:
            raise ValueError(f"Listing #{index + 1} is missing a title")
        normalized["title"] = title

        slug = _normalize_string(listing.get("slug")) or slugify(title)
        normalized["slug"] = slug

        summary = _normalize_string(listing.get("summary") or listing.get("snippet"))
        if summary:
            normalized["summary"] = summary
        description = _normalize_string(listing.get("description"))
        if description:
            normalized["description"] = description

        category_slug = (
            _normalize_string(listing.get("categorySlug"))
            or defaults.category_slug
            or slugify(defaults.category) if defaults.category else ""
        )
        if not category_slug:
            raise ValueError(
                f"Listing #{index + 1} is missing categorySlug (provide --category or --category-slug)"
            )
        normalized["categorySlug"] = category_slug

        website_url = _normalize_string(listing.get("websiteUrl"))
        if website_url:
            normalized["websiteUrl"] = website_url

        source_url = _normalize_string(listing.get("sourceUrl"))
        if source_url:
            normalized["sourceUrl"] = source_url

        contact_email = _normalize_string(listing.get("contactEmail"))
        if contact_email:
            normalized["contactEmail"] = contact_email

        source_name = _normalize_string(listing.get("sourceName")) or defaults.source_name
        if source_name:
            normalized["sourceName"] = source_name

        location = self._normalize_location(listing.get("location"))
        if location:
            normalized["location"] = location

        tagline = _normalize_string(listing.get("tagline"))
        if tagline:
            normalized["tagline"] = tagline

        notes = _normalize_string(listing.get("notes"))
        if notes:
            normalized["notes"] = notes

        return normalized

    def _build_context(
        self,
        payload: Mapping[str, Any],
        listing: Mapping[str, Any],
        defaults: ImportDefaults,
    ) -> PostProcessingContext:
        location_label = (
            _normalize_string(listing.get("locationLabel"))
            or defaults.location_label
            or _normalize_string(listing.get("location"))
        )
        extras = listing.get("extras")
        context_extras = extras if isinstance(extras, Mapping) else {}
        return PostProcessingContext(
            title=payload.get("title"),
            snippet=_normalize_string(listing.get("snippet")) or payload.get("summary"),
            summary=payload.get("summary"),
            description=payload.get("description"),
            category=defaults.category,
            category_slug=payload.get("categorySlug"),
            location=location_label,
            source_name=payload.get("sourceName"),
            source_url=payload.get("sourceUrl"),
            extras=dict(context_extras),
        )

    @staticmethod
    def _normalize_location(value: Any) -> Optional[Dict[str, str]]:
        if not isinstance(value, Mapping):
            return None
        normalized: Dict[str, str] = {}
        for field in LOCATION_FIELDS:
            if field not in value:
                continue
            field_value = _normalize_string(value[field])
            if field_value:
                normalized[field] = field_value
        return normalized or None


class ListingAPIIngestor:
    def __init__(
        self,
        endpoint: str,
        token: str,
        session: Optional[requests.Session] = None,
        timeout: Optional[float] = None,
    ) -> None:
        if not endpoint:
            raise ValueError("ListingAPIIngestor requires an API endpoint")
        if not token:
            raise ValueError("ListingAPIIngestor requires an API token")
        self.endpoint = endpoint
        self.token = token
        self.session = session or requests.Session()
        self.timeout = timeout or 30.0

    def ingest(self, listings: Sequence[Mapping[str, Any]]) -> Dict[str, Any]:
        payload = {"listings": [dict(listing) for listing in listings]}
        response = self.session.post(
            self.endpoint,
            json=payload,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        data = response.json()
        if isinstance(data, dict):
            return data
        return {"ingested": len(payload["listings"])}


def write_intermediate_json(listings: Sequence[Mapping[str, Any]], path: Path | str) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = {"listings": [dict(item) for item in listings]}
    target.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return target


def slugify(value: Optional[str], max_length: int = MAX_SLUG_LENGTH) -> str:
    if not value:
        return ""
    normalized = _SLUG_INVALID_CHARS.sub("-", value.lower())
    normalized = normalized.strip("-")
    if max_length and len(normalized) > max_length:
        normalized = normalized[:max_length].rstrip("-")
    return normalized


def _normalize_string(value: Any) -> Optional[str]:
    if isinstance(value, str):
        stripped = value.strip()
        return _collapse_whitespace(stripped) if stripped else None
    return None


def _collapse_whitespace(value: str) -> str:
    return _WHITESPACE_PATTERN.sub(" ", value).strip()


def _coerce_listing_array(payload: Any) -> List[Dict[str, Any]]:
    if isinstance(payload, Mapping) and isinstance(payload.get("listings"), list):
        return [dict(item) for item in payload["listings"] if isinstance(item, Mapping)]
    if isinstance(payload, list):
        return [dict(item) for item in payload if isinstance(item, Mapping)]
    raise ValueError("Expected listings payload to be a list or {\"listings\": []}")


class HTTPChatLLMClient:
    """Minimal HTTP chat completion client compatible with OpenAI/OpenRouter style APIs."""

    def __init__(
        self,
        api_key: str,
        default_provider: str,
        base_urls: Optional[Mapping[str, str]] = None,
        timeout: float = 30.0,
        system_prompt: Optional[str] = None,
    ) -> None:
        self.api_key = api_key
        self.default_provider = default_provider
        self.base_urls = dict(base_urls or {})
        self.timeout = timeout
        self.system_prompt = system_prompt

    def __call__(self, request: LLMRequest) -> str:
        provider = request.provider or self.default_provider
        endpoint = (
            self.base_urls.get(provider)
            or self.base_urls.get(self.default_provider)
            or _PROVIDER_ENDPOINTS.get(provider)
            or _PROVIDER_ENDPOINTS.get(self.default_provider)
        )
        if not endpoint:
            raise ValueError(f"Unsupported LLM provider '{provider}'")

        messages: List[Dict[str, str]] = []
        system_prompt = request.options.get("system_prompt") or self.system_prompt
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": request.prompt})

        payload: Dict[str, Any] = {
            "model": request.model,
            "messages": messages,
        }
        for key, value in request.options.items():
            if key != "system_prompt":
                payload[key] = value

        response = requests.post(
            endpoint,
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        data = response.json()
        content = _extract_chat_content(data)
        return content.strip()


def _extract_chat_content(response: Mapping[str, Any]) -> str:
    choices = response.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ValueError("LLM response did not include any choices")
    first = choices[0]
    message = first.get("message")
    if not isinstance(message, Mapping):
        raise ValueError("LLM response missing message payload")
    content = message.get("content")
    if not isinstance(content, str):
        raise ValueError("LLM response missing text content")
    return content


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert raw HTML/text into listing JSON or ingest reviewed CSV/JSON payloads."
    )
    parser.add_argument("--format", choices=["html", "text", "json", "csv"], required=True)
    parser.add_argument(
        "-i",
        "--input",
        help="Path to the input file. Omit to read from stdin.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=DEFAULT_INTERMEDIATE_PATH,
        help="Path to write the intermediate JSON payload (html/text modes).",
    )
    parser.add_argument("--category", help="Human-readable category label for slug defaults.")
    parser.add_argument("--category-slug", help="Explicit category slug to attach to listings.")
    parser.add_argument("--source-name", help="Source label stored with each listing.")
    parser.add_argument("--location-label", help="Default location label for enrichment context.")
    parser.add_argument("--api-endpoint", help="Crawler ingestion endpoint for json/csv modes.")
    parser.add_argument("--api-token", help="Bearer token paired with the ingestion endpoint.")
    parser.add_argument(
        "--api-timeout",
        type=float,
        default=30.0,
        help="API request timeout in seconds when ingesting reviewed data.",
    )
    parser.add_argument(
        "--post-processing-config",
        help="Path to a JSON file containing ListingPostProcessor options (summary prompts, etc.).",
    )
    parser.add_argument("--llm-provider", help="LLM provider identifier (text mode or enrichment).")
    parser.add_argument("--llm-model", help="Model name passed to the LLM client.")
    parser.add_argument("--llm-base-url", help="Override the chat completions endpoint.")
    parser.add_argument("--llm-api-key", help="API key used for the HTTP LLM client.")
    parser.add_argument("--llm-timeout", type=float, default=30.0, help="Timeout for LLM requests.")
    parser.add_argument(
        "--llm-system-prompt",
        help="Optional system prompt prepended to every LLM call.",
    )
    parser.add_argument(
        "--text-prompt-template",
        help="Custom Jinja2 template used to build the text extraction prompt.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and report on data without actually ingesting to API.",
    )
    parser.add_argument(
        "--report-output",
        help="Path to write detailed import report JSON (default: import-report.json).",
    )
    args = parser.parse_args(argv)

    if args.format in {"html", "text"} and not (args.category or args.category_slug):
        parser.error("--category or --category-slug is required for html/text imports.")
    if args.format in {"json", "csv"}:
        if not args.api_endpoint or not args.api_token:
            parser.error("--api-endpoint and --api-token are required for json/csv imports.")

    return args


def run_cli(args: argparse.Namespace) -> int:
    raw_input = _read_input(args.input)
    defaults = ImportDefaults(
        category=args.category,
        category_slug=args.category_slug,
        source_name=args.source_name,
        location_label=args.location_label,
    )
    llm_client = build_llm_client_from_args(args)
    post_processing_config = _load_json_file(args.post_processing_config) if args.post_processing_config else None

    if args.format == "html":
        extractor = HTMLListingExtractor()
        listings = extractor.extract(raw_input)
        _apply_basic_defaults(listings, defaults)
        target = write_intermediate_json(listings, args.output)
        print(f"Wrote {len(listings)} listings to {target}")  # noqa: T201
        return 0

    if args.format == "text":
        if not llm_client:
            raise RuntimeError("Text mode requires --llm-api-key or TEXT_IMPORT_LLM_API_KEY")
        provider = args.llm_provider or DEFAULT_TEXT_PROVIDER
        model = args.llm_model or os.getenv("TEXT_IMPORT_LLM_MODEL") or "gpt-4o-mini"
        template = args.text_prompt_template or os.getenv("TEXT_IMPORT_PROMPT_TEMPLATE") or DEFAULT_TEXT_PROMPT
        extractor = TextLLMExtractor(llm_client, provider=provider, model=model, prompt_template=template)
        listings = extractor.extract(raw_input)
        _apply_basic_defaults(listings, defaults)
        target = write_intermediate_json(listings, args.output)
        print(f"Wrote {len(listings)} listings to {target}")  # noqa: T201
        return 0

    # JSON/CSV ingestion with error tracking
    if args.format == "json":
        loader = JSONListingLoader()
        listings = loader.load(raw_input)
    else:
        loader = CSVListingLoader()
        listings = loader.load(raw_input)

    # Create import result tracker
    import_result = ImportResult()

    # Enrich listings with error tracking
    enricher = ListingEnricher(llm_client=llm_client, post_processing_config=post_processing_config)
    enriched = enricher.enrich(listings, defaults, result=import_result)

    # Save report if requested
    report_path = args.report_output or "import-report.json"
    import_result.save(report_path)
    print(f"Import report saved to {report_path}")  # noqa: T201

    # Print summary to console
    import_result.print_summary()

    # Ingest to API unless in dry-run mode
    if args.dry_run:
        print("DRY RUN: Skipping API ingestion")  # noqa: T201
        return 0 if not import_result.failed else 1

    if enriched:
        ingestor = ListingAPIIngestor(
            endpoint=args.api_endpoint,
            token=args.api_token,
            timeout=args.api_timeout,
        )
        result = ingestor.ingest(enriched)
        print(f"Ingested {result.get('ingestedCount') or len(enriched)} listings via API.")  # noqa: T201

    return 0 if not import_result.failed else 1


def build_llm_client_from_args(args: argparse.Namespace) -> Optional[LLMClient]:
    api_key = (
        args.llm_api_key
        or os.getenv("TEXT_IMPORT_LLM_API_KEY")
        or os.getenv("OPENROUTER_API_KEY")
        or os.getenv("OPENAI_API_KEY")
    )
    provider = args.llm_provider or os.getenv("TEXT_IMPORT_LLM_PROVIDER")
    base_url = args.llm_base_url or os.getenv("TEXT_IMPORT_LLM_BASE_URL")
    timeout = args.llm_timeout or float(os.getenv("TEXT_IMPORT_LLM_TIMEOUT", "30"))
    system_prompt = args.llm_system_prompt or os.getenv("TEXT_IMPORT_LLM_SYSTEM_PROMPT")

    if not api_key or not provider:
        return None

    base_urls = {provider: base_url} if base_url else None
    return HTTPChatLLMClient(
        api_key=api_key,
        default_provider=provider,
        base_urls=base_urls,
        timeout=timeout,
        system_prompt=system_prompt,
    )


def _apply_basic_defaults(listings: Iterable[Dict[str, Any]], defaults: ImportDefaults) -> None:
    slug = defaults.category_slug or (slugify(defaults.category) if defaults.category else None)
    for listing in listings:
        if slug and not _normalize_string(listing.get("categorySlug")):
            listing["categorySlug"] = slug
        if defaults.source_name and not _normalize_string(listing.get("sourceName")):
            listing["sourceName"] = defaults.source_name
        if defaults.location_label and not _normalize_string(listing.get("locationLabel")):
            listing["locationLabel"] = defaults.location_label


def _read_input(path: Optional[str]) -> str:
    if path:
        return Path(path).read_text(encoding="utf-8")
    return sys.stdin.read()


def _load_json_file(path: str) -> Dict[str, Any]:
    data = Path(path).read_text(encoding="utf-8")
    loaded = json.loads(data)
    if not isinstance(loaded, dict):
        raise ValueError("Post-processing config file must contain a JSON object")
    return loaded


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    try:
        return run_cli(args)
    except Exception as exc:  # pragma: no cover - CLI convenience
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())


__all__ = [
    "CSVListingLoader",
    "HTMLListingExtractor",
    "HTTPChatLLMClient",
    "ImportDefaults",
    "ImportResult",
    "JSONListingLoader",
    "ListingAPIIngestor",
    "ListingEnricher",
    "TextLLMExtractor",
    "build_llm_client_from_args",
    "main",
    "parse_args",
    "run_cli",
    "slugify",
    "write_intermediate_json",
]
