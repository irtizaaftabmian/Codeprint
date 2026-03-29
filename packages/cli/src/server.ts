import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { GraphData } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function startServer(graph: GraphData, port = 3456): Promise<string> {
  const app = new Hono();

  app.use("*", cors());

  // Serve graph data to the UI
  app.get("/api/graph", (c) => c.json(graph));

  // Serve the built UI (packages/ui/dist)
  const uiDist = resolve(__dirname, "../../ui/dist");
  app.use(
    "/*",
    serveStatic({
      root: uiDist,
    })
  );

  // Fallback to index.html for SPA routing
  app.get("*", async (c) => {
    const { readFileSync } = await import("node:fs");
    try {
      const html = readFileSync(resolve(uiDist, "index.html"), "utf8");
      return c.html(html);
    } catch {
      return c.text("UI not built. Run `pnpm build` in packages/ui first.", 500);
    }
  });

  return new Promise((resolveUrl) => {
    serve({ fetch: app.fetch, port }, () => {
      resolveUrl(`http://localhost:${port}`);
    });
  });
}
