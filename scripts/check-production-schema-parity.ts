import { db } from "../src/lib/db";
import { checkProductionSchemaParity } from "../src/lib/ops/schema-parity";

try {
  const result = await checkProductionSchemaParity();
  console.log(JSON.stringify({
    ok: result.ok,
    latestMigration: result.latestMigration,
    missing: result.missing,
  }, null, 2));

  if (!result.ok) {
    console.error(`FAIL production schema parity: ${result.detail}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS production schema parity: ${result.latestMigration}`);
  }
} finally {
  await db.$disconnect();
}
