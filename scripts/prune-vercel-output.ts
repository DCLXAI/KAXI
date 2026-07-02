import { existsSync, rmSync, statSync, readdirSync } from "fs";
import { join, sep } from "path";

const ROOT = process.cwd();
const DEPLOYMENT_ROOTS = [join(ROOT, ".next", "standalone"), join(ROOT, ".vercel", "output")];
const CACHE_SEGMENTS = [
  `${sep}data${sep}model-cache`,
  `${sep}runtime-artifacts${sep}model-cache`,
];

function shouldPrune(pathname: string): boolean {
  return CACHE_SEGMENTS.some((segment) => pathname.includes(segment));
}

function prunePath(pathname: string): number {
  if (!existsSync(pathname)) return 0;
  rmSync(pathname, { recursive: true, force: true });
  return 1;
}

function walkAndPrune(pathname: string): number {
  if (!existsSync(pathname)) return 0;
  if (shouldPrune(pathname)) return prunePath(pathname);

  const stat = statSync(pathname);
  if (!stat.isDirectory()) return 0;

  let pruned = 0;
  for (const entry of readdirSync(pathname)) {
    pruned += walkAndPrune(join(pathname, entry));
  }
  return pruned;
}

let pruned = 0;
for (const root of DEPLOYMENT_ROOTS) {
  pruned += prunePath(join(root, "data", "model-cache"));
  pruned += prunePath(join(root, "runtime-artifacts", "model-cache"));
  pruned += walkAndPrune(root);
}

if (pruned > 0) {
  console.log(`[prune-vercel-output] removed ${pruned} deployment model cache path(s)`);
}
