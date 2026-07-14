INSERT INTO public.rag_query_aliases (locale, category, term, expansions)
VALUES
  ('ko', 'visa', '연장 신청', ARRAY['hikorea-stay-extension', 'immigration-act-stay-extension', '체류기간 연장']),
  ('ko', 'visa', '이미 지났', ARRAY['immigration-act-deportation-grounds', 'immigration-act-stay-extension', '오버스테이']),
  ('ko', 'visa', 'D-4에서', ARRAY['hikorea-status-change', 'immigration-act-status-change', 'd-4-to-d-2-transfer']),
  ('ko', 'visa', '입국금지', ARRAY['immigration-act-entry-ban', '강제퇴거']),
  ('ko', 'general', '허가 없이', ARRAY['illegal-employment-warning', 'immigration-law-violation-risk', '자격외활동']),
  ('en', 'visa', 'apply for an extension', ARRAY['hikorea-stay-extension', 'immigration-act-stay-extension']),
  ('en', 'visa', 'already expired', ARRAY['immigration-act-deportation-grounds', 'immigration-act-stay-extension', 'overstay']),
  ('en', 'visa', 'change from D-4', ARRAY['hikorea-status-change', 'immigration-act-status-change', 'd-4-to-d-2-transfer']),
  ('en', 'visa', 'entry ban', ARRAY['immigration-act-entry-ban', 'deportation']),
  ('en', 'general', 'without any work permit', ARRAY['illegal-employment-warning', 'immigration-law-violation-risk']),
  ('en', 'documents', 'bank balance certificate', ARRAY['financial-proof', 'visa-documents', 'proof of funds']),
  ('en', 'visa', 'D-10', ARRAY['d10-overview', 'hikorea-d2-d4-d10-e7-f2-f5-requirements', 'job seeker']),
  ('vi', 'visa', 'xin gia hạn', ARRAY['hikorea-stay-extension', 'immigration-act-stay-extension']),
  ('vi', 'visa', 'đã hết hạn', ARRAY['immigration-act-deportation-grounds', 'immigration-act-stay-extension', 'quá hạn']),
  ('vi', 'visa', 'chuyển từ D-4', ARRAY['hikorea-status-change', 'immigration-act-status-change', 'd-4-to-d-2-transfer']),
  ('vi', 'visa', 'cấm nhập cảnh', ARRAY['immigration-act-entry-ban', 'trục xuất']),
  ('vi', 'general', 'không cần giấy phép', ARRAY['illegal-employment-warning', 'immigration-law-violation-risk']),
  ('vi', 'documents', 'sổ tiết kiệm giả', ARRAY['fake-documents-warning', 'immigration-act-false-application-documents']),
  ('vi', 'documents', 'làm giả', ARRAY['fake-documents-warning', 'immigration-act-false-application-documents']),
  ('mn', 'visa', 'хугацаа сунгах', ARRAY['hikorea-stay-extension', 'immigration-act-stay-extension']),
  ('mn', 'visa', 'хугацаа дууссан', ARRAY['immigration-act-deportation-grounds', 'immigration-act-stay-extension']),
  ('mn', 'visa', 'D-4-өөс', ARRAY['hikorea-status-change', 'immigration-act-status-change', 'd-4-to-d-2-transfer']),
  ('mn', 'visa', 'нэвтрэх хориг', ARRAY['immigration-act-entry-ban', 'албадан гаргах']),
  ('mn', 'general', 'зөвшөөрөлгүйгээр', ARRAY['illegal-employment-warning', 'immigration-law-violation-risk'])
ON CONFLICT (locale, category, term) DO UPDATE
SET expansions = EXCLUDED.expansions,
    enabled = true,
    updated_at = now();

NOTIFY pgrst, 'reload schema';
