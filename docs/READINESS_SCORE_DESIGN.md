# KAXI 준비 리스크 지수 (Preparation Risk Index) 상세 설계 문서

**문서 상태**: Draft v1.0  
**작성일**: 2026-07-03  
**관련 이슈**: 사용자 요청 - "외국인이 본인 상황에 맞게 조건 체크 시 실제 한국 비자 관련 직관적 점수/확률 시각화"  
**법적 전제**: "비자 승인 확률 % " 표현은 금지. "준비 리스크 지수" 또는 "경로 준비 적합도" 로만 프레임.

## 1. 목적 및 배경

### 목적
- 사용자가 진단 입력(국적, 학력, 한국어 수준, 목표, 예산, 브로커 이용 여부, 비자 이력 등)을 통해 **자신의 준비 상태를 직관적으로 파악**할 수 있게 함.
- 기존 `riskLevel` (low/medium/high) 과 `compliance` 결과를 더 구체적이고 시각적인 형태로 제공.
- 사용자 경험을 높이면서 프로젝트의 핵심 법적 경계를 철저히 지킴.

### 배경
- 현재 `recommendPath`는 이미 `riskScore`, `riskLevel`, `confidence`, `compliance`를 계산함.
- Diagnosis 결과 화면에서는 이 정보가 잘 드러나지 않음 (주로 warnings + next actions 중심).
- 사용자들은 "내 상황이면 얼마나 괜찮을까?"에 대한 **숫자 + 시각 피드백**을 원함.
- 그러나 `docs/legal/role-boundary.md`에 따라 **예측/보장/개별 판단** 표현은 금지.

## 2. 명칭 및 사용자 메시징 (Critical)

### 공식 명칭
- **준비 리스크 지수** (Preparation Risk Index)
- 부제: "현재 입력 기준 경로 준비 적합도"

### 표시 예시 (다국어)
- **82점** — 낮은 리스크 (준비가 비교적 탄탄합니다)
- **58점** — 중간 리스크 (일부 보완이 필요합니다)
- **23점** — 높은 리스크 (강력한 전문가 검토를 권장합니다)

### 필수 Disclaimer (항상 표시)
**짧은 버전** (카드 하단):
> 이 지수는 KAXI 규칙 엔진과 공식 출처에 기반한 **참고용 준비 지표**이며, 실제 비자 심사 결과와 다를 수 있습니다. 개인 상황 판단은 출입국사무소 또는 자격 있는 행정사에게 확인하세요.

**긴 버전** (상세 보기 또는 툴팁):
> 본 지수는 2026-07 기준 법무부/출입국관리법 시행령·규칙 및 내부 compliance rule에 따라 산출되었습니다. 실제 심사는 개별 서류·면접·시기·정책 변화에 따라 달라질 수 있으며, KAXI는 어떠한 승인 보장이나 확률 예측도 하지 않습니다.

## 3. 스코어 계산 로직

### 3.1 기본 원칙
- 기존 로직 최대한 재사용 (`riskScore` + `complianceRiskFloor` + `DIAGNOSIS_RULES`)
- **투명성** 최우선: 어떤 요인이 점수에 영향을 줬는지 사용자가 알 수 있어야 함.
- **0~100점** 정규화 (100 = 가장 낮은 리스크)
- compliance engine 결과가 가장 강력한 신호로 작용

### 3.2 입력
```ts
interface ScoreInput {
  input: DiagnosisInput;
  visaRuleEvaluation?: VisaRuleEvaluation | null;
  selectedSchools?: School[];  // 선택적 (나중에 학교 선택 후 재계산)
}
```

### 3.3 계산 단계 (Pseudocode)

