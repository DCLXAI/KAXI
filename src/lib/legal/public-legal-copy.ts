import type { Locale } from "@/i18n/routing";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalPageCopy = {
  privacyTitle: string;
  privacySummary: string;
  termsTitle: string;
  termsSummary: string;
  reviewNotice: string;
  versionLabel: string;
  privacySections: LegalSection[];
  termsSections: LegalSection[];
  rightsTitle: string;
  rightsDescription: string;
  requestContactLabel: string;
  requestContactPlaceholder: string;
  requestQuestionLabel: string;
  requestQuestionPlaceholder: string;
  requestSubmit: string;
  requestSending: string;
  requestSuccess: string;
  requestError: string;
  home: string;
  privacyLink: string;
  termsLink: string;
};

const shared = {
  ko: {
    privacyTitle: "개인정보 처리 안내",
    privacySummary: "KAXI가 챗봇, 상담 전환, 첨부파일을 운영하며 처리하는 정보를 안내합니다.",
    termsTitle: "서비스 이용 안내",
    termsSummary: "KAXI의 AI 유학 준비 안내와 상담 연결 서비스를 이용할 때 적용되는 기준입니다.",
    reviewNotice: "베타 운영 문서이며 전문 법률 검토가 진행 중입니다. 현재 데이터 흐름과 권리 요청 방법은 실제 구현을 기준으로 안내합니다.",
    versionLabel: "게시 버전: 2026-07-13.v2 · 최종 검토: 2026-07-13",
    rightsTitle: "내 정보 권리 요청",
    rightsDescription: "열람, 정정, 삭제, 처리정지 또는 동의 철회를 요청할 수 있습니다. 다른 사람의 기록 존재 여부가 드러나지 않도록 접수 결과는 동일하게 표시됩니다.",
    requestContactLabel: "상담 때 남긴 연락처",
    requestContactPlaceholder: "이메일, 전화번호 또는 메신저 ID",
    requestQuestionLabel: "대화에서 입력한 질문",
    requestQuestionPlaceholder: "기록을 찾을 수 있도록 질문을 정확히 입력하세요.",
    requestSubmit: "권리 요청 접수",
    requestSending: "접수 중...",
    requestSuccess: "요청을 접수했습니다. 일치하는 기록은 안전하게 확인한 뒤 처리합니다.",
    requestError: "요청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    home: "KAXI 홈",
    privacyLink: "개인정보 처리 안내",
    termsLink: "서비스 이용 안내",
    privacySections: [
      { title: "1. 처리 주체와 문의 창구", paragraphs: ["처리 주체는 KAXI입니다. 개인정보 관련 요청은 이 페이지 하단의 온라인 권리 요청 양식으로 접수합니다."] },
      { title: "2. 처리 항목과 목적", bullets: ["AI 대화: 질문, 언어, 생성 답변, 검색 출처 및 품질 정보", "제품 분석: 탭 세션 식별자, 언어, 화면 경로와 진단 선택·챗봇 열기·질문 성공·출처 클릭·상담 처리 이벤트(질문·답변·연락처는 분석 이벤트에서 제외)", "상담 전환: 사용자가 동의 후 입력한 이름, 연락처, 상담 메모와 Typebot 동의 증거", "첨부파일: 파일명, 형식, 크기, 보안 검사 상태, OCR 결과", "운영 보안: 요청 시각, 제한된 접속·오류·관리자 감사 기록"] },
      { title: "3. 보유 기간", bullets: ["대화 세션과 상담 동의 증거: 마지막 이용 기준 최대 90일", "제품 이용 이벤트: 최대 180일", "챗봇 첨부파일: 최대 30일", "진단 리드: 최대 365일", "파트너 요청: 최대 180일", "법령상 보존 의무 또는 분쟁 처리가 필요한 경우에는 해당 기간 동안 분리 보관할 수 있습니다."] },
      { title: "4. 외부 서비스와 국외 처리", paragraphs: ["KAXI는 Vercel(웹 호스팅), Supabase(데이터베이스·파일 저장), Typebot(대화 화면), n8n(워크플로우), Moonshot AI의 Kimi(답변·OCR)를 사용합니다. 서비스 요청은 공급자 인프라에서 국외 처리될 수 있습니다. 실제 법인, 국가, 재위탁 및 보유기간 표기는 계약 확인과 전문 검토 후 갱신합니다."] },
      { title: "5. 상담 전환 동의", paragraphs: ["연락처는 상담원 연결 목적, 처리 항목, 90일 보유기간과 이 안내의 버전을 확인하고 명시적으로 동의한 경우에만 수집합니다. 동의하지 않아도 일반 AI 안내를 계속 이용할 수 있습니다."] },
      { title: "6. 보호와 파기", paragraphs: ["전송 구간을 암호화하고, 민감한 대화·연락처는 암호화 또는 마스킹하며, 관리자 접근과 변경을 기록합니다. 보유기간 만료 또는 유효한 삭제 요청이 확인되면 데이터베이스 기록과 저장 파일을 삭제합니다."] },
      { title: "7. 이용자 권리", paragraphs: ["이용자는 개인정보의 열람, 정정·삭제, 처리정지와 동의 철회를 요청할 수 있습니다. 본인 확인과 다른 사람의 권리 보호를 위해 추가 확인을 요청할 수 있습니다."] },
    ],
    termsSections: [
      { title: "1. 서비스 범위", paragraphs: ["KAXI는 한국 유학 준비를 위한 학교·비용·서류 정보, 공식 출처 기반 AI 안내, 상담원 또는 독립 파트너 연결을 제공합니다."] },
      { title: "2. AI 안내의 한계", paragraphs: ["AI 답변은 일반 정보이며 입학, 비자, 체류자격 또는 행정 결과를 보장하지 않습니다. 제출 전 학교, 공관, 출입국기관 또는 자격 있는 전문가의 최신 안내를 확인해야 합니다."] },
      { title: "3. 상담과 파트너", paragraphs: ["KAXI 자체는 변호사, 행정사, 학교 또는 정부기관이 아닙니다. 개별 사건의 서류 작성·제출 대행이나 유료 전문 업무는 별도의 자격 있는 파트너 계약과 비용 안내가 필요합니다."] },
      { title: "4. 이용자 책임", bullets: ["정확하고 적법한 정보를 입력합니다.", "여권, 통장, 체류 서류 등 불필요한 민감정보는 채팅에 입력하지 않습니다.", "마감일과 제출 요건을 공식 기관에서 최종 확인합니다."] },
      { title: "5. 금지 행위", bullets: ["위조·변조 서류, 불법 취업, 비자 보장 또는 법령 회피 요청", "타인의 개인정보나 문서를 권한 없이 업로드하는 행위", "서비스 공격, 자동 수집, 제한 우회 또는 악성 파일 업로드"] },
      { title: "6. 첨부파일", paragraphs: ["첨부파일은 보안 검사와 OCR 처리를 위해 일시 보관될 수 있습니다. 제출용 원본 보관소가 아니므로 중요한 문서의 원본은 이용자가 별도로 보관해야 합니다."] },
      { title: "7. 베타 운영과 변경", paragraphs: ["현재 서비스는 베타 단계입니다. 안전, 법령, 공급자 또는 기능 변경에 따라 서비스를 수정하거나 중단할 수 있으며, 이용자 권리에 중대한 변경은 필요한 방식으로 알립니다."] },
      { title: "8. 개인정보", paragraphs: ["개인정보 처리와 권리 행사 방법은 개인정보 처리 안내에서 확인할 수 있습니다."] },
    ],
  },
  en: {
    privacyTitle: "Privacy Notice",
    privacySummary: "How KAXI handles information for chat, human handoff, and attachments.",
    termsTitle: "Terms of Service",
    termsSummary: "Rules for using KAXI's AI study-preparation guidance and consultation routing.",
    reviewNotice: "This is a beta operating document under professional legal review. The data flows and rights-request method reflect the current implementation.",
    versionLabel: "Published version: 2026-07-13.v2 · Last reviewed: 2026-07-13",
    rightsTitle: "Exercise your data rights",
    rightsDescription: "You may request access, correction, deletion, restriction, or withdrawal of consent. We return the same receipt whether or not a matching record exists.",
    requestContactLabel: "Contact used for consultation",
    requestContactPlaceholder: "Email, phone number, or messenger ID",
    requestQuestionLabel: "Exact question entered in chat",
    requestQuestionPlaceholder: "Enter the question exactly so we can locate the record.",
    requestSubmit: "Submit rights request",
    requestSending: "Submitting...",
    requestSuccess: "Your request was received. Matching records will be verified and handled securely.",
    requestError: "We could not submit the request. Please try again shortly.",
    home: "KAXI home",
    privacyLink: "Privacy notice",
    termsLink: "Terms of service",
    privacySections: [
      { title: "1. Controller and request channel", paragraphs: ["KAXI is the controller. Privacy requests are accepted through the online form at the bottom of this page."] },
      { title: "2. Data and purposes", bullets: ["AI chat: question, language, generated answer, retrieved sources, and quality metadata", "Product analytics: per-tab session ID, locale, screen path, and diagnosis, chat, citation, and handoff events; analytics events exclude questions, answers, and contact data", "Human handoff: name, contact, note, and versioned Typebot consent receipt after explicit consent", "Attachments: filename, type, size, security status, and OCR result", "Operations: limited request, error, security, and administrator audit records"] },
      { title: "3. Retention", bullets: ["Chat sessions and handoff consent receipts: up to 90 days from recent use", "Product usage events: up to 180 days", "Chat attachments: up to 30 days", "Diagnosis leads: up to 365 days", "Partner requests: up to 180 days", "Records may be segregated for a legally required period or an active dispute."] },
      { title: "4. Vendors and overseas processing", paragraphs: ["KAXI uses Vercel for hosting, Supabase for database and storage, Typebot for chat UI, n8n for workflow orchestration, and Moonshot AI's Kimi for responses and OCR. Requests may be processed outside Korea on vendor infrastructure. Legal entities, countries, subprocessors, and provider retention details will be updated after contract confirmation and professional review."] },
      { title: "5. Handoff consent", paragraphs: ["Contact data is collected only after explicit consent to the handoff purpose, data items, 90-day retention, and this notice version. Declining does not block general AI guidance."] },
      { title: "6. Security and deletion", paragraphs: ["KAXI uses encrypted transport, encryption or masking for sensitive chat and contact fields, role-based administrator access, and audit records. Database records and stored files are deleted after retention or a verified deletion request."] },
      { title: "7. Your rights", paragraphs: ["You may request access, correction, deletion, restriction of processing, and withdrawal of consent. Additional verification may be required to protect you and other people."] },
    ],
    termsSections: [
      { title: "1. Service scope", paragraphs: ["KAXI provides Korean study-preparation information, school and cost tools, official-source AI guidance, and routing to a human operator or independent partner."] },
      { title: "2. AI limitations", paragraphs: ["AI output is general information and does not guarantee admission, a visa, status of stay, or any administrative result. Verify current requirements with the school, mission, immigration authority, or a qualified professional before filing."] },
      { title: "3. Consultation and partners", paragraphs: ["KAXI is not a law firm, administrative-scrivener office, school, or government body. Case-specific drafting, filing, representation, and paid professional work require a separate engagement and fee notice with a qualified partner."] },
      { title: "4. User responsibilities", bullets: ["Provide accurate and lawful information.", "Do not enter unnecessary passport, bank, or immigration-document details in chat.", "Confirm deadlines and filing requirements with official authorities."] },
      { title: "5. Prohibited conduct", bullets: ["Fake or altered documents, illegal employment, visa guarantees, or evasion requests", "Uploading another person's data or documents without authority", "Attacks, scraping, limit bypass, or malicious-file uploads"] },
      { title: "6. Attachments", paragraphs: ["Attachments may be held temporarily for security checks and OCR. KAXI is not an archival repository; keep your own originals."] },
      { title: "7. Beta operation and changes", paragraphs: ["The service is in beta. KAXI may modify or suspend features for safety, legal, vendor, or operational reasons and will notify material changes affecting user rights where required."] },
      { title: "8. Privacy", paragraphs: ["See the Privacy Notice for processing details and rights requests."] },
    ],
  },
} satisfies Partial<Record<Locale, LegalPageCopy>>;

