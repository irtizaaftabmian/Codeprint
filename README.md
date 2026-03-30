<p align="center">
  <img src="https://raw.githubusercontent.com/irtizaaftabmian/Codeprint/main/packages/ui/public/logo.png" width="80" alt="codeprint logo" />
</p>

<h1 align="center">codeprint</h1>

<p align="center">
  Visualize any codebase as an interactive dependency graph — with dead code detection, AI descriptions, and native Claude Code integration.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/codeprint"><img src="https://img.shields.io/npm/v/codeprint.svg" alt="npm version" /></a>
  <a href="https://github.com/irtizaaftabmian/Codeprint/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license" /></a>
</p>

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

- **17 languages** — TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Swift, C/C++, C#, Ruby, PHP, Dart, Scala, Elixir, Zig, Lua
- **Dependency graph** — every file and its import chain, laid out by category
- **Dead code detection** — powered by [knip](https://knip.dev), red nodes = unused files
- **Category clusters** — Page · API · Component · Hook · Model · Controller · Service · Store · Util · Type · Config · and more
- **File descriptions** — plain-English summaries generated from each file's content
- **Node detail panel** — path, language, LOC, exports, dead exports, open in VS Code or Cursor
- **Copy path** — one click to copy a file path into Claude or any LLM prompt
- **Search + filter** — by filename or category
- **Dark / light mode**
- **Claude Code plugin** — install with `npx plugins add codeprint` for automatic skill injection

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
- Any project with supported source files (JS, TS, Python, Go, Rust, Java, Kotlin, Swift, C/C++, C#, Ruby, PHP, Dart, Scala, Elixir, Zig, Lua)

---

## Dead Code Detection

codeprint uses [knip](https://knip.dev) in JSON reporter mode. Without a `knip.config.ts` in your project, detection falls back to import-graph analysis — any file with no importers is marked dead. For full export-level analysis, add a `knip.config.ts` to your project root.

---

&copy; 2026 Doppel Labs. All rights reserved.
