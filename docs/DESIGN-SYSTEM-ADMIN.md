# CNEC Design System — Admin Dashboard (기업 관리자 페이지)

> **적용 대상**: cnecbiz.com 로그인 후 영역 (대시보드, 캠페인 관리, 결제, 설정)
> **톤**: Clean Light — SaaS 관리툴의 명확함 + 뷰티 플랫폼의 세련됨

---

## 1. 디자인 방향

**"Light & Focused"** — 밝은 배경, 단일 포인트 컬러, 정보 중심

관리자 페이지는 데이터를 다루는 도구입니다.
장식을 최소화하고, 정보 계층을 명확히 하며, 색상은 의미 있을 때만 사용합니다.

---

## 2. 컬러

### 2-1. 브랜드

| 역할 | HEX | 용도 |
|------|-----|------|
| **Primary** | `#6C5CE7` | CTA 버튼, 활성 메뉴, 링크, 금액 표시 |
| **Primary Light** | `#A29BFE` | 호버 상태, 서브 강조 |
| **Primary Surface** | `#F0EDFF` | 선택 카드 배경, 아이콘 배경, 알림 배경 |

> ⚠️ **이 3가지 외의 유채색은 "상태 표시"에만 사용합니다.**

### 2-2. 상태 (Semantic)

| 상태 | HEX | Surface (배경용) | 용도 한정 |
|------|-----|-----------------|---------|
| Success | `#00B894` | `rgba(0,184,148, 0.1)` | 완료, 승인, 확정, 모집중 |
| Warning | `#FDCB6E` | `rgba(253,203,110, 0.1)` | 주의, 대기, 작성중 |
| Error | `#FF6B6B` | `rgba(255,107,107, 0.1)` | 에러, 거절, 마감 |
| Info | `#74B9FF` | `rgba(116,185,255, 0.1)` | 안내, 도움말 |

### 2-3. 중립 (Neutral)

| 역할 | HEX | 용도 |
|------|-----|------|
| **Text Primary** | `#1A1A2E` | 제목, 본문 중요 텍스트 |
| **Text Secondary** | `#636E72` | 설명, 캡션 |
| **Text Tertiary** | `#B2BEC3` | 비활성, 플레이스홀더 |
| **Border** | `#DFE6E9` | 카드 테두리, 구분선 |
| **Background** | `#F8F9FA` | 페이지 배경 (메인 영역) |
| **Surface** | `#FFFFFF` | 카드, 모달, 사이드바 |

### 2-4. 🚫 금지

- 통계 카드 아이콘마다 다른 배경색 (주황/파랑/초록/빨강) → 전부 `#F0EDFF` + `#6C5CE7`
- 캠페인 금액을 빨간색/초록색으로 표시 → 전부 `#6C5CE7`
- 태그에 border 스타일 → 배경색만 사용
- 한 화면에 유채색 3개 이상 동시 사용

---

## 3. 타이포그래피

### 3-1. 폰트

```css
--font-base: 'Pretendard', 'Noto Sans JP', -apple-system, sans-serif;
--font-display: 'Outfit', 'Pretendard', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### 3-2. 스케일

| 레벨 | Size | Weight | Line Height | 용도 |
|------|------|--------|-------------|------|
| **Display** | 32px | 700 | 1.2 | 인사말 ("안녕하세요, OO님") |
| **H1** | 24px | 700 | 1.3 | 페이지 제목 |
| **H2** | 20px | 600 | 1.3 | 섹션 제목 ("최근 캠페인") |
| **H3** | 16px | 600 | 1.4 | 카드 내 제목 |
| **Body** | 14px | 400 | 1.6 | 본문 |
| **Caption** | 12px | 400 | 1.5 | 부가 설명, 메타 |
| **Stat** | 28px | 700 | 1.1 | 숫자 강조 (예산, 인원 수) |

> **숫자**는 항상 `font-family: var(--font-display)` (Outfit) 사용

---

## 4. 레이아웃

### 4-1. 구조

```
┌──────────┬────────────────────────────────┐
│          │                                │
│ Sidebar  │       Main Content             │
│ 240px    │       flex: 1                  │
│ fixed    │       padding: 32px            │
│          │       max-width: none          │
│          │       bg: #F8F9FA              │
│          │                                │
└──────────┴────────────────────────────────┘
```

### 4-2. 간격 (8px 기반)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--space-xs` | 4px | 아이콘-텍스트 |
| `--space-sm` | 8px | 인라인 요소 |
| `--space-md` | 16px | 컴포넌트 내부 |
| `--space-lg` | 24px | 카드 패딩 |
| `--space-xl` | 32px | 섹션 내 간격 |
| `--space-2xl` | 48px | 대섹션 간격 |

