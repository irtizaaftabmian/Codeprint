#!/usr/bin/env node

/**
 * UserPromptSubmit hook — fires on every user prompt.
 * Scores the prompt against codeprint-related signals and injects
 * the skill if the score exceeds the threshold.
 *
 * Scoring:
 *   +6 per phrase match (substring)
 *   +4 per allOf group (all terms must match)
 *   +1 per anyOf term (max +2)
 *   Threshold: 6
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(__dirname, "..");

let input;
try {
  input = JSON.parse(readFileSync("/dev/stdin", "utf8"));
} catch {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const prompt = (input?.user_prompt || input?.prompt || "").toLowerCase();
const sessionId = input?.session_id || "default";

if (!prompt) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

// Scoring signals
const PHRASES = [
  "codeprint",
  "dependency graph",
  "dead code",
  "unused code",
  "code graph",
  "visualize codebase",
  "dead files",
  "dead exports",
  "show graph",
  "code visualization",
];

const ALL_OF = [
  ["find", "unused"],
  ["show", "dependencies"],
  ["what", "imports"],
  ["what", "calls"],
  ["trace", "dependency"],
  ["analyze", "codebase"],
];

const ANY_OF = [
  "entry points",
  "architecture",
  "code structure",
  "file dependencies",
  "unused exports",
  "import graph",
];

const MIN_SCORE = 6;

// Score the prompt
let score = 0;

for (const phrase of PHRASES) {
  if (prompt.includes(phrase)) score += 6;
}

for (const group of ALL_OF) {
  if (group.every((term) => prompt.includes(term))) score += 4;
}

let anyOfBonus = 0;
for (const term of ANY_OF) {
  if (prompt.includes(term)) {
    anyOfBonus += 1;
    if (anyOfBonus >= 2) break;
  }
}
score += anyOfBonus;

if (score < MIN_SCORE) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

// Dedup
const hash = createHash("sha256").update(sessionId).digest("hex").slice(0, 12);
const dedupDir = resolve(tmpdir(), `codeprint-plugin-${hash}-seen.d`);
const claimFile = resolve(dedupDir, "codeprint-prompt");

try {
  mkdirSync(dedupDir, { recursive: true });
  if (existsSync(claimFile)) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }
  writeFileSync(claimFile, "", { flag: "wx" });
} catch {
  // skip dedup on failure
}

try {
  const skillPath = resolve(pluginRoot, "skills/codeprint/SKILL.md");
  const content = readFileSync(skillPath, "utf8");
  const body = content.replace(/^---[\s\S]*?---\n*/, "").trim();

  const output = {
    additionalContext: `[codeprint] Codebase analysis skill auto-suggested based on prompt (score: ${score}).\n\n${body}`,
  };

  process.stdout.write(JSON.stringify(output));
} catch {
  process.stdout.write(JSON.stringify({}));
}
