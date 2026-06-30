"use client";

import { useState, useRef, useEffect } from "react";
import { useLangStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  ArrowUp,
  Loader2,
  Bot,
  Sparkles,
  Wrench,
  Search,
  Calculator,
  FileCheck,
  BookOpen,
  Compass,
  Users,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Brain,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ToolResult {
  tool: string;
  args: Record<string, any>;
  result: any;
  summary: string;
  success: boolean;
}

interface AgentStep {
  type: "thinking" | "tool_call" | "tool_result" | "final_answer" | "error";
  content: string;
  toolCall?: { tool: string; args: Record<string, any> };
  toolResult?: ToolResult;
  timestamp: number;
}

interface Msg {
  role: "user" | "agent";
  text: string;
  steps?: AgentStep[];
  toolResults?: ToolResult[];
  iterations?: number;
  backend?: string;
  codexMode?: string;
  durationMs?: number;
  grounded?: boolean;
  meta?: AgentMeta;
}

const DEFAULT_LOCAL_CODEX_BRIDGE_URL = "http://127.0.0.1:8787/api/ai/agent";

type BridgeState = "checking" | "reachable" | "unreachable" | "off";

interface AgentStatus {
  ok: boolean;
  status: "ready" | "needs_configuration";
  backend: string;
  codex?: {
    ready: boolean;
    mode: string | null;
    apiKeyConfigured: boolean;
    localAuthAllowed: boolean;
    issue: string | null;
  };
  remoteBridge?: {
    enabled: boolean;
    configured: boolean;
  };
  preflight?: {
    enabled: boolean;
    timeoutMs: number;
  };
  persistence?: {
    writableDatabase: boolean;
    chatLog: boolean;
    ledger: boolean;
    piiEncryption: boolean;
  };
}

interface AgentSource {
  id: string;
  title: string;
  label: string;
  url: string | null;
  kind: "knowledge" | "school" | "internal";
  owner?: string;
  verifiedAt?: string;
  reviewAfter?: string;
}

interface AgentSuggestion {
  kind: "school" | "cost" | "documents" | "partner";
  label: string;
  prompt: string;
}

interface AgentClarifyingQuestion {
  slot: string;
  label: string;
  prompt: string;
}

interface AgentMeta {
  summary: string;
  plan: string[];
  sources: AgentSource[];
  clarifyingQuestions: AgentClarifyingQuestion[];
  suggestions: AgentSuggestion[];
  safetyFlags: string[];
  quality: {
    backend: string;
    grounded: boolean;
    toolCount: number;
    officialSourceCount: number;
    intentConfidence: "low" | "medium" | "high";
    missingSlotCount: number;
    durationMs?: number;
  };
}

function getConfiguredBridgeUrl(): { url: string | null; explicit: boolean } {
  if (typeof window === "undefined") return { url: null, explicit: false };

  const stored = window.localStorage.getItem("kaxiCodexBridgeUrl")?.trim();
  if (stored === "off") return { url: null, explicit: true };
  if (stored) return { url: stored, explicit: true };

  const envUrl = process.env.NEXT_PUBLIC_CODEX_BRIDGE_URL?.trim();
  if (envUrl) return { url: envUrl, explicit: true };

  const host = window.location.hostname;
  if (host === "kaxi.vercel.app" || host.endsWith(".vercel.app")) {
    return { url: DEFAULT_LOCAL_CODEX_BRIDGE_URL, explicit: false };
  }

  return { url: null, explicit: false };
}

async function hasLocalBridge(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 900);
  try {
    const healthUrl = new URL("/health", url).toString();
    const res = await fetch(healthUrl, { method: "GET", mode: "cors", signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchAgent(payload: unknown): Promise<Response> {
  const bridge = getConfiguredBridgeUrl();
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("kaxiCodexBridgeToken")?.trim() : "";

  if (bridge.url && (await hasLocalBridge(bridge.url))) {
    try {
      const bridgeRes = await fetch(bridge.url, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-kaxi-codex-bridge-token": token } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (bridgeRes.ok) return bridgeRes;
    } catch {
      // Fall back to the hosted API below. The local bridge is an acceleration path, not the only answer path.
    }
  }

  return fetch("/api/ai/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const TOOL_ICONS: Record<string, typeof Search> = {
  search_schools: Search,
  calculate_cost: Calculator,
  get_documents: FileCheck,
  search_knowledge: BookOpen,
  diagnose_path: Compass,
  request_partner: Users,
};

const TOOL_LABELS: Record<string, Record<Lang, string>> = {
  search_schools: { ko: "학교 검색", vi: "Tìm trường", mn: "Сургууль хайх", en: "Search Schools" },
  calculate_cost: { ko: "비용 계산", vi: "Tính chi phí", mn: "Зардал", en: "Calculate Cost" },
  get_documents: { ko: "서류 생성", vi: "Hồ sơ", mn: "Баримт", en: "Documents" },
  search_knowledge: { ko: "지식 검색", vi: "Tìm kiến thức", mn: "Мэдлэг", en: "Knowledge" },
  diagnose_path: { ko: "경로 진단", vi: "Đánh giá", mn: "Маршрут", en: "Diagnose" },
  request_partner: { ko: "파트너 요청", vi: "Đối tác", mn: "Түнш", en: "Partner" },
};

function backendLabel(backend?: string): string {
  if (!backend) return "Agent";
  if (backend === "codex-cli-local-bridge") return "Local Codex";
  if (backend === "codex-cli-remote-bridge") return "Remote Codex";
  if (backend === "codex-cli-local") return "Local Codex";
  if (backend === "codex-cli") return "Codex";
  if (backend === "tool-fallback") return "KAXI Tools";
  if (backend === "zai") return "Z.ai";
  return backend;
}

function statusText(lang: Lang, status: AgentStatus | null, bridgeState: BridgeState): string {
  if (bridgeState === "reachable") return "Local Codex";
  if (!status) return lang === "ko" ? "상태 확인 중" : "Checking";
  if (status.backend === "codex" && status.codex && !status.codex.ready) {
    return lang === "ko" ? "Codex 설정 필요" : "Codex setup needed";
  }
  if (status.backend === "remote-bridge" && !status.remoteBridge?.enabled) {
    return lang === "ko" ? "브릿지 설정 필요" : "Bridge setup needed";
  }
  return backendLabel(status.backend === "codex" ? "codex-cli" : status.backend);
}

function statusDotClass(status: AgentStatus | null, bridgeState: BridgeState): string {
  if (bridgeState === "reachable") return "bg-green-500";
  if (!status) return "bg-muted-foreground";
  return status.ok ? "bg-green-500" : "bg-amber-500";
}

function sourceHost(url: string | null): string {
  if (!url) return "KAXI";
  if (url.startsWith("internal://")) return "KAXI";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function sourceKindLabel(source: AgentSource, lang: Lang): string {
  if (source.kind === "school") return lang === "ko" ? "학교" : "School";
  if (source.kind === "internal") return "KAXI";
  return lang === "ko" ? "공식" : "Official";
}

const EXAMPLE_PROMPTS: Record<Lang, string[]> = {
  ko: [
    "서울에 있는 인증대학 어학당 3곳 찾아주고 비용도 계산해줘",
    "베트남 학생인데 D-4 비자로 가려면 필요한 서류 뭐야?",
    "D-2 비자 거절당했는데 어떻게 해야 해? 행정사 상담도 연결해줘",
    "예산 500만원으로 갈 수 있는 학교 찾아줘",
  ],
  vi: [
    "Tìm 3 trường tiếng Hàn ở Seoul có认证 và tính chi phí",
    "Tôi là người Việt, hồ sơ visa D-4 cần gì?",
    "Bị từ chối D-2, phải làm sao? Kết nối luật sư",
    "Tìm trường với ngân sách 5 triệu won",
  ],
  mn: [
    "Сеул дахь итгэмжлэгдсэн 3 хэлний курс олж зардал тооцоол",
    "Би монгол, D-4 визанд ямар баримт хэрэгтэй вэ?",
    "D-2 татгалзсан, яах вэ? Зөвлөгөө холбох",
    "5 сая вон төсөвтэй сургууль хай",
  ],
  en: [
    "Find 3 accredited language schools in Seoul and calculate costs",
    "I'm Vietnamese, what documents do I need for D-4 visa?",
    "My D-2 was refused, what should I do? Connect me to a lawyer",
    "Find schools within 5M KRW budget",
  ],
};

export function Agent() {
  const { lang } = useLangStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [started, setStarted] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [bridgeState, setBridgeState] = useState<BridgeState>("checking");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    const timer = window.setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [msgs, loading]);

  useEffect(() => {
    let alive = true;

    fetch("/api/ai/agent")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data) setAgentStatus(data);
      })
      .catch(() => undefined);

    const bridge = getConfiguredBridgeUrl();
    if (!bridge.url) {
      setBridgeState("off");
      return () => {
        alive = false;
      };
    }

    hasLocalBridge(bridge.url)
      .then((ok) => {
        if (alive) setBridgeState(ok ? "reachable" : "unreachable");
      })
      .catch(() => {
        if (alive) setBridgeState("unreachable");
      });

    return () => {
      alive = false;
    };
  }, []);

  const send = async (text?: string) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;

    setStarted(true);
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const history = msgs.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetchAgent({ question: userMsg, lang, history });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const message =
          res.status === 401
            ? lang === "ko"
              ? "Codex CLI 백엔드는 관리자 로그인 후 사용할 수 있습니다."
              : "Codex CLI backend requires admin login."
            : errorBody.error || "API failed";
        throw new Error(message);
      }

      const data = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: "agent",
          text: data.answer,
          steps: data.steps,
          toolResults: data.toolResults,
          iterations: data.iterations,
          backend: data.backend,
          codexMode: data.codexMode,
          durationMs: data.durationMs,
          grounded: Boolean(data.grounded),
          meta: data.meta,
        },
      ]);
    } catch (e) {
      console.error("[agent]", e);
      const message = e instanceof Error ? e.message : "";
      setMsgs((m) => [
        ...m,
        {
          role: "agent",
          text: message || (lang === "ko" ? "일시적 오류가 발생했습니다." : "Temporary error."),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMsgs([]);
    setStarted(false);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 시작 화면 (Z.ai 스타일 + 에이전트 강조)
  if (!started) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl"
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              {lang === "ko" ? "AI 에이전트 · 도구 호출 가능" : "AI Agent · Tool-Use"}
              <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(agentStatus, bridgeState)}`} />
              {statusText(lang, agentStatus, bridgeState)}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight italic mb-3" style={{ fontFamily: "Georgia, serif" }}>
              {lang === "ko" ? "유학 준비, 에이전트에게 맡기세요" : lang === "vi" ? "Giao việc cho AI agent" : lang === "mn" ? "Агентэд даатгаарай" : "Delegate to the AI agent"}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              {lang === "ko"
                ? "학교 검색 · 비용 계산 · 서류 생성 · 비자 정보 · 전문가 연결 — 모든 것을 한 번에"
                : lang === "vi"
                ? "Tìm trường · Tính chi phí · Hồ sơ · Visa · Chuyên gia — tất cả trong một"
                : lang === "mn"
                ? "Сургууль · Зардал · Баримт · Виз · Мэргэжилтэн — бүгд нэг дор"
                : "Search · Calculate · Documents · Visa · Experts — all in one"}
            </p>
          </div>

          {/* 도구 카드 미리보기 */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-8">
            {Object.entries(TOOL_LABELS).map(([key, labels]) => {
              const Icon = TOOL_ICONS[key] || Wrench;
              return (
                <div key={key} className="flex flex-col items-center gap-1 p-2 rounded-lg border bg-card">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-[10px] text-center text-muted-foreground">{labels[lang]}</span>
                </div>
              );
            })}
          </div>

          {/* 입력 박스 */}
          <Card className="p-4 shadow-lg border-2 focus-within:border-primary/50 transition-colors">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={lang === "ko" ? "원하는 것을 자연스럽게 적어보세요... (예: 서울 인증대학 어학당 찾아주고 비용 계산해줘)" : "Type what you need..."}
              className="border-0 resize-none focus-visible:ring-0 text-base min-h-[80px]"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Brain className="h-3 w-3" />
                <span>
                  {backendLabel(agentStatus?.backend === "codex" ? "codex-cli" : agentStatus?.backend)} · 6 Tools · Max 5 steps
                </span>
              </div>
              <Button size="sm" onClick={() => send()} disabled={!input.trim() || loading} className="gap-1.5">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
                {lang === "ko" ? "실행" : "Run"}
              </Button>
            </div>
          </Card>

          {/* 예시 프롬프트 */}
          <div className="mt-8">
            <div className="text-xs text-muted-foreground text-center mb-3">
              {lang === "ko" ? "💡 에이전트에게 시켜보세요" : "💡 Try these"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {EXAMPLE_PROMPTS[lang].map((p, i) => (
                <button
                  key={i}
                  onClick={() => send(p)}
                  className="text-left text-sm p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all flex items-start gap-2"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="flex-1">{p}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // 채팅 진행 중
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-sm flex items-center gap-1.5">
              {lang === "ko" ? "AI 에이전트" : "AI Agent"}
              <Badge variant="outline" className="text-[10px] py-0 h-4">ReAct</Badge>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(agentStatus, bridgeState)}`} />
              {statusText(lang, agentStatus, bridgeState)}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          {lang === "ko" ? "새 대화" : "New"}
        </Button>
      </div>

      {/* 메시지 영역 */}
      <div className="space-y-6 mb-32">
        {msgs.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div className={`max-w-[95%] ${m.role === "user" ? "" : "w-full"}`}>
              {m.role === "user" ? (
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                  {m.text}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 도구 호출 단계 시각화 */}
                  {m.steps && m.steps.filter((s) => s.type === "tool_call" || s.type === "tool_result").length > 0 && (
                    <Card className="p-3 bg-muted/30 border-dashed">
                      <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                        <Wrench className="h-2.5 w-2.5" />
                        {lang === "ko" ? `에이전트 도구 호출 (${m.iterations}단계)` : `Agent steps (${m.iterations})`}
                      </div>
                      <div className="space-y-1.5">
                        {m.steps.map((step, j) => {
                          if (step.type === "tool_call" && step.toolCall) {
                            const Icon = TOOL_ICONS[step.toolCall.tool] || Wrench;
                            return (
                              <div key={j} className="flex items-center gap-2 text-xs">
                                <Icon className="h-3 w-3 text-primary" />
                                <span className="font-medium">{TOOL_LABELS[step.toolCall.tool]?.[lang] || step.toolCall.tool}</span>
                                <span className="text-muted-foreground truncate">
                                  {Object.entries(step.toolCall.args).slice(0, 2).map(([k, v]) => `${k}: ${String(v).substring(0, 30)}`).join(", ")}
                                </span>
                              </div>
                            );
                          }
                          if (step.type === "tool_result" && step.toolResult) {
                            return (
                              <div key={j} className="flex items-center gap-2 text-xs pl-5">
                                <CheckCircle2 className={`h-3 w-3 ${step.toolResult.success ? "text-green-500" : "text-red-500"}`} />
                                <span className="text-muted-foreground">{step.toolResult.summary}</span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </Card>
                  )}

                  {/* 최종 답변 */}
                  <div className="bg-card border rounded-2xl rounded-bl-md p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {lang === "ko" ? "AI 에이전트" : "Agent"}
                      </span>
                      {m.toolResults && m.toolResults.length > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <Wrench className="h-2.5 w-2.5" />
                          {m.toolResults.length} {lang === "ko" ? "도구 사용" : "tools"}
                        </Badge>
                      )}
                      {m.backend && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" />
                          {backendLabel(m.backend)}
                        </Badge>
                      )}
                      {m.grounded && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <BookOpen className="h-2.5 w-2.5" />
                          Grounded
                        </Badge>
                      )}
                      {m.meta?.quality.intentConfidence && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <Brain className="h-2.5 w-2.5" />
                          {m.meta.quality.intentConfidence}
                        </Badge>
                      )}
                      {typeof m.durationMs === "number" && (
                        <Badge variant="outline" className="text-[10px]">
                          {Math.round(m.durationMs / 1000)}s
                        </Badge>
                      )}
                    </div>
                    {m.meta && (
                      <div className="mb-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded-md bg-muted px-2 py-1">{m.meta.summary}</span>
                        {m.meta.plan.slice(0, 3).map((step) => (
                          <span key={step} className="rounded-md border px-2 py-1">
                            {step}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-sm leading-relaxed">
                      <MessageResponse>{m.text}</MessageResponse>
                    </div>
                    {m.meta?.safetyFlags && m.meta.safetyFlags.length > 0 && (
                      <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        {m.meta.safetyFlags[0]}
                      </div>
                    )}
                    {m.meta?.clarifyingQuestions && m.meta.clarifyingQuestions.length > 0 && (
                      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800/70 dark:bg-amber-950/30">
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                          <AlertCircle className="h-3 w-3" />
                          {lang === "ko" ? "정확도를 높이려면" : "To improve accuracy"}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {m.meta.clarifyingQuestions.map((item) => (
                            <button
                              key={`${item.slot}-${item.label}`}
                              type="button"
                              disabled={loading}
                              onClick={() => send(item.prompt)}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <span className="font-medium">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {m.meta?.sources && m.meta.sources.length > 0 && (
                      <div className="mt-4 border-t pt-3">
                        <div className="mb-2 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
                          {lang === "ko" ? "참조 출처" : "Sources"}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {m.meta.sources.slice(0, 6).map((source) => {
                            const content = (
                              <>
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {sourceKindLabel(source, lang)}
                                </span>
                                <span className="max-w-[220px] truncate">{source.title}</span>
                                <span className="text-muted-foreground">{sourceHost(source.url)}</span>
                                {source.url && !source.url.startsWith("internal://") && <ExternalLink className="h-3 w-3" />}
                              </>
                            );

                            return source.url && !source.url.startsWith("internal://") ? (
                              <a
                                key={`${source.kind}-${source.id}-${source.url}`}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                              >
                                {content}
                              </a>
                            ) : (
                              <span
                                key={`${source.kind}-${source.id}-${source.label}`}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                              >
                                {content}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {m.meta?.suggestions && m.meta.suggestions.length > 0 && (
                      <div className="mt-4 border-t pt-3">
                        <div className="mb-2 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
                          {lang === "ko" ? "다음 작업" : "Next"}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {m.meta.suggestions.map((suggestion) => (
                            <button
                              key={`${suggestion.kind}-${suggestion.label}`}
                              type="button"
                              disabled={loading}
                              onClick={() => send(suggestion.prompt)}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <ArrowRight className="h-3 w-3 text-primary" />
                              <span className="font-medium">{suggestion.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* 로딩 */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-card border rounded-2xl rounded-bl-md p-4 max-w-[95%] w-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{lang === "ko" ? "에이전트 추론 중..." : "Agent thinking..."}</span>
              </div>
              <div className="text-xs text-muted-foreground pl-6">
                {lang === "ko" ? "자료 검색, 비용/서류 계산, 출처 정리까지 순서대로 처리합니다" : "Checking tools, sources, and next actions"}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={endRef} className="h-44" />
      </div>

      {/* 입력 영역 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4">
        <div className="mx-auto max-w-3xl px-4">
          <Card className="p-3 shadow-lg border-2 focus-within:border-primary/50 transition-colors">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={lang === "ko" ? "추가 질문 또는 다음 작업..." : "Follow-up..."}
              className="border-0 resize-none focus-visible:ring-0 text-sm min-h-[40px] max-h-[120px]"
              rows={1}
              disabled={loading}
            />
            <div className="flex items-center justify-end mt-1.5 pt-1.5 border-t">
              <Button size="sm" onClick={() => send()} disabled={!input.trim() || loading} className="gap-1.5 h-7">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUp className="h-3 w-3" />}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
