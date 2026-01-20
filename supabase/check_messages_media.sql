-- Check messages table definition to see if it supports attachments
select 
    column_name, 
    data_type 
from 
    information_schema.columns 
where 
    table_name = 'messages';
