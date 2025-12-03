# Docfork MCP

## Overview

**Docfork** helps manage, generate, and maintain documentation. It can create, version, and organize docs in a structured way.

## Tools

See the MCP schema for exact tools, but typically:
- `create_doc` — Create a new documentation file
- `update_doc` — Update existing documentation
- `fork_doc` — Create a variant of documentation
- `list_docs` — List all managed documentation

## Use Cases for Mega Directory

- **API documentation**: Maintain OpenAPI specs for all endpoints
- **Crawler configuration docs**: Document data sources and extraction patterns
- **Deployment guides**: Keep deployment instructions up-to-date
- **SEO guidelines**: Document SEO best practices and requirements
- **Database schema docs**: Maintain data model documentation

## Integration with Mega Directory

Mega Directory's complex architecture requires comprehensive documentation:
1. Keep API specs in sync with endpoint changes
2. Document crawler configurations and data sources
3. Maintain deployment guides for multi-service architecture
4. Track SEO and accessibility guidelines

## Example Usage

```bash
mcp docfork create_doc '{"path": "docs/api/listings-endpoint.md", "title": "Listings API Endpoint", "content": "..."}'
```

## When to Use

- When API endpoints change
- To document new crawler sources
- When updating deployment procedures
- To maintain SEO and accessibility guidelines
- When database schema changes

## References

- `docs/` for existing documentation structure
- `apps/api/` for API implementation details
- `apps/crawler/config/` for crawler configurations
