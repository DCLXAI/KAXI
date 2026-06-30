"use client";

import { useState } from "react";
import { useLangStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Scale, Languages, BookOpen, School, Home, CheckCircle2, Ban } from "lucide-react";

interface PartnerType {
  key: string;
  icon: typeof Scale;
  titleKey: string;
  desc: {
    ko: string;
    vi: string;
    mn: string;
    en: string;
  };
  example: {
    ko: string;
    vi: string;
    mn: string;
    en: string;
  };
}

const PARTNERS: PartnerType[] = [
  {
    key: "admin",
    icon: Scale,
    titleKey: "partner_admin",
    desc: {
      ko: "비자·체류자격 판단, 행정기관 제출서류 작성·제출 대행, 체류자격 변경. 행정사법 영역.",
      vi: "Quyết định visa, hồ sơ hành chính, thay đổi tư cách lưu trú. Theo luật hành chính.",
      mn: "Виз, байршлын шийдвэр. Зөвлөгөөний хуулийн талбар.",
      en: "Visa decisions, administrative submissions, stay status changes. Admin lawyer scope.",
    },
    example: {
      ko: "비자 거절 이력, D-4→D-2 전환, 체류기간 연장",
      vi: "Từng từ chối visa, chuyển D-4→D-2, gia hạn",
      mn: "Виз татгалзсан, D-4→D-2 шилжих, сунгах",
      en: "Visa refusal, D-4→D-2 transfer, extension",
    },
  },
  {
    key: "translation",
    icon: Languages,
    titleKey: "partner_translation",
    desc: {
      ko: "졸업증명서·성적증명서·호적 등 공식 번역·공증. 베트남어·몽골어·영어 가능.",
      vi: "Dịch+công chứng bằng cấp, học bạ, hộ tịch. Tiếng Việt/Mông Cổ/Anh.",
      mn: "Орчуулга, гэрчилгээ. Монгол/Вьетнам/Англи хэл.",
      en: "Translation & notarization of diplomas, transcripts, family records.",
    },
    example: {
      ko: "VO/ GZO 등 번역공증, 문서당 약 15,000~50,000원",
      vi: "Dịch+công chứng, 15,000~50,000₩/tài liệu",
      mn: "15,000~50,000₩/баримт",
      en: "15,000~50,000₩/document",
    },
  },
  {
    key: "academy",
    icon: BookOpen,
    titleKey: "partner_academy",
    desc: {
      ko: "현지 한국어 학원. TOPIK 대비, 기초 한국어 과정.",
      vi: "Trung tâm tiếng Hàn tại địa phương. TOPIK, cơ bản.",
      mn: "Орон нутагийн Солонгос хэлний төв. TOPIK.",
      en: "Local Korean academies. TOPIK prep, basic Korean.",
    },
    example: {
      ko: "TOPIK 3급 도달 시 학위과정 지원 가능",
      vi: "Đạt TOPIK 3 → nộp ĐH",
      mn: "TOPIK 3 → их сургууль",
      en: "TOPIK 3 → degree eligible",
    },
  },
  {
    key: "admission",
    icon: School,
    titleKey: "partner_admission",
    desc: {
      ko: "학교 입학처·유학 담당자 직접 연결. 모집요강, 표준입학허가서 발급 문의.",
      vi: "Phòng tuyển sinh trường. Hỏi về tuyển sinh, giấy nhập học.",
      mn: "Сургуулийн элсэлтийн алба. Элсэлт, зөвшөөрөл.",
      en: "School admission offices. Recruitment, admission letters.",
    },
    example: {
      ko: "모집요강, 제출서류, 표준입학허가서 발급 일정",
      vi: "Yêu cầu tuyển sinh, lịch cấp giấy",
      mn: "Элсэлтийн нөхцөл, хуанли",
      en: "Requirements, issuance schedule",
    },
  },
  {
    key: "settlement",
    icon: Home,
    titleKey: "partner_settlement",
    desc: {
      ko: "공항 픽업, 숙소, 유심, 건강보험, 은행 계좌, 외국인등록 안내.",
      vi: "Đón sân bay, nhà ở, SIM, bảo hiểm, ngân hàng, đăng ký người nước ngoài.",
      mn: "Нисэх буудал, байр, SIM, даатгал, банк, бүртгэл.",
      en: "Airport pickup, housing, SIM, insurance, bank, ARC registration.",
    },
    example: {
      ko: "입국 후 90일 이내 외국인등록 필수",
      vi: "Đăng ký người nước ngoài trong 90 ngày",
      mn: "90 хоногийн дотор бүртгүүлэх",
      en: "ARC within 90 days of arrival",
    },
  },
];

