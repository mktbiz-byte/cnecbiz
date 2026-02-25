# cnecbiz 코드 종합 정보 문서

> 이 문서는 cnecbiz 프로젝트의 전체 코드베이스를 정리한 문서입니다.
> 클로드 프로젝트에 넣어 AI가 코드베이스를 이해하고 작업할 수 있도록 합니다.
> 최종 업데이트: 2026-02-25

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | cnecbiz (크넥 - CNEC) |
| **도메인** | https://cnecbiz.com |
| **운영사** | 주식회사 하우파파 (HOWPAPA Inc.) |
| **설명** | 크리에이터 마케팅 플랫폼의 기업/관리자용 웹 애플리케이션 |
| **주요 기능** | 캠페인 관리, 크리에이터 매칭, 포인트/결제 시스템, 계약서 발송, 뉴스레터, 가이드 생성 |
| **지원 리전** | 한국(Korea), 일본(Japan), 미국(US), 대만(Taiwan) + BIZ(중앙) |

---

## 2. 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19.x | UI 프레임워크 |
| Vite | 6.x | 빌드 도구 (pnpm 패키지매니저) |
| react-router-dom | 7.x | 라우팅 (~132개 라우트) |
| Tailwind CSS | 4.x | 스타일링 (oklch 컬러 시스템) |
| shadcn/ui (Radix UI) | - | UI 컴포넌트 (46개) |
| lucide-react | 0.510.x | 아이콘 |
| recharts | 2.x | 차트 |
| TipTap | 3.x | Rich Text Editor |
| framer-motion | 12.x | 애니메이션 |
| react-hook-form + zod | 7.x / 3.x | 폼 관리 & 유효성 검증 |
| date-fns | 4.x | 날짜 유틸리티 |

### Backend (Serverless)
| 기술 | 용도 |
|------|------|
| Netlify Functions | 서버리스 함수 (~187개) |
| Supabase (PostgreSQL) | 데이터베이스 (5개 리전) |
| Supabase Storage | 파일 스토리지 |
| Supabase Auth | 인증 (PKCE flow) |

### 외부 서비스
| 서비스 | 용도 |
|--------|------|
| Stripe | 해외 카드 결제 |
| Toss Payments | 국내 카드 결제 (주 결제 수단) |
| Popbill | 세금계산서, 현금영수증, 카카오 알림톡, SMS |
| Nodemailer (Gmail) | 이메일 발송 |
| LINE Bot SDK | 라인 메시지 |
| Naver Works API | 네이버 웍스 메시지 (JWT 인증) |
| Twilio | WhatsApp 메시지 |
| Google Gemini AI | AI 가이드 생성, 번역, 크리에이터 분석 (gemini-2.5-flash-lite) |
| OpenAI | AI 기능 보조 |
| Stibee | 뉴스레터 관리 |
| YouTube API | 크리에이터 분석, 영상 업로드 |
| TikTok API | 크리에이터 분석, 컨텐츠 게시 |
| Facebook Graph API | Instagram 릴스 업로드, Meta Ads |

### 주요 NPM 패키지
```
@supabase/supabase-js, stripe, @stripe/react-stripe-js, @tosspayments/tosspayments-sdk,
@google/generative-ai, openai, @line/bot-sdk, popbill, nodemailer, twilio,
jspdf, jspdf-autotable, pdfkit, html2canvas, papaparse, xlsx,
cheerio, axios, marked, puppeteer-core, @sparticuz/chromium,
@ffmpeg/ffmpeg, @distube/ytdl-core, gifenc
```

---

## 3. 프로젝트 구조

```
cnecbiz/
├── src/
│   ├── App.jsx                    # 메인 앱 + 모든 라우팅 정의 (~132 routes)
│   ├── main.jsx                   # 앱 진입점
│   ├── index.css                  # 글로벌 CSS (Tailwind v4 base/components/utilities)
│   ├── App.css                    # 테마 설정 (oklch 컬러, 다크 모드)
│   ├── components/
│   │   ├── ui/                    # shadcn/ui 컴포넌트 (46개)
│   │   ├── admin/                 # /admin/* 관리자 페이지 (91개)
│   │   │   └── openclo/           # OpenClo 서브모듈 (8개)
│   │   ├── company/               # /company/* 기업 대시보드 (71개)
│   │   ├── creator/               # /creator/* 크리에이터 (6개)
│   │   ├── payment/               # 결제 컴포넌트 (3개)
│   │   ├── tax/                   # 세금 컴포넌트 (1개)
│   │   ├── contracts/             # 계약서 컴포넌트 (2개)
│   │   ├── common/                # 공통 컴포넌트 (3개)
│   │   └── [루트]                 # 공개 페이지 컴포넌트 (25개)
│   ├── pages/                     # 독립 페이지 (11개)
│   ├── lib/                       # 유틸리티 & 서비스 (15개)
│   ├── services/                  # 비즈니스 로직 서비스
│   │   ├── aiRecommendation.js    # AI 크리에이터 추천
│   │   ├── creatorGradeService.js # 크리에이터 등급 시스템
│   │   ├── popbillService.js      # Popbill API 통합
│   │   └── notifications/         # 알림 통합 서비스
│   │       ├── index.js           # 통합 export
│   │       ├── companyNotifications.js   # 기업 알림 (9개 함수)
│   │       ├── creatorNotifications.js   # 크리에이터 알림 (13개 함수)
│   │       └── lineNotifications.js      # LINE 알림
│   ├── data/                      # 정적 데이터
│   │   ├── campaignGuideTemplates.js  # 캠페인 가이드 템플릿 (국가별 뷰티 카테고리)
│   │   └── guideStyles.js         # AI 가이드 스타일 정의 (10가지)
│   ├── templates/                 # 계약서/동의서 HTML 템플릿
│   ├── contexts/                  # React Context (EditModeContext)
│   ├── hooks/                     # 커스텀 훅 (use-mobile.js)
│   ├── types/                     # TypeScript 타입 정의
│   │   └── database.types.ts      # Supabase 테이블 타입 (전체 스키마)
│   └── utils/                     # 유틸리티 (pdfGenerator)
├── netlify/
│   └── functions/                 # Netlify 서버리스 함수 (~187개)
│       └── lib/                   # 함수 공유 유틸리티
│           └── scheduler-dedup.js # 스케줄러 중복 실행 방지
├── netlify/edge-functions/
│   └── ip-restrict-openclo.js     # OpenClo IP 제한
├── database/                      # SQL 마이그레이션 파일 (40+개)
├── docs/                          # 디자인 시스템 & 문서
│   ├── DESIGN-SYSTEM-LANDING.md   # 랜딩 페이지 디자인 (다크 테마)
│   ├── DESIGN-SYSTEM-ADMIN.md     # 관리자 디자인 (라이트 테마)
│   └── cnec-design-tokens.json    # 코드용 디자인 토큰
├── public/                        # 정적 파일
├── netlify.toml                   # Netlify 빌드/함수/스케줄 설정
├── vite.config.js                 # Vite 빌드 설정 (@ alias → src/)
├── package.json                   # 의존성 (pnpm)
└── CLAUDE.md                      # AI 어시스턴트 프로젝트 컨텍스트
```

