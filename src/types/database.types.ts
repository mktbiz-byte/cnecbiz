/**
 * CNECBIZ Database Type Definitions
 *
 * This file contains TypeScript type definitions for all Supabase tables
 * used in the cnecbiz admin system. This serves as the "Master" reference
 * for syncing with cnec-kr (creator site).
 *
 * Generated: 2025-12-19
 *
 * Database Architecture:
 * - BIZ Database (supabaseBiz): Central admin operations
 * - Regional Databases (Korea, Japan, US, Taiwan): Creator-facing data
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export type UUID = string
export type Timestamp = string // ISO 8601 format
export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue }

// Status enums
export type CampaignStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'cancelled'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'selected' | 'completed'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed'
export type ChargeRequestStatus = 'pending' | 'completed' | 'cancelled' | 'credit'

// Grade system
export type CNECGradeLevel = 1 | 2 | 3 | 4 | 5
export type CNECGradeName = 'FRESH' | 'GLOW' | 'BLOOM' | 'ICONIC' | 'MUSE'

// Platform types
export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'blog'
export type Region = 'korea' | 'japan' | 'us' | 'taiwan' | 'biz'

// =============================================================================
// BIZ DATABASE TABLES (supabaseBiz)
// =============================================================================

/**
 * admin_users - Admin user accounts
 * Used for: Admin authentication and role management
 */
export interface AdminUser {
  id: UUID
  email: string
  role: 'super_admin' | 'brand_admin' | 'admin'
  name?: string
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * companies - Registered business companies
 * Used for: Company management, brand admin accounts
 */
export interface Company {
  id?: number
  user_id: UUID // References auth.users.id
  company_name: string
  contact_person?: string
  email: string
  phone?: string
  status: 'active' | 'inactive' | 'pending'
  points_balance: number
  profile_completed: boolean
  is_approved: boolean
  business_number?: string
  ceo_name?: string
  address?: string
  bank_account?: string
  bank_name?: string
  account_holder?: string
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * campaigns - Campaign data (also exists in regional DBs)
 * Used for: Campaign creation and management
 */
export interface Campaign {
  id: UUID
  title: string
  description?: string
  brand?: string
  company_email?: string
  company_id?: UUID
  budget?: number
  total_amount?: number
  reward_amount?: number
  max_participants?: number
  status: CampaignStatus
  start_date?: Timestamp
  end_date?: Timestamp
  application_deadline?: Timestamp
  requirements?: string
  guidelines?: string
  selected_regions?: string[] // e.g., ['korea', 'japan']
  campaign_type?: 'regular' | 'four_week' | 'olive_young' | 'cnec_plus'
  product_name?: string
  product_info?: string
  thumbnail_url?: string
  reference_video_url?: string
  payment_status?: PaymentStatus
  region?: Region
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * payments - Payment records for campaigns
 * Used for: Payment tracking and financial management
 */
export interface Payment {
  id: UUID
  campaign_id?: UUID
  company_id?: UUID
  amount: number
  status: PaymentStatus
  payment_method?: 'card' | 'bank_transfer' | 'points'
  stripe_payment_intent_id?: string
  stripe_session_id?: string
  transaction_id?: string
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * points_charge_requests - Point charging requests from companies
 * Used for: Managing point purchases
 */
export interface PointsChargeRequest {
  id: UUID
  company_id: UUID
  amount: number
  quantity?: number
  status: ChargeRequestStatus
  payment_method?: 'bank_transfer' | 'card' | 'credit'
  depositor_name?: string
  bank_transfer_info?: {
    campaign_id?: UUID
    campaign_title?: string
    expected_payment_date?: string
  }
  related_campaign_id?: UUID
  admin_memo?: string
  needs_tax_invoice?: boolean
  tax_invoice_issued?: boolean
  confirmed_at?: Timestamp
  confirmed_by?: UUID
  credit_notes?: string
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * points_transactions - Point transaction history
 * Used for: Tracking point changes
 */
export interface PointsTransaction {
  id: UUID
  company_id: UUID
  amount: number
  type: 'charge' | 'use' | 'refund' | 'credit' | 'adjustment'
  description?: string
  reference_id?: UUID
  balance_after?: number
  created_at: Timestamp
}

/**
 * tax_invoice_requests - Tax invoice requests
 * Used for: Tax invoice management
 */
export interface TaxInvoiceRequest {
  id: UUID
  company_id: UUID
  charge_request_id?: UUID
  amount: number
  status: 'pending' | 'issued' | 'cancelled'
  company_name?: string
  business_number?: string
  ceo_name?: string
  email?: string
  issued_at?: Timestamp
  popbill_issue_id?: string
  created_at: Timestamp
}

/**
 * receivables - Accounts receivable tracking
 * Used for: Credit management
 */
export interface Receivable {
  id: UUID
  company_id: UUID
  campaign_id?: UUID
  amount: number
  status: 'pending' | 'paid' | 'cancelled'
  due_date?: Timestamp
  paid_at?: Timestamp
  description?: string
  created_at: Timestamp
}

/**
 * financial_records - Financial record entries
 * Used for: Revenue and expense tracking
 */
export interface FinancialRecord {
  id: UUID
  type: 'revenue' | 'expense' | 'credit'
  amount: number
  description?: string
  category?: string
  reference_id?: UUID
  date: Timestamp
  created_at: Timestamp
}

/**
 * bank_transactions - Bank transaction logs
 * Used for: Auto-matching deposits with charge requests
 */
export interface BankTransaction {
  id: UUID
  amount: number
  depositor_name: string
  deposit_date: Timestamp
  matched: boolean
  matched_request_id?: UUID
  matched_company_id?: UUID
  bank_name?: string
  memo?: string
  raw_data?: JSONValue
  created_at: Timestamp
}

/**
 * contracts - Contract management
 * Used for: Managing creator contracts
 */
export interface Contract {
  id: UUID
  creator_id: UUID
  company_id?: UUID
  status: 'pending' | 'sent' | 'signed' | 'completed'
  contract_type?: string
  contract_url?: string
  signed_at?: Timestamp
  signed_ip?: string
  signature_data?: string
  terms_agreed?: boolean
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * contract_signature_logs - Contract signature audit logs
 * Used for: Tracking contract signing events
 */
export interface ContractSignatureLog {
  id: UUID
  contract_id: UUID
  action: 'viewed' | 'signed' | 'declined'
  ip_address?: string
  user_agent?: string
  created_at: Timestamp
}

/**
 * featured_creators - Featured/recommended creator profiles
 * Used for: Managing recommended creators with grade system
 */
export interface FeaturedCreator {
  id: UUID
  // Basic info
  channel_name: string
  channel_url?: string
  platform: Platform
  profile_image?: string
  email?: string

