# Playwright MCP

## Overview

**Playwright** is an MCP server that provides access to Playwright's browser automation capabilities for end-to-end testing and web scraping.

This guide covers both the standard Playwright MCP and the enriquedlh97 variant, which provides the same core functionality.

## Tools

See the MCP schema for exact tools, but typically:
- `launch_browser` — Launch a browser instance
- `navigate_to_url` — Navigate to a specific URL
- `get_page_content` — Get HTML content
- `click_element` — Click on elements
- `fill_form` — Fill form fields
- `take_screenshot` — Capture screenshots
- `execute_script` — Execute JavaScript in page context
- `get_page_metrics` — Get performance metrics
- `close_browser` — Close browser instance

## Use Cases

- **End-to-end testing**: Complete user workflows in browser
- **Web scraping**: Extract data from websites
- **Form automation**: Automated form filling and submission
- **Performance testing**: Measure page load times and metrics
- **Screenshot capture**: Document application states
- **Cross-browser testing**: Test across different browsers

## Integration with Projects

Playwright MCP can help with:
- End-to-end testing of web applications
- Automated form filling and submission
- Cross-browser compatibility testing
- Performance measurement and profiling
- Screenshot capture for documentation
- Web scraping and data extraction

## Example Usage

```bash
mcp playwright launch_browser '{"headless": true, "browser": "chromium"}'
```

## When to Use

- For end-to-end testing workflows
- When automating browser interactions
- For cross-browser compatibility testing
- For performance measurement and profiling
- When capturing screenshots for documentation
- For web scraping and data extraction