### 코드 통계
| 항목 | 수량 |
|------|------|
| React 컴포넌트 | ~250개 |
| Netlify Functions | ~187개 |
| 라우트 | ~132개 |
| DB 마이그레이션 | 40+개 |
| shadcn/ui 컴포넌트 | 46개 |

---

## 4. 데이터베이스 구조

### 멀티-리전 아키텍처
| Client | 변수명 | 용도 | Import |
|--------|--------|------|--------|
| **BIZ (중앙)** | `supabaseBiz` | 핵심 비즈니스 DB (주 사용) | `import { supabaseBiz } from '@/lib/supabaseClients'` |
| **Korea** | `supabaseKorea` | 한국 크리에이터 | `import { supabaseKorea } from '@/lib/supabaseClients'` |
| **Japan** | `supabaseJapan` | 일본 크리에이터 | `import { supabaseJapan } from '@/lib/supabaseClients'` |
| **US** | `supabaseUS` | 미국 크리에이터 | `import { supabaseUS } from '@/lib/supabaseClients'` |
| **Taiwan** | `supabaseTaiwan` | 대만 크리에이터 | `import { supabaseTaiwan } from '@/lib/supabaseClients'` |

리전 기반 클라이언트 선택: `getSupabaseClient(region)` (supports 'korea'/'kr', 'japan'/'jp', 'us'/'usa', 'taiwan'/'tw', 'biz')

### BIZ DB 테이블 (supabaseBiz)

#### 핵심 테이블
| 테이블 | 용도 | 주요 필드 |
|--------|------|----------|
| `admin_users` | 관리자 계정 | id, email, role (super_admin/brand_admin/admin), name |
| `companies` | 기업 정보 | user_id, company_name, email, phone, status, points_balance, is_approved, business_number, ceo_name, address, bank_account |
| `campaigns` | 캠페인 정보 | title, description, brand, company_id, budget, total_amount, reward_amount, status (draft/pending_approval/approved/active/completed/cancelled), campaign_type (regular/four_week/olive_young/cnec_plus), selected_regions, region |
| `payments` | 결제 내역 | campaign_id, company_id, amount, status (pending/completed/failed/refunded), payment_method (card/bank_transfer/points), stripe_payment_intent_id |
| `contracts` | 계약서 | creator_id, company_id, status (pending/sent/signed/completed), contract_type, signed_at, signature_data |
| `contract_signature_logs` | 서명 로그 | contract_id, action (viewed/signed/declined), ip_address, user_agent |

#### 크리에이터 관련
| 테이블 | 용도 | 주요 필드 |
|--------|------|----------|
| `featured_creators` | 추천 크리에이터 | channel_name, platform, capi_score, cnec_grade_level (1-5), cnec_grade_name (FRESH/GLOW/BLOOM/ICONIC/MUSE), subscriber_count, avg_views, engagement_rate |
| `featured_creator_applications` | 크리에이터 신청 | user_id, channel_url, platform, status (pending/approved/rejected), subscriber_count |
| `creator_withdrawal_requests` | 출금 요청 | creator_id, amount, status (pending/approved/rejected/completed), bank_name, account_number |
| `creator_points` | 크리에이터 포인트 | creator_id, points, total_earned, total_withdrawn |
| `creator_grades` | 등급 이력 | creator_id, grade_level, grade_name, total_score |
| `cnec_plus_pricing` | CNEC Plus 가격 | creator_id, price_per_video, is_active |

#### 포인트/결제
| 테이블 | 용도 | 주요 필드 |
|--------|------|----------|
| `points_charge_requests` | 충전 요청 | company_id, amount, status (pending/completed/cancelled/credit), payment_method, depositor_name |
| `points_transactions` | 포인트 내역 | company_id, amount, type (charge/use/refund/credit/adjustment), balance_after |
| `tax_invoice_requests` | 세금계산서 | company_id, amount, status (pending/issued/cancelled), business_number, popbill_issue_id |
| `receivables` | 미수금 | company_id, campaign_id, amount, status (pending/paid/cancelled), due_date |
| `financial_records` | 재무 기록 | type (revenue/expense/credit), amount, category |
| `bank_transactions` | 은행 거래 | amount, depositor_name, deposit_date, matched, matched_request_id |

#### 캠페인/콘텐츠
| 테이블 | 용도 |
|--------|------|
| `campaign_creator_matches` | AI 캠페인-크리에이터 매칭 (match_score) |
| `campaign_invitations` | 캠페인 초대 (status: sent/viewed/accepted/declined) |
| `campaign_recommendations` | AI 추천 |
| `campaign_reference_videos` | 참고 영상 |
| `video_submissions` | 영상 제출 (status: pending/approved/rejected/revision_requested) |
| `video_review_comments` | 영상 리뷰 댓글 (timestamp_seconds 포함) |
| `video_review_comment_replies` | 댓글 답글 |

#### 채널/모니터링
| 테이블 | 용도 |
|--------|------|
| `affiliated_creators` | 소속 크리에이터 (YouTube API 연동) |
| `our_channels` | 자사 YouTube 채널 |
| `channel_statistics` | 채널 통계 이력 |
| `channel_videos` | 채널 영상 데이터 |
| `creator_update_alerts` | 업데이트 없음 알림 |

#### 시스템/기타
| 테이블 | 용도 |
|--------|------|
| `email_templates` | 이메일 템플릿 (template_type: 'company', HTML: body 컬럼) |
| `guidebook_sections` | 가이드북 콘텐츠 |
| `consultation_requests` | B2B 상담 요청 |
| `sms_verifications` | SMS 인증 코드 |
| `notifications` | 인앱 알림 |
| `notification_logs` | 알림 발송 로그 |
| `system_settings` | 시스템 설정 |
| `public_reports` | 공개 리포트 |
| `public_report_videos` | 공개 리포트 영상 |
| `creator_report_history` | 성장 리포트 발송 이력 |
| `tax_office_feedback` | 세무사 피드백 |
| `verification_logs` | 사업자 인증 로그 |
| `fixed_costs` | 고정비용 |

### 리전 DB 테이블 (Korea, Japan, US, Taiwan 공통)
| 테이블 | 용도 | 주요 필드 |
|--------|------|----------|
| `user_profiles` | 크리에이터 프로필 | name, email, instagram_url, youtube_url, tiktok_url, subscriber_count, avg_views, region, bank_name, account_number |
| `campaigns` | 캠페인 (리전 복사본) | title, status, start_date, end_date |
| `applications` | 캠페인 신청 | campaign_id, user_id, status, virtual_selected, final_selected, guide_delivered, video_submitted, reward_paid |
| `campaign_participants` | 참가자 | campaign_id, user_id, week_number (4주 챌린지) |
| `withdrawal_requests` | 출금 요청 | user_id, amount, status |
| `point_transactions` | 포인트 내역 | user_id, amount, type (earn/withdraw/bonus) |
| `reference_videos` | 참고 영상 | title, video_url, category |
| `faqs` | FAQ | question, answer, category |
| `page_contents` | CMS 콘텐츠 | page_key, section_key, content |
| `site_settings` | 사이트 설정 | site_name, logo_url, social_links |
| `seo_settings` | SEO 설정 | meta_title, meta_description, og_image |
| `email_settings` | 이메일 설정 | smtp_host, from_email |
| `teams` | 팀/에이전시 | name, owner_id |
| `team_members` | 팀 멤버 | team_id, user_id, role (owner/admin/member) |

