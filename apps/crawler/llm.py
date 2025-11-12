"""Shared LLM helper types for crawler-adjacent tools."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional


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


__all__ = ["LLMRequest", "LLMClient"]
