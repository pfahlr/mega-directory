from __future__ import annotations

from dataclasses import dataclass, field
import re
from typing import Any, Dict, Optional

from jinja2 import Environment, StrictUndefined, TemplateError

from llm import LLMClient, LLMRequest


DEFAULT_SUMMARY_MAX_CHARS = 280
DEFAULT_DESCRIPTION_MAX_CHARS = 1200
_SEPARATOR_PATTERN = re.compile(r"\s*([|/•–—-])\s*")
_WHITESPACE_PATTERN = re.compile(r"\s+")


@dataclass
class PostProcessingContext:
    title: Optional[str] = None
    snippet: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    category_slug: Optional[str] = None
    location: Optional[str] = None
    keyword: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    extras: Dict[str, Any] = field(default_factory=dict)


class ListingPostProcessor:
    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        summary_max_chars: int = DEFAULT_SUMMARY_MAX_CHARS,
        description_max_chars: int = DEFAULT_DESCRIPTION_MAX_CHARS,
    ) -> None:
        self.llm_client = llm_client
        self.summary_max_chars = summary_max_chars
        self.description_max_chars = description_max_chars
        self._env = Environment(
            autoescape=False,
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def process(
        self,
        payload: Dict[str, Any],
        context: PostProcessingContext,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        normalized = dict(payload or {})
        config_map = dict(config or {}) if isinstance(config, dict) else {}
        normalize_titles = config_map.get("normalize_titles", True)
        summary_limit = self._coerce_positive_int(config_map.get("summary_max_chars")) or self.summary_max_chars
        description_limit = (
            self._coerce_positive_int(config_map.get("description_max_chars"))
            or self.description_max_chars
        )

        title_value = normalized.get("title") or context.title
        if isinstance(title_value, str):
            normalized["title"] = self._normalize_title(title_value) if normalize_titles else self._collapse_whitespace(title_value)

        summary_config = self._coerce_mapping(config_map.get("summary"))
        existing_summary = normalized.get("summary") or context.summary
        if summary_config and self._should_generate(existing_summary, summary_config):
            normalized["summary"] = self._generate_field(
                "summary",
                summary_config,
                normalized,
                context,
                summary_limit,
            )
        else:
            summary_value = existing_summary or context.snippet
            if isinstance(summary_value, str):
                normalized["summary"] = self._truncate(self._collapse_whitespace(summary_value), summary_limit)

        description_config = self._coerce_mapping(config_map.get("description"))
        existing_description = normalized.get("description") or context.description
        if description_config and self._should_generate(existing_description, description_config):
            normalized["description"] = self._generate_field(
                "description",
                description_config,
                normalized,
                context,
                description_limit,
            )
        elif isinstance(existing_description, str):
            normalized["description"] = self._truncate(
                self._collapse_whitespace(existing_description),
                description_limit,
            )

        return normalized

    def _generate_field(
        self,
        field_name: str,
        config: Dict[str, Any],
        payload: Dict[str, Any],
        context: PostProcessingContext,
        limit: Optional[int],
    ) -> str:
        if not self.llm_client:
            raise RuntimeError("Post-processing LLM generation requires an llm_client instance")

        prompt_template = config.get("prompt_template")
        provider = config.get("provider")
        model = config.get("model")
        if not (isinstance(prompt_template, str) and isinstance(provider, str) and isinstance(model, str)):
            raise ValueError(f"Invalid post-processing config for '{field_name}'")

        render_context = self._build_prompt_context(payload, context, config.get("tokens"))
        prompt = self._render_template(field_name, prompt_template, render_context)
        request = LLMRequest(
            provider=provider,
            model=model,
            prompt=prompt,
            field_name=field_name,
            options=self._coerce_mapping(config.get("options")) or {},
            target=config,
            listing={
                "title": payload.get("title") or context.title,
                "summary": payload.get("summary") or context.summary,
                "description": payload.get("description") or context.description,
                "snippet": context.snippet,
                "category": context.category,
                "location": context.location,
            },
        )
        response = self.llm_client(request)
        cleaned = self._collapse_whitespace(response)
        return self._truncate(cleaned, limit)

    def _build_prompt_context(
        self,
        payload: Dict[str, Any],
        context: PostProcessingContext,
        extra_tokens: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        resolved_title = payload.get("title") or context.title or ""
        resolved_summary = payload.get("summary") or context.summary or ""
        resolved_description = payload.get("description") or context.description or ""
        resolved_snippet = context.snippet or resolved_summary
        resolved_location = context.location or ""
        resolved_category = context.category or ""
        base_context: Dict[str, Any] = {
            "title": resolved_title,
            "summary": resolved_summary,
            "description": resolved_description,
            "snippet": resolved_snippet,
            "category": resolved_category,
            "category_slug": context.category_slug or "",
            "location": resolved_location,
            "keyword": context.keyword or "",
            "source_name": context.source_name or "",
            "source_url": context.source_url or "",
            "extras": dict(context.extras or {}),
        }
        tokens: Dict[str, Any] = {
            "title": resolved_title,
            "summary": resolved_summary,
            "description": resolved_description,
            "snippet": resolved_snippet,
            "category": resolved_category,
            "category_slug": context.category_slug or "",
            "location": resolved_location,
            "keyword": context.keyword or "",
            "source_name": context.source_name or "",
            "source_url": context.source_url or "",
        }
        extras = context.extras or {}
        for key, value in extras.items():
            if isinstance(value, str):
                tokens[key] = value
        if isinstance(extra_tokens, dict):
            for key, value in extra_tokens.items():
                if isinstance(value, str):
                    tokens[key] = value
        base_context["tokens"] = tokens
        return base_context

    def _render_template(self, field_name: str, template: str, context: Dict[str, Any]) -> str:
        try:
            compiled = self._env.from_string(template)
            return compiled.render(**context)
        except TemplateError as exc:  # pragma: no cover - defensive logging path
            raise ValueError(f"Failed to render prompt for '{field_name}': {exc}") from exc

    @staticmethod
    def _coerce_mapping(value: Any) -> Optional[Dict[str, Any]]:
        if isinstance(value, dict):
            return dict(value)
        return None

    @staticmethod
    def _coerce_positive_int(value: Any) -> Optional[int]:
        if isinstance(value, int) and value > 0:
            return value
        if isinstance(value, float) and value > 0:
            return int(value)
        return None

    @staticmethod
    def _should_generate(current_value: Any, config: Dict[str, Any]) -> bool:
        always = bool(config.get("always"))
        if always:
            return True
        return not isinstance(current_value, str) or not current_value.strip()

    @staticmethod
    def _truncate(value: str, limit: Optional[int]) -> str:
        if not limit or len(value) <= limit:
            return value
        return value[:limit].rstrip()

    @staticmethod
    def _collapse_whitespace(value: str) -> str:
        return _WHITESPACE_PATTERN.sub(" ", value).strip()

    @staticmethod
    def _normalize_title(value: str) -> str:
        collapsed = ListingPostProcessor._collapse_whitespace(value)
        normalized = _SEPARATOR_PATTERN.sub(lambda match: f" {match.group(1)} ", collapsed)
        return ListingPostProcessor._collapse_whitespace(normalized)


__all__ = ["ListingPostProcessor", "PostProcessingContext"]
