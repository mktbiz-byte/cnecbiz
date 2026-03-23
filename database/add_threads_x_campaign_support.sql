-- Migration: Add threads_post and x_post campaign type support to Korea DB
-- Date: 2026-03-23
-- Description:
--   1. Add missing columns for threads/x campaigns (text_content_guide, reference_urls, etc.)
--   2. Update campaign_type CHECK constraint to allow 'threads_post' and 'x_post'

-- 1. Add missing columns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS text_content_guide jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reference_urls text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS story_content_guide jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cnec_shop_utm_link text DEFAULT NULL;

-- 2. Drop old constraint and add updated one with threads_post, x_post
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_campaign_type_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_campaign_type_check
  CHECK (campaign_type = ANY (ARRAY['planned', 'oliveyoung', '4week_challenge', 'story_short', 'threads_post', 'x_post', 'regular']::text[]));
