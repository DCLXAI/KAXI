INSERT INTO public.rag_query_aliases (locale, category, term, expansions)
VALUES
  ('ko', 'visa', '한국어 연수', ARRAY['D-4', 'D4', '어학연수', '한국어 연수 비자']),
  ('en', 'visa', 'study Korean', ARRAY['D-4', 'D4', 'Korean language training visa']),
  ('vi', 'visa', 'học tiếng Hàn', ARRAY['D-4', 'D4', 'visa du học tiếng Hàn', 'đào tạo ngôn ngữ']),
  ('mn', 'visa', 'солонгос хэл сурах', ARRAY['D-4', 'D4', 'солонгос хэлний бэлтгэл', 'суралцах виз']),
  ('ko', 'documents', '허위 서류', ARRAY['위조 서류', '거짓 신청', '허위 잔고증명']),
  ('en', 'documents', 'fake bank statement', ARRAY['false documents', 'forged documents', 'false application']),
  ('vi', 'documents', 'hồ sơ giả', ARRAY['giấy tờ giả', 'sao kê ngân hàng giả', 'khai báo sai']),
  ('mn', 'documents', 'хуурамч бичиг баримт', ARRAY['хуурамч банкны үлдэгдэл', 'худал мэдүүлэг'])
ON CONFLICT (locale, category, term) DO UPDATE
SET expansions = EXCLUDED.expansions,
    enabled = true,
    updated_at = now();

NOTIFY pgrst, 'reload schema';
