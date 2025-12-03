# MCP Tools for Mega Directory Project

This file documents all MCP tools configured and available for this project, with their status, priorities, and usage guidance.

## Tool Inventory

### VIBE-CHECK

- **Status**: Primary (use frequently for performance and quality)
- **Quick Guidance**:
  - Use before merging performance-sensitive changes
  - Verify database query optimization patterns
  - Check SEO and accessibility consistency
  - Validate data model consistency across agents
- **Key Tools**: `check_vibe`
- **When**: Code review, performance verification, SEO validation

### SEQUENTIAL-THINKING

- **Status**: Primary (use for planning complex multi-agent workflows)
- **Quick Guidance**:
  - Start with this for breaking down data pipeline changes
  - Use to plan performance optimization strategies
  - Document reasoning for architectural decisions
  - Plan coordination between crawler, API, admin, and web
- **Key Tools**: `create_thinking_session`, `add_thinking_step`, `retrieve_session`
- **When**: Feature planning, performance optimization, multi-agent coordination

### NEO4J-MEMORY

- **Status**: Primary (use for complex relationship modeling)
- **Quick Guidance**:
  - Model category hierarchies and inheritance
  - Store geographic location relationships
  - Track data source provenance
  - Enable complex relationship queries
- **Key Tools**: `create_node`, `add_relationship`, `query_graph`, `get_node_details`
- **When**: Data modeling, relationship queries, provenance tracking

### HI-AI

- **Status**: Primary (use at session start for context)
- **Quick Guidance**:
  - Always load project context first (polyglot architecture)
  - Reference performance requirements before implementing
  - Check crawler configurations and data quality rules
  - Understand SEO guidelines and accessibility standards
- **Key Tools**: `get_project_context`, `set_project_context`, `get_decisions`, `log_decision`
- **When**: Session start, feature planning, architectural decisions

### DOCFORK

- **Status**: Primary (use for documentation maintenance)
- **Quick Guidance**:
  - Update API documentation when endpoints change
  - Document new crawler sources and configurations
  - Maintain deployment guides for multi-service architecture
  - Keep SEO and accessibility guidelines current
- **Key Tools**: `create_doc`, `update_doc`, `fork_doc`, `list_docs`
- **When**: Documentation updates, API changes, deployment guides

### CLEAR-THOUGHT

- **Status**: Primary (use for debugging and optimization)
- **Quick Guidance**:
  - Start here if debugging performance issues
  - Think through data quality and normalization problems
  - Evaluate SEO implementation decisions
  - Reason through multi-agent coordination issues
- **Key Tools**: `reflect_on_problem`, `reset_session`
- **When**: Debugging, optimization, architectural decisions

### CODE-RUNNER

- **Status**: Secondary (use for testing and validation)
- **Quick Guidance**:
  - Test SQL queries before implementing
  - Validate data transformation logic
  - Test LLM prompts and responses
  - Prototype API endpoint logic
- **Key Tools**: `execute_code`, `execute_code_with_variables`, `validate_code`, `get_capabilities`
- **When**: Query testing, data validation, prototyping

### NATURAL-CONTEXT

- **Status**: Secondary (use for tool discovery and coordination)
- **Quick Guidance**:
  - Use when unsure which tool handles a specific task
  - Chain operations across multiple agents
  - Provide natural language interface to complex workflows
  - Coordinate changes across crawler, API, and web
- **Key Tools**: `find`, `run`
- **When**: Tool discovery, cross-agent coordination, complex workflows

### SPECFORGED

- **Status**: Secondary (use for formal specification)
- **Quick Guidance**:
  - Structure codex/TASKS/ into coherent specifications
  - Formalize performance requirements with benchmarks
  - Define data quality and SEO requirements
  - Track cross-agent implementation status
- **Key Tools**: `create_spec`, `add_requirement`, `update_design`, `list_specifications`, `start_wizard_mode`
- **When**: Feature planning, requirements formalization, cross-agent tracking

## Workflow by Task Type

| Task | Primary Tools | When |
|------|---------------|------|
| Performance optimization | SEQUENTIAL-THINKING, CLEAR-THOUGHT, CODE-RUNNER | Slow queries, page load issues |
| Data pipeline changes | SEQUENTIAL-THINKING, NEO4J-MEMORY, VIBE-CHECK | Crawler updates, API changes |
| SEO implementation | CLEAR-THOUGHT, VIBE-CHECK, DOCFORK | Page optimization, meta tags |
| Multi-agent coordination | SEQUENTIAL-THINKING, NATURAL-CONTEXT, HI-AI | Cross-service changes |
| Feature planning | SEQUENTIAL-THINKING, SPECFORGED, CLEAR-THOUGHT | New features, major changes |
| Documentation | DOCFORK, SEQUENTIAL-THINKING, VIBE-CHECK | API docs, deployment guides |
| Code review | VIBE-CHECK, CLEAR-THOUGHT, CODE-RUNNER | Before merging changes |
| Debugging | CLEAR-THOUGHT, CODE-RUNNER, SEQUENTIAL-THINKING | Issues, performance problems |

## Tool Usage Guidelines

### Primary Tools (Use Frequently)
- **VIBE-CHECK**: Every code review, especially for performance and SEO
- **SEQUENTIAL-THINKING**: Complex planning and multi-agent coordination
- **NEO4J-MEMORY**: Data modeling and relationship queries
- **HI-AI**: Session initialization and architectural context
- **DOCFORK**: Documentation maintenance and API specs
- **CLEAR-THOUGHT**: Debugging, optimization, and decision validation

### Secondary Tools (Use as Needed)
- **CODE-RUNNER**: Testing and validation (SQL, Python, TypeScript)
- **NATURAL-CONTEXT**: Tool discovery and cross-agent coordination
- **SPECFORGED**: Formal specification when structuring requirements

## Quick Reference

### Start a Session
```
1. HI-AI: Load project context (polyglot architecture, performance requirements)
2. CLEAR-THOUGHT: Think through the task
3. Choose primary tool based on task type
```

### Optimize Performance
```
1. CLEAR-THOUGHT: Analyze the performance issue
2. CODE-RUNNER: Test query optimizations
3. SEQUENTIAL-THINKING: Plan implementation steps
4. VIBE-CHECK: Verify optimization patterns
```

### Implement Data Pipeline Changes
```
1. SEQUENTIAL-THINKING: Plan changes across agents
2. NEO4J-MEMORY: Model data relationships
3. CODE-RUNNER: Test transformation logic
4. VIBE-CHECK: Verify data quality patterns
```

### Coordinate Multi-Agent Changes
```
1. SEQUENTIAL-THINKING: Plan cross-agent workflow
2. NATURAL-CONTEXT: Discover appropriate tools
3. HI-AI: Check architectural decisions
4. DOCFORK: Document coordination patterns
```

## Availability & Configuration

All tools listed here are currently available in this workspace:
- Check `./codex/TOOLS/*.md` for project-specific guidance
- Check `~/Development/agent_mcp_guides/*.md` for general reference
- Both locations contain identical tool documentation

To verify tool availability at any time:
```bash
mcp
```

To see a tool's detailed schema:
```bash
mcp <tool-name>
```

## Mega Directory Specific Considerations

- **Performance is critical**: Always consider impact on query performance and page load times
- **Data quality matters**: Verify changes maintain data integrity and normalization
- **SEO is essential**: Ensure all changes support SEO and accessibility requirements
- **Multi-agent architecture**: Consider impact on crawler, API, admin, and web agents
- **Polyglot stack**: Different tools may be needed for TypeScript, Python, and SQL contexts
