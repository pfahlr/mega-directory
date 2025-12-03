# Vibe Check MCP

## Overview

**Vibe Check** is an MCP server designed to assess, evaluate, and verify the "vibe" or quality/consistency of code, documentation, and system behavior.

## Tools

### `check_vibe`
Assess the overall quality and consistency of code or documentation.

**Use Cases for Mega Directory:**
- Verify that database queries follow performance best practices
- Check consistency of data models across API and database
- Validate that SEO metadata follows established patterns
- Assess code quality before merging performance-sensitive changes

**When to Use:**
- Before merging changes that affect database performance
- When reviewing crawler data extraction patterns
- To ensure SEO and accessibility patterns are consistent
- During code reviews for API endpoints

## Integration with Mega Directory

Mega Directory relies on:
1. **Performance patterns** — Vibe Check can verify queries are optimized
2. **Data consistency** — Ensure API models match database schema
3. **SEO patterns** — Verify frontend pages follow SEO best practices
4. **Code quality** — Maintain consistent patterns across polyglot codebase

## Example Usage

```bash
mcp vibe-check check_vibe '{"subject": "apps/api/src/controllers/listings.ts", "criteria": "database_performance"}'
```

## References

- See `CLAUDE.md` Section 5 for Mega Directory invariants to verify
- See `docs/` for performance and SEO guidelines
