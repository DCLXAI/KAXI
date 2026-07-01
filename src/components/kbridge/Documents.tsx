"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, FileQuestion, FileText, FileWarning, RefreshCw, Upload } from "lucide-react";
import { useLangStore } from "@/store/kbridge";
import { tr } from "@/lib/i18n/translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

const STATUS_LABELS: Record<string, { ko: string; en: string }> = {
  NOT_UPLOADED: { ko: "미업로드", en: "Not uploaded" },
  UPLOADED: { ko: "업로드 완료", en: "Uploaded" },
  OCR_PROCESSING: { ko: "OCR 처리 중", en: "OCR processing" },
  OCR_DONE: { ko: "OCR 완료", en: "OCR done" },
  NEEDS_REVIEW: { ko: "검토 필요", en: "Needs review" },
  APPROVED: { ko: "승인", en: "Approved" },
  REJECTED: { ko: "반려", en: "Rejected" },
};

const FALLBACK_DOCS: StudentDocument[] = [
  "passport",
  "id_photo",
  "standard_admission",
  "graduation_certificate",
  "transcript",
  "financial_proof",
  "tuberculosis_certificate",
  "study_plan",
].map((documentType) => ({
  id: null,
  documentType,
  label: documentType,
  required: !["tuberculosis_certificate", "study_plan"].includes(documentType),
  status: "NOT_UPLOADED",
  reviewStatus: "PENDING",
  reviewNote: null,
  expiresAt: null,
  file: null,
}));

function statusLabel(status: string, lang: string) {
  const label = STATUS_LABELS[status] || { ko: status, en: status };
  return lang === "ko" ? label.ko : label.en;
}

function statusColor(status: string): string {
  switch (status) {
    case "APPROVED":
    case "OCR_DONE":
      return "bg-emerald-500";
    case "UPLOADED":
    case "OCR_PROCESSING":
      return "bg-blue-500";
    case "NEEDS_REVIEW":
      return "bg-amber-500";
    case "REJECTED":
      return "bg-red-500";
    case "NOT_UPLOADED":
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
      return Clock;
    case "NEEDS_REVIEW":
    case "REJECTED":
      return FileWarning;
    default:
      return FileQuestion;
  }
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

function getStudentRef() {
  const key = "kaxiDocumentStudentRef";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export function Documents({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { lang } = useLangStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<StudentDocument | null>(null);
  const [studentRef, setStudentRef] = useState<string | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>(FALLBACK_DOCS);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverBacked, setServerBacked] = useState(false);

  const loadDocuments = useCallback(async (ref = studentRef) => {
    if (!ref) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents?studentRef=${encodeURIComponent(ref)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "문서 목록을 불러오지 못했습니다.");
      setDocuments(data.documents || []);
      setServerBacked(true);
    } catch (err) {
      setServerBacked(false);
      setError(err instanceof Error ? err.message : String(err));
      setDocuments(FALLBACK_DOCS);
    } finally {
      setLoading(false);
    }
  }, [studentRef]);

  useEffect(() => {
    setStudentRef(getStudentRef());
  }, []);

  useEffect(() => {
    if (!studentRef) return;
    void loadDocuments(studentRef);
  }, [loadDocuments, studentRef]);

  const triggerUpload = (document: StudentDocument) => {
    uploadTarget.current = document;
    fileRef.current?.click();
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const target = uploadTarget.current;
    if (!file || !target || !studentRef) return;

    setUploadingType(target.documentType);
    setError(null);
    try {
      const sha256 = await sha256File(file);
      const intentRes = await fetch("/api/documents/upload-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentRef,
          documentType: target.documentType,
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          sha256,
        }),
      });
      const intent = await intentRes.json();
      if (!intentRes.ok) throw new Error(intent.error || "업로드 URL을 만들지 못했습니다.");

      const uploadRes = await fetch(intent.uploadUrl, {
        method: intent.method || "PUT",
        headers: intent.headers || {},
        body: file,
      });
      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadResult.error || "파일 업로드에 실패했습니다.");
      await loadDocuments(studentRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingType(null);
      uploadTarget.current = null;
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const total = documents.length;
  const doneCount = documents.filter((doc) => doc.status === "APPROVED" || doc.status === "OCR_DONE").length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{tr("docs_title", lang)}</h1>
          <p className="text-muted-foreground mt-2">{tr("docs_subtitle", lang)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadDocuments()} disabled={loading || !studentRef}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {lang === "ko" ? "새로고침" : "Refresh"}
        </Button>
      </div>

      <Card className={serverBacked ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"}>
        <CardContent className="flex items-start gap-3 py-4">
          <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${serverBacked ? "text-blue-600" : "text-amber-600"}`} />
          <div className={`text-xs ${serverBacked ? "text-blue-900" : "text-amber-900"}`}>
            {serverBacked
              ? "파일은 SHA-256 해시, 용량, MIME 검증을 거쳐 업로드되고 행정사 검수 상태가 기록됩니다. OCR은 이후 비동기 처리로 확장됩니다."
              : `현재 문서 서버가 준비되지 않아 업로드가 비활성화되어 있습니다.${error ? ` (${error})` : ""}`}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{tr("docs_progress", lang)}</CardTitle>
            <span className="text-2xl font-bold">{progress}%</span>
          </div>
          <CardDescription>
            {doneCount} / {total} {lang === "ko" ? "승인 또는 OCR 완료" : "approved/OCR done"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {Object.keys(STATUS_LABELS).map((status) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${statusColor(status)}`} />
                <span>{statusLabel(status, lang)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={onFile}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {documents.map((doc) => {
          const Icon = statusIcon(doc.status) ?? FileText;
          const uploading = uploadingType === doc.documentType;
          return (
            <Card key={doc.documentType}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-sm">{doc.label}</div>
                      {doc.required && <Badge variant="outline" className="text-[10px]">필수</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${statusColor(doc.status)}`} />
                        {statusLabel(doc.status, lang)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{doc.reviewStatus}</Badge>
                    </div>
                    {doc.file && (
                      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        <div className="truncate">첨부: {doc.file.originalName} · {fileSize(doc.file.sizeBytes)}</div>
                        <div className="font-mono">sha256 {doc.file.sha256.slice(0, 12)}...</div>
                      </div>
                    )}
                    {doc.reviewNote && (
                      <div className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">{doc.reviewNote}</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={doc.file ? "outline" : "default"}
                    onClick={() => triggerUpload(doc)}
                    disabled={!serverBacked || uploading}
                  >
                    {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {doc.file ? "교체" : tr("docs_upload", lang)}
                  </Button>
                </div>
                {(doc.status === "NEEDS_REVIEW" || doc.status === "REJECTED") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full text-xs"
                    onClick={() => onNavigate("partners")}
                  >
                    {tr("docs_connect_admin", lang)}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 py-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            {lang === "ko" && "최종 제출서류는 학교와 관할 재외공관 기준을 반드시 확인하세요. 국가·프로그램별 추가서류가 요구될 수 있습니다."}
            {lang === "vi" && "Kiểm tra với trường và đại sứ quán. Có thể cần thêm giấy tờ."}
            {lang === "mn" && "Сургууль болон ЭСЯ-тай шалга. Нэмэлт баримт шаардлагатай."}
            {lang === "en" && "Verify with school & embassy. Additional docs may be required."}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
