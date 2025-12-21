# CNECBIZ Database Structure

## Overview
The CNECBIZ admin system uses multiple Supabase databases for multi-region support.
This document serves as the **Master Reference** for database schema and relationships.

**TypeScript Types**: See `src/types/database.types.ts` for complete type definitions.

---

## Database Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CNECBIZ Admin System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    ┌─────────────────┐                                              │
│    │   BIZ Database  │ ◄── Central Admin Operations                 │
│    │   (supabaseBiz) │     - Companies, Payments, Admin Users       │
│    └────────┬────────┘     - Featured Creators, Contracts           │
│             │                                                       │
│             │ Cross-DB References                                   │
│             ▼                                                       │
│    ┌────────────────────────────────────────────────────────┐      │
│    │              Regional Databases                         │      │
│    ├──────────┬──────────┬──────────┬──────────────────────┤      │
│    │  Korea   │  Japan   │   US     │      Taiwan          │      │
│    │ (korea)  │ (japan)  │  (us)    │     (taiwan)         │      │
│    └──────────┴──────────┴──────────┴──────────────────────┘      │
│    └── Creator Profiles, Applications, Campaigns ──────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Instances

### 1. BIZ Database (Central - `supabaseBiz`)
Main business database for centralized admin operations.

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `admin_users` | Admin user accounts | id, email, role (super_admin, brand_admin) |
| `companies` | Registered companies | user_id, company_name, email, points_balance |
| `campaigns` | Campaign data | id, title, budget, status, company_id |
| `payments` | Payment records | id, campaign_id, amount, status |
| `points_charge_requests` | Point charging requests | id, company_id, amount, status |
| `points_transactions` | Point transaction history | id, company_id, amount, type |
| `tax_invoice_requests` | Tax invoice requests | id, company_id, amount, status |
| `receivables` | Receivables tracking | id, company_id, campaign_id, amount |
| `financial_records` | Financial record entries | id, type, amount, date |
| `bank_transactions` | Bank transaction logs | id, amount, depositor_name, matched |
| `contracts` | Contract management | id, creator_id, status |
| `contract_signature_logs` | Contract signing audit | contract_id, action, ip_address |
| `featured_creators` | Featured creator profiles | id, channel_name, capi_score, cnec_grade_level |
| `cnec_plus_pricing` | CNEC Plus pricing | id, creator_id, price_per_video |
| `featured_creator_applications` | Creator applications | id, user_id, status |
| `creator_withdrawal_requests` | Withdrawal requests | id, creator_id, amount, status |
| `video_submissions` | Video submission records | id, application_id, video_url |
| `video_review_comments` | Video review comments | id, video_submission_id, content |
| `video_review_comment_replies` | Comment replies | id, comment_id, content |
| `notifications` | System notifications | id, user_id, message, read |
| `creator_points` | Creator point balances | id, creator_id, points |
| `creators` | Creator profiles (legacy) | id, name, email |
| `system_settings` | System configuration | key, value |
| `sms_verifications` | SMS verification codes | id, phone_number, code, verified |
| `email_templates` | Email templates | id, name, subject, content |
| `guidebook_sections` | Guidebook content | id, title, content, order |
| `campaign_reference_videos` | Reference videos | id, campaign_id, video_url |
| `affiliated_creators` | Affiliated creator list | id, company_id, creator_name, channel_id |
| `creator_update_alerts` | Update alert logs | creator_id, days_since_update, alerted_at |
| `our_channels` | YouTube support channels | id, company_id, channel_name, channel_id |
| `channel_statistics` | Channel stats history | channel_id, subscriber_count, view_count |
| `channel_videos` | YouTube video data | channel_id, video_id, title, view_count |
| `consultation_requests` | B2B consultation requests | id, company_name, status, memo |
| `campaign_creator_matches` | AI matching results | campaign_id, creator_id, match_score |
| `campaign_invitations` | Creator invitations | campaign_id, creator_id, status |
| `campaign_recommendations` | AI recommendations | user_id, campaign_id, score |
| `fixed_costs` | Fixed monthly costs | name, amount, category |
| `creator_report_history` | Growth report history | creator_id, report_type, capi_score |
| `tax_office_feedback` | Tax feedback records | withdrawal_request_id, content |
| `notification_logs` | Notification delivery logs | recipient_email, status |
| `verification_logs` | Business verification logs | business_number, result |
| `creator_grades` | Grade history records | creator_id, grade_level, total_score |
| `public_reports` | Public report pages | campaign_id, slug, is_active |
| `public_report_videos` | Report video content | report_id, video_url |

