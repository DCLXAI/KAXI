import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";

const root = process.cwd();
const source = existsSync(join(root, "db", "custom.db"))
  ? join(root, "db", "custom.db")
  : join(root, "runtime-artifacts", "db", "custom.db");
const target = join(root, "db", "e2e.db");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`[prepare-e2e-db] ${source} -> ${target}`);
