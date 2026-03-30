# codeprint

Interactive codebase dependency graph with dead code detection — built as a Claude Code plugin.

![codeprint visualization](https://raw.githubusercontent.com/irtizaaftabmian/Codeprint/main/screenshot.png)

## Install into Claude Code

```bash
git clone https://github.com/irtizaaftabmian/Codeprint
cd Codeprint
pnpm install && pnpm build
node packages/cli/dist/index.js
```

That's it. The last command:
- Opens the visualization in your browser
- Automatically installs `/codeprint` as a global slash command in Claude Code

From that point on, type `/codeprint` in any Claude Code session to analyze any codebase.

## What it does

Run `npx codeprint` inside any JS/TS project:

- Opens a browser at `http://localhost:3456`
- Shows every file as a node, grouped by category (Page, API, Component, Hook, Store, Util…)
- **Green** = entry points · **Blue** = live files · **Red** = dead/unused files
- Click any node → see description, path, exports, dead exports
- **Copy path** button → paste the file path directly into Claude or any LLM
- Open files in VS Code or Cursor with one click
- Search by filename, filter by category, dark/light mode

## Using the slash command

Once installed, type `/codeprint` in Claude Code while inside any project:

```
/codeprint
```

Claude will run the analysis and give you a full breakdown — dead code, entry points, largest files, and recommendations.

## CLI usage

```bash
# Interactive browser (default)
npx codeprint

# JSON output for scripting or piping to Claude
npx codeprint --json

# Custom port
npx codeprint --port=4000
```

## How dead code detection works

Uses [knip](https://knip.dev) under the hood. If the project has no `knip.config.ts`, detection falls back to import-graph analysis (files with no importers = dead). For full export-level analysis, add a `knip.config.ts` to your project.

## Requirements

- Node.js 18+
- pnpm
- TypeScript / JavaScript project (`.ts`, `.tsx`, `.js`, `.jsx`)

## License

MIT