### 2. Regional Databases (Korea, Japan, US, Taiwan)
Each region has its own database with creator-facing data.

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `user_profiles` | Creator user profiles | id, name, email, youtube_url, subscriber_count |
| `campaigns` | Region-specific campaigns | id, title, max_participants, reward_amount |
| `applications` | Campaign applications | id, campaign_id, user_id, status, virtual_selected |
| `campaign_applications` | Alt applications table | id, campaign_id, user_id, status |
| `campaign_participants` | Final participants | id, campaign_id, user_id, week_number |
| `reference_videos` | Reference video library | id, title, video_url, display_order |
| `faqs` | FAQ content | id, question, answer, category |
| `page_contents` | CMS page content | id, page_key, content |
| `seo_settings` | SEO configuration | id, meta_title, meta_description |
| `email_settings` | Email configuration | id, smtp_host, from_email |
| `email_templates` | Region email templates | id, name, subject, content |
| `site_settings` | Site configuration | id, footer_text, social_links |
| `featured_creators` | Region featured creators | id, creator_id, display_order |
| `withdrawal_requests` | Creator withdrawals | id, user_id, amount, status |
| `point_transactions` | Point history | id, user_id, amount, type |
| `teams` | Agency/team management | id, name, owner_id |
| `team_members` | Team membership | team_id, user_id, role |
| `admin_users` | Region admin users | id, email, role |

---

## Table Relationships

### Entity Relationship Diagram (Key Tables)

```
BIZ DATABASE
════════════

companies ─────────────────────┐
  │                            │
  │ user_id                    │ company_id
  ▼                            ▼
┌─────────┐              ┌─────────────────────┐
│ auth.   │              │ points_charge_      │
│ users   │              │ requests            │
└────┬────┘              └──────────┬──────────┘
     │                              │
     │                              │ matched_request_id
     │                              ▼
     │                   ┌─────────────────────┐
     │                   │ bank_transactions   │
     │                   └─────────────────────┘
     │
     │ user_id                    ┌─────────────────────┐
     ├────────────────────────────► featured_creators   │
     │                            └──────────┬──────────┘
     │                                       │
     │                                       │ creator_id
     │                                       ▼
     │                            ┌─────────────────────┐
     │                            │ creator_withdrawal_ │
     │                            │ requests            │
     │                            └─────────────────────┘
     │
     │                            ┌─────────────────────┐
     │ company_id                 │ campaigns           │
     ├────────────────────────────►                     │
     │                            └──────────┬──────────┘
     │                                       │
     │                                       │ campaign_id
     │                                       ▼
     │                            ┌─────────────────────┐
     │                            │ payments            │
     │                            └─────────────────────┘


REGIONAL DATABASE
═════════════════

user_profiles ◄───────────────────┐
     │                            │
     │ user_id                    │ user_id
     ▼                            │
┌─────────────────┐    ┌─────────────────────┐
│ auth.users      │    │ applications        │
└─────────────────┘    └──────────┬──────────┘
                                  │
                                  │ campaign_id
                                  ▼
                       ┌─────────────────────┐
                       │ campaigns           │
                       └──────────┬──────────┘
                                  │
                                  │ campaign_id
                                  ▼
                       ┌─────────────────────┐
                       │ video_submissions   │
                       └─────────────────────┘
```

### Foreign Key Relationships

#### BIZ Database

