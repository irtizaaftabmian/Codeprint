import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, extname, dirname, basename, join } from "node:path";
import madge from "madge";
import { LANGUAGES, ALL_EXTENSIONS, EXT_TO_LANG, parseFile } from "./parsers.js";
import type { GraphData, GraphNode, GraphEdge, NodeStatus, NodeCategory } from "./types.js";

// ─── File extensions by language family ──────────────────────────────────────

const JS_TS_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const ALL_KNOWN_EXTENSIONS = new Set([
  ...JS_TS_EXTENSIONS,
  ...ALL_EXTENSIONS,
]);

// ─── Exclude patterns ────────────────────────────────────────────────────────

const EXCLUDE_DIRS = new Set([
  "node_modules", ".git", ".next", ".turbo", "dist", "build", "out",
  "coverage", ".cache", "__pycache__", ".mypy_cache", ".pytest_cache",
  "venv", ".venv", "env", ".env", "target", "bin", "obj", "vendor",
  ".gradle", ".idea", ".vscode", ".dart_tool", ".pub-cache",
  "Pods", "DerivedData", ".build", "zig-cache", "zig-out",
]);

const EXCLUDE_FILE_PATTERNS = [
  /\.test\./,  /\.spec\./,  /_test\./,   /_spec\./,
  /\.min\./,   /\.d\.ts$/,  /\.lock$/,   /\.map$/,
  /\.generated\./,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countLines(filePath: string): number {
  try {
    return readFileSync(filePath, "utf8").split("\n").length;
  } catch {
    return 0;
  }
}

function readFile(absPath: string, maxLines = 120): string {
  try {
    return readFileSync(absPath, "utf8").split("\n").slice(0, maxLines).join("\n");
  } catch {
    return "";
  }
}

function humanize(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\[(.+?)\]/g, "$1")
    .toLowerCase()
    .trim();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function detectLanguage(ext: string): string {
  if (JS_TS_EXTENSIONS.has(ext)) {
    return ext === ".ts" || ext === ".tsx" ? "typescript" : "javascript";
  }
  const lang = EXT_TO_LANG.get(ext);
  return lang?.name.toLowerCase() ?? "unknown";
}

// ─── Walk filesystem ─────────────────────────────────────────────────────────

function walkDir(dir: string, root: string, extensions: Set<string>): string[] {
  const results: string[] = [];

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.startsWith(".") && entry !== ".") continue;
    if (EXCLUDE_DIRS.has(entry)) continue;

    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      results.push(...walkDir(fullPath, root, extensions));
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (!extensions.has(ext)) continue;

      const rel = relative(root, fullPath);
      if (EXCLUDE_FILE_PATTERNS.some((p) => p.test(rel))) continue;

      results.push(fullPath);
    }
  }

  return results;
}

// ─── Category detection (language-aware) ─────────────────────────────────────

