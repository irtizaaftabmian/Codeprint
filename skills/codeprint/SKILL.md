---
name: codeprint
description: "Interactive dependency graph visualizer and dead code detector. Use when analyzing codebase structure, finding dead code, tracing dependencies, or visualizing architecture."
summary: "codeprint builds interactive dependency graphs — run `npx codeprint` for browser UI or `npx codeprint --json` for structured analysis."
metadata:
  priority: 7
  pathPatterns: []
  bashPatterns:
    - "\\bcodeprint\\b"
    - "\\bknip\\b"
    - "\\bmadge\\b"
  promptSignals:
    phrases:
      - "codeprint"
      - "dependency graph"
      - "dead code"
      - "unused code"
      - "code graph"
      - "visualize codebase"
      - "dead files"
      - "dead exports"
    allOf:
      - ["find", "unused"]
      - ["show", "dependencies"]
      - ["what", "imports"]
      - ["what", "calls"]
    anyOf:
      - "entry points"
      - "architecture"
      - "code structure"
      - "file dependencies"
    noneOf: []
    minScore: 6
retrieval:
  aliases:
    - code visualization
    - dependency analysis
    - dead code detection
    - codebase graph
    - unused exports
    - import graph
  intents:
    - visualize my codebase
    - find dead code
    - show dependency graph
    - what files are unused
    - trace imports
    - analyze codebase structure
    - find entry points
  entities:
    - codeprint
    - knip
    - madge
    - dependency graph
    - dead code
---

# codeprint — Codebase Visualization & Dead Code Detection

You are an expert in codebase analysis using `codeprint`, a tool that builds interactive dependency graphs and detects dead code.

## Installation

```bash
npm install -g codeprint
# or use directly
npx codeprint
```

## Two Modes

### Interactive browser graph
```bash
npx codeprint
```
Opens a browser at `http://localhost:3456` (auto-increments if port busy) with:
- Clustered DAG of all files grouped by category (Page, API, Component, Hook, Store, Util, Type, Config, Middleware)
- Color coding: Green = entry points, Blue = live files, Red = dead files
- Click any node to see path, LOC, exports, dead exports, and AI-generated description
- Filter by category, search by filename, zoom/minimap controls
- Open file in VS Code or Cursor directly from the panel
- Copy file path to clipboard

### JSON analysis (for structured reasoning)
```bash
npx codeprint --json
```
Outputs structured JSON:
```json
{
  "nodes": [{ "id", "label", "path", "status", "category", "loc", "exports", "deadExports", "description" }],
  "edges": [{ "source", "target" }],
  "stats": { "total", "live", "dead", "entries" }
}
```

## When to Use Which Mode

| User request | Action |
|-------------|--------|
| "show me the graph" / "visualize" | `npx codeprint` (opens browser) |
| "what's dead?" / "find unused" | `npx codeprint --json` then analyze dead nodes |
| "what does X depend on?" | `npx codeprint --json` then trace edges from X |
| "is Y used anywhere?" | `npx codeprint --json` then check if Y appears as edge target |
| "give me a codebase overview" | `npx codeprint --json` then summarize stats, entry points, dead code |

## Analyzing JSON Output

When you receive JSON output, provide analysis covering:

1. **Overview** — total files, live vs dead, number of entry points
2. **Dead code** — list dead files with their paths; note if any look safe to delete
3. **Entry points** — what drives the app (pages, API routes, scripts)
4. **Largest files** — top files by LOC that might be worth splitting
5. **Dependency clusters** — tightly coupled file groups
6. **Recommendations** — structural issues or cleanup opportunities

Always include full relative paths so the user can navigate to files.

## Dead Code Detection

codeprint uses `knip` under the hood for export-level dead code analysis. If the project has no `knip.config.ts`, detection is best-effort (import graph only — no export-level analysis).

For full dead export analysis, suggest:
```bash
npx knip --reporter json
```

## File Categories

codeprint automatically categorizes files:
- **Page** — route pages, `app/**/page.tsx`, `pages/**`
- **API** — route handlers, `app/api/**`, `pages/api/**`
- **Component** — React/Vue/Svelte components in `components/`
- **Hook** — custom hooks in `hooks/` or `use*.ts`
- **Store** — state management (redux, zustand, etc.)
- **Util** — utility functions in `lib/`, `utils/`, `helpers/`
- **Type** — type definition files `*.d.ts`, `types/`
- **Config** — configuration files at project root
- **Middleware** — middleware files
- **Other** — everything else

## Tips

- Remind users they can click nodes in the browser graph to open files directly in their editor
- When discussing dead code, distinguish between truly dead files (no imports) and dead exports (file is imported but specific exports are unused)
- For monorepos, run codeprint from the specific package directory, not the root
