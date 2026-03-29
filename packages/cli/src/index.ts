#!/usr/bin/env node
import { analyze } from "./analyze.js";
import { startServer } from "./server.js";
import pc from "picocolors";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const targetDir = args.find((a) => !a.startsWith("--")) ?? ".";
const port = Number(args.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 3456);

async function main() {
  const root = process.cwd();

  if (!jsonMode) {
    console.log(pc.bold(pc.cyan("codeprint")) + pc.dim(" — analyzing codebase..."));
  }

  let graph;
  try {
    graph = await analyze(root);
  } catch (err) {
    if (jsonMode) {
      console.error(JSON.stringify({ error: String(err) }));
    } else {
      console.error(pc.red("Analysis failed:"), String(err));
    }
    process.exit(1);
  }

  if (jsonMode) {
    console.log(JSON.stringify(graph, null, 2));
    return;
  }

  const { stats } = graph;
  console.log(
    `  ${pc.green(`${stats.entries} entries`)}  ` +
    `${pc.blue(`${stats.live} live`)}  ` +
    `${pc.red(`${stats.dead} dead`)}  ` +
    `${pc.dim(`${stats.total} total files`)}`
  );

  const url = await startServer(graph, port);

  console.log(`\n  ${pc.bold("Open")} ${pc.underline(pc.cyan(url))}\n`);

  try {
    const { default: open } = await import("open");
    await open(url);
  } catch {
    // silently skip if open fails
  }

  // Keep process alive
  process.on("SIGINT", () => {
    console.log(pc.dim("\ncodeprint stopped."));
    process.exit(0);
  });
}

main();
