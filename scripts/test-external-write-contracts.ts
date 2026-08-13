import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import {
  EXTERNAL_WRITE_CONTRACTS,
  validateExternalWriteRequest,
} from "../src/lib/api/external-write-contracts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

const apiRoot = join(process.cwd(), "src/app/api");
const discovered = routeFiles(apiRoot).flatMap((file) => {
  const source = readFileSync(file, "utf8");
  const path = `/api/${relative(apiRoot, file).replace(/\\/g, "/").replace(/\/route\.ts$/, "")}`;
  return [...source.matchAll(/export async function (POST|PUT|PATCH|DELETE)\b/g)]
    .map((match) => `${match[1]} ${path}`);
}).sort();
const registered = EXTERNAL_WRITE_CONTRACTS.map((contract) => `${contract.method} ${contract.path}`).sort();

assert(new Set(registered).size === registered.length, "external write contract inventory contains duplicates");
assert(
  JSON.stringify(discovered) === JSON.stringify(registered),
  [
    "external write contract coverage must be exactly 100%",
    ...discovered.filter((item) => !registered.includes(item)).map((item) => `missing: ${item}`),
    ...registered.filter((item) => !discovered.includes(item)).map((item) => `stale: ${item}`),
  ].join("\n"),
);

const valid = await validateExternalWriteRequest(new Request("http://localhost/api/synonyms", {
  method: "POST",
  headers: { "content-type": "application/json", "x-request-id": "contract-test" },
  body: JSON.stringify({ source: "visa", targets: ["status"] }),
}));
assert(valid === null, "registered valid write should pass transport schema");
const dynamicValid = await validateExternalWriteRequest(new Request("http://localhost/api/schools/school_123", {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ region: "seoul" }),
}));
assert(dynamicValid === null, "dynamic path schema should match a bounded path parameter");

const unknown = await validateExternalWriteRequest(new Request("http://localhost/api/synonyms", {
  method: "POST",
  headers: { "content-type": "application/json", "x-request-id": "contract-test" },
  body: JSON.stringify({ source: "visa", targets: ["status"], secret: "must-not-pass" }),
}));
assert(unknown?.status === 400, "unknown write field should be rejected");
const unknownBody = await unknown.json() as { error?: { code?: string; requestId?: string; issues?: string[] } };
assert(unknownBody.error?.code === "BODY_SCHEMA_INVALID", "unknown write field should use schema error envelope");
assert(unknownBody.error?.requestId === "contract-test", "write error envelope should preserve request ID");
assert(unknownBody.error?.issues?.includes("secret"), "write error should identify the unknown field without echoing its value");

const malformed = await validateExternalWriteRequest(new Request("http://localhost/api/synonyms", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{",
}));
assert(malformed?.status === 400, "malformed JSON should be rejected");

const oversized = await validateExternalWriteRequest(new Request("http://localhost/api/synonyms", {
  method: "POST",
  headers: { "content-type": "application/json", "content-length": "20000" },
  body: "{}",
}));
assert(oversized?.status === 413, "oversized JSON should be rejected before handler parsing");

const unknownQuery = await validateExternalWriteRequest(new Request("http://localhost/api/synonyms?unexpected=true", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ source: "visa", targets: ["status"] }),
}));
assert(unknownQuery?.status === 400, "unknown write query should be rejected");

const chunkedOversized = await validateExternalWriteRequest(new Request("http://localhost/api/documents/upload-direct", {
  method: "PUT",
  body: new Uint8Array(20 * 1024 * 1024 + 1),
}));
assert(chunkedOversized?.status === 413, "binary body cap must apply without a Content-Length header");

console.log(`PASS external write contracts: ${registered.length}/${discovered.length} write methods covered with body/query/path enforcement`);