const localized: Record<"vi" | "mn", Pick<LegalPageCopy, keyof LegalPageCopy>> = {
  vi: {
    ...shared.en,
    privacyTitle: "Thông báo quyền riêng tư",
    privacySummary: "Cách KAXI xử lý dữ liệu cho trò chuyện, chuyển tiếp tư vấn và tệp đính kèm.",
    termsTitle: "Điều khoản sử dụng",
    termsSummary: "Các quy tắc khi sử dụng hướng dẫn AI và dịch vụ kết nối tư vấn của KAXI.",
    reviewNotice: "Đây là tài liệu vận hành beta đang được rà soát pháp lý chuyên môn. Luồng dữ liệu và cách yêu cầu quyền phản ánh hệ thống hiện tại.",
    versionLabel: "Phiên bản công bố: 2026-07-13.v2 · Rà soát: 2026-07-13",
    rightsTitle: "Yêu cầu quyền dữ liệu",
    rightsDescription: "Bạn có thể yêu cầu truy cập, sửa, xóa, hạn chế xử lý hoặc rút lại sự đồng ý.",
    requestContactLabel: "Thông tin liên hệ đã dùng",
    requestContactPlaceholder: "Email, số điện thoại hoặc ID nhắn tin",
    requestQuestionLabel: "Câu hỏi chính xác trong cuộc trò chuyện",
    requestQuestionPlaceholder: "Nhập chính xác câu hỏi để tìm bản ghi.",
    requestSubmit: "Gửi yêu cầu",
    requestSending: "Đang gửi...",
    requestSuccess: "Đã tiếp nhận yêu cầu. Bản ghi phù hợp sẽ được xác minh và xử lý an toàn.",
    requestError: "Không thể gửi yêu cầu. Vui lòng thử lại sau.",
    home: "Trang chủ KAXI",
    privacyLink: "Quyền riêng tư",
    termsLink: "Điều khoản",
    privacySections: [
      { title: "1. Đơn vị xử lý và kênh yêu cầu", paragraphs: ["KAXI là đơn vị xử lý dữ liệu. Yêu cầu về quyền riêng tư được tiếp nhận qua biểu mẫu trực tuyến ở cuối trang này."] },
      { title: "2. Dữ liệu và mục đích", bullets: ["Trò chuyện AI: câu hỏi, ngôn ngữ, câu trả lời, nguồn truy xuất và dữ liệu chất lượng", "Phân tích sản phẩm: ID phiên theo tab, ngôn ngữ, đường dẫn màn hình và sự kiện chẩn đoán, trò chuyện, nguồn và tư vấn; không lưu câu hỏi, câu trả lời hoặc liên hệ trong sự kiện phân tích", "Chuyển tiếp tư vấn: tên, liên hệ, ghi chú và bằng chứng đồng ý Typebot có phiên bản", "Tệp đính kèm: tên, loại, dung lượng, trạng thái kiểm tra bảo mật và kết quả OCR", "Vận hành: bản ghi giới hạn về yêu cầu, lỗi, bảo mật và thao tác quản trị"] },
      { title: "3. Thời hạn lưu giữ", bullets: ["Phiên trò chuyện và bằng chứng đồng ý: tối đa 90 ngày từ lần sử dụng gần nhất", "Sự kiện sử dụng sản phẩm: tối đa 180 ngày", "Tệp đính kèm: tối đa 30 ngày", "Thông tin chẩn đoán: tối đa 365 ngày", "Yêu cầu đối tác: tối đa 180 ngày", "Dữ liệu có thể được tách riêng trong thời hạn pháp luật yêu cầu hoặc khi có tranh chấp."] },
      { title: "4. Nhà cung cấp và xử lý ở nước ngoài", paragraphs: ["KAXI dùng Vercel để lưu trữ web, Supabase cho cơ sở dữ liệu và tệp, Typebot cho giao diện trò chuyện, n8n cho quy trình, và Kimi của Moonshot AI cho trả lời và OCR. Yêu cầu có thể được xử lý ngoài Hàn Quốc. Thông tin pháp nhân, quốc gia, nhà thầu phụ và thời hạn của nhà cung cấp sẽ được cập nhật sau khi xác nhận hợp đồng và rà soát chuyên môn."] },
      { title: "5. Đồng ý chuyển tiếp tư vấn", paragraphs: ["Thông tin liên hệ chỉ được thu thập sau khi bạn đồng ý rõ ràng với mục đích tư vấn, các mục dữ liệu, thời hạn 90 ngày và phiên bản thông báo này. Từ chối không ngăn bạn dùng hướng dẫn AI chung."] },
      { title: "6. Bảo mật và xóa", paragraphs: ["KAXI dùng kết nối mã hóa, mã hóa hoặc che dữ liệu nhạy cảm, phân quyền quản trị và nhật ký kiểm toán. Bản ghi và tệp được xóa khi hết hạn hoặc sau yêu cầu xóa đã xác minh."] },
      { title: "7. Quyền của bạn", paragraphs: ["Bạn có thể yêu cầu truy cập, sửa, xóa, hạn chế xử lý và rút lại sự đồng ý. Có thể cần xác minh thêm để bảo vệ bạn và người khác."] },
    ],
    termsSections: [
      { title: "1. Phạm vi dịch vụ", paragraphs: ["KAXI cung cấp thông tin chuẩn bị du học Hàn Quốc, công cụ trường học và chi phí, hướng dẫn AI dựa trên nguồn chính thức, và kết nối với nhân viên hoặc đối tác độc lập."] },
      { title: "2. Giới hạn của AI", paragraphs: ["Câu trả lời AI là thông tin chung và không bảo đảm nhập học, visa, tư cách lưu trú hoặc kết quả hành chính. Hãy kiểm tra yêu cầu mới nhất với trường, cơ quan đại diện, xuất nhập cảnh hoặc chuyên gia đủ điều kiện trước khi nộp."] },
      { title: "3. Tư vấn và đối tác", paragraphs: ["KAXI không phải công ty luật, văn phòng hành chính, trường học hoặc cơ quan nhà nước. Soạn hồ sơ, nộp thay, đại diện hoặc dịch vụ chuyên môn có phí cần hợp đồng và thông báo phí riêng với đối tác đủ điều kiện."] },
      { title: "4. Trách nhiệm người dùng", bullets: ["Cung cấp thông tin chính xác và hợp pháp.", "Không nhập dữ liệu hộ chiếu, ngân hàng hoặc giấy tờ cư trú không cần thiết vào trò chuyện.", "Tự xác nhận thời hạn và yêu cầu nộp với cơ quan chính thức."] },
      { title: "5. Hành vi bị cấm", bullets: ["Hồ sơ giả hoặc sửa đổi, việc làm bất hợp pháp, bảo đảm visa hoặc yêu cầu né luật", "Tải dữ liệu hoặc giấy tờ của người khác khi không có quyền", "Tấn công, thu thập tự động, vượt giới hạn hoặc tải tệp độc hại"] },
      { title: "6. Tệp đính kèm", paragraphs: ["Tệp có thể được lưu tạm để kiểm tra bảo mật và OCR. KAXI không phải kho lưu trữ; bạn phải giữ bản gốc của mình."] },
      { title: "7. Vận hành beta và thay đổi", paragraphs: ["Dịch vụ đang ở giai đoạn beta. KAXI có thể sửa hoặc tạm dừng tính năng vì an toàn, pháp lý, nhà cung cấp hoặc vận hành, và sẽ thông báo thay đổi quan trọng khi cần."] },
      { title: "8. Quyền riêng tư", paragraphs: ["Xem Thông báo quyền riêng tư để biết chi tiết xử lý và cách yêu cầu quyền."] },
    ],
  },
  mn: {
    ...shared.en,
    privacyTitle: "Нууцлалын мэдэгдэл",
    privacySummary: "KAXI чат, зөвлөхөд шилжүүлэх болон хавсралтын мэдээллийг хэрхэн боловсруулдаг тухай.",
    termsTitle: "Үйлчилгээний нөхцөл",
    termsSummary: "KAXI-ийн AI зөвлөгөө болон зөвлөхтэй холбох үйлчилгээг ашиглах дүрэм.",
    reviewNotice: "Энэ нь мэргэжлийн хууль зүйн хяналтад байгаа бета баримт бичиг. Мэдээллийн урсгал ба эрхийн хүсэлт нь одоогийн хэрэгжилтийг тусгана.",
    versionLabel: "Нийтэлсэн хувилбар: 2026-07-13.v2 · Хянасан: 2026-07-13",
    rightsTitle: "Мэдээллийн эрхийн хүсэлт",
    rightsDescription: "Та мэдээлэл авах, засах, устгах, боловсруулалтыг хязгаарлах эсвэл зөвшөөрлөө буцаах хүсэлт гаргаж болно.",
    requestContactLabel: "Зөвлөгөөнд ашигласан холбоо барих мэдээлэл",
    requestContactPlaceholder: "Имэйл, утас эсвэл мессенжер ID",
    requestQuestionLabel: "Чатад оруулсан яг асуулт",
    requestQuestionPlaceholder: "Бичлэгийг олохын тулд асуултаа яг оруулна уу.",
    requestSubmit: "Хүсэлт илгээх",
    requestSending: "Илгээж байна...",
    requestSuccess: "Хүсэлтийг хүлээн авлаа. Тохирох бичлэгийг аюулгүй шалгаж боловсруулна.",
    requestError: "Хүсэлтийг илгээж чадсангүй. Дахин оролдоно уу.",
    home: "KAXI нүүр",
    privacyLink: "Нууцлал",
    termsLink: "Нөхцөл",
    privacySections: [
      { title: "1. Мэдээлэл хариуцагч ба хүсэлтийн суваг", paragraphs: ["Мэдээлэл хариуцагч нь KAXI. Нууцлалын хүсэлтийг энэ хуудасны доорх цахим маягтаар хүлээн авна."] },
      { title: "2. Мэдээлэл ба зорилго", bullets: ["AI чат: асуулт, хэл, үүсгэсэн хариулт, хайлтын эх сурвалж, чанарын мэдээлэл", "Бүтээгдэхүүний шинжилгээ: табын сесс ID, хэл, дэлгэцийн зам, оношилгоо, чат, эх сурвалж ба зөвлөхийн үйл явдал; шинжилгээний үйл явдалд асуулт, хариулт, холбоо барих мэдээлэл орохгүй", "Зөвлөхөд шилжүүлэх: тодорхой зөвшөөрлийн дараах нэр, холбоо барих мэдээлэл, тэмдэглэл, Typebot зөвшөөрлийн баримт", "Хавсралт: файлын нэр, төрөл, хэмжээ, аюулгүй байдлын төлөв, OCR үр дүн", "Үйл ажиллагаа: хязгаарлагдмал хүсэлт, алдаа, аюулгүй байдал, админы аудитын бичлэг"] },
      { title: "3. Хадгалах хугацаа", bullets: ["Чат ба зөвшөөрлийн баримт: сүүлийн ашиглалтаас 90 хүртэл хоног", "Бүтээгдэхүүний ашиглалтын үйл явдал: 180 хүртэл хоног", "Чатын хавсралт: 30 хүртэл хоног", "Оношилгооны хүсэлт: 365 хүртэл хоног", "Түншийн хүсэлт: 180 хүртэл хоног", "Хуулийн үүрэг эсвэл маргааны үед мэдээллийг шаардлагатай хугацаанд тусгаарлан хадгалж болно."] },
      { title: "4. Нийлүүлэгч ба гадаад боловсруулалт", paragraphs: ["KAXI нь Vercel-ийг веб хостинг, Supabase-ийг өгөгдлийн сан ба файл, Typebot-ийг чат, n8n-ийг ажлын урсгал, Moonshot AI-ийн Kimi-г хариулт ба OCR-д ашигладаг. Хүсэлт Солонгосоос гадуур боловсруулагдаж болно. Хуулийн этгээд, улс, дэд боловсруулагч, хадгалалтын мэдээллийг гэрээ баталгаажиж мэргэжлийн хяналт дууссаны дараа шинэчилнэ."] },
      { title: "5. Зөвлөхөд шилжүүлэх зөвшөөрөл", paragraphs: ["Зорилго, мэдээллийн төрөл, 90 хоногийн хугацаа, мэдэгдлийн хувилбарыг зөвшөөрсний дараа л холбоо барих мэдээлэл цуглуулна. Татгалзсан ч ерөнхий AI мэдээллийг ашиглаж болно."] },
      { title: "6. Хамгаалалт ба устгал", paragraphs: ["KAXI шифрлэгдсэн холболт, эмзэг талбарын шифрлэлт эсвэл халхлалт, админы эрхийн хяналт, аудитын бичлэг ашигладаг. Хугацаа дуусах эсвэл баталгаажсан устгах хүсэлтийн дараа бичлэг ба файлыг устгана."] },
      { title: "7. Таны эрх", paragraphs: ["Та мэдээлэл авах, засах, устгах, боловсруулалтыг хязгаарлах, зөвшөөрлөө буцаах хүсэлт гаргаж болно. Таны болон бусдын эрхийг хамгаалахын тулд нэмэлт баталгаажуулалт шаардаж болно."] },
    ],
    termsSections: [
      { title: "1. Үйлчилгээний хүрээ", paragraphs: ["KAXI нь Солонгост сурах бэлтгэлийн мэдээлэл, сургууль ба зардлын хэрэгсэл, албан эх сурвалжтай AI мэдээлэл, ажилтан эсвэл бие даасан түнштэй холболт өгнө."] },
      { title: "2. AI-ийн хязгаар", paragraphs: ["AI хариулт нь ерөнхий мэдээлэл бөгөөд элсэлт, виз, оршин суух статус эсвэл захиргааны үр дүнг баталгаажуулахгүй. Материал өгөхийн өмнө сургууль, дипломат төлөөлөгч, цагаачлалын байгууллага эсвэл мэргэшсэн зөвлөхөөс шинэ шаардлагыг шалгана уу."] },
      { title: "3. Зөвлөгөө ба түнш", paragraphs: ["KAXI нь хууль, захиргааны үйлчилгээний газар, сургууль эсвэл төрийн байгууллага биш. Хэрэгт зориулсан баримт бичиг, төлөөлөл, төлбөртэй мэргэжлийн ажил нь мэргэшсэн түнштэй тусдаа гэрээ, төлбөрийн мэдэгдэл шаарддаг."] },
      { title: "4. Хэрэглэгчийн үүрэг", bullets: ["Үнэн зөв, хууль ёсны мэдээлэл өгнө.", "Паспорт, банк, оршин суух баримтын шаардлагагүй мэдээллийг чатад оруулахгүй.", "Хугацаа ба материалын шаардлагыг албан байгууллагаас эцэслэн шалгана."] },
      { title: "5. Хориглох үйлдэл", bullets: ["Хуурамч эсвэл өөрчилсөн баримт, хууль бус ажил, визийн баталгаа, хууль тойрох хүсэлт", "Бусдын мэдээлэл эсвэл баримтыг зөвшөөрөлгүй байршуулах", "Довтолгоо, автомат хуулалт, хязгаар тойрох, хортой файл"] },
      { title: "6. Хавсралт", paragraphs: ["Хавсралтыг аюулгүй байдлын шалгалт болон OCR-д түр хадгалж болно. KAXI архив биш тул эх хувийг өөрөө хадгална уу."] },
      { title: "7. Бета ажиллагаа ба өөрчлөлт", paragraphs: ["Үйлчилгээ бета шатанд байна. Аюулгүй байдал, хууль, нийлүүлэгч эсвэл ажиллагааны шалтгаанаар функцийг өөрчилж эсвэл түр зогсоож болох бөгөөд эрхэд чухал өөрчлөлтийг шаардлагатай үед мэдэгдэнэ."] },
      { title: "8. Нууцлал", paragraphs: ["Боловсруулалт болон эрхийн хүсэлтийн талаар Нууцлалын мэдэгдлийг үзнэ үү."] },
    ],
  },
};

export function publicLegalCopy(locale: Locale): LegalPageCopy {
  if (locale === "ko" || locale === "en") return shared[locale];
  return localized[locale];
}
