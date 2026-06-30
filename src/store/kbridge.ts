"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "../i18n/translations";
import type { DiagnosisInput, PathRecommendation } from "../data/diagnosis";

// --- 언어 설정 ---
interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: "ko",
      setLang: (lang) => set({ lang }),
    }),
    { name: "kb-lang" }
  )
);

// --- 진단 결과 / 리드 ---
export interface Lead {
  id: string;
  createdAt: number;
  nickname: string;
  nationality: string;
  goal: string;
  pathKey: string;
  budget: number;
  brokerCost: number;
  usingBroker: boolean;
  hasHistory: boolean;
  input: DiagnosisInput;
  recommendation: PathRecommendation;
}

interface LeadState {
  currentDiagnosis: { input: DiagnosisInput; recommendation: PathRecommendation } | null;
  leads: Lead[];
  saveDiagnosis: (nickname: string, input: DiagnosisInput, recommendation: PathRecommendation) => void;
  clearCurrent: () => void;
}

export const useLeadStore = create<LeadState>()(
  persist(
    (set) => ({
      currentDiagnosis: null,
      leads: [],
      saveDiagnosis: (nickname, input, recommendation) => {
        const lead: Lead = {
          id: `lead-${Date.now()}`,
          createdAt: Date.now(),
          nickname: nickname || "익명",
          nationality: input.nationality,
          goal: input.goal,
          pathKey: recommendation.pathKey,
          budget: input.budget,
          brokerCost: input.brokerCost,
          usingBroker: input.usingBroker,
          hasHistory: input.hasHistory,
          input,
          recommendation,
        };
        set((state) => ({
          leads: [lead, ...state.leads].slice(0, 100),
          currentDiagnosis: { input, recommendation },
        }));
      },
      clearCurrent: () => set({ currentDiagnosis: null }),
    }),
    { name: "kb-leads" }
  )
);

// --- 서류 워크스페이스 ---
export type DocStatus =
  | "done"
  | "translation"
  | "notarization"
  | "school_check"
  | "admin_help"
  | "pending"
  | "not_yet";

export interface DocItem {
  key: string; // translation key
  status: DocStatus;
  fileName?: string;
  uploadedAt?: number;
}

interface DocsState {
  docs: Record<string, DocItem>;
  setStatus: (key: string, status: DocStatus) => void;
  upload: (key: string, fileName: string) => void;
  reset: () => void;
}

const DEFAULT_DOCS: Record<string, DocItem> = {
  docs_doc_passport: { key: "docs_doc_passport", status: "done" },
  docs_doc_photo: { key: "docs_doc_photo", status: "done", uploadedAt: Date.now() - 86400000 * 3 },
  docs_doc_diploma: { key: "docs_doc_diploma", status: "translation" },
  docs_doc_transcript: { key: "docs_doc_transcript", status: "notarization" },
  docs_doc_finance: { key: "docs_doc_finance", status: "pending" },
  docs_doc_family: { key: "docs_doc_family", status: "not_yet" },
  docs_doc_admission: { key: "docs_doc_admission", status: "school_check" },
  docs_doc_tuberculosis: { key: "docs_doc_tuberculosis", status: "pending" },
  docs_doc_plan: { key: "docs_doc_plan", status: "admin_help" },
  docs_doc_business: { key: "docs_doc_business", status: "school_check" },
};

export const useDocsStore = create<DocsState>()(
  persist(
    (set) => ({
      docs: DEFAULT_DOCS,
      setStatus: (key, status) =>
        set((state) => ({
          docs: { ...state.docs, [key]: { ...state.docs[key], status } },
        })),
      upload: (key, fileName) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [key]: { ...state.docs[key], status: "done", fileName, uploadedAt: Date.now() },
          },
        })),
      reset: () => set({ docs: DEFAULT_DOCS }),
    }),
    { name: "kb-docs" }
  )
);
