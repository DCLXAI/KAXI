import { db } from "../src/lib/db";
import { runWorkerCycle } from "../src/worker/runner";

try {
  console.log(JSON.stringify(await runWorkerCycle(), null, 2));
} finally {
  await db.$disconnect();
}