### Storage 버킷
| 버킷 | 용도 |
|------|------|
| `creator-profiles` | 프로필 이미지 (profiles/{filename}) |
| `campaign-images` | 캠페인 썸네일 |
| `campaign-videos` | 캠페인 영상 |
| `videos` | 일반 영상 |

---

## 5. 라우팅 전체 맵 (App.jsx)

### 공개 페이지 (19개)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | LandingPage | 메인 랜딩 페이지 |
| `/login` | LoginPageNew | 로그인 |
| `/signup` | SignupWithVerification | SMS 인증 회원가입 |
| `/find-email` | FindEmailPage | 이메일 찾기 |
| `/find-password` | FindPasswordPage | 비밀번호 찾기 |
| `/reset-password` | ResetPasswordPage | 비밀번호 재설정 |
| `/auth/callback` | AuthCallback | OAuth 콜백 |
| `/guidebook` | Guidebook | 가이드북 |
| `/newsletters` | NewsletterShowcase | 뉴스레터 목록 |
| `/newsletter/:id` | NewsletterDetail | 뉴스레터 상세 |
| `/sign-contract/:contractId` | SignContract | 계약서 서명 (비로그인) |
| `/report/:reportCode` | PublicReport | 공개 리포트 |
| `/invitation/:id` | InvitationLanding | 초대 랜딩 |
| `/featured-creators` | FeaturedCreatorsPage | 추천 크리에이터 |
| `/featured-creators/:id` | FeaturedCreatorProfile | 추천 크리에이터 상세 |
| `/campaigns/intro/regular` | RegularCampaignIntro | 일반 캠페인 소개 |
| `/campaigns/intro/oliveyoung` | OliveYoungCampaignIntro | 올리브영 캠페인 소개 |
| `/campaigns/intro/4week` | FourWeekChallengeCampaignIntro | 4주 챌린지 소개 |
| `/us-shipping-info` | USShippingInfoForm | US 배송정보 폼 |

### 기업 대시보드 (/company/*) - 43개
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/company/dashboard` | CompanyDashboard | 기업 대시보드 |
| `/company/campaigns` | MyCampaigns | 내 캠페인 목록 |
| `/company/campaigns/:id` | CampaignDetail | 캠페인 상세 |
| `/company/campaigns/:id/edit` | CreateCampaignRouter | 캠페인 수정 |
| `/company/campaigns/new` | CreateCampaignRouter | 캠페인 생성 |
| `/company/campaigns/create/:region` | CreateCampaignRouter | 리전별 생성 |
| `/company/campaigns/wizard` | CampaignWizard | 캠페인 위저드 |
| `/company/campaigns/guide` | CampaignGuideEditor | 가이드 에디터 |
| `/company/campaigns/confirmation` | CampaignConfirmation | 캠페인 확인 |
| `/company/campaigns/guide/japan` | CampaignGuideJapan | 일본 가이드 |
| `/company/campaigns/guide/us` | CampaignGuideUS | US 가이드 |
| `/company/campaigns/guide/oliveyoung` | CampaignGuideOliveYoung | 올영 가이드 |
| `/company/campaigns/guide/oliveyoung/japan` | CampaignGuideOliveYoungJapan | 올영 일본 가이드 |
| `/company/campaigns/guide/oliveyoung/final` | OliveYoungFinalGuide | 올영 최종 가이드 |
| `/company/campaigns/guide/4week` | CampaignGuide4WeekChallenge | 4주 챌린지 가이드 |
| `/company/campaigns/guide/4week/japan` | CampaignGuide4WeekChallengeJapan | 4주 일본 가이드 |
| `/company/campaigns/guide/4week/us` | CampaignGuide4WeekChallengeUS | 4주 US 가이드 |
| `/company/campaigns/guide/4week/final` | FourWeekChallengeFinalGuide | 4주 최종 가이드 |
| `/company/campaigns/:id/guide` | CampaignGuide | 캠페인 가이드 |
| `/company/campaigns/:id/guide/oliveyoung/preview` | OliveYoungGuideViewer | 올영 가이드 미리보기 |
| `/company/campaigns/:id/guide/oliveyoung/review` | OliveYoungGuideViewer | 올영 가이드 리뷰 |
| `/company/campaigns/:id/guide/4week/review` | FourWeekChallengeGuideViewer | 4주 가이드 리뷰 |
| `/company/campaigns/:id/review` | CampaignGuideReview | 가이드 리뷰 |
| `/company/campaigns/:id/order-confirmation` | OrderConfirmation | 주문 확인 |
| `/company/campaigns/:id/invoice` | InvoicePage | 인보이스 |
| `/company/campaigns/:id/invoice/oliveyoung` | OliveYoungInvoice | 올영 인보이스 |
| `/company/campaigns/:id/invoice/4week` | FourWeekChallengeInvoice | 4주 인보이스 |
| `/company/campaigns/scene-guide` | CompanySceneGuideEditor | 장면 가이드 에디터 |
| `/company/campaigns/guide/japan/advanced` | AdvancedGuideJapan | 일본 고급 가이드 |
| `/company/campaigns/payment` | PaymentMethodSelection | 결제 수단 선택 |
| `/company/contracts` | ContractManagement | 계약서 관리 |
| `/company/teams` | TeamManagement | 팀 관리 |
| `/company/profile-setup` | CompanyProfileSetup | 프로필 설정 |
| `/company/profile-edit` | CompanyProfileEdit | 프로필 수정 |
| `/company/campaign-guide` | CampaignCreationGuide | 캠페인 생성 가이드 |
| `/company/payments` | PaymentHistory | 결제 내역 |
| `/company/translator` | Translator | 번역 도구 |
| `/company/creators/:id/profile` | CreatorProfilePage | 크리에이터 프로필 |
| `/company/video-feedback` | CampaignVideoFeedback | 영상 피드백 |
| `/video-review/:submissionId` | VideoReview | 영상 리뷰 |
| `/payment/success` | PaymentSuccess | 결제 성공 |
| `/payment/fail` | PaymentFail | 결제 실패 |

### 관리자 (/admin/*) - 60+개
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/admin/login` | AdminLogin | 관리자 로그인 (Google OAuth) |
| `/admin/dashboard` | AdminDashboard | 관리자 대시보드 |
| `/admin/manage-admins` | AdminManagement | 관리자 계정 관리 |
| `/admin/campaigns` | CampaignsManagement | 캠페인 관리 |
| `/admin/campaigns/:id` | AdminCampaignDetail | 캠페인 상세 |
| `/admin/campaigns/:id/edit` | AdminCampaignEdit | 캠페인 수정 |
| `/admin/campaigns/:id/guides` | AdminCampaignGuides | 가이드 관리 |
| `/admin/campaigns/:id/scene-guide` | SceneGuideEditor | 장면 가이드 에디터 |
| `/admin/campaigns/:id/creator-guide` | CreatorSceneGuideEditor | 크리에이터 가이드 에디터 |
| `/admin/campaigns/deadlines` | DeadlineCreatorManagement | 마감일 관리 |
| `/admin/campaigns/unpaid` | UnpaidCampaignsManagement | 미결제 캠페인 |
| `/admin/campaigns/dummy` | DummyCampaignManagement | 더미 캠페인 |
| `/admin/campaign-approvals` | CampaignApprovals | 캠페인 승인 |
| `/admin/campaigns/:id/review` | CampaignReview | 캠페인 리뷰 |
| `/admin/companies` | CompaniesManagement | 기업 관리 |
| `/admin/consultations` | ConsultationManagement | 상담 관리 |
| `/admin/revenue-charts` | RevenueManagementNew | 수익 관리 (**현재 사용**) |
| `/admin/points-charge` | PointsChargeManagement | 포인트 충전 관리 |
| `/admin/withdrawals` | WithdrawalManagement | 출금 관리 |
| `/admin/withdrawal-audit` | WithdrawalAudit | 출금 감사 |
| `/admin/point-history` | CreatorPointHistory | 포인트 내역 |
| `/admin/tax-feedback` | TaxFeedbackManagement | 세무 피드백 |
| `/tax-office/:batchId` | TaxOfficePage | 세무사 페이지 |
| `/admin/creators` | CreatorManagementPage | 크리에이터 관리 |
| `/admin/all-creators` | AllCreatorsPage | 전체 크리에이터 |
| `/admin/featured-creators` | FeaturedCreatorManagementPageNew | 추천 크리에이터 관리 |
| `/admin/creator-approvals` | FeaturedCreatorApprovals | 크리에이터 승인 |
| `/admin/creator-mapping` | CreatorMappingManagement | 크리에이터 매핑 |
| `/admin/campaigns/:campaignId/recommendations` | CampaignCreatorRecommendations | AI 크리에이터 추천 |
| `/admin/contracts` | AdminContractManagement | 계약서 관리 |
| `/admin/videos` | VideoManagement | 영상 관리 |
| `/admin/video-feedback` | VideoFeedback | 영상 피드백 |
| `/admin/newsletters` | NewsletterShowcaseManagement | 뉴스레터 관리 |
| `/admin/newsletter-analytics` | NewsletterTrafficAnalytics | 뉴스레터 분석 |
| `/admin/youtuber-search` | YoutuberSearchPage | 유튜버 검색 |
| `/admin/daily-reports` | DailyReportPage | 일일 리포트 |
| `/admin/channel-report/:creatorId` | CreatorReport | 크리에이터 리포트 |
| `/admin/our-channel-report/:channelId` | OurChannelReport | 자사 채널 리포트 |
| `/admin/site-editor` | SiteEditor | 사이트 에디터 |
| `/admin/site-management` | SiteManagement | 사이트 관리 |
| `/admin/site-management-creator` | SiteManagementCreator | 크리에이터 사이트 관리 |
| `/admin/receivable-detail/:id` | ReceivableDetailReport | 미수금 상세 |
| `/admin/line-chat` | LineChatManagement | LINE 채팅 |
| `/admin/whatsapp-chat` | WhatsAppChatManagement | WhatsApp 채팅 |
| `/admin/line-messages` | LineMessagesManagement | LINE 메시지 |
| `/admin/guidebook` | GuidebookManagement | 가이드북 관리 |
| `/admin/update-history` | GitUpdateHistory | 업데이트 이력 |
| `/admin/guide-pdfs` | GuidePDFManager | 가이드 PDF |
| `/admin/test-kakao` | TestKakaoNotification | 카카오 테스트 |
| `/admin/guide-templates` | CampaignGuideTemplatePrototype | 가이드 템플릿 |
| `/admin/sns-uploads` | SnsAutoUploadPage | SNS 자동 업로드 |
| `/admin/sns-uploads/callback/:platform` | SnsOAuthCallback | SNS OAuth 콜백 |
| `/admin/sns-completed` | SnsUploadManagement | SNS 업로드 완료 |
| `/admin/meta-ads` | MetaAdsManagement | Meta 광고 관리 |
| `/admin/openclo` | OpenCloDashboard | 오픈클로 대시보드 |
| `/admin/openclo/creators` | OpenCloCreatorList | 오픈클로 크리에이터 |
| `/admin/openclo/report` | OpenCloReport | 오픈클로 리포트 |

