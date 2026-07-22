"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  FileQuestion,
  FileText,
  FileWarning,
  GraduationCap,
  Landmark,
  Plane,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useLangStore, useLeadStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { KaxiCat } from "@/components/brand/KaxiCat";
import {
  DOCUMENT_WORKFLOW_ITEMS,
  DOCUMENT_WORKFLOW_STAGES,
  getRequiredDocumentTypes,
  getStageItems,
  isReusedDocument,
  type DocumentRequirement,
  type DocumentStage,
  type DocumentTrack,
} from "@/lib/documents/workflow";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentDocument {
  id: string | null;
  documentType: string;
  label: string;
  required: boolean;
  status: string;
  reviewStatus: string;
  reviewNote: string | null;
  expiresAt: string | null;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    createdAt: string;
  } | null;
}

interface DocumentWorkspaceIssue {
  error?: string;
  detail?: string;
  operatorHint?: string;
  requirements?: string[];
}

const UI_COPY: Record<Lang, {
  refresh: string;
  loginRequired: string;
  login: string;
  unavailable: string;
  connectionFailed: string;
  completed: string;
  requiredReady: string;
  upload: string;
  replace: string;
  attached: string;
  reviewing: string;
  finalCheck: string;
}> = {
  ko: {
    refresh: "새로고침",
    loginRequired: "문서를 안전하게 보관하려면 로그인해 주세요.",
    login: "로그인",
    unavailable: "현재 운영 저장소를 준비 중이라 업로드를 이용할 수 없습니다.",
    connectionFailed: "문서 워크스페이스에 연결하지 못했습니다.",
    completed: "전체 필수 서류 준비",
    requiredReady: "필수 서류 완료",
    upload: "업로드",
    replace: "교체",
    attached: "첨부됨",
    reviewing: "전문가 검토 대기",
    finalCheck: "학교 모집요강과 관할 재외공관 기준에 따라 추가 서류·번역·공증·아포스티유 요건이 달라질 수 있습니다. 제출 직전에 공식 안내를 다시 확인하세요.",
  },
  vi: {
    refresh: "Làm mới",
    loginRequired: "Đăng nhập để lưu hồ sơ an toàn.",
    login: "Đăng nhập",
    unavailable: "Kho lưu trữ vận hành đang được chuẩn bị; hiện chưa thể tải lên.",
    connectionFailed: "Không thể kết nối không gian hồ sơ.",
    completed: "Hồ sơ bắt buộc đã chuẩn bị",
    requiredReady: "Hồ sơ bắt buộc hoàn tất",
    upload: "Tải lên",
    replace: "Thay thế",
    attached: "Đã đính kèm",
    reviewing: "Chờ chuyên gia kiểm tra",
    finalCheck: "Hồ sơ bổ sung, bản dịch, công chứng hoặc Apostille có thể khác theo trường và cơ quan đại diện. Hãy kiểm tra nguồn chính thức ngay trước khi nộp.",
  },
  mn: {
    refresh: "Шинэчлэх",
    loginRequired: "Баримтаа аюулгүй хадгалахын тулд нэвтэрнэ үү.",
    login: "Нэвтрэх",
    unavailable: "Үйлдвэрлэлийн хадгалалтыг бэлдэж байгаа тул одоогоор оруулах боломжгүй.",
    connectionFailed: "Баримтын workspace-д холбогдож чадсангүй.",
    completed: "Заавал баримтын бэлтгэл",
    requiredReady: "Заавал баримт бэлэн",
    upload: "Байршуулах",
    replace: "Солих",
    attached: "Хавсаргасан",
    reviewing: "Мэргэжилтний хяналт хүлээж байна",
    finalCheck: "Нэмэлт баримт, орчуулга, нотариат эсвэл Apostille-ийн шаардлага сургууль, төлөөлөгчийн газраас хамаарна. Өгөхийн өмнө албан мэдээллийг дахин шалгана уу.",
  },
  en: {
    refresh: "Refresh",
    loginRequired: "Sign in to store your documents securely.",
    login: "Sign in",
    unavailable: "Uploads are unavailable while the production storage is being prepared.",
    connectionFailed: "Could not connect to the document workspace.",
    completed: "Required documents ready",
    requiredReady: "Required complete",
    upload: "Upload",
    replace: "Replace",
    attached: "Attached",
    reviewing: "Waiting for expert review",
    finalCheck: "Extra documents, translations, notarization, or apostille requirements vary by school and diplomatic mission. Recheck the official guidance immediately before filing.",
  },
};

