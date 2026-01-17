-- FIX: Allow members to update channel info if config allows
DROP POLICY IF EXISTS "Admins and Owners can update channel details" ON channels;

CREATE POLICY "Admins, Owners, and Permitted Members can update channel details"
ON channels FOR UPDATE
USING (
  -- 1. Is Admin/Owner
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = channels.id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
  OR
  -- 2. OR is Member AND config allows editing
  (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_id = channels.id
      AND user_id = auth.uid()
      AND role = 'member'
    )
    AND (config->>'edit_info')::boolean = true
  )
)
WITH CHECK (
  -- Same check for the new row state
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = channels.id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_id = channels.id
      AND user_id = auth.uid()
      AND role = 'member'
    )
    AND (config->>'edit_info')::boolean = true
  )
);
