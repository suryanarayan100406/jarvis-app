-- 1. ADD MISSING COLUMN (Fixes "Could not find 'config' column")
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{"send_messages": true, "send_media": true, "add_members": true, "edit_info": false}';

-- 2. RESET & FIX CHANNEL POLICIES (Fixes "Failed to save settings")
DROP POLICY IF EXISTS "Admins can update channel details" ON channels;
DROP POLICY IF EXISTS "Admins and Owners can update channel details" ON channels;
DROP POLICY IF EXISTS "Enable update for users based on email" ON channels;

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

-- 3. RESET & FIX MEMBER POLICIES (Fixes "violates row-level security policy" when adding/kicking)
DROP POLICY IF EXISTS "Admins can add members" ON channel_members;
DROP POLICY IF EXISTS "Admins and Owners can add members" ON channel_members;
DROP POLICY IF EXISTS "Admins can remove members" ON channel_members;

-- Allow Admins/Owners to ADD members
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

-- Allow Admins/Owners to KICK members (Delete)
CREATE POLICY "Admins and Owners can remove members"
ON channel_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
);

-- 4. RELOAD SCHEMA CACHE (Fixes "schema cache" error immediately)
NOTIFY pgrst, 'reload schema';