const STATUS_LABELS: Record<string, Record<Lang, string>> = {
  NOT_UPLOADED: { ko: "준비 전", vi: "Chưa chuẩn bị", mn: "Бэлтгээгүй", en: "Not ready" },
  UPLOADED: { ko: "업로드 완료", vi: "Đã tải lên", mn: "Оруулсан", en: "Uploaded" },
  OCR_PROCESSING: { ko: "문서 확인 중", vi: "Đang kiểm tra", mn: "Шалгаж байна", en: "Checking" },
  OCR_DONE: { ko: "내용 확인 완료", vi: "Đã kiểm tra", mn: "Шалгасан", en: "Content checked" },
  MISSING: { ko: "누락", vi: "Thiếu", mn: "Дутуу", en: "Missing" },
  EXPIRED: { ko: "유효기간 만료", vi: "Hết hạn", mn: "Хугацаа дууссан", en: "Expired" },
  NEEDS_REVIEW: { ko: "검토 필요", vi: "Cần kiểm tra", mn: "Хянах шаардлагатай", en: "Needs review" },
  APPROVED: { ko: "승인", vi: "Đã duyệt", mn: "Баталсан", en: "Approved" },
  REJECTED: { ko: "보완 필요", vi: "Cần bổ sung", mn: "Нэмэлт шаардлагатай", en: "Needs correction" },
};

const STAGE_ICONS = {
  school: GraduationCap,
  admission: Building2,
  visa: Landmark,
  arrival: Plane,
} satisfies Record<DocumentStage, typeof GraduationCap>;

const COMPLETE_STATUSES = new Set(["APPROVED", "OCR_DONE"]);

const FALLBACK_DOCS: StudentDocument[] = DOCUMENT_WORKFLOW_ITEMS.map((item) => ({
  id: null,
  documentType: item.type,
  label: item.type,
  required: item.uses.some((use) => use.requirement === "required"),
  status: "NOT_UPLOADED",
  reviewStatus: "PENDING",
  reviewNote: null,
  expiresAt: null,
  file: null,
}));

function fallbackDocument(documentType: string): StudentDocument {
  return FALLBACK_DOCS.find((document) => document.documentType === documentType) ?? {
    id: null,
    documentType,
    label: documentType,
    required: false,
    status: "NOT_UPLOADED",
    reviewStatus: "PENDING",
    reviewNote: null,
    expiresAt: null,
    file: null,
  };
}

function statusLabel(status: string, lang: Lang) {
  return STATUS_LABELS[status]?.[lang] ?? status;
}

function statusTone(status: string): string {
  switch (status) {
    case "APPROVED":
    case "OCR_DONE":
      return "bg-emerald-500";
    case "UPLOADED":
    case "OCR_PROCESSING":
      return "bg-sky-500";
    case "NEEDS_REVIEW":
    case "EXPIRED":
      return "bg-amber-500";
    case "REJECTED":
    case "MISSING":
      return "bg-rose-500";
    default:
      return "bg-slate-300";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "APPROVED":
    case "OCR_DONE":
      return CheckCircle2;
    case "UPLOADED":
    case "OCR_PROCESSING":
      return Clock3;
    case "NEEDS_REVIEW":
    case "REJECTED":
    case "EXPIRED":
    case "MISSING":
      return FileWarning;
    default:
      return FileQuestion;
  }
}

function requirementBadge(requirement: DocumentRequirement, lang: Lang) {
  if (requirement === "required") {
    return <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">{tr("docs_required", lang)}</Badge>;
  }
  if (requirement === "conditional") {
    return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">{tr("docs_conditional", lang)}</Badge>;
  }
  return <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">{tr("docs_issued_result", lang)}</Badge>;
}

