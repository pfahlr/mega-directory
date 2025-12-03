# Clear Thought 1.5 MCP

## Overview

**Clear Thought 1.5** is a reasoning/reflection tool that helps break through confusion, re-frame problems, and think more clearly about complex scenarios.

## Tools

### `reset_session`
Reset the current reasoning session to clear state.

### `reflect_on_problem`
Reflect on a problem from multiple angles to gain clarity.

## Use Cases for Mega Directory

- **Performance debugging**: Understand why database queries are slow
- **Data quality issues**: Think through deduplication and normalization problems
- **SEO optimization**: Reason about page structure and meta tags
- **Crawler reliability**: Debug data extraction and LLM enhancement issues
- **Architecture decisions**: Evaluate trade-offs between different approaches

## Integration with Mega Directory

Mega Directory's performance and data quality requirements make Clear Thought essential:
1. Think through database query optimization strategies
2. Reason about data normalization and deduplication approaches
3. Evaluate SEO implementation decisions
4. Debug complex multi-agent interactions

## Example Usage

```bash
mcp waldzellai-clear-thought reflect_on_problem '{"problem": "Why are category pages loading slowly with 10k+ listings?", "angles": ["database queries", "frontend rendering", "caching strategy"]}'
```

## When to Use

- When debugging performance issues
- Before implementing complex data transformations
- When evaluating SEO improvements
- To reason through architectural trade-offs
- When troubleshooting crawler reliability

## References

- `CLAUDE.md` Section 5 for performance invariants
- `docs/` for performance and SEO guidelines
- Database query plans and performance metrics
