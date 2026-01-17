-- ENFORCE "Send Messages" Setting - FIXED CASTING
DROP POLICY IF EXISTS "Users can insert messages" ON messages;

CREATE POLICY "Enforce send_messages setting"
ON messages FOR INSERT
WITH CHECK (
  -- 1. Must be a member (Basic check)
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = messages.channel_id::uuid -- EXPLICIT CAST
    AND user_id = auth.uid()
  )
  AND (
    -- 2. OR: Channel allows sending messages
    (
      SELECT (config->>'send_messages')::boolean 
      FROM channels 
      WHERE id = messages.channel_id::uuid -- EXPLICIT CAST
    ) IS NOT FALSE
    OR
    -- 3. OR: User is Admin/Owner (Always allowed)
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_id = messages.channel_id::uuid -- EXPLICIT CAST
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);

-- ENFORCE "Add Members" Setting
DROP POLICY IF EXISTS "Enforce add_members setting" ON channel_members;

CREATE POLICY "Enforce add_members setting"
ON channel_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id -- Both are definitely UUID here
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
      AND cm.user_id = auth.uid()
    )
    AND
    (
      SELECT (config->>'add_members')::boolean 
      FROM channels 
      WHERE id = channel_members.channel_id
    ) IS TRUE
  )
);
