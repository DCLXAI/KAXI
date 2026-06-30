// ChatLog 데이터 분석 스크립트
import { db } from "../src/lib/db";
import { safeChatQuestionForAnalytics } from "../src/lib/privacy/chat-log";

async function main() {
  const count = await db.chatLog.count();
  console.log(`ChatLog count: ${count}`);

  const recent = await db.chatLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("\n=== 최근 10개 로그 ===");
  for (const log of recent) {
    console.log(`\n[${log.lang}] Q: ${safeChatQuestionForAnalytics(log)}`);
    console.log(`  Source: ${log.source}`);
    try {
      const parsed = JSON.parse(log.retrievedDocs || "{}");
      console.log(`  Retrieved docIds: ${parsed.docIds?.join(", ") ?? "N/A"}`);
      console.log(`  Method: ${parsed.storeMethod ?? "N/A"}`);
      if (parsed.searchMeta?.[0]) {
        const top = parsed.searchMeta[0];
        console.log(`  Top match: ${top.id} (score: ${top.score}, vec: ${top.vectorScore}, kw: ${top.keywordScore})`);
      }
    } catch {
      console.log(`  Retrieved (raw): ${(log.retrievedDocs || "").substring(0, 200)}`);
    }
    console.log(`  Answer: ${log.answer.substring(0, 100)}...`);
  }

  // 언어별 분포
  const byLang = await db.chatLog.groupBy({
    by: ["lang"],
    _count: true,
  });
  console.log("\n=== 언어별 분포 ===");
  console.log(byLang);

  // source 분포
  const bySource = await db.chatLog.groupBy({
    by: ["source"],
    _count: true,
  });
  console.log("\n=== source 분포 ===");
  console.log(bySource);
}

main().catch(console.error).finally(() => process.exit(0));