```ts
function calculateReadinessScore(inputData: ScoreInput): ReadinessScoreResult {
  let riskScore = 0;
  const factors: Factor[] = [];

  // 1. 기본 프로필 리스크 (기존 DIAGNOSIS_RULES 기반)
  const profile = selectPathProfile(inputData.input);
  // ... 기존 rule 적용 로직 재사용
  for (const rule of DIAGNOSIS_RULES) {
    if (rule.applies(inputData.input, profile)) {
      const delta = rule.riskDelta || 0;
      riskScore += delta;
      if (delta > 0) {
        factors.push({
          id: rule.id,
          label: rule.warning?.(...)?.ko ?? rule.id,
          delta: -delta * 10,   // 점수에서는 음수 (리스크)
          category: 'risk',
          source: 'internal'
        });
      }
    }
  }

  // 2. Compliance 엔진 통합 (가장 강력)
  if (inputData.visaRuleEvaluation) {
    const floor = complianceRiskFloor(inputData.visaRuleEvaluation);
    riskScore += floor;

    if (inputData.visaRuleEvaluation.blocked_reasons.length > 0) {
      factors.push({ id: 'compliance:blocked', delta: -30, category: 'risk', ... });
    }
    if (inputData.visaRuleEvaluation.partner_escalation_reasons.length > 0) {
      factors.push({ ... delta: -20 ... });
    }
    // applied rules도 factors에 추가 (긍정/부정)
  }

  // 3. 학교 선택 후 추가 요인 (Phase 2)
  if (inputData.selectedSchools?.length) {
    const accreditedCount = inputData.selectedSchools.filter(s => s.accreditation === 'accredited').length;
    const cautionCount = ...;
    // accredited = + 긍정 요인, caution = - 리스크 요인
    riskScore -= accreditedCount * 0.5;
    factors.push(...);
  }

  // 4. 예산/기타 추가 보정
  // (기존 budget-gap 등 이미 DIAGNOSIS_RULES에 포함)

  // 5. 정규화 (0~100)
  let score = Math.max(0, Math.min(100, 100 - (riskScore * 12)));  // 튜닝 필요

  // 6. Confidence 보정 (정보 부족 시 점수 신뢰도 하락)
  const confidence = confidenceFor(...);
  if (confidence === 'medium') score = Math.max(20, score - 10);
  if (confidence === 'low') score = Math.max(10, score - 25);

  return {
    score: Math.round(score),
    riskLevel: riskLevel(riskScore),
    factors: factors.sort((a,b) => b.delta - a.delta),  // 영향 큰 순
    confidence,
    appliedRules: [...],
    // ...
  };
}
```

### 3.4 요인 (Factors) 가중치 예시 (초안 - 실제 튜닝 필요)

| 요인 ID                        | 영향 (delta on score) | 조건 예시                              | 카테고리 |
|--------------------------------|-----------------------|----------------------------------------|----------|
| korean_low_for_d2              | -18                   | D-2 + korean=none or topik1            | risk     |
| budget_gap                     | -8 ~ -15              | budget < estimatedCost * 0.7           | risk     |
| has_refusal_history            | -22                   | hasHistory=true                        | risk     |
| compliance_blocked             | -35                   | blocked_reasons 존재                   | risk     |
| compliance_escalation          | -20                   | partnerEscalationReasons 존재          | risk     |
| school_accredited              | +8                    | 선택 학교 중 accredited 비율 높음      | positive |
| school_caution                 | -12                   | caution 학교 선택                      | risk     |
| topik3_for_degree              | +10                   | D-2 + topik3 이상                      | positive |
| minor_age                      | -8                    | age < 18                               | risk     |
| broker_excessive               | -6                    | brokerCost > estimated * 0.3           | risk     |

- 가중치는 `src/lib/data/diagnosis.ts`에 상수로 관리 (`RISK_WEIGHTS`)
- compliance 결과는 별도 override 가중치 적용

### 3.5 출력 타입 제안

```ts
export interface ReadinessFactor {
  id: string;
  label: string;                    // 다국어 지원
  delta: number;                    // 점수 변화량 (+ 긍정, - 리스크)
  category: 'positive' | 'risk';
  source: 'internal' | 'compliance' | 'school';
  description?: string;
}

export interface ReadinessScore {
  score: number;                    // 0~100
  riskLevel: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  factors: ReadinessFactor[];
  sourceRefs: string[];
  disclaimerKey: string;
}
```

`PathRecommendation`에 추가:
```ts
readiness?: ReadinessScore;
```

## 4. 데이터 모델 및 API 변경

### 4.1 파일 변경
- `src/lib/data/diagnosis.ts`
  - `calculateReadinessScore` 함수 추가 (또는 `recommendPath` 내부에서 readiness 계산)
  - `PathRecommendation` 인터페이스 확장
- `src/lib/agent/tools.ts` (diagnose_path)
  - 이미 compliance 호출 중 → readiness 결과도 포함하도록 업데이트
- 새 파일: `src/lib/data/readiness.ts` (로직 분리 추천)

### 4.2 기존 호환성
- `riskLevel` / `confidence`는 하위 호환 유지
- 새로운 `readiness` 필드는 optional

## 5. UI 컴포넌트 명세

### 5.1 ReadinessScoreCard (주요 컴포넌트)

**파일 위치**: `src/components/kbridge/ReadinessScoreCard.tsx`

**Props**:
```ts
interface ReadinessScoreCardProps {
  readiness: ReadinessScore;
  lang: Lang;
  compact?: boolean;           // Diagnosis 결과 vs 상세 모달
  onFactorClick?: (factor: ReadinessFactor) => void;
  showDisclaimer?: boolean;
}
```

**레이아웃 구조** (모바일 우선, shadcn 스타일)

