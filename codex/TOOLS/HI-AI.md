# Hi-AI MCP (Project Context)

## Overview

**Hi-AI** is the project-context MCP, typically populated from project-specific metadata files. It stores high-level project information, architecture decisions, and team/context details.

## Tools

Typically provides:
- `get_project_context` — Retrieve stored project metadata
- `set_project_context` — Update project information
- `get_decisions` — Retrieve architectural or design decisions
- `log_decision` — Record a new decision

## Use Cases for Mega Directory

- Store the project's **core architecture decisions** (polyglot stack, agent separation)
- Track **performance requirements** and benchmarks
- Maintain **SEO guidelines** and accessibility standards
- Store **crawler source configurations** and data quality rules
- Track **deployment patterns** and environment configurations

## Integration with Mega Directory

On startup, Hi-AI should be seeded with:
1. **Project architecture**: Multi-agent system with TypeScript API, Python crawler, Astro frontend
2. **Performance requirements**: Page load < 2s, API responses < 500ms
3. **Data quality standards**: Deduplication rules, validation patterns
4. **SEO guidelines**: Meta tag patterns, URL structures
5. **Crawler configurations**: Source targets, rate limits, LLM usage patterns

## Example Usage

```bash
mcp hi-ai get_project_context '{"project": "mega-directory"}'
```

## When to Use

- At session start, to establish project context
- Before implementing features, to verify alignment with architecture
- During code reviews, to check against performance requirements
- To understand crawler configurations and data sources

## References

- `CLAUDE.md` — full house rules and invariants
- `README.md` — architecture overview
- `docs/` — detailed documentation
