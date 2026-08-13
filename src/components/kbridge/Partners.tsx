"use client";

import Image from "next/image";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLangStore, useLeadStore, usePartnerStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  Scale,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

// Keep the offered partner type explicit: the partner-offering contract test reads
// this list and checks that the UI and server accept exactly the same types.
const PARTNERS = [
  {
    key: "admin",
  },
] as const;

const copy: Record<
  Lang,
  {
    eyebrow: string;
    title: string;
    intro: string;
    primaryCta: string;
    officeCta: string;
    profileLabel: string;
    principal: string;
    specialty: string;
    verified: string;
    expertiseTitle: string;
    expertiseIntro: string;
    expertise: string[];
    processEyebrow: string;
    processTitle: string;
    process: Array<{ title: string; description: string }>;
    officeTitle: string;
    officeDescription: string;
    headquarters: string;
    branch: string;
    matchingEyebrow: string;
    matchingTitle: string;
    matchingDescription: string;
    partnerLabel: string;
    name: string;
    contact: string;
    contactPlaceholder: string;
    question: string;
    questionPlaceholder: string;
    consentTitle: string;
    thirdPartyConsent: string;
    processingConsent: string;
    overseasConsent: string;
    submit: string;
    success: string;
    newRequest: string;
    nameError: string;
    consentError: string;
    submitError: string;
    disclaimer: string;
    employmentNotice: string;
  }
