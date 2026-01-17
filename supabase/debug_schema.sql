
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'channels';

SELECT * FROM pg_policies WHERE tablename = 'channels';
