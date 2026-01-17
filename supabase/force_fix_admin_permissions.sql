-- 1. Ensure content column is JSONB (idempotent)
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{"send_messages": true, "send_media": true, "add_members": true, "edit_info": false}';

-- 2. Drop potential conflicting policies
DROP POLICY IF EXISTS "Admins can update channel details" ON channels;
DROP POLICY IF EXISTS "Enable update for users based on email" ON channels;
DROP POLICY IF EXISTS "Enable update for channel members" ON channels;

-- 3. Create the DEFINITIVE policy for channel updates
-- Allows update IF the user is an 'owner' or 'admin' of that channel
CREATE POLICY "Admins and Owners can update channel details"
ON channels FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = channels.id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = channels.id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- 4. Verify channel_members policies for INSERT (Adding users)
DROP POLICY IF EXISTS "Admins can add members" ON channel_members;

CREATE POLICY "Admins and Owners can add members"
ON channel_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
);
