SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'channel_members';

-- Also check constraints to see allowed values for status if it's a check constraint
SELECT pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'channel_members'::regclass;
