import { Hono } from "hono";
import { cors } from "hono/cors";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { GraphData } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".json": "application/json",
  ".ico":  "image/x-icon",
};

export function startServer(graph: GraphData, port = 3456): Promise<string> {
  const bundled = resolve(__dirname, "./public");
  const devFallback = resolve(__dirname, "../../ui/dist");
  const uiDist = existsSync(bundled) ? bundled : devFallback;

  const app = new Hono();
  app.use("*", cors());
  app.get("/api/graph", (c) => c.json(graph));

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost`);

    // API routes go through Hono
    if (url.pathname.startsWith("/api/")) {
      const honoRes = await app.fetch(new Request(`http://localhost${url.pathname}${url.search}`));
      res.writeHead(honoRes.status, { "Content-Type": honoRes.headers.get("content-type") ?? "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(await honoRes.text());
      return;
    }

    // Static files from UI dist
    const safePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = resolve(uiDist, safePath.replace(/^\//, ""));

    if (existsSync(filePath) && !filePath.includes("..")) {
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      res.end(readFileSync(filePath));
      return;
    }

    // SPA fallback
    const indexPath = resolve(uiDist, "index.html");
    if (existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(readFileSync(indexPath));
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("UI not built. Run `pnpm build` first.");
    }
  });

  const MAX_RETRIES = 10;

  return new Promise((resolveUrl, reject) => {
    let attempt = 0;

    function tryListen(p: number) {
      server.removeAllListeners("error");
      server.removeAllListeners("listening");

      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && attempt < MAX_RETRIES) {
          attempt++;
          tryListen(p + 1);
        } else {
          reject(err);
        }
      });

      server.once("listening", () => {
        resolveUrl(`http://localhost:${p}`);
      });

      server.listen({ port: p, exclusive: true });
    }

    tryListen(port);
  });
}
