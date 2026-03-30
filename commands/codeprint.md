---
description: Launch the interactive codeprint browser graph for the current directory, or run JSON analysis for structured reasoning.
---

# codeprint — Visualize Codebase

Launch the interactive dependency graph for the current project.

## Preflight

1. **Node.js available?** — Confirm `node` is on PATH.
   - If missing: guide user to install Node.js.
2. **Project has source files?** — Check for `.ts`, `.tsx`, `.js`, `.jsx` files in the current directory.
   - If empty: warn that codeprint needs a JavaScript/TypeScript project to analyze.

## Plan

Two execution paths based on "$ARGUMENTS":

- **No arguments or "graph" / "browser" / "visual"** → Launch the interactive browser graph.
- **"json" / "analyze" / "analysis"** → Run JSON analysis and reason about the output.

## Commands

### Interactive Graph (default)

```bash
npx codeprint &
```

Tell the user the graph is opening at http://localhost:3456 (or the next available port). They can:
- Explore the dependency map with clustered categories
- Filter by category (Page, API, Component, Hook, etc.)
- Click nodes to see file details, LOC, and exports
- Find dead code (red nodes)
- Open files directly in their editor

### JSON Analysis

```bash
npx codeprint --json 2>/dev/null
```

Once you have the JSON output, analyze it and provide:

1. **Overview** — total files, live vs dead, number of entry points
2. **Dead code** — list dead files with their paths; note if any look safe to delete
3. **Entry points** — what drives the app (pages, API routes, scripts)
4. **Largest files** — top files by LOC that might be worth splitting
5. **Recommendations** — any obvious structural issues or cleanup opportunities

## Verification

- **Browser mode**: Confirm the server started by checking for the localhost URL in output.
- **JSON mode**: Confirm valid JSON was returned and `stats` object is present.

## Summary

Present a structured result:

```
## codeprint Result
- **Mode**: browser | json
- **Files analyzed**: <total>
- **Live**: <count> | **Dead**: <count> | **Entry points**: <count>
```

## Next Steps

- After browser launch → "Click any node to explore. Red nodes are dead code candidates."
- After JSON analysis → "Want me to look deeper at any specific area? Or run `npx codeprint` to explore visually."
- If dead code found → "Consider removing dead files after verifying they're truly unused. Check for dynamic imports that codeprint might miss."