  // Regional link
  user_profile_id?: UUID // Links to regional user_profiles
  source_region?: Region
  regions?: string[] // Active regions

  // CAPI (Creator API) Score
  capi_score?: number
  capi_grade?: string
  capi_analysis?: JSONValue

  // CNEC Grade System (5 levels)
  cnec_grade_level?: CNECGradeLevel // 1-5
  cnec_grade_name?: CNECGradeName // FRESH, GLOW, BLOOM, ICONIC, MUSE
  cnec_total_score?: number // Calculated score
  is_cnec_recommended?: boolean // Grade level >= 2

  // Stats
  subscriber_count?: number
  video_count?: number
  avg_views?: number
  engagement_rate?: number

  // Status
  is_active: boolean
  display_order?: number

  // Metadata
  supported_campaigns?: string[] // Campaign types creator can participate in
  notes?: string
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * cnec_plus_pricing - CNEC Plus creator pricing
 * Used for: Managing CNEC Plus creator rates
 */
export interface CnecPlusPricing {
  id: UUID
  creator_id: UUID
  creator_name: string
  creator_region?: Region
  channel_url?: string
  profile_image?: string
  platform?: Platform
  price_per_video: number
  display_order?: number
  is_active: boolean
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * featured_creator_applications - Creator applications
 * Used for: Managing creator partnership applications
 */
export interface FeaturedCreatorApplication {
  id: UUID
  user_id: UUID
  channel_url: string
  platform: Platform
  status: 'pending' | 'approved' | 'rejected'
  subscriber_count?: number
  application_reason?: string
  admin_notes?: string
  reviewed_at?: Timestamp
  reviewed_by?: UUID
  created_at: Timestamp
}

/**
 * creator_withdrawal_requests - Creator withdrawal requests
 * Used for: Managing creator point withdrawals
 */
export interface CreatorWithdrawalRequest {
  id: UUID
  creator_id: UUID
  amount: number
  status: WithdrawalStatus
  bank_name?: string
  account_number?: string
  account_holder?: string
  tax_id?: string // 주민등록번호 (for tax purposes)
  admin_memo?: string
  processed_at?: Timestamp
  processed_by?: UUID
  created_at: Timestamp
  // Joined from featured_creators
  featured_creators?: Partial<FeaturedCreator>
}

/**
 * video_submissions - Video submission records
 * Used for: Tracking submitted videos for campaigns
 */
export interface VideoSubmission {
  id: UUID
  application_id: UUID
  campaign_id?: UUID
  user_id?: UUID
  video_url: string
  storage_path?: string
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested'
  feedback?: string
  approved_at?: Timestamp
  approved_by?: UUID
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * video_review_comments - Video review comments
 * Used for: Feedback on video submissions
 */
export interface VideoReviewComment {
  id: UUID
  video_submission_id: UUID
  author_id: UUID
  author_type: 'admin' | 'creator' | 'brand'
  content: string
  timestamp_seconds?: number // Video timestamp reference
  created_at: Timestamp
}

/**
 * video_review_comment_replies - Replies to video comments
 * Used for: Threaded comment discussions
 */
export interface VideoReviewCommentReply {
  id: UUID
  comment_id: UUID
  author_id: UUID
  author_type: 'admin' | 'creator' | 'brand'
  content: string
  created_at: Timestamp
}

/**
 * notifications - System notifications
 * Used for: In-app notifications
 */
export interface Notification {
  id: UUID
  user_id: UUID
  title?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  link?: string
  created_at: Timestamp
}

/**
 * creator_points - Creator point balances
 * Used for: Tracking creator earnings
 */
export interface CreatorPoints {
  id: UUID
  creator_id: UUID
  points: number
  total_earned?: number
  total_withdrawn?: number
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * creators - Legacy creator profiles (use featured_creators instead)
 * Used for: Basic creator info
 */
export interface Creator {
  id: UUID
  name: string
  email?: string
  phone?: string
  channel_url?: string
  platform?: Platform
  points?: number
  created_at: Timestamp
}

/**
 * system_settings - System configuration
 * Used for: Application-wide settings
 */
export interface SystemSetting {
  id: UUID
  key: string
  value: JSONValue
  description?: string
  updated_at: Timestamp
}

/**
 * sms_verifications - SMS verification codes
 * Used for: Phone verification during signup
 */
export interface SmsVerification {
  id: UUID
  phone_number: string
  verification_code: string
  expires_at: Timestamp
  verified: boolean
  created_at: Timestamp
}

/**
 * email_templates - Email templates (also in regional DBs)
 * Used for: Email notification templates
 */
export interface EmailTemplate {
  id: UUID
  name: string
  subject: string
  content: string // HTML content
  variables?: string[] // Template variables like {{name}}
  is_active: boolean
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * guidebook_sections - Guidebook content
 * Used for: Creator guidebook management
 */
export interface GuidebookSection {
  id: UUID
  title: string
  content: string
  order: number
  is_active: boolean
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * campaign_reference_videos - Campaign reference videos
 * Used for: Example videos for campaigns
 */
export interface CampaignReferenceVideo {
  id: UUID
  campaign_id?: UUID
  campaign_type?: 'regular' | 'four_week' | 'olive_young'
  video_url: string
  title?: string
  description?: string
  display_order?: number
  is_active: boolean
  created_at: Timestamp
}

/**
 * affiliated_creators - Affiliated/contracted creator list
 * Used for: Managing contracted creators with YouTube integration
 */
export interface AffiliatedCreator {
  id: UUID
  company_id: UUID // Required for YouTube API refresh
  creator_name: string
  channel_url?: string
  channel_id?: string // YouTube channel ID (UC...)
  platform: Platform
  youtube_api_key?: string
  use_api: boolean
  thumbnail_url?: string
  subscriber_count?: number
  video_count?: number
  last_video_date?: Timestamp // For 7-day update monitoring
  notes?: string
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * creator_update_alerts - Update alert logs for affiliated creators
 * Used for: Tracking 7+ day no-update alerts
 */
export interface CreatorUpdateAlert {
  id?: UUID
  creator_id: UUID
  days_since_update: number
  alerted_at: Timestamp
  alert_type?: 'no_update_7_days' | 'no_update_14_days'
}

/**
 * our_channels - YouTube support channels (지원 프로그램)
 * Used for: Managing company's own YouTube channels
 */
export interface OurChannel {
  id: UUID
  company_id: UUID
  channel_name: string
  channel_url: string
  channel_id?: string // YouTube channel ID
  youtube_api_key?: string
  thumbnail_url?: string
  description?: string
  subscriber_count?: number
  video_count?: number
  notes?: string
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * channel_statistics - Channel stats history
 * Used for: Tracking channel growth over time
 */
export interface ChannelStatistics {
  id: UUID
  channel_id: string // YouTube channel ID
  channel_type: 'our_channel' | 'affiliated_creator'
  company_id: UUID
  subscriber_count: number
  video_count: number
  view_count: number
  data_source: 'api' | 'manual'
  created_at: Timestamp
}

/**
 * channel_videos - Channel video data
 * Used for: Storing video data from YouTube API
 */
export interface ChannelVideo {
  id?: UUID
  channel_id: string
  company_id: UUID
  video_id: string
  title: string
  description?: string
  thumbnail_url?: string
  published_at: Timestamp
  view_count: number
  like_count: number
  comment_count: number
  duration?: string // ISO 8601 duration
  tags?: string[]
  created_at?: Timestamp
}

/**
 * consultation_requests - B2B consultation requests
 * Used for: Managing B2B inquiries
 * NOTE: Some fields stored in localStorage (see DB_STRUCTURE.md)
 */
export interface ConsultationRequest {
  id: UUID
  company_name: string
  contact_person?: string
  email?: string
  phone?: string
  inquiry_type?: string
  message?: string
  status: 'new' | 'in_progress' | 'completed' | 'closed'
  memo?: string // Admin notes (saved to DB)
  // Following fields NOT in DB - stored in localStorage:
  // - contract_status
  // - expected_revenue
  // - contract_sent
  // - records (consultation history)
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * campaign_creator_matches - Campaign-creator matching
 * Used for: AI-powered creator recommendations
 */
export interface CampaignCreatorMatch {
  id: UUID
  campaign_id: UUID
  creator_id: UUID
  match_score?: number
  status: 'suggested' | 'invited' | 'accepted' | 'rejected'
  created_at: Timestamp
}

/**
 * campaign_invitations - Campaign invitation records
 * Used for: Tracking creator invitations to campaigns
 */
export interface CampaignInvitation {
  id: UUID
  campaign_id: UUID
  creator_id?: UUID
  user_profile_id?: UUID
  email?: string
  status: 'sent' | 'viewed' | 'accepted' | 'declined'
  invited_at: Timestamp
  responded_at?: Timestamp
}

/**
 * campaign_recommendations - AI campaign recommendations
 * Used for: Storing AI-generated campaign recommendations
 */
export interface CampaignRecommendation {
  id: UUID
  user_id: UUID
  campaign_id: UUID
  score: number
  reasons?: string[]
  created_at: Timestamp
}

/**
 * fixed_costs - Fixed monthly costs
 * Used for: Revenue management calculations
 */
export interface FixedCost {
  id: UUID
  name: string
  amount: number
  category?: string
  is_active: boolean
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * creator_report_history - Growth report sending history
 * Used for: Tracking sent growth reports to creators
 */
export interface CreatorReportHistory {
  id: UUID
  creator_id: UUID
  creator_email: string
  creator_name: string
  report_type: 'growth_guide' | 'monthly_summary'
  capi_score?: number
  capi_grade?: string
  capi_analysis?: JSONValue
  sent_by: UUID
  email_status: 'sent' | 'failed' | 'opened'
  created_at: Timestamp
}

/**
 * tax_office_feedback - Tax office feedback records
 * Used for: Managing tax-related feedback
 */
export interface TaxOfficeFeedback {
  id: UUID
  withdrawal_request_id: UUID
  feedback_type: string
  content: string
  status: 'pending' | 'resolved'
  created_at: Timestamp
}

/**
 * notification_logs - Notification sending logs
 * Used for: Tracking notification delivery
 */
export interface NotificationLog {
  id: UUID
  recipient_email?: string
  recipient_phone?: string
  notification_type: 'email' | 'sms' | 'push'
  template_name?: string
  status: 'sent' | 'failed' | 'pending'
  error_message?: string
  created_at: Timestamp
}

/**
 * verification_logs - Business verification logs
 * Used for: Tracking business number verifications
 */
export interface VerificationLog {
  id: UUID
  business_number: string
  verification_result: JSONValue
  source: 'popbill' | 'manual'
  created_at: Timestamp
}

/**
 * creator_grades - Historical grade records (separate from featured_creators)
 * Used for: Grade history tracking
 */
export interface CreatorGrade {
  id: UUID
  creator_id: UUID
  grade_level: CNECGradeLevel
  grade_name: CNECGradeName
  total_score: number
  evaluation_date: Timestamp
  evaluator_id?: UUID
  notes?: string
  created_at: Timestamp
}

/**
 * public_reports - Public report pages
 * Used for: Generating shareable campaign reports
 */
export interface PublicReport {
  id: UUID
  campaign_id: UUID
  slug: string // URL-friendly identifier
  title: string
  is_active: boolean
  expires_at?: Timestamp
  view_count?: number
  created_at: Timestamp
}

/**
 * public_report_videos - Videos in public reports
 * Used for: Video content in public reports
 */
export interface PublicReportVideo {
  id: UUID
  report_id: UUID
  video_url: string
  title?: string
  creator_name?: string
  display_order?: number
  created_at: Timestamp
}

// =============================================================================
// REGIONAL DATABASE TABLES (Korea, Japan, US, Taiwan)
// =============================================================================

/**
 * user_profiles - Creator user profiles (REGIONAL)
 * Used for: Creator registration and profile management
 */
export interface UserProfile {
  id: UUID // References auth.users.id
  name: string
  email: string
  phone?: string
  profile_image?: string

