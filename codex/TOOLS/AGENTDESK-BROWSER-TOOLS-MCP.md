# AgentDesk Browser Tools MCP

## Overview

**AgentDesk Browser Tools MCP** is an MCP server that provides browser automation and web scraping capabilities for testing and data extraction.

## Tools

See the MCP schema for exact tools, but typically:
- `navigate_to_url` — Navigate to a specific URL
- `get_page_content` — Get HTML content of current page
- `click_element` — Click on DOM elements
- `fill_form` — Fill form fields with data
- `extract_data` — Extract structured data from pages
- `take_screenshot` — Capture screenshots
- `execute_script` — Execute JavaScript in page context

## Use Cases

- **Web scraping**: Extract data from websites
- **Form automation**: Fill and submit forms automatically
- **Testing automation**: Automated browser testing
- **Data extraction**: Pull structured data from web pages
- **Screenshot capture**: Document web application states

## Integration with Projects

AgentDesk Browser Tools MCP can help with:
- Web scraping and data extraction tasks
- Automated form filling and submission
- Browser-based testing and validation
- Screenshot capture for documentation
- Web application monitoring

## Example Usage

```bash
mcp Agentdesk-browser-tools-mcp navigate_to_url '{"url": "https://example.com"}'
```

## When to Use

- When scraping data from websites
- For automated form filling and submission
- For browser-based testing workflows
- When extracting structured data from web pages
- For screenshot capture and documentation
