-- ENFORCE "Send Messages" Setting
DROP POLICY IF EXISTS "Users can insert messages" ON messages;

CREATE POLICY "Enforce send_messages setting"
ON messages FOR INSERT
WITH CHECK (
  -- 1. Must be a member (Basic check)
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = messages.channel_id
    AND user_id = auth.uid()
  )
  AND (
    -- 2. OR: Channel allows sending messages
    (
      SELECT (config->>'send_messages')::boolean 
      FROM channels 
      WHERE id = messages.channel_id
    ) IS NOT FALSE -- specific check for true or null (default allowed if missing, but we set default true)
    OR
    -- 3. OR: User is Admin/Owner (Always allowed)
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_id = messages.channel_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);

-- ENFORCE "Add Members" Setting (Already partially covered, but let's be strict)
DROP POLICY IF EXISTS "Admins and Owners can add members" ON channel_members;

CREATE POLICY "Enforce add_members setting"
ON channel_members FOR INSERT
WITH CHECK (
  -- Case 1: Admin/Owner adding someone (Always allowed)
  EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
  OR
  -- Case 2: Member adding someone (Inviting) - IF Allowed
  (
    -- Must be a member themselves
    EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
      AND cm.user_id = auth.uid()
    )
    AND
    -- Config must allow it
    (
      SELECT (config->>'add_members')::boolean 
      FROM channels 
      WHERE id = channel_members.channel_id
    ) IS TRUE
    -- And they can only add with 'pending' status (enforced by code, but good to think about)
  )
);
