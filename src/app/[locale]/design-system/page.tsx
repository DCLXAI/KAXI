import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Check,
  ChevronDown,
  CircleHelp,
  FileCheck2,
  Globe2,
  Info,
  LockKeyhole,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

import { KaxiPawMark } from "@/components/brand/KaxiPawMark";
import { isLocale } from "@/i18n/routing";
import styles from "./design-system.module.css";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const sections = [
  "색 팔레트",
  "타이포그래피",
  "간격",
  "반경",
  "그림자",
  "보더",
  "모션",
  "z-index",
  "opacity",
  "focus",
  "아이콘",
  "컴포넌트",
  "합성 예시",
  "Known Gaps",
] as const;

// 제품이 실제로 쓰는 토큰과 그 값.
//
// hex는 globals.css의 :root에 적힌 값을 그대로 옮긴 것이고,
// scripts/test-design-tokens.ts가 매 CI마다 대조한다. 여기만 고치고 제품을
// 잊거나, 제품만 고치고 여기를 잊으면 빌드가 떨어진다.
const palette = [
  { name: "Canvas", token: "--background", hex: "#f0eee6", className: styles.canvasSwatch, role: "페이지 배경" },
  { name: "Paper", token: "--card", hex: "#faf9f5", className: styles.paperSwatch, role: "카드·입력 표면" },
  { name: "Ink", token: "--foreground", hex: "#1f1e1d", className: styles.inkSwatch, role: "본문·강한 보더" },
  { name: "Lavender", token: "--primary", hex: "#c7d2fe", className: styles.lavenderSwatch, role: "핵심 행동·선택" },
  { name: "Indigo", token: "--primary-strong", hex: "#4f5db3", className: styles.indigoSwatch, role: "링크·포커스·정보" },
  { name: "Rose", token: "--icon-accent", hex: "#e5a0b3", className: styles.roseSwatch, role: "브랜드 포인트" },
  { name: "Clay", token: "--clay", hex: "#c96442", className: styles.claySwatch, role: "주의·기한" },
] as const;

const spacing = [
  ["0", "0px"], ["1", "4px"], ["2", "8px"], ["3", "12px"], ["4", "16px"],
  ["6", "24px"], ["8", "32px"], ["12", "48px"], ["16", "64px"], ["24", "96px"],
] as const;

const radii = [
  ["none", "0"], ["xs", "4px"], ["sm", "8px"], ["md", "12px"],
  ["lg", "16px"], ["xl", "24px"], ["full", "999px"],
] as const;

const shadows = [
  { name: "Hairline", token: "shadow-1", usage: "입력·행 안쪽 구분", className: styles.shadowHairline },
  { name: "Card", token: "shadow-2", usage: "일반 콘텐츠 카드", className: styles.shadowCard },
  { name: "Lift", token: "shadow-3", usage: "hover·선택 상태", className: styles.shadowLift },
  { name: "Echo", token: "shadow-brand", usage: "브랜드·합성 섹션 한정", className: styles.shadowEcho },
] as const;

function SpecSection({ number, title, intro, children }: {
  number: number;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section id={`section-${number}`} className={styles.specSection} aria-labelledby={`section-${number}-title`}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionNumber}>{String(number).padStart(2, "0")}</span>
        <div>
          <h2 id={`section-${number}-title`}>{title}</h2>
          <p>{intro}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function CodePill({ children }: { children: ReactNode }) {
  return <code className={styles.codePill}>{children}</code>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: "KARXY Design System · Foundation 1.0",
    description: "KARXY의 색, 활자, 간격, 모션, 컴포넌트와 합성 원칙을 정의한 리빙 디자인 시스템.",
    // 내부 문서다. robots.txt는 Allow: / 이고 이 페이지는 앱 어디에서도 링크되지
    // 않지만, 링크되지 않는 것은 색인되지 않는 것과 다르다. 14장 Known Gaps에는
    // "다크 모드 대비 미확정", "저사양 Android 성능 데이터 부족" 같은 자체 약점이
    // 그대로 적혀 있고, 그건 검색 결과에 실릴 내용이 아니다.
    robots: { index: false, follow: false },
  };
}

