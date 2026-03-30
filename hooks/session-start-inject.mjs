#!/usr/bin/env node

/**
 * SessionStart hook — injects the codeprint skill as baseline context
 * on every session event (startup, resume, clear, compact).
 *
 * Reads the codeprint SKILL.md and outputs it as additionalContext
 * so Claude always knows about codeprint capabilities.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(__dirname, "..");

try {
  const skillPath = resolve(pluginRoot, "skills/codeprint/SKILL.md");
  const content = readFileSync(skillPath, "utf8");

  // Strip YAML frontmatter — only inject the body
  const body = content.replace(/^---[\s\S]*?---\n*/, "").trim();

  const output = {
    additionalContext: `[codeprint] Codebase visualization plugin loaded.\n\n${body}`,
  };

  process.stdout.write(JSON.stringify(output));
} catch (err) {
  // Never block the session on hook failure
  process.stdout.write(JSON.stringify({}));
}
