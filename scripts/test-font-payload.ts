import { readFileSync, statSync } from "node:fs";

// 본문 서체가 로케일별로 필요한 만큼만 내려가는지 확인한다.
//
// 이 검사가 없어서 생긴 일: PretendardVariable.woff2 한 덩어리 2,057,688 바이트가
// unicode-range 없이 걸려 있어서, 베트남어·몽골어 방문자도 쓰지 않는 한글 음절
// 11,172자를 포함한 2 MB 전부를 받았다. 본문 서체라 렌더가 여기 묶인다.
//
// 되돌아가는 방법이 여러 가지라 각각을 따로 막는다. 파일을 다시 합치거나,
// unicode-range를 지우거나, 한글 쪽에 preload를 켜거나, 랜딩이 다시 라우트
// locale을 무시해서 모든 로케일 페이지에 한국어를 심으면 — 어느 쪽이든 효과가
// 사라지고 겉보기에는 멀쩡하다.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const fonts = readFileSync("src/app/fonts.ts", "utf8");

// 1. 두 파일로 나뉘어 있고, 원본 한 덩어리를 다시 쓰지 않는다.
{
  // 주석이 아니라 실제 src: 지정만 본다. 원본 파일은 서브셋을 다시 만들 때
  // 필요하므로 저장소에 남아 있고, 이 파일의 주석도 그 이름을 언급한다.
  const sources = [...fonts.matchAll(/src:\s*"([^"]+)"/g)].map((match) => match[1]!);
  assertOk(
    !sources.some((path) => path.includes("PretendardVariable")),
    `다시 합쳐진 원본을 쓰고 있다 (${sources.join(", ")}); 모든 로케일이 한글 1.7 MB를 받게 된다`,
  );

  const latin = statSync("src/fonts/Pretendard-latin.woff2").size;
  const korean = statSync("src/fonts/Pretendard-korean.woff2").size;
  assertOk(latin < 500_000, `라틴 서브셋이 ${latin.toLocaleString()}바이트다; 한글이 섞여 들어갔을 수 있다`);
  assertOk(korean > latin, "한글 서브셋이 라틴보다 작다; 분할 기준이 뒤바뀐 것 같다");
}

// 2. 두 face의 unicode-range가 겹치지 않아야 한다. 겹치면 브라우저가 둘 다 받는다.
{
  assertOk(
    fonts.includes(`value: "U+0-ABFF, U+D7A4-10FFFF"`),
    "라틴 face의 unicode-range가 사라졌거나 바뀌었다",
  );
  assertOk(
    fonts.includes(`value: "U+AC00-D7A3"`),
    "한글 face의 unicode-range가 사라졌거나 바뀌었다",
  );
}

// 3. preload는 라틴만. 한글까지 preload하면 쪼갠 의미가 없다 —
//    모든 방문자가 렌더 시작 전에 1.7 MB를 받는다.
{
  const koreanBlock = /export const pretendardKorean = localFont\(\{([\s\S]*?)\n\}\);/.exec(fonts);
  assertOk(koreanBlock, "fonts.ts에서 pretendardKorean 선언을 찾지 못했다");
  assertOk(
    /preload:\s*false/.test(koreanBlock[1]!),
    "한글 서브셋이 preload된다; 로케일과 무관하게 1.7 MB가 렌더를 막는다",
  );

  // 라틴 face의 폴백은 반드시 꺼져 있어야 한다. next/font가 만드는 폴백에는
  // unicode-range가 걸리지 않아서, 켜 두면 그 폴백이 한글까지 자기가 그리겠다고
  // 나서고 한글 face가 영영 쓰이지 않는다.
  const latinBlock = /export const pretendardLatin = localFont\(\{([\s\S]*?)\n\}\);/.exec(fonts);
  assertOk(latinBlock, "fonts.ts에서 pretendardLatin 선언을 찾지 못했다");
  assertOk(
    /adjustFontFallback:\s*false/.test(latinBlock[1]!),
    "라틴 face의 폴백이 켜져 있다; 범위 제한이 없는 폴백이 한글을 가로챈다",
  );
}

// 4. 그리고 애초에 비한국어 페이지에 한국어가 렌더되지 않아야 한다.
//    Landing이 라우트 locale을 무시하고 클라이언트 스토어만 읽던 동안, /vi 와
//    /mn 의 초기 HTML은 h1까지 통째로 한국어였다. 그러면 unicode-range가
//    아무리 정확해도 브라우저는 한글 서체를 받는다.
{
  const landing = readFileSync("src/components/kbridge/Landing.tsx", "utf8");
  assertOk(
    /locale\s*\?\?\s*storeLang/.test(landing),
    "Landing이 라우트 locale보다 클라이언트 스토어를 우선한다; 서버 렌더가 다시 한국어로 나간다",
  );

  const page = readFileSync("src/components/kbridge/KaxiPage.tsx", "utf8");
  assertOk(
    /<Landing[^/]*locale=\{locale\}/.test(page),
    "KaxiPage가 Landing에 locale을 넘기지 않는다",
  );
}

console.log("PASS 서체 페이로드: 한글은 한국어를 그릴 때만 내려가고, 비한국어 페이지는 한국어를 렌더하지 않는다");