> = {
  ko: {
    eyebrow: "KARXY 공식 제휴 파트너",
    title: "권영근 행정사와\n연결해 드립니다",
    intro: "한국 체류·비자와 행정 절차가 복잡할 때, 로뎀행정사사무소 권영근 행정사에게 상담 내용을 안전하게 전달합니다.",
    primaryCta: "상담 요청하기",
    officeCta: "사무소 정보 보기",
    profileLabel: "제휴 파트너 프로필",
    principal: "로뎀행정사사무소 대표/행정사",
    specialty: "정부지원사업 전문",
    verified: "KARXY 제휴 확인",
    expertiseTitle: "이런 상담을 연결합니다",
    expertiseIntro: "비자·체류 및 행정기관 제출 절차처럼 개별 검토가 필요한 사안을 전문 행정사에게 전달합니다.",
    expertise: ["비자 거절 이력 및 대응 방향", "D-4 → D-2 등 체류자격 변경", "체류기간 연장 및 제출서류 검토", "행정기관 제출서류 작성·제출 대행", "정부지원사업 행정 상담"],
    processEyebrow: "MATCHING PROCESS",
    processTitle: "요청부터 연결까지",
    process: [
      { title: "상담 요청 작성", description: "현재 상황과 궁금한 점, 연락 가능한 수단을 남깁니다." },
      { title: "KARXY 접수", description: "동의 내용을 확인하고 권영근 행정사 연결 요청으로 접수합니다." },
      { title: "파트너 확인·연락", description: "상담 가능 여부와 범위·비용은 행정사가 확인 후 별도로 안내합니다." },
    ],
    officeTitle: "로뎀행정사사무소",
    officeDescription: "Rodem Administrative Attorneys Office · 정부지원사업 전문행정사",
    headquarters: "서울시 서초구 강남대로 381 두산베어스텔 706호 (강남역 7번 출구 바로 앞)",
    branch: "서울시 관악구 신림로 340 르네상스빌딩 7층 A731호",
    matchingEyebrow: "1:1 PARTNER MATCHING",
    matchingTitle: "권영근 행정사 상담 요청",
    matchingDescription: "작성한 내용은 상담 연결 목적으로 KARXY 운영팀과 로뎀행정사사무소에 전달됩니다.",
    partnerLabel: "연결 파트너",
    name: "이름",
    contact: "연락처",
    contactPlaceholder: "전화번호, 이메일, Zalo 또는 WeChat",
    question: "상담 내용",
    questionPlaceholder: "현재 체류자격, 신청하려는 절차, 궁금한 점을 적어주세요.",
    consentTitle: "개인정보 제공 동의",
    thirdPartyConsent: "권영근 행정사(로뎀행정사사무소)에게 연락처, 상담 주제, 유학·비자 관련 입력 정보를 제공하는 데 동의합니다.",
    processingConsent: "요청 처리와 보안·운영을 위한 위탁 처리 고지를 확인했습니다.",
    overseasConsent: "파트너 또는 인프라 접근이 국외에서 발생할 수 있다는 국외이전 고지를 확인했습니다.",
    submit: "권영근 행정사에게 상담 요청",
    success: "요청이 접수되었습니다. 권영근 행정사 연결 요청이 운영 큐에 등록되었으며, 상태가 갱신되면 알려드립니다.",
    newRequest: "새 상담 요청 작성",
    nameError: "이름과 연락처를 입력해주세요.",
    consentError: "파트너 연결 전 필수 동의가 필요합니다.",
    submitError: "요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    disclaimer: "상담 가능 여부, 수임 범위 및 비용은 행정사 확인 후 별도로 안내됩니다. KARXY는 연결을 지원하며 법률·행정 판단을 대신하지 않습니다.",
    employmentNotice: "KARXY와 로뎀행정사사무소 연결은 비자·체류 및 행정 상담을 위한 서비스입니다. 취업 알선은 제공하지 않습니다.",
  },
  vi: {
    eyebrow: "Đối tác chính thức của KARXY",
    title: "Kết nối với\nchuyên gia Kwon Young-geun",
    intro: "Khi thủ tục cư trú, visa hoặc hành chính tại Hàn Quốc trở nên phức tạp, KARXY chuyển nội dung tư vấn an toàn đến chuyên gia Kwon Young-geun của Văn phòng Rodem.",
    primaryCta: "Yêu cầu tư vấn",
    officeCta: "Xem thông tin văn phòng",
    profileLabel: "Hồ sơ đối tác",
    principal: "Giám đốc / chuyên gia hành chính, Văn phòng Rodem",
    specialty: "Chuyên về chương trình hỗ trợ của chính phủ",
    verified: "Đối tác được KARXY xác nhận",
    expertiseTitle: "Nội dung có thể tư vấn",
    expertiseIntro: "KARXY chuyển các trường hợp cần xem xét riêng về visa, cư trú và hồ sơ hành chính đến chuyên gia.",
    expertise: ["Lịch sử bị từ chối visa và hướng xử lý", "Chuyển đổi tư cách lưu trú như D-4 → D-2", "Gia hạn lưu trú và kiểm tra hồ sơ", "Soạn và nộp hồ sơ cho cơ quan hành chính", "Tư vấn chương trình hỗ trợ của chính phủ"],
    processEyebrow: "QUY TRÌNH KẾT NỐI",
    processTitle: "Từ yêu cầu đến kết nối",
    process: [
      { title: "Gửi yêu cầu", description: "Mô tả tình huống, câu hỏi và cách liên hệ thuận tiện." },
      { title: "KARXY tiếp nhận", description: "KARXY kiểm tra đồng ý và ghi nhận yêu cầu kết nối." },
      { title: "Đối tác liên hệ", description: "Chuyên gia xác nhận phạm vi, khả năng tư vấn và chi phí riêng." },
    ],
    officeTitle: "Văn phòng Hành chính Rodem",
    officeDescription: "Rodem Administrative Attorneys Office · Chuyên gia chương trình hỗ trợ chính phủ",
    headquarters: "Phòng 706, Doosan Bearstel, 381 Gangnam-daero, Seocho-gu, Seoul",
    branch: "Phòng A731, tầng 7, Renaissance Building, 340 Sillim-ro, Gwanak-gu, Seoul",
    matchingEyebrow: "KẾT NỐI 1:1",
    matchingTitle: "Yêu cầu tư vấn với Kwon Young-geun",
    matchingDescription: "Nội dung bạn gửi được chuyển cho đội ngũ KARXY và Văn phòng Rodem chỉ để kết nối tư vấn.",
    partnerLabel: "Đối tác được kết nối",
    name: "Họ tên",
    contact: "Liên hệ",
    contactPlaceholder: "Số điện thoại, email, Zalo hoặc WeChat",
    question: "Nội dung tư vấn",
    questionPlaceholder: "Ghi tư cách lưu trú hiện tại, thủ tục cần làm và câu hỏi.",
    consentTitle: "Đồng ý cung cấp dữ liệu cá nhân",
    thirdPartyConsent: "Tôi đồng ý cung cấp thông tin liên hệ, chủ đề tư vấn và dữ liệu du học/visa cho chuyên gia Kwon Young-geun (Văn phòng Rodem).",
    processingConsent: "Tôi đã xem thông báo xử lý ủy thác cho vận hành, bảo mật và xử lý yêu cầu.",
    overseasConsent: "Tôi đã xem thông báo dữ liệu có thể được truy cập hoặc chuyển ra nước ngoài bởi đối tác hay hạ tầng.",
    submit: "Gửi yêu cầu cho chuyên gia",
    success: "Đã tiếp nhận yêu cầu kết nối với chuyên gia Kwon Young-geun. Bạn sẽ được thông báo khi trạng thái được cập nhật.",
    newRequest: "Tạo yêu cầu mới",
    nameError: "Vui lòng nhập tên và thông tin liên hệ.",
    consentError: "Cần đồng ý trước khi kết nối đối tác.",
    submitError: "Không thể gửi yêu cầu. Vui lòng thử lại sau.",
    disclaimer: "Khả năng tư vấn, phạm vi dịch vụ và chi phí do chuyên gia xác nhận riêng. KARXY hỗ trợ kết nối và không thay thế phán đoán pháp lý hoặc hành chính.",
    employmentNotice: "Dịch vụ này chỉ dành cho tư vấn visa, cư trú và hành chính. KARXY không cung cấp môi giới việc làm.",
  },
  mn: {
    eyebrow: "KARXY-ийн албан ёсны түнш",
    title: "Квон Ён Гын\nзөвлөхтэй холбогдох",
    intro: "Солонгосын оршин суух, виз болон захиргааны ажиллагаа төвөгтэй үед KARXY таны хүсэлтийг Родэм албаны Квон Ён Гын зөвлөхөд аюулгүй дамжуулна.",
    primaryCta: "Зөвлөгөө хүсэх",
    officeCta: "Албаны мэдээлэл",
    profileLabel: "Түншийн танилцуулга",
    principal: "Родэм захиргааны албаны захирал / зөвлөх",
    specialty: "Засгийн газрын дэмжлэгийн хөтөлбөрийн мэргэжилтэн",
    verified: "KARXY түншлэл баталгаажсан",
    expertiseTitle: "Зөвлөгөө авах чиглэл",
    expertiseIntro: "Виз, оршин суух болон захиргааны баримт бичгийн хувь хүний үнэлгээ шаардсан асуудлыг мэргэжилтэнд дамжуулна.",
    expertise: ["Виз татгалзсан түүх ба шийдлийн чиглэл", "D-4 → D-2 зэрэг оршин суух ангилал солих", "Оршин суух хугацаа сунгах, материал шалгах", "Захиргааны байгууллагад материал бэлтгэх, өгөх", "Засгийн газрын дэмжлэгийн хөтөлбөрийн зөвлөгөө"],
    processEyebrow: "ХОЛБОХ ҮЙЛ ЯВЦ",
    processTitle: "Хүсэлтээс холболт хүртэл",
    process: [
      { title: "Хүсэлт бичих", description: "Нөхцөл байдал, асуулт болон холбоо барих сувгаа үлдээнэ." },
      { title: "KARXY хүлээн авах", description: "Зөвшөөрлийг шалгаж, түншид холбох хүсэлтийг бүртгэнэ." },
      { title: "Түнш холбогдох", description: "Зөвлөх боломж, ажлын хүрээ, төлбөрийг тусад нь мэдээлнэ." },
    ],
    officeTitle: "Родэм захиргааны зөвлөх алба",
    officeDescription: "Rodem Administrative Attorneys Office · Засгийн газрын дэмжлэгийн хөтөлбөр",
    headquarters: "Сөүл, Сочо-гу, Каннам-дэро 381, Doosan Bearstel 706",
    branch: "Сөүл, Гванак-гу, Шиллим-ро 340, Renaissance Building 7 давхар A731",
    matchingEyebrow: "1:1 ТҮНШ ХОЛБОЛТ",
    matchingTitle: "Квон Ён Гын зөвлөхөд хүсэлт илгээх",
    matchingDescription: "Таны мэдээллийг зөвхөн зөвлөгөөний холболтын зорилгоор KARXY болон Родэм албанд дамжуулна.",
    partnerLabel: "Холбох түнш",
    name: "Нэр",
    contact: "Холбоо барих",
    contactPlaceholder: "Утас, имэйл, Zalo эсвэл WeChat",
    question: "Зөвлөгөөний агуулга",
    questionPlaceholder: "Одоогийн оршин суух ангилал, хийх ажиллагаа, асуултаа бичнэ үү.",
    consentTitle: "Хувийн мэдээллийн зөвшөөрөл",
    thirdPartyConsent: "Квон Ён Гын зөвлөхөд (Родэм алба) холбоо барих мэдээлэл, сэдэв, суралцах/визийн мэдээлэл өгөхийг зөвшөөрч байна.",
    processingConsent: "Хүсэлт боловсруулах, аюулгүй байдал, үйл ажиллагааны боловсруулалтын мэдэгдлийг шалгалаа.",
    overseasConsent: "Түнш эсвэл дэд бүтэц гадаадаас мэдээлэлд хандаж болзошгүй мэдэгдлийг шалгалаа.",
    submit: "Зөвлөхөд хүсэлт илгээх",
    success: "Квон Ён Гын зөвлөхтэй холбох хүсэлтийг хүлээн авлаа. Төлөв шинэчлэгдэхэд танд мэдэгдэнэ.",
    newRequest: "Шинэ хүсэлт бичих",
    nameError: "Нэр болон холбоо барих мэдээллээ оруулна уу.",
    consentError: "Түнштэй холбохын өмнө зөвшөөрөл хэрэгтэй.",
    submitError: "Хүсэлтийг илгээж чадсангүй. Дараа дахин оролдоно уу.",
    disclaimer: "Зөвлөгөөний боломж, ажлын хүрээ, төлбөрийг зөвлөх тусад нь баталгаажуулна. KARXY нь холболтод тусалдаг бөгөөд хууль, захиргааны шийдвэрийг орлохгүй.",
    employmentNotice: "Энэ үйлчилгээ нь виз, оршин суух болон захиргааны зөвлөгөөнд зориулагдсан. Ажил зуучлах үйлчилгээ үзүүлэхгүй.",
  },
  en: {
    eyebrow: "Official KARXY partner",
    title: "Connect with\nKwon Young-geun",
    intro: "When Korean visa, stay, or administrative procedures become complex, KARXY securely routes your consultation to Kwon Young-geun of Rodem Administrative Attorneys Office.",
    primaryCta: "Request consultation",
    officeCta: "View office details",
    profileLabel: "Partner profile",
    principal: "Principal administrative scrivener, Rodem Office",
    specialty: "Government support program specialist",
    verified: "KARXY partnership verified",
    expertiseTitle: "Consultation areas",
    expertiseIntro: "We route matters requiring individual review—visa, stay status, and administrative submissions—to a specialist.",
    expertise: ["Prior visa refusal and response direction", "Stay-status changes such as D-4 → D-2", "Stay extensions and document review", "Preparing and submitting administrative filings", "Government support program consultation"],
    processEyebrow: "MATCHING PROCESS",
    processTitle: "From request to connection",
    process: [
      { title: "Write your request", description: "Share your situation, questions, and preferred contact channel." },
      { title: "KARXY intake", description: "We verify consent and register the request for Kwon Young-geun." },
      { title: "Partner review", description: "The specialist separately confirms availability, scope, and fees." },
    ],
    officeTitle: "Rodem Administrative Attorneys Office",
    officeDescription: "Government support program specialist",
    headquarters: "Suite 706, Doosan Bearstel, 381 Gangnam-daero, Seocho-gu, Seoul",
    branch: "Suite A731, 7F Renaissance Building, 340 Sillim-ro, Gwanak-gu, Seoul",
    matchingEyebrow: "1:1 PARTNER MATCHING",
    matchingTitle: "Request a consultation with Kwon Young-geun",
    matchingDescription: "Your submission is shared with the KARXY operations team and Rodem Office only to arrange the consultation.",
    partnerLabel: "Matched partner",
    name: "Name",
    contact: "Contact",
    contactPlaceholder: "Phone, email, Zalo, or WeChat",
    question: "Consultation details",
    questionPlaceholder: "Tell us your current status, intended procedure, and questions.",
    consentTitle: "Personal data consent",
    thirdPartyConsent: "I agree to provide my contact details, consultation topic, and study/visa context to Kwon Young-geun (Rodem Office).",
    processingConsent: "I have reviewed the processing-consignment notice for request handling, security, and operations.",
    overseasConsent: "I have reviewed the overseas-transfer notice for possible partner or infrastructure access outside Korea.",
    submit: "Send consultation request",
    success: "Your request to connect with Kwon Young-geun has been received. We will notify you when its status is updated.",
    newRequest: "Create another request",
    nameError: "Enter your name and contact details.",
    consentError: "Required consent is needed before partner routing.",
    submitError: "We could not submit your request. Please try again shortly.",
    disclaimer: "Availability, engagement scope, and fees are confirmed separately by the specialist. KARXY supports the connection and does not replace legal or administrative judgment.",
    employmentNotice: "This service is for visa, stay, and administrative consultation. KARXY does not provide job placement.",
  },
};

