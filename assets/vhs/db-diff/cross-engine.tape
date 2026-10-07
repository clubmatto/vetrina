Hide
Type "export PATH=/tmp/db-diff-demo/bin:$PATH && source /tmp/db-diff-demo/env.sh && clear"
Enter
Show

Sleep 500ms

Type "# Engines render values their own way, so a cross engine diff is refused"
Enter

Sleep 1s

Type "db-diff --source=$PG_SRC --target=$MYSQL_DST --table=bookmark"
Enter

Sleep 2s

Type "# ⚡ Refused, rather than reported as every row changed ⚡"
Enter

Sleep 3s
