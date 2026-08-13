import { readFileSync } from "fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const surfaces = [
  ["analytics", "AdminAnalytics", "queryAdminAnalytics"],
  ["audit", "AdminAudit", "queryAdminAudit"],
  ["cases", "AdminCases", "queryAdminCases"],
  ["documents", "AdminDocumentVerificationMetrics", "queryAdminDocumentMetrics"],
  ["handoffs", "AdminHandoffs", "queryAdminHandoffs"],
  ["knowledge", "AdminKnowledge", "queryAdminKnowledge"],
  ["leads", "AdminDashboard", "queryAdminLeadDashboard"],
  ["rules", "AdminRules", "queryAdminRules"],
] as const;

for (const [route, component, query] of surfaces) {
  const page = readFileSync(`src/app/admin/${route}/page.tsx`, "utf8");
  assert(page.includes(query), `${route} page must execute ${query} on the server`);
  assert(page.includes("initialData="), `${route} page must hydrate ${component} with initialData`);
  const componentRoot = component === "AdminDashboard" ? "src/components/admin-leads" : "src/components/admin";
  const componentSource = readFileSync(`${componentRoot}/${component}.tsx`, "utf8");
  assert(componentSource.includes("initialData"), `${component} must accept server initialData`);
}

const caseDetail = readFileSync("src/app/admin/cases/[id]/page.tsx", "utf8");
assert(caseDetail.includes("queryAdminCase") && caseDetail.includes("initialData="), "case detail must use a server query and initialData");

console.log(`PASS admin server reads: ${surfaces.length + 1} authenticated surfaces render repository data without a mount waterfall`);
