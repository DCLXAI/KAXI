"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/lib/i18n/translations";
import type { DiagnosisInput, PathRecommendation } from "@/lib/data/diagnosis";

// --- 언어 설정 (클라이언트 persist) ---
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

// --- 리드 (서버 동기화) ---
export interface Lead {
  id: string;
  createdAt: string;
  nickname: string;
  nationality: string;
  goal: string;
  pathKey: string;
  budget: number;
  brokerCost: number;
  usingBroker: boolean;
  hasHistory: boolean;
  age: number;
  education: string;
  koreanLevel: string;
  region: string;
  estimatedCost: number;
  prepTime: string;
  requiredDocs: string[];
  warnings: { ko: string; vi: string; mn: string; en: string }[];
  nextActions: { ko: string; vi: string; mn: string; en: string }[];
  partnerRequests?: { id: string; partnerType: string; status: string }[];
}

interface LeadState {
  currentDiagnosis: { input: DiagnosisInput; recommendation: PathRecommendation } | null;
  currentLeadId: string | null;
  leads: Lead[];
  loading: boolean;
  savingDiagnosis: boolean;
  saveDiagnosis: (nickname: string, input: DiagnosisInput, recommendation: PathRecommendation) => Promise<string | null>;
  fetchLeads: (adminKey?: string) => Promise<void>;
  clearCurrent: () => void;
}

export const useLeadStore = create<LeadState>()((set, get) => ({
  currentDiagnosis: null,
  currentLeadId: null,
  leads: [],
  loading: false,
  savingDiagnosis: false,

  saveDiagnosis: async (nickname, input, recommendation) => {
    set({ savingDiagnosis: true });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname || "익명",
          nationality: input.nationality,
          age: Number(input.age) || 0,
          education: input.education,
          koreanLevel: input.korean,
          goal: input.goal,
          budget: input.budget,
          region: input.region,
          usingBroker: input.usingBroker,
          brokerCost: input.brokerCost,
          hasHistory: input.hasHistory,
          pathKey: recommendation.pathKey,
          estimatedCost: recommendation.estimatedCost,
          prepTime: recommendation.prepTime.en,
          requiredDocs: recommendation.requiredDocs,
          warnings: recommendation.warnings,
          nextActions: recommendation.nextActions,
        }),
      });
      if (!res.ok) throw new Error("Failed to save lead");
      const { lead } = await res.json();
      set({
        currentDiagnosis: { input, recommendation },
        currentLeadId: lead.id,
        leads: [lead, ...get().leads].slice(0, 100),
      });
      return lead.id;
    } catch (e) {
      console.error("[saveDiagnosis]", e);
      // fallback: 로컬 상태에만 저장
      const localLead: Lead = {
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
        nickname: nickname || "익명",
        nationality: input.nationality,
        goal: input.goal,
        pathKey: recommendation.pathKey,
        budget: input.budget,
        brokerCost: input.brokerCost,
        usingBroker: input.usingBroker,
        hasHistory: input.hasHistory,
        age: Number(input.age) || 0,
        education: input.education,
        koreanLevel: input.korean,
        region: input.region,
        estimatedCost: recommendation.estimatedCost,
        prepTime: recommendation.prepTime.en,
        requiredDocs: recommendation.requiredDocs,
        warnings: recommendation.warnings,
        nextActions: recommendation.nextActions,
      };
      set({
        currentDiagnosis: { input, recommendation },
        currentLeadId: localLead.id,
        leads: [localLead, ...get().leads].slice(0, 100),
      });
      return localLead.id;
    } finally {
      set({ savingDiagnosis: false });
    }
  },

  fetchLeads: async (adminKey) => {
    set({ loading: true });
    try {
      const res = await fetch("/api/leads", {
        headers: adminKey ? { "x-admin-key": adminKey } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch leads");
      const { leads } = await res.json();
      set({ leads });
    } catch (e) {
      console.error("[fetchLeads]", e);
    } finally {
      set({ loading: false });
    }
  },

  clearCurrent: () => set({ currentDiagnosis: null, currentLeadId: null }),
}));

// --- 파트너 요청 (서버 동기화) ---
interface PartnerState {
  submitting: boolean;
  submitPartnerRequest: (
    leadId: string | null,
    partnerType: string,
    question?: string,
    consent?: {
      thirdPartyProvision: boolean;
      processingConsignment: boolean;
      overseasTransfer: boolean;
      version?: string;
      locale?: string;
      source?: string;
    }
  ) => Promise<boolean>;
}

export const usePartnerStore = create<PartnerState>()((set) => ({
  submitting: false,
  submitPartnerRequest: async (leadId, partnerType, question, consent) => {
    set({ submitting: true });
    try {
      const res = await fetch("/api/partner-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: leadId || "anonymous",
          partnerType,
          question: question || null,
          consent: consent || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return true;
    } catch (e) {
      console.error("[submitPartnerRequest]", e);
      return false;
    } finally {
      set({ submitting: false });
    }
  },
}));

// --- 서류 워크스페이스 (클라이언트 persist, 향후 서버 동기화 가능) ---
export type DocStatus =
  | "done"
  | "translation"
  | "notarization"
  | "school_check"
  | "admin_help"
  | "pending"
  | "not_yet";

export interface DocItem {
  key: string;
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

// --- 비용 계산 결과 (클라이언트 persist) ---
export interface SavedCost {
  id: string;
  savedAt: number;
  schoolId: string;
  schoolName: string;
  total: number;
  items: Record<string, number>;
  brokerTotal?: number;
}

interface CostState {
  savedCosts: SavedCost[];
  saveCost: (cost: Omit<SavedCost, "id" | "savedAt">) => void;
  removeCost: (id: string) => void;
  clearAll: () => void;
}

export const useCostStore = create<CostState>()(
  persist(
    (set) => ({
      savedCosts: [],
      saveCost: (cost) =>
        set((state) => ({
          savedCosts: [
            { ...cost, id: `cost-${Date.now()}`, savedAt: Date.now() },
            ...state.savedCosts,
          ].slice(0, 20),
        })),
      removeCost: (id) =>
        set((state) => ({
          savedCosts: state.savedCosts.filter((cost) => cost.id !== id),
        })),
      clearAll: () => set({ savedCosts: [] }),
    }),
    { name: "kb-costs" }
  )
);
