# Code Runner MCP (IEX)

## Overview

**Code Runner** (IEX) allows safe execution of JavaScript or Python code snippets, useful for testing logic, validating data, or running examples.

## Tools

### `execute_code`
Execute JavaScript or Python code safely.

### `execute_code_with_variables`
Execute code with dynamic input variables (key-value pairs).

### `validate_code`
Validate code syntax and security without executing.

### `get_capabilities`
Check supported languages and execution features.

## Use Cases for Mega Directory

- **SQL query testing**: Test database queries before implementation
- **Data transformation validation**: Test data normalization logic
- **LLM prompt testing**: Validate crawler LLM prompts and responses
- **API endpoint testing**: Test request/response patterns
- **Frontend component testing**: Test Astro component logic

## Integration with Mega Directory

Mega Directory's polyglot stack benefits from Code Runner:
1. Test SQL queries for performance optimization
2. Validate Python data extraction patterns
3. Test TypeScript API logic
4. Prototype data transformations

## Example Usage

```bash
mcp dravidsajinraj-iex-code-runner-mcp execute_code '{"language": "python", "code": "import re; print(re.sub(r\"[^a-zA-Z0-9 ]\", \"\", \"Hello, World!\")))"}'
```

## When to Use

- Testing database queries before implementation
- Validating data transformation logic
- Prototyping API endpoint logic
- Testing crawler extraction patterns
- Quick validation of algorithms

## References

- `db/schema.prisma` for database structure
- `apps/crawler/` for Python patterns
- `apps/api/` for TypeScript patterns
