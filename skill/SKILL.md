---
name: nodemap
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

# nodemap — Code Visualization

You have access to `nodemap`, a tool that builds an interactive dependency graph of the current codebase.

## Two modes

### Interactive browser graph
```bash
npx nodemap
```
Opens a browser at `http://localhost:3456` with:
- Force-directed graph of all files
- Green = entry points, Blue = live files, Red = dead files
- Click any node to see path, LOC, dead exports
- Minimap + zoom controls

### JSON analysis (for Claude to reason about)
```bash
npx nodemap --json
```
Outputs structured JSON you can read and answer questions from:
```json
{
  "nodes": [{ "id", "label", "path", "status", "loc", "deadExports" }],
  "edges": [{ "source", "target" }],
  "stats": { "total", "live", "dead", "entries" }
}
```

## When to use which mode

| User says | Run |
|-----------|-----|
| "show me the graph" / "visualize" | `npx nodemap` (browser) |
| "what's dead?" / "find unused" | `npx nodemap --json` then reason about dead nodes |
| "what does X depend on?" | `npx nodemap --json` then trace edges from X |
| "is Y used anywhere?" | `npx nodemap --json` then check if Y appears as edge target |

## Dead code detection
nodemap uses `knip` under the hood. If the project has no `knip.config.ts`, dead code detection is best-effort (based on import graph only — no knip = no export-level analysis).

To get full dead export analysis, suggest the user run:
```bash
npx knip --reporter json
```
or add a `knip.config.ts` to the project.
