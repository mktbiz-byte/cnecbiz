# Phase 0: cnecbiz 미사용 파일 정리 로그

> 실행일: 2026-03-20
> 기능 변경: 없음 (백업/테스트/잡파일만 삭제·이동)
> 빌드 검증: `npm run build` 성공 확인

---

## 삭제된 파일 (53개)

### 1. src/ 백업 파일 (29개)

| # | 파일 경로 | 원본 존재 여부 |
|---|----------|--------------|
| 1 | `src/components/CampaignCreatePage.jsx.backup_20251209_020246` | 원본 불필요 (미사용) |
| 2 | `src/components/LandingPage.jsx.backup` | ✅ LandingPage.jsx 존재 |
| 3 | `src/components/LoginPageNew.jsx.backup` | ✅ LoginPageNew.jsx 존재 |
| 4 | `src/components/admin/AdminCampaignEdit.jsx.backup` | ✅ AdminCampaignEdit.jsx 존재 |
| 5 | `src/components/admin/AllCreatorsPage.jsx.backup` | ✅ AllCreatorsPage.jsx 존재 |
| 6 | `src/components/admin/FeaturedCreatorManagementPage_OLD.jsx` | ✅ FeaturedCreatorManagementPageNew.jsx 사용 중 |
| 7 | `src/components/admin/OurChannelReport.jsx.backup` | ✅ OurChannelReport.jsx 존재 |
| 8 | `src/components/admin/SiteManagement.jsx.backup` | ✅ SiteManagement.jsx 존재 |
| 9 | `src/components/admin/SiteManagement.jsx.old` | ✅ SiteManagement.jsx 존재 |
| 10 | `src/components/company/CampaignDetail.jsx.backup` | ✅ CampaignDetail.jsx 존재 |
| 11 | `src/components/company/CampaignDetail.jsx.backup2` | ✅ CampaignDetail.jsx 존재 |
| 12 | `src/components/company/CampaignGuide4WeekChallenge.jsx.backup_20251209_022629` | ✅ 원본 존재 |
| 13 | `src/components/company/CampaignGuideEditor.jsx.backup_20251209_020713` | ✅ 원본 존재 |
| 14 | `src/components/company/CampaignGuideJapan.jsx.backup` | ✅ 원본 존재 |
| 15 | `src/components/company/CampaignGuideJapan.jsx.backup_20251209_022629` | ✅ 원본 존재 |
| 16 | `src/components/company/CampaignGuideOliveYoung.jsx.backup_20251209_022629` | ✅ 원본 존재 |
| 17 | `src/components/company/CreateCampaignJapan.jsx.backup` | ✅ 원본 존재 |
| 18 | `src/components/company/CreateCampaignJapan.jsx.backup2` | ✅ 원본 존재 |
| 19 | `src/components/company/CreateCampaignKorea.jsx.backup` | ✅ 원본 존재 |
| 20 | `src/components/company/CreateCampaignKorea_OLD_BACKUP.jsx` | ✅ CreateCampaignKorea.jsx 존재 |
| 21 | `src/components/company/CreateCampaignUS.jsx.backup` | ✅ 원본 존재 |
| 22 | `src/components/company/FourWeekChallengeInvoice.jsx.old` | ✅ FourWeekChallengeInvoice.jsx 존재 |
| 23 | `src/components/company/FourWeekGuideModal.jsx.backup` | ✅ 원본 존재 |
| 24 | `src/components/company/OliveYoungGuideModal.jsx.backup` | ✅ 원본 존재 |
| 25 | `src/components/company/PaymentMethodSelection.jsx.backup_20251209_021005` | ✅ 원본 존재 |
| 26 | `src/components/creator/CreatorMyPage.jsx.backup` | ✅ CreatorMyPage.jsx 존재 |
| 27 | `src/pages/FourWeekChallengeCampaignIntro.jsx.old` | ✅ 원본 존재 |
| 28 | `src/pages/OliveYoungCampaignIntro.jsx.old` | ✅ 원본 존재 |
| 29 | `src/pages/RegularCampaignIntro.jsx.old` | ✅ 원본 존재 |

### 2. Netlify Functions 테스트 파일 (14개)

| # | 파일 | 비고 |
|---|------|------|
| 1 | `netlify/functions/test-campaign-deadline-notification.js` | 테스트용 |
| 2 | `netlify/functions/test-campaign-emails.js` | 테스트용 |
| 3 | `netlify/functions/test-env.js` | 테스트용 |
| 4 | `netlify/functions/test-kakao-notification.js` | 테스트용 |
| 5 | `netlify/functions/test-list-accounts.js` | 테스트용 |
| 6 | `netlify/functions/test-messaging.js` | 테스트용 |
| 7 | `netlify/functions/test-naver-works.js` | 테스트용 |
| 8 | `netlify/functions/test-popbill.js` | 테스트용 |
| 9 | `netlify/functions/test-send-works-message.js` | 테스트용 |
| 10 | `netlify/functions/test-supabase-connection.js` | 테스트용 |
| 11 | `netlify/functions/test-supabase-insert.js` | 테스트용 |
| 12 | `netlify/functions/test-video-deadline-check.js` | 테스트용 |
| 13 | `netlify/functions/test-video-deadline-notification.js` | 테스트용 |
| 14 | `netlify/functions/generate-capi-profile.js.backup` | 백업 |

