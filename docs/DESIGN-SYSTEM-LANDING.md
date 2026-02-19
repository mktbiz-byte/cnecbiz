# CNEC Design System — Landing Page (기업 메인페이지)

> **적용 대상**: cnecbiz.com 비로그인 영역 (랜딩, 포트폴리오, 요금제, 수출바우처, FAQ)
> **톤**: Premium Dark — 뷰티 브랜드의 세련됨 + 글로벌 크리에이터 플랫폼의 신뢰감

---

## 1. 디자인 방향

**"Dark Premium"** — 다크 배경 위에 최소한의 포인트 컬러

현재 메인페이지는 다크 테마를 사용 중이며, 이 방향을 유지하되 색상 사용을 정리합니다.
관리자 페이지(라이트 테마)와 명확히 구분되는 별도의 체계입니다.

---

## 2. 컬러

### 2-1. 배경 계층

| 역할 | HEX | 용도 |
|------|-----|------|
| **Base** | `#0A0A0F` | 페이지 전체 배경 |
| **Surface 1** | `#121218` | 카드, 섹션 배경 |
| **Surface 2** | `#1A1A24` | 호버 카드, 입력 필드 |
| **Surface 3** | `#24243A` | 활성 요소, 선택 상태 |

### 2-2. 텍스트

| 역할 | HEX | 용도 |
|------|-----|------|
| **Text Primary** | `#FFFFFF` | 제목, 핵심 정보 |
| **Text Secondary** | `#A0A0B0` | 본문, 설명 |
| **Text Tertiary** | `#5A5A6E` | 캡션, 비활성 |

### 2-3. 포인트 컬러

| 역할 | HEX | 용도 |
|------|-----|------|
| **Accent** | `#C084FC` | 강조 텍스트 ("역시 크넥"의 보라), CTA hover |
| **Accent Glow** | `rgba(192, 132, 252, 0.15)` | 글로우 효과, 배경 블러 |
| **Border** | `rgba(255, 255, 255, 0.08)` | 카드 테두리, 구분선 |
| **Border Hover** | `rgba(255, 255, 255, 0.15)` | 호버 시 테두리 |

### 2-4. 🚫 금지

