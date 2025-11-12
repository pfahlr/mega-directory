from __future__ import annotations

from dataclasses import dataclass, field
import logging
import os
import re
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup, Tag
from jinja2 import Environment, StrictUndefined, TemplateError

from llm import LLMClient, LLMRequest
from post_processing import ListingPostProcessor, PostProcessingContext

try:
    import requests_cache
except ModuleNotFoundError:  # pragma: no cover - shim is only needed locally
    from types import SimpleNamespace

    class _ShimCachedSession(requests.Session):
        """Minimal drop-in replacement when requests-cache is unavailable."""

        def __init__(self, *args, **kwargs):
            super().__init__()
            self._cache: Dict[Any, requests.Response] = {}

        def get(self, url: str, *args, **kwargs):
            key = (url, tuple(sorted(kwargs.items())))
            if key not in self._cache:
                self._cache[key] = super().get(url, *args, **kwargs)
            return self._cache[key]

    requests_cache = SimpleNamespace(CachedSession=_ShimCachedSession)  # type: ignore[assignment]


DEFAULT_CACHE_EXPIRE = 60 * 60 * 24 * 30  # 30 days
DEFAULT_TIMEOUT = 15
DEFAULT_SEARCH_TEMPLATE = (
    "{subdomain}/search?category={category}&location={location}&keyword={keyword}"
)
DEFAULT_SELECTORS = {
    "listing": "[data-listing], article",
    "title": ".listing-title, h2, h3, a",
    "link": "a",
    "description": ".listing-description, p",
}
MAX_SLUG_LENGTH = 80
_SLUG_INVALID_CHARS = re.compile(r"[^a-z0-9]+")
LOCATION_FIELDS = ("addressLine1", "addressLine2", "city", "region", "postalCode", "country")
_REGEX_FLAG_MAP = {
    "i": re.IGNORECASE,
    "m": re.MULTILINE,
    "s": re.DOTALL,
}


@dataclass
class Listing:
    title: str
    url: str
    snippet: str
    extras: Dict[str, Any] = field(default_factory=dict)
    fields: Dict[str, Any] = field(default_factory=dict)
    categories: List[str] = field(default_factory=list)
    category_slug: Optional[str] = None
    location: Optional[Dict[str, Any]] = None


@dataclass
class CrawlerBatch:
    category: str
    location: str
    subdomain: Optional[str]
    listings: List[Listing]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def as_payload(self) -> Dict[str, Any]:
        return {
            "category": self.category,
            "location": self.location,
            "subdomain": self.subdomain,
            "listings": [listing.__dict__ for listing in self.listings],
            "metadata": self.metadata,
        }


@dataclass
class APITarget:
    name: str
    endpoint: str
    token: str
    timeout: Optional[int] = None


