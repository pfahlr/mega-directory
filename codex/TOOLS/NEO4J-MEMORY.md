# Neo4j Knowledge Graph Memory Server

## Overview

**Neo4j Memory Server** stores and queries relationships between entities in a graph database, useful for tracking dependencies, relationships, and complex data structures.

## Tools

### `create_node`
Create a new entity node in the knowledge graph.

### `add_relationship`
Define a relationship between two nodes.

### `query_graph`
Query entities and their relationships using Cypher-like syntax.

### `get_node_details`
Retrieve full information about a specific node.

## Use Cases for Mega Directory

- **Category hierarchy**: Store and query category/subcategory relationships
- **Location data**: Model geographic relationships (countries → states → cities)
- **Data source tracking**: Track which listings came from which crawler sources
- **Business relationships**: Model connections between businesses (branches, franchises)

## Integration with Mega Directory

Mega Directory's relational data can benefit from Neo4j:
1. Store category hierarchies with inheritance
2. Model geographic location relationships
3. Track data provenance and source attribution
4. Enable complex relationship queries (e.g., "find all restaurants in downtown that accept reservations")

## Example Usage

```bash
mcp sylweriusz-mcp-neo4j-memory-server create_node '{"label": "Category", "properties": {"name": "restaurants", "parent": "food", "level": 2}}'
```

## When to Use

- During data modeling, to verify relationship structures
- For complex queries involving multiple relationship types
- To track data lineage and source attribution
- When implementing category or location-based features

## References

- See `db/schema.prisma` for current data relationships
- See `docs/` for data modeling guidelines
