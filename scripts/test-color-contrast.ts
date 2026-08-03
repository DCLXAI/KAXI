import { readFileSync } from "node:fs";

// 두 테마의 색 대비를 WCAG 기준으로 잰다.
//
// 이 검사가 없어서 생긴 일: 다크 모드에서 --destructive(#e2574a)가 카드 위 3.84:1,
// 페이지 위 4.16:1로 AA(4.5)에 미달한 채로 나가고 있었다. text-destructive는 53곳,
// bg-destructive는 35곳에서 쓰이고 .chat-surface가 같은 팔레트를 쓰므로, AI 화면의
// 오류·경고 문구가 전부 그 대비였다. 눈으로는 "빨간 글씨가 잘 보인다"로 넘어간다.
//
// 디자인 시스템 9장이 이미 "disabled 텍스트도 최소 4.5:1"이라고 적고 있었지만,
// 그 규칙을 지키는지 재는 것은 아무것도 없었다.
//
// 조합은 화면에서 실제로 겹치는 것만 고른다. 토큰을 전수 교차하면 쓰이지 않는
// 쌍이 잡혀서, 통과시키려고 값을 바꾸는 쪽으로 끌려간다.

const AA_NORMAL = 4.5;

/** 전경, 배경, 이 조합이 화면 어디인지. */
const PAIRS: [string, string, string][] = [
  ["--foreground", "--background", "본문 / 페이지"],
  ["--card-foreground", "--card", "카드 본문"],
  ["--muted-foreground", "--background", "보조 텍스트 / 페이지"],
  ["--muted-foreground", "--card", "보조 텍스트 / 카드"],
  ["--primary-foreground", "--primary", "주 버튼"],
  ["--secondary-foreground", "--secondary", "보조 버튼"],
  ["--accent-foreground", "--accent", "accent 표면"],
  ["--destructive-foreground", "--destructive", "위험 버튼 (bg-destructive)"],
  ["--destructive", "--background", "오류 텍스트 / 페이지 (text-destructive)"],
  ["--destructive", "--card", "오류 텍스트 / 카드 (text-destructive)"],
  ["--popover-foreground", "--popover", "팝오버"],
  ["--sidebar-foreground", "--sidebar", "사이드바"],
  ["--sidebar-primary-foreground", "--sidebar-primary", "사이드바 주 버튼"],
  ["--primary-strong", "--background", "링크 / 페이지"],
  ["--primary-strong", "--card", "링크 / 카드"],
  ["--ring", "--background", "포커스 링 / 페이지"],
];

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function themeTokens(selector: RegExp, label: string): Map<string, string> {
  const css = readFileSync("src/app/globals.css", "utf8");
  const block = selector.exec(css);
  assertOk(block, `globals.css에서 ${label} 블록을 찾지 못했다`);
  return new Map(
    [...block[1]!.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1]!, m[2]!.toLowerCase()]),
  );
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

const THEMES: [string, RegExp][] = [
  ["light", /:root\s*\{([\s\S]*?)\n\}/],
  ["dark", /\.dark,\s*\n\.chat-surface\s*\{([\s\S]*?)\n\}/],
];

const failures: string[] = [];
for (const [theme, selector] of THEMES) {
  const tokens = themeTokens(selector, theme);
  for (const [fg, bg, where] of PAIRS) {
    const foreground = tokens.get(fg);
    const background = tokens.get(bg);
    assertOk(foreground, `${theme}에 ${fg}가 없다; 토큰이 사라졌거나 이름이 바뀌었다`);
    assertOk(background, `${theme}에 ${bg}가 없다; 토큰이 사라졌거나 이름이 바뀌었다`);

    const ratio = contrast(foreground, background);
    if (ratio < AA_NORMAL) {
      failures.push(
        `${theme} · ${where}: ${ratio.toFixed(2)}:1 (${fg} ${foreground} on ${bg} ${background}) — AA ${AA_NORMAL} 미달`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("FAIL 색 대비가 AA에 미달하는 조합이 있다:");
  for (const line of failures) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`PASS 색 대비: 두 테마에서 화면에 겹치는 ${PAIRS.length}개 조합이 모두 AA ${AA_NORMAL}:1 이상`);
