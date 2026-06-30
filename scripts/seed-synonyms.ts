// 동의어 사전 시드 스크립트
// SEED_SYNONYMS 배열을 DB에 저장
// 실행: bun run /home/z/my-project/scripts/seed-synonyms.ts

import { db } from "../src/lib/db";
import { SEED_SYNONYMS } from "../src/lib/data/synonym-seed";

async function main() {
  console.log("=".repeat(60));
  console.log("동의어 사전 시드");
  console.log("=".repeat(60));

  console.log(`\n📝 ${SEED_SYNONYMS.length}개 동의어 시드 중...`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const seed of SEED_SYNONYMS) {
    try {
      const result = await db.synonym.upsert({
        where: { source: seed.source },
        create: {
          source: seed.source,
          targets: JSON.stringify(seed.targets),
          category: seed.category,
          origin: seed.origin ?? "manual",
          enabled: true,
          autoMeta: seed.autoMeta ? JSON.stringify(seed.autoMeta) : null,
        },
        update: {
          targets: JSON.stringify(seed.targets),
          category: seed.category,
          origin: seed.origin ?? "manual",
        },
      });
      // 신규 생성인지 업데이트인지 구분 (createdAt == updatedAt이면 신규)
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        inserted++;
      } else {
        updated++;
      }
    } catch (e) {
      console.error(`  ❌ ${seed.source}:`, e);
      skipped++;
    }
  }

  console.log(`\n✅ 완료: 신규 ${inserted} / 업데이트 ${updated} / 실패 ${skipped}`);

  // 카테고리별 통계
  const byCategory = await db.synonym.groupBy({
    by: ["category"],
    _count: true,
  });
  console.log("\n📊 카테고리별 분포:");
  for (const c of byCategory) {
    console.log(`   ${c.category}: ${c._count}개`);
  }

  const byOrigin = await db.synonym.groupBy({
    by: ["origin"],
    _count: true,
  });
  console.log("\n📊 출처별 분포:");
  for (const o of byOrigin) {
    console.log(`   ${o.origin}: ${o._count}개`);
  }

  const total = await db.synonym.count();
  const enabled = await db.synonym.count({ where: { enabled: true } });
  console.log(`\n📊 총 ${total}개 동의어 (활성화: ${enabled}개)`);
}

main().catch(console.error).finally(() => process.exit(0));
