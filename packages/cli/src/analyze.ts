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
