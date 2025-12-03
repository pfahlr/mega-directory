# SpecForged MCP

## Overview

**SpecForged** is a specification/requirements management tool that helps structure requirements, design, and implementation tasks using a formal approach.

## Tools

### `create_spec`
Create a new specification with requirements, design, and tasks.

### `set_current_spec`
Set the active specification for subsequent operations.

### `add_requirement`
Add user stories with EARS-formatted acceptance criteria.

### `update_design`
Update technical design documentation (architecture, components, data models, diagrams).

### `list_specifications`
List all specifications and their current status.

### `get_specification_details`
Retrieve detailed info about a specification.

### `start_wizard_mode`
Interactive wizard for comprehensive specification creation.

### `check_initialization_status`
Check if SpecForge is initialized and guide next steps.

### `classify_mode`
Classify user input to determine routing mode (chat, do, spec).

### `wizard_next_step`
Get guidance for the next step in the wizard.

## Use Cases for Mega Directory

- **Feature specifications**: Structure requirements for new directory features
- **Performance requirements**: Formalize performance benchmarks and SLAs
- **Data quality specifications**: Define data validation and normalization rules
- **SEO requirements**: Specify SEO and accessibility requirements
- **Crawler specifications**: Document data source requirements and extraction patterns

## Integration with Mega Directory

Mega Directory has codex/TASKS with 90+ tasks. SpecForge can:
1. Organize tasks into coherent specifications (e.g., "Performance Optimization", "SEO Enhancement")
2. Track requirements vs. implementation status
3. Link design decisions to tasks
4. Provide structured hand-off between agents

## Example Usage

```bash
mcp whit3rabbit-specforged create_spec '{"name": "Search Performance Optimization", "description": "Improve search query performance for large datasets", "spec_id": "search-perf"}'
```

```bash
mcp whit3rabbit-specforged add_requirement '{"as_a": "user", "i_want": "search results to load in under 500ms", "so_that": "I can find businesses quickly", "spec_id": "search-perf", "ears_requirements": [...]}'
```

## When to Use

- Planning major feature initiatives
- Formalizing performance and SEO requirements
- Transitioning from task list to structured development
- Tracking cross-agent requirements and implementation

## References

- `codex/TASKS/` for current task structure
- `CLAUDE.md` for Mega Directory invariants to include in requirements
- `docs/` for architecture and performance guidelines
