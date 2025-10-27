# Initialize database tables
$env:PGPASSWORD = 'postgres123'
& 'C:/Program Files/PostgreSQL/18/bin/psql.exe' -U postgres -d three_brothers_game -f 'c:\Users\admin\three_game_new\backend\scripts\create-auth-tables.sql'
