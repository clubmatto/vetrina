Hide
Type "export PATH=/tmp/db-diff-demo/bin:$PATH && source /tmp/db-diff-demo/env.sh && clear"
Enter
Show

Sleep 500ms

Type "# A changed row, a missing row, an extra row"
Enter

Sleep 1s

Type "db-diff --source=$PG_SRC --target=$PG_DST --table=bookmark"
Enter

Sleep 2s

Type "# ⚡ Know exactly which rows drifted ⚡"
Enter

Sleep 3s
