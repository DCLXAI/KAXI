import { readFileSync } from "fs";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const guardedFiles = [
  "src/lib/ai/zai.ts",
  "src/lib/agent/agent.ts",
  "src/app/api/ai/chat/route.ts",
  "src/app/api/ai/consult/route.ts",
  "src/lib/partners/repository.ts",
  "src/app/api/partner-requests/route.ts",
  "src/lib/privacy/serializers.ts",
];

const violations: string[] = [];

for (const file of guardedFiles) {
  const content = readFileSync(file, "utf8");
  if (/\bas\s+any\b/.test(content)) {
    violations.push(`${file}: avoid \`as any\` in runtime AI/PII boundaries`);
  }
  if (/Record<string,\s*any>/.test(content)) {
    violations.push(`${file}: use unknown or explicit records instead of Record<string, any>`);
  }
  if (/messages:\s*messages\s+as\s+any/.test(content)) {
    violations.push(`${file}: Z.ai messages must use typed ChatMessage arrays`);
  }
}

if (violations.length > 0) {
  fail(["runtime type boundary checks failed", ...violations].join("\n"));
}

console.log("PASS runtime type boundaries");
