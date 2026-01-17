-- Add config column to channels if it doesn't exist
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{"send_messages": true, "send_media": true, "add_members": true, "edit_info": false}';

-- Update existing rows to have default config if null
UPDATE channels 
SET config = '{"send_messages": true, "send_media": true, "add_members": true, "edit_info": false}' 
WHERE config IS NULL;
