-- Allow Admins and Owners to add new members
CREATE POLICY "Admins can add members"
ON channel_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channel_members AS cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
    AND (cm.role = 'owner' OR cm.role = 'admin')
  )
);

-- Allow Admins and Owners to remove members (Kick)
CREATE POLICY "Admins can remove members"
ON channel_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM channel_members AS cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
    AND (cm.role = 'owner' OR cm.role = 'admin')
  )
);
