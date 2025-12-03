# Natural Context Provider (NCP)

## Overview

**Natural Context Provider** helps discover and orchestrate tools across all connected MCP servers using natural language queries.

## Tools

### `find`
Discover tools across MCP servers using natural language description.

### `run`
Execute a tool on a specific MCP server.

## Use Cases for Mega Directory

- **Tool discovery**: "Find me a tool to optimize database queries"
- **Cross-MCP orchestration**: Chain tools for complex data pipeline operations
- **Natural language routing**: Ask "how do I improve SEO for category pages?" and let NCP find the right tool
- **Multi-agent coordination**: Coordinate between crawler, API, and frontend tools

## Integration with Mega Directory

NCP acts as a **meta-orchestrator** for the MCP ecosystem in Mega Directory:
1. Discover which server handles a given task (database vs. frontend vs. crawler)
2. Route complex workflows across multiple tools
3. Provide natural language interface to technical operations
4. Help coordinate changes across the multi-agent architecture

## Example Usage

```bash
mcp portel-dev-ncp find '{"query": "I need to test and optimize a slow database query"}'
```

```bash
mcp portel-dev-ncp run '{"server": "dravidsajinraj-iex-code-runner-mcp", "tool": "execute_code", "args": {...}}'
```

## When to Use

- When unsure which MCP tool to use for a specific task
- To chain operations across multiple services (API, database, frontend)
- To provide natural language interface to complex operations
- For coordinating changes across multiple agents

## References

- See all other codex/TOOLS/*.md files for available servers
- `CLAUDE.md` Section 6 for MCP integration strategy
- `docs/AGENTS.md` for agent responsibilities