export function detectCategory(relPath: string): NodeCategory {
  const parts = relPath.toLowerCase().split("/");
  const filename = basename(relPath);
  const nameNoExt = filename.replace(/\.[^.]+$/, "").toLowerCase();
  const ext = extname(relPath).toLowerCase();

  // ── JS/TS specific ──
  if (JS_TS_EXTENSIONS.has(ext)) {
    if (nameNoExt === "page") return "page";
    if (nameNoExt === "route") return "api";
    if (nameNoExt === "layout") return "layout";
    if (nameNoExt === "loading" || nameNoExt === "error" || nameNoExt === "not-found") return "page";
    if (nameNoExt === "middleware" || nameNoExt === "proxy") return "middleware";
  }

  // ── Universal patterns ──
  // Tests
  if (parts.includes("test") || parts.includes("tests") || parts.includes("spec") ||
      nameNoExt.endsWith("_test") || nameNoExt.endsWith("_spec") || nameNoExt.endsWith(".test")) {
    return "test";
  }

  // Types / Interfaces
  if (nameNoExt === "types" || nameNoExt === "type" || nameNoExt.endsWith(".types") ||
      nameNoExt.endsWith("_types") || parts.includes("types") || ext === ".d.ts") {
    return "type";
  }

  // Config
  if (nameNoExt.includes("config") || nameNoExt.endsWith(".config") ||
      nameNoExt === "settings" || nameNoExt === "constants" ||
      nameNoExt === "setup" || nameNoExt === "conf") {
    return "config";
  }

  // Models / Entities
  if (parts.includes("models") || parts.includes("model") ||
      parts.includes("entities") || parts.includes("entity") ||
      nameNoExt.endsWith("_model") || nameNoExt.endsWith("model")) {
    return "model";
  }

  // Controllers / Handlers
  if (parts.includes("controllers") || parts.includes("controller") ||
      parts.includes("handlers") || parts.includes("handler") ||
      nameNoExt.endsWith("_controller") || nameNoExt.endsWith("controller") ||
      nameNoExt.endsWith("_handler") || nameNoExt.endsWith("handler")) {
    return "controller";
  }

  // Services / Business logic
  if (parts.includes("services") || parts.includes("service") ||
      nameNoExt.endsWith("_service") || nameNoExt.endsWith("service")) {
    return "service";
  }

  // Views / Templates
  if (parts.includes("views") || parts.includes("view") ||
      parts.includes("templates") || parts.includes("template")) {
    return "view";
  }

  // Migrations
  if (parts.includes("migrations") || parts.includes("migrate") ||
      nameNoExt.startsWith("migrate") || nameNoExt.includes("migration")) {
    return "migration";
  }

  // Scripts / CLI
  if (parts.includes("scripts") || parts.includes("bin") || parts.includes("cmd") ||
      nameNoExt === "main" || nameNoExt === "cli") {
    return "script";
  }

  // Middleware
  if (parts.includes("middleware") || nameNoExt.includes("middleware")) {
    return "middleware";
  }

  // API / Routes
  if (parts.includes("api") || parts.includes("routes") || parts.includes("endpoints") ||
      nameNoExt.endsWith("_routes") || nameNoExt.endsWith("routes") ||
      nameNoExt.endsWith("_api")) {
    return "api";
  }

  // JS/TS-specific continued
  if (JS_TS_EXTENSIONS.has(ext)) {
    if (nameNoExt.startsWith("use") || parts.includes("hooks") || parts.includes("hook")) return "hook";
    if (nameNoExt.includes("store") || nameNoExt.includes("slice") ||
        parts.includes("stores") || parts.includes("store")) return "store";
    if (parts.includes("components") || parts.includes("component") || parts.includes("ui")) return "component";
  }

  // Util / Helpers / Lib
  if (parts.includes("lib") || parts.includes("utils") || parts.includes("helpers") ||
      parts.includes("util") || parts.includes("pkg") || parts.includes("internal") ||
      parts.includes("common") || parts.includes("shared")) {
    return "util";
  }

  return "other";
}

// ─── Description builder (language-aware) ────────────────────────────────────

