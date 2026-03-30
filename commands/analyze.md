---
description: Run codeprint JSON analysis and provide a structured codebase report. Use for dead code detection, dependency tracing, and architecture review.
---

# Analyze Codebase

Run `codeprint --json` to get a structured dependency graph and provide expert analysis.

## Preflight

1. **Node.js available?** — Confirm `node` is on PATH.
2. **Project has source files?** — Check for `.ts`, `.tsx`, `.js`, `.jsx` files.
   - If empty: warn that codeprint needs a JavaScript/TypeScript project.

## Plan

Run JSON analysis, then answer the user's question. If no specific question was asked, provide a full codebase report.

## Commands

```bash
npx codeprint --json 2>/dev/null
```

## Verification

Confirm valid JSON output with a `stats` object containing `total`, `live`, `dead`, `entries`.

## Summary

Analyze the JSON and cover:

1. **Overview** — total files, live vs dead count, entry point count
2. **Dead code** — list dead file paths, grouped by category. Note which are safe to delete.
3. **Entry points** — pages, API routes, scripts that drive the app
4. **Largest files** — top 5 files by LOC that might benefit from splitting
5. **Dependency hotspots** — files imported by many others (high fan-in)
6. **Recommendations** — structural issues, cleanup opportunities

Always reference files by full relative path.

## Next Steps

- "Run `npx codeprint` to explore the graph visually in your browser."
- "Want me to trace the dependency chain for a specific file?"
- If dead code found: "I can help you safely remove these dead files — want me to check for dynamic imports first?"
