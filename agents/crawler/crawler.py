from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Iterable, List, Optional
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup
from jinja2 import Environment, StrictUndefined, TemplateError

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


@dataclass
class Listing:
    title: str
    url: str
    snippet: str
    extras: Dict[str, Any] = field(default_factory=dict)
    fields: Dict[str, Any] = field(default_factory=dict)


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
class LLMRequest:
    provider: str
    model: str
    prompt: str
    field_name: str
    options: Dict[str, Any] = field(default_factory=dict)
    target: Optional[Dict[str, Any]] = None
    listing: Optional[Dict[str, Any]] = None


LLMClient = Callable[[LLMRequest], str]


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

        context = self._build_context(listing, target, batch)
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
    ) -> None:
        self.session = session or requests_cache.CachedSession(
            cache_name=cache_name,
            backend="sqlite",
            expire_after=expire_after,
        )
        self.request_timeout = request_timeout
        self.field_generator = FieldGenerator(llm_client=llm_client)

    def run(self, config: Dict[str, Any]) -> List[CrawlerBatch]:
        batches: List[CrawlerBatch] = []
        for target in config.get("targets", []):
            for location_batch in self._iter_location_batches(target):
                listings = self.fetch_listings(target, location_batch)
                limit = target.get("listings_per_location")
                if isinstance(limit, int) and limit > 0:
                    listings = listings[:limit]
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

            normalized_url = self._normalize_url(url, target.get("subdomain"))
            listings.append(
                Listing(
                    title=title,
                    url=normalized_url,
                    snippet=snippet,
                    extras={
                        "location": location,
                        "keyword": keyword,
                        "link_text": link_text,
                    },
                )
            )

        return listings

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


def run_crawler(
    config: Dict[str, Any],
    session: Optional[requests.Session] = None,
    llm_client: Optional[LLMClient] = None,
) -> List[CrawlerBatch]:
    crawler = Crawler(session=session, llm_client=llm_client)
    return crawler.run(config)
