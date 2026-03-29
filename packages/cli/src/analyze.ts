import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import madge from "madge";
import type { GraphData, GraphNode, GraphEdge, NodeStatus } from "./types.js";

function countLines(filePath: string): number {
  try {
    const content = readFileSync(filePath, "utf8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

// ─── Plain-English description generator ────────────────────────────────────

function humanize(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\[(.+?)\]/g, "$1") // [sessionId] → sessionId
    .toLowerCase();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Extract a description from file content + path context. */
function describeFile(absPath: string, relPath: string): string {
  let content = "";
  try {
    content = readFileSync(absPath, "utf8").split("\n").slice(0, 80).join("\n");
  } catch {
    return describeFromPath(relPath);
  }

  // 1. JSDoc block comment (/** ... */) — must appear before any import/export
  const jsdocPos = content.search(/\/\*\*/);
  const firstCodePos = content.search(/^(?:import|export|const|function|class)/m);
  if (jsdocPos !== -1 && (firstCodePos === -1 || jsdocPos < firstCodePos)) {
    const jsdoc = content.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
    if (jsdoc) {
      const text = jsdoc[1]
        .replace(/^\s*\*\s?/gm, "")
        .replace(/@\w+.*$/gm, "")
        .trim()
        .split("\n")[0]
        ?.trim();
      if (text && text.length > 20 && !text.includes("──") && !text.includes("===")) {
        return capitalize(text.replace(/\.$/, "") + ".");
      }
    }
  }

  // 2. Leading single-line comment — only in first 3 lines, must read like prose
  const firstLines = content.split("\n").slice(0, 3);
  for (const line of firstLines) {
    const m = line.match(/^\s*\/\/\s*(.{20,})/);
    if (m?.[1]) {
      const c = m[1].trim();
      // Skip decorative dividers (──, ===, ---) and directives
      if (
        c.includes("──") || c.includes("===") || c.includes("---") ||
        c.startsWith("@") || c.includes("eslint") || c.includes("TODO") ||
        c.startsWith("import") || !/[a-z]/.test(c)
      ) continue;
      return capitalize(c.replace(/\.$/, "") + ".");
    }
  }

  // 3. Detect tech signals from imports
  const imports = [...content.matchAll(/from ['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const uses = {
    react: imports.some((i) => i === "react" || i.startsWith("react/")),
    nextNav: imports.some((i) => i === "next/navigation"),
    nextImage: imports.some((i) => i === "next/image"),
    prisma: imports.some((i) => i.includes("prisma") || i.includes("@prisma")),
    auth: imports.some((i) => i.includes("clerk") || i === "next-auth" || i.startsWith("next-auth/") || i.includes("@auth/")),
    ai: imports.some((i) => i === "ai" || i.startsWith("@ai-sdk/") || i.includes("openai") || i.includes("anthropic")),
    stripe: imports.some((i) => i.includes("stripe")),
    zod: imports.some((i) => i.includes("zod")),
    zustand: imports.some((i) => i.includes("zustand")),
    form: imports.some((i) => i.includes("react-hook-form") || i.includes("formik")),
  };

  // 4. Extract main exported symbol name
  const defaultFn = content.match(/export default (?:function|class)\s+(\w+)/)?.[1];
  const namedFn = content.match(/export (?:function|const|class)\s+(\w+)/)?.[1];
  const symbol = defaultFn ?? namedFn;

  // 5. Build description from path + signals
  const segments = relPath.split("/").filter(Boolean);
  const filename = (segments.at(-1) ?? "").replace(/\.(ts|tsx|js|jsx)$/, "").toLowerCase();
  const isPage = filename === "page" || filename === "index";
  const isRoute = filename === "route";
  const isLayout = filename === "layout";
  const isHook = filename.startsWith("use") || filename.includes("hook");
  const isStore = filename.includes("store") || relPath.includes("/stores/");
  const isTypes = filename === "types" || filename === "type";

  // Meaningful path segments (strip generic wrapper dirs)
  const SKIP = new Set(["app", "src", "pages", "routes", "api", "."]);
  const context = segments
    .slice(0, -1)
    .filter((s) => !SKIP.has(s.toLowerCase()))
    .map(humanize)
    .filter(Boolean);

  const contextStr = context.slice(-3).join(" › ");

  if (isRoute) {
    const techHint = uses.ai ? ", using AI to generate responses" : uses.stripe ? ", handling payments" : uses.prisma ? ", reading from the database" : uses.zod ? ", with input validation" : "";
    const area = contextStr || "this feature";
    return `API endpoint that handles server requests for ${area}${techHint}.`;
  }

  if (isPage) {
    const area = contextStr || (symbol ? humanize(symbol) : "this section");
    const techHint = uses.auth ? " Requires the user to be signed in." : "";
    const formHint = uses.form ? " Contains a form for user input." : "";
    return `The page users see for ${area}.${techHint}${formHint}`;
  }

  if (isLayout) {
    const area = contextStr ? `the ${contextStr} section` : "all pages";
    return `Shared layout that wraps ${area} — sets up structure, navigation, and providers.`;
  }

  if (isHook) {
    const name = symbol ? humanize(symbol) : contextStr || filename;
    return `Reusable logic for ${name}. Components call this to share behaviour without duplicating code.`;
  }

  if (isStore) {
    const storeName = humanize(filename.replace(/[-_]?store$/, "").replace(/[-_]?slice$/, "")) || contextStr || "application";
    return `Manages ${storeName} state across the app. Other components read and update data through this store.`;
  }

  if (isTypes) {
    const area = contextStr || (symbol ? humanize(symbol) : "shared");
    return `Type definitions for ${area}. Describes the shape of data used across the codebase.`;
  }

  // Generic file — compose from symbol name + context + tech signals
  const subjectParts: string[] = [];
  if (symbol) subjectParts.push(humanize(symbol));
  else if (contextStr) subjectParts.push(contextStr);
  const subject = subjectParts.join(" for ") || filename;

  const hints: string[] = [];
  if (uses.ai) hints.push("integrates AI");
  if (uses.prisma) hints.push("reads/writes the database");
  if (uses.auth) hints.push("handles authentication");
  if (uses.stripe) hints.push("processes payments");
  if (uses.zod) hints.push("validates input data");

  const hintStr = hints.length ? `. Uses ${hints.join(", ")}.` : ".";
  return `${capitalize(subject)}${hintStr}`;
}

/** Fallback: path-only description when file can't be read. */
function describeFromPath(relPath: string): string {
  const segments = relPath.split("/").filter(Boolean);
  const filename = (segments.at(-1) ?? "").replace(/\.(ts|tsx|js|jsx)$/, "").toLowerCase();
  const context = segments
    .slice(0, -1)
    .filter((s) => !new Set(["app", "src", "pages", "."]).has(s.toLowerCase()))
    .map(humanize)
    .filter(Boolean)
    .slice(-2)
    .join(" › ");

  if (filename === "page") return `Page for ${context || "this section"}.`;
  if (filename === "route") return `API endpoint for ${context || "this feature"}.`;
  if (filename === "layout") return `Layout wrapper for ${context || "this section"}.`;
  return `${capitalize(humanize(filename))}${context ? ` (${context})` : ""}.`;
}

function runKnip(root: string): { deadFiles: Set<string>; deadExports: Map<string, string[]> } {
  const deadFiles = new Set<string>();
  const deadExports = new Map<string, string[]>();

  try {
    const output = execSync("npx knip --reporter json 2>/dev/null", {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
    });

    const result = JSON.parse(output) as {
      files?: string[];
      exports?: Record<string, string[]>;
    };

    for (const f of result.files ?? []) {
      deadFiles.add(resolve(root, f));
    }

    for (const [file, symbols] of Object.entries(result.exports ?? {})) {
      deadExports.set(resolve(root, file), symbols);
    }
  } catch {
    // knip not configured or failed — continue without dead code info
  }

  return { deadFiles, deadExports };
}

export async function analyze(root: string): Promise<GraphData> {
  const absRoot = resolve(root);

  // Build dependency graph via madge
  const madgeResult = await madge(absRoot, {
    fileExtensions: ["ts", "tsx", "js", "jsx"],
    excludeRegExp: [/node_modules/, /\.test\./, /\.spec\./, /dist\//, /\.next\//, /\.turbo\//, /out\//, /coverage\//],
    detectiveOptions: {
      ts: { skipTypeImports: true },
    },
  });

  const depMap = madgeResult.obj(); // { 'src/foo.ts': ['src/bar.ts', ...] }

  // Run knip for dead code detection
  const { deadFiles, deadExports } = runKnip(absRoot);

  // Detect entry points (files that nothing imports)
  const allImported = new Set(Object.values(depMap).flat());

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const [file, deps] of Object.entries(depMap)) {
    const absFile = resolve(absRoot, file);
    const relFile = relative(absRoot, absFile);
    const id = relFile;

    const isEntry = !allImported.has(file);
    const isDead = deadFiles.has(absFile);

    let status: NodeStatus = "live";
    if (isDead) status = "dead";
    else if (isEntry) status = "entry";

    const label = file.split("/").pop() ?? file;

    nodes.push({
      id,
      label,
      path: relFile,
      kind: "file",
      status,
      loc: countLines(absFile),
      exports: [],
      deadExports: deadExports.get(absFile) ?? [],
      description: describeFile(absFile, relFile),
    });

    for (const dep of deps) {
      const relDep = relative(absRoot, resolve(absRoot, dep));
      edges.push({
        id: `${id}->${relDep}`,
        source: id,
        target: relDep,
      });
    }
  }

  const stats = {
    total: nodes.length,
    live: nodes.filter((n) => n.status === "live").length,
    dead: nodes.filter((n) => n.status === "dead").length,
    entries: nodes.filter((n) => n.status === "entry").length,
  };

  return {
    nodes,
    edges,
    stats,
    analyzedAt: new Date().toISOString(),
    root: absRoot,
  };
}
