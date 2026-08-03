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

console.log("PASS 디자인 토큰: 스펙 페이지가 제품 토큰을 가리키고, 문서에 적힌 값이 제품과 일치한다");
