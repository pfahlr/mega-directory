# Mega Directory MCP Tools Integration Guide

This directory contains usage guides for all configured MCP servers integrated with the Mega Directory project.

## Available MCP Servers

| Tool | Purpose | Key Use Cases for Mega Directory |
|------|---------|-----------------------------------|
| [VIBE-CHECK](./VIBE-CHECK.md) | Quality & consistency assessment | Verify performance patterns, SEO consistency |
| [SEQUENTIAL-THINKING](./SEQUENTIAL-THINKING.md) | Step-by-step reasoning | Plan data pipeline changes, multi-agent coordination |
| [NEO4J-MEMORY](./NEO4J-MEMORY.md) | Knowledge graph database | Model category/location relationships, data provenance |
| [HI-AI](./HI-AI.md) | Project context storage | Store architecture decisions, performance requirements |
| [DOCFORK](./DOCFORK.md) | Documentation management | Maintain API docs, crawler configs, deployment guides |
| [CLEAR-THOUGHT](./CLEAR-THOUGHT.md) | Reasoning & reflection | Debug performance issues, optimize queries |
| [CODE-RUNNER](./CODE-RUNNER.md) | Code execution (Python/JS/TS) | Test SQL queries, validate data transformations |
| [NATURAL-CONTEXT](./NATURAL-CONTEXT.md) | Tool discovery & orchestration | Coordinate across crawler, API, admin, web agents |
| [SPECFORGED](./SPECFORGED.md) | Specification & requirements | Structure codex/TASKS, track cross-agent requirements |

## Quick Integration Guide

### 1. **At Project Start**
- Use `HI-AI` to seed project context (polyglot architecture, performance requirements)
- Use `SPECFORGED` to structure existing `codex/TASKS/` into specifications
- Use `DOCFORK` to organize and maintain documentation

### 2. **During Feature Planning**
- Use `SEQUENTIAL-THINKING` to break down multi-agent workflows
- Use `CLEAR-THOUGHT` to think through performance implications
- Use `SPECFORGED` to formalize requirements with performance benchmarks

### 3. **During Implementation (TDD)**
- Use `CODE-RUNNER` to test SQL queries and data transformations
- Use `NEO4J-MEMORY` to model and test data relationships
- Use `VIBE-CHECK` to verify performance and SEO patterns

### 4. **During Performance Optimization**
- Use `CLEAR-THOUGHT` to analyze bottlenecks
- Use `CODE-RUNNER` to test query optimizations
- Use `VIBE-CHECK` to verify optimization patterns

### 5. **During Multi-Agent Coordination**
- Use `SEQUENTIAL-THINKING` to plan cross-agent changes
- Use `NATURAL-CONTEXT` to discover and orchestrate tools
- Use `HI-AI` to check architectural decisions

### 6. **When Unsure**
- Use `NATURAL-CONTEXT` to discover the right tool

## Mega Directory Integration Points

### Performance & Scalability
- **Optimize queries**: `CODE-RUNNER`, `CLEAR-THOUGHT`, `VIBE-CHECK`
- **Test data models**: `NEO4J-MEMORY`, `CODE-RUNNER`
- **Monitor performance**: `CLEAR-THOUGHT`, `VIBE-CHECK`

### Data Quality & Pipeline
- **Model relationships**: `NEO4J-MEMORY`
- **Test transformations**: `CODE-RUNNER`, `VIBE-CHECK`
- **Plan pipeline changes**: `SEQUENTIAL-THINKING`, `NATURAL-CONTEXT`

### SEO & Accessibility
- **Verify patterns**: `VIBE-CHECK`, `CLEAR-THOUGHT`
- **Document guidelines**: `DOCFORK`, `SEQUENTIAL-THINKING`
- **Test implementations**: `CODE-RUNNER`

### Multi-Agent Architecture
- **Coordinate changes**: `SEQUENTIAL-THINKING`, `NATURAL-CONTEXT`
- **Document interactions**: `DOCFORK`, `HI-AI`
- **Plan workflows**: `SEQUENTIAL-THINKING`, `SPECFORGED`

### Documentation & Specs
- **API documentation**: `DOCFORK`
- **Formalize requirements**: `SPECFORGED`
- **Track decisions**: `HI-AI`, `DOCFORK`

## References

- See `CLAUDE.md` Section 6 for MCP tool philosophy
- See individual tool docs for detailed usage
- See `README.md` for project overview
- See `docs/AGENTS.md` for agent responsibilities
- See `codex/TASKS/` for current task structure
