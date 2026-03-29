---
name: codeprint
description: Visualize the codebase as an interactive dependency graph. Shows live files, dead files, entry points, and unused exports.
triggers:
  - show code graph
  - visualize codebase
  - show dependencies
  - find dead code
  - what calls
  - what imports
  - unused code
  - dead exports
---

# codeprint — Code Visualization

You have access to `codeprint`, a tool that builds an interactive dependency graph of the current codebase.

## Two modes

### Interactive browser graph
```bash
npx codeprint
```
Opens a browser at `http://localhost:3456` with:
- Clustered graph of all files grouped by category (Page, API, Component, Hook, etc.)
- Green = entry points, Blue = live files, Red = dead files
- Click any node to see path, LOC, exports, dead exports, and AI-generated description
- Filter by category, search by filename, zoom/minimap controls
- Open file in VS Code or Cursor directly from the panel
- Copy file path to clipboard for LLM prompts

### JSON analysis (for Claude to reason about)
```bash
npx codeprint --json
```
Outputs structured JSON you can read and answer questions from:
```json
{
  "nodes": [{ "id", "label", "path", "status", "category", "loc", "exports", "deadExports", "description" }],
  "edges": [{ "source", "target" }],
  "stats": { "total", "live", "dead", "entries" }
}
```

## When to use which mode

| User says | Run |
|-----------|-----|
| "show me the graph" / "visualize" | `npx codeprint` (browser) |
| "what's dead?" / "find unused" | `npx codeprint --json` then reason about dead nodes |
| "what does X depend on?" | `npx codeprint --json` then trace edges from X |
| "is Y used anywhere?" | `npx codeprint --json` then check if Y appears as edge target |

## Dead code detection
codeprint uses `knip` under the hood. If the project has no `knip.config.ts`, dead code detection is best-effort (based on import graph only — no knip = no export-level analysis).

To get full dead export analysis, suggest the user run:
```bash
npx knip --reporter json
```
or add a `knip.config.ts` to the project.
