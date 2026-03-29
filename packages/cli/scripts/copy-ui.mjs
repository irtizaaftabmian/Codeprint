// Copies packages/ui/dist into packages/cli/dist/public
// and bundles the Claude Code slash command into dist/
// so the npm package is fully self-contained.
import { cpSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uiDist = resolve(__dirname, "../../ui/dist");
const dest = resolve(__dirname, "../dist/public");

if (!existsSync(uiDist)) {
  console.error("UI dist not found. Run `pnpm build` in packages/ui first.");
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(uiDist, dest, { recursive: true });
console.log("  Copied UI dist → dist/public");

// Bundle Claude Code slash command content
const claudeCmd = resolve(__dirname, "../claude-command.md");
const claudeDest = resolve(__dirname, "../dist/claude-command.md");
if (existsSync(claudeCmd)) {
  copyFileSync(claudeCmd, claudeDest);
  console.log("  Copied claude-command.md → dist/claude-command.md");
}
