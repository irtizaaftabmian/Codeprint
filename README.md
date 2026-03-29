# codeprint

Interactive codebase dependency graph with dead code detection. Run it in any project to instantly visualize your file structure, imports, and unused code.

```bash
npx codeprint
```

Opens a browser at `http://localhost:3456`.

![codeprint visualization](https://raw.githubusercontent.com/irtizaaftabmian/codeprint/main/screenshot.png)

## Features

- **Dependency graph** — every file and its import relationships
- **Dead code detection** — red nodes = files with no active importers (via [knip](https://knip.dev))
- **Category clusters** — files grouped by type: Page, API, Component, Hook, Store, Util, Type, Config
- **Plain-English descriptions** — AI-style summaries of what each file does, generated from its content
- **Click any node** — see path, LOC, exports, dead exports, and open directly in VS Code or Cursor
- **Copy path** — one click to copy the file path for pasting into Claude or any LLM
- **Search + filter** — search by filename, filter by category
- **Dark / light mode**

## Usage

```bash
# Interactive browser graph (default)
npx codeprint

# JSON output — for LLMs or scripting
npx codeprint --json

# Custom port
npx codeprint --port=4000
```

### JSON mode

```bash
npx codeprint --json | jq '.stats'
```

```json
{
  "total": 84,
  "live": 61,
  "dead": 12,
  "entries": 11
}
```

Pipe the full JSON into Claude to answer questions like:
- "What files are dead and safe to delete?"
- "What does `auth/route.ts` depend on?"
- "Which components import `useUser`?"

## Claude Code integration

Add `/codeprint` as a slash command in any project:

```bash
# Copy to your project (per-project)
mkdir -p .claude/commands
curl -o .claude/commands/codeprint.md \
  https://raw.githubusercontent.com/irtizaaftabmian/codeprint/main/.claude/commands/codeprint.md

# Or copy globally (available in all Claude Code sessions)
mkdir -p ~/.claude/commands
curl -o ~/.claude/commands/codeprint.md \
  https://raw.githubusercontent.com/irtizaaftabmian/codeprint/main/.claude/commands/codeprint.md
```

Then type `/codeprint` in Claude Code to analyze your codebase and get AI reasoning about the structure.

## How dead code detection works

codeprint runs [knip](https://knip.dev) in JSON reporter mode to find unused files and exports. If your project doesn't have a `knip.config.ts`, detection falls back to import-graph analysis only (files with no importers = dead).

For full export-level analysis, add a `knip.config.ts` to your project root.

## Requirements

- Node.js 18+
- TypeScript / JavaScript project (`.ts`, `.tsx`, `.js`, `.jsx`)

## Development

```bash
git clone https://github.com/irtizaaftabmian/codeprint
cd codeprint
pnpm install
pnpm dev        # starts CLI + UI in watch mode
```

Build for publishing:

```bash
pnpm build      # compiles CLI + bundles UI into dist/
```

## License

MIT
