# CNEC 디자인 수정 프롬프트

> Claude Code에서 디자인 수정 작업 시 이 프롬프트를 복사하여 사용하세요.

---

## 프롬프트 1: 전체 디자인 시스템 적용

```
docs/DESIGN-SYSTEM-ADMIN.md 와 docs/DESIGN-SYSTEM-LANDING.md 를 먼저 읽어.

이 디자인 시스템을 기반으로 현재 코드의 스타일을 점검하고 수정해줘.

작업 규칙:
1. 디자인 토큰(docs/cnec-design-tokens.json)에 정의된 색상만 사용
2. 새로운 색상 절대 추가 금지
3. Tailwind 클래스 사용 시 디자인 토큰 값과 일치하도록
4. 수정 전후 변경사항을 간단히 요약해줘

적용 대상: [여기에 파일 경로 또는 컴포넌트명 입력]
```

---

## 프롬프트 2: 특정 컴포넌트 디자인 수정

```
docs/DESIGN-SYSTEM-ADMIN.md 를 먼저 읽어.

[컴포넌트 경로] 파일의 디자인을 디자인 시스템에 맞게 수정해줘.

체크 항목:
- 색상이 디자인 토큰과 일치하는지
- border-radius가 가이드(카드 16px, 버튼 12px, 태그 6px)와 맞는지
- 폰트가 맞는지 (한글 Pretendard, 숫자 Outfit)
- 불필요한 유채색이 있는지 (상태 표시 외 유채색 제거)
- 태그에 border가 있으면 제거하고 배경색만 사용

수정 후 변경사항 목록을 알려줘.
```

---

## 프롬프트 3: 관리자 대시보드 통계 카드 수정

```
docs/DESIGN-SYSTEM-ADMIN.md 의 "5-2. 통계 카드" 섹션을 읽어.

대시보드의 통계 카드(진행 예산, 진행 캠페인, 확정 크리에이터, 확인 필요)를 수정해줘:
- 아이콘 배경: 전부 #F0EDFF 단일 색상 (카드별 다른 색상 금지)
- 아이콘 색상: 전부 #6C5CE7 (예외: "확인 필요"가 0건 초과일 때만 #FF6B6B)
- 숫자: font-family Outfit, 28px, bold
- 카드: border-radius 16px, border 1px solid #DFE6E9
```

---

## 프롬프트 4: 캠페인 리스트 디자인 수정

```
docs/DESIGN-SYSTEM-ADMIN.md 의 "5-3. 캠페인 리스트"와 "5-5. 태그/뱃지" 섹션을 읽어.

캠페인 리스트의 디자인을 수정해줘:
- 금액 색상: #6C5CE7 (빨간색/기타 색상 → Primary로 변경)
- 금액 폰트: Outfit Bold
- 태그: border 제거, 배경색만 사용
  - 카테고리(촬영세일, 4주챌린지): bg #F0EDFF, color #6C5CE7
  - 모집중: bg rgba(0,184,148,0.1), color #00B894
  - 작성중: bg rgba(253,203,110,0.15), color #E17055
  - 기타: bg #F0F0F0, color #636E72
- 리스트 아이템 구분: border-bottom 1px solid #F0F0F0
- hover: background #FAFAFA
```

---

## 프롬프트 5: 사이드바 디자인 수정

```
docs/DESIGN-SYSTEM-ADMIN.md 의 "5-1. 사이드바" 섹션을 읽어.

사이드바 네비게이션의 디자인을 수정해줘:
- 활성 메뉴: bg #F0EDFF, color #6C5CE7, font-weight 600, border-left 3px solid #6C5CE7
- 비활성 메뉴: bg transparent, color #636E72, font-weight 400
- hover: bg #F8F9FA, color #1A1A2E
- 섹션 구분 레이블: 10px, uppercase, letter-spacing 0.1em, color #B2BEC3
```

---

## 프롬프트 6: 랜딩 페이지 디자인 수정

```
docs/DESIGN-SYSTEM-LANDING.md 를 먼저 읽어.

[컴포넌트 경로] 파일의 디자인을 랜딩 디자인 시스템에 맞게 수정해줘.

핵심:
- 배경: #0A0A0F (base), #121218 (surface1), #1A1A24 (surface2)
- 강조색: #C084FC 하나만 (핑크, 주황 등 다른 유채색 제거)
- 텍스트: #FFFFFF (제목), #A0A0B0 (본문), #5A5A6E (캡션)
- 테두리: rgba(255,255,255,0.08)
- 영문 섹션 레이블: uppercase, letter-spacing 0.15em, color #C084FC
- CTA 버튼: border 1px solid rgba(255,255,255,0.2), radius 999px
```

---

## 프롬프트 7: 새 컴포넌트 생성 시

```
docs/DESIGN-SYSTEM-ADMIN.md (또는 LANDING.md)를 먼저 읽어.
docs/cnec-design-tokens.json 의 값을 참고해.

[설명]하는 새 컴포넌트를 만들어줘.

반드시 디자인 시스템의 색상/폰트/간격/radius를 사용하고,
디자인 토큰에 없는 새 색상은 절대 추가하지 마.
```

---

## 프롬프트 8: 디자인 감사 (전체 점검)

```
docs/DESIGN-SYSTEM-ADMIN.md 와 docs/DESIGN-SYSTEM-LANDING.md 를 읽어.

src/ 폴더의 컴포넌트들을 점검해서, 디자인 시스템과 맞지 않는 부분을 찾아줘.

특히 이 항목들을 확인:
1. 디자인 토큰에 없는 하드코딩된 색상값
2. 통계 카드 아이콘에 카드별 다른 색상 사용
3. 캠페인 금액이 빨간색으로 표시되는 곳
4. 태그에 border가 있는 곳
5. border-radius가 가이드(16/12/6px)와 다른 곳
6. 한 화면에 유채색이 3개 이상 사용된 곳

수정이 필요한 파일 목록과 각각의 문제를 정리해줘. 수정은 하지 말고 목록만.
```

---

## 프롬프트 9: 다국어 사이트 디자인 동기화

```
docs/DESIGN-SYSTEM-ADMIN.md 를 읽어.
docs/cnec-design-tokens.json 의 siteConfig를 확인해.

[cnec.jp / cnec-us.com / cnec-kr.netlify.app] 사이트의 디자인을
cnecbiz.com 과 동일한 디자인 시스템으로 맞춰줘.

사이트별 차이는 이것만:
- 언어/폰트 (JP: Noto Sans JP, US: Outfit, KR: Pretendard)
- 통화 표시 (JP: ¥, US: $, KR: ₩)
- 로고 옆 서브텍스트

색상, 컴포넌트 스타일, 간격, radius는 전부 동일하게.
```

---

## 사용 팁

1. **항상 MD 파일을 먼저 읽게 하세요** — "docs/DESIGN-SYSTEM-XXX.md 를 먼저 읽어"를 프롬프트 첫 줄에
2. **범위를 좁히세요** — "전체 수정해줘" 대신 "이 컴포넌트만 수정해줘"
3. **감사 먼저, 수정 나중에** — 프롬프트 8로 먼저 점검 → 파일별로 프롬프트 2로 수정
4. **커밋 단위를 작게** — 컴포넌트 1~2개씩 수정하고 커밋
