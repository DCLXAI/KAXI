import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { workspaceLocale, workspaceStatusLabel } from "@/lib/i18n/workspace";
import { notifyUser, type NotificationCopy } from "@/lib/notifications/repository";

type NotificationDb = Prisma.TransactionClient | typeof db;

export async function notifyDocumentReview(input: {
  documentItemId: string;
  status: string;
  reviewStatus: string;
  reviewNote?: string | null;
  tx?: NotificationDb;
}) {
  const client = input.tx || db;
  const document = await client.documentItem.findUnique({
    where: { id: input.documentItemId },
    include: { studentProfile: { include: { user: true } } },
  });
  if (!document) return null;
  const user = document.studentProfile.user;
  const copy = Object.fromEntries((["ko", "vi", "mn", "en"] as const).map((locale) => {
    const status = workspaceStatusLabel(input.reviewStatus || input.status, locale);
    const title = {
      ko: "서류 심사 결과",
      vi: "Kết quả kiểm tra giấy tờ",
      mn: "Баримтын шалгалтын үр дүн",
      en: "Document review result",
    }[locale];
    const message = {
      ko: `${document.documentType} 상태가 '${status}'(으)로 변경되었습니다.`,
      vi: `Trạng thái ${document.documentType} đã đổi thành '${status}'.`,
      mn: `${document.documentType} баримтын төлөв '${status}' боллоо.`,
      en: `${document.documentType} changed to '${status}'.`,
    }[locale];
    return [locale, { title, message }];
  })) as NotificationCopy;
  const locale = workspaceLocale(user.locale);
  return notifyUser({
    userId: user.id,
    locale,
    eventKey: `document:${document.id}:review:${input.status}:${input.reviewStatus}`,
    copy,
    href: `/${locale}/docs`,
    metadata: { documentItemId: document.id, status: input.status, reviewStatus: input.reviewStatus },
    tx: client,
  });
}

export async function notifyCaseStudent(input: {
  caseId: string;
  eventKey: string;
  copy: NotificationCopy;
  metadata?: Record<string, unknown>;
  tx?: NotificationDb;
}) {
  const client = input.tx || db;
  const caseItem = await client.escalationCase.findUnique({
    where: { id: input.caseId },
    include: { studentProfile: { include: { user: true } } },
  });
  if (!caseItem) return null;
  return notifyUser({
    userId: caseItem.studentProfile.user.id,
    locale: caseItem.studentProfile.user.locale,
    eventKey: `case:${caseItem.id}:${input.eventKey}`,
    copy: input.copy,
    href: "/student",
    metadata: { caseId: caseItem.id, status: caseItem.status, ...input.metadata },
    tx: client,
  });
}

export const CASE_NOTIFICATION_COPY = {
  created: {
    ko: { title: "전문가 검토 케이스 생성", message: "상담 내용이 전문가 검토 케이스로 등록되었습니다." },
    vi: { title: "Đã tạo hồ sơ chuyên gia", message: "Nội dung tư vấn đã được đăng ký để chuyên gia kiểm tra." },
    mn: { title: "Мэргэжилтний кейс үүслээ", message: "Зөвлөгөөний агуулгыг мэргэжилтэн шалгахаар бүртгэлээ." },
    en: { title: "Expert review case created", message: "Your consultation was registered for expert review." },
  },
  assigned: {
    ko: { title: "파트너 배정 완료", message: "케이스가 검증된 파트너 사무소에 배정되었습니다." },
    vi: { title: "Đã giao đối tác", message: "Hồ sơ đã được giao cho văn phòng đối tác đã xác minh." },
    mn: { title: "Түншид хуваариллаа", message: "Кейсийг баталгаажсан түншийн газарт хуваариллаа." },
    en: { title: "Partner assigned", message: "Your case was assigned to a verified partner office." },
  },
  accepted: {
    ko: { title: "케이스 수임", message: "파트너가 케이스를 수임했습니다." },
    vi: { title: "Đã nhận hồ sơ", message: "Đối tác đã nhận hồ sơ của bạn." },
    mn: { title: "Кейс хүлээн авлаа", message: "Түнш таны кейсийг хүлээн авлаа." },
    en: { title: "Case accepted", message: "The partner accepted your case." },
  },
  comment: {
    ko: { title: "새 케이스 업데이트", message: "케이스에 새로운 코멘트가 등록되었습니다." },
    vi: { title: "Cập nhật hồ sơ", message: "Có bình luận mới trong hồ sơ." },
    mn: { title: "Кейс шинэчлэгдлээ", message: "Кейс дээр шинэ тайлбар нэмэгдлээ." },
    en: { title: "Case update", message: "A new comment was added to your case." },
  },
  supplement: {
    ko: { title: "추가 서류 요청", message: "케이스 처리를 위해 추가 서류가 필요합니다." },
    vi: { title: "Yêu cầu bổ sung", message: "Cần thêm giấy tờ để xử lý hồ sơ." },
    mn: { title: "Нэмэлт баримт хүсэв", message: "Кейс боловсруулахад нэмэлт баримт хэрэгтэй." },
    en: { title: "Additional documents requested", message: "More documents are required to process your case." },
  },
  closed: {
    ko: { title: "케이스 종결", message: "케이스 처리가 종결되었습니다." },
    vi: { title: "Hồ sơ đã đóng", message: "Quá trình xử lý hồ sơ đã kết thúc." },
    mn: { title: "Кейс хаагдлаа", message: "Кейсийн ажиллагаа дууслаа." },
    en: { title: "Case closed", message: "Case processing has been closed." },
  },
} satisfies Record<string, NotificationCopy>;
