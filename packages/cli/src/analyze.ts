import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import madge from "madge";
import type { GraphData, GraphNode, GraphEdge, NodeStatus, NodeCategory } from "./types.js";

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

// ─── Category detection ──────────────────────────────────────────────────────

export function detectCategory(relPath: string): NodeCategory {
  const parts = relPath.toLowerCase().split("/");
  const filename = (parts.at(-1) ?? "").replace(/\.(ts|tsx|js|jsx)$/, "");

  if (filename === "page") return "page";
  if (filename === "route") return "api";
  if (filename === "layout") return "layout";
  if (filename === "loading" || filename === "error" || filename === "not-found") return "page";
  if (filename === "middleware" || filename === "proxy") return "middleware";
  if (filename === "types" || filename === "type" || filename.endsWith(".types")) return "type";
  if (filename.includes("config") || filename.endsWith(".config")) return "config";
  if (filename.startsWith("use") || parts.includes("hooks") || parts.includes("hook")) return "hook";
  if (filename.includes("store") || filename.includes("slice") || parts.includes("stores") || parts.includes("store")) return "store";
  if (parts.includes("components") || parts.includes("component") || parts.includes("ui")) return "component";
  if (parts.includes("lib") || parts.includes("utils") || parts.includes("helpers") || parts.includes("util")) return "util";

  return "other";
}

// ─── JSX / content extraction ────────────────────────────────────────────────

/** Pull visible text from JSX: h1-3, metadata title, page title constants. */
function extractHeadings(content: string): string[] {
  const results: string[] = [];

  // metadata title: title: "Some Title" or title: `Some Title`
  const meta = content.match(/title:\s*["'`]([^"'`\n]{3,60})["'`]/);
  if (meta?.[1]) results.push(meta[1]);

  // <h1>text</h1> or <h2>text</h2>
  for (const m of content.matchAll(/<h[1-2][^>]*>\s*([^<{]{4,60})\s*<\/h[1-2]>/g)) {
    results.push(m[1].trim());
  }

  // <title>text</title>
  const titleTag = content.match(/<title>\s*([^<{]{4,60})\s*<\/title>/);
  if (titleTag?.[1]) results.push(titleTag[1].trim());

  return results.filter(Boolean).slice(0, 2);
}

/** Extract button/CTA text to understand what actions are available. */
function extractActions(content: string): string[] {
  const results: string[] = [];
  for (const m of content.matchAll(/<(?:Button|button|Link)[^>]*>\s*([A-Z][a-zA-Z ]{3,30})\s*<\//g)) {
    results.push(m[1].trim());
  }
  return [...new Set(results)].slice(0, 3);
}

/** Extract HTTP methods from a route file. */
function extractHttpMethods(content: string): string[] {
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  return methods.filter((m) => new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`).test(content));
}

// ─── Description builder ─────────────────────────────────────────────────────