export function Partners() {
  const { lang } = useLangStore();
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    setSubmitted(true);
    setTimeout(() => {
      setOpen(null);
      setSubmitted(false);
      setName("");
      setContact("");
      setQuestion("");
    }, 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tr("partners_title", lang)}</h1>
        <p className="text-muted-foreground mt-2">{tr("partners_subtitle", lang)}</p>
      </div>

      {/* 제외 카드 */}
      <Alert variant="destructive">
        <Ban className="h-4 w-4" />
        <AlertTitle>{tr("partner_excluded", lang)}</AlertTitle>
        <AlertDescription>
          {lang === "ko" && "미등록 유료직업소개사업은 직업안정법 제47조 위반 (5년 이하 징역 또는 5천만원 이하 벌금). 알바·공장·농장·요양시설 취업 연결은 제공하지 않습니다."}
          {lang === "vi" && "Theo luật việc làm, ghép việc bất hợp pháp bị phạt. Nền tảng không ghép việc."}
          {lang === "mn" && "Ажлын хууль ёсны зөрчил. Ажил холбохгүй."}
          {lang === "en" && "Unregistered job matching violates Employment Security Act (5yr prison / 50M fine). No job matching provided."}
        </AlertDescription>
      </Alert>

      {/* 파트너 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PARTNERS.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.key}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{tr(p.titleKey as any, lang)}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm leading-relaxed mt-2">
                  {p.desc[lang]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground mb-3">
                  <span className="font-medium text-foreground">{lang === "ko" ? "예시" : lang === "vi" ? "Ví dụ" : lang === "mn" ? "Жишээ" : "Example"}: </span>
                  {p.example[lang]}
                </div>
                <Button size="sm" className="w-full" onClick={() => setOpen(p.key)}>
                  {tr("partner_request", lang)}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 신청 모달 (간단 inline) */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(null)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-lg">
                {tr("partner_request", lang)} - {tr(`partner_${open}` as any, lang)}
              </CardTitle>
              <CardDescription>
                {lang === "ko" && "담당자가 24시간 내 연락드립니다 (데모: 실제 전송 안 됨)"}
                {lang === "vi" && "Liên hệ trong 24h (demo)"}
                {lang === "mn" && "24 цагийн дотор (demo)"}
                {lang === "en" && "Contact within 24h (demo)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {submitted ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    {lang === "ko" && "요청이 접수되었습니다!"}
                    {lang === "vi" && "Đã gửi!"}
                    {lang === "mn" && "Илгээгдлээ!"}
                    {lang === "en" && "Submitted!"}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{lang === "ko" ? "이름" : lang === "vi" ? "Tên" : lang === "mn" ? "Нэр" : "Name"}</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "ko" ? "연락처 (이메일/Zalo/WeChat)" : lang === "vi" ? "Liên hệ" : lang === "mn" ? "Холбоо" : "Contact"}</Label>
                    <Input value={contact} onChange={(e) => setContact(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "ko" ? "문의 내용" : lang === "vi" ? "Nội dung" : lang === "mn" ? "Агуулга" : "Question"}</Label>
                    <Textarea
                      rows={3}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" onClick={submit}>
                    {tr("partner_request", lang)}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
