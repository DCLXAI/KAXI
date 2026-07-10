import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRef = "fmezsqzeyrbczoffyqln";
const envFile = resolve(process.cwd(), process.env.KAXI_ENV_FILE || ".env.local");
const password = process.env.SUPABASE_DB_PASSWORD;

if (!password?.trim()) {
  throw new Error("SUPABASE_DB_PASSWORD is required. Provide it through a local terminal prompt; do not paste it into chat.");
}

const encodedPassword = encodeURIComponent(password.trim());
const runtimeUrl = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require`;
const directUrl = `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
const markerStart = "# KAXI_REMOTE_SUPABASE_BEGIN";
const markerEnd = "# KAXI_REMOTE_SUPABASE_END";

let existing = "";
try {
  existing = await readFile(envFile, "utf8");
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
}

const markedBlock = new RegExp(`\\n?${markerStart}[\\s\\S]*?${markerEnd}\\n?`, "g");
const preserved = existing.replace(markedBlock, "").trimEnd();
const next = `${preserved}\n\n${markerStart}\nDATABASE_URL="${runtimeUrl}"\nSUPABASE_DIRECT_URL="${directUrl}"\n${markerEnd}\n`;

await writeFile(envFile, next, { mode: 0o600 });
console.log(`Configured Supabase runtime and direct URLs in ${envFile}. Re-run the connection preflight before migrations.`);
