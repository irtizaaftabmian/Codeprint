Run `npx codeprint --json` in the current directory and analyze the output.

```bash
npx codeprint --json 2>/dev/null
```

Once you have the JSON, answer the user's question about their codebase. If no specific question was asked, provide a summary covering:

1. **Overview** — total files, live vs dead, number of entry points
2. **Dead code** — list dead files with their paths; note if any look safe to delete
3. **Entry points** — what drives the app (pages, API routes, scripts)
4. **Largest files** — top files by LOC that might be worth splitting
5. **Recommendations** — any obvious structural issues or cleanup opportunities

When referencing files, always include the full relative path so the user can navigate to them. If the user wants to open a file, remind them they can run `npx codeprint` (no `--json`) to open the interactive browser graph where they can click nodes, filter by category, and open files directly in VS Code or Cursor.