const directContact = {
  phone: "010-9221-6553",
  email: "kwon01190119@daum.net",
};

const careerCopy: Record<Lang, { title: string; items: string[] }> = {
  ko: {
    title: "주요 약력",
    items: ["대표 행정사", "잡스타임즈 기자", "사실조사학회 이사"],
  },
  vi: {
    title: "Kinh nghiệm chính",
    items: ["Đại diện chuyên gia hành chính", "Phóng viên Jobstimes", "Thành viên ban giám đốc Hiệp hội Điều tra Thực tế"],
  },
  mn: {
    title: "Үндсэн туршлага",
    items: ["Төлөөлөх захиргааны зөвлөх", "Jobstimes сэтгүүлч", "Баримт судлалын нийгэмлэгийн удирдах зөвлөлийн гишүүн"],
  },
  en: {
    title: "Professional profile",
    items: ["Principal administrative scrivener", "Jobstimes journalist", "Director, Fact Investigation Society"],
  },
};

function scrollToMatching() {
  document.getElementById("partner-matching")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Partners({ locale }: { locale?: Lang }) {
  const searchParams = useSearchParams();
  const { lang: storeLang } = useLangStore();
  const lang = locale ?? storeLang;
  const text = copy[lang];
  const { currentLeadId } = useLeadStore();
  const { submitting, submitPartnerRequest } = usePartnerStore();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [question, setQuestion] = useState(() => searchParams.get("question")?.slice(0, 1000) || "");
  const [thirdPartyProvision, setThirdPartyProvision] = useState(false);
  const [processingConsignment, setProcessingConsignment] = useState(false);
  const [overseasTransfer, setOverseasTransfer] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consentReady = thirdPartyProvision && processingConsignment && overseasTransfer;

  const resetForm = () => {
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
      setError(text.nameError);
      return;
    }
    if (!consentReady) {
      setError(text.consentError);
      return;
    }

    const ok = await submitPartnerRequest(
      currentLeadId,
      PARTNERS[0].key,
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
        version: "partner-routing-2026-08-10-rodem",
        locale: lang,
        source: "kwon-young-geun-partner-page",
      },
    );

    if (ok) setSubmitted(true);
    else setError(text.submitError);
  };

  return (
    <main className="overflow-hidden pb-20">
      <section className="relative border-b bg-[radial-gradient(circle_at_78%_20%,hsl(var(--primary)/0.20),transparent_34%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)/0.35))]">
        <div aria-hidden className="absolute -left-20 top-24 h-52 w-52 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-start gap-10 px-4 py-12 md:grid-cols-[1.04fr_0.96fr] md:px-6 md:py-20 lg:gap-16">
          <div className="md:pt-1">
            <Badge className="mb-5 rounded-full border-primary/25 bg-primary/10 px-3 py-1 text-primary-foreground hover:bg-primary/10 dark:text-primary-strong">
              <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
              {text.eyebrow}
            </Badge>
            <h1 className="whitespace-pre-line font-serif text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl">
              {text.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">{text.intro}</p>

            <div className="mt-7 max-w-xl rounded-2xl border border-border/80 bg-background/75 p-4 shadow-sm backdrop-blur-sm sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-strong">{careerCopy[lang].title}</p>
              <div className="mt-4 grid gap-2.5">
                {careerCopy[lang].items.map((item, index) => {
                  const Icon = index === 0 ? Scale : index === 1 ? Newspaper : UsersRound;
                  return (
                    <div key={item} className="flex min-h-11 items-center gap-3 rounded-xl bg-muted/45 px-3.5 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-strong">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold text-foreground">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="group rounded-full px-6" onClick={scrollToMatching}>
                {text.primaryCta}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6">
                <a href="#office-information">{text.officeCta}</a>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
              {[text.specialty, text.verified].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur">
                  <Check className="h-3.5 w-3.5 text-primary-strong" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[410px]">
            <div className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-card p-2 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.45)]">
              <Image
                src="/partners/kwon-young-geun.jpg"
                alt={lang === "ko" ? "로뎀행정사사무소 권영근 행정사 전신 프로필 사진" : "Full-length portrait of Kwon Young-geun, Rodem Administrative Attorneys Office"}
                width={1206}
                height={2006}
                priority
                sizes="(max-width: 768px) 92vw, 410px"
                className="h-auto w-full rounded-[1.25rem] bg-[#dedbd7]"
              />
              <div className="px-4 pb-4 pt-5 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-strong">{text.profileLabel}</p>
                    <p className="mt-2 font-serif text-2xl font-semibold text-foreground">권영근 행정사</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{text.principal}</p>
                  </div>
                  <Badge variant="secondary" className="mt-0.5 shrink-0 rounded-full">
                    <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                    KARXY
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary-strong">
              <Scale className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-serif text-3xl font-semibold tracking-tight md:text-4xl">{text.expertiseTitle}</h2>
            <p className="mt-4 leading-7 text-muted-foreground">{text.expertiseIntro}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {text.expertise.map((item, index) => (
              <div key={item} className={`flex min-h-24 items-start gap-3 rounded-2xl border bg-card p-5 shadow-sm ${index === text.expertise.length - 1 ? "sm:col-span-2" : ""}`}>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-strong">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium leading-6">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/35">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="text-xs font-bold tracking-[0.18em] text-primary-strong">{text.processEyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight md:text-4xl">{text.processTitle}</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {text.process.map((step, index) => {
              const Icon = [FileCheck2, ShieldCheck, UserRoundCheck][index];
              return (
                <Card key={step.title} className="relative overflow-hidden border-foreground/15 bg-background shadow-sm">
                  <CardHeader>
                    <div className="mb-5 flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary-strong">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-mono text-xs font-bold text-muted-foreground">0{index + 1}</span>
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription className="leading-6">{step.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="office-information" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid items-start gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
          <div className="overflow-hidden rounded-[1.75rem] border bg-[#f7f3eb] p-3 shadow-sm">
            <Image
              src="/partners/rodem-business-card.jpg"
              alt={lang === "ko" ? "로뎀행정사사무소 권영근 행정사 명함" : "Rodem Administrative Attorneys Office business card"}
              width={544}
              height={616}
              sizes="(max-width: 1024px) 92vw, 500px"
              className="h-auto w-full rounded-[1.15rem]"
            />
          </div>
          <div className="lg:py-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#123f93]/10 text-[#123f93] dark:text-blue-300">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-serif text-3xl font-semibold tracking-tight md:text-4xl">{text.officeTitle}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{text.officeDescription}</p>
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" />
                <div className="space-y-2 text-sm leading-6">
                  <p><strong>{lang === "ko" ? "본사" : "HQ"}</strong><br />{text.headquarters}</p>
                  <p><strong>{lang === "ko" ? "지사" : "Branch"}</strong><br />{text.branch}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <a href={`tel:${directContact.phone.replaceAll("-", "")}`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-primary/5">
                  <Phone className="h-5 w-5 text-primary-strong" />
                  <span className="text-sm font-semibold">{directContact.phone}</span>
                </a>
                <a href={`mailto:${directContact.email}`} className="flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-primary/5">
                  <Mail className="h-5 w-5 shrink-0 text-primary-strong" />
                  <span className="truncate text-sm font-semibold">{directContact.email}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="partner-matching" className="scroll-mt-20 border-t bg-[linear-gradient(180deg,hsl(var(--muted)/0.28),hsl(var(--background)))]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-strong">
              <Sparkles className="h-4 w-4" />
              {text.matchingEyebrow}
            </div>
            <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{text.matchingTitle}</h2>
            <p className="mt-4 leading-7 text-muted-foreground">{text.matchingDescription}</p>
            <div className="mt-7 rounded-2xl border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground">{text.partnerLabel}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border">
                  <Image src="/partners/kwon-young-geun.jpg" alt="" fill sizes="48px" className="object-cover object-top" />
                </div>
                <div>
                  <p className="font-semibold">권영근 행정사</p>
                  <p className="text-xs text-muted-foreground">{text.officeTitle}</p>
                </div>
                <Badge variant="secondary" className="ml-auto shrink-0">{text.verified}</Badge>
              </div>
            </div>
          </div>

          <Card className="border-foreground/15 shadow-lg">
            <CardHeader>
              <CardTitle>{tr("partner_request", lang)}</CardTitle>
              <CardDescription>{text.matchingDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {submitted ? (
                <div className="space-y-5 py-5">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <Alert className="border-emerald-600/20 bg-emerald-500/5 text-center">
                    <AlertDescription className="leading-6 text-foreground">{text.success}</AlertDescription>
                  </Alert>
                  <Button variant="outline" className="w-full" onClick={resetForm}>{text.newRequest}</Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="partner-name">{text.name}</Label>
                      <Input id="partner-name" value={name} onChange={(event) => setName(event.target.value)} disabled={submitting} autoComplete="name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partner-contact">{text.contact}</Label>
                      <Input id="partner-contact" value={contact} onChange={(event) => setContact(event.target.value)} disabled={submitting} placeholder={text.contactPlaceholder} autoComplete="tel" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner-question">{text.question}</Label>
                    <Textarea id="partner-question" rows={5} value={question} onChange={(event) => setQuestion(event.target.value)} disabled={submitting} placeholder={text.questionPlaceholder} maxLength={1000} />
                    <p className="text-right text-xs text-muted-foreground">{question.length}/1000</p>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4 text-primary-strong" />
                      {text.consentTitle}
                    </div>
                    <div className="space-y-4">
                      {[
                        { checked: thirdPartyProvision, setChecked: setThirdPartyProvision, label: text.thirdPartyConsent },
                        { checked: processingConsignment, setChecked: setProcessingConsignment, label: text.processingConsent },
                        { checked: overseasTransfer, setChecked: setOverseasTransfer, label: text.overseasConsent },
                      ].map((item) => (
                        <label key={item.label} className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed">
                          <Checkbox checked={item.checked} onCheckedChange={(value) => item.setChecked(value === true)} disabled={submitting} aria-label={item.label} />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {error ? (
                    <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
                  ) : null}
                  <Button size="lg" className="w-full" onClick={submit} disabled={submitting || !consentReady}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    {text.submit}
                  </Button>
                  <p className="text-xs leading-5 text-muted-foreground">{text.disclaimer}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-8 md:px-6">
        <Alert className="border-amber-500/25 bg-amber-500/5">
          <AlertDescription className="text-xs leading-5 text-muted-foreground">{text.employmentNotice}</AlertDescription>
        </Alert>
      </div>
    </main>
  );
}