### 3. 루트 테스트/체크/잡 파일 (10개)

| # | 파일 | 비고 |
|---|------|------|
| 1 | `check_creators_by_region.js` | 일회성 스크립트 |
| 2 | `check_points_rls.js` | 일회성 스크립트 |
| 3 | `check_tables.mjs` | 일회성 스크립트 |
| 4 | `check_us_creators.js` | 일회성 스크립트 |
| 5 | `test-delete-and-recollect.cjs` | 테스트용 |
| 6 | `test-delete-and-recollect.js` | 테스트용 |
| 7 | `test-popbill-local.cjs` | 테스트용 |
| 8 | `test-supabase.cjs` | 테스트용 |
| 9 | `shipping_management_additions.js` | 일회성 스크립트 |
| 10 | `src/temp_guide_approval.js` | 임시 파일 |

---

## 이동된 파일 (50개)

### 4. SQL 파일 → `database/` (29개)

`ADD_ADMIN_TABLE.sql`, `ADD_CAMPAIGN_TYPES_TO_FEATURED_CREATORS.sql`, `ADD_CAPI_RELIABILITY_COLUMN.sql`, `ADD_FAQ_TABLE.sql`, `ADD_GUIDE_CONFIRMED_COLUMN.sql`, `ADD_RECOMMENDATION_SUMMARY_COLUMN.sql`, `CLEAN_INSTALL.sql`, `COMPLETE_DATABASE_SCHEMA.sql`, `CREATE_CAMPAIGN_REFERENCE_VIDEOS_TABLE.sql`, `CREATE_FEATURED_CREATORS_SYSTEM.sql`, `CREATE_PAGE_CONTENTS_TABLE.sql`, `CREATE_REFERENCE_VIDEOS_TABLE.sql`, `FIX_COMPANIES_TABLE.sql`, `FIX_FEATURED_CREATOR_APPLICATIONS_RLS.sql`, `add_campaign_fields_migration.sql`, `add_recipient_columns.sql`, `check_feedback_table.sql`, `create_bank_transactions.sql`, `create_financial_records.sql`, `insert_payment_account.sql`, `supabase_bank_transactions_table.sql`, `supabase_channel_monitoring.sql`, `supabase_creator_reports_table.sql`, `supabase_payments_update.sql`, `supabase_points_system.sql`, `supabase_setup.sql`, `supabase_setup_final.sql`, `supabase_tax_invoice_tables.sql`, `supabase_terms_system.sql`

### 5. MD 파일 → `docs/` (21개)

`CAPI_Feature_Completion_Summary.md`, `CHANNEL_MONITORING_SETUP.md`, `CONTRACT_PREVIEW_IMPLEMENTATION.md`, `CONTRACT_SYSTEM.md`, `CONTRACT_SYSTEM_IMPROVEMENT.md`, `CREATOR_MATCHING_SYSTEM_GUIDE.md`, `DEPLOYMENT_COMPLETE_GUIDE.md`, `DEPLOYMENT_GUIDE.md`, `EMAIL_TEMPLATE_SYSTEM.md`, `FINAL_WORK_SUMMARY.md`, `NAVER_WORKS_TOKEN_GUIDE.md`, `OPENCLO_GUIDE.md`, `PLAN-kakao-ai-chatbot.md`, `POPBILL_NOTIFICATION_GUIDE.md`, `STRIPE_SETUP_GUIDE.md`, `SUPABASE_SETUP_GUIDE.md`, `TEAM_FEATURE_GUIDE.md`, `USER_MANUAL.md`, `WORK_SUMMARY.md`, `chart_analysis.md`, `guide_template_structure.md`

---

## 존재하지 않았던 파일 (삭제 스킵)

- `src/App_Old.jsx` — 이미 없음
- `src/components/company/CampaignGuideReview_new_function.js` — 이미 없음

---

## 롤백 방법

문제 발생 시 이 커밋을 revert:

```bash
git revert HEAD
```

---

## 향후 방지 규칙

### 백업 파일 생성 금지

1. **`.backup`, `.old`, `.bak`, `_OLD`, `_BACKUP` 접미사 파일을 절대 커밋하지 않을 것**
   - 코드 이력은 Git이 관리함. 파일 복사본 대신 `git stash` 또는 브랜치 사용
2. **테스트/디버그 함수는 `netlify/functions/` 에 커밋하지 않을 것**
   - 로컬에서만 사용하고 `.gitignore`에 `test-*.js` 패턴 추가 권장
3. **일회성 스크립트(`check_*`, `test-*`, `migrate_*`)는 루트에 커밋하지 않을 것**
   - 필요 시 `scripts/` 디렉터리 사용 후 완료되면 삭제
4. **SQL 파일은 반드시 `database/` 폴더에 저장**
5. **문서 MD 파일은 반드시 `docs/` 폴더에 저장** (CLAUDE.md, README.md 제외)

### .gitignore 추가 권장 패턴

```gitignore
# 백업 파일
*.backup
*.backup2
*.backup_*
*.bak
*.old
*_OLD.jsx
*_OLD_BACKUP.jsx

# 일회성 스크립트
check_*.js
check_*.mjs
test-*.cjs
migrate_*.py
```
