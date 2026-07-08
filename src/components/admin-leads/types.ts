import type { Lead } from "@/store/kbridge";

export interface Stats {
  totalLeads: number;
  totalRequests: number;
  pendingRequests: number;
  brokerUsers: number;
  recentLeads: number;
  byNationality: { nationality: string; _count: number }[];
  byPath: { pathKey: string; _count: number }[];
}

export interface AdminOpsStatus {
  aiBackend: {
    agent: AdminBackendStatus;
    consult: AdminBackendStatus;
    issues: string[];
    warnings: string[];
  };
  readiness: {
    status: "ready" | "degraded";
    environment: string;
    production: boolean;
    checkedAt: string;
    aiBackendPolicyCheck: {
      ok: boolean;
      severity: "required" | "warning";
      detail: string;
    } | null;
  };
}

export interface AdminBackendStatus {
  backend: string;
  ready: boolean;
  requireLlm: boolean;
  fallbackAllowed: boolean;
  decisionTable: { code: string; outcome: string; detail: string }[];
}

export type AdminLead = Lead;
