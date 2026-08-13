import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

if (process.env.VERCEL === "1") {
  console.log("[finalize-standalone-build] skipped on Vercel");
  process.exit(0);
}

const root = process.cwd();
const standaloneRoot = join(root, ".next", "standalone");

if (!existsSync(standaloneRoot)) {
  console.error("[finalize-standalone-build] .next/standalone is missing");
  process.exit(1);
}

mkdirSync(join(standaloneRoot, ".next"), { recursive: true });
cpSync(join(root, ".next", "static"), join(standaloneRoot, ".next", "static"), {
  recursive: true,
  force: true,
});
cpSync(join(root, "public"), join(standaloneRoot, "public"), {
  recursive: true,
  force: true,
});

console.log("[finalize-standalone-build] copied static and public assets");
