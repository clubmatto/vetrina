Hide
Type "export PATH=/tmp/db-diff-demo/bin:$PATH && source /tmp/db-diff-demo/env.sh && clear"
Enter
Show

Sleep 500ms

Type "# The same comparison against MySQL"
Enter

Sleep 1s

Type "db-diff --source=$MYSQL_SRC --target=$MYSQL_DST --table=bookmark"
Enter

Sleep 2s

Type "# ⚡ Know exactly which rows drifted ⚡"
Enter

Sleep 3s