### 크리에이터 (/creator/*) - 7개
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/creator/mypage` | CreatorMyPage | 마이페이지 |
| `/creator/complete-profile` | ProfileCompletionKorea | 프로필 완성 (한국) |
| `/creator/apply` | CreatorProfileApplication | 프로필 신청 |
| `/creator/withdrawal` | WithdrawalRequest | 출금 신청 |
| `/creator/video-review/:submissionId` | VideoReviewView | 영상 리뷰 |
| `/creator/video-feedback` | CampaignVideoFeedback | 영상 피드백 |
| `/creator/:creatorId` | CreatorDetailProfile | 크리에이터 상세 |

### 인증 방식
- 중앙화된 라우트 가드 없음 → **컴포넌트 레벨 인증 체크**
- 각 보호된 컴포넌트에서 `supabaseBiz.auth.getUser()` 호출 후 리다이렉트
- 관리자는 `admin_users` 테이블 추가 확인
- 전역 컴포넌트: `<ConsultationBanner />`, `<HolidayNotice />`

---

## 6. Netlify Functions 분류 (~187개)

### 인증/회원 (8개)
| 함수 | 메서드 | 설명 |
|------|--------|------|
| `complete-signup.js` | POST | 회원가입 완료 (SMS 인증 → Auth 계정 → companies insert) |
| `find-email.js` | POST | 사업자번호+전화번호로 이메일 찾기 |
| `find-email-by-phone.js` | POST | 핸드폰 번호로 이메일 찾기 |
| `request-password-reset.js` | POST | 비밀번호 재설정 링크 발송 |
| `reset-password.js` | POST | 비밀번호 변경 |
| `admin-reset-password.js` | POST | 관리자 비밀번호 재설정 |
| `creator-admin-reset-password.js` | POST | 크리에이터 비밀번호 재설정 |
| `verify-sms-code.js` | POST | SMS 인증 코드 확인 |

### SMS/알림 (6개)
| 함수 | 설명 |
|------|------|
| `send-sms-verification.js` | 6자리 인증번호 SMS 발송 (Popbill) |
| `send-sms.js` | 일반 SMS 발송 |
| `send-kakao-notification.js` | 카카오 알림톡 발송 (Popbill Kakao API) |
| `send-notifications.js` | 통합 알림 (카카오+이메일+SMS 병렬) |
| `send-notification-helper.js` | 알림 헬퍼 함수 |
| `send-error-alert.js` | 에러 알림 (54220a7e 채널로 자동 발송) |
| `send-signup-kakao.js` | 가입 완료 카카오 알림 |

### 이메일 (10개)
| 함수 | 설명 |
|------|------|
| `send-email.js` | 기본 이메일 (Nodemailer/Gmail) |
| `send-template-email.js` | 템플릿 이메일 (email_templates 테이블) |
| `send-campaign-invitation.js` | 캠페인 초대 |
| `send-creator-invitation.js` | 크리에이터 초대 |
| `send-outreach-email.js` | 아웃리치 이메일 |
| `send-external-guide-email.js` | 외부 가이드 이메일 |
| `send-scene-guide-email.js` | 장면 가이드 이메일 |
| `send-japan-notification.js` | 일본 알림 |
| `send-us-notification.js` | 미국 알림 |
| `send-line-invitation-email.js` | LINE 초대 이메일 |

### 결제/포인트 (18개)
| 함수 | 설명 |
|------|------|
| `confirm-payment.js` | 수동 입금 확인 → 포인트 지급 |
| `confirm-toss-payment.js` | 토스 카드결제 승인 |
| `confirm-charge-complete.js` | 충전 완료 처리 |
| `create-charge-request.js` | 충전 요청 생성 (RLS 우회) |
| `precharge-points.js` | 포인트 선충전 |
| `award-bonus-points.js` | 보너스 포인트 지급 |
| `award-campaign-points.js` | 캠페인 포인트 지급 |
| `reset-company-points.js` | 포인트 초기화 |
| `confirm-campaign-payment.js` | 캠페인 입금 확인 |
| `cancel-charge-request.js` | 충전 취소 |
| `cancel-toss-payment.js` | 토스 결제 취소 |
| `sync-toss-payments.js` | 토스 결제 동기화 |
| `toss-webhook.js` | 토스 웹훅 |
| `get-bank-transactions.js` | 은행 거래 조회 |
| `get-howlab-deposits.js` | Howlab 입금 조회 |
| `popbill-check-deposit.js` | 팝빌 입금 확인 |
| `manual-match-deposit.js` | 수동 입금 매칭 |
| `rematch-unmatched-deposits.js` | 미매칭 재매칭 |

### 계약서 (3개)
| 함수 | 설명 |
|------|------|
| `create-contract.js` | 계약서 생성 (만료일 30일) |
| `sign-contract.js` | 서명 완료 (pending → signed, 로그 기록) |
| `get-final-confirmations.js` | 최종 확인 계약서 조회 |

### 캠페인 관리 (12개)
| 함수 | 설명 |
|------|------|
| `approve-campaign.js` | 캠페인 승인 + Naver Works 알림 |
| `update-campaign-status.js` | 상태 변경 (모든 리전) |
| `submit-campaign-review.js` | 검수 신청 |
| `generate-campaign-guide.js` | AI 가이드 생성 (Gemini, 60초) |
| `generate-4week-challenge-guide.js` | 4주 챌린지 가이드 |
| `generate-japan-guide.js` | 일본 가이드 |
| `generate-oliveyoung-guide.js` | 올영 가이드 |
| `generate-oliveyoung-final-guide.js` | 올영 최종 가이드 |
| `generate-personalized-guide.js` | 개인화 가이드 (AI) |
| `regenerate-personalized-guide.js` | 가이드 재생성 |
| `save-personalized-guide.js` | 가이드 저장 |
| `deliver-4week-guide.js` / `deliver-japan-guide.js` / `deliver-oliveyoung-guide.js` / `deliver-us-guide.js` | 가이드 전달 |

### 세금계산서 (7개)
| 함수 | 설명 |
|------|------|
| `issue-tax-invoice.js` | 세금계산서 발행 (Popbill) |
| `issue-tax-invoice-cancel.js` | 수정세금계산서 (6가지 수정사유코드) |
| `issue-tax-invoice-haulab.js` | Haulab 세금계산서 |
| `issue-tax-invoice-manual.js` | 수동 세금계산서 |
| `get-tax-invoice-requests.js` | 세금계산서 신청 조회 |
| `popbill-issue-cashbill.js` | 현금영수증 발행 |
| `popbill-webhook.js` | Popbill 웹훅 |

### 콘텐츠 업로드 (8개)
| 함수 | 설명 |
|------|------|
| `upload-to-youtube.js` | YouTube 업로드 (OAuth, 5분 타임아웃) |
| `upload-to-tiktok.js` | TikTok 게시 (5분) |
| `upload-to-instagram.js` | Instagram 릴스 (5분) |
| `save-video-upload.js` | 업로드 URL 저장 |
| `get-clean-video-urls.js` | 정제 URL 조회 |
| `get-video-submissions.js` | 영상 제출 조회 |
| `webhook-video-submission.js` | 영상 제출 웹훅 |
| `webhook-video-upload.js` | 영상 업로드 웹훅 |

### 크리에이터 분석/검색 (15개)
| 함수 | 설명 |
|------|------|
| `analyze-youtube-creator.js` | YouTube 크리에이터 분석 |
| `analyze-youtube-shorts.js` | YouTube Shorts 분석 (120초) |
| `analyze-tiktok-creator.js` | TikTok 분석 |
| `analyze-instagram-creator.js` | Instagram 분석 |
| `fetch-youtube-stats.js` | YouTube 통계 조회 |
| `fetch-youtube-data.js` | YouTube 채널 데이터 |
| `search-creators.js` | 크리에이터 검색 (멀티 리전) |
| `search-youtube-creators.js` | YouTube 크리에이터 검색 |
| `get-ai-creator-recommendations.js` | AI 추천 (Gemini) |
| `get-featured-creators.js` | 추천 크리에이터 조회 |
| `get-application-stats.js` | 신청 통계 |
| `add-featured-creator.js` / `remove-featured-creator.js` | 추천 크리에이터 추가/제거 |
| `manage-affiliated-creators.js` | 소속 크리에이터 관리 |
| `manage-our-channels.js` | 자사 채널 관리 |

### AI/생성 (10개)
| 함수 | 설명 |
|------|------|
| `generate-newsletter-image.js` | AI 뉴스레터 이미지 |
| `generate-sns-content.js` | SNS 콘텐츠 생성 |
| `generate-capi-profile.js` | CAPI 프로필 생성 |
| `generate-scene-guide.js` | 장면 가이드 생성 |
| `generate-invoice-pdf.js` | 인보이스 PDF |
| `translate-text.js` | 텍스트 번역 (Gemini) |
| `recommend-keywords.js` | 키워드 추천 |
| `youtube-to-gif.js` | YouTube→GIF 변환 |
| `crawl-product-url.js` | 제품 URL 크롤링 |
| `analyze-newsletter-seo.js` | 뉴스레터 SEO 분석 |

### 뉴스레터/Stibee (8개)
| 함수 | 설명 |
|------|------|
| `fetch-stibee-newsletters.js` | Stibee 뉴스레터 가져오기 |
| `subscribe-newsletter.js` | 뉴스레터 구독 |
| `newsletter-sitemap.js` | XML Sitemap (1시간 캐시) |
| `extract-newsletter-thumbnail.js` | 썸네일 추출 |
| `track-newsletter-view.js` | 조회수 추적 (UTM) |
| `send-stibee-auto-email.js` | Stibee 자동 이메일 |
| `send-stibee-campaign.js` | Stibee 캠페인 |
| `newsletter-traffic-analytics.js` | 트래픽 분석 |

### 메시징/웹훅 (12개)
| 함수 | 설명 |
|------|------|
| `send-line-message.js` | LINE 메시지 (자동 번역 지원) |
| `line-webhook.js` | LINE 웹훅 (서명 검증) |
| `line-messages.js` | LINE 메시지 (단순) |
| `send-naver-works-message.js` | 네이버 웍스 (JWT 인증) |
| `send-whatsapp-message.js` | WhatsApp (Twilio) |
| `whatsapp-webhook.js` | WhatsApp 웹훅 |
| `whatsapp-messages.js` | WhatsApp 메시지 |
| `github-webhook-notify.js` | GitHub 웹훅 알림 |

### 스케줄 작업 (20+개)
| 함수 | 스케줄 | 설명 |
|------|--------|------|
| `scheduled-collect-transactions` | 매 1분 | 거래 수집 |
| `scheduled-sns-upload` | 매 30분 | SNS 예약 업로드 |
| `scheduled-openclo-crawl` | 매 30분 | 오픈클로 크롤링 |
| `scheduled-openclo-registration-check` | 매시간 | 오픈클로 가입 확인 |
| `report-daily` | 매일 10시 KST | 일일 리포트 |
| `scheduled-campaign-deadline-notification` | 매일 10:15 KST | 캠페인 마감 알림 |
| `scheduled-video-deadline-notification` | 매일 10:15 KST | 영상 마감 알림 |
| `scheduled-video-overdue-notification` | 매일 10:15 KST | 영상 지연 알림 |
| `scheduled-overdue-notification` | 매일 10시 KST | 제출 지연 알림 |
| `scheduled-unmatched-deposits-alert` | 매일 16시 KST | 미매칭 입금 알림 |
| `scheduled-youtube-update-check` | 매일 09시 KST | YouTube 업데이트 확인 |
| `scheduled-openclo-email` | 매일 10시 KST | 오픈클로 이메일 |
| `scheduled-openclo-report` | 매일 18시 KST | 오픈클로 리포트 |
| `scheduled-stibee-sync` | 매일 17시 KST | Stibee 동기화 |
| `scheduled-stibee-sync-us` | 매일 10시 EST | Stibee 미국 동기화 |
| `scheduled-weekly-report` | 매주 월요일 10시 KST | 통합 주간 리포트 |

### OpenClo (5개)
| 함수 | 설명 |
|------|------|
| `openclo-ai-analyze.js` | AI 분석 |
| `openclo-bot-youtube.js` / `openclo-bot-instagram.js` / `openclo-bot-tiktok.js` | 플랫폼 봇 |
| `scheduled-openclo-crawl.js` | 크롤링 스케줄러 |

---

## 7. Frontend 서비스/라이브러리 상세

### src/lib/ (15개 파일)

#### supabaseClients.js (핵심)
- 멀티-리전 Supabase 클라이언트 (싱글턴 패턴)
- `getSupabaseClient(region)` - 리전 기반 클라이언트 선택
- `createCampaignInRegions(campaignData, selectedRegions)` - 멀티-리전 캠페인 생성
- `getCampaignsFromAllRegions()` - 전체 리전 캠페인 통합 조회
- `getApplicationStatsForCampaigns()` - 신청 통계 (selected, virtual_selected, approved, completed)
- `getCampaignsWithStats()` / `getCampaignsFast()` - 최적화된 캠페인 조회

#### creatorMatchingService.js
- Gemini API 기반 AI 매칭 (gemini-2.5-flash-lite)
- `generateAIMatchingReasons(campaign, creator)` - 매칭 분석
- `generateCampaignRecommendations(campaignId)` - 배치 매칭 (상위 10명 추천)
- 스코어: category_match 30%, audience 20%, engagement 25%, followers 15%, content_style 10%
- 테이블: `campaign_creator_matches`

#### geminiService.js
- OpenAI SDK + Gemini API endpoint 어댑터
- `analyzeCreator()` - 크리에이터 평가 (total_score, recommendation_level 등)
- `generateGuide()` - 촬영 가이드 생성 (스크립트, 장면 분해, 기술 사양)
- `translateGuide(guide, targetLanguage)` - 가이드 번역 (ja/en/zh-TW)
- `getRecommendationBadge(score)` - 90+: 최우수, 80+: 강력, 70+: 추천, 60+: 일반, <60: 검토필요

#### stripeService.js
- Stripe 결제 + 가격 관리
- PACKAGE_PRICES: basic (200K), standard (300K), premium (400K), monthly (600K)
- 리전 멀티플라이어 적용
- `createPaymentIntent()`, `savePaymentRecord()`, `activateCampaign()`

#### encryptionHelper.js
- 주민등록번호 암호화/복호화 (Supabase RPC: encrypt_text, decrypt_text)
- `maskResidentNumber()` - "123456-1******" 포맷
- `validateResidentNumber()` - 체크섬 검증

#### pdfGenerator.js
- jsPDF + jspdf-autotable로 견적서/계약서 PDF 생성
- `generateQuotationPDF()`, `generateContractPDF()`

#### revenueHelper.js
- `getRevenueFromAllRegions()` - 리전별 매출 집계
- `getMonthlyRevenueStats()` - 월별 매출 통계
- `getPointCharges()`, `getAccountsReceivable()` - Korea DB

#### popbillTemplates.js
- 카카오 알림톡 템플릿 (COMPANY 19개, CREATOR 14개, INVITATION)
- 각 템플릿: code, name, description, params[]

#### creatorMediaService.js
- YouTube/Instagram 프로필 이미지 추출
- Supabase Storage 업로드 (creator-profiles 버킷)
- YouTube Shorts 수집

#### matchingExportService.js
- CSV 내보내기 (BOM 포함, 한글 안전)
- JSON 내보내기, 인쇄용 HTML 리포트

#### teamService.js
- 팀 역할: owner, admin, member, viewer
- 역할별 권한 매트릭스 (canCreateCampaign, canManagePayment 등)

#### youtubeScraperService.js
- API 키 없이 YouTube 채널 스크래핑
- K/M/B 접미사 + 한국어 단위 (천/만/억) 파싱

#### utils.js
- `cn()` - clsx + tailwind-merge 조합

### src/services/

#### aiRecommendation.js
- Gemini API 기반 크리에이터 추천
- `getAIRecommendations(campaign, availableCreators)` - 상위 10명 추천
- 캐싱: `campaign_recommendations` 테이블

#### creatorGradeService.js
- 5단계 등급: FRESH → GLOW → BLOOM → ICONIC → MUSE
- 10종 뱃지: Color Expert, Skincare Guru, Reel Master 등
- `calculateGradeLevel(totalScore, completedCampaigns, recollaborationRate, isManualMuse)`

#### notifications/
- **companyNotifications.js** (9개): 가입, 결제요청, 충전완료, 캠페인승인, 모집마감, 가이드제출, 영상제출, 완료, 검수요청
- **creatorNotifications.js** (13개): 가입, 선정, 가이드전달, 마감알림(3일/2일/당일), 수정요청, 승인, 포인트지급, 출금요청, 출금완료, 지연경고, 취소
- **lineNotifications.js**: LINE 메시지 알림

### src/data/

#### campaignGuideTemplates.js
- 국가별 뷰티 카테고리 템플릿 (한국/미국/일본 각 10개)
- 카테고리: skincare, makeup, haircare, bodycare, fragrance, nail, tool
- 카테고리별 장면/대사 포함

#### guideStyles.js
- 10가지 AI 가이드 스타일: 일상 브이로그, 고민 해결, GRWM, 언박싱 등
- 각 스타일: promptModifier, bestFor, toneKeywords, structureHint

---

## 8. 계약서/템플릿 시스템

### 계약서 상태 흐름
`pending` → `sent` → `signed` / `expired`

### 서명 페이지
`/sign-contract/:contractId` (비로그인 접근 가능)

### 템플릿 (src/templates/)
| 파일 | 용도 | 주요 조항 |
|------|------|----------|
| `CompanyContractTemplate.jsx` | 기업-크리에이터 계약서 | IP 권리, 수정 범위, 사용 기간 (1년), 결제 조건 (14일) |
| `CreatorConsentTemplate.jsx` | 크리에이터 2차 사용 동의서 | 사용 범위, 보상, 저작 인격권, 분쟁 해결 |
| `VideoSecondaryUseConsentTemplate.jsx` | 영상 2차 사용 동의서 | 1년 사용 기간, 6개월 보관, Meta Ads 제한 |

---

## 9. 크리에이터 등급 시스템

### 등급 (5단계)
| 레벨 | 이름 | 라벨 | 색상 |
|------|------|------|------|
| 1 | FRESH | 새싹 | #10B981 (Emerald) |
| 2 | GLOW | 빛나기 시작 | #3B82F6 (Blue) |
| 3 | BLOOM | 피어나는 중 | #8B5CF6 (Violet) |
| 4 | ICONIC | 아이코닉 | #EC4899 (Pink) |
| 5 | MUSE | 뮤즈 | #F59E0B (Amber) |

### 뱃지 (10종)
Color Expert 💄, Skincare Guru 🧴, Nail Artist 💅, Hair Stylist 💇, Reel Master 🎬, Review Expert 📝, Brand Favorite ⭐, Fast Responder ⚡, Perfect Delivery 🎯, Trending Creator 🔥

---

## 10. 빌드 & 배포 설정

### Vite 설정
```javascript
// vite.config.js
plugins: [react(), tailwindcss()]
resolve.alias: { "@": "./src" }
define: { 'process.env': {} }
envPrefix: 'VITE_'
```

### Netlify 설정 (netlify.toml)
```
Build: pnpm run build → dist/
Functions: netlify/functions (esbuild)
```

### 함수 타임아웃
| 타임아웃 | 함수 유형 |
|----------|----------|
| 10초 (기본) | 일반 API |
| 30초 | 영상 업로드, 웹훅 |
| 60초 | AI 생성 (Gemini) |
| 120초 | YouTube 분석, OpenClo 크롤링 |
| 300초 (5분) | YouTube/Instagram/TikTok 업로드 |

### Edge Functions
- `ip-restrict-openclo.js` → `/admin/openclo/*` IP 제한

### SEO Redirects
- `/sitemap.xml` → sitemap 함수
- `/sitemap-newsletters.xml` → newsletter-sitemap 함수
- `/*` → `/index.html` (SPA fallback)

### Security Headers
```
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 11. 환경변수

### Supabase
| 변수 | 용도 | 사용처 |
|------|------|--------|
| `VITE_SUPABASE_BIZ_URL` | BIZ DB URL | Frontend + Functions |
| `VITE_SUPABASE_BIZ_ANON_KEY` | BIZ Anon Key | Frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | BIZ Service Key | Functions 전용 |
| `VITE_SUPABASE_KOREA_URL` | Korea DB URL | Frontend + Functions |
| `VITE_SUPABASE_KOREA_ANON_KEY` | Korea Anon Key | Frontend |
| `SUPABASE_KOREA_SERVICE_ROLE_KEY` | Korea Service Key | Functions 전용 |
| `VITE_SUPABASE_JAPAN_URL` / `_ANON_KEY` | Japan DB | Frontend |
| `VITE_SUPABASE_US_URL` / `_ANON_KEY` | US DB | Frontend |
| `VITE_SUPABASE_TAIWAN_URL` / `_ANON_KEY` | Taiwan DB | Frontend |

### 결제
| 변수 | 용도 |
|------|------|
| `STRIPE_SECRET_KEY` | Stripe 시크릿 키 |
| `TOSS_SECRET_KEY` | 토스페이먼츠 시크릿 키 |

### AI
| 변수 | 용도 |
|------|------|
| `GEMINI_API_KEY` | Google Gemini API |
| `OPENAI_API_KEY` | OpenAI API |

### 메시징
| 변수 | 용도 |
|------|------|
| `GMAIL_EMAIL` / `GMAIL_APP_PASSWORD` | Gmail 이메일 발송 (⚠️ GMAIL_USER 아님!) |
| `NAVER_WORKS_CLIENT_ID` / `CLIENT_SECRET` / `BOT_ID` | 네이버 웍스 인증 |
| `NAVER_WORKS_CHANNEL_ID` | 기본 채널 (75c24874 - 결제/캠페인) |
| `NAVER_WORKS_CONSULTATION_CHANNEL_ID` | 상담 채널 (b9387420 - 가입/상담) |
| `NAVER_WORKS_WITHDRAWAL_CHANNEL_ID` | 출금 알림 채널 |

### 기타
| 변수 | 용도 |
|------|------|
| `POPBILL_LINK_ID` / `POPBILL_SECRET_KEY` | 팝빌 (세금계산서, SMS, 카카오) |
| `STIBEE_API_KEY` | 스티비 뉴스레터 |
| `VITE_ENCRYPTION_KEY` | 암호화 키 |

---

## 12. 코딩 컨벤션

### Import 순서
```javascript
// 1. React & hooks
import { useState, useEffect } from 'react'
// 2. React Router
import { useNavigate, useParams } from 'react-router-dom'
// 3. UI (shadcn/ui)
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// 4. 아이콘
import { Plus, Edit, Loader2 } from 'lucide-react'
// 5. 로컬
import { supabaseBiz } from '../../lib/supabaseClients'
```

### 컴포넌트 패턴
```javascript
export default function ComponentName() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async () => {
    try {
      setLoading(true)
      // ...
    } catch (error) {
      console.error('오류:', error)
      alert(`실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader2 className="animate-spin" />
  return <div>...</div>
}
```

### Supabase 멀티-리전 규칙
| 테이블 | 위치 | 설명 |
|--------|------|------|
| `companies`, `admin_users`, `contracts`, `payments`, `featured_creators` | **BIZ DB만** | 중앙 비즈니스 데이터 |
| `campaigns`, `applications`, `user_profiles` | **리전 DB** (Korea/Japan/US) | 리전별 분리, BIZ에 없음 |
| `campaign_invitations`, `points_charge_requests` | **BIZ DB** | 중앙 관리 |

⚠️ **주의**: `campaigns`와 `applications`를 BIZ DB에서 조회하면 데이터가 없음. 반드시 리전 DB에서 조회해야 함.

### Supabase 호출 패턴
```javascript
// Frontend 직접 호출
const { data, error } = await supabaseBiz
  .from('table').select('*').eq('column', value).single()
if (error) throw error

// Netlify Function 호출
const res = await fetch('/.netlify/functions/name', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: value })
})
const result = await res.json()
if (!result.success) throw new Error(result.error)
```

### Netlify Function 패턴
```javascript
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.VITE_SUPABASE_BIZ_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

exports.handler = async (event) => {
  try {
    const { param } = JSON.parse(event.body)
    return { statusCode: 200, body: JSON.stringify({ success: true, data }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
```

### CORS 헤더 패턴
```javascript
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}
```

---

## 13. 디자인 시스템 요약

### 랜딩 페이지 (다크 테마)
- 배경: `#0A0A0F`, 액센트: `#C084FC`, 텍스트: `#FFFFFF`/`#A0A0B0`

### 관리자 페이지 (라이트 테마)
- 배경: `#F8F9FA`, Primary: `#6C5CE7`, Surface: `#FFFFFF`

### 핵심 규칙
1. 한 화면 유채색 3개 이상 금지
2. 통계 카드 아이콘: `#F0EDFF` 배경 + `#6C5CE7` 단일 색상
3. 캠페인 금액: `#6C5CE7` (빨간색 금지), Outfit Bold
4. 태그: border 없이 배경색만
5. 폰트: 한글 Pretendard, 영문/숫자 Outfit, 일본어 Noto Sans JP
6. border-radius: 카드 16px, 버튼 12px, 태그 6px, 풀라운드 9999px

---

## 14. 알림 시스템 아키텍처

### 알림 채널
| 채널 | 서비스 | 용도 |
|------|--------|------|
| 카카오 알림톡 | Popbill API | 한국 사용자 주요 알림 (기업/크리에이터) |
| SMS | Popbill API | 인증, 폴백 |
| 이메일 | Nodemailer (Gmail) | 글로벌 알림, 계약서, 가이드 |
| LINE | LINE Bot SDK | 일본 크리에이터 알림 (자동 번역 지원) |
| WhatsApp | Twilio | 글로벌 메시징 |
| 네이버 웍스 | JWT API (RS256) | 내부 운영팀 알림 (3개 채널 라우팅) |

### 네이버 웍스 채널 라우팅
| 채널 ID | 용도 | 사용처 |
|---------|------|--------|
| `75c24874-e370-afd5-9da3-72918ba15a3c` | **결제/캠페인/포인트/LINE** | 입금확인, 결제, 캠페인 상태변경, 크리에이터 지원, 포인트 충전, 영상 업로드 |
| `b9387420-7c8d-e703-0f96-dbfc72565bb5` | **상담신청/회원가입** | 기업 가입, 크리에이터 가입, 상담 문의, 크리에이터 매칭 요청 |
| `54220a7e-0b14-1138-54ec-a55f62dc8b75` | **에러 알림/OpenClo** | 시스템 오류 자동 알림, OpenClo 봇 관리 |

### 에러 알림 시스템
- **`send-error-alert.js`**: 에러 발생 시 `54220a7e` 채널로 자동 발송
- **무한루프 방지**: `send-naver-works-message.js`는 에러 채널 실패 시 추가 알림 안 보냄
- **적용 함수**: send-kakao-notification, send-email, confirm-payment, confirm-toss-payment, confirm-campaign-payment, create-charge-request, approve-campaign, update-campaign-status

### 기업 알림 수신 정보
- companies 테이블에서 `notification_phone` > `phone`, `notification_email` > `email` 우선 사용
- 프로필 수정 시 즉시 반영 (캐시 없음)

### 알림 패턴
- **병렬 발송**: 카카오 + 이메일 + SMS 동시 (send-notification-helper.js)
- **폴백**: 카카오 실패 시 SMS, LINE 실패 시 이메일
- **자동 번역**: LINE 메시지 자동 번역 지원 (Gemini API)
- **서버사이드 URL**: `${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/...`

### 카카오 알림톡 plusFriendID
| 대상 | plusFriendID | 템플릿 코드 범위 |
|------|-------------|-----------------|
| 기업용 | `@크넥` | 025100000912 ~ 025100001010 |
| 크리에이터용 | `@크넥_크리에이터` | 025100001011 ~ 025100001022, 025110000796~ |

### 이메일 환경변수
- 올바른 이름: `GMAIL_EMAIL` + `GMAIL_APP_PASSWORD`
- ⚠️ `GMAIL_USER` 사용 금지 (일부 레거시 파일에서 사용 → `GMAIL_EMAIL`로 통일)

---

## 15. 무시해야 할 파일

### 백업/구버전 파일
- 모든 `.backup`, `.old`, `_OLD`, `_backup_*` 접미사 파일
- `src/App_Old.jsx`

### deprecated 컴포넌트
- `LoginPageOld.jsx`, `SignupPageNew.jsx` (old 라우트에서만 사용)
- `RevenueManagement.jsx`, `RevenueManagementEnhanced.jsx`, `RevenueManagementWithCharts.jsx` → `RevenueManagementNew.jsx` 사용
- `GuideReview.jsx` → `CampaignGuideReview.jsx` 사용

### 개발용 파일 (코드 아님)
- `*.md` (CLAUDE.md 제외), `*.sql`, `check_*.js`, `test-*.js`, `debug-*.js`, `migrate_*.py`

---

## 16. 외부 서비스 통합 요약

| 서비스 | 관련 함수 수 | 주요 용도 |
|--------|------------|----------|
| Supabase | 150+ | 핵심 DB (멀티-리전) |
| Popbill | 12 | SMS, 카카오톡, 세금계산서, 현금영수증 |
| Gmail/Nodemailer | 10 | 이메일 발송 |
| Google Gemini | 8 | AI 콘텐츠 생성, 번역, 추천 |
| YouTube API | 6 | 크리에이터 분석, 영상 업로드, 통계 |
| Naver Works | 6 | 비즈니스 메시징, 알림 |
| LINE Bot SDK | 4 | LINE 메시징, 웹훅 |
| Toss Payments | 4 | 결제 처리, 웹훅 |
| TikTok API | 3 | 크리에이터 분석, 영상 업로드 |
| Instagram/Facebook | 3 | 릴스 업로드, 분석 |
| Stibee | 4 | 뉴스레터 관리 |
| Twilio | 2 | WhatsApp 메시징 |
| Meta Ads API | 3 | 광고 관리 |
| Stripe | 2 | 해외 결제 |

---

## 17. 주요 비즈니스 플로우

### 캠페인 생성 플로우
```
기업 로그인 → 캠페인 생성 (리전/타입 선택) → 가이드 작성 (AI 지원)
→ 결제 (토스/Stripe) → 캠페인 검수 신청 → 관리자 승인 → 캠페인 활성화
→ 크리에이터 신청 → 선정 → 가이드 전달 → 영상 제출 → 검수 → 완료 → 포인트 지급
```

### 계약서 플로우
```
관리자 계약서 생성 (create-contract) → 이메일 발송 → 크리에이터 열람
→ 서명 (sign-contract) → 완료 (서명 로그 기록)
```

### 포인트/결제 플로우
```
기업 충전 요청 → 입금 (토스 카드/계좌이체) → 관리자 확인 → 포인트 충전
→ 캠페인 비용 차감 → 크리에이터 포인트 지급 → 출금 요청 → 관리자 승인 → 이체
```

### 크리에이터 등급 플로우
```
신규 가입 (FRESH) → 캠페인 참여 → 점수 누적 → GLOW (Lv.2) → BLOOM (Lv.3)
→ ICONIC (Lv.4) → MUSE (Lv.5, 운영팀 초대)
```
