import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, extname, join, normalize, relative, resolve } from "path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repositoryRoot = process.cwd();
const sourceRoot = join(repositoryRoot, "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function repositoryPath(path: string) {
  return relative(repositoryRoot, path).split("\\").join("/");
}

function importSpecifiers(source: string) {
  const specifiers: string[] = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveSourceImport(importer: string, specifier: string): string | null {
  let candidate: string;
  if (specifier.startsWith("@/")) candidate = join(sourceRoot, specifier.slice(2));
  else if (specifier.startsWith(".")) candidate = resolve(dirname(importer), specifier);
  else return null;

  const candidates = extname(candidate)
    ? [candidate]
    : [
        candidate,
        `${candidate}.ts`,
        `${candidate}.tsx`,
        join(candidate, "index.ts"),
        join(candidate, "index.tsx"),
      ];
  return candidates.find((path) => existsSync(path) && statSync(path).isFile()) || null;
}

const files = sourceFiles(sourceRoot);
const importEdges = files.flatMap((importer) => {
  const source = readFileSync(importer, "utf8");
  return importSpecifiers(source).flatMap((specifier) => {
    const imported = resolveSourceImport(importer, specifier);
    return imported ? [{ importer, imported }] : [];
  });
});

function runtimeImportSpecifiers(source: string) {
  const withoutTypeOnlyImports = source
    .replace(/\bimport\s+type\s+[\s\S]*?from\s+["'][^"']+["'];?/g, "")
    .replace(/\bexport\s+type\s+[\s\S]*?from\s+["'][^"']+["'];?/g, "");
  return importSpecifiers(withoutTypeOnlyImports);
}

const runtimeImports = new Map(files.map((file) => [
  file,
  runtimeImportSpecifiers(readFileSync(file, "utf8")),
]));

function reachableFrom(entries: string[]) {
  const reachable = new Set<string>();
  const parent = new Map<string, string>();
  const pending = [...entries];
  while (pending.length > 0) {
    const importer = pending.pop()!;
    if (reachable.has(importer)) continue;
    reachable.add(importer);
    for (const specifier of runtimeImports.get(importer) || []) {
      const imported = resolveSourceImport(importer, specifier);
      if (imported && !reachable.has(imported)) {
        if (!parent.has(imported)) parent.set(imported, importer);
        pending.push(imported);
      }
    }
  }
  return { reachable, parent };
}

const clientEntries = files.filter((file) => /^\s*["']use client["'];/m.test(readFileSync(file, "utf8")));
const clientGraph = reachableFrom(clientEntries);
const serverRuntimeBoundaryPath = "src/infrastructure/config/runtime-environment.ts";
const clientRuntimeBoundaryViolations = [...clientGraph.reachable]
  .filter((file) => repositoryPath(file) === serverRuntimeBoundaryPath)
  .map((file) => {
    const chain = [file];
    while (clientGraph.parent.has(chain[0])) chain.unshift(clientGraph.parent.get(chain[0])!);
    return chain.map(repositoryPath).join(" -> ");
  });
assert(
  clientRuntimeBoundaryViolations.length === 0,
  `Client dependency graph reaches the server runtime environment boundary:\n${clientRuntimeBoundaryViolations.join("\n")}`,
);

const webReachable = new Set<string>();
const webParent = new Map<string, string>();
const pendingWebModules = files.filter((file) => repositoryPath(file).startsWith("src/app/"));
while (pendingWebModules.length > 0) {
  const importer = pendingWebModules.pop()!;
  if (webReachable.has(importer)) continue;
  webReachable.add(importer);
  for (const specifier of runtimeImports.get(importer) || []) {
    const imported = resolveSourceImport(importer, specifier);
    if (imported && !webReachable.has(imported)) {
      if (!webParent.has(imported)) webParent.set(imported, importer);
      pendingWebModules.push(imported);
    }
  }
}

const forbiddenWebModules = [
  "src/lib/chat/attachment-processing.ts",
  "src/lib/knowledge/source-monitor.ts",
  "src/lib/embeddings/pgvector-rag.ts",
  "src/lib/embeddings/transformer-embedder.ts",
];
const webHeavyModuleViolations = forbiddenWebModules.filter((path) =>
  [...webReachable].some((file) => repositoryPath(file) === path),
);
function webImportPath(targetPath: string) {
  const target = [...webReachable].find((file) => repositoryPath(file) === targetPath);
  if (!target) return targetPath;
  const chain = [target];
  while (webParent.has(chain[0])) chain.unshift(webParent.get(chain[0])!);
  return chain.map(repositoryPath).join(" -> ");
}
assert(
  webHeavyModuleViolations.length === 0,
  `Web delivery graph reaches Worker-owned heavy modules:\n${webHeavyModuleViolations.map(webImportPath).join("\n")}`,
);

const forbiddenWebPackages = ["pdf-parse", "@huggingface/transformers"];
const webHeavyPackageViolations = [...webReachable].flatMap((file) =>
  (runtimeImports.get(file) || [])
    .filter((specifier) => forbiddenWebPackages.includes(specifier))
    .map((specifier) => `${repositoryPath(file)} -> ${specifier}`),
);
assert(
  webHeavyPackageViolations.length === 0,
  `Web delivery graph imports Worker-owned packages:\n${webHeavyPackageViolations.join("\n")}`,
);

function edgeKey(edge: { importer: string; imported: string }) {
  return `${repositoryPath(edge.importer)} -> ${repositoryPath(edge.imported)}`;
}

const routeToRoute = new Set(
  importEdges
    .filter(({ importer, imported }) => importer.endsWith("/route.ts") && imported.endsWith("/route.ts"))
    .map(edgeKey),
);

// Phase 0 freezes the current debt. Phase 1 must remove these entries as the
// application use cases replace route-to-route composition. Any new edge fails.
const allowedRouteToRoute = new Set([
]);

function isPublicModule(path: string) {
  const normalizedPath = normalize(path);
  return normalizedPath.includes(`${join("src", "app", "[locale]")}`)
    || normalizedPath.includes(`${join("src", "components", "kbridge")}`);
}

function isAdminModule(path: string) {
  const normalizedPath = repositoryPath(path);
  return normalizedPath.startsWith("src/app/admin/")
    || normalizedPath.startsWith("src/components/admin/")
    || normalizedPath.startsWith("src/components/admin-leads/")
    || normalizedPath === "src/components/kbridge/Admin.tsx";
}

const publicToAdmin = new Set(
  importEdges
    .filter(({ importer, imported }) => isPublicModule(importer) && !isAdminModule(importer) && isAdminModule(imported))
    .map(edgeKey),
);

const allowedPublicToAdmin = new Set([
]);

function compareBoundary(name: string, actual: Set<string>, allowed: Set<string>) {
  const unexpected = [...actual].filter((edge) => !allowed.has(edge));
  const stale = [...allowed].filter((edge) => !actual.has(edge));
  assert(
    unexpected.length === 0 && stale.length === 0,
    [
      `${name} boundary changed without updating the architecture baseline.`,
      ...unexpected.map((edge) => `unexpected: ${edge}`),
      ...stale.map((edge) => `remove stale baseline: ${edge}`),
    ].join("\n"),
  );
}

compareBoundary("route-to-route", routeToRoute, allowedRouteToRoute);
compareBoundary("public-to-admin", publicToAdmin, allowedPublicToAdmin);

const serviceRoleClientCreators = files
  .filter((file) => {
    const source = readFileSync(file, "utf8");
    return source.includes("SUPABASE_SERVICE_ROLE_KEY")
      && /\bcreateClient\s*\(/.test(source);
  })
  .map(repositoryPath);
assert(
  serviceRoleClientCreators.length === 1
    && serviceRoleClientCreators[0] === "src/infrastructure/supabase/service-role-client.ts",
  `service-role Supabase clients must be created only at the infrastructure boundary:\n${serviceRoleClientCreators.join("\n")}`,
);

const rawEnvironmentReaders = files
  .filter((file) => /\bprocess\.env\b/.test(readFileSync(file, "utf8")))
  .map(repositoryPath)
  .sort();
const allowedRawEnvironmentReaders = [
  "src/infrastructure/config/build-environment.ts",
  serverRuntimeBoundaryPath,
].sort();
assert(
  JSON.stringify(rawEnvironmentReaders) === JSON.stringify(allowedRawEnvironmentReaders),
  `Raw process.env access must stay inside the typed configuration boundary:\n${rawEnvironmentReaders.join("\n")}`,
);

const domainAndApplicationFiles = files.filter((file) => {
  const path = repositoryPath(file);
  return path.startsWith("src/domain/") || path.startsWith("src/application/");
});
const directEnvironmentReads = domainAndApplicationFiles
  .filter((file) => /\bprocess\.env\b/.test(readFileSync(file, "utf8")))
  .map(repositoryPath);
assert(
  directEnvironmentReads.length === 0,
  `Application/Domain code must receive typed configuration instead of reading process.env:\n${directEnvironmentReads.join("\n")}`,
);

const adapterFiles = files.filter((file) => repositoryPath(file).startsWith("src/adapters/"));
const adapterEnvironmentReads = adapterFiles
  .filter((file) => /\bprocess\.env\b/.test(readFileSync(file, "utf8")))
  .map(repositoryPath);
assert(
  adapterEnvironmentReads.length === 0,
  `HTTP/transport adapters must receive runtime settings from typed infrastructure config:\n${adapterEnvironmentReads.join("\n")}`,
);

const forbiddenFrameworkPackages = ["next", "next/", "@prisma/client", "@supabase/"];
const frameworkImportViolations = domainAndApplicationFiles.flatMap((file) =>
  (runtimeImports.get(file) || [])
    .filter((specifier) => forbiddenFrameworkPackages.some((prefix) => specifier === prefix || specifier.startsWith(prefix)))
    .map((specifier) => `${repositoryPath(file)} -> ${specifier}`),
);
assert(
  frameworkImportViolations.length === 0,
  `Application/Domain code imports a delivery or persistence framework:\n${frameworkImportViolations.join("\n")}`,
);

const serviceRoleBoundaryViolations = domainAndApplicationFiles
  .filter((file) => /SUPABASE_SERVICE_ROLE_KEY|service-role-client/.test(readFileSync(file, "utf8")))
  .map(repositoryPath);
assert(
  serviceRoleBoundaryViolations.length === 0,
  `Application/Domain code references service-role capabilities:\n${serviceRoleBoundaryViolations.join("\n")}`,
);

console.log(
  `PASS architecture boundaries: ${routeToRoute.size} route debt edge(s), ${publicToAdmin.size} public/admin debt edge(s), one service-role client factory, ${rawEnvironmentReaders.length} typed raw-env boundaries, ${clientEntries.length} client roots isolated from server env, ${domainAndApplicationFiles.length} Application/Domain modules free of framework/env/service-role reads, ${adapterFiles.length} adapters free of direct env reads, ${webReachable.size} Web modules free of Worker-heavy dependencies`,
);
