import { db } from "../src/lib/db";
import { enforcePrivacyRetention } from "../src/lib/privacy/retention";

const dryRun = process.argv.includes("--dry-run");

enforcePrivacyRetention({ dryRun })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error("[enforce-retention]", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
