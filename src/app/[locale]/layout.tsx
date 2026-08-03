import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { isLocale, locales, type Locale } from "@/i18n/routing";
import { nunito } from "@/app/fonts";
import { DISPLAY_FONT_BY_LOCALE } from "@/lib/i18n/display-font";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

async function loadMessages(locale: Locale) {
  return (await import(`../../../messages/${locale}.json`)).default;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // lang을 여기서 다시 선언하는 이유: 루트 레이아웃의 <html>은 lang="ko"로
  // 고정되어 있고, 자기 세그먼트가 아닌 [locale] 값을 알 방법이 없다
  // (headers()로 읽으면 전 페이지가 정적 렌더링에서 빠진다). 그래서 베트남어와
  // 몽골어 페이지가 lang="ko"로 나가고 있었고, 스크린리더가 한국어 음성 규칙으로
  // 읽었다. display:contents라 레이아웃 박스는 만들지 않으면서 lang 속성과
  // 폰트 변수는 그대로 하위에 적용된다.
  const displayFont = DISPLAY_FONT_BY_LOCALE[locale] === "Nunito" ? nunito.variable : "";

  return (
    <NextIntlClientProvider locale={locale} messages={await loadMessages(locale)}>
      <div lang={locale} className={`contents ${displayFont}`.trim()}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