function fileSize(sizeBytes: number) {
  if (sizeBytes > 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function Documents({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { lang } = useLangStore();
  const currentDiagnosis = useLeadStore((state) => state.currentDiagnosis);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackParam = searchParams.get("track");
  const copy = UI_COPY[lang];
  const diagnosedTrack = currentDiagnosis?.recommendation.visaType === "D-4" ? "D-4" : "D-2";
  const initialTrack: DocumentTrack = trackParam === "D-2" || trackParam === "D-4" ? trackParam : diagnosedTrack;
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<StudentDocument | null>(null);
  // The url `?track=` param wins once on mount; afterwards diagnosis sync / manual switching behave as before.
  const trackParamAppliedRef = useRef(trackParam === "D-2" || trackParam === "D-4");
  const [track, setTrack] = useState<DocumentTrack>(initialTrack);
  const [selectedStage, setSelectedStage] = useState<DocumentStage>("school");
  const [documents, setDocuments] = useState<StudentDocument[]>(FALLBACK_DOCS);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverBacked, setServerBacked] = useState(false);
  const [workspaceIssue, setWorkspaceIssue] = useState<DocumentWorkspaceIssue | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    if (trackParamAppliedRef.current) {
      trackParamAppliedRef.current = false;
      return;
    }
    if (currentDiagnosis?.recommendation.visaType === "D-2" || currentDiagnosis?.recommendation.visaType === "D-4") {
      setTrack(currentDiagnosis.recommendation.visaType);
    }
  }, [currentDiagnosis?.recommendation.visaType]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWorkspaceIssue(null);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (res.status === 401) {
        setAuthRequired(true);
        setServerBacked(false);
        setDocuments(FALLBACK_DOCS);
        return;
      }
      setAuthRequired(false);
      if (!res.ok) {
        setServerBacked(false);
        setWorkspaceIssue({
          error: data.error,
          detail: data.detail,
          operatorHint: data.operatorHint,
          requirements: Array.isArray(data.requirements) ? data.requirements : [],
        });
        setError(data.error || copy.connectionFailed);
        setDocuments(FALLBACK_DOCS);
        return;
      }
      setDocuments(data.documents || []);
      setServerBacked(true);
    } catch (err) {
      setServerBacked(false);
      setWorkspaceIssue(null);
      setError(err instanceof Error ? err.message : String(err));
      setDocuments(FALLBACK_DOCS);
    } finally {
      setLoading(false);
    }
  }, [copy.connectionFailed]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const triggerUpload = (document: StudentDocument) => {
    if (authRequired) {
      window.location.href = loginHref;
      return;
    }
    uploadTarget.current = document;
    fileRef.current?.click();
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const target = uploadTarget.current;
    if (!file || !target) return;

    setUploadingType(target.documentType);
    setError(null);
    try {
      const sha256 = await sha256File(file);
      const intentRes = await fetch("/api/documents/upload-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentType: target.documentType,
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          sha256,
        }),
      });
      const intent = await intentRes.json();
      if (!intentRes.ok && intent?.code === "DOCUMENT_WORKSPACE_UNAVAILABLE") {
        setWorkspaceIssue({
          error: intent.error,
          detail: intent.detail,
          operatorHint: intent.operatorHint,
          requirements: Array.isArray(intent.requirements) ? intent.requirements : [],
        });
      }
      if (!intentRes.ok) throw new Error(intent.error || copy.connectionFailed);

      const uploadRes = await fetch(intent.uploadUrl, {
        method: intent.method || "PUT",
        headers: intent.headers || {},
        body: file,
      });
      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadResult.error || copy.connectionFailed);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingType(null);
      uploadTarget.current = null;
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const documentsByType = useMemo(
    () => new Map(documents.map((document) => [document.documentType, document])),
    [documents],
  );
  const isComplete = useCallback(
    (documentType: string) => COMPLETE_STATUSES.has(documentsByType.get(documentType)?.status ?? "NOT_UPLOADED"),
    [documentsByType],
  );
  const requiredTypes = getRequiredDocumentTypes(track);
  const requiredDone = requiredTypes.filter(isComplete).length;
  const overallProgress = requiredTypes.length > 0 ? Math.round((requiredDone / requiredTypes.length) * 100) : 0;
  const activeStage = DOCUMENT_WORKFLOW_STAGES.find((stage) => stage.id === selectedStage) ?? DOCUMENT_WORKFLOW_STAGES[0];
  const stageRows = getStageItems(selectedStage, track);
  const activeStageRequired = getRequiredDocumentTypes(track, selectedStage);
  const activeStageDone = activeStageRequired.filter(isComplete).length;

  return (
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <h1 className="font-serif text-2xl font-bold sm:text-3xl">{tr("docs_title", lang)}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{tr("docs_subtitle", lang)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadDocuments()} disabled={loading} className="self-start">
          {loading ? <KaxiCat state="running" size={16} /> : <RefreshCw className="h-3.5 w-3.5" />}
          {copy.refresh}
        </Button>
      </header>

      <section className="flex flex-col gap-3 border-y py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{tr("docs_track_label", lang)}</p>
          <div className="mt-2 inline-flex rounded-md border bg-muted/50 p-1" role="group" aria-label={tr("docs_track_label", lang)}>
            {(["D-2", "D-4"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={track === option}
                onClick={() => setTrack(option)}
                className={cn(
                  "min-h-9 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  track === option ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tr(option === "D-2" ? "docs_track_d2" : "docs_track_d4", lang)}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-2 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{copy.completed}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{requiredDone} / {requiredTypes.length} {copy.requiredReady}</p>
            </div>
            <span className="text-2xl font-bold tabular-nums">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </section>

      {authRequired && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
            <KaxiCat state="nap" size={40} />
            <p className="font-medium">{copy.loginRequired}</p>
          </div>
          <Button size="sm" onClick={() => { window.location.href = loginHref; }} className="self-center sm:self-auto">
            {copy.login}
          </Button>
        </div>
      )}

      {!authRequired && !loading && !serverBacked && (
        <div className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p>{workspaceIssue ? copy.unavailable : copy.connectionFailed}{error ? ` (${error})` : ""}</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={onFile}
      />

      <Tabs value={selectedStage} onValueChange={(value) => setSelectedStage(value as DocumentStage)} className="gap-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:grid-cols-4">
          {DOCUMENT_WORKFLOW_STAGES.map((stage, index) => {
            const StageIcon = STAGE_ICONS[stage.id];
            const stageRequired = getRequiredDocumentTypes(track, stage.id);
            const stageDone = stageRequired.filter(isComplete).length;
            const stageComplete = stageRequired.length > 0 && stageDone === stageRequired.length;
            return (
              <TabsTrigger
                key={stage.id}
                value={stage.id}
                className="h-auto min-w-0 justify-start whitespace-normal rounded-md border bg-background px-3 py-3 text-left shadow-none data-[state=active]:border-primary-strong data-[state=active]:bg-primary-strong/5 data-[state=active]:shadow-none"
              >
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground",
                  stageComplete && "border-emerald-200 bg-emerald-50 text-emerald-700",
                )}>
                  {stageComplete ? <Check className="h-4 w-4" /> : <StageIcon className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold text-muted-foreground">STEP {index + 1}</span>
                  <span className="block text-sm font-semibold leading-5">{tr(stage.titleKey, lang)}</span>
                  <span className="block text-[11px] font-normal text-muted-foreground">{stageDone}/{stageRequired.length}</span>
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <section aria-labelledby={`stage-${activeStage.id}`}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary-strong">STEP {DOCUMENT_WORKFLOW_STAGES.indexOf(activeStage) + 1}</span>
                <span className="text-xs text-muted-foreground">{activeStageDone}/{activeStageRequired.length} {copy.requiredReady}</span>
              </div>
              <h2 id={`stage-${activeStage.id}`} className="mt-1 font-serif text-xl font-bold sm:text-2xl">{tr(activeStage.titleKey, lang)}</h2>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{tr(activeStage.descriptionKey, lang)}</p>
            </div>
            <a
              href={activeStage.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-strong hover:underline"
            >
              {tr("docs_official_basis", lang)}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {stageRows.map(({ item, use }) => {
              const doc = documentsByType.get(item.type) ?? fallbackDocument(item.type);
              const Icon = statusIcon(doc.status) ?? FileText;
              const uploading = uploadingType === doc.documentType;
              const complete = COMPLETE_STATUSES.has(doc.status);
              const reused = isReusedDocument(item, selectedStage, track);
              return (
                <Card key={item.type} className={cn("rounded-md shadow-none", complete && "border-emerald-200 bg-emerald-50/30")}>
                  <CardContent className="flex h-full flex-col gap-4 p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground",
                        complete && "border-emerald-200 bg-emerald-50 text-emerald-700",
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="break-words text-sm font-semibold leading-5">{tr(item.labelKey, lang)}</h3>
                          {requirementBadge(use.requirement, lang)}
                          {reused && <Badge variant="secondary" className="whitespace-normal text-[10px]">{tr("docs_reused", lang)}</Badge>}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span>{tr(item.issuerKey, lang)}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{tr(item.hintKey, lang)}</p>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", statusTone(doc.status))} />
                          {statusLabel(doc.status, lang)}
                          {doc.reviewStatus === "NEEDS_HUMAN_REVIEW" && (
                            <span className="font-normal text-amber-700">· {copy.reviewing}</span>
                          )}
                        </div>
                        {doc.file && (
                          <p className="mt-1 truncate text-xs text-muted-foreground" title={doc.file.originalName}>
                            {copy.attached}: {doc.file.originalName} · {fileSize(doc.file.sizeBytes)}
                          </p>
                        )}
                        {doc.reviewNote && (
                          <p className="mt-1 text-xs leading-5 text-amber-800">{doc.reviewNote}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={doc.file ? "outline" : "default"}
                        onClick={() => triggerUpload(doc)}
                        disabled={(!serverBacked && !authRequired) || uploading}
                        className="shrink-0 self-start sm:self-auto"
                      >
                        {uploading ? <KaxiCat state="running" size={16} /> : <Upload className="h-3.5 w-3.5" />}
                        {doc.file ? copy.replace : copy.upload}
                      </Button>
                    </div>

                    {(doc.status === "NEEDS_REVIEW" || doc.status === "REJECTED") && (
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onNavigate("partners")}>
                        {tr("docs_connect_admin", lang)}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>{tr("docs_official_basis", lang)}: {activeStage.sourceName}</span>
            <span>{tr("docs_checked_at", lang)}: {activeStage.checkedAt}</span>
          </div>
        </section>
      </Tabs>

      <div className="flex items-start gap-3 border-l-4 border-amber-400 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">
        <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
        <p>{copy.finalCheck}</p>
      </div>
    </div>
  );
}
