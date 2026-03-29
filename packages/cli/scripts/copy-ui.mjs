// Copies packages/ui/dist into packages/cli/dist/public
// so the npm package is self-contained.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uiDist = resolve(__dirname, "../../ui/dist");
const dest = resolve(__dirname, "../dist/public");

if (!existsSync(uiDist)) {
  console.error("UI dist not found. Run `pnpm build` in packages/ui first.");
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(uiDist, dest, { recursive: true });
console.log("  Copied UI dist → dist/public");
