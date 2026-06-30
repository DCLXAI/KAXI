// K-Bridge Gateway 다국어 사전 (KO / VI / MN / EN)

export type Lang = "ko" | "vi" | "mn" | "en";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "mn", label: "Монгол", flag: "🇲🇳" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

export const t = {
  // 네비게이션
  brand: { ko: "K-Bridge Gateway", vi: "K-Bridge Gateway", mn: "K-Bridge Gateway", en: "K-Bridge Gateway" },
  nav_diagnose: { ko: "유학 경로 진단", vi: "Đánh giá lộ trình", mn: "Маршрутын үнэлгээ", en: "Path Diagnosis" },
  nav_schools: { ko: "학교 비교", vi: "So sánh trường", mn: "Сургуулийн харьцуулалт", en: "Compare Schools" },
  nav_cost: { ko: "비용 계산기", vi: "Tính chi phí", mn: "Зардал тооцоолуур", en: "Cost Calculator" },
  nav_docs: { ko: "서류 워크스페이스", vi: "Hồ sơ", mn: "Баримт бичиг", en: "Document Workspace" },
  nav_partners: { ko: "파트너 연결", vi: "Đối tác", mn: "Түншийн холбоо", en: "Partners" },
  nav_admin: { ko: "관리자", vi: "Quản trị", mn: "Админ", en: "Admin" },

  // 랜딩
  hero_badge: { ko: "공식 정보 기반 · 브로커 없이 준비", vi: "Dựa trên thông tin chính thức · Không cần môi giới", mn: "Албан ёсны мэдээлэлд үндэслэсэн · Зуучлагчгүй", en: "Official info based · No broker needed" },
  hero_title: { ko: "브로커 없이 준비하는 한국 유학", vi: "Du học Hàn Quốc không cần môi giới", mn: "Зуучлагчгүйгээр Солонгос улсад суралцах", en: "Study in Korea without a broker" },
  hero_subtitle: {
    ko: "학교 선택, 비용 계산, 서류 준비, 입학 지원, 비자 준비까지 한곳에서 시작하세요.",
    vi: "Chọn trường, tính chi phí, chuẩn bị hồ sơ, nộp đơn, chuẩn bị visa — tất cả trong một.",
    mn: "Сургууль сонгох, зардал тооцоолоход, баримт бичиг бэлтгэх, элсэлт, визийн бэлтгэл — бүгд нэг газарт.",
    en: "School selection, cost calculation, documents, application, visa prep — all in one place.",
  },
  cta_start: { ko: "무료 진단 시작", vi: "Bắt đầu đánh giá miễn phí", mn: "Үнэгүй үнэлгээ эхлэх", en: "Start free diagnosis" },
  cta_compare_cost: { ko: "비용 비교해보기", vi: "So sánh chi phí", mn: "Зардал харьцуулах", en: "Compare costs" },
  hero_stat_students: { ko: "한국 유학생 (2025)", vi: "Du học sinh Hàn Quốc (2025)", mn: "Солонгосын оюутан (2025)", en: "Korea int'l students (2025)" },
  hero_stat_schools: { ko: "검증 학교 DB", vi: "Trường đã xác minh", mn: "Шалгасан сургууль", en: "Verified schools" },
  hero_stat_langs: { ko: "지원 언어", vi: "Ngôn ngữ hỗ trợ", mn: "Дэмжих хэл", en: "Supported languages" },

  features_title: { ko: "브로커가 하던 일을 플랫폼이 대체합니다", vi: "Nền tảng thay thế những gì môi giới làm", mn: "Зуучлагчийн ажлыг платформ орлоно", en: "The platform replaces what brokers do" },
  features_subtitle: { ko: "불법 기능은 차단하고, 정상 기능은 더 투명하게 제공합니다.", vi: "Chặn chức năng bất hợp pháp, minh bạch hóa chức năng hợp pháp.", mn: "Хууль бус үйлдлийг хааж, хууль ёсны үйлдлийг ил тод болгоно.", en: "Block illegal functions, make legal ones more transparent." },

  // 경로 진단
  diagnose_title: { ko: "유학 경로 진단", vi: "Đánh giá lộ trình du học", mn: "Суралцах маршрутын үнэлгээ", en: "Study Path Diagnosis" },
  diagnose_subtitle: { ko: "10개 질문에 답하면 추천 경로와 필요 서류를 정리해드립니다.", vi: "Trả lời 10 câu hỏi để nhận lộ trình gợi ý.", mn: "10 асуултад хариулаад зөвлөмж авна уу.", en: "Answer 10 questions to get a recommended path." },
  diagnose_q_nationality: { ko: "국적", vi: "Quốc tịch", mn: "Үндэсний харьяалал", en: "Nationality" },
  diagnose_q_age: { ko: "나이", vi: "Tuổi", mn: "Нас", en: "Age" },
  diagnose_q_education: { ko: "최종 학력", vi: "Trình độ học vấn", mn: "Боловсрол", en: "Education" },
  diagnose_q_korean: { ko: "한국어 수준", vi: "Trình độ tiếng Hàn", mn: "Солонгос хэлний түвшин", en: "Korean level" },
  diagnose_q_goal: { ko: "희망 과정", vi: "Khóa học mong muốn", mn: "Хүсэлтэй курс", en: "Desired program" },
  diagnose_q_budget: { ko: "예산 (6개월, KRW)", vi: "Ngân sách (6 tháng, KRW)", mn: "Төсөв (6 сар, KRW)", en: "Budget (6 months, KRW)" },
  diagnose_q_region: { ko: "희망 지역", vi: "Khu vực mong muốn", mn: "Хүссэн бүс", en: "Preferred region" },
  diagnose_q_broker: { ko: "현재 브로커 이용 여부", vi: "Có đang dùng môi giới", mn: "Зуучлагч ашиглаж байгаа эсэх", en: "Currently using a broker?" },
  diagnose_q_broker_cost: { ko: "브로커가 요구한 금액 (있으면)", vi: "Số tiền môi giới yêu cầu (nếu có)", mn: "Зуучлагчийн шаардсан мөнгө (байвал)", en: "Broker's quoted amount (if any)" },
  diagnose_q_history: { ko: "과거 비자 거절/체류 이력", vi: "Lịch sử từ chối visa/lnh trú", mn: "Виз татгалзсан/амьдарч байсан түүх", en: "Past visa refusal/stay history" },

  edu_highschool: { ko: "고등학교 졸업", vi: "Tốt nghiệp THPT", mn: "Ахлах сургууль төгссөн", en: "High school graduate" },
  edu_college: { ko: "전문대 졸업", vi: "Cao đẳng", mn: "Коллеж", en: "College graduate" },
  edu_university: { ko: "대학교 졸업", vi: "Đại học", mn: "Их сургууль", en: "University graduate" },
  edu_master: { ko: "대학원 졸업", vi: "Thạc sĩ", mn: "Магистр", en: "Master's graduate" },

  korean_none: { ko: "전혀 못함", vi: "Không biết", mn: "Мэдэхгүй", en: "None" },
  korean_topik1: { ko: "TOPIK 1급", vi: "TOPIK 1", mn: "TOPIK 1", en: "TOPIK 1" },
  korean_topik2: { ko: "TOPIK 2급", vi: "TOPIK 2", mn: "TOPIK 2", en: "TOPIK 2" },
  korean_topik3: { ko: "TOPIK 3급 이상", vi: "TOPIK 3+", mn: "TOPIK 3+", en: "TOPIK 3+" },

  goal_language: { ko: "D-4 한국어 연수", vi: "D-4 tiếng Hàn", mn: "D-4 Солонгос хэл", en: "D-4 Language program" },
  goal_degree: { ko: "D-2 학위과정 (전문대/대학교)", vi: "D-2 Đại học", mn: "D-2 Бакалавр", en: "D-2 Degree program" },
  goal_transfer: { ko: "D-2 편입/대학원", vi: "D-2 Chuyển tiếp/Thạc sĩ", mn: "D-2 Шилжих/Магистр", en: "D-2 Transfer/Graduate" },
  goal_career: { ko: "요양보호사·직업계열", vi: "Chứng chỉ nghề", mn: "Мэргэжлийн сертификат", en: "Vocational/career" },
  goal_unsure: { ko: "잘 모름", vi: "Chưa rõ", mn: "Мэдэхгүй", en: "Not sure" },

  region_seoul: { ko: "서울", vi: "Seoul", mn: "Сеул", en: "Seoul" },
  region_gyeonggi: { ko: "경기", vi: "Gyeonggi", mn: "Кёнги", en: "Gyeonggi" },
  region_busan: { ko: "부산", vi: "Busan", mn: "Пусан", en: "Busan" },
  region_daegu: { ko: "대구", vi: "Daegu", mn: "Тэгу", en: "Daegu" },
  region_gwangju: { ko: "광주", vi: "Gwangju", mn: "Кванчжу", en: "Gwangju" },
  region_other: { ko: "기타 지방", vi: "Khu vực khác", mn: "Бусад бүс", en: "Other regions" },
  region_any: { ko: "상관없음", vi: "Bất kỳ", mn: "Хамаагүй", en: "Any" },

  yes: { ko: "예", vi: "Có", mn: "Тийм", en: "Yes" },
  no: { ko: "아니오", vi: "Không", mn: "Үгүй", en: "No" },

  diagnose_submit: { ko: "진단 결과 보기", vi: "Xem kết quả", mn: "Үр дүн харах", en: "See result" },
  diagnose_save_lead: { ko: "내 결과 저장하고 상담 예약", vi: "Lưu kết quả và đặt lịch", mn: "Хадгалах & зөвлөгөөн захиалах", en: "Save & book consultation" },

  result_recommended: { ko: "추천 경로", vi: "Lộ trình gợi ý", mn: "Зөвлөмж маршрут", en: "Recommended path" },
  result_prep_time: { ko: "예상 준비기간", vi: "Thời gian chuẩn bị", mn: "Бэлтгэх хугацаа", en: "Estimated prep time" },
  result_estimated_cost: { ko: "예상 비용 (6개월)", vi: "Chi phí (6 tháng)", mn: "Зардал (6 сар)", en: "Estimated cost (6 months)" },
  result_required_docs: { ko: "필요 서류", vi: "Hồ sơ cần thiết", mn: "Шаардлагатай баримт", en: "Required documents" },
  result_warnings: { ko: "주의사항", vi: "Lưu ý", mn: "Анхааруулга", en: "Warnings" },
  result_next_actions: { ko: "다음 액션", vi: "Bước tiếp theo", mn: "Дараагийн алхам", en: "Next actions" },

  // 학교 비교
  schools_title: { ko: "학교·어학당 비교", vi: "So sánh trường/lớp tiếng", mn: "Сургууль/хэлний курс харьцуулалт", en: "School comparison" },
  schools_subtitle: { ko: "검증 가능한 50개 학교 DB. 인증 여부와 비자심사 강화 여부를 반드시 확인하세요.", vi: "50 trường đã xác minh. Kiểm tra trạng thái công nhận và visa.", mn: "50 шалгасан сургууль. Итгэмжлэл болон визийн байдлыг шалга.", en: "50 verified schools. Check accreditation & visa status." },
  filter_region: { ko: "지역", vi: "Khu vực", mn: "Бүс", en: "Region" },
  filter_program: { ko: "과정", vi: "Khóa học", mn: "Курс", en: "Program" },
  filter_accreditation: { ko: "인증", vi: "Công nhận", mn: "Итгэмжлэл", en: "Accreditation" },
  filter_tuition_max: { ko: "최대 등록금 (학기)", vi: "Học phí tối đa/kỳ", mn: "Хамгийн их төлбөр/семестр", en: "Max tuition/semester" },
  filter_reset: { ko: "초기화", vi: "Đặt lại", mn: "Шинэчлэх", en: "Reset" },
  school_accredited: { ko: "인증대학", vi: "Đã công nhận", mn: "Итгэмжлэгдсэн", en: "Accredited" },
  school_non_accredited: { ko: "일반", vi: "Thông thường", mn: "Энгийн", en: "Standard" },
  school_caution: { ko: "비자심사 강화", vi: "Visa kiểm tra gắt", mn: "Виз шалгалт хатуу", en: "Visa strict" },
  school_dormitory: { ko: "기숙사", vi: "Ký túc xá", mn: "Дотуур байр", en: "Dormitory" },
  school_available: { ko: "가능", vi: "Có", mn: "Байгаа", en: "Available" },
  school_unavailable: { ko: "불가", vi: "Không", mn: "Байхгүй", en: "Unavailable" },
  school_tuition: { ko: "등록금/학기", vi: "Học phí/kỳ", mn: "Төлбөр/семестр", en: "Tuition/semester" },
  school_topik: { ko: "한국어 조건", vi: "ĐK tiếng Hàn", mn: "Солонгос хэлний нөхцөл", en: "Korean requirement" },
  school_apply: { ko: "지원하기", vi: "Nộp đơn", mn: "Өргөдөл гаргах", en: "Apply" },
  school_official_link: { ko: "공식 사이트", vi: "Website chính thức", mn: "Албан ёсны сайт", en: "Official site" },

  // 비용 계산기
  cost_title: { ko: "총비용 계산기", vi: "Tính tổng chi phí", mn: "Нийт зардал тооцоолуур", en: "Total cost calculator" },
  cost_subtitle: { ko: "브로커 견적과 공식 예상 비용을 나란히 비교해보세요.", vi: "So sánh báo giá môi giới và chi phí thực tế.", mn: "Зуучлагчийн үнийн санал болон бодит зардал харьцуулна уу.", en: "Compare broker quote vs official estimate." },
  cost_platform: { ko: "플랫폼 예상", vi: "Ước tính nền tảng", mn: "Платформын тооцоо", en: "Platform estimate" },
  cost_broker: { ko: "브로커 견적", vi: "Báo giá môi giới", mn: "Зуучлагчийн санал", en: "Broker quote" },
  cost_item_application: { ko: "입학 전형료", vi: "Phí tuyển sinh", mn: "Элсэлтийн хураамж", en: "Application fee" },
  cost_item_tuition: { ko: "등록금 (1학기)", vi: "Học phí (1 kỳ)", mn: "Төлбөр (1 семестр)", en: "Tuition (1 semester)" },
  cost_item_dorm: { ko: "기숙사비 (6개월)", vi: "KTX (6 tháng)", mn: "Дотуур байр (6 сар)", en: "Dormitory (6 months)" },
  cost_item_insurance: { ko: "건강보험료 (6개월)", vi: "Bảo hiểm (6 tháng)", mn: "Эрүүл мэндийн даатгал (6 сар)", en: "Health insurance (6 months)" },
  cost_item_translation: { ko: "번역·공증비", vi: "Dịch+công chứng", mn: "Орчуулга+гэрчилгээ", en: "Translation/notarization" },
  cost_item_visa: { ko: "비자 신청 수수료", vi: "Phí visa", mn: "Визийн хураамж", en: "Visa fee" },
  cost_item_flight: { ko: "항공권 (편도)", vi: "Vé máy bay", mn: "Нисэх тийз", en: "Flight (one-way)" },
  cost_item_settle: { ko: "입국 초기 정착비", vi: "Chi phí ban đầu", mn: "Анхны тохиргоо", en: "Initial settlement" },
  cost_item_platform: { ko: "플랫폼 이용료", vi: "Phí nền tảng", mn: "Платформын хураамж", en: "Platform fee" },
  cost_item_partner: { ko: "파트너 서비스비", vi: "Phí đối tác", mn: "Түншийн үйлчилгээ", en: "Partner service" },
  cost_total: { ko: "총액", vi: "Tổng", mn: "Нийт", en: "Total" },
  cost_warning_broker: { ko: "브로커 견적이 공식 예상보다 비쌉니다.", vi: "Báo giá môi giới cao hơn thực tế.", mn: "Зуучлагчийн санал бодит зардал өндөр.", en: "Broker quote is higher than official estimate." },
  cost_warning_normal: { ko: "정상 범위입니다.", vi: "Trong mức bình thường.", mn: "Хэвийн хязгаарт.", en: "Within normal range." },
  cost_add_to_workspace: { ko: "내 워크스페이스에 저장", vi: "Lưu vào hồ sơ", mn: "Workspace-д хадгалах", en: "Save to workspace" },

  // 서류 워크스페이스
  docs_title: { ko: "서류 워크스페이스", vi: "Hồ sơ cá nhân", mn: "Баримтын workspace", en: "Document workspace" },
  docs_subtitle: { ko: "개인별 필요 서류를 한곳에서 관리하세요. 최종 제출서류는 학교와 재외공관 기준을 확인해야 합니다.", vi: "Quản lý hồ sơ cá nhân. Kiểm tra với trường và đại sứ quán.", mn: "Хувийн баримтаа удирдах. Сургууль болон ЭСЯ-тай шалгах.", en: "Manage your documents. Verify with school & embassy." },
  docs_progress: { ko: "서류 준비 진행률", vi: "Tiến độ hồ sơ", mn: "Баримт бэлтгэх явц", en: "Document progress" },
  docs_doc_passport: { ko: "여권", vi: "Hộ chiếu", mn: "Пасспорт", en: "Passport" },
  docs_doc_photo: { ko: "증명사진", vi: "Ảnh chân dung", mn: "Гэрэл зураг", en: "ID photo" },
  docs_doc_diploma: { ko: "졸업증명서", vi: "Bằng tốt nghiệp", mn: "Төгсөлтийн гэрчилгээ", en: "Diploma" },
  docs_doc_transcript: { ko: "성적증명서", vi: "Học bạ", mn: "Дүнгийн гэрчилгээ", en: "Transcript" },
  docs_doc_finance: { ko: "재정증빙", vi: "Chứng minh tài chính", mn: "Санхүүгийн баталгаа", en: "Financial proof" },
  docs_doc_family: { ko: "가족관계 증빙", vi: "Chứng minh quan hệ gia đình", mn: "Гэр бүлийн харилцаа", en: "Family relation proof" },
  docs_doc_admission: { ko: "표준입학허가서", vi: "Giấy nhập học", mn: "Элсэлтийн зөвшөөрөл", en: "Standard admission letter" },
  docs_doc_tuberculosis: { ko: "결핵진단서", vi: "Giấy khám LAO", mn: "Сүрьеэний үзлэг", en: "Tuberculosis test" },
  docs_doc_plan: { ko: "유학계획서", vi: "Kế hoạch học tập", mn: "Суралцах төлөвлөгөө", en: "Study plan" },
  docs_doc_business: { ko: "교육기관 사업자등록증", vi: "ĐKKD cơ sở giáo dục", mn: "Боловсролын байгууллагын гэрчилгээ", en: "School business registration" },

  status_done: { ko: "준비 완료", vi: "Đã xong", mn: "Бэлэн", en: "Ready" },
  status_translation: { ko: "번역 필요", vi: "Cần dịch", mn: "Орчуулга хэрэгтэй", en: "Translation needed" },
  status_notarization: { ko: "공증 필요", vi: "Cần công chứng", mn: "Гэрчилгээ хэрэгтэй", en: "Notarization needed" },
  status_school_check: { ko: "학교 확인 필요", vi: "Cần xác nhận trường", mn: "Сургууль шалгах", en: "School verification" },
  status_admin_help: { ko: "행정사 상담 필요", vi: "Cần luật sư hành chính", mn: "Зөвлөгөө хэрэгтэй", en: "Admin lawyer needed" },
  status_pending: { ko: "준비 대기", vi: "Đang chờ", mn: "Хүлээгдэж байгаа", en: "Pending" },
  status_not_yet: { ko: "미해당", vi: "Không áp dụng", mn: "Хамаарахгүй", en: "Not applicable" },
  docs_upload: { ko: "업로드", vi: "Tải lên", mn: "Байршуулах", en: "Upload" },
  docs_change_status: { ko: "상태 변경", vi: "Đổi trạng thái", mn: "Төлөв өөрчлөх", en: "Change status" },
  docs_connect_admin: { ko: "행정사 연결", vi: "Kết nối luật sư", mn: "Зөвлөгөө холбох", en: "Connect admin lawyer" },

  // 파트너
  partners_title: { ko: "검증 파트너 연결", vi: "Kết nối đối tác", mn: "Шалгагдсан түнш", en: "Verified partners" },
  partners_subtitle: { ko: "민감 케이스는 전문가에게 넘기세요. 취업 매칭은 법적 위험으로 제공하지 않습니다.", vi: "Trường hợp nhạy cảm → chuyên gia. Không ghép việc làm.", mn: "Эмзэг тохиолдол → мэргэжилтэн. Ажлын байр холбохгүй.", en: "Sensitive cases → experts. No job matching (legal risk)." },
  partner_admin: { ko: "행정사 (비자·체류)", vi: "Luật sư hành chính", mn: "Зөвлөгөөнөөр хангагч", en: "Administrative lawyer (visa)" },
  partner_translation: { ko: "번역·공증", vi: "Dịch+công chứng", mn: "Орчуулга+гэрчилгээ", en: "Translation & notarization" },
  partner_academy: { ko: "한국어 학원", vi: "Trung tâm tiếng Hàn", mn: "Солонгос хэлний төв", en: "Korean academy" },
  partner_admission: { ko: "학교 입학처", vi: "Phòng tuyển sinh", mn: "Элсэлтийн алба", en: "School admission office" },
  partner_settlement: { ko: "정착 파트너 (픽업·숙소·통신·보험)", vi: "Hỗ trợ ban đầu", mn: "Байршуулалт", en: "Settlement partner" },
  partner_request: { ko: "상담 요청", vi: "Yêu cầu tư vấn", mn: "Зөвлөгөө хүсэх", en: "Request consultation" },
  partner_excluded: { ko: "취업 매칭은 법적 위험으로 제외됩니다", vi: "Không ghép việc làm", mn: "Ажлын байр холбохгүй", en: "No job matching (legal risk)" },

  // 관리자
  admin_title: { ko: "관리자 — 리드 리스트 (데모)", vi: "Quản trị — Lead list (demo)", mn: "Админ — Лид жагсаалт (demo)", en: "Admin — Lead list (demo)" },
  admin_subtitle: { ko: "경로 진단을 완료한 사용자의 요약 정보가 표시됩니다. 실제 운영용 권한/인증은 별도 적용 필요.", vi: "Danh sách người đã hoàn thành đánh giá.", mn: "Үнэлгээ дуусгасан хэрэглэгчид.", en: "Users who completed diagnosis." },
  admin_col_name: { ko: "이름/닉네임", vi: "Tên", mn: "Нэр", en: "Name" },
  admin_col_nationality: { ko: "국적", vi: "Quốc tịch", mn: "Үндэс", en: "Nationality" },
  admin_col_goal: { ko: "희망", vi: "Mục tiêu", mn: "Зорилго", en: "Goal" },
  admin_col_path: { ko: "추천 경로", vi: "Lộ trình", mn: "Маршрут", en: "Path" },
  admin_col_budget: { ko: "예산", vi: "Ngân sách", mn: "Төсөв", en: "Budget" },
  admin_col_broker: { ko: "브로커 이용", vi: "Môi giới", mn: "Зуучлагч", en: "Broker" },
  admin_col_created: { ko: "생성일", vi: "Ngày", mn: "Огноо", en: "Created" },
  admin_col_action: { ko: "액션", vi: "Hành động", mn: "Үйлдэл", en: "Action" },
  admin_empty: { ko: "아직 리드가 없습니다. 진단을 완료해보세요.", vi: "Chưa có lead.", mn: "Лид байхгүй.", en: "No leads yet." },

  // 공통
  footer_disclaimer: {
    ko: "본 플랫폼은 공식 정보 기반 가이드를 제공합니다. 비자·체류자격 판단, 행정기관 제출서류 작성·제출 대행은 행정사 등 전문가 영역입니다. 허위서류·불법취업 요청은 서비스 거절 대상입니다.",
    vi: "Nền tảng cung cấp hướng dẫn dựa trên thông tin chính thức. Quyết định visa/hồ sơ hành chính thuộc chuyên gia. Từ chối hồ sơ giả và việc làm bất hợp pháp.",
    mn: "Платформ нь албан ёсны мэдээлэлд үндэслэсэн заавар өгнө. Виз, байршил шийдвэр, албан баримт бэлтгэх нь мэргэжилтний талбар. Хуурамч баримт, хууль бус ажлыг татгалзана.",
    en: "Platform provides official-info-based guidance. Visa/stay decisions and administrative submissions belong to experts. Fake documents and illegal jobs are refused.",
  },
  footer_data_source: { ko: "데이터 출처: 한국유학종합시스템·교육부·법무부·법제처", vi: "Nguồn: Study in Korea · MOE · MOJ · Korea Legislation", mn: "Эх сурвалж: Study in Korea · MOE · MOJ", en: "Sources: Study in Korea · MOE · MOJ · Legislation" },
  ai_assistant_title: { ko: "유학 준비 도우미", vi: "Trợ lý du học", mn: "Туслах", en: "Study prep assistant" },
  ai_placeholder: { ko: "질문을 입력하세요 (예: D-2와 D-4 차이?)", vi: "Nhập câu hỏi", mn: "Асуулт оруул", en: "Ask a question" },
  ai_send: { ko: "전송", vi: "Gửi", mn: "Илгээх", en: "Send" },
  ai_disclaimer: { ko: "AI는 공식 정보 기반 안내만 제공합니다. 개별 비자 판단은 행정사 상담 필요.", vi: "AI chỉ hướng dẫn chung. Tư vấn visa cần chuyên gia.", mn: "AI ерөнхий заавар өгнө. Виз зөвлөгөө шаардлагатай.", en: "AI gives general info only. Visa cases need expert." },
} as const;

export type TranslationKey = keyof typeof t;

export function tr(key: TranslationKey, lang: Lang): string {
  const entry = t[key];
  return (entry as Record<Lang, string>)[lang] ?? entry.en;
}
