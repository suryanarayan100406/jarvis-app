-- Add status column to channel_members
ALTER TABLE channel_members 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'pending'));

-- Update Policies to ensure users can see their own Pending invites
-- (Existing policies might already cover this if they just check for row existence, but let's be safe)

-- Policy: Users can see channels they are invited to
-- We need to update "View channels" policy in channels table
DROP POLICY IF EXISTS "View channels" ON channels;

CREATE POLICY "View channels"
ON channels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channels.id
    AND cm.user_id = auth.uid()
    -- We allow viewing if active OR pending (so they can accept)
    AND cm.status IN ('active', 'pending')
  )
  OR type = 'global'
);