  // Social links
  instagram_url?: string
  youtube_url?: string
  tiktok_url?: string
  blog_url?: string

  // YouTube stats (cached)
  channel_name?: string
  subscriber_count?: number
  avg_views?: number

  // Profile status
  is_verified?: boolean
  is_active?: boolean
  profile_completed?: boolean

  // Location
  region?: Region
  country?: string
  city?: string

  // Bank info for withdrawals
  bank_name?: string
  account_number?: string
  account_holder?: string

  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * applications - Campaign applications (REGIONAL)
 * Used for: Tracking creator applications to campaigns
 */
export interface Application {
  id: UUID
  campaign_id: UUID
  user_id: UUID
  status: ApplicationStatus

  // Selection status
  virtual_selected?: boolean // 가상 선정 (brand review)
  final_selected?: boolean // 최종 선정

  // Application details
  application_message?: string
  portfolio_url?: string

  // Guide delivery
  guide_delivered?: boolean
  guide_delivered_at?: Timestamp
  personalized_guide?: JSONValue

  // Video submission
  video_submitted?: boolean
  video_submission_id?: UUID

  // Completion
  completed_at?: Timestamp
  reward_paid?: boolean

  created_at: Timestamp
  updated_at?: Timestamp

  // Joined data
  campaigns?: Partial<Campaign>
  user_profiles?: Partial<UserProfile>
}

/**
 * campaign_applications - Alternative applications table (REGIONAL)
 * Used for: Some campaigns use this instead of applications
 */
export interface CampaignApplication {
  id: UUID
  campaign_id: UUID
  user_id: UUID
  status: ApplicationStatus
  applied_at: Timestamp
  // Similar to Application interface
}

/**
 * campaign_participants - Campaign participants (REGIONAL)
 * Used for: Final selected participants
 */
export interface CampaignParticipant {
  id: UUID
  campaign_id: UUID
  user_id: UUID
  week_number?: number // For 4-week challenge
  content_type?: string
  status: 'active' | 'completed' | 'dropped'
  created_at: Timestamp
}

/**
 * reference_videos - Reference video library (REGIONAL)
 * Used for: Site-wide reference videos
 */
export interface ReferenceVideo {
  id: UUID
  title: string
  video_url: string
  thumbnail_url?: string
  description?: string
  category?: string
  display_order: number
  is_active: boolean
  created_at: Timestamp
}

/**
 * faqs - FAQ content (REGIONAL)
 * Used for: FAQ management
 */
export interface FAQ {
  id: UUID
  question: string
  answer: string
  category?: string
  display_order: number
  is_active: boolean
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * page_contents - CMS page content (REGIONAL)
 * Used for: Dynamic page content management
 */
export interface PageContent {
  id: UUID
  page_key: string // e.g., 'home', 'about', 'faq'
  section_key?: string
  content: JSONValue | string
  is_active: boolean
  created_at: Timestamp
  updated_at?: Timestamp
}

/**
 * seo_settings - SEO configuration (REGIONAL)
 * Used for: Per-region SEO settings
 */
export interface SEOSettings {
  id: UUID
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  og_image?: string
  favicon?: string
  google_analytics_id?: string
  updated_at: Timestamp
}

/**
 * email_settings - Email configuration (REGIONAL)
 * Used for: SMTP and email settings
 */
export interface EmailSettings {
  id: UUID
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_password?: string
  from_email?: string
  from_name?: string
  reply_to?: string
  updated_at: Timestamp
}

/**
 * site_settings - Site configuration (REGIONAL)
 * Used for: General site settings
 */
export interface SiteSettings {
  id: UUID
  site_name?: string
  logo_url?: string
  footer_text?: string
  social_links?: {
    youtube?: string
    instagram?: string
    twitter?: string
    facebook?: string
  }
  contact_email?: string
  contact_phone?: string
  updated_at: Timestamp
}

/**
 * withdrawal_requests - Creator withdrawal requests (REGIONAL)
 * Used for: Regional withdrawal processing
 */
export interface WithdrawalRequestRegional {
  id: UUID
  user_id: UUID
  amount: number
  status: WithdrawalStatus
  bank_name?: string
  account_number?: string
  account_holder?: string
  processed_at?: Timestamp
  created_at: Timestamp
}

/**
 * point_transactions - Point transactions (REGIONAL)
 * Used for: Creator point history
 */
export interface PointTransactionRegional {
  id: UUID
  user_id: UUID
  amount: number
  type: 'earn' | 'withdraw' | 'bonus' | 'adjustment'
  description?: string
  reference_id?: UUID
  created_at: Timestamp
}

/**
 * teams - Team/agency management
 * Used for: Agency account management
 */
export interface Team {
  id: UUID
  name: string
  owner_id: UUID
  created_at: Timestamp
}

/**
 * team_members - Team member mapping
 * Used for: Linking creators to agencies
 */
export interface TeamMember {
  id: UUID
  team_id: UUID
  user_id: UUID
  role: 'owner' | 'admin' | 'member'
  joined_at: Timestamp
}

// =============================================================================
// STORAGE BUCKETS
// =============================================================================

/**
 * Storage bucket paths used in the application
 */
export interface StorageBuckets {
  'creator-profiles': string // Profile images
  'campaign-images': string // Campaign thumbnails
  'campaign-videos': string // Uploaded campaign videos
  'videos': string // General video storage
}

// =============================================================================
// DATABASE CLIENT HELPERS
// =============================================================================

/**
 * Table names for BIZ database
 */
export type BizTableName =
  | 'admin_users'
  | 'companies'
  | 'campaigns'
  | 'payments'
  | 'points_charge_requests'
  | 'points_transactions'
  | 'tax_invoice_requests'
  | 'receivables'
  | 'financial_records'
  | 'bank_transactions'
  | 'contracts'
  | 'contract_signature_logs'
  | 'featured_creators'
  | 'cnec_plus_pricing'
  | 'featured_creator_applications'
  | 'creator_withdrawal_requests'
  | 'video_submissions'
  | 'video_review_comments'
  | 'video_review_comment_replies'
  | 'notifications'
  | 'creator_points'
  | 'creators'
  | 'system_settings'
  | 'sms_verifications'
  | 'email_templates'
  | 'guidebook_sections'
  | 'campaign_reference_videos'
  | 'affiliated_creators'
  | 'creator_update_alerts'
  | 'our_channels'
  | 'channel_statistics'
  | 'channel_videos'
  | 'consultation_requests'
  | 'campaign_creator_matches'
  | 'campaign_invitations'
  | 'campaign_recommendations'
  | 'fixed_costs'
  | 'creator_report_history'
  | 'tax_office_feedback'
  | 'notification_logs'
  | 'verification_logs'
  | 'creator_grades'
  | 'public_reports'
  | 'public_report_videos'

/**
 * Table names for Regional databases
 */
export type RegionalTableName =
  | 'user_profiles'
  | 'campaigns'
  | 'applications'
  | 'campaign_applications'
  | 'campaign_participants'
  | 'reference_videos'
  | 'faqs'
  | 'page_contents'
  | 'seo_settings'
  | 'email_settings'
  | 'email_templates'
  | 'site_settings'
  | 'withdrawal_requests'
  | 'point_transactions'
  | 'teams'
  | 'team_members'
  | 'featured_creators' // Region-specific featured creators
  | 'admin_users' // Region admin users

// =============================================================================
// GRADE SYSTEM CONSTANTS
// =============================================================================

export const GRADE_LEVELS: Record<CNECGradeLevel, { name: CNECGradeName; color: string }> = {
  1: { name: 'FRESH', color: '#94A3B8' },
  2: { name: 'GLOW', color: '#22C55E' },
  3: { name: 'BLOOM', color: '#3B82F6' },
  4: { name: 'ICONIC', color: '#8B5CF6' },
  5: { name: 'MUSE', color: '#F59E0B' }
}
