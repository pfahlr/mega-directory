"""Import result tracking for text_import.py with detailed error reporting."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class ImportResult:
    """Track import success, failures, and warnings with detailed reporting."""

    successful: List[Dict[str, Any]] = field(default_factory=list)
    failed: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[Dict[str, Any]] = field(default_factory=list)
    start_time: datetime = field(default_factory=datetime.now)

    def add_success(self, listing: Dict[str, Any], line_number: Optional[int] = None) -> None:
        """Record a successful import."""
        self.successful.append({
            'listing': listing,
            'line': line_number,
            'timestamp': datetime.now().isoformat()
        })

    def add_error(
        self,
        listing: Dict[str, Any],
        error: str | Exception,
        line_number: Optional[int] = None,
        context: Optional[str] = None
    ) -> None:
        """Record a failed import with detailed error information."""
        self.failed.append({
            'listing': listing,
            'error': str(error),
            'line': line_number,
            'context': context,
            'timestamp': datetime.now().isoformat()
        })

    def add_warning(
        self,
        listing: Dict[str, Any],
        warning: str,
        line_number: Optional[int] = None,
        field: Optional[str] = None
    ) -> None:
        """Record a data quality warning."""
        title = listing.get('title', 'Unknown')
        self.warnings.append({
            'listing_title': title,
            'warning': warning,
            'field': field,
            'line': line_number,
            'timestamp': datetime.now().isoformat()
        })

    @property
    def total(self) -> int:
        """Total number of listings processed."""
        return len(self.successful) + len(self.failed)

    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.total == 0:
            return 0.0
        return (len(self.successful) / self.total) * 100

    @property
    def duration(self) -> float:
        """Duration of import in seconds."""
        return (datetime.now() - self.start_time).total_seconds()

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary format."""
        return {
            'summary': {
                'total': self.total,
                'successful': len(self.successful),
                'failed': len(self.failed),
                'warnings': len(self.warnings),
                'success_rate': round(self.success_rate, 2),
                'duration_seconds': round(self.duration, 2),
                'start_time': self.start_time.isoformat(),
                'end_time': datetime.now().isoformat()
            },
            'successful_listings': [
                {
                    'title': item['listing'].get('title', 'Unknown'),
                    'slug': item['listing'].get('slug', 'unknown'),
                    'line': item['line']
                }
                for item in self.successful
            ],
            'failed_listings': self.failed,
            'warnings': self.warnings
        }

    def to_json(self, indent: int = 2) -> str:
        """Convert result to JSON string."""
        return json.dumps(self.to_dict(), indent=indent)

    def save(self, path: Path | str) -> Path:
        """Save import result to JSON file."""
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.to_json(), encoding='utf-8')
        return target

    def print_summary(self) -> None:
        """Print a human-readable summary to stdout."""
        print("\n" + "=" * 60)
        print("IMPORT SUMMARY")
        print("=" * 60)
        print(f"Total processed:    {self.total}")
        print(f"Successful:         {len(self.successful)} ({self.success_rate:.1f}%)")
        print(f"Failed:             {len(self.failed)}")
        print(f"Warnings:           {len(self.warnings)}")
        print(f"Duration:           {self.duration:.2f}s")
        print("=" * 60)

        if self.failed:
            print("\nFAILED LISTINGS:")
            for i, failure in enumerate(self.failed, 1):
                listing = failure.get('listing', {})
                title = listing.get('title', 'Unknown')
                error = failure.get('error', 'Unknown error')
                line = failure.get('line')
                line_info = f" (line {line})" if line else ""
                print(f"  {i}. {title}{line_info}")
                print(f"     Error: {error}")

        if self.warnings:
            print("\nWARNINGS:")
            for i, warn in enumerate(self.warnings, 1):
                title = warn.get('listing_title', 'Unknown')
                warning = warn.get('warning', 'Unknown warning')
                field = warn.get('field')
                line = warn.get('line')
                line_info = f" (line {line})" if line else ""
                field_info = f" [{field}]" if field else ""
                print(f"  {i}. {title}{line_info}{field_info}")
                print(f"     {warning}")

        print()

    def check_required_field(
        self,
        listing: Dict[str, Any],
        field: str,
        line_number: Optional[int] = None
    ) -> bool:
        """Check if a required field exists and add error if missing."""
        value = listing.get(field)
        if not value or (isinstance(value, str) and not value.strip()):
            self.add_error(
                listing,
                f"Missing required field: {field}",
                line_number=line_number,
                context=f"field:{field}"
            )
            return False
        return True

    def check_optional_field(
        self,
        listing: Dict[str, Any],
        field: str,
        line_number: Optional[int] = None
    ) -> bool:
        """Check if an optional field exists and add warning if missing."""
        value = listing.get(field)
        if not value or (isinstance(value, str) and not value.strip()):
            self.add_warning(
                listing,
                f"Missing recommended field: {field}",
                line_number=line_number,
                field=field
            )
            return False
        return True

    def validate_url(
        self,
        listing: Dict[str, Any],
        field: str,
        line_number: Optional[int] = None
    ) -> bool:
        """Validate URL format and add warning if invalid."""
        url = listing.get(field)
        if url and isinstance(url, str):
            url_lower = url.lower()
            if not (url_lower.startswith('http://') or url_lower.startswith('https://')):
                self.add_warning(
                    listing,
                    f"URL may be invalid (missing http:// or https://): {url}",
                    line_number=line_number,
                    field=field
                )
                return False
        return True

    def validate_email(
        self,
        listing: Dict[str, Any],
        field: str,
        line_number: Optional[int] = None
    ) -> bool:
        """Validate email format and add warning if invalid."""
        email = listing.get(field)
        if email and isinstance(email, str):
            if '@' not in email or '.' not in email.split('@')[-1]:
                self.add_warning(
                    listing,
                    f"Email may be invalid: {email}",
                    line_number=line_number,
                    field=field
                )
                return False
        return True


__all__ = ['ImportResult']
