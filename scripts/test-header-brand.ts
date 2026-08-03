import { readFileSync } from "node:fs";

// 헤더에 브랜드가 남아 있는지 확인한다.
//
// 이 검사가 없어서 생긴 일: 워드마크에 `hidden min-[400px]:block`이 걸려 있어
// 375px 화면 — 가장 흔한 모바일 폭이다 — 에서는 브랜드 이름이 아예 표시되지
// 않았다. 남는 것은 64x32로 축소된 마스코트 하나뿐이고, 그것은 aria-hidden
// 장식이라 스크린리더에도 읽히지 않는다. 즉 그 폭의 헤더에는 눈으로도
// 보조기술로도 브랜드가 존재하지 않았다.
//
// 같은 원인의 두 번째 증상은 1024~1279px이었다. 데스크톱 내비가 lg에서
// 펼쳐지는데 몽골어 라벨 다섯 개가 폭을 다 써서 헤더가 가로로 넘치고 오른쪽
// 끝 로그인 링크가 잘렸다. 워드마크를 그 구간에서 숨긴 것은 그 압박을 덜려던
// 것이었지 원인을 고친 게 아니었다.
//
// 렌더 결과가 아니라 클래스를 본다. 브라우저 없이 CI에서 돌아야 하고, 되돌리는
// 편집은 결국 이 클래스들을 다시 건드리기 때문이다.

const HEADER = "src/components/kbridge/Header.tsx";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const header = readFileSync(HEADER, "utf8");

// 최상단 헤더 바의 브랜드 링크. 시트(모바일 서랍) 안의 워드마크와 구분하려고
// group-hover 트랜지션이 걸린 쪽만 고른다.
const topBarWordmark = /<KarxyWordmark\s+className="([^"]*group-hover[^"]*)"/.exec(header);
assertOk(topBarWordmark, `${HEADER}에서 상단 바 워드마크를 찾지 못했다`);

const wordmarkClasses = topBarWordmark[1]!;

// 1. 워드마크는 어떤 폭에서도 숨겨지지 않는다.
{
  assertOk(
    !/\bhidden\b/.test(wordmarkClasses),
    `상단 워드마크가 다시 숨겨진다 (${wordmarkClasses}); 그 폭에서는 헤더에 브랜드가 없다`,
  );
  assertOk(
    !/:hidden\b/.test(wordmarkClasses),
    `상단 워드마크에 브레이크포인트 숨김이 걸렸다 (${wordmarkClasses}); ` +
      "자리가 모자라면 장식(KaxiRunningCat)이 먼저 빠져야 한다",
  );
}

// 2. 데스크톱 내비는 xl에서 펼친다. lg로 되돌리면 1024~1279px에서 다시 넘친다.
{
  const nav = /<nav className="([^"]*)"\s+aria-label=\{tr\("nav_menu"/.exec(header);
  assertOk(nav, `${HEADER}에서 데스크톱 내비를 찾지 못했다`);
  assertOk(
    /\bxl:flex\b/.test(nav[1]!),
    `데스크톱 내비가 xl보다 먼저 펼쳐진다 (${nav[1]}); 몽골어 라벨에서 헤더가 가로로 넘친다`,
  );

  // 그리고 그 아래 구간에는 반드시 햄버거가 있어야 한다. 두 분기점이 어긋나면
  // 1024~1279px에 내비가 아예 없는 구간이 생긴다.
  assertOk(
    /className="xl:hidden"/.test(header),
    "모바일 내비 트리거가 내비 분기점과 어긋난다; 두 개가 맞지 않으면 메뉴가 없는 폭이 생긴다",
  );
}

console.log("PASS 헤더 브랜드: 모든 폭에서 워드마크가 보이고, 내비는 넘치지 않는 폭에서만 펼쳐진다");
