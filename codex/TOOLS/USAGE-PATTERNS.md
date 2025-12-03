# Common MCP Usage Patterns for Mega Directory

## Pattern 1: Optimize Database Performance

**Goal**: Improve query performance for large datasets

```
1. Use CLEAR-THOUGHT: Analyze the performance bottleneck
2. Use CODE-RUNNER: Test SQL query optimizations
3. Use SEQUENTIAL-THINKING: Plan implementation steps
4. Use VIBE-CHECK: Verify optimization patterns
5. Use NEO4J-MEMORY: Model data relationships for better queries
```

## Pattern 2: Implement Data Pipeline Changes

**Goal**: Coordinate changes across crawler, API, and database

```
1. Use SEQUENTIAL-THINKING: Plan changes across all agents
2. Use NEO4J-MEMORY: Model data relationships and transformations
3. Use CODE-RUNNER: Test data transformation logic
4. Use VIBE-CHECK: Verify data quality patterns
5. Use DOCFORK: Document pipeline changes
```

## Pattern 3: Enhance SEO and Accessibility

**Goal**: Improve directory page SEO and accessibility

```
1. Use CLEAR-THOUGHT: Analyze current SEO implementation
2. Use VIBE-CHECK: Verify SEO patterns and accessibility
3. Use CODE-RUNNER: Test frontend component logic
4. Use DOCFORK: Update SEO guidelines and documentation
5. Use SEQUENTIAL-THINKING: Plan rollout strategy
```

## Pattern 4: Debug Multi-Agent Issues

**Goal**: Resolve issues spanning crawler, API, admin, and web

```
1. Use CLEAR-THOUGHT: Reason through the multi-agent problem
2. Use NATURAL-CONTEXT: Discover which agent/tool handles the issue
3. Use CODE-RUNNER: Test hypotheses in relevant language/context
4. Use SEQUENTIAL-THINKING: Walk through the interaction step-by-step
5. Use HI-AI: Check architectural decisions and constraints
```

## Pattern 5: Plan and Implement New Features

**Goal**: Add new directory features with performance considerations

```
1. Use SEQUENTIAL-THINKING: Break down feature across agents
2. Use SPECFORGED: Formalize requirements with performance benchmarks
3. Use CLEAR-THOUGHT: Think through architectural implications
4. Use CODE-RUNNER: Prototype critical components
5. Use VIBE-CHECK: Verify implementation patterns
6. Use DOCFORK: Document new features and APIs
```

## Pattern 6: Coordinate Crawler Updates

**Goal**: Update crawler with new data sources or LLM enhancements

```
1. Use SEQUENTIAL-THINKING: Plan crawler changes and API impacts
2. Use CODE-RUNNER: Test data extraction and LLM prompts
3. Use NEO4J-MEMORY: Model new data relationships
4. Use VIBE-CHECK: Verify data quality and consistency
5. Use DOCFORK: Document crawler configurations
```

## Pattern 7: Deploy and Monitor Multi-Service Architecture

**Goal**: Deploy updates across API, web, admin, and crawler services

```
1. Use SEQUENTIAL-THINKING: Plan deployment order and dependencies
2. Use HI-AI: Check architectural decisions and deployment patterns
3. Use CLEAR-THOUGHT: Think through deployment risks and rollbacks
4. Use DOCFORK: Update deployment guides and procedures
5. Use NATURAL-CONTEXT: Coordinate tools across services
```

## Pattern 8: Validate Data Quality and Consistency

**Goal**: Ensure data integrity across the pipeline

```
1. Use CLEAR-THOUGHT: Analyze data quality issues
2. Use CODE-RUNNER: Test validation and normalization logic
3. Use NEO4J-MEMORY: Query data relationships and provenance
4. Use VIBE-CHECK: Verify data quality patterns
5. Use SEQUENTIAL-THINKING: Plan data quality improvements
```

## When to Use Each Tool

| Scenario | Primary Tools | Secondary Tools |
|----------|---------------|-----------------|
| Performance optimization | CLEAR-THOUGHT, CODE-RUNNER, VIBE-CHECK | SEQUENTIAL-THINKING |
| Data pipeline changes | SEQUENTIAL-THINKING, NEO4J-MEMORY, CODE-RUNNER | VIBE-CHECK |
| SEO implementation | CLEAR-THOUGHT, VIBE-CHECK, DOCFORK | CODE-RUNNER |
| Multi-agent coordination | SEQUENTIAL-THINKING, NATURAL-CONTEXT, HI-AI | |
| Feature planning | SEQUENTIAL-THINKING, SPECFORGED, CLEAR-THOUGHT | HI-AI |
| Documentation | DOCFORK, SEQUENTIAL-THINKING, VIBE-CHECK | |
| Crawler updates | SEQUENTIAL-THINKING, CODE-RUNNER, NEO4J-MEMORY | VIBE-CHECK |
| Deployment | SEQUENTIAL-THINKING, HI-AI, CLEAR-THOUGHT | DOCFORK |
| Data quality | CLEAR-THOUGHT, CODE-RUNNER, NEO4J-MEMORY | VIBE-CHECK |
| Code review | VIBE-CHECK, CLEAR-THOUGHT, CODE-RUNNER | |

## Tips

1. **Always start with CLEAR-THOUGHT** for performance issues—analyze first, optimize later
2. **Use HI-AI at session start** to establish polyglot architecture context
3. **Use NATURAL-CONTEXT** for multi-agent coordination—discover the right tool for each agent
4. **Use SEQUENTIAL-THINKING** for any change affecting multiple agents
5. **Test with CODE-RUNNER** before implementing (SQL, Python, TypeScript)
6. **Use VIBE-CHECK** regularly to maintain performance and SEO patterns
7. **Model with NEO4J-MEMORY** when dealing with complex data relationships
8. **Document with DOCFORK** when changing APIs or configurations
9. **Structure with SPECFORGED** for major features involving multiple agents

## Mega Directory Specific Considerations

- **Performance is critical**: Always test query performance and page load times
- **Data quality matters**: Verify changes maintain data integrity and normalization
- **Multi-agent complexity**: Consider impacts on crawler, API, admin, and web
- **Polyglot stack**: Use appropriate tools for TypeScript, Python, and SQL contexts
- **SEO essential**: Ensure all changes support SEO and accessibility requirements
- **Scalability**: Design for millions of listings and concurrent users