export default async function DesignSystemPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <main className={styles.system} lang="ko">
      <header className={styles.topbar}>
        <Link href={`/${locale}`} className={styles.brandLink} aria-label="KARXY 홈으로 이동">
          <Image
            src="/brand/karxy-bubble-wordmark.png"
            alt="KARXY"
            width={1661}
            height={482}
            priority
            className={styles.wordmark}
          />
        </Link>
        <div className={styles.topMeta}>
          <span>FOUNDATION 1.0</span>
          <span className={styles.statusDot}>Living spec</span>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="design-system-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><KaxiPawMark /> KARXY PRODUCT LANGUAGE</p>
          <h1 id="design-system-title">낯선 한국 생활을<br />명확하고 다정하게.</h1>
          <p className={styles.heroLead}>
            공식 근거의 신뢰감과 사람을 안심시키는 온도를 함께 담는 KARXY 디자인 시스템입니다.
            장식은 즐겁게, 판단은 명료하게, 중요한 행동은 한 번에 찾게 만듭니다.
          </p>
          <div className={styles.heroActions}>
            <a href="#section-1" className={styles.primaryButton}>토큰 살펴보기 <ArrowRight /></a>
            <a href="#section-13" className={styles.secondaryButton}>합성 예시 보기</a>
          </div>
        </div>
        <div className={styles.heroScene} aria-label="KARXY 마스코트와 신뢰 여정 카드">
          <div className={styles.sceneNote}>근거를 찾고<br />다음 행동까지</div>
          <Image
            src="/mascot/karxy-mascot-trio.png"
            alt="KARXY의 근거 확인, 설명, 안내를 상징하는 세 마스코트 캐릭터"
            width={700}
            height={430}
            priority
            className={styles.mascotTrioHero}
          />
          <div className={styles.sceneCard}>
            <span><ShieldCheck /> 공식 출처 확인</span>
            <strong>D-2 체류기간 연장</strong>
            <small>확인일 · 2026.08.03</small>
          </div>
        </div>
      </section>

      <nav className={styles.indexNav} aria-label="디자인 시스템 목차">
        {sections.map((title, index) => (
          <a key={title} href={`#section-${index + 1}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>{title}
          </a>
        ))}
      </nav>

      <div className={styles.content}>
        <SpecSection number={1} title="색 팔레트" intro="크림색 종이 위에 라벤더를 중심으로, 로즈와 클레이를 제한적으로 사용합니다.">
          <div className={styles.paletteGrid}>
            {palette.map((color) => (
              <article key={color.name} className={styles.swatchCard}>
                <div className={`${styles.swatch} ${color.className}`} />
                <div className={styles.swatchMeta}>
                  <strong>{color.name}</strong><CodePill>{color.hex}</CodePill>
                  <span>{color.token}</span><small>{color.role}</small>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.ruleGrid}>
            <div><strong>70%</strong><span>Canvas·Paper<br />차분한 정보 표면</span></div>
            <div><strong>20%</strong><span>Ink·Neutral<br />텍스트와 구조</span></div>
            <div><strong>10%</strong><span>Brand·Semantic<br />행동과 상태</span></div>
          </div>
        </SpecSection>

        <SpecSection number={2} title="타이포그래피" intro="제목은 Jua·Fredoka의 둥근 형태로 친근함을, 본문은 Pretendard로 다국어 가독성을 확보합니다.">
          <div className={styles.typeSpecimen}>
            <div className={styles.typeDisplay}><span>Display · Jua / Fredoka · 64/68</span>한국에서의 다음 장을<br />준비하는 방법</div>
            <div className={styles.typeHeading}><span>Heading · Jua / Fredoka · 36/44</span>공식 근거에서 행동까지</div>
            <div className={styles.typeBody}><span>Body · 16/26 · 500</span>사용자가 복잡한 체류 정보를 이해하고, 필요한 서류와 기한을 놓치지 않도록 문장을 짧게 나눕니다.</div>
            <div className={styles.typeCaption}><span>Label · 12/16 · 700 · +0.08em</span>VERIFIED · 2026.08.03</div>
          </div>
          <p className={styles.inlineRule}><strong>원칙</strong> 한 줄은 한글 기준 38~64자, 본문 최소 15px, 정보 카드에서는 굵기보다 간격으로 위계를 만듭니다.</p>
        </SpecSection>

        <SpecSection number={3} title="간격" intro="4px 기본 단위를 사용하고, 섹션 간격은 내용 간격의 최소 두 배로 둡니다.">
          <div className={styles.spacingScale}>
            {spacing.map(([name, value]) => (
              <div key={name}><CodePill>space-{name}</CodePill><div className={styles.spacingBar} style={{ "--space-width": value } as CSSProperties} /><span>{value}</span></div>
            ))}
          </div>
          <div className={styles.spacingRecipe}>
            <span><b>8px</b> 아이콘 ↔ 라벨</span><span><b>16px</b> 카드 내부 요소</span><span><b>24px</b> 카드 패딩</span><span><b>64~96px</b> 섹션</span>
          </div>
        </SpecSection>

        <SpecSection number={4} title="반경" intro="친근하지만 장난감처럼 보이지 않도록, 정보 밀도가 높을수록 반경을 작게 사용합니다.">
          <div className={styles.radiusGrid}>
            {radii.map(([name, value]) => (
              <div key={name}><div className={styles.radiusSample} style={{ borderRadius: value }}><span>{value}</span></div><CodePill>radius-{name}</CodePill></div>
            ))}
          </div>
          <p className={styles.inlineRule}><strong>권장</strong> 입력 12px · 카드 16px · 주요 마케팅 카드 24px · 배지는 full. 한 화면에 세 종류 이상 섞지 않습니다.</p>
        </SpecSection>

        <SpecSection number={5} title="그림자" intro="기본 그림자는 낮게, 브랜드 순간에는 레퍼런스처럼 어긋난 에코 그림자를 사용합니다.">
          <div className={styles.shadowGrid}>
            {shadows.map((shadow) => (
              <div key={shadow.name} className={`${styles.shadowSample} ${shadow.className}`}>
                <strong>{shadow.name}</strong><CodePill>{shadow.token}</CodePill><span>{shadow.usage}</span>
              </div>
            ))}
          </div>
          <p className={styles.inlineRule}><strong>제한</strong> Echo는 랜딩의 핵심 카드와 캠페인 배너에만 사용하며, 폼·표·관리자 화면에는 사용하지 않습니다.</p>
        </SpecSection>

        <SpecSection number={6} title="보더" intro="보더는 장식이 아니라 클릭 가능성, 그룹 경계, 검증 상태를 알려주는 선입니다.">
          <div className={styles.borderGrid}>
            <div className={styles.borderHairline}><b>Hairline</b><span>1px neutral / 카드 구분</span></div>
            <div className={styles.borderStrong}><b>Strong</b><span>1.5px ink / 주요 컨테이너</span></div>
            <div className={styles.borderDashed}><b>Dashed</b><span>1px indigo / 업로드 영역</span></div>
            <div className={styles.borderActive}><b>Active</b><span>2px indigo / 선택 상태</span></div>
          </div>
          <p className={styles.inlineRule}><strong>금지</strong> 색상만으로 상태를 표현하지 않습니다. 아이콘·라벨·보더 굵기 중 하나를 함께 바꿉니다.</p>
        </SpecSection>

        <SpecSection number={7} title="모션" intro="모션은 이해를 돕는 짧은 피드백에 한정하고, 장식 애니메이션은 언제나 멈출 수 있어야 합니다.">
          <div className={styles.motionGrid}>
            <div><span className={`${styles.motionDot} ${styles.motionFast}`} /><strong>120ms</strong><small>press · toggle</small></div>
            <div><span className={`${styles.motionDot} ${styles.motionBase}`} /><strong>200ms</strong><small>hover · tooltip</small></div>
            <div><span className={`${styles.motionDot} ${styles.motionPanel}`} /><strong>320ms</strong><small>panel · accordion</small></div>
            <div><span className={`${styles.motionDot} ${styles.motionStory}`} /><strong>600ms</strong><small>hero reveal only</small></div>
          </div>
          <div className={styles.motionTokens}><CodePill>ease-snappy · cubic-bezier(.23,1,.32,1)</CodePill><CodePill>ease-fluid · cubic-bezier(.77,0,.175,1)</CodePill></div>
          <p className={styles.inlineRule}><strong>접근성</strong> <CodePill>prefers-reduced-motion</CodePill>에서는 이동·반복을 제거하고 120ms 이하의 opacity 변화만 허용합니다.</p>
        </SpecSection>

        <SpecSection number={8} title="z-index" intro="임의의 큰 숫자를 금지하고, 여섯 단계의 레이어 계약만 사용합니다.">
          <div className={styles.layerStack}>
            {[
              ["Toast", "80", "전역 피드백"], ["Modal", "60", "사용자 결정"], ["Popover", "40", "메뉴·도움말"],
              ["Sticky", "20", "헤더·필터"], ["Raised", "10", "hover 카드"], ["Base", "0", "일반 콘텐츠"],
            ].map(([name, z, role]) => <div key={name}><b>{name}</b><CodePill>z-{z}</CodePill><span>{role}</span></div>)}
          </div>
          <p className={styles.inlineRule}><strong>규칙</strong> 새 레이어가 필요하면 숫자를 추가하기 전에 stacking context 생성 원인을 먼저 제거합니다.</p>
        </SpecSection>

        <SpecSection number={9} title="opacity" intro="투명도는 보조 정보와 오버레이에만 사용하며, 본문 가독성을 낮추는 용도로 쓰지 않습니다.">
          <div className={styles.opacityGrid}>
            {[["100", "핵심 콘텐츠"], ["80", "보조 강조"], ["64", "설명 텍스트"], ["40", "비활성 아이콘"], ["20", "선택 배경"], ["8", "은은한 틴트"]].map(([value, role]) => (
              <div key={value}><span style={{ opacity: Number(value) / 100 }}>{value}%</span><small>{role}</small></div>
            ))}
          </div>
          <p className={styles.inlineRule}><strong>주의</strong> disabled 텍스트도 최소 4.5:1을 유지하고, 비활성 여부는 커서·아이콘·문구로 함께 전달합니다.</p>
        </SpecSection>

        <SpecSection number={10} title="focus" intro="키보드 사용자가 현재 위치를 놓치지 않도록 모든 조작 요소에 동일한 이중 링을 제공합니다.">
          <div className={styles.focusDemo}>
            <label htmlFor="focus-email">이메일로 결과 받기</label>
            <div><Mail /><input id="focus-email" type="email" placeholder="name@example.com" /><button type="button">보내기</button></div>
            <small>Tab 키로 직접 확인 · 2px Indigo + 3px Canvas offset</small>
          </div>
          <div className={styles.focusRules}><span><Check /> <CodePill>:focus-visible</CodePill>만 사용</span><span><Check /> 모달은 첫 의미 요소로 이동</span><span><Check /> 오류 발생 시 요약 → 필드 순서</span></div>
        </SpecSection>

        <SpecSection number={11} title="아이콘" intro="기능 아이콘은 Lucide 1.75px 선으로 통일하고, 발바닥은 브랜드 순간에만 사용합니다.">
          <div className={styles.iconGrid}>
            {[
              [Search, "Search", "검색"], [FileCheck2, "FileCheck2", "서류"], [CalendarClock, "CalendarClock", "기한"],
              [ShieldCheck, "ShieldCheck", "검증"], [Globe2, "Globe2", "언어"], [UserRoundCheck, "UserRoundCheck", "전문가"],
            ].map(([Icon, name, role]) => {
              const IconComponent = Icon as typeof Search;
              return <div key={String(name)}><IconComponent /><b>{String(name)}</b><small>{String(role)}</small></div>;
            })}
            <div className={styles.brandIcon}><KaxiPawMark /><b>Paw mark</b><small>브랜드 서명</small></div>
          </div>
          <p className={styles.inlineRule}><strong>크기</strong> 16px 인라인 · 20px 버튼 · 24px 카드 · 32px 빈 상태. 아이콘 단독 버튼에는 반드시 접근성 이름을 제공합니다.</p>
        </SpecSection>

        <SpecSection number={12} title="컴포넌트" intro="토큰이 실제 인터페이스에서 어떻게 결합되는지 기본 상태와 함께 정의합니다.">
          <div className={styles.componentBoard}>
            <article>
              <h3>Buttons</h3>
              <div className={styles.buttonRow}><button className={styles.demoPrimary}>계속하기 <ArrowRight /></button><button className={styles.demoSecondary}>저장</button><button className={styles.demoGhost}>나중에</button><button disabled>비활성</button></div>
            </article>
            <article>
              <h3>Field & status</h3>
              <label className={styles.demoField}><span>체류자격</span><div><input defaultValue="D-2 유학" readOnly /><ChevronDown /></div><small><ShieldCheck /> 공식 분류 기준으로 선택합니다.</small></label>
              <div className={styles.badgeRow}><span className={styles.badgeVerified}>검증됨</span><span className={styles.badgePending}>확인 필요</span><span className={styles.badgeRisk}>기한 임박</span><span className={styles.badgeNeutral}>초안</span></div>
            </article>
            <article>
              <h3>Evidence card</h3>
              <div className={styles.evidenceCard}><div><BookOpenCheck /><span>공식 근거</span></div><strong>체류기간 연장은 만료일 전에 신청해야 합니다.</strong><p>개인 상황과 관할에 따라 추가 서류가 요청될 수 있습니다.</p><a href="#section-12">출처 2건 보기 <ArrowRight /></a></div>
            </article>
            <article>
              <h3>Feedback & disclosure</h3>
              <div className={styles.infoAlert}><Info /><div><b>저장되었습니다</b><span>다음 접속에서도 체크리스트를 이어볼 수 있어요.</span></div></div>
              <details className={styles.disclosure}><summary>왜 이 서류가 필요한가요?<ChevronDown /></summary><p>신청 유형과 현재 체류자격을 교차 확인하기 위한 서류입니다.</p></details>
            </article>
          </div>
        </SpecSection>

        <SpecSection number={13} title="합성 예시" intro="레퍼런스의 긴 호흡과 어긋난 카드 구조를 KARXY의 체류 준비 여정으로 재구성했습니다.">
          <div className={styles.composite}>
            <div className={styles.compositeHero}>
              <div>
                <span className={styles.compositeEyebrow}><Sparkles /> 오늘 할 일을 선명하게</span>
                <h3>한국 생활의 다음 단계,<br />근거와 함께 준비해요.</h3>
                <p>체류자격·서류·기한을 한 번에 확인하고 필요한 경우에만 검증된 전문가와 연결합니다.</p>
                <button className={styles.demoPrimary}>3분 진단 시작 <ArrowRight /></button>
              </div>
              <Image
                src="/mascot/karxy-mascot-trio.png"
                alt="KARXY 마스코트 세 캐릭터가 함께 다음 단계를 안내하는 모습"
                width={700}
                height={430}
                className={styles.mascotTrioComposite}
              />
            </div>
            <div className={styles.journeyCard}>
              <div className={styles.journeyHeader}><div><small>MY JOURNEY</small><h4>D-2 체류기간 연장</h4></div><span className={styles.badgeVerified}>근거 확인</span></div>
              <div className={styles.progressTrack}><span /><span /><span /><i /></div>
              <div className={styles.journeySteps}>
                <div><span>01</span><b>조건 확인</b><small>완료</small></div><div><span>02</span><b>서류 준비</b><small>4/6</small></div><div><span>03</span><b>전문가 검토</b><small>선택</small></div><div><span>04</span><b>신청·추적</b><small>대기</small></div>
              </div>
            </div>
            <div className={styles.compositeBottom}>
              <div><CircleHelp /><strong>정확히 모르겠다면?</strong><span>추정하지 않고 확인 기관과 다음 질문을 안내합니다.</span></div>
              <button className={styles.demoSecondary}>AI에게 물어보기</button>
            </div>
          </div>
        </SpecSection>

        <SpecSection number={14} title="Known Gaps" intro="아직 표준화되지 않은 영역을 숨기지 않고, 다음 버전의 작업 계약으로 관리합니다.">
          <div className={styles.gapsTable} role="table" aria-label="디자인 시스템 미해결 과제">
            <div role="row" className={styles.gapsHead}><span role="columnheader">영역</span><span role="columnheader">현재 한계</span><span role="columnheader">다음 조치</span><span role="columnheader">상태</span></div>
            {[
              ["다국어", "베트남어·몽골어 장문에서 제목 줄바꿈 검증 부족", "4개 언어 시각 회귀 기준선 구축", "P0"],
              ["다크 모드", "마케팅용 Echo 그림자와 Clay 대비 미확정", "토큰별 WCAG 대비·스크린샷 감사", "P0"],
              ["마스코트", "일부 상태가 픽셀 PNG이며 고해상도 자산 부족", "상태별 마스터·사용 범위 문서화", "P1"],
              ["모션", "저사양 Android에서 복합 애니메이션 성능 데이터 부족", "기기 매트릭스와 motion budget 적용", "P1"],
              ["차트", "색각 다양성을 고려한 패턴·라벨 규칙 미완성", "패턴 세트와 데이터 라벨 계약 추가", "P1"],
              ["완료·검증 색", "Mint를 쓰지만 제품에 대응 토큰이 없다", "semantic success 토큰을 globals.css에 정의", "P1"],
              ["z-index", "계약은 0/10/20/40/60/80인데 코드는 z-50을 22곳, z-[100]을 1곳 쓴다", "실제 레이어로 계약을 다시 쓰고 lint로 고정", "P1"],
              ["반경·그림자", "문서는 lg=16px·shadow-1~3인데 제품은 lg=12px·2xs~2xl", "명명을 한쪽으로 통일", "P2"],
            ].map(([area, gap, action, status]) => (
              <div role="row" key={area}><b role="cell">{area}</b><span role="cell">{gap}</span><span role="cell">{action}</span><em role="cell" data-priority={status}>{status}</em></div>
            ))}
          </div>
          <div className={styles.gapCallout}><AlertTriangle /><div><strong>출시 게이트</strong><span>P0가 남아 있는 표면은 신규 배포 전에 접근성·다국어 회귀 검토를 통과해야 합니다.</span></div></div>
        </SpecSection>
      </div>

      <footer className={styles.footer}>
        <div>
          <Image
            src="/brand/karxy-bubble-wordmark.png"
            alt="KARXY"
            width={1661}
            height={482}
            className={styles.footerWordmark}
          />
          <span>Design System · Foundation 1.0</span>
        </div>
        <p>명확한 근거, 다정한 안내, 책임 있는 연결.</p>
        <Link href={`/${locale}`}>KARXY 홈으로 <ArrowRight /></Link>
      </footer>
    </main>
  );
}
