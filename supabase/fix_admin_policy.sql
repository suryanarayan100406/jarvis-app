-- Allow admins/owners to update their channels
CREATE POLICY "Admins can update channel details"
ON channels FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM channel_members 
    WHERE channel_id = id AND (role = 'admin' OR role = 'owner')
  )
);

-- Ensure config column exists
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{"send_messages": true, "send_media": true, "add_members": true, "edit_info": false}';
