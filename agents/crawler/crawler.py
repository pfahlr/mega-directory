from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup

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


class Crawler:
    def __init__(
        self,
        session: Optional[requests.Session] = None,
        cache_name: str = "crawler_cache",
        expire_after: int = DEFAULT_CACHE_EXPIRE,
        request_timeout: int = DEFAULT_TIMEOUT,
    ) -> None:
        self.session = session or requests_cache.CachedSession(
            cache_name=cache_name,
            backend="sqlite",
            expire_after=expire_after,
        )
        self.request_timeout = request_timeout

    def run(self, config: Dict[str, Any]) -> List[CrawlerBatch]:
        batches: List[CrawlerBatch] = []
        for target in config.get("targets", []):
            for location_batch in self._iter_location_batches(target):
                listings = self.fetch_listings(target, location_batch)
                limit = target.get("listings_per_location")
                if isinstance(limit, int) and limit > 0:
                    listings = listings[:limit]
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

            if not title and not url:
                continue

            normalized_url = self._normalize_url(url, target.get("subdomain"))
            listings.append(
                Listing(
                    title=title,
                    url=normalized_url,
                    snippet=snippet,
                    extras={"location": location, "keyword": keyword},
                )
            )

        return listings

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


def run_crawler(config: Dict[str, Any], session: Optional[requests.Session] = None) -> List[CrawlerBatch]:
    crawler = Crawler(session=session)
    return crawler.run(config)
