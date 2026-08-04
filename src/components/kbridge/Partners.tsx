"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLangStore, useLeadStore, usePartnerStore } from "@/store/kbridge";
import { tr, translationKey, type Lang, type TranslationKey } from "@/lib/i18n/translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Scale, CheckCircle2, Ban, Loader2, ShieldCheck } from "lucide-react";

interface PartnerType {
  key: string;
  icon: typeof Scale;
  titleKey: TranslationKey;
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

// 실제로 연결해 줄 수 있는 파트너만 싣는다.
//
// 전에는 다섯이었다 — 행정사, 번역·공증, 한국어 학원, 학교 입학처, 정착 파트너.
// 그런데 제휴가 되어 있는 것은 행정사 한 곳뿐이었고, 나머지 넷도 똑같이
// "상담 요청" 버튼을 달고 이름·연락처와 제3자 제공·처리위탁·국외이전 동의를
// 받고 있었다. 받은 요청을 넘길 상대가 없으므로, 그 동의는 일어나지 않을 일에
// 대한 동의였다.
//
// 이 제품은 채팅에서 근거 없는 답을 거부한다. 같은 기준을 여기에도 적용한다 —
// 연결이 실제로 되는 것만 싣고, 파트너가 생기면 그때 늘린다.
const PARTNERS: PartnerType[] = [
  {
    key: "admin",
    icon: Scale,
    titleKey: "partner_admin",
    desc: {
      ko: "비자·체류자격 판단, 행정기관 제출서류 작성·제출 대행, 체류자격 변경. 행정사법 영역.",
      vi: "Quyết định visa, hồ sơ hành chính, thay đổi tư cách lưu trú. Theo luật hành chính.",
      mn: "Виз, байршлын шийдвэр. Зөвлөгөөний хуулийн талбар.",
      en: "Visa decisions, administrative submissions, stay status changes. Administrative Scrivener Act scope.",
    },
    example: {
      ko: "비자 거절 이력, D-4→D-2 전환, 체류기간 연장",
      vi: "Từng từ chối visa, chuyển D-4→D-2, gia hạn",
      mn: "Виз татгалзсан, D-4→D-2 шилжих, сунгах",
      en: "Visa refusal, D-4→D-2 transfer, extension",
    },
  },
];

export function Partners({ locale }: { locale?: Lang }) {
  const searchParams = useSearchParams();
  // 라우트 locale이 먼저다. 스토어만 읽으면 서버 렌더에서 항상 기본값 ko가 되어

  // 이 화면 전체가 한국어로 나간다. 자세한 근거는 Landing.tsx 참고.

  const { lang: storeLang } = useLangStore();

  const lang = locale ?? storeLang;
  const { currentLeadId } = useLeadStore();
  const { submitting, submitPartnerRequest } = usePartnerStore();
  const requestedType = searchParams.get("type");
  const initialType = requestedType && PARTNERS.some((partner) => partner.key === requestedType) ? requestedType : null;
  const [open, setOpen] = useState<string | null>(initialType);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [question, setQuestion] = useState(() => searchParams.get("question")?.slice(0, 1000) || "");
  const [thirdPartyProvision, setThirdPartyProvision] = useState(false);
  const [processingConsignment, setProcessingConsignment] = useState(false);
  const [overseasTransfer, setOverseasTransfer] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consentReady = thirdPartyProvision && processingConsignment && overseasTransfer;

  // The removed 2s auto-reset doubled as the form cleanup, so closing has to do
  // it now — otherwise reopening the modal shows the previous confirmation.
  const closeModal = () => {
    setOpen(null);
    setSubmitted(false);
    setError(null);
    setName("");
    setContact("");
    setQuestion("");
    setThirdPartyProvision(false);
    setProcessingConsignment(false);
    setOverseasTransfer(false);
  };

  const submit = async () => {
    setError(null);
    setSubmitted(false);
    if (!name.trim() || !contact.trim()) {
      setError(
        lang === "ko" ? "이름과 연락처를 입력해주세요." :
        lang === "vi" ? "Vui lòng nhập tên và thông tin liên hệ." :
        lang === "mn" ? "Нэр болон холбоо барих мэдээллээ оруулна уу." :
        "Enter your name and contact details."
      );
      return;
    }
    if (!consentReady) {
      setError(
        lang === "ko"
          ? "파트너 연결 전 필수 동의가 필요합니다."
          : lang === "vi"
          ? "Cần đồng ý trước khi kết nối đối tác."
          : lang === "mn"
          ? "Түнштэй холбохын өмнө зөвшөөрөл хэрэгтэй."
          : "Required consent is needed before partner routing."
      );
      return;
    }
    const ok = await submitPartnerRequest(
      currentLeadId,
      open!,
      question,
      {
        name,
        contact,
        contactType: contact.includes("@") ? "email" : "messenger",
      },
      {
        thirdPartyProvision,
        processingConsignment,
        overseasTransfer,
        version: "partner-routing-2026-07-01",
        locale: lang,
        source: "partner-request-form",
      }
    );
    if (ok) {
      // The confirmation used to wipe itself after 2s, which is not long enough
      // to finish reading it in a second language. The user closes it.
      setSubmitted(true);
    } else {
      setError(
        lang === "ko"
          ? "요청 중 오류가 발생했습니다."
          : lang === "vi"
          ? "Lỗi khi gửi."
          : lang === "mn"
          ? "Алдаа гарлаа."
          : "Error submitting."
      );
    }
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-strong/10">
                    <Icon className="h-5 w-5 text-primary-strong" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{tr(p.titleKey, lang)}</CardTitle>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-lg">
                {tr("partner_request", lang)} - {tr(translationKey(`partner_${open}`, "partner_admin"), lang)}
              </CardTitle>
              <CardDescription>
                {lang === "ko" && "동의 후 요청이 운영자 인입 큐에 접수되고, 배정된 파트너가 상태를 갱신합니다."}
                {lang === "vi" && "Sau khi đồng ý, yêu cầu được đưa vào hàng chờ và đối tác được giao sẽ cập nhật trạng thái."}
                {lang === "mn" && "Зөвшөөрсний дараа хүсэлт дараалалд орж, хуваарилагдсан түнш төлөвийг шинэчилнэ."}
                {lang === "en" && "After consent, the request enters the operations queue and the assigned partner updates its status."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {submitted ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    {/* The modal above promises queue intake, not a callback SLA, and a
                        solo-operator queue cannot guarantee 24 hours — the same
                        unkeepable promise already removed from the request_partner
                        tool. Say what actually happens. */}
                    {lang === "ko" && "요청이 접수되었습니다. 운영자 인입 큐에 등록되었고, 배정된 파트너가 상태를 갱신하면 알려드립니다."}
                    {lang === "vi" && "Đã tiếp nhận yêu cầu. Yêu cầu đã vào hàng chờ và bạn sẽ được thông báo khi đối tác được giao cập nhật trạng thái."}
                    {lang === "mn" && "Хүсэлт хүлээн авлаа. Дараалалд орсон бөгөөд хуваарилагдсан түнш төлөвийг шинэчлэхэд танд мэдэгдэнэ."}
                    {lang === "en" && "Request received. It is in the operations queue, and you will be notified when the assigned partner updates its status."}
                  </AlertDescription>
                </Alert>
              ) : null}
              {submitted ? (
                <Button variant="outline" className="w-full" onClick={closeModal}>
                  {lang === "ko" ? "닫기" : lang === "vi" ? "Đóng" : lang === "mn" ? "Хаах" : "Close"}
                </Button>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{lang === "ko" ? "이름" : lang === "vi" ? "Tên" : lang === "mn" ? "Нэр" : "Name"}</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "ko" ? "연락처 (이메일/Zalo/WeChat)" : lang === "vi" ? "Liên hệ" : lang === "mn" ? "Холбоо" : "Contact"}</Label>
                    <Input value={contact} onChange={(e) => setContact(e.target.value)} disabled={submitting} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "ko" ? "문의 내용" : lang === "vi" ? "Nội dung" : lang === "mn" ? "Агуулга" : "Question"}</Label>
                    <Textarea
                      rows={3}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <ShieldCheck className="h-4 w-4 text-primary-strong" />
                      {lang === "ko" ? "개인정보 제공 동의" : lang === "vi" ? "Đồng ý dữ liệu cá nhân" : lang === "mn" ? "Хувийн мэдээллийн зөвшөөрөл" : "Personal data consent"}
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-start gap-2 text-xs leading-relaxed">
                        <Checkbox
                          checked={thirdPartyProvision}
                          onCheckedChange={(value) => setThirdPartyProvision(value === true)}
                          disabled={submitting}
                        />
                        <span>
                          {lang === "ko" && "선택한 독립 파트너에게 연락처, 상담 주제, 유학·비자 관련 입력 정보를 제공하는 데 동의합니다."}
                          {lang === "vi" && "Tôi đồng ý cung cấp liên hệ, chủ đề tư vấn và thông tin du học/visa cho đối tác độc lập đã chọn."}
                          {lang === "mn" && "Сонгосон түншид холбоо барих мэдээлэл, зөвлөгөөний сэдэв, суралцах/визийн мэдээлэл өгөхийг зөвшөөрч байна."}
                          {lang === "en" && "I agree to provide contact, consultation topic, and study/visa context to the selected independent partner."}
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-xs leading-relaxed">
                        <Checkbox
                          checked={processingConsignment}
                          onCheckedChange={(value) => setProcessingConsignment(value === true)}
                          disabled={submitting}
                        />
                        <span>
                          {lang === "ko" && "요청 처리와 보안·운영을 위한 위탁 처리 고지를 확인했습니다."}
                          {lang === "vi" && "Tôi đã xem thông báo xử lý ủy thác cho vận hành, bảo mật và xử lý yêu cầu."}
                          {lang === "mn" && "Хүсэлт боловсруулах, аюулгүй байдал, үйл ажиллагааны боловсруулалтын мэдэгдлийг шалгалаа."}
                          {lang === "en" && "I have reviewed the processing consignment notice for request handling, security, and operations."}
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-xs leading-relaxed">
                        <Checkbox
                          checked={overseasTransfer}
                          onCheckedChange={(value) => setOverseasTransfer(value === true)}
                          disabled={submitting}
                        />
                        <span>
                          {lang === "ko" && "파트너 또는 인프라 접근이 국외에서 발생할 수 있다는 국외이전 고지를 확인했습니다."}
                          {lang === "vi" && "Tôi đã xem thông báo dữ liệu có thể được truy cập/chuyển ra nước ngoài bởi đối tác hoặc hạ tầng."}
                          {lang === "mn" && "Түнш эсвэл дэд бүтэц гадаадаас хандаж болзошгүй тухай мэдэгдлийг шалгалаа."}
                          {lang === "en" && "I have reviewed the overseas-transfer notice for possible partner or infrastructure access outside Korea."}
                        </span>
                      </label>
                    </div>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button className="w-full" onClick={submit} disabled={submitting || !consentReady}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