- 핑크(#FF69B4 등) 텍스트 강조 → Accent(`#C084FC`) 하나로 통일
- 흰색 외의 CTA 버튼 텍스트 색상
- 3가지 이상 유채색 동시 사용
- 그라데이션 텍스트 (가독성 저하)

---

## 3. 타이포그래피

### 3-1. 폰트

| 용도 | 폰트 |
|------|------|
| **한국어 제목** | Pretendard (Bold 700) |
| **영문 제목** | Outfit (Bold 700) |
| **본문** | Pretendard (Regular 400) |
| **영문 레이블** | Outfit (Medium 500, uppercase, letter-spacing: 0.15em) |

### 3-2. 스케일

| 레벨 | Size | Weight | 용도 |
|------|------|--------|------|
| **Hero Title** | 48px | 700 | 히어로 메인 카피 |
| **Section Label** | 13px | 500 | 섹션 상단 레이블 (GLOBAL CREATOR NETWORK 등) |
| **Section Title** | 40px | 700 | 섹션 제목 (PORTFOLIO Series.) |
| **Card Title** | 24px | 600 | 카드 내 제목 (CNEC Korea) |
| **Body** | 15px | 400 | 설명 텍스트 |
| **Caption** | 13px | 400 | 부가 정보 |
| **Nav Link** | 14px | 500 | 네비게이션 메뉴 |

> 영문 섹션 레이블은 항상 `text-transform: uppercase; letter-spacing: 0.15em; color: #C084FC`

---

## 4. 컴포넌트

### 4-1. 네비게이션

```
배경: rgba(10, 10, 15, 0.85)
backdrop-filter: blur(20px)
border-bottom: 1px solid rgba(255,255,255,0.05)
position: fixed, top: 0

로고: Outfit 700, 20px, #FFFFFF
메뉴: Pretendard 500, 14px, #A0A0B0
메뉴 hover: #FFFFFF
CTA 버튼 (대시보드): border: 1px solid rgba(255,255,255,0.2), radius: 999px, padding: 8px 20px
```

### 4-2. 히어로 섹션

```
텍스트 정렬: center
메인 카피: 48px Bold, #FFFFFF
강조 단어: #C084FC (한 단어만, 예: "크넥")
서브 카피: 15px Regular, #A0A0B0
CTA 버튼:
  Primary: bg transparent, border 1px solid rgba(255,255,255,0.2), color #FFFFFF, radius 999px
  Secondary: bg transparent, border 1px solid rgba(255,255,255,0.1), color #A0A0B0, radius 999px
  hover: border-color rgba(255,255,255,0.4)
```

### 4-3. 포트폴리오 카드 (국가별)

```
카드: bg #121218, border 1px solid rgba(255,255,255,0.06), radius 20px
패딩: 32px
국기 + 국가명: 14px, #A0A0B0
제목 (CNEC Korea): Outfit 24px 600, #FFFFFF
설명: 15px 400, #A0A0B0
하단 CTA (WATCH ALL WORKS): Outfit 13px 500 uppercase, #FFFFFF

영상 썸네일 그리드:
  radius: 12px
  aspect-ratio: 9/16
  object-fit: cover
  hover: scale(1.02), brightness(1.1)

국가 탭:
  활성: bg rgba(255,255,255,0.1), color #FFFFFF, border 1px solid rgba(255,255,255,0.15)
  비활성: bg transparent, color #5A5A6E
  radius: 999px
```

### 4-4. 요금제 카드

```
기본 카드: bg #121218, border 1px solid rgba(255,255,255,0.06), radius 20px
추천 카드: border 1px solid #C084FC, box-shadow: 0 0 30px rgba(192,132,252,0.1)
추천 뱃지: bg #C084FC, color #0A0A0F, radius 999px, 12px 600

가격: Outfit 32px 700, #FFFFFF
단위: 14px 400, #5A5A6E
특징 리스트: 14px 400, #A0A0B0, 각 항목 앞에 ✓ #C084FC
CTA: 전체 너비, radius 12px
```

### 4-5. 수출바우처 섹션

```
배경: #121218 (Surface 1) 또는 미세 그라데이션
강조 숫자 (50%, 60%, 70%): Outfit 48px 700, #C084FC
설명: 15px 400, #A0A0B0
KOTRA 뱃지: border 1px solid rgba(192,132,252,0.3), bg rgba(192,132,252,0.05)
```

### 4-6. 플로팅 버튼 (진행중인 캠페인 문의)

```
position: fixed, bottom: 24px, right: 24px
bg: #C084FC
color: #0A0A0F
font: 14px 600
radius: 999px
padding: 12px 24px
box-shadow: 0 4px 20px rgba(192,132,252,0.3)
hover: brightness(1.1), translateY(-2px)
```

---

## 5. 간격

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--landing-section-gap` | 120px | 섹션 간 간격 |
| `--landing-content-max` | 1280px | 콘텐츠 최대 너비 |
| `--landing-side-padding` | 5% | 좌우 패딩 (min: 24px) |

---

## 6. 모션

| 요소 | 효과 |
|------|------|
| **스크롤 진입** | opacity 0→1, translateY 30px→0, duration 600ms, ease-out |
| **카드 호버** | translateY(-4px), box-shadow 강화, duration 300ms |
| **CTA 호버** | border 밝아짐, duration 200ms |
| **섹션 레이블** | 좌측에서 슬라이드, duration 400ms |
| **포트폴리오 썸네일** | scale(1.02), duration 300ms |

---

## 7. 관리자 페이지와의 관계

| 항목 | 랜딩 (이 문서) | 관리자 (DESIGN-SYSTEM-ADMIN.md) |
|------|---------------|-------------------------------|
| **테마** | Dark (#0A0A0F) | Light (#F8F9FA) |
| **Accent** | #C084FC (보라) | #6C5CE7 (바이올렛) |
| **전환점** | 로그인/대시보드 클릭 시 | 로그인 후 모든 페이지 |
| **폰트** | 동일 (Pretendard + Outfit) | 동일 |
| **공유 요소** | 로고, 폰트, 간격 체계 | 로고, 폰트, 간격 체계 |

---

## CSS Variables

```css
:root {
  /* Landing - Dark Theme */
  --landing-base: #0A0A0F;
  --landing-surface-1: #121218;
  --landing-surface-2: #1A1A24;
  --landing-surface-3: #24243A;

  --landing-text-primary: #FFFFFF;
  --landing-text-secondary: #A0A0B0;
  --landing-text-tertiary: #5A5A6E;

  --landing-accent: #C084FC;
  --landing-accent-glow: rgba(192, 132, 252, 0.15);

  --landing-border: rgba(255, 255, 255, 0.08);
  --landing-border-hover: rgba(255, 255, 255, 0.15);

  --landing-section-gap: 120px;
  --landing-content-max: 1280px;
  --landing-side-padding: 5%;
}
```

---

*CNEC Design System — Landing Page v1.0*
*Last updated: 2026-02-19*
