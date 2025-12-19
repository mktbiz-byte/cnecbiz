# CNECBIZ Database Structure

## Overview
The CNECBIZ admin system uses multiple Supabase databases for multi-region support.

## Database Instances

### 1. BIZ Database (Central - `supabaseBiz`)
Main business database for centralized admin operations.

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `admin_users` | Admin user accounts | id, email, role (super_admin, brand_admin) |
| `companies` | Registered companies | id, name, email, points_balance, business_number |
| `campaigns` | Campaign data | id, title, budget, status, brand |
| `payments` | Payment records | id, campaign_id, amount, status |
| `points_charge_requests` | Point charging requests | id, company_id, amount, status |
| `points_transactions` | Point transaction history | id, company_id, amount, type |
| `tax_invoice_requests` | Tax invoice requests | id, company_id, amount, status |
| `receivables` | Receivables tracking | id, company_id, amount |
| `financial_records` | Financial record entries | id, type, amount, date |
| `bank_transactions` | Bank transaction logs | id, amount, depositor_name, matched |
| `contracts` | Contract management | id, creator_id, status |
| `featured_creators` | Featured creator profiles | id, channel_name, capi_score, cnec_grade_level |
| `cnec_plus_pricing` | CNEC Plus pricing | id, creator_id, price_per_video |
| `featured_creator_applications` | Creator applications | id, user_id, status |
| `creator_withdrawal_requests` | Withdrawal requests | id, creator_id, amount, status |
| `video_submissions` | Video submission records | id, application_id, video_url |
| `notifications` | System notifications | id, user_id, message, read |
| `creator_points` | Creator point balances | id, creator_id, points |
| `creators` | Creator profiles | id, name, email |
| `system_settings` | System configuration | key, value |
| `sms_verifications` | SMS verification codes | id, phone, code, verified |
| `email_templates` | Email templates | id, name, subject, content |
| `guidebook_sections` | Guidebook content | id, title, content, order |
| `campaign_reference_videos` | Reference videos | id, campaign_id, video_url |
| `affiliated_creators` | Affiliated creator list | id, creator_name, platform, platform_url |
| `creator_update_alerts` | Update alert logs | creator_id, days_since_update, alerted_at |
| `our_channels` | YouTube support channels | id, channel_name, channel_id |
| `channel_statistics` | Channel stats | id, channel_id, subscribers, views |
| `consultation_requests` | B2B consultation requests | id, company_name, status, memo |

### 2. Regional Databases (Korea, Japan, US, Taiwan)
Each region has its own database with creator-facing data.

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `user_profiles` | Creator user profiles | id, name, email, instagram_url, youtube_url |
| `campaigns` | Region-specific campaigns | id, title, max_participants, reward_amount |
| `applications` | Campaign applications | id, campaign_id, user_id, status |
| `reference_videos` | Reference video library | id, title, video_url, display_order |
| `faqs` | FAQ content | id, question, answer, category |
| `page_contents` | CMS page content | id, page_key, content |
| `seo_settings` | SEO configuration | id, meta_title, meta_description |
| `email_settings` | Email configuration | id, smtp_settings |
| `featured_creators` | Region featured creators | id, creator_id, display_order |
| `site_settings` | Site configuration | id, footer_text, social_links |

## Known Issues & Workarounds

### consultation_requests Table
The following columns do NOT exist in the DB schema:
- `contract_status` - Stored in localStorage
- `expected_revenue` - Stored in localStorage
- `contract_sent` - Stored in localStorage
- `records` - Stored in localStorage

These are handled via browser localStorage as a workaround.
See: `src/components/admin/ConsultationManagement.jsx`

## Grade System (featured_creators)

| Level | Name | Color |
|-------|------|-------|
| 1 | FRESH | #94A3B8 |
| 2 | GLOW | #22C55E |
| 3 | BLOOM | #3B82F6 |
| 4 | ICONIC | #8B5CF6 |
| 5 | MUSE | #F59E0B |

Grade columns:
- `cnec_grade_level` (1-5)
- `cnec_grade_name` (FRESH, GLOW, BLOOM, ICONIC, MUSE)
- `cnec_total_score` (calculated score)
- `is_cnec_recommended` (boolean)

## Multi-Region Access Pattern

```javascript
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'

// Get regional client
const client = getSupabaseClient('korea') // 'japan', 'us', 'taiwan'

// Get central BIZ client
const bizClient = supabaseBiz
```

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
Generated: 2025-12-19
