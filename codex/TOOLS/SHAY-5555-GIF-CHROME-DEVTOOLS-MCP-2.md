# Chrome DevTools MCP 2

## Overview

**Chrome DevTools MCP 2** is an MCP server that provides access to Chrome DevTools functionality for debugging, profiling, and browser automation.

## Tools

See the MCP schema for exact tools, but typically:
- `get_devtools_info` — Get information about available DevTools
- `take_screenshot` — Capture screenshots of the current page
- `inspect_element` — Inspect DOM elements
- `get_network_logs` — Access network request/response logs
- `profile_performance` — Profile page performance
- `console_execute` — Execute JavaScript in the browser console

## Use Cases

- **Web debugging**: Inspect and debug web applications
- **Performance profiling**: Analyze page load times and resource usage
- **Network monitoring**: Track HTTP requests and responses
- **Screenshot capture**: Take screenshots for documentation or testing
- **Console automation**: Execute JavaScript commands in browser context

## Integration with Projects

Chrome DevTools MCP can help with:
- Debugging web applications and browser issues
- Performance analysis and optimization
- Network request monitoring and debugging
- Automated testing and screenshot capture

## Example Usage

```bash
mcp shay-5555-gif-chrome-devtools-mcp-2 get_devtools_info '{}'
```

## When to Use

- When debugging web application issues
- For performance profiling and optimization
- To monitor network traffic and API calls
- For automated testing with browser automation
- When capturing screenshots for documentation
