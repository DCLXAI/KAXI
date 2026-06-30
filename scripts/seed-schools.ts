import { db } from "../src/lib/db";
import { SCHOOLS, withSchoolSourceMetadata } from "../src/lib/data/schools";

async function main() {
  let count = 0;

  for (const school of SCHOOLS.map(withSchoolSourceMetadata)) {
    await db.school.upsert({
      where: { id: school.id },
      create: {
        id: school.id,
        nameKo: school.name.ko,
        nameVi: school.name.vi,
        nameMn: school.name.mn,
        nameEn: school.name.en,
        region: school.region,
        program: school.program,
        tuitionPerSemester: school.tuitionPerSemester,
        dormitoryAvailable: school.dormitoryAvailable,
        dormitoryCost: school.dormitoryCost,
        koreanRequirement: school.koreanRequirement,
        accreditation: school.accreditation,
        topikLevel: school.topikLevel,
        intake: JSON.stringify(school.intake),
        officialUrl: school.officialUrl,
        sourceUrl: school.sourceUrl || school.officialUrl,
        verifiedAt: new Date(school.verifiedAt || "2026-06-30"),
        reviewAfter: new Date(school.reviewAfter || "2026-09-30"),
        notesKo: school.notes.ko,
        notesVi: school.notes.vi,
        notesMn: school.notes.mn,
        notesEn: school.notes.en,
      },
      update: {
        nameKo: school.name.ko,
        nameVi: school.name.vi,
        nameMn: school.name.mn,
        nameEn: school.name.en,
        region: school.region,
        program: school.program,
        tuitionPerSemester: school.tuitionPerSemester,
        dormitoryAvailable: school.dormitoryAvailable,
        dormitoryCost: school.dormitoryCost,
        koreanRequirement: school.koreanRequirement,
        accreditation: school.accreditation,
        topikLevel: school.topikLevel,
        intake: JSON.stringify(school.intake),
        officialUrl: school.officialUrl,
        sourceUrl: school.sourceUrl || school.officialUrl,
        verifiedAt: new Date(school.verifiedAt || "2026-06-30"),
        reviewAfter: new Date(school.reviewAfter || "2026-09-30"),
        notesKo: school.notes.ko,
        notesVi: school.notes.vi,
        notesMn: school.notes.mn,
        notesEn: school.notes.en,
      },
    });
    count++;
  }

  console.log(`[seed-schools] upserted ${count} school(s)`);
}

main()
  .catch((err) => {
    console.error("[seed-schools]", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
