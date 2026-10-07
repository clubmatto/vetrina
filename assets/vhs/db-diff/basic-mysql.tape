Hide
Type "export PATH=/tmp/db-diff-demo/bin:$PATH && source /tmp/db-diff-demo/env.sh && clear"
Enter
Show

Set TypingSpeed 20ms

Sleep 500ms

Type "# The same 100,000 orders, this time in MySQL"
Enter

Sleep 500ms

Type "$MYSQL -e 'SELECT id, customer, status, total_cents FROM orders ORDER BY id LIMIT 4'"
Enter

Sleep 1500ms

Type "# Matching tables cost a handful of checksum queries"
Enter

Sleep 500ms

Type "db-diff --source=$MYSQL_SRC --target=$MYSQL_DST --table=orders"
Enter

Sleep 1500ms

Type "# And the drifted rows in line_items"
Enter

Sleep 500ms

Type "db-diff --source=$MYSQL_SRC --target=$MYSQL_DST --table=line_items"
Enter

Sleep 1500ms

Type "# ⚡ Same answer on MySQL ⚡"
Enter

Sleep 3s
