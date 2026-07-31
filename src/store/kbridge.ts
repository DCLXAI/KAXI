"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/lib/i18n/translations";
import type { DiagnosisInput, PathRecommendation } from "@/lib/data/diagnosis";
import type { School } from "@/lib/data/schools";
import { calculateReadinessScore } from "@/lib/data/readiness";

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
/**
 * Why a diagnosis failed to reach the server.
 *
 * `retryable: false` means the server understood the request and refused it, so
 * keeping a local copy and calling it saved would be a lie. That is exactly what
 * used to happen: POST /api/leads rejected every completed diagnosis with 400
 * because its schema demanded string[] where the engine emits {ko,vi,mn,en}, and
 * this store turned each rejection into a `local-<timestamp>` lead the wizard
 * reported as a success.
 */
export interface LeadSaveFailure {
  code: string;
  retryable: boolean;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
}

class LeadSaveError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string[]>;
  readonly requestId?: string;

  constructor(code: string, retryable: boolean, fieldErrors?: Record<string, string[]>, requestId?: string) {
    super(`lead save failed: ${code}`);
    this.name = "LeadSaveError";
    this.code = code;
    this.retryable = retryable;
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
  }
}

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
  // Non-null only when the server refused the payload. A retryable failure keeps
  // the offline fallback path and leaves this null.
  saveFailure: LeadSaveFailure | null;
  selectedSchoolsForReadiness: School[];
  saveDiagnosis: (nickname: string, input: DiagnosisInput, recommendation: PathRecommendation) => Promise<string | null>;
  fetchLeads: () => Promise<void>;
  clearCurrent: () => void;
  toggleSchoolForReadiness: (school: School) => void;
  clearSelectedSchoolsForReadiness: () => void;
  // Recompute readiness using currently selected schools' accreditations
  recomputeReadinessWithSelectedSchools: () => void;
  updateCurrentDiagnosisRecommendation: (input: DiagnosisInput, recommendation: PathRecommendation) => void;
}

function complianceSignalsFromRecommendation(recommendation: PathRecommendation) {
  return recommendation.compliance
    ? {
        sourceRefs: recommendation.compliance.sourceRefs,
        blockedReasons: recommendation.compliance.blockedReasons,
        partnerEscalationReasons: recommendation.compliance.partnerEscalationReasons,
        warnings: recommendation.compliance.warnings,
        missingInputs: recommendation.compliance.missingInputs,
      }
    : null;
}

// Persisted because the six-step wizard result is the funnel's core artifact:
// without this an anonymous user who closes the tab loses it and must redo
// every step. Only the user's own diagnosis is kept — `leads` holds records
// fetched from the server and has no business in localStorage.
export const useLeadStore = create<LeadState>()(
  persist(
    (set, get) => ({
      currentDiagnosis: null,
      currentLeadId: null,
      leads: [],
      loading: false,
      savingDiagnosis: false,
      saveFailure: null,
      selectedSchoolsForReadiness: [],

      saveDiagnosis: async (nickname, input, recommendation) => {
        set({ savingDiagnosis: true, saveFailure: null });
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
          if (!res.ok) {
            // A 4xx means the server understood us and refused. Retrying the same
            // body cannot help, and pretending it saved is what hid this bug for
            // weeks — the wizard reported success while the admin inbox stayed
            // empty. Surface it instead.
            const problem = await res.json().catch(() => null) as
              | { code?: string; retryable?: boolean; fieldErrors?: Record<string, string[]>; requestId?: string }
              | null;
            const retryable = problem?.retryable ?? res.status >= 500;
            throw new LeadSaveError(
              problem?.code || `HTTP_${res.status}`,
              retryable,
              problem?.fieldErrors,
              problem?.requestId,
            );
          }
          const { lead } = await res.json();
          set({
            currentDiagnosis: { input, recommendation },
            currentLeadId: lead.id,
            saveFailure: null,
            leads: [lead, ...get().leads].slice(0, 100),
          });
          return lead.id;
        } catch (e) {
          console.error("[saveDiagnosis]", e);

          // A rejected contract is not an offline user. Keep the diagnosis on
          // screen so nothing the user typed is lost, record why, and return null
          // so the caller cannot mistake this for a saved lead.
          if (e instanceof LeadSaveError && !e.retryable) {
            set({
              currentDiagnosis: { input, recommendation },
              currentLeadId: null,
              saveFailure: { code: e.code, retryable: false, fieldErrors: e.fieldErrors, requestId: e.requestId },
            });
            return null;
          }

          // Everything else — a dropped connection, a 5xx — may succeed later, so
          // the local copy is a legitimate offline fallback rather than a lie.
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

      fetchLeads: async () => {
        set({ loading: true });
        try {
          const res = await fetch("/api/leads");
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

      toggleSchoolForReadiness: (school) => {
        const current = get().selectedSchoolsForReadiness;
        const exists = current.some((s) => s.id === school.id);
        const next = exists
          ? current.filter((s) => s.id !== school.id)
          : [...current, school];
        set({ selectedSchoolsForReadiness: next });
        get().recomputeReadinessWithSelectedSchools();
      },

      clearSelectedSchoolsForReadiness: () => {
        set({ selectedSchoolsForReadiness: [] });
        get().recomputeReadinessWithSelectedSchools();
      },

      recomputeReadinessWithSelectedSchools: () => {
        const diag = get().currentDiagnosis;
        if (!diag) return;
        const accs = get().selectedSchoolsForReadiness.map((s) => s.accreditation);
        const readiness = calculateReadinessScore({
          input: diag.input,
          complianceSignals: complianceSignalsFromRecommendation(diag.recommendation),
          selectedSchoolAccreditations: accs,
        });
        set({
          currentDiagnosis: {
            ...diag,
            recommendation: {
              ...diag.recommendation,
              readiness,
            },
          },
        });
      },

      updateCurrentDiagnosisRecommendation: (input, recommendation) => {
        set({ currentDiagnosis: { input, recommendation } });
        get().recomputeReadinessWithSelectedSchools();
      },
    }),
    {
      name: "kb-lead",
      partialize: (state) => ({
        currentDiagnosis: state.currentDiagnosis,
        currentLeadId: state.currentLeadId,
        selectedSchoolsForReadiness: state.selectedSchoolsForReadiness,
      }),
    }
  )
);

// --- 파트너 요청 (서버 동기화) ---
interface PartnerState {
  submitting: boolean;
  submitPartnerRequest: (
    leadId: string | null,
    partnerType: string,
    question?: string,
    contactInfo?: { name?: string; contact?: string; contactType?: string },
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
  submitPartnerRequest: async (leadId, partnerType, question, contactInfo, consent) => {
    set({ submitting: true });
    try {
      const res = await fetch("/api/partner-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: leadId || "anonymous",
          partnerType,
          question: question || null,
          name: contactInfo?.name || null,
          contact: contactInfo?.contact || null,
          contactType: contactInfo?.contactType || null,
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