| Table | Column | References | Description |
|-------|--------|------------|-------------|
| `companies` | user_id | auth.users.id | Company owner |
| `campaigns` | company_id | companies.user_id | Campaign owner |
| `payments` | campaign_id | campaigns.id | Payment for campaign |
| `payments` | company_id | companies.user_id | Paying company |
| `points_charge_requests` | company_id | companies.user_id | Requesting company |
| `points_transactions` | company_id | companies.user_id | Transaction owner |
| `tax_invoice_requests` | company_id | companies.user_id | Requesting company |
| `tax_invoice_requests` | charge_request_id | points_charge_requests.id | Related charge |
| `receivables` | company_id | companies.user_id | Debtor company |
| `receivables` | campaign_id | campaigns.id | Related campaign |
| `bank_transactions` | matched_request_id | points_charge_requests.id | Matched request |
| `contracts` | creator_id | creators.id | Contract recipient |
| `contract_signature_logs` | contract_id | contracts.id | Signed contract |
| `featured_creators` | user_profile_id | (regional).user_profiles.id | Cross-DB link |
| `cnec_plus_pricing` | creator_id | featured_creators.id | Priced creator |
| `creator_withdrawal_requests` | creator_id | featured_creators.id | Withdrawing creator |
| `video_submissions` | application_id | (regional).applications.id | Cross-DB link |
| `video_review_comments` | video_submission_id | video_submissions.id | Commented video |
| `video_review_comment_replies` | comment_id | video_review_comments.id | Parent comment |
| `notifications` | user_id | auth.users.id | Notification recipient |
| `creator_points` | creator_id | featured_creators.id | Point owner |
| `affiliated_creators` | company_id | companies.user_id | Owning company |
| `our_channels` | company_id | companies.user_id | Owning company |
| `channel_statistics` | channel_id | our_channels/affiliated_creators.channel_id | Stats target |
| `campaign_creator_matches` | campaign_id | campaigns.id | Matched campaign |
| `campaign_creator_matches` | creator_id | featured_creators.id | Matched creator |
| `campaign_invitations` | campaign_id | campaigns.id | Invitation target |
| `campaign_recommendations` | campaign_id | campaigns.id | Recommended campaign |

#### Regional Databases

| Table | Column | References | Description |
|-------|--------|------------|-------------|
| `user_profiles` | id | auth.users.id | Profile owner (same ID) |
| `applications` | campaign_id | campaigns.id | Applied campaign |
| `applications` | user_id | user_profiles.id | Applicant |
| `applications` | video_submission_id | video_submissions.id | Submitted video |
| `campaign_participants` | campaign_id | campaigns.id | Participation target |
| `campaign_participants` | user_id | user_profiles.id | Participant |
| `withdrawal_requests` | user_id | user_profiles.id | Requesting user |
| `point_transactions` | user_id | user_profiles.id | Transaction owner |
| `team_members` | team_id | teams.id | Parent team |
| `team_members` | user_id | user_profiles.id | Team member |

---

## Cross-Database References

The system uses cross-database references that must be handled manually:

### BIZ → Regional

| BIZ Table | BIZ Column | Regional Table | Regional Column | Usage |
|-----------|------------|----------------|-----------------|-------|
| `featured_creators` | user_profile_id | user_profiles | id | Link recommended creator to profile |
| `featured_creators` | source_region | - | - | Indicates which regional DB |
| `video_submissions` | application_id | applications | id | Link submission to application |
| `campaign_invitations` | user_profile_id | user_profiles | id | Invitation target |

### Data Flow Patterns

```javascript
// Pattern 1: Fetch from regional, enrich from BIZ
const { data: applications } = await supabaseKorea
  .from('applications')
  .select('*, user_profiles(*), campaigns(*)')

// Pattern 2: Fetch from BIZ, lookup in regional
const { data: featuredCreators } = await supabaseBiz
  .from('featured_creators')
  .select('*')
// Then for each creator with source_region:
const regionalClient = getSupabaseClient(creator.source_region)
const { data: profile } = await regionalClient
  .from('user_profiles')
  .select('*')
  .eq('id', creator.user_profile_id)
```

---

## Known Issues & Workarounds

