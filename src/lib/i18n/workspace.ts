import type { Lang } from "@/lib/i18n/translations";

export function workspaceLocale(value: string | null | undefined): Lang {
  return value === "vi" || value === "mn" || value === "en" ? value : "ko";
}

export const workspaceDateLocale: Record<Lang, string> = {
  ko: "ko-KR",
  vi: "vi-VN",
  mn: "mn-MN",
  en: "en-US",
};

export const workspaceCopy = {
  ko: {
    notifications: "알림", unread: "읽지 않음", markRead: "읽음", noNotifications: "새 알림이 없습니다.",
    consultationRequests: "상담 요청", assignedCases: "배정된 케이스", case: "케이스", student: "학생", status: "상태",
    matched: "배정일", open: "열기", details: "상세", contact: "연락처", question: "문의 내용", accept: "수락", close: "종결",
    caseSummary: "케이스 요약", noSummary: "요약이 없습니다.", assigned: "배정", accepted: "수임", closed: "종결",
    documentStatus: "서류 상태", timeline: "타임라인", noEvents: "이벤트가 없습니다.", actions: "액션", backToList: "목록",
    upload: "업로드", expires: "만료일", language: "언어", saveLanguage: "언어 저장 중",
  },
  vi: {
    notifications: "Thông báo", unread: "Chưa đọc", markRead: "Đã đọc", noNotifications: "Không có thông báo mới.",
    consultationRequests: "Yêu cầu tư vấn", assignedCases: "Hồ sơ được giao", case: "Hồ sơ", student: "Học sinh", status: "Trạng thái",
    matched: "Ngày giao", open: "Mở", details: "Chi tiết", contact: "Liên hệ", question: "Nội dung", accept: "Nhận", close: "Đóng",
    caseSummary: "Tóm tắt hồ sơ", noSummary: "Chưa có tóm tắt.", assigned: "Đã giao", accepted: "Đã nhận", closed: "Đã đóng",
    documentStatus: "Trạng thái giấy tờ", timeline: "Dòng thời gian", noEvents: "Chưa có sự kiện.", actions: "Thao tác", backToList: "Danh sách",
    upload: "Tải lên", expires: "Hết hạn", language: "Ngôn ngữ", saveLanguage: "Đang lưu ngôn ngữ",
  },
  mn: {
    notifications: "Мэдэгдэл", unread: "Уншаагүй", markRead: "Уншсан", noNotifications: "Шинэ мэдэгдэл алга.",
    consultationRequests: "Зөвлөгөөний хүсэлт", assignedCases: "Хуваарилсан кейс", case: "Кейс", student: "Оюутан", status: "Төлөв",
    matched: "Хуваарилсан", open: "Нээх", details: "Дэлгэрэнгүй", contact: "Холбоо", question: "Асуулт", accept: "Хүлээн авах", close: "Хаах",
    caseSummary: "Кейсийн хураангуй", noSummary: "Хураангуй алга.", assigned: "Хуваарилсан", accepted: "Хүлээн авсан", closed: "Хаасан",
    documentStatus: "Баримтын төлөв", timeline: "Үйл явдал", noEvents: "Үйл явдал алга.", actions: "Үйлдэл", backToList: "Жагсаалт",
    upload: "Байршуулах", expires: "Дуусах", language: "Хэл", saveLanguage: "Хэл хадгалж байна",
  },
  en: {
    notifications: "Notifications", unread: "Unread", markRead: "Mark read", noNotifications: "No new notifications.",
    consultationRequests: "Consultation requests", assignedCases: "Assigned cases", case: "Case", student: "Student", status: "Status",
    matched: "Matched", open: "Open", details: "Details", contact: "Contact", question: "Question", accept: "Accept", close: "Close",
    caseSummary: "Case summary", noSummary: "No summary available.", assigned: "Assigned", accepted: "Accepted", closed: "Closed",
    documentStatus: "Document status", timeline: "Timeline", noEvents: "No events yet.", actions: "Actions", backToList: "List",
    upload: "Upload", expires: "Expires", language: "Language", saveLanguage: "Saving language",
  },
} as const;

const STATUS_LABELS: Record<Lang, Record<string, string>> = {
  ko: { NEW: "신규", NEEDS_MORE_DOCUMENTS: "서류 보완", HIGH_RISK: "고위험", APPROVED: "승인", REJECTED: "반려", CLOSED: "종결", STOPPED: "중단", pending: "접수", matched: "배정", accepted: "수락", closed: "종결", NOT_UPLOADED: "미업로드", UPLOADED: "업로드됨", OCR_PROCESSING: "문서 분석 중", OCR_DONE: "문서 분석 완료", MISSING: "누락", EXPIRED: "만료", NEEDS_REVIEW: "검토 필요", PENDING: "검토 대기", NEEDS_HUMAN_REVIEW: "전문가 검토" },
  vi: { NEW: "Mới", NEEDS_MORE_DOCUMENTS: "Cần bổ sung", HIGH_RISK: "Rủi ro cao", APPROVED: "Đã duyệt", REJECTED: "Từ chối", CLOSED: "Đã đóng", STOPPED: "Dừng", pending: "Đã gửi", matched: "Đã giao", accepted: "Đã nhận", closed: "Đã đóng", NOT_UPLOADED: "Chưa tải", UPLOADED: "Đã tải", OCR_PROCESSING: "Đang phân tích", OCR_DONE: "Đã phân tích", MISSING: "Thiếu", EXPIRED: "Hết hạn", NEEDS_REVIEW: "Cần kiểm tra", PENDING: "Chờ kiểm tra", NEEDS_HUMAN_REVIEW: "Cần chuyên gia" },
  mn: { NEW: "Шинэ", NEEDS_MORE_DOCUMENTS: "Нэмэлт хэрэгтэй", HIGH_RISK: "Өндөр эрсдэл", APPROVED: "Зөвшөөрсөн", REJECTED: "Татгалзсан", CLOSED: "Хаасан", STOPPED: "Зогссон", pending: "Илгээсэн", matched: "Хуваарилсан", accepted: "Хүлээн авсан", closed: "Хаасан", NOT_UPLOADED: "Оруулаагүй", UPLOADED: "Оруулсан", OCR_PROCESSING: "Шинжилж байна", OCR_DONE: "Шинжилсэн", MISSING: "Дутуу", EXPIRED: "Хугацаа дууссан", NEEDS_REVIEW: "Шалгах хэрэгтэй", PENDING: "Шалгалт хүлээж байна", NEEDS_HUMAN_REVIEW: "Мэргэжилтэн хэрэгтэй" },
  en: { NEW: "New", NEEDS_MORE_DOCUMENTS: "More documents needed", HIGH_RISK: "High risk", APPROVED: "Approved", REJECTED: "Rejected", CLOSED: "Closed", STOPPED: "Stopped", pending: "Submitted", matched: "Matched", accepted: "Accepted", closed: "Closed", NOT_UPLOADED: "Not uploaded", UPLOADED: "Uploaded", OCR_PROCESSING: "Analyzing", OCR_DONE: "Analyzed", MISSING: "Missing", EXPIRED: "Expired", NEEDS_REVIEW: "Needs review", PENDING: "Pending review", NEEDS_HUMAN_REVIEW: "Expert review" },
};

export function workspaceStatusLabel(value: string, locale: Lang) {
  return STATUS_LABELS[locale][value] || value.replaceAll("_", " ").toLowerCase();
}