function describeFile(absPath: string, relPath: string): string {
  const content = readFile(absPath, 120);
  if (!content) return describeFromPath(relPath);

  const ext = extname(relPath).toLowerCase();
  const parts = relPath.split("/").filter(Boolean);
  const nameNoExt = basename(relPath).replace(/\.[^.]+$/, "").toLowerCase();

  const SKIP = new Set(["app", "src", "pages", "routes", "lib", "."]);
  const contextParts = parts.slice(0, -1).filter((s) => !SKIP.has(s.toLowerCase())).map(humanize).filter(Boolean);

  // ── 1. JSDoc / doc comment ──
  const commentPatterns = [
    /\/\*\*\s*([\s\S]*?)\*\//,       // /** ... */ (JS/TS, Java, Kotlin, C, Go, Rust, PHP, Dart, Scala)
    /"""\s*([\s\S]*?)"""/,             // """ ... """ (Python docstring)
    /'''[\s\S]*?'''/,                  // ''' ... ''' (Python docstring)
    /\/\/\/\s*(.+)/,                   // /// ... (Rust, Swift, Dart, Zig)
    /##\s*(.+)/,                       // ## ... (Ruby, Elixir)
    /--\[\[[\s\S]*?\]\]/,             // --[[ ... ]] (Lua)
  ];

  for (const pat of commentPatterns) {
    const match = content.match(pat);
    if (match?.[1]) {
      const doc = match[1]
        .replace(/^\s*[*#\-\/]\s?/gm, "")
        .replace(/@\w+.*$/gm, "")
        .trim()
        .split("\n")[0]
        ?.trim();
      if (doc && doc.length > 15 && /[a-z]/.test(doc) && !doc.includes("──")) {
        return capitalize(doc.replace(/\.$/, "") + ".");
      }
    }
  }

  // ── 2. First prose comment in lines 1-3 ──
  const commentLinePatterns = [
    /^\s*\/\/\s*(.{15,})/,    // // comment (JS, TS, Go, Rust, Java, Kotlin, Swift, C, C#, Dart, Scala, Zig)
    /^\s*#\s*(.{15,})/,       // # comment (Python, Ruby, Elixir, PHP shell)
    /^\s*--\s*(.{15,})/,      // -- comment (Lua)
  ];

  for (const line of content.split("\n").slice(0, 3)) {
    for (const pat of commentLinePatterns) {
      const c = line.match(pat)?.[1]?.trim();
      if (c && /[a-z]/.test(c) && !c.includes("──") && !c.includes("===") &&
          !c.startsWith("@") && !c.includes("eslint") && !c.startsWith("import") &&
          !c.startsWith("!") && !c.includes("coding:") && !c.includes("frozen_string")) {
        return capitalize(c.replace(/\.$/, "") + ".");
      }
    }
  }

  // ── 3. JS/TS-specific patterns ──
  if (JS_TS_EXTENSIONS.has(ext)) {
    return describeJsTsFile(content, relPath, nameNoExt, contextParts);
  }

  // ── 4. Language-specific patterns ──
  const category = detectCategory(relPath);

  // Python
  if (ext === ".py") {
    if (nameNoExt === "__init__") return `Package initializer for ${contextParts.at(-1) || "this module"}.`;
    if (nameNoExt === "__main__") return `Entry point for running ${contextParts.at(-1) || "this package"} as a script.`;
    if (nameNoExt === "manage") return "Django management script.";
    if (nameNoExt === "wsgi" || nameNoExt === "asgi") return `WSGI/ASGI application entry point.`;
    if (nameNoExt === "urls") return `URL routing configuration for ${contextParts.at(-1) || "the app"}.`;
    if (nameNoExt === "admin") return `Django admin configuration for ${contextParts.at(-1) || "this app"}.`;
    if (nameNoExt === "serializers") return `API serializers for ${contextParts.at(-1) || "this app"}.`;
  }

  // Go
  if (ext === ".go") {
    if (nameNoExt === "main") return "Application entry point.";
    const pkg = content.match(/^package\s+(\w+)/m)?.[1];
    if (pkg === "main") return `Main executable — ${contextParts.at(-1) || "command"}.`;
    if (pkg) return `Part of the ${pkg} package${contextParts.length ? ` (${contextParts.at(-1)})` : ""}.`;
  }

  // Rust
  if (ext === ".rs") {
    if (nameNoExt === "main") return "Application entry point (binary crate).";
    if (nameNoExt === "lib") return "Library crate root — public API surface.";
    if (nameNoExt === "mod") return `Module declarations for ${contextParts.at(-1) || "this directory"}.`;
  }

  // Java / Kotlin
  if (ext === ".java" || ext === ".kt" || ext === ".kts") {
    const className = content.match(/(?:class|interface|object|enum)\s+(\w+)/)?.[1];
    if (className) {
      const subject = humanize(className);
      if (category === "controller") return `${capitalize(subject)} — handles incoming requests.`;
      if (category === "service") return `${capitalize(subject)} — business logic.`;
      if (category === "model") return `${capitalize(subject)} — data entity.`;
      return `${capitalize(subject)}.`;
    }
  }

  // Swift
  if (ext === ".swift") {
    const typeName = content.match(/(?:class|struct|enum|protocol|actor)\s+(\w+)/)?.[1];
    if (typeName) return `${capitalize(humanize(typeName))}.`;
  }

  // C / C++
  if ([".c", ".h", ".cpp", ".hpp", ".cc", ".hh", ".cxx", ".hxx"].includes(ext)) {
    if (ext === ".h" || ext === ".hpp" || ext === ".hh" || ext === ".hxx") {
      return `Header file for ${contextParts.at(-1) || humanize(nameNoExt)}.`;
    }
    if (nameNoExt === "main") return "Application entry point.";
  }

  // Ruby
  if (ext === ".rb") {
    if (nameNoExt === "gemfile" || nameNoExt === "rakefile") return `${capitalize(nameNoExt)} — project configuration.`;
    const className = content.match(/class\s+(\w+)/)?.[1];
    if (className) return `${capitalize(humanize(className))}.`;
  }

  // ── 5. Generic fallback ──
  const subject = contextParts.at(-1) || humanize(nameNoExt);
  if (category === "model") return `Data model for ${subject}.`;
  if (category === "controller") return `Request handler for ${subject}.`;
  if (category === "service") return `Business logic for ${subject}.`;
  if (category === "migration") return `Database migration for ${subject}.`;
  if (category === "view") return `View template for ${subject}.`;
  if (category === "middleware") return `Middleware for ${subject}.`;
  if (category === "api") return `API endpoint for ${subject}.`;

  return `${capitalize(subject)}.`;
}

/** JS/TS-specific description builder (original logic). */
function describeJsTsFile(content: string, relPath: string, nameNoExt: string, contextParts: string[]): string {
  const imports = [...content.matchAll(/from ['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const uses = {
    auth:   imports.some((i) => i.includes("clerk") || i === "next-auth" || i.startsWith("next-auth/") || i.includes("@auth/")),
    ai:     imports.some((i) => i === "ai" || i.startsWith("@ai-sdk/") || i.includes("openai") || i.includes("anthropic")),
    db:     imports.some((i) => i.includes("prisma") || i.includes("@prisma") || i.includes("drizzle") || i.includes("neon")),
    stripe: imports.some((i) => i.includes("stripe")),
    email:  imports.some((i) => i.includes("resend") || i.includes("nodemailer") || i.includes("sendgrid")),
    form:   imports.some((i) => i.includes("react-hook-form") || i.includes("formik")),
  };

  if (nameNoExt === "page" || nameNoExt === "index") {
    const headings = extractHeadings(content);
    const actions  = extractActions(content);
    let desc = "";
    if (headings.length > 0) desc = `Shows the "${headings[0]}" screen`;
    else {
      const area = contextParts.slice(-2).map(capitalize).join(" › ") || "this section";
      desc = `The screen users see for ${area}`;
    }
    if (actions.length > 0) desc += `. Users can ${actions.map((a) => a.toLowerCase()).join(", ")}.`;
    else desc += ".";
    if (uses.auth) desc += " Sign-in required.";
    return desc;
  }

  if (nameNoExt === "route") {
    const methods = extractHttpMethods(content);
    const area = contextParts.filter((s) => s !== "api").slice(-2).join(" › ") || "this feature";
    if (methods.includes("POST") && uses.ai) return `Receives a request from the app and asks the AI for a response${area !== "this feature" ? ` (${area})` : ""}.`;
    if (methods.includes("POST") && uses.db) return `Saves data to the database when triggered${area !== "this feature" ? ` for ${area}` : ""}.`;
    if (methods.includes("POST") && uses.stripe) return `Handles payment processing${area !== "this feature" ? ` for ${area}` : ""}.`;
    if (methods.includes("POST") && uses.email) return `Sends an email when triggered${area !== "this feature" ? ` for ${area}` : ""}.`;
    if (methods.includes("GET") && uses.db) return `Fetches data from the database${area !== "this feature" ? ` for ${area}` : ""} and returns it to the app.`;
    if (methods.includes("GET")) return `Returns data to the app${area !== "this feature" ? ` for ${area}` : ""}.`;
    if (methods.includes("POST")) return `Processes a request from the app${area !== "this feature" ? ` for ${area}` : ""}.`;
    return `Back-end handler for ${area}.`;
  }

  if (nameNoExt === "layout") {
    const area = contextParts.length > 0 ? `the ${contextParts.slice(-1)[0]} section` : "every page";
    return `Shared frame that wraps ${area} — handles navigation, fonts, and shared UI.`;
  }

  if (nameNoExt.startsWith("use") || nameNoExt.includes("hook")) {
    const name = humanize(nameNoExt.replace(/[-_]?hook$/i, ""));
    return `Reusable logic for ${name || contextParts.at(-1) || "this feature"} — shared by multiple screens without duplicating code.`;
  }

  if (nameNoExt.includes("store") || nameNoExt.includes("slice") || relPath.includes("/stores/")) {
    const name = humanize(nameNoExt.replace(/[-_]?(store|slice)$/i, "")) || contextParts.at(-1) || "app";
    return `Holds and manages ${name} data while the app is running. Screens read from and write to this to stay in sync.`;
  }

  if (nameNoExt === "types" || nameNoExt === "type" || nameNoExt.endsWith(".types")) {
    const area = contextParts.at(-1) || "shared";
    return `Defines the shape of ${area} data — like a blueprint that tells the code what fields to expect.`;
  }

  if (nameNoExt.includes("config") || nameNoExt.endsWith(".config")) {
    return `Configuration file — sets up rules and options for ${contextParts.at(-1) || "the project"}.`;
  }

  const defaultFn = content.match(/export default (?:function|class)\s+(\w+)/)?.[1];
  const namedFn   = content.match(/export (?:function|const|class)\s+(\w+)/)?.[1];
  const symbol    = defaultFn ?? namedFn;
  const subject   = symbol ? humanize(symbol) : contextParts.at(-1) ?? nameNoExt;

  const techBits: string[] = [];
  if (uses.ai)     techBits.push("talks to the AI");
  if (uses.db)     techBits.push("reads/writes the database");
  if (uses.stripe) techBits.push("handles payments");
  if (uses.email)  techBits.push("sends emails");

  const tech = techBits.length ? ` — ${techBits.join(", ")}` : "";
  return `${capitalize(subject)}${tech}.`;
}

// ─── JSX extraction (JS/TS only) ────────────────────────────────────────────

function extractHeadings(content: string): string[] {
  const results: string[] = [];
  const meta = content.match(/title:\s*["'`]([^"'`\n]{3,60})["'`]/);
  if (meta?.[1]) results.push(meta[1]);
  for (const m of content.matchAll(/<h[1-2][^>]*>\s*([^<{]{4,60})\s*<\/h[1-2]>/g)) {
    results.push(m[1].trim());
  }
  const titleTag = content.match(/<title>\s*([^<{]{4,60})\s*<\/title>/);
  if (titleTag?.[1]) results.push(titleTag[1].trim());
  return results.filter(Boolean).slice(0, 2);
}

function extractActions(content: string): string[] {
  const results: string[] = [];
  for (const m of content.matchAll(/<(?:Button|button|Link)[^>]*>\s*([A-Z][a-zA-Z ]{3,30})\s*<\//g)) {
    results.push(m[1].trim());
  }
  return [...new Set(results)].slice(0, 3);
}

function extractHttpMethods(content: string): string[] {
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  return methods.filter((m) => new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`).test(content));
}

// ─── Path-only fallback ─────────────────────────────────────────────────────

function describeFromPath(relPath: string): string {
  const parts = relPath.split("/").filter(Boolean);
  const filename = basename(relPath);
  const nameNoExt = filename.replace(/\.[^.]+$/, "").toLowerCase();
  const context = parts.slice(0, -1)
    .filter((s) => !["app", "src", "pages", "."].includes(s.toLowerCase()))
    .map(humanize).filter(Boolean).slice(-2).join(" › ");

  if (nameNoExt === "page")   return `Screen for ${context || "this section"}.`;
  if (nameNoExt === "route")  return `Back-end handler for ${context || "this feature"}.`;
  if (nameNoExt === "layout") return `Shared frame for ${context || "this section"}.`;
  return `${capitalize(humanize(nameNoExt))}${context ? ` (${context})` : ""}.`;
}

// ─── Label builder ──────────────────────────────────────────────────────────

const GENERIC_FILENAMES = new Set(["page", "route", "layout", "index", "loading", "error", "not-found", "template", "main", "__init__", "mod", "lib"]);

function makeLabel(relPath: string): string {
  const parts = relPath.split("/");
  const rawFile = parts.at(-1) ?? "";
  const nameNoExt = rawFile.replace(/\.[^.]+$/, "").toLowerCase();

  if (!GENERIC_FILENAMES.has(nameNoExt)) return rawFile;

  const SKIP_DIRS = new Set(["app", "src", "pages", "routes", "lib", "cmd", "pkg", "internal"]);
  for (let i = parts.length - 2; i >= 0; i--) {
    const seg = parts[i];
    if (!seg.startsWith("[") && !SKIP_DIRS.has(seg.toLowerCase())) {
      return `${seg}/${rawFile}`;
    }
  }
  return rawFile;
}

// ─── Knip dead-code runner (JS/TS only) ──────────────────────────────────────

function runKnip(root: string): { deadFiles: Set<string>; deadExports: Map<string, string[]> } {
  const deadFiles  = new Set<string>();
  const deadExports = new Map<string, string[]>();
  try {
    const output = execSync("npx knip --reporter json 2>/dev/null", { cwd: root, encoding: "utf8", timeout: 60_000 });
    const result = JSON.parse(output) as { files?: string[]; exports?: Record<string, string[]> };
    for (const f of result.files ?? [])                      deadFiles.add(resolve(root, f));
    for (const [f, s] of Object.entries(result.exports ?? {})) deadExports.set(resolve(root, f), s);
  } catch { /* knip not configured — silently skip */ }
  return { deadFiles, deadExports };
}

// ─── Import resolution for non-JS/TS languages ──────────────────────────────

/**
 * Try to resolve a local import string to an actual project file.
 * Returns the resolved relative path or null.
 */
function resolveImport(imp: string, fromFile: string, root: string, projectFiles: Set<string>): string | null {
  const fromDir = dirname(fromFile);

  // Direct relative path (./foo, ../bar)
  if (imp.startsWith("./") || imp.startsWith("../")) {
    const candidates = [
      resolve(root, fromDir, imp),
      // Try with common extensions
      ...ALL_EXTENSIONS.map((ext) => resolve(root, fromDir, imp + ext)),
      ...ALL_EXTENSIONS.map((ext) => resolve(root, fromDir, imp, `index${ext}`)),
    ];

    for (const candidate of candidates) {
      const rel = relative(root, candidate);
      if (projectFiles.has(rel)) return rel;
    }
  }

  // C/C++ includes: resolve "header.h" relative to file
  if (!imp.startsWith("<") && (imp.endsWith(".h") || imp.endsWith(".hpp") || imp.endsWith(".hh") || imp.endsWith(".hxx"))) {
    const candidates = [
      resolve(root, fromDir, imp),
      resolve(root, imp),
      resolve(root, "include", imp),
      resolve(root, "src", imp),
    ];
    for (const candidate of candidates) {
      const rel = relative(root, candidate);
      if (projectFiles.has(rel)) return rel;
    }
  }

  // Rust crate::module / super::module
  if (imp.startsWith("crate::") || imp.startsWith("super::") || imp.startsWith("self::")) {
    const modPath = imp
      .replace(/^crate::/, "")
      .replace(/^super::/, "../")
      .replace(/^self::/, "./")
      .replace(/::/g, "/");

    const base = imp.startsWith("crate::") ? "src" : fromDir;
    const candidates = [
      resolve(root, base, modPath + ".rs"),
      resolve(root, base, modPath, "mod.rs"),
    ];
    for (const candidate of candidates) {
      const rel = relative(root, candidate);
      if (projectFiles.has(rel)) return rel;
    }
  }

  // Python relative import (.module, ..module)
  if (imp.startsWith(".")) {
    const dots = imp.match(/^(\.+)/)?.[0].length ?? 1;
    const modName = imp.slice(dots).replace(/\./g, "/");
    let base = fromDir;
    for (let i = 1; i < dots; i++) base = dirname(base);

    const candidates = modName
      ? [
          resolve(root, base, modName + ".py"),
          resolve(root, base, modName, "__init__.py"),
        ]
      : [resolve(root, base, "__init__.py")];

    for (const candidate of candidates) {
      const rel = relative(root, candidate);
      if (projectFiles.has(rel)) return rel;
    }
  }

  // Zig @import("file.zig")
  if (imp.endsWith(".zig")) {
    const candidates = [
      resolve(root, fromDir, imp),
      resolve(root, "src", imp),
    ];
    for (const candidate of candidates) {
      const rel = relative(root, candidate);
      if (projectFiles.has(rel)) return rel;
    }
  }

  return null;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function analyze(root: string): Promise<GraphData> {
  const absRoot = resolve(root);

  // ── 1. Discover all project files ──
  const allFiles = walkDir(absRoot, absRoot, ALL_KNOWN_EXTENSIONS);
  const projectFiles = new Set(allFiles.map((f) => relative(absRoot, f)));

  const hasJsTs = allFiles.some((f) => JS_TS_EXTENSIONS.has(extname(f).toLowerCase()));
  const nonJsTsFiles = allFiles.filter((f) => !JS_TS_EXTENSIONS.has(extname(f).toLowerCase()));

  // ── 2. JS/TS analysis via madge ──
  let jsDeps: Record<string, string[]> = {};
  let deadFiles = new Set<string>();
  let deadExports = new Map<string, string[]>();

  if (hasJsTs) {
    try {
      const madgeResult = await madge(absRoot, {
        fileExtensions: ["ts", "tsx", "js", "jsx"],
        excludeRegExp: [/node_modules/, /\.test\./, /\.spec\./, /dist\//, /\.next\//, /\.turbo\//, /out\//, /coverage\//],
        detectiveOptions: { ts: { skipTypeImports: true } },
      });
      jsDeps = madgeResult.obj();
    } catch {
      // madge might fail on non-JS projects — that's ok
    }
    ({ deadFiles, deadExports } = runKnip(absRoot));
  }

  // ── 3. Non-JS/TS analysis via custom parsers ──
  const multiLangDeps: Record<string, string[]> = {};

  for (const absFile of nonJsTsFiles) {
    const relFile = relative(absRoot, absFile);
    const ext = extname(absFile).toLowerCase();
    const parsed = parseFile(absFile, ext);
    if (!parsed) continue;

    const resolvedDeps: string[] = [];
    for (const imp of parsed.localImports) {
      const resolved = resolveImport(imp, relFile, absRoot, projectFiles);
      if (resolved) resolvedDeps.push(resolved);
    }

    multiLangDeps[relFile] = resolvedDeps;
  }

  // ── 4. Merge all dependencies ──
  const allDeps = { ...jsDeps, ...multiLangDeps };

  // Also add files that exist but weren't picked up by either analyzer
  for (const relFile of projectFiles) {
    if (!allDeps[relFile]) {
      allDeps[relFile] = [];
    }
  }

  const allImported = new Set(Object.values(allDeps).flat());

  // ── 5. Build graph ──
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const languagesUsed = new Set<string>();

  for (const [file, deps] of Object.entries(allDeps)) {
    const absFile = resolve(absRoot, file);
    const relFile = relative(absRoot, absFile);
    const ext = extname(relFile).toLowerCase();
    const lang = detectLanguage(ext);
    const id = relFile;

    languagesUsed.add(lang);

    const isEntry = !allImported.has(file);
    const isDead  = deadFiles.has(absFile);

    let status: NodeStatus = "live";
    if (isDead)  status = "dead";
    else if (isEntry) status = "entry";

    nodes.push({
      id,
      label:       makeLabel(relFile),
      path:        relFile,
      kind:        "file",
      status,
      category:    detectCategory(relFile),
      loc:         countLines(absFile),
      language:    lang,
      exports:     [],
      deadExports: deadExports.get(absFile) ?? [],
      description: describeFile(absFile, relFile),
    });

    for (const dep of deps) {
      const relDep = relative(absRoot, resolve(absRoot, dep));
      edges.push({ id: `${id}->${relDep}`, source: id, target: relDep });
    }
  }

  const stats = {
    total:   nodes.length,
    live:    nodes.filter((n) => n.status === "live").length,
    dead:    nodes.filter((n) => n.status === "dead").length,
    entries: nodes.filter((n) => n.status === "entry").length,
  };

  return {
    nodes,
    edges,
    stats,
    languages: [...languagesUsed].sort(),
    analyzedAt: new Date().toISOString(),
    root: absRoot,
  };
}
