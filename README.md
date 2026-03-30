# codeprint

> Visualize any codebase as an interactive dependency graph — with dead code detection, AI descriptions, and native Claude Code integration.

![codeprint visualization](https://raw.githubusercontent.com/irtizaaftabmian/Codeprint/main/screenshot.png)

---

## Install

```bash
git clone https://github.com/irtizaaftabmian/Codeprint
cd Codeprint
pnpm install && pnpm build
node packages/cli/dist/index.js
```

The last command opens the visualization in your browser and automatically installs `/codeprint` as a global slash command in Claude Code.

---

## Claude Code

Once installed, type `/codeprint` inside any project in Claude Code:

```
/codeprint
```

Claude analyzes the codebase and returns a full breakdown — dead files, entry points, largest modules, and cleanup recommendations.

---

## Features

- **Dependency graph** — every file and its import chain, laid out by category
- **Dead code detection** — powered by [knip](https://knip.dev), red nodes = unused files
- **Category clusters** — Page · API · Component · Hook · Store · Util · Type · Config
- **File descriptions** — plain-English summaries generated from each file's content
- **Node detail panel** — path, LOC, exports, dead exports, open in VS Code or Cursor
- **Copy path** — one click to copy a file path into Claude or any LLM prompt
- **Search + filter** — by filename or category
- **Dark / light mode**

---

## CLI

```bash
# Interactive browser graph
npx codeprint

# JSON output — pipe into Claude or scripts
npx codeprint --json

# Custom port
npx codeprint --port=4000
```

---

## Requirements

- Node.js 18+
- pnpm
- A TypeScript or JavaScript project

---

## Dead Code Detection

codeprint uses [knip](https://knip.dev) in JSON reporter mode. Without a `knip.config.ts` in your project, detection falls back to import-graph analysis — any file with no importers is marked dead. For full export-level analysis, add a `knip.config.ts` to your project root.

---

&copy; 2026 Doppel Labs. All rights reserved.
