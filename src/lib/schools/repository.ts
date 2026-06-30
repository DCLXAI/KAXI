import { db } from "@/lib/db";
import {
  DEFAULT_SCHOOL_REVIEW_AFTER,
  DEFAULT_SCHOOL_VERIFIED_AT,
  SCHOOLS,
  filterSchools,
  withSchoolSourceMetadata,
  type Accreditation,
  type Program,
  type School,
} from "@/lib/data/schools";

type LangKey = "ko" | "vi" | "mn" | "en";

export interface SchoolFilters {
  region?: string;
  program?: string;
  accreditation?: string;
  maxTuition?: number;
}

export interface SchoolMutationInput {
  id?: string;
  name?: Partial<Record<LangKey, string>>;
  region?: string;
  program?: string;
  tuitionPerSemester?: number;
  dormitoryAvailable?: boolean;
  dormitoryCost?: number | null;
  koreanRequirement?: string;
  accreditation?: Accreditation;
  topikLevel?: number | null;
  intake?: string[];
  officialUrl?: string;
  sourceUrl?: string;
  verifiedAt?: string;
  reviewAfter?: string;
  notes?: Partial<Record<LangKey, string>>;
}

const REGIONS = new Set(["seoul", "gyeonggi", "busan", "daegu", "gwangju", "other"]);
const PROGRAMS = new Set<Program>(["language", "college", "university", "graduate", "vocational"]);
const ACCREDITATIONS = new Set<Accreditation>(["accredited", "standard", "caution"]);

