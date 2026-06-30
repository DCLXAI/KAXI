export const VIEW_KEYS = [
  "home",
  "agent",
  "consult",
  "diagnose",
  "schools",
  "cost",
  "docs",
  "partners",
  "admin",
  "synonyms",
] as const;

export type ViewKey = (typeof VIEW_KEYS)[number];

export const VIEW_PATHS: Record<ViewKey, string> = {
  home: "/",
  agent: "/agent",
  consult: "/consult",
  diagnose: "/diagnose",
  schools: "/schools",
  cost: "/cost",
  docs: "/docs",
  partners: "/partners",
  admin: "/admin",
  synonyms: "/synonyms",
};

export const VIEW_METADATA: Record<ViewKey, { title: string; description: string }> = {
  home: {
    title: "KAXI · 브로커 없이 준비하는 한국 유학",
    description: "한국 유학 준비생을 위한 학교, 비용, 서류, 비자 상담 도구",
  },
  agent: {
    title: "KAXI AI 에이전트",
    description: "학교 검색, 비용 계산, 서류 확인을 돕는 KAXI AI 에이전트",
  },
  consult: {
    title: "KAXI 전문 상담",
    description: "공식 문서 기반 비자, 서류, 체류 전문 상담",
  },
  diagnose: {
    title: "KAXI 유학 경로 진단",
    description: "목표, 예산, 한국어 수준 기반 유학 경로 진단",
  },
  schools: {
    title: "KAXI 학교 검색",
    description: "출처와 검증일이 있는 한국 유학 학교 데이터",
  },
  cost: {
    title: "KAXI 비용 계산",
    description: "등록금, 기숙사, 서류, 비자, 정착비 항목별 계산",
  },
  docs: {
    title: "KAXI 서류 워크스페이스",
    description: "유학 준비 서류 상태 관리",
  },
  partners: {
    title: "KAXI 파트너 상담",
    description: "행정, 번역공증, 입학, 정착 상담 요청",
  },
  admin: {
    title: "KAXI 관리자",
    description: "KAXI 운영 관리자 대시보드",
  },
  synonyms: {
    title: "KAXI 동의어 관리",
    description: "RAG 검색 품질을 위한 다국어 동의어 관리",
  },
};

export function isViewKey(value: string): value is ViewKey {
  return (VIEW_KEYS as readonly string[]).includes(value);
}

export function viewToPath(view: string): string {
  return isViewKey(view) ? VIEW_PATHS[view] : "/";
}