class FieldGenerator:
    def __init__(self, llm_client: Optional[LLMClient] = None) -> None:
        self.llm_client = llm_client
        self._env = Environment(
            autoescape=False,
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def generate(self, listing: Listing, target: Dict[str, Any], batch: Dict[str, Any]) -> Dict[str, Any]:
        field_configs = target.get("fields") or {}
        if not field_configs:
            return {}

        context = self.build_context(listing, target, batch)
        generated: Dict[str, Any] = {}

        for field_name, config in field_configs.items():
            source = (config.get("source") or "scrape").lower()
            if source == "scrape":
                generated[field_name] = self._resolve_scrape_field(field_name, config, context)
            elif source == "ai":
                generated[field_name] = self._generate_ai_field(field_name, config, context, target)
            else:
                raise ValueError(f"Unsupported field source '{source}' for '{field_name}'")

        return generated

    def build_context(
        self,
        listing: Listing,
        target: Dict[str, Any],
        batch: Dict[str, Any],
    ) -> Dict[str, Any]:
        return self._build_context(listing, target, batch)

    def render_template(self, label: str, template: str, context: Dict[str, Any]) -> str:
        return self._render_template(label, template, context)

    def _build_context(
        self,
        listing: Listing,
        target: Dict[str, Any],
        batch: Dict[str, Any],
    ) -> Dict[str, Any]:
        listing_context: Dict[str, Any] = {
            "title": listing.title,
            "url": listing.url,
            "snippet": listing.snippet,
            "extras": dict(listing.extras),
            "categories": list(getattr(listing, "categories", []) or []),
            "category_slug": getattr(listing, "category_slug", None),
            "location": getattr(listing, "location", None),
        }
        for key, value in listing.extras.items():
            if key not in listing_context:
                listing_context[key] = value

        batch_context = dict(batch)
        base_context: Dict[str, Any] = {
            "listing": listing_context,
            "category": target.get("category"),
            "location": batch_context.get("location"),
            "keyword": batch_context.get("keyword"),
            "subdomain": target.get("subdomain"),
            "target": target,
            "batch": batch_context,
        }
        base_context["tokens"] = self._build_tokens(listing_context, base_context, batch_context)
        return base_context

    @staticmethod
    def _build_tokens(
        listing_context: Dict[str, Any],
        base_context: Dict[str, Any],
        batch_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        tokens: Dict[str, Any] = {
            "listing_title": listing_context.get("title", ""),
            "listing_url": listing_context.get("url", ""),
            "listing_snippet": listing_context.get("snippet", ""),
            "category": base_context.get("category") or "",
            "location": batch_context.get("location") or "",
            "keyword": batch_context.get("keyword") or "",
            "subdomain": base_context.get("subdomain") or "",
        }
        for key, value in listing_context.items():
            if isinstance(value, str):
                tokens[key] = value
        return tokens

    def _resolve_scrape_field(
        self,
        field_name: str,
        config: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Any:
        attribute = config.get("attribute") or field_name
        listing_data = context["listing"]
        value = self._lookup_value(listing_data, attribute)
        if value is not None:
            return value
        return self._lookup_value(context, attribute)

    def _generate_ai_field(
        self,
        field_name: str,
        config: Dict[str, Any],
        context: Dict[str, Any],
        target: Dict[str, Any],
    ) -> Any:
        if not self.llm_client:
            raise RuntimeError("LLM field generation requires an llm_client instance")

        provider = config.get("provider")
        model = config.get("model")
        prompt_template = config.get("prompt_template")
        if not provider or not model or not prompt_template:
            raise ValueError(
                f"AI field '{field_name}' requires provider, model, and prompt_template"
            )

        render_context = self._prepare_render_context(context, config)
        prompt = self._render_template(field_name, prompt_template, render_context)
        request = LLMRequest(
            provider=provider,
            model=model,
            prompt=prompt,
            field_name=field_name,
            options=config.get("options", {}),
            target=target,
            listing=context.get("listing"),
        )
        return self.llm_client(request)

    def _prepare_render_context(
        self,
        context: Dict[str, Any],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        render_context = dict(context)
        render_context["listing"] = context["listing"]
        render_context["batch"] = context["batch"]
        tokens = dict(context.get("tokens", {}))
        extra_tokens = config.get("tokens") or {}
        tokens.update(extra_tokens)
        render_context["tokens"] = tokens
        return render_context

    def _render_template(self, field_name: str, template: str, context: Dict[str, Any]) -> str:
        try:
            compiled = self._env.from_string(template)
            return compiled.render(**context)
        except TemplateError as exc:  # pragma: no cover - defensive path
            raise ValueError(f"Failed to render prompt for '{field_name}': {exc}") from exc

    @staticmethod
    def _lookup_value(source: Any, path: str) -> Any:
        if not isinstance(source, dict) or not path:
            return None
        current: Any = source
        for segment in path.split('.'):
            if isinstance(current, dict) and segment in current:
                current = current[segment]
                continue
            return None
        return current


class Crawler:
    def __init__(
        self,
        session: Optional[requests.Session] = None,
        cache_name: str = "crawler_cache",
        expire_after: int = DEFAULT_CACHE_EXPIRE,
        request_timeout: int = DEFAULT_TIMEOUT,
        llm_client: Optional[LLMClient] = None,
        logger: Optional[logging.Logger] = None,
    ) -> None:
        self.session = session or requests_cache.CachedSession(
            cache_name=cache_name,
            backend="sqlite",
            expire_after=expire_after,
        )
        self.request_timeout = request_timeout
        self.field_generator = FieldGenerator(llm_client=llm_client)
        self.post_processor = ListingPostProcessor(llm_client=llm_client)
        self.logger = logger or _build_default_logger()

    def run(self, config: Dict[str, Any]) -> List[CrawlerBatch]:
        api_targets = self._resolve_api_targets(config)
        target_count = len(config.get("targets") or [])
        self.logger.info("Starting crawler run for %s targets", target_count)
        batches: List[CrawlerBatch] = []
        for target in config.get("targets", []):
            for location_batch in self._iter_location_batches(target):
                listings = self.fetch_listings(target, location_batch)
                limit = target.get("listings_per_location")
                if isinstance(limit, int) and limit > 0:
                    listings = listings[:limit]
                self._assign_classifier_categories(listings, target, location_batch)
                if target.get("fields"):
                    self._populate_fields(listings, target, location_batch)
                meta = {
                    "search_url": location_batch["search_url"],
                    "keyword": location_batch.get("keyword"),
                }
                batches.append(
                    CrawlerBatch(
                        category=target.get("category", ""),
                        location=location_batch["location"],
                        subdomain=target.get("subdomain"),
                        listings=listings,
                        metadata=meta,
                    )
                )
                self._post_batch_to_api(
                    batches[-1],
                    target,
                    api_targets,
                    config,
                )
        self.logger.info("Crawler finished with %s batches", len(batches))
        return batches

    def fetch_listings(
        self,
        target: Dict[str, Any],
        location_batch: Dict[str, Any],
    ) -> List[Listing]:
        response = self.session.get(
            location_batch["search_url"],
            timeout=target.get("request_timeout", self.request_timeout),
        )
        response.raise_for_status()
        return self.parse_listings(
            response.text,
            target,
            location_batch["location"],
            keyword=location_batch.get("keyword"),
        )

    def parse_listings(
        self,
        html: str,
        target: Dict[str, Any],
        location: str,
        keyword: Optional[str] = None,
    ) -> List[Listing]:
        selectors = {**DEFAULT_SELECTORS, **target.get("selectors", {})}
        address_selectors = self._prepare_address_selectors(target.get("address_selectors"))
        address_patterns = self._prepare_address_patterns(target.get("address_patterns"))
        category_rules = self._prepare_category_rules(target.get("category_rules"))
        soup = BeautifulSoup(html, "html.parser")
        elements = soup.select(selectors["listing"])
        listings: List[Listing] = []

        for element in elements:
            title_node = element.select_one(selectors["title"])
            link_node = element.select_one(selectors["link"])
            desc_node = element.select_one(selectors["description"])

            title = title_node.get_text(strip=True) if title_node else ""
            url = link_node["href"].strip() if link_node and link_node.has_attr("href") else ""
            snippet = desc_node.get_text(strip=True) if desc_node else ""
            link_text = link_node.get_text(strip=True) if link_node else ""
            link_text = link_text or title

            if not title and not url:
                continue

            listing_text = self._gather_listing_text(element, title, snippet, link_text)

            normalized_url = self._normalize_url(url, target.get("subdomain"))
            listing = Listing(
                title=title,
                url=normalized_url,
                snippet=snippet,
                extras={
                    "location": location,
                    "keyword": keyword,
                    "link_text": link_text,
                },
            )
            listing.location = self._extract_location_from_element(
                element,
                address_selectors,
                address_patterns,
                listing_text,
            )
            categories = self._match_category_rules(element, category_rules, listing_text)
            if categories:
                listing.categories = categories
                listing.category_slug = categories[0]
            listings.append(listing)

        return listings

    @staticmethod
    def _gather_listing_text(element: Tag, *parts: Optional[str]) -> str:
        text_parts = [part for part in parts if isinstance(part, str) and part]
        element_text = element.get_text(" ", strip=True)
        if element_text:
            text_parts.append(element_text)
        return " ".join(text_parts).strip()

    def _prepare_address_selectors(self, config: Any) -> Dict[str, str]:
        selectors: Dict[str, str] = {}
        if isinstance(config, dict):
            for key, selector in config.items():
                if key not in LOCATION_FIELDS or not isinstance(selector, str):
                    continue
                trimmed = selector.strip()
                if trimmed:
                    selectors[key] = trimmed
        return selectors

    def _prepare_address_patterns(self, config: Any) -> List[re.Pattern[str]]:
        patterns: List[re.Pattern[str]] = []
        if isinstance(config, list):
            for entry in config:
                if not isinstance(entry, dict):
                    continue
                pattern_value = entry.get("pattern")
                if not isinstance(pattern_value, str) or not pattern_value.strip():
                    continue
                compiled = self._compile_regex(pattern_value, entry.get("flags"))
                if compiled:
                    patterns.append(compiled)
        return patterns

    def _prepare_category_rules(self, config: Any) -> List[Dict[str, Any]]:
        resolved: List[Dict[str, Any]] = []
        if not isinstance(config, list):
            return resolved
        for entry in config:
            if not isinstance(entry, dict):
                continue
            slug = self._slugify(entry.get("slug"))
            selector = entry.get("selector")
            text = entry.get("text")
            pattern_value = entry.get("pattern")
            if not slug:
                continue
            has_condition = any(
                isinstance(value, str) and value.strip()
                for value in (selector, text, pattern_value)
            )
            if not has_condition:
                continue
            compiled_pattern = None
            if isinstance(pattern_value, str) and pattern_value.strip():
                compiled_pattern = self._compile_regex(pattern_value, entry.get("flags"))
            trimmed_selector = selector.strip() if isinstance(selector, str) and selector.strip() else None
            lowered_text = text.lower().strip() if isinstance(text, str) and text.strip() else None
            if not any((trimmed_selector, lowered_text, compiled_pattern)):
                continue
            resolved.append(
                {
                    "slug": slug,
                    "selector": trimmed_selector,
                    "text": lowered_text,
                    "pattern": compiled_pattern,
                }
            )
        return resolved

    def _match_category_rules(
        self,
        element: Tag,
        rules: List[Dict[str, Any]],
        listing_text: str,
    ) -> List[str]:
        if not rules:
            return []
        matches: List[str] = []
        lowered_text = listing_text.lower()
        for rule in rules:
            selector = rule.get("selector")
            rule_text = rule.get("text")
            pattern = rule.get("pattern")
            if selector and not element.select_one(selector):
                continue
            if rule_text and rule_text not in lowered_text:
                continue
            if pattern and not pattern.search(listing_text):
                continue
            slug = rule["slug"]
            if slug not in matches:
                matches.append(slug)
        return matches

    def _extract_location_from_element(
        self,
        element: Tag,
        selectors: Dict[str, str],
        patterns: List[re.Pattern[str]],
        listing_text: str,
    ) -> Optional[Dict[str, str]]:
        if not selectors and not patterns:
            return None
        extracted: Dict[str, str] = {}
        for field, selector in selectors.items():
            node = element.select_one(selector)
            if not node:
                continue
            value = node.get_text(strip=True)
            if value:
                extracted[field] = value
        if listing_text and patterns:
            for pattern in patterns:
                match = pattern.search(listing_text)
                if not match:
                    continue
                captures = match.groupdict()
                for field in LOCATION_FIELDS:
                    candidate = captures.get(field)
                    if candidate and field not in extracted:
                        extracted[field] = candidate.strip()
        return self._normalize_location(extracted)

    def _compile_regex(self, pattern: str, flags_value: Any) -> Optional[re.Pattern[str]]:
        flags = 0
        if isinstance(flags_value, str):
            for char in flags_value:
                mapped = _REGEX_FLAG_MAP.get(char.lower())
                if mapped:
                    flags |= mapped
        try:
            return re.compile(pattern, flags)
        except re.error as exc:  # pragma: no cover - invalid configs should be fixed upstream
            self.logger.warning("Failed to compile pattern '%s': %s", pattern, exc)
            return None
    def _populate_fields(
        self,
        listings: List[Listing],
        target: Dict[str, Any],
        batch: Dict[str, Any],
    ) -> None:
        if not listings:
            return
        for listing in listings:
            listing.fields = self.field_generator.generate(listing, target, batch)

    def _assign_classifier_categories(
        self,
        listings: List[Listing],
        target: Dict[str, Any],
        batch: Dict[str, Any],
    ) -> None:
        classifier = target.get("category_classifier")
        if not classifier:
            return
        pending = [listing for listing in listings if not listing.category_slug]
        if not pending:
            return
        if not self.field_generator.llm_client:
            raise RuntimeError("Category classifier requires an llm_client instance")
        for listing in pending:
            slug = self._classify_listing_category(listing, target, batch, classifier)
            if slug:
                listing.category_slug = slug
                if slug not in listing.categories:
                    listing.categories.append(slug)

    def _classify_listing_category(
        self,
        listing: Listing,
        target: Dict[str, Any],
        batch: Dict[str, Any],
        classifier: Dict[str, Any],
    ) -> Optional[str]:
        provider = classifier.get("provider")
        model = classifier.get("model")
        prompt_template = classifier.get("prompt_template")
        if not provider or not model or not prompt_template:
            raise ValueError("category_classifier requires provider, model, and prompt_template")
        context = self.field_generator.build_context(listing, target, batch)
        tokens = dict(context.get("tokens", {}))
        raw_choices = classifier.get("choices") or []
        choices = [choice for choice in raw_choices if isinstance(choice, str) and choice.strip()]
        if choices:
            tokens["category_choices"] = ", ".join(choices)
        extra_tokens = classifier.get("tokens")
        if isinstance(extra_tokens, dict):
            tokens.update(extra_tokens)
        context["tokens"] = tokens
        prompt = self.field_generator.render_template(
            "category_classifier",
            prompt_template,
            context,
        )
        request = LLMRequest(
            provider=provider,
            model=model,
            prompt=prompt,
            field_name="category_classifier",
            options=classifier.get("options", {}),
            target=target,
            listing=context.get("listing"),
        )
        response = self.field_generator.llm_client(request)
        return self._resolve_classifier_slug(response, choices)

    def _resolve_classifier_slug(
        self,
        response: Any,
        choices: List[str],
    ) -> Optional[str]:
        normalized = self._normalize_string(response)
        if not normalized:
            return None
        first_line = normalized.splitlines()[0]
        cleaned = first_line.split("|")[0].split(",")[0].strip()
        lowered_full = normalized.lower()
        lowered_cleaned = cleaned.lower()
        normalized_choices: List[tuple[str, str]] = []
        for choice in choices:
            slug = self._slugify(choice)
            if slug:
                normalized_choices.append((choice.lower(), slug))
        for original_lower, slug in normalized_choices:
            if lowered_cleaned == slug or lowered_cleaned == original_lower:
                return slug
        for original_lower, slug in normalized_choices:
            if original_lower in lowered_cleaned or slug in lowered_cleaned or slug in lowered_full:
                return slug
        slug = self._slugify(cleaned)
        return slug or None

    def _iter_location_batches(
        self,
        target: Dict[str, Any],
    ) -> Iterable[Dict[str, Any]]:
        keywords = target.get("keywords") or [None]
        for location in target.get("locations", []):
            for keyword in keywords:
                yield {
                    "location": location,
                    "keyword": keyword,
                    "search_url": self.build_search_url(target, location, keyword),
                }

    def build_search_url(
        self,
        target: Dict[str, Any],
        location: str,
        keyword: Optional[str],
    ) -> str:
        template = target.get("search_url_template") or DEFAULT_SEARCH_TEMPLATE
        substitutions = {
            "subdomain": self._normalize_subdomain(target.get("subdomain")),
            "category": quote_plus(target.get("category", "")),
            "location": quote_plus(location),
            "keyword": quote_plus(keyword or ""),
        }
        url = template.format(**substitutions)
        if url.startswith("//"):
            url = f"https:{url}"
        if not url.startswith("http"):
            url = f"https://{url.lstrip('/')}"
        return url

    @staticmethod
    def _normalize_subdomain(value: Optional[str]) -> str:
        if not value:
            return ""
        if value.startswith("http://") or value.startswith("https://"):
            return value.rstrip("/")
        return f"https://{value.strip('/')}"

    @staticmethod
    def _normalize_url(
        href: str,
        subdomain: Optional[str],
    ) -> str:
        if not href:
            return ""
        if href.startswith("http://") or href.startswith("https://"):
            return href
        base = Crawler._normalize_subdomain(subdomain) or "https://"
        return urljoin(base + "/", href.lstrip("/"))

    def _resolve_api_targets(self, config: Dict[str, Any]) -> List[APITarget]:
        targets_config = config.get("api_targets")
        resolved: List[APITarget] = []

        if isinstance(targets_config, list) and targets_config:
            for entry in targets_config:
                if not isinstance(entry, dict):
                    raise ValueError("Each api_targets entry must be an object with endpoint and token")
                endpoint = entry.get("endpoint")
                token = entry.get("token") or entry.get("api_token") or entry.get("bearer_token")
                if not endpoint or not token:
                    raise ValueError("Each api_targets entry must include 'endpoint' and 'token'")
                timeout = self._coerce_positive_timeout(entry.get("timeout"))
                resolved.append(
                    APITarget(
                        name=str(entry.get("name") or endpoint),
                        endpoint=endpoint,
                        token=token,
                        timeout=timeout,
                    )
                )
        else:
            endpoint = config.get("api_endpoint")
            token = config.get("api_token")
            timeout = self._coerce_positive_timeout(config.get("api_request_timeout"))
            if endpoint and token:
                resolved.append(
                    APITarget(
                        name="default",
                        endpoint=endpoint,
                        token=token,
                        timeout=timeout,
                    )
                )

        if not resolved:
            raise ValueError(
                "Crawler config must define api_endpoint/api_token or an api_targets list to POST listings"
            )
        return resolved

    def _post_batch_to_api(
        self,
        batch: CrawlerBatch,
        target_config: Dict[str, Any],
        api_targets: List[APITarget],
        root_config: Dict[str, Any],
    ) -> None:
        if not batch.listings or not api_targets:
            return
        payloads = self._build_ingestion_payloads(batch, target_config, root_config)
        if not payloads:
            return
        for api_target in api_targets:
            timeout = self._resolve_api_timeout(api_target, target_config, root_config)
            self.logger.info(
                "Posting %s listings to %s",
                len(payloads),
                api_target.name,
                extra={
                    "batch_category": batch.category,
                    "batch_location": batch.location,
                    "api_endpoint": api_target.endpoint,
                },
            )
            response = self.session.post(
                api_target.endpoint,
                json={"listings": payloads},
                headers={
                    "Authorization": f"Bearer {api_target.token}",
                    "Content-Type": "application/json",
                },
                timeout=timeout,
            )
            response.raise_for_status()

    def _build_ingestion_payloads(
        self,
        batch: CrawlerBatch,
        target_config: Dict[str, Any],
        root_config: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        category_slug = self._resolve_category_slug(target_config)
        payloads: List[Dict[str, Any]] = []
        for listing in batch.listings:
            payload = self._build_listing_payload(
                listing,
                target_config,
                root_config,
                category_slug,
                batch,
            )
            if payload:
                payloads.append(payload)
        return payloads

    def _build_listing_payload(
        self,
        listing: Listing,
        target_config: Dict[str, Any],
        root_config: Dict[str, Any],
        default_category_slug: str,
        batch: CrawlerBatch,
    ) -> Optional[Dict[str, Any]]:
        payload: Dict[str, Any] = dict(listing.fields or {})
        title = self._normalize_string(payload.get("title")) or self._normalize_string(listing.title)
        if not title:
            return None
        payload["title"] = title

        source_url = self._normalize_string(payload.get("sourceUrl")) or self._normalize_string(listing.url)
        if source_url:
            payload["sourceUrl"] = source_url

        category_slug = payload.get("categorySlug") or listing.category_slug or default_category_slug
        normalized_category = self._slugify(category_slug)
        if not normalized_category:
            raise ValueError("Unable to determine category slug for API payload")
        payload["categorySlug"] = normalized_category
        listing.category_slug = normalized_category
        if isinstance(listing.categories, list) and normalized_category not in listing.categories:
            listing.categories.append(normalized_category)

        source_name = self._normalize_string(payload.get("sourceName")) or self._resolve_source_name(target_config)
        if source_name:
            payload["sourceName"] = source_name

        location_payload = payload.get("location")
        if not isinstance(location_payload, dict):
            location_payload = listing.location
        normalized_location = self._normalize_location(location_payload)
        if normalized_location:
            payload["location"] = normalized_location

        post_processing_config = self._resolve_post_processing_config(root_config, target_config)
        context = PostProcessingContext(
            title=listing.title,
            snippet=listing.snippet,
            summary=payload.get("summary"),
            description=payload.get("description"),
            category=target_config.get("category"),
            category_slug=payload.get("categorySlug"),
            location=self._resolve_location_label(listing, batch.location),
            keyword=self._normalize_string(listing.extras.get("keyword"))
            or self._normalize_string(batch.metadata.get("keyword")),
            source_name=payload.get("sourceName"),
            source_url=payload.get("sourceUrl") or listing.url,
            extras=self._build_post_processing_extras(listing, batch),
        )
        payload = self.post_processor.process(payload, context, config=post_processing_config)

        return {key: value for key, value in payload.items() if value is not None}

    def _resolve_category_slug(self, target_config: Dict[str, Any]) -> str:
        slug_source = (
            target_config.get("category_slug")
            or target_config.get("categorySlug")
            or target_config.get("category")
            or ""
        )
        slug = self._slugify(slug_source)
        if not slug:
            raise ValueError("Crawler target must define a category to derive categorySlug")
        return slug

    def _resolve_source_name(self, target_config: Dict[str, Any]) -> Optional[str]:
        for key in ("source_name", "sourceName", "subdomain", "category"):
            value = self._normalize_string(target_config.get(key))
            if value:
                return value
        return None

    def _resolve_post_processing_config(
        self,
        root_config: Dict[str, Any],
        target_config: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        root_map = self._coerce_mapping(root_config.get("post_processing"))
        target_map = self._coerce_mapping(target_config.get("post_processing"))
        if root_map and target_map:
            return self._merge_mappings(root_map, target_map)
        return target_map or root_map

    @classmethod
    def _merge_mappings(cls, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        merged = dict(base)
        for key, value in override.items():
            if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
                merged[key] = cls._merge_mappings(merged[key], value)
            else:
                merged[key] = value
        return merged

    @staticmethod
    def _coerce_mapping(value: Any) -> Optional[Dict[str, Any]]:
        if isinstance(value, dict):
            return dict(value)
        return None

    def _build_post_processing_extras(self, listing: Listing, batch: CrawlerBatch) -> Dict[str, Any]:
        extras: Dict[str, Any] = {}
        keyword = self._normalize_string(listing.extras.get("keyword"))
        batch_keyword = self._normalize_string(batch.metadata.get("keyword"))
        search_url = self._normalize_string(batch.metadata.get("search_url"))
        if keyword:
            extras["keyword"] = keyword
        elif batch_keyword:
            extras["keyword"] = batch_keyword
        if search_url:
            extras["search_url"] = search_url
        if batch.location:
            extras["batch_location"] = batch.location
        if listing.categories:
            extras["categories"] = ", ".join(listing.categories)
        return extras

    def _resolve_location_label(self, listing: Listing, fallback: Optional[str]) -> Optional[str]:
        location = getattr(listing, "location", None)
        if isinstance(location, dict):
            line1 = self._normalize_string(location.get("addressLine1"))
            line2 = self._normalize_string(location.get("addressLine2"))
            city = self._normalize_string(location.get("city"))
            region = self._normalize_string(location.get("region"))
            postal = self._normalize_string(location.get("postalCode"))
            country = self._normalize_string(location.get("country"))
            parts: List[str] = []
            if line1:
                parts.append(line1)
            if line2:
                parts.append(line2)
            city_region = ", ".join(part for part in (city, region) if part)
            if postal:
                city_region = f"{city_region} {postal}".strip() if city_region else postal
            if city_region:
                parts.append(city_region)
            if country:
                parts.append(country)
            if parts:
                return ", ".join(parts)
        extras_location = listing.extras.get("location")
        normalized_extras_location = self._normalize_string(extras_location)
        if normalized_extras_location:
            return normalized_extras_location
        if fallback and fallback.strip():
            return fallback.strip()
        return None

    def _resolve_api_timeout(
        self,
        api_target: APITarget,
        target_config: Dict[str, Any],
        root_config: Dict[str, Any],
    ) -> float:
        candidates = (
            api_target.timeout,
            target_config.get("api_request_timeout"),
            root_config.get("api_request_timeout"),
            target_config.get("request_timeout"),
            root_config.get("request_timeout"),
        )
        for candidate in candidates:
            coerced = self._coerce_positive_timeout(candidate)
            if coerced is not None:
                return coerced
        return self.request_timeout

    @staticmethod
    def _coerce_positive_timeout(value: Any) -> Optional[float]:
        if isinstance(value, (int, float)) and value > 0:
            return float(value)
        return None

    @staticmethod
    def _normalize_string(value: Any) -> Optional[str]:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return None

    @staticmethod
    def _normalize_location(value: Any) -> Optional[Dict[str, str]]:
        if not isinstance(value, dict):
            return None
        normalized: Dict[str, str] = {}
        for field in LOCATION_FIELDS:
            if field not in value:
                continue
            normalized_value = Crawler._normalize_string(value[field])
            if normalized_value:
                normalized[field] = normalized_value
        return normalized or None

    @staticmethod
    def _slugify(value: Any, max_length: int = MAX_SLUG_LENGTH) -> str:
        if not isinstance(value, str):
            return ""
        normalized = _SLUG_INVALID_CHARS.sub("-", value.lower())
        normalized = normalized.strip("-")
        if max_length and len(normalized) > max_length:
            normalized = normalized[:max_length].rstrip("-")
        return normalized


def run_crawler(
    config: Dict[str, Any],
    session: Optional[requests.Session] = None,
    llm_client: Optional[LLMClient] = None,
    logger: Optional[logging.Logger] = None,
) -> List[CrawlerBatch]:
    crawler = Crawler(session=session, llm_client=llm_client, logger=logger)
    return crawler.run(config)


def _resolve_log_level() -> int:
    configured = (
        os.getenv("CRAWLER_LOG_LEVEL")
        or os.getenv("LOG_LEVEL")
        or ("INFO" if os.getenv("NODE_ENV") == "production" else "DEBUG")
    ).upper()
    return getattr(logging, configured, logging.INFO)


def _build_default_logger() -> logging.Logger:
    logger = logging.getLogger("mega_directory.crawler")
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")
        )
        logger.addHandler(handler)
    logger.setLevel(_resolve_log_level())
    logger.propagate = False
    return logger
