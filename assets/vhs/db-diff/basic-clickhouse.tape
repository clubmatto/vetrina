Hide
Type "export PATH=/tmp/db-diff-demo/bin:$PATH && source /tmp/db-diff-demo/env.sh && clear"
Enter
Show

Set TypingSpeed 20ms

Sleep 500ms

Type "# Same story on ClickHouse"
Enter

Sleep 500ms

Type "$CH --format PrettyCompact --query 'SELECT id, customer, status, total_cents FROM orders ORDER BY id LIMIT 4'"
Enter

Sleep 1500ms

Type "# Matching tables cost a handful of checksum queries"
Enter

Sleep 500ms

Type "db-diff --source=$CH_SRC --target=$CH_DST --table=orders"
Enter

Sleep 1500ms

Type "# And the drifted rows in line_items"
Enter

Sleep 500ms

Type "db-diff --source=$CH_SRC --target=$CH_DST --table=line_items"
Enter

Sleep 1500ms

Type "# ⚡ Same answer on ClickHouse ⚡"
Enter

Sleep 3s