function describeFile(absPath: string, relPath: string): string {
  const content = readFile(absPath, 120);
  if (!content) return describeFromPath(relPath);

  const parts = relPath.split("/").filter(Boolean);
  const filename = (parts.at(-1) ?? "").replace(/\.(ts|tsx|js|jsx)$/, "").toLowerCase();

  // Strip generic wrapper dirs for context
  const SKIP = new Set(["app", "src", "pages", "routes", "."]);
  const contextParts = parts.slice(0, -1).filter((s) => !SKIP.has(s.toLowerCase())).map(humanize).filter(Boolean);

  // ── 1. JSDoc/file-level comment before any code ──
  const firstCodePos = content.search(/^(?:import |export |const |function |class )/m);
  const jsdocPos = content.search(/\/\*\*/);
  if (jsdocPos !== -1 && (firstCodePos === -1 || jsdocPos < firstCodePos)) {
    const jsdoc = content.match(/\/\*\*\s*([\s\S]*?)\*\//)?.[1]
      ?.replace(/^\s*\*\s?/gm, "")
      .replace(/@\w+.*$/gm, "")
      .trim()
      .split("\n")[0]
      ?.trim();
    if (jsdoc && jsdoc.length > 20 && /[a-z]/.test(jsdoc) && !jsdoc.includes("──")) {
      return capitalize(jsdoc.replace(/\.$/, "") + ".");
    }
  }

  // First comment in lines 1-3, only if it reads like prose (not a divider/directive)
  for (const line of content.split("\n").slice(0, 3)) {
    const c = line.match(/^\s*\/\/\s*(.{20,})/)?.[1]?.trim();
    if (c && /[a-z]/.test(c) && !c.includes("──") && !c.includes("===") && !c.startsWith("@") && !c.includes("eslint") && !c.startsWith("import")) {
      return capitalize(c.replace(/\.$/, "") + ".");
    }
  }

  // ── 2. Import signals ──
  const imports = [...content.matchAll(/from ['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const uses = {
    auth:   imports.some((i) => i.includes("clerk") || i === "next-auth" || i.startsWith("next-auth/") || i.includes("@auth/")),
    ai:     imports.some((i) => i === "ai" || i.startsWith("@ai-sdk/") || i.includes("openai") || i.includes("anthropic")),
    db:     imports.some((i) => i.includes("prisma") || i.includes("@prisma") || i.includes("drizzle") || i.includes("neon")),
    stripe: imports.some((i) => i.includes("stripe")),
    email:  imports.some((i) => i.includes("resend") || i.includes("nodemailer") || i.includes("sendgrid")),
    form:   imports.some((i) => i.includes("react-hook-form") || i.includes("formik")),
  };

  // ── 3. Page files ──
  if (filename === "page" || filename === "index") {
    const headings = extractHeadings(content);
    const actions  = extractActions(content);

    let desc = "";
    if (headings.length > 0) {
      desc = `Shows the "${headings[0]}" screen`;
    } else {
      const area = contextParts.slice(-2).map(capitalize).join(" › ") || "this section";
      desc = `The screen users see for ${area}`;
    }

    if (actions.length > 0) desc += `. Users can ${actions.map((a) => a.toLowerCase()).join(", ")}.`;
    else desc += ".";

    if (uses.auth) desc += " Sign-in required.";
    return desc;
  }

  // ── 4. Route / API files ──
  if (filename === "route") {
    const methods = extractHttpMethods(content);
    const area    = contextParts.filter((s) => s !== "api").slice(-2).join(" › ") || "this feature";

    if (methods.includes("POST") && uses.ai) {
      return `Receives a request from the app and asks the AI for a response${area !== "this feature" ? ` (${area})` : ""}.`;
    }
    if (methods.includes("POST") && uses.db) {
      return `Saves data to the database when triggered${area !== "this feature" ? ` for ${area}` : ""}.`;
    }
    if (methods.includes("POST") && uses.stripe) {
      return `Handles payment processing${area !== "this feature" ? ` for ${area}` : ""}.`;
    }
    if (methods.includes("POST") && uses.email) {
      return `Sends an email when triggered${area !== "this feature" ? ` for ${area}` : ""}.`;
    }
    if (methods.includes("GET") && uses.db) {
      return `Fetches data from the database${area !== "this feature" ? ` for ${area}` : ""} and returns it to the app.`;
    }
    if (methods.includes("GET")) {
      return `Returns data to the app${area !== "this feature" ? ` for ${area}` : ""}.`;
    }
    if (methods.includes("POST")) {
      return `Processes a request from the app${area !== "this feature" ? ` for ${area}` : ""}.`;
    }
    return `Back-end handler for ${area}.`;
  }

  // ── 5. Layout files ──
  if (filename === "layout") {
    const area = contextParts.length > 0 ? `the ${contextParts.slice(-1)[0]} section` : "every page";
    return `Shared frame that wraps ${area} — handles navigation, fonts, and shared UI.`;
  }

  // ── 6. Hooks ──
  if (filename.startsWith("use") || filename.includes("hook")) {
    const name = humanize(filename.replace(/[-_]?hook$/i, ""));
    return `Reusable logic for ${name || contextParts.at(-1) || "this feature"} — shared by multiple screens without duplicating code.`;
  }

  // ── 7. Stores ──
  if (filename.includes("store") || filename.includes("slice") || relPath.includes("/stores/")) {
    const name = humanize(filename.replace(/[-_]?(store|slice)$/i, "")) || contextParts.at(-1) || "app";
    return `Holds and manages ${name} data while the app is running. Screens read from and write to this to stay in sync.`;
  }

  // ── 8. Types ──
  if (filename === "types" || filename === "type" || filename.endsWith(".types")) {
    const area = contextParts.at(-1) || "shared";
    return `Defines the shape of ${area} data — like a blueprint that tells the code what fields to expect.`;
  }

  // ── 9. Config ──
  if (filename.includes("config") || filename.endsWith(".config")) {
    return `Configuration file — sets up rules and options for ${contextParts.at(-1) || "the project"}.`;
  }

  // ── 10. Generic — compose from symbol + signals ──
  const defaultFn = content.match(/export default (?:function|class)\s+(\w+)/)?.[1];
  const namedFn   = content.match(/export (?:function|const|class)\s+(\w+)/)?.[1];
  const symbol    = defaultFn ?? namedFn;
  const subject   = symbol ? humanize(symbol) : contextParts.at(-1) ?? filename;

  const techBits: string[] = [];
  if (uses.ai)     techBits.push("talks to the AI");
  if (uses.db)     techBits.push("reads/writes the database");
  if (uses.stripe) techBits.push("handles payments");
  if (uses.email)  techBits.push("sends emails");

  const tech = techBits.length ? ` — ${techBits.join(", ")}` : "";
  return `${capitalize(subject)}${tech}.`;
}

/** Pure path-based fallback when file is unreadable. */
function describeFromPath(relPath: string): string {
  const parts = relPath.split("/").filter(Boolean);
  const filename = (parts.at(-1) ?? "").replace(/\.(ts|tsx|js|jsx)$/, "").toLowerCase();
  const context = parts.slice(0, -1)
    .filter((s) => !["app", "src", "pages", "."].includes(s.toLowerCase()))
    .map(humanize).filter(Boolean).slice(-2).join(" › ");

  if (filename === "page")   return `Screen for ${context || "this section"}.`;
  if (filename === "route")  return `Back-end handler for ${context || "this feature"}.`;
  if (filename === "layout") return `Shared frame for ${context || "this section"}.`;
  return `${capitalize(humanize(filename))}${context ? ` (${context})` : ""}.`;
}

// ─── Knip dead-code runner ───────────────────────────────────────────────────

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

// ─── Contextual label ────────────────────────────────────────────────────────

const GENERIC_FILENAMES = new Set(["page", "route", "layout", "index", "loading", "error", "not-found", "template"]);

/** For generic filenames (page.tsx, route.ts…) use the nearest meaningful parent dir. */
function makeLabel(relPath: string): string {
  const parts = relPath.split("/");
  const rawFile = parts.at(-1) ?? "";
  const basename = rawFile.replace(/\.(ts|tsx|js|jsx)$/, "").toLowerCase();

  if (!GENERIC_FILENAMES.has(basename)) return rawFile;

  // Walk parent dirs from innermost, skip dynamic [param] and generic wrapper dirs
  const SKIP_DIRS = new Set(["app", "src", "pages", "routes"]);
  for (let i = parts.length - 2; i >= 0; i--) {
    const seg = parts[i];
    if (!seg.startsWith("[") && !SKIP_DIRS.has(seg.toLowerCase())) {
      return `${seg}/${basename}`;
    }
  }
  return rawFile;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function analyze(root: string): Promise<GraphData> {
  const absRoot = resolve(root);

  const madgeResult = await madge(absRoot, {
    fileExtensions: ["ts", "tsx", "js", "jsx"],
    excludeRegExp: [/node_modules/, /\.test\./, /\.spec\./, /dist\//, /\.next\//, /\.turbo\//, /out\//, /coverage\//],
    detectiveOptions: { ts: { skipTypeImports: true } },
  });

  const depMap = madgeResult.obj();
  const { deadFiles, deadExports } = runKnip(absRoot);
  const allImported = new Set(Object.values(depMap).flat());

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[]  = [];

  for (const [file, deps] of Object.entries(depMap)) {
    const absFile = resolve(absRoot, file);
    const relFile = relative(absRoot, absFile);
    const id      = relFile;

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

  return { nodes, edges, stats, analyzedAt: new Date().toISOString(), root: absRoot };
}