### consultation_requests Table
The following columns do NOT exist in the DB schema:
- `contract_status` - Stored in localStorage
- `expected_revenue` - Stored in localStorage
- `contract_sent` - Stored in localStorage
- `records` - Stored in localStorage (consultation history)

These are handled via browser localStorage as a workaround.
See: `src/components/admin/ConsultationManagement.jsx`

### affiliated_creators company_id
The `company_id` field is **REQUIRED** for YouTube API refresh functionality.
When adding new affiliated creators, always include `company_id: user.id`.
See fix: commit `af10fe3`

---

## Grade System (featured_creators)

| Level | Name | Color | Recommended |
|-------|------|-------|-------------|
| 1 | FRESH | #94A3B8 | No |
| 2 | GLOW | #22C55E | Yes |
| 3 | BLOOM | #3B82F6 | Yes |
| 4 | ICONIC | #8B5CF6 | Yes |
| 5 | MUSE | #F59E0B | Yes |

Grade columns in `featured_creators`:
- `cnec_grade_level` (1-5) - Numeric level
- `cnec_grade_name` (FRESH, GLOW, BLOOM, ICONIC, MUSE) - Display name
- `cnec_total_score` (number) - Calculated score
- `is_cnec_recommended` (boolean) - true if grade_level >= 2

---

## Status Enums

### Campaign Status
```typescript
type CampaignStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'cancelled'
```

### Application Status
```typescript
type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'selected' | 'completed'
```

### Charge Request Status
```typescript
type ChargeRequestStatus = 'pending' | 'completed' | 'cancelled' | 'credit'
```

### Withdrawal Status
```typescript
type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed'
```

---

## Multi-Region Access Pattern

```javascript
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'

// Get regional client by region name
const client = getSupabaseClient('korea') // 'japan', 'us', 'taiwan'

// Get central BIZ client
const bizClient = supabaseBiz

// Common pattern: determine region from campaign
const regionClient = getSupabaseClient(campaign.region || 'korea')
```

---

## Storage Buckets

| Bucket | Usage | Client |
|--------|-------|--------|
| `creator-profiles` | Profile images | Regional |
| `campaign-images` | Campaign thumbnails | Regional |
| `campaign-videos` | Uploaded videos | Regional |
| `videos` | General video storage | BIZ |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_BIZ_URL` | BIZ Supabase URL |
| `VITE_SUPABASE_BIZ_ANON_KEY` | BIZ anonymous key |
| `VITE_SUPABASE_KOREA_URL` | Korea Supabase URL |
| `VITE_SUPABASE_KOREA_ANON_KEY` | Korea anonymous key |
| `VITE_SUPABASE_JAPAN_URL` | Japan Supabase URL |
| `VITE_SUPABASE_JAPAN_ANON_KEY` | Japan anonymous key |
| `VITE_SUPABASE_US_URL` | US Supabase URL |
| `VITE_SUPABASE_US_ANON_KEY` | US anonymous key |
| `VITE_SUPABASE_TAIWAN_URL` | Taiwan Supabase URL |
| `VITE_SUPABASE_TAIWAN_ANON_KEY` | Taiwan anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |

---

## Data Sync Guidelines for cnec-kr

When syncing cnec-kr (creator site) with cnecbiz (admin site):

1. **campaigns**: Created in cnecbiz, synced to regional DBs
2. **applications**: Created in regional DBs, read by cnecbiz
3. **user_profiles**: Created in regional DBs, referenced by cnecbiz
4. **featured_creators**: Created in cnecbiz, copied to regional DBs (optional)
5. **video_submissions**: Created in regional DBs, managed by cnecbiz

### Critical Sync Points

- `applications.virtual_selected` - Updated by brand admin in cnecbiz
- `applications.final_selected` - Updated by brand admin in cnecbiz
- `applications.guide_delivered` - Updated by cnecbiz after guide delivery
- `campaigns.status` - Managed by cnecbiz admin

---

**TypeScript Types**: `src/types/database.types.ts`
**Generated**: 2025-12-19
**Master Reference for cnec-kr sync**