function dateOnly(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function parseDate(value: unknown, fallback: string): Date {
  const parsed = new Date(typeof value === "string" && value ? value : fallback);
  if (Number.isNaN(parsed.getTime())) return new Date(fallback);
  return parsed;
}

function parseIntake(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapDbSchool(school: {
  id: string;
  nameKo: string;
  nameVi: string;
  nameMn: string;
  nameEn: string;
  region: string;
  program: string;
  tuitionPerSemester: number;
  dormitoryAvailable: boolean;
  dormitoryCost: number | null;
  koreanRequirement: string;
  accreditation: string;
  topikLevel: number | null;
  intake: string;
  officialUrl: string;
  sourceUrl: string;
  verifiedAt: Date;
  reviewAfter: Date;
  notesKo: string;
  notesVi: string;
  notesMn: string;
  notesEn: string;
}): School {
  return {
    id: school.id,
    name: {
      ko: school.nameKo,
      vi: school.nameVi,
      mn: school.nameMn,
      en: school.nameEn,
    },
    region: school.region as School["region"],
    program: school.program as Program,
    tuitionPerSemester: school.tuitionPerSemester,
    dormitoryAvailable: school.dormitoryAvailable,
    dormitoryCost: school.dormitoryCost,
    koreanRequirement: school.koreanRequirement,
    accreditation: school.accreditation as Accreditation,
    topikLevel: school.topikLevel,
    intake: parseIntake(school.intake),
    officialUrl: school.officialUrl,
    sourceUrl: school.sourceUrl || school.officialUrl,
    verifiedAt: dateOnly(school.verifiedAt),
    reviewAfter: dateOnly(school.reviewAfter),
    notes: {
      ko: school.notesKo,
      vi: school.notesVi,
      mn: school.notesMn,
      en: school.notesEn,
    },
  };
}

function staticSchools(filters: SchoolFilters = {}): School[] {
  return filterSchools(filters).map(withSchoolSourceMetadata);
}

function buildWhere(filters: SchoolFilters) {
  const where: Record<string, unknown> = {};
  if (filters.region && filters.region !== "all") where.region = filters.region;
  if (filters.program && filters.program !== "all") where.program = filters.program;
  if (filters.accreditation && filters.accreditation !== "all") {
    where.accreditation = filters.accreditation;
  }
  if (Number.isFinite(filters.maxTuition) && filters.maxTuition && filters.maxTuition > 0) {
    where.tuitionPerSemester = { lte: filters.maxTuition };
  }
  return where;
}

export async function listSchools(filters: SchoolFilters = {}): Promise<School[]> {
  try {
    const rows = await db.school.findMany({
      where: buildWhere(filters),
      orderBy: [{ accreditation: "asc" }, { region: "asc" }, { tuitionPerSemester: "asc" }],
    });
    if (rows.length > 0) return rows.map(mapDbSchool);
  } catch (err) {
    console.warn("[schools:list fallback]", err instanceof Error ? err.message : err);
  }

  return staticSchools(filters);
}

export async function findSchoolById(id: string): Promise<School | null> {
  try {
    const row = await db.school.findUnique({ where: { id } });
    if (row) return mapDbSchool(row);
  } catch (err) {
    console.warn("[schools:find fallback]", err instanceof Error ? err.message : err);
  }
  return staticSchools().find((school) => school.id === id) || null;
}

export function normalizeSchoolPayload(
  input: SchoolMutationInput,
  mode: "create" | "update"
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const requireValue = (value: unknown, label: string) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new Error(`Missing required field: ${label}`);
    }
    return value;
  };

  if (mode === "create") data.id = String(requireValue(input.id, "id")).trim();

  const name = input.name || {};
  const notes = input.notes || {};
  for (const lang of ["ko", "vi", "mn", "en"] as const) {
    const nameValue = name[lang];
    const noteValue = notes[lang];
    if (mode === "create" || nameValue !== undefined) {
      data[`name${lang.toUpperCase().slice(0, 1)}${lang.slice(1)}`] = String(
        mode === "create" ? requireValue(nameValue, `name.${lang}`) : nameValue
      ).trim();
    }
    if (mode === "create" || noteValue !== undefined) {
      data[`notes${lang.toUpperCase().slice(0, 1)}${lang.slice(1)}`] = String(
        mode === "create" ? requireValue(noteValue, `notes.${lang}`) : noteValue
      ).trim();
    }
  }

  if (mode === "create" || input.region !== undefined) {
    const region = String(mode === "create" ? requireValue(input.region, "region") : input.region);
    if (!REGIONS.has(region)) throw new Error("Invalid region");
    data.region = region;
  }
  if (mode === "create" || input.program !== undefined) {
    const program = String(mode === "create" ? requireValue(input.program, "program") : input.program);
    if (!PROGRAMS.has(program as Program)) throw new Error("Invalid program");
    data.program = program;
  }
  if (mode === "create" || input.accreditation !== undefined) {
    const accreditation = String(
      mode === "create" ? requireValue(input.accreditation, "accreditation") : input.accreditation
    );
    if (!ACCREDITATIONS.has(accreditation as Accreditation)) throw new Error("Invalid accreditation");
    data.accreditation = accreditation;
  }

  if (mode === "create" || input.tuitionPerSemester !== undefined) {
    const tuition = Number(
      mode === "create"
        ? requireValue(input.tuitionPerSemester, "tuitionPerSemester")
        : input.tuitionPerSemester
    );
    if (!Number.isFinite(tuition) || tuition < 0) throw new Error("Invalid tuitionPerSemester");
    data.tuitionPerSemester = Math.round(tuition);
  }

  for (const field of ["dormitoryCost", "topikLevel"] as const) {
    if (mode === "create" || input[field] !== undefined) {
      const raw = input[field];
      if (raw === null || raw === undefined) {
        data[field] = null;
        continue;
      }
      const value = Number(raw);
      data[field] = Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
    }
  }

  if (mode === "create" || input.dormitoryAvailable !== undefined) {
    data.dormitoryAvailable = Boolean(input.dormitoryAvailable);
  }
  if (mode === "create" || input.koreanRequirement !== undefined) {
    data.koreanRequirement = String(
      mode === "create" ? requireValue(input.koreanRequirement, "koreanRequirement") : input.koreanRequirement
    ).trim();
  }
  if (mode === "create" || input.intake !== undefined) {
    data.intake = JSON.stringify(Array.isArray(input.intake) ? input.intake.map(String) : []);
  }
  if (mode === "create" || input.officialUrl !== undefined) {
    data.officialUrl = String(
      mode === "create" ? requireValue(input.officialUrl, "officialUrl") : input.officialUrl
    ).trim();
  }
  if (mode === "create" || input.sourceUrl !== undefined) {
    data.sourceUrl = String(input.sourceUrl || input.officialUrl || "").trim();
  }
  if (mode === "create" || input.verifiedAt !== undefined) {
    data.verifiedAt = parseDate(input.verifiedAt, DEFAULT_SCHOOL_VERIFIED_AT);
  }
  if (mode === "create" || input.reviewAfter !== undefined) {
    data.reviewAfter = parseDate(input.reviewAfter, DEFAULT_SCHOOL_REVIEW_AFTER);
  }

  return data;
}