---

## 5. 컴포넌트

### 5-1. 사이드바

```css
/* 컨테이너 */
width: 240px;
background: #FFFFFF;
border-right: 1px solid #DFE6E9;
padding: 24px 0;

/* 로고 영역 */
padding: 0 20px;
margin-bottom: 32px;

/* 메뉴 아이템 - 활성 */
background: #F0EDFF;
color: #6C5CE7;
font-weight: 600;
border-left: 3px solid #6C5CE7;
padding: 10px 20px;

/* 메뉴 아이템 - 비활성 */
background: transparent;
color: #636E72;
font-weight: 400;
border-left: 3px solid transparent;

/* 메뉴 아이템 - 호버 */
background: #F8F9FA;
color: #1A1A2E;

/* 섹션 구분 레이블 */
font-size: 10px;
font-weight: 600;
color: #B2BEC3;
text-transform: uppercase;
letter-spacing: 0.1em;
padding: 16px 20px 8px;
```

### 5-2. 통계 카드 (대시보드 상단 4개)

```css
/* 카드 */
background: #FFFFFF;
border: 1px solid #DFE6E9;
border-radius: 16px;
padding: 20px;

/* 그리드 */
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 16px;

/* 아이콘 (전부 동일) */
width: 36px;
height: 36px;
border-radius: 10px;
background: #F0EDFF;
color: #6C5CE7;

/* 예외: "확인 필요" 카드에 건수 > 0일 때 */
background: rgba(255, 107, 107, 0.1);
color: #FF6B6B;

/* 숫자 */
font-family: 'Outfit', sans-serif;
font-size: 28px;
font-weight: 700;
color: #1A1A2E;

/* 단위 */
font-size: 14px;
color: #636E72;

/* 설명 */
font-size: 12px;
color: #B2BEC3;
```

### 5-3. 캠페인 리스트

```css
/* 컨테이너 */
background: #FFFFFF;
border-radius: 16px;
border: 1px solid #DFE6E9;
overflow: hidden;

/* 헤더 */
padding: 20px 24px;
border-bottom: 1px solid #DFE6E9;
display: flex;
justify-content: space-between;

/* 아이템 */
padding: 16px 24px;
border-bottom: 1px solid #F0F0F0;  /* 더 연한 구분선 */
cursor: pointer;

/* 아이템 호버 */
background: #FAFAFA;

/* 금액 */
font-family: 'Outfit', sans-serif;
font-size: 16px;
font-weight: 700;
color: #6C5CE7;  /* ← 빨간색 대신 Primary */

/* 등급 (standard) */
font-size: 11px;
color: #B2BEC3;
```

### 5-4. 버튼

| 타입 | Background | Border | Text | Radius | Height |
|------|-----------|--------|------|--------|--------|
| Primary | `#6C5CE7` | none | `#FFFFFF` | 12px | 40px |
| Secondary | transparent | `#DFE6E9` | `#1A1A2E` | 12px | 40px |
| Ghost | transparent | none | `#6C5CE7` | — | auto |
| Danger | `#FF6B6B` | none | `#FFFFFF` | 12px | 40px |
| Disabled | any | — | — | — | opacity: 0.4 |

```css
/* 호버 공통 */
transform: translateY(-1px);
opacity: 0.85;
transition: all 200ms ease;
```

### 5-5. 태그/뱃지

```css
/* 공통 */
padding: 3px 10px;
border-radius: 6px;
font-size: 11px;
font-weight: 500;
border: none;  /* 테두리 사용 금지 */

/* 타입별 */
.tag-category   { background: #F0EDFF; color: #6C5CE7; }  /* 촬영세일, 4주챌린지 */
.tag-success    { background: rgba(0,184,148,0.1); color: #00B894; }  /* 모집중 */
.tag-warning    { background: rgba(253,203,110,0.15); color: #E17055; }  /* 작성중 */
.tag-error      { background: rgba(255,107,107,0.1); color: #FF6B6B; }  /* 마감 */
.tag-neutral    { background: #F0F0F0; color: #636E72; }  /* 기타 */
```

