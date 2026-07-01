import { db } from "@/lib/db";
import {
  DEFAULT_SCHOOL_REVIEW_AFTER,
  DEFAULT_SCHOOL_VERIFIED_AT,
  SCHOOLS,
  filterSchools,
  isSchoolReviewCurrent,
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
  query?: string;
  includeExpired?: boolean;
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

export class SchoolOperationalDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchoolOperationalDatabaseError";
  }
}

export function isSchoolOperationalDatabaseError(error: unknown): error is SchoolOperationalDatabaseError {
  return error instanceof SchoolOperationalDatabaseError;
}

export function canUseSchoolSeedFallback(env: NodeJS.ProcessEnv = process.env): boolean {
  return !(env.NODE_ENV === "production" || env.VERCEL === "1" || Boolean(env.VERCEL_ENV));
}

function dateOnly(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function parseDate(value: unknown, fallback: string): Date {
  const parsed = new Date(typeof value === "string" && value ? value : fallback);
  if (Number.isNaN(parsed.getTime())) return new Date(fallback);
  return parsed;
}

function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
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
  return filterSchools(filters)
    .map(withSchoolSourceMetadata)
    .filter((school) => filters.includeExpired || isSchoolReviewCurrent(school));
}

function normalizeSchoolQuery(value?: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function matchesSchoolQuery(school: School, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const haystack = [
    school.id,
    school.name.ko,
    school.name.vi,
    school.name.mn,
    school.name.en,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, "");
  return haystack.includes(normalizedQuery);
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
  if (!filters.includeExpired) {
    where.reviewAfter = { gte: new Date() };
  }
  return where;
}

export async function listSchools(filters: SchoolFilters = {}): Promise<School[]> {
  const query = normalizeSchoolQuery(filters.query);
  try {
    const rows = await db.school.findMany({
      where: buildWhere(filters),
      orderBy: [{ accreditation: "asc" }, { region: "asc" }, { tuitionPerSemester: "asc" }],
    });
    if (rows.length > 0) return rows.map(mapDbSchool).filter((school) => matchesSchoolQuery(school, query));
  } catch (err) {
    if (!canUseSchoolSeedFallback()) {
      throw new SchoolOperationalDatabaseError(
        `Operational School table is unavailable: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    console.warn("[schools:list fallback]", err instanceof Error ? err.message : err);
  }

  if (!canUseSchoolSeedFallback()) {
    throw new SchoolOperationalDatabaseError("Operational School table has no current rows.");
  }

  return staticSchools(filters);
}

export async function findSchoolById(
  id: string,
  options: { includeExpired?: boolean } = {}
): Promise<School | null> {
  try {
    const row = await db.school.findUnique({ where: { id } });
    if (row) {
      const school = mapDbSchool(row);
      return options.includeExpired || isSchoolReviewCurrent(school) ? school : null;
    }
  } catch (err) {
    if (!canUseSchoolSeedFallback()) {
      throw new SchoolOperationalDatabaseError(
        `Operational School table is unavailable: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    console.warn("[schools:find fallback]", err instanceof Error ? err.message : err);
  }

  if (!canUseSchoolSeedFallback()) return null;
  return staticSchools(options).find((school) => school.id === id) || null;
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
    const officialUrl = String(
      mode === "create" ? requireValue(input.officialUrl, "officialUrl") : input.officialUrl
    ).trim();
    if (officialUrl && !isPublicHttpUrl(officialUrl)) throw new Error("officialUrl must be a public http(s) URL");
    data.officialUrl = officialUrl;
  }
  if (mode === "create" || input.sourceUrl !== undefined) {
    const sourceUrl = String(input.sourceUrl || input.officialUrl || "").trim();
    if (!sourceUrl) throw new Error("Missing required field: sourceUrl");
    if (!isPublicHttpUrl(sourceUrl)) throw new Error("sourceUrl must be a public http(s) URL");
    data.sourceUrl = sourceUrl;
  }
  const verifiedAt = parseDate(input.verifiedAt, DEFAULT_SCHOOL_VERIFIED_AT);
  const reviewAfter = parseDate(input.reviewAfter, DEFAULT_SCHOOL_REVIEW_AFTER);
  if (verifiedAt.getTime() > reviewAfter.getTime()) {
    throw new Error("reviewAfter must be later than or equal to verifiedAt");
  }
  if (mode === "create" || input.verifiedAt !== undefined) {
    data.verifiedAt = verifiedAt;
  }
  if (mode === "create" || input.reviewAfter !== undefined) {
    data.reviewAfter = reviewAfter;
  }

  return data;
}

export async function getSchoolSourceAudit(referenceDate: Date = new Date()) {
  try {
    const [total, expired, missingSource] = await Promise.all([
      db.school.count(),
      db.school.count({ where: { reviewAfter: { lt: referenceDate } } }),
      db.school.count({
        where: {
          OR: [
            { sourceUrl: "" },
            { verifiedAt: { gt: referenceDate } },
          ],
        },
      }),
    ]);

    return {
      source: "db" as const,
      total,
      active: Math.max(0, total - expired),
      expired,
      missingSource,
    };
  } catch (err) {
    if (!canUseSchoolSeedFallback()) {
      return {
        source: "unavailable" as const,
        total: 0,
        active: 0,
        expired: 0,
        missingSource: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const schools = SCHOOLS.map(withSchoolSourceMetadata);
    const expired = schools.filter((school) => !isSchoolReviewCurrent(school, referenceDate)).length;
    return {
      source: "seed" as const,
      total: schools.length,
      active: schools.length - expired,
      expired,
      missingSource: schools.filter((school) => !school.sourceUrl || !school.verifiedAt || !school.reviewAfter).length,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
