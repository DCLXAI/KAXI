import { readFileSync } from "node:fs";
import { LABELLED_PARTNER_TYPES, PARTNER_TYPES } from "../src/lib/partners/types";

// 연결해 줄 수 있는 상대가 있는 것만 화면에 내거는지 확인한다.
//
// 이 검사가 없어서 생긴 일: 파트너 페이지가 다섯 종류를 내걸고 다섯 개 모두에서
// 이름·연락처와 제3자 제공·처리위탁·국외이전 동의를 받고 있었는데, 실제 제휴는
// 행정사 한 곳뿐이었다. 나머지 넷은 요청을 넘길 상대가 없으므로, 받아둔 개인정보와
// 동의는 일어나지 않을 일에 대한 것이었다.
//
// 화면·쓰기 허용 집합·라벨 집합 셋이 서로 어긋나는 방식이 각각 다른 사고를 낸다.
// 그래서 셋의 관계를 직접 고정한다.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const page = readFileSync("src/components/kbridge/Partners.tsx", "utf8");
const offered = new Set(
  [...page.matchAll(/^\s*key: "(\w+)",$/gm)].map((match) => match[1]!),
);
assertOk(offered.size > 0, "Partners.tsx에서 파트너 카드를 찾지 못했다");

// 1. 화면에 내건 것과 서버가 받는 것이 정확히 같아야 한다.
//    화면에만 있으면 제출이 거부되고, 서버에만 있으면 아무도 못 쓰는 허용이다.
{
  for (const key of offered) {
    assertOk(
      PARTNER_TYPES.has(key),
      `파트너 카드 "${key}"를 내걸었지만 createPartnerRequest가 그 유형을 거부한다`,
    );
  }
  for (const type of PARTNER_TYPES) {
    assertOk(
      offered.has(type),
      `서버가 "${type}" 요청을 받지만 화면에는 그 카드가 없다; 죽은 허용이거나 카드를 실수로 지웠다`,
    );
  }
}

// 2. 라벨 집합은 쓰기 허용 집합을 반드시 포함해야 한다. 아니면 지금 막 접수한
//    요청이 관리자 인박스에서 "알 수 없는 유형"으로 보인다.
{
  for (const type of PARTNER_TYPES) {
    assertOk(
      LABELLED_PARTNER_TYPES.has(type),
      `"${type}" 요청을 받으면서 라벨은 없다; 접수 직후부터 알 수 없는 유형으로 표시된다`,
    );
  }
  assertOk(
    LABELLED_PARTNER_TYPES.size >= PARTNER_TYPES.size,
    "라벨 집합이 쓰기 집합보다 작다",
  );
}

// 3. 접수를 닫은 유형의 라벨은 남아 있어야 한다. 지우면 그 유형으로 저장된
//    과거 요청이 인박스에서 이름을 잃는다 — 잘못된 이름이 붙는 것보다는 낫지만,
//    기록을 읽지 못하게 되는 것은 맞다.
{
  const CLOSED = ["translation", "academy", "admission", "settlement"];
  for (const type of CLOSED) {
    assertOk(
      LABELLED_PARTNER_TYPES.has(type),
      `"${type}"는 접수를 닫은 유형인데 라벨 집합에서도 빠졌다; 과거 요청이 인박스에서 이름을 잃는다`,
    );
    assertOk(
      !PARTNER_TYPES.has(type),
      `"${type}" 접수가 다시 열렸다; 연결해 줄 제휴 파트너가 생겼는지 먼저 확인해야 한다`,
    );
  }
}

console.log(
  `PASS 파트너 제공: 화면에 내건 ${offered.size}종이 서버가 받는 것과 같고, 접수를 닫은 유형의 기록은 계속 읽힌다`,
);