```
┌─────────────────────────────────────────────┐
│  준비 리스크 지수                    [i]    │
│                                             │
│     78                                      │
│   ──────────────  낮은 리스크               │
│   [█████░░░░] 78/100                        │
│                                             │
│  주요 영향 요인                             │
│  • 한국어 수준 TOPIK2          +12  ●      │
│  • 예산 충분                   +8   ●      │
│  • 과거 비자 거절 이력         -22  ⚠      │
│  [요인 더보기 ▼]                            │
│                                             │
│  ⚠ 이 지수는 참고용이며 실제 비자 결과와... │
└─────────────────────────────────────────────┘
```

**상세 상태**:
- **Gauge**: CSS conic-gradient 또는 `Progress` 컴포넌트 커스텀 + 원형 (Recharts 또는 SVG 추천, 의존성 최소화)
- 색상:
  - `score >= 75`: green-500 / bg-green-100
  - `50 <= score < 75`: yellow-500
  - `score < 50`: red-500
- Factors 리스트: `Accordion` 또는 간단 `div` grid
  - 긍정 요인: 녹색 + 아이콘
  - 리스크 요인: 주황/빨강 + 주의 아이콘
- Compact 모드: Diagnosis 결과 카드 안에 작은 버전 (점수 + 색상 바만)

**추가 컴포넌트**:
- `FactorDetailModal` 또는 `ReadinessFactorList`
- `ScoreTooltip` (i 아이콘 클릭 시 disclaimer + 계산 근거)

### 5.2 통합 위치

1. **Diagnosis 결과 화면** (`Diagnosis.tsx`)
   - 추천 경로 카드 바로 아래 또는 상단에 `ReadinessScoreCard` 배치
   - `submit()` 후 `recommendPath` 결과에 `readiness`가 있으면 렌더

2. **Agent 결과** (`Agent.tsx` 또는 `AIAssistant`)
   - `diagnose_path` tool 결과에 readiness 포함 시 표시
   - "이 프로필 기준 준비 리스크 지수" 섹션

3. **추후 확장**
   - 학교 선택 후 재계산 (CostCalculator 또는 Schools 페이지와 연동)
   - Admin 대시보드에서 집계

### 5.3 스타일 가이드
- 기존 Diagnosis 결과와 동일한 Card + spacing 사용
- Lucide 아이콘 (`TrendingUp`, `AlertTriangle`, `CheckCircle`)
- 다국어 완전 지원 (`tr()` 또는 `pickLang`)
- 접근성: aria-label, 색상 외에도 텍스트로 리스크 레벨 표시

## 6. 법적·안전 가드 (반드시 구현)

- `readiness.score < 30` 또는 `blockedReasons` 존재 시:
  - 빨간색 강조 + "전문가 상담을 강력 추천합니다" CTA 버튼 (partner-request 트리거)
- 모든 화면에 disclaimer 필수 포함
- `appliedRules` / `sourceRefs` 는 디버그/관리자용으로 숨김 처리 (사용자에게는 요약만)

## 7. 구현 단계 (제안)

**Phase 1 (MVP)**
- `calculateReadinessScore` 로직 구현 (기존 데이터만 사용)
- `ReadinessScoreCard` 컴포넌트 (기본 gauge + disclaimer)
- Diagnosis 결과 화면에 통합
- 테스트: `test-diagnosis-rules.ts` 확장

**Phase 2**
- 학교 선택 시 재계산 로직
- Agent tool 결과에도 동일 컴포넌트 사용
- 요인 상세 모달

**Phase 3 (선택)**
- 실제 리드 데이터 기반 가중치 튜닝 (익명화된 통계)
- A/B 테스트 (점수 유무에 따른 저장률)

## 8. 테스트 전략

- 단위 테스트: `calculateReadinessScore` (경계값: blocked, high history, perfect profile)
- 통합 테스트: Diagnosis submit + compliance 호출
- E2E: 진단 → 결과 카드 시각 확인
- 골든 케이스: `quality/diagnosis-readiness-golden-cases.json` 추가 고려

## 9. 향후 확장 아이디어

- 사용자 학교 선택 후 실시간 재스코어링
- "비슷한 프로필 사용자들" 익명 통계 (데이터 충분할 때)
- PDF 리포트에 점수 포함

---

**다음 단계**
1. 이 문서 리뷰 및 승인
2. `src/lib/data/diagnosis.ts`에 계산 로직 추가
3. `ReadinessScoreCard` 컴포넌트 구현
4. Diagnosis.tsx 연동

이 설계는 기존 아키텍처(특히 compliance engine)와 잘 맞으며, 법적 리스크를 최소화하면서도 사용자가 원하는 직관적인 피드백을 제공합니다.