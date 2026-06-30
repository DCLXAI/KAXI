"use client";

import { useRef } from "react";
import { useLangStore, useDocsStore, type DocStatus } from "@/store/kbridge";
import { tr } from "@/lib/i18n/translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Upload, MoreVertical, FileText, CheckCircle2, Clock, AlertCircle, FileWarning, FileQuestion } from "lucide-react";

const ALL_DOCS = [
  "docs_doc_passport",
  "docs_doc_photo",
  "docs_doc_diploma",
  "docs_doc_transcript",
  "docs_doc_finance",
  "docs_doc_family",
  "docs_doc_admission",
  "docs_doc_tuberculosis",
  "docs_doc_plan",
  "docs_doc_business",
] as const;

const STATUS_ORDER: DocStatus[] = ["done", "translation", "notarization", "school_check", "admin_help", "pending", "not_yet"];

function statusColor(status: DocStatus): string {
  switch (status) {
    case "done":
      return "bg-green-500";
    case "translation":
    case "notarization":
      return "bg-amber-500";
    case "school_check":
    case "admin_help":
      return "bg-orange-500";
    case "pending":
      return "bg-slate-400";
    case "not_yet":
      return "bg-slate-200";
  }
}

function statusIcon(status: DocStatus) {
  switch (status) {
    case "done":
      return CheckCircle2;
    case "translation":
    case "notarization":
    case "pending":
      return Clock;
    case "school_check":
    case "admin_help":
      return FileWarning;
    case "not_yet":
      return FileQuestion;
  }
}

export function Documents() {
  const { lang } = useLangStore();
  const { docs, setStatus, upload } = useDocsStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);

  const total = ALL_DOCS.length;
  const doneCount = Object.values(docs).filter((d) => d.status === "done").length;
  const progress = Math.round((doneCount / total) * 100);

  const triggerUpload = (key: string) => {
    uploadTarget.current = key;
    fileRef.current?.click();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && uploadTarget.current) {
      upload(uploadTarget.current, f.name);
    }
    if (fileRef.current) fileRef.current.value = "";
    uploadTarget.current = null;
  };

  const statusLabel = (s: DocStatus) => tr(`status_${s}` as any, lang);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tr("docs_title", lang)}</h1>
        <p className="text-muted-foreground mt-2">{tr("docs_subtitle", lang)}</p>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4 pb-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            {lang === "ko" && "이 워크스페이스는 데모입니다. 파일명만 브라우저에 저장되며 실제 파일은 업로드되지 않습니다. 운영 환경에서는 암호화된 스토리지와 보존/삭제 정책이 필요합니다."}
            {lang === "vi" && "Bản demo — chỉ lưu tên tệp. Môi trường thực cần lưu trữ mã hóa và chính sách lưu/xóa."}
            {lang === "mn" && "Демо — зөвхөн файлын нэр хадгална. Үйлдвэрлэлийн орчинд шифрлэсэн хадгалалт болон устгах бодлого шаардлагатай."}
            {lang === "en" && "Demo only: filenames are stored locally, no actual files are uploaded. Production needs encrypted storage and a retention/deletion policy."}
          </div>
        </CardContent>
      </Card>

      {/* 진행률 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{tr("docs_progress", lang)}</CardTitle>
            <span className="text-2xl font-bold">{progress}%</span>
          </div>
          <CardDescription>
            {doneCount} / {total} {lang === "ko" ? "완료" : lang === "vi" ? "xong" : lang === "mn" ? "дууссан" : "done"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${statusColor(s)}`} />
                <span>{statusLabel(s)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 서류 목록 */}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={onFile}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ALL_DOCS.map((docKey) => {
          const doc = docs[docKey] ?? { key: docKey, status: "pending" as DocStatus };
          const Icon = statusIcon(doc.status) ?? FileText;
          return (
            <Card key={docKey}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${statusColor(doc.status)} bg-opacity-15`}>
                    <Icon className={`h-5 w-5 ${
                      doc.status === "done" ? "text-green-600" :
                      doc.status === "translation" || doc.status === "notarization" || doc.status === "pending" ? "text-amber-600" :
                      doc.status === "school_check" || doc.status === "admin_help" ? "text-orange-600" :
                      "text-slate-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{tr(docKey, lang)}</div>
                    <Badge
                      variant="outline"
                      className={`mt-1 text-xs ${statusColor(doc.status)} border-transparent`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor(doc.status)} mr-1`} />
                      {statusLabel(doc.status)}
                    </Badge>
                    {doc.fileName && (
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        📎 {doc.fileName}
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => triggerUpload(docKey)}>
                        <Upload className="h-3.5 w-3.5 mr-2" />
                        {tr("docs_upload", lang)}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="font-medium" disabled>
                        {tr("docs_change_status", lang)}
                      </DropdownMenuItem>
                      {STATUS_ORDER.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => setStatus(docKey, s)}
                          className="gap-2 text-xs"
                        >
                          <div className={`h-2 w-2 rounded-full ${statusColor(s)}`} />
                          {statusLabel(s)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {(doc.status === "admin_help" || doc.status === "notarization" || doc.status === "translation") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 text-xs"
                    onClick={() => (window.location.hash = "partners")}
                  >
                    {tr("docs_connect_admin", lang)}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 경고 카드 */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
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
