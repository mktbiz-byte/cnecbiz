-- Add shipping information columns to campaign_participants table
-- These columns are needed for the company campaign detail page to manage shipping

-- Add columns if they don't exist
ALTER TABLE campaign_participants 
ADD COLUMN IF NOT EXISTS creator_phone TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS address_detail TEXT,
ADD COLUMN IF NOT EXISTS delivery_request TEXT;

-- Add comment for documentation
COMMENT ON COLUMN campaign_participants.creator_phone IS 'Creator contact phone number for shipping';
COMMENT ON COLUMN campaign_participants.postal_code IS 'Postal code for shipping address';
COMMENT ON COLUMN campaign_participants.address IS 'Main shipping address';
COMMENT ON COLUMN campaign_participants.address_detail IS 'Detailed shipping address (apartment number, etc)';
COMMENT ON COLUMN campaign_participants.delivery_request IS 'Special delivery instructions or requests';
