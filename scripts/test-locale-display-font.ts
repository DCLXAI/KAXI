import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { locales } from "../src/i18n/routing";
import {
  DISPLAY_FONT_BY_LOCALE,
  DISPLAY_FONT_SUBSETS,
  REQUIRED_DISPLAY_SUBSET,
} from "../src/lib/i18n/display-font";

// 헤드라인 서체가 그 로케일의 글자를 실제로 그릴 수 있는지 확인한다.
//
// 이 검사가 없어서 생긴 일: Fredoka는 구글이 hebrew·latin·latin-ext로만 제공하는데
// 네 로케일 전부에 걸려 있었다. 베트남어 히어로 "Du học Hàn Quốc"은 브라우저가
// precomposed 글리프 대신 결합 부호를 합성해 성조 부호가 글자에서 떨어져 떴고,
// 몽골어는 키릴이 아예 없어 Pretendard로 폴백해 브랜드 서체를 잃었다. 두 경우 다
// 페이지는 정상적으로 렌더되고 빌드도 통과하므로, 사람이 그 언어로 된 화면을
// 직접 눈으로 보기 전에는 아무도 모른다.
//
// 그래서 판정을 눈이 아니라 구글 카탈로그에 맡긴다. next/font가 빌드에 사용하는
// 바로 그 서브셋 목록을 읽으므로, "이 서체에 이 문자 체계가 있다"는 주장이
// 사실과 어긋날 수 없다.

const require = createRequire(import.meta.url);
const FONT_DATA = require("next/dist/compiled/@next/font/dist/google/font-data.json") as Record<
  string,
  { subsets?: string[] }
>;

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

// 1. 요청하는 서브셋이 그 서체에 실제로 존재해야 한다. 존재하지 않는 이름을
//    적으면 next/font가 빌드에서 거르지만, 존재하는 이름만 적고 필요한 것을
//    빠뜨리는 쪽은 아무도 막지 않는다 — 그게 실제로 일어난 일이다.
for (const [family, requested] of Object.entries(DISPLAY_FONT_SUBSETS)) {
  const available = FONT_DATA[family]?.subsets;
  assertOk(available, `${family}가 구글 카탈로그에 없다; 이름이 바뀌었거나 오타다`);
  for (const subset of requested) {
    assertOk(
      available.includes(subset),
      `${family}에는 ${subset} 서브셋이 없다 (있는 것: ${available.join(", ")})`,
    );
  }
}

// 2. 각 로케일이 받는 서체가 그 로케일의 문자 체계를 담고 있어야 한다.
//    이것이 원래 버그를 직접 겨냥하는 단언이다.
for (const locale of locales) {
  const family = DISPLAY_FONT_BY_LOCALE[locale];
  assertOk(family, `${locale}에 디스플레이 서체가 지정되지 않았다`);

  const needed = REQUIRED_DISPLAY_SUBSET[locale];
  const catalog = FONT_DATA[family]?.subsets ?? [];
  assertOk(
    catalog.includes(needed),
    `${locale}는 ${needed} 글리프가 필요한데 ${family}에는 없다 — 부호가 깨지거나 폴백 서체로 렌더된다`,
  );

  const requested = DISPLAY_FONT_SUBSETS[family] as readonly string[];
  assertOk(
    requested.includes(needed),
    `${family}는 ${needed}를 제공하지만 fonts.ts가 요청하지 않는다; ${locale}에 그 글리프가 내려가지 않는다`,
  );
}

console.log("PASS 디스플레이 서체: 모든 로케일이 자기 문자 체계를 가진 서체를 받는다");

// 3. 배선이 실제로 되어 있어야 한다. 위 표가 아무리 맞아도 layout이 그것을
//    읽지 않으면 브라우저에는 아무 일도 일어나지 않는다.
{
  const layout = readFileSync("src/app/[locale]/layout.tsx", "utf8");
  assertOk(
    layout.includes("DISPLAY_FONT_BY_LOCALE"),
    "[locale]/layout.tsx가 서체 표를 읽지 않는다; 별도 목록을 들고 있으면 표와 어긋난다",
  );
  assertOk(
    /lang=\{locale\}/.test(layout),
    "[locale]/layout.tsx가 lang을 로케일로 선언하지 않는다; 루트 <html>은 ko로 고정되어 있어 " +
      "스크린리더가 베트남어·몽골어를 한국어 음성 규칙으로 읽는다",
  );

  // fonts.ts는 표를 import해서 쓸 수 없다. next/font의 SWC 변환이 정적
  // 리터럴만 허용해서 spread를 쓰면 "Unexpected spread"로 빌드가 깨진다.
  // 그래서 공유가 아니라 일치를 강제한다: 리터럴이 표와 한 글자라도 다르면
  // 여기서 떨어진다.
  const fonts = readFileSync("src/app/fonts.ts", "utf8");
  for (const [family, expected] of Object.entries(DISPLAY_FONT_SUBSETS)) {
    const declaration = new RegExp(
      `export const \\w+ = ${family}\\(\\{[^}]*?subsets:\\s*\\[([^\\]]*)\\]`,
      "s",
    ).exec(fonts);
    assertOk(declaration, `fonts.ts에서 ${family} 선언의 subsets를 찾지 못했다`);

    const declared = declaration[1]!
      .split(",")
      .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    assertOk(
      declared.join("|") === [...expected].join("|"),
      `fonts.ts의 ${family} subsets가 표와 다르다: 코드 [${declared.join(", ")}] vs 표 [${expected.join(", ")}]`,
    );
  }

  const css = readFileSync("src/app/globals.css", "utf8");
  assertOk(
    css.includes("var(--font-rounded-intl, var(--font-rounded-latin))"),
    "globals.css의 디스플레이 체인이 로케일 교체를 반영하지 않는다",
  );
  assertOk(
    !/--font-serif:\s*var\(--font-rounded-latin\)/.test(css),
    "Fredoka가 여전히 체인 선두에 있다; vi·mn에서 한 단어 안에 두 서체가 섞인다",
  );
}

console.log("PASS 디스플레이 서체: 로케일 래퍼가 lang과 서체 변수를 함께 건다");
