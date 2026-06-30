import {
  SOURCE_METADATA,
  getKnowledgeDocsWithMetadata,
  getKnowledgeSourceAudit,
} from "../src/lib/data/knowledge";
import {
  SCHOOLS,
  isSchoolReviewCurrent,
  withSchoolSourceMetadata,
} from "../src/lib/data/schools";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertHttpOrInternal(url: string, label: string) {
  if (url.startsWith("internal://")) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return;
  } catch {}
  fail(`${label} must use http(s) or internal:// URL`);
}

function maxReviewAfterDate(): Date {
  const dates = Object.values(SOURCE_METADATA).map((meta) => new Date(meta.reviewAfter).getTime());
  return new Date(Math.max(...dates) + 24 * 60 * 60 * 1000);
}

for (const [source, meta] of Object.entries(SOURCE_METADATA)) {
  if (!meta.verifiedAt || !meta.reviewAfter) fail(`${source} missing verifiedAt/reviewAfter`);
  assertHttpOrInternal(meta.url, `${source}.url`);
  if (meta.owner === "official" && meta.url.startsWith("internal://")) {
    fail(`${source} is official but points to internal URL`);
  }
  if (new Date(meta.verifiedAt).getTime() > new Date(meta.reviewAfter).getTime()) {
    fail(`${source} reviewAfter must be >= verifiedAt`);
  }
}

const sourceAudit = getKnowledgeSourceAudit();
if (sourceAudit.missingMetadata.length > 0) {
  fail(`RAG sources missing metadata: ${sourceAudit.missingMetadata.join(", ")}`);
}
if (sourceAudit.expiredDocs.length > 0) {
  fail(`RAG docs expired today: ${sourceAudit.expiredDocs.map((doc) => doc.id).join(", ")}`);
}

const afterAllReviews = maxReviewAfterDate();
const futureDocs = getKnowledgeDocsWithMetadata({ referenceDate: afterAllReviews });
if (futureDocs.length !== 0) {
  fail("RAG reviewAfter filtering did not exclude expired documents");
}

const schools = SCHOOLS.map(withSchoolSourceMetadata);
for (const school of schools) {
  if (!school.sourceUrl || !school.verifiedAt || !school.reviewAfter) {
    fail(`${school.id} missing sourceUrl/verifiedAt/reviewAfter`);
  }
  assertHttpOrInternal(school.sourceUrl, `${school.id}.sourceUrl`);
  if (new Date(school.verifiedAt).getTime() > new Date(school.reviewAfter).getTime()) {
    fail(`${school.id} reviewAfter must be >= verifiedAt`);
  }
  if (!isSchoolReviewCurrent(school)) {
    fail(`${school.id} school source review is expired`);
  }
}

console.log("PASS data governance audit");
console.log(`RAG active docs: ${sourceAudit.activeDocs}/${sourceAudit.totalDocs}`);
console.log(`School seed rows current: ${schools.length}/${schools.length}`);
