import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// 디자인 시스템 문서가 실제 제품을 설명하는지 확인한다.
//
// 이 검사가 없어서 생긴 일: /ko/design-system 이 자기만의 --k-* 토큰 열두 개를
// 하드코딩하고 있었고, 그 값이 제품에서 쓰이는 곳은 0곳이었다. 여덟 색 중 정확히
// 일치한 것은 둘뿐 — Lavender는 문서 #b9c7ff / 제품 --primary #c7d2fe,
// Rose는 #eda8ba / --icon-accent #e5a0b3, Canvas·Paper·Ink도 전부 어긋났다.
//
// 문서와 코드가 다르면 문서가 지는 게 아니라 둘 다 진다. 디자이너는 문서를 보고
// 값을 고르고 개발자는 코드를 보고 고르니, 화면에서 두 색이 만난다.

const PAGE = "src/app/[locale]/design-system/page.tsx";
const MODULE_CSS = "src/app/[locale]/design-system/design-system.module.css";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

/** globals.css의 :root 블록에 선언된 토큰 → 값. */
function productTokens(): Map<string, string> {
  const css = readFileSync("src/app/globals.css", "utf8");
  const root = /:root\s*\{([\s\S]*?)\n\}/.exec(css);
  assertOk(root, "globals.css에서 :root 블록을 찾지 못했다");
  const tokens = new Map<string, string>();
  for (const [, name, value] of root[1]!.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens.set(name!, value!.trim().toLowerCase());
  }
  return tokens;
}

const tokens = productTokens();
const page = readFileSync(PAGE, "utf8");

// 1. 문서가 열거하는 색은 제품에 실재하고, 값이 같아야 한다.
{
  const rows = [...page.matchAll(/\{ name: "(\w+)", token: "(--[\w-]+)", hex: "(#[0-9a-fA-F]{6})"/g)];
  assertOk(rows.length > 0, `${PAGE}에서 팔레트 표를 찾지 못했다`);

  for (const [, name, token, hex] of rows) {
    const actual = tokens.get(token!);
    assertOk(actual, `문서가 ${name}(${token})을 싣지만 globals.css의 :root에 그런 토큰이 없다`);
    assertOk(
      actual === hex!.toLowerCase(),
      `${name}: 문서는 ${token} = ${hex}라고 하는데 제품은 ${actual}이다`,
    );
  }
}

// 2. 스펙 페이지의 --k-* 는 값을 복사하지 말고 제품 토큰을 가리켜야 한다.
//    복사본은 고쳐도 제품이 안 따라오고, 제품을 고쳐도 복사본이 안 따라온다.
{
  const css = readFileSync(MODULE_CSS, "utf8");
  const block = /\.system\s*\{([\s\S]*?)\n\s*min-height/.exec(css);
  assertOk(block, `${MODULE_CSS}에서 .system 토큰 블록을 찾지 못했다`);

  // Mint는 제품에 대응 토큰이 없다는 것이 확인된 사실이라 예외로 둔다.
  // 값을 지어내 globals.css에 넣는 것이 답이 아니라, 아직 없다는 걸 드러내는 게 답이다.
  const KNOWN_MISSING = new Set(["--k-mint"]);

  const literals: string[] = [];
  for (const [, name, value] of block[1]!.matchAll(/(--k-[\w-]+):\s*([^;]+);/g)) {
    if (KNOWN_MISSING.has(name!)) continue;
    if (/^#[0-9a-fA-F]{3,8}$/.test(value!.trim())) literals.push(`${name} = ${value!.trim()}`);
  }
  assertOk(
    literals.length === 0,
    `스펙 페이지가 색 값을 복사해 들고 있다 (${literals.join(", ")}); var(--제품토큰)을 가리켜야 한다`,
  );

  assertOk(
    /--k-lavender:\s*var\(--primary\)/.test(block[1]!),
    "--k-lavender가 --primary를 가리키지 않는다",
  );
}

// 3. z-index는 문서가 코드를 따라야 한다. 반대가 아니다.
//
//    전에는 문서가 0/10/20/40/60/80을 "계약"이라 적었는데 60과 80은 코드
//    어디에서도 쓰인 적이 없었고, 실제로 쓰이는 50과 100은 표에 없었다. 그
//    50과 100의 대부분은 components/ui에 벤더링된 shadcn의 오버레이 계층이라
//    우리가 옮길 수 있는 값도 아니다. 문서를 계획이 아니라 제품으로 되돌린다.
{
  const layers = (scope: string) =>
    new Set(
      execSync(`grep -rhoE '\\bz-(\\[[0-9]+\\]|[0-9]+)' ${scope} --include='*.tsx' || true`, {
        encoding: "utf8",
      })
        .split("\n")
        .map((token) => token.trim().replace(/^z-\[?|\]$/g, ""))
        .filter(Boolean),
    );

  // 벤더링된 shadcn은 자기 내부 값을 갖는다 — navigation-menu의 z-[1] 같은 것은
  // 앱이 추론하는 층이 아니라 한 컴포넌트의 구현 세부다. 그래서 "문서에 있어야
  // 한다"는 앱 코드에만 요구하고, "문서에 있으면 실제로 쓰여야 한다"는 전체에
  // 요구한다. 후자가 60·80 같은 허구를 잡는 쪽이다.
  const everywhere = layers("src");
  const appOwned = new Set(
    [...layers("src")].filter((value) => {
      const hits = execSync(
        `grep -rlE '\\bz-(\\[)?${value}(\\])?\\b' src --include='*.tsx' | grep -v '^src/components/ui/' || true`,
        { encoding: "utf8" },
      ).trim();
      return hits.length > 0;
    }),
  );

  const documented = new Set(
    [...page.matchAll(/\["(?:Toast|Overlay|Sticky|Anchored|Raised|Base)", "(\d+)"/g)].map((m) => m[1]!),
  );
  assertOk(documented.size >= 5, "z-index 표를 찾지 못했다");

  for (const value of appOwned) {
    assertOk(
      documented.has(value),
      `앱 코드가 z-${value}를 쓰는데 디자인 시스템 8장에 그 층이 없다; 임의의 숫자이거나 표가 낡았다`,
    );
  }
  for (const value of documented) {
    assertOk(
      value === "0" || everywhere.has(value),
      `문서가 z-${value} 층을 싣지만 코드 어디에서도 쓰이지 않는다; 제품이 아니라 계획을 설명하고 있다`,
    );
  }
}

// 4. 반경 눈금은 --radius에서 파생된다. 문서가 다른 숫자를 적으면 잡는다.
{
  const base = tokens.get("--radius");
  assertOk(base === "0.75rem", `--radius가 ${base}로 바뀌었다; 아래 눈금을 다시 계산해야 한다`);

  const EXPECTED = new Map([["sm", "8px"], ["md", "10px"], ["lg", "12px"], ["xl", "16px"]]);
  for (const [, name, value] of page.matchAll(/\["(sm|md|lg|xl)", "(\d+px)"/g)) {
    assertOk(
      EXPECTED.get(name!) === value!,
      `문서는 radius ${name} = ${value}라고 하는데 --radius(0.75rem)에서 나오는 값은 ${EXPECTED.get(name!)}이다`,
    );
  }
}

console.log("PASS 디자인 토큰: 스펙 페이지가 제품 토큰을 가리키고, 문서에 적힌 값이 제품과 일치한다");
console.log("PASS 디자인 토큰: z-index 층과 반경 눈금이 코드에서 실제로 쓰이는 것과 같다");
