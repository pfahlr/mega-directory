# Sequential Thinking MCP

## Overview

**Sequential Thinking** helps break down complex problems into step-by-step reasoning, maintaining a clear chain of logic.

## Tools

### `create_thinking_session`
Start a new structured thinking session for a problem.

### `add_thinking_step`
Add a reasoning step to an active session.

### `retrieve_session`
Get the full chain of reasoning from a session.

## Use Cases for Mega Directory

- **Data pipeline design**: Breaking down crawler → API → database flow
- **Performance optimization**: Planning query optimization step-by-step
- **SEO implementation**: Walking through page generation and metadata
- **Multi-agent coordination**: Understanding how crawler, API, admin, and web interact

## Integration with Mega Directory

Mega Directory's complex architecture benefits from sequential thinking:
1. Plan the data flow from source to presentation
2. Work through performance optimization strategies
3. Document reasoning for architectural decisions
4. Coordinate changes across multiple agents

## Example Usage

```bash
mcp smithery-ai-server-sequential-thinking create_thinking_session '{"problem": "How to optimize listing queries for 1M+ records"}'
```

## When to Use

- Planning complex data pipeline changes
- Optimizing database performance
- Implementing new SEO features
- Coordinating changes across multiple agents