### 5-6. 검색바

```css
background: #FFFFFF;
border: 1px solid #DFE6E9;
border-radius: 12px;
padding: 10px 16px;
font-size: 13px;

/* 포커스 */
border-color: #6C5CE7;
box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);

/* 에러 */
border-color: #FF6B6B;
```

### 5-7. 카드 공통

```css
background: #FFFFFF;
border: 1px solid #DFE6E9;
border-radius: 16px;
padding: 24px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

/* 호버 (클릭 가능한 카드) */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
transform: translateY(-2px);
transition: all 250ms ease;
```

### 5-8. 플로팅 버튼

```css
position: fixed;
bottom: 24px;
right: 24px;
background: #6C5CE7;  /* ← 랜딩과 다름 (랜딩은 #C084FC) */
color: #FFFFFF;
font-size: 14px;
font-weight: 600;
border-radius: 999px;
padding: 12px 24px;
box-shadow: 0 4px 20px rgba(108, 92, 231, 0.3);
cursor: pointer;

/* 호버 */
transform: translateY(-2px);
box-shadow: 0 6px 24px rgba(108, 92, 231, 0.4);
```

---

## 6. 아이콘

| 속성 | 규칙 |
|------|------|
| 라이브러리 | Lucide Icons (권장) 또는 Phosphor Icons |
| 크기 | 16px (인라인) / 20px (메뉴) / 24px (카드) |
| 색상 | 텍스트와 동일. 별도 컬러링 금지 |
| 스트로크 | 1.5px |

> 아이콘에 컬러 배경 원형은 **통계 카드에서만** 허용

---

## 7. 반응형

| 이름 | 범위 | 변경사항 |
|------|------|---------|
| Desktop | ≥ 1200px | 사이드바 240px + 메인 |
| Tablet | 768–1199px | 사이드바 축소 (아이콘만 60px) |
| Mobile | < 768px | 사이드바 → 하단 탭바, 카드 그리드 1열 |

---

## 8. 랜딩 페이지와의 관계

로그인/대시보드 버튼 클릭 시 Dark → Light로 전환됩니다.

| | 랜딩 (LANDING) | 관리자 (이 문서) |
|--|----------------|-----------------|
| 테마 | Dark `#0A0A0F` | Light `#F8F9FA` |
| Accent | `#C084FC` | `#6C5CE7` |
| 텍스트 | White on Dark | Dark on White |
| 분위기 | 프리미엄, 브랜딩 | 실용적, 데이터 중심 |
| 공유 | 폰트, 로고, 간격 체계 | 폰트, 로고, 간격 체계 |

---

## CSS Variables

```css
:root {
  /* Admin - Light Theme */
  --admin-primary: #6C5CE7;
  --admin-primary-light: #A29BFE;
  --admin-primary-surface: #F0EDFF;

  --admin-success: #00B894;
  --admin-warning: #FDCB6E;
  --admin-error: #FF6B6B;
  --admin-info: #74B9FF;

  --admin-text-primary: #1A1A2E;
  --admin-text-secondary: #636E72;
  --admin-text-tertiary: #B2BEC3;

  --admin-border: #DFE6E9;
  --admin-bg: #F8F9FA;
  --admin-surface: #FFFFFF;

  --admin-radius-sm: 8px;
  --admin-radius-md: 12px;
  --admin-radius-lg: 16px;
  --admin-radius-full: 9999px;

  --admin-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04);
  --admin-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --admin-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
}
```

---

## 9. 즉시 수정 체크리스트

- [ ] 통계 카드 아이콘 배경 → 전부 `#F0EDFF` 단일 색상
- [ ] 캠페인 금액 색상 → `#6C5CE7` (빨강 제거)
- [ ] 태그 → border 제거, 배경색만
- [ ] 사이드바 활성 → `#F0EDFF` + 좌측 3px 보더
- [ ] 검색바 focus → `#6C5CE7` 보더
- [ ] 플로팅 버튼 → `#6C5CE7` 배경
- [ ] 폰트 → Pretendard 통일, 숫자는 Outfit
- [ ] 카드 radius → 16px 통일
- [ ] 카드 간 gap → 16px 통일

---

*CNEC Design System — Admin Dashboard v1.0*
*Last updated: 2026-02-19*
