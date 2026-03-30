#!/usr/bin/env node

/**
 * PreToolUse hook — fires on Bash tool invocations.
 * If the bash command mentions codeprint, knip, or madge,
 * injects the codeprint skill for context.
 *
 * Uses dedup to avoid injecting the same skill twice per session.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(__dirname, "..");

// Parse hook input from stdin
let input;
try {
  input = JSON.parse(readFileSync("/dev/stdin", "utf8"));
} catch {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const command = input?.tool_input?.command || "";
const sessionId = input?.session_id || "default";

// Check if bash command mentions our tools
const PATTERNS = [/\bcodeprint\b/i, /\bknip\b/i, /\bmadge\b/i];
const matched = PATTERNS.some((p) => p.test(command));

if (!matched) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

// Dedup — only inject once per session
const hash = createHash("sha256").update(sessionId).digest("hex").slice(0, 12);
const dedupDir = resolve(tmpdir(), `codeprint-plugin-${hash}-seen.d`);
const claimFile = resolve(dedupDir, "codeprint");

try {
  mkdirSync(dedupDir, { recursive: true });
  if (existsSync(claimFile)) {
    // Already injected this session
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }
  writeFileSync(claimFile, "", { flag: "wx" }); // atomic create
} catch {
  // If claim fails (race condition or permissions), skip dedup
}

try {
  const skillPath = resolve(pluginRoot, "skills/codeprint/SKILL.md");
  const content = readFileSync(skillPath, "utf8");
  const body = content.replace(/^---[\s\S]*?---\n*/, "").trim();

  const output = {
    additionalContext: `[codeprint] Skill injected — codebase analysis tool detected in command.\n\n${body}`,
  };

  process.stdout.write(JSON.stringify(output));
} catch {
  process.stdout.write(JSON.stringify({}));
}
