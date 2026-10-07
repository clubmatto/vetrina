Hide
Type "export PATH=/tmp/db-diff-demo/bin:$PATH && source /tmp/db-diff-demo/env.sh && clear"
Enter
Show

Set TypingSpeed 20ms

Sleep 500ms

Type "# 100,000 orders on each side"
Enter

Sleep 500ms

Type "$PSQL -c 'SELECT id, customer, status, total_cents FROM orders ORDER BY id LIMIT 4'"
Enter

Sleep 1500ms

Type "# The tables match, so only checksums crossed the wire"
Enter

Sleep 500ms

Type "db-diff --source=$PG_SRC --target=$PG_DST --table=orders"
Enter

Sleep 1500ms

Type "# Three rows drifted in line_items"
Enter

Sleep 500ms

Type "db-diff --source=$PG_SRC --target=$PG_DST --table=line_items"
Enter

Sleep 1500ms

Type "# ⚡ Know exactly which rows drifted ⚡"
Enter

Sleep 3s
