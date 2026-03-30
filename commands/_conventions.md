# Command Conventions

Every slash command in this plugin follows a consistent structure. When authoring or updating a command file, include **all** of these sections.

## Required Sections

### 1. Preflight
Check prerequisites before doing any work:
- **Node.js available?** — Confirm `node` is on PATH.
- **Source files present?** — The project must contain `.ts`, `.tsx`, `.js`, or `.jsx` files.

Preflight failures should produce clear, actionable guidance — never silently skip.

### 2. Plan
Before executing, state what will happen:
- Which mode will be used (browser graph or JSON analysis).
- Based on user arguments or intent.

### 3. Commands
The operational core:
- Show the exact bash command to run.
- Explain what the output means.

### 4. Verification
After execution, confirm the outcome:
- Browser mode: server started, URL accessible.
- JSON mode: valid JSON returned with expected structure.

### 5. Summary
Present a concise result block with key metrics.

### 6. Next Steps
Suggest logical follow-ups based on the outcome.

## File Naming

- Command files live in `commands/` and end in `.md`.
- Files prefixed with `_` (like this one) are meta-documents, not slash commands.

## Frontmatter

Every command file must include YAML frontmatter with at least a `description` field:

```yaml
---
description: One-line summary of what the command does.
---
```
