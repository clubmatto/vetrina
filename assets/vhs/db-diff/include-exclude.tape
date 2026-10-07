Hide
Type "export PATH=/tmp/db-diff-demo/bin:$PATH && source /tmp/db-diff-demo/env.sh && clear"
Enter
Show

Sleep 500ms

Type "# Compare the columns that matter, skip the noise"
Enter

Sleep 1s

Type "db-diff --source=$PG_SRC --target=$PG_DST --table=bookmark --exclude=title,unread,note"
Enter

Sleep 2s

Type "# ⚡ The changed row drops out, the missing one stays ⚡"
Enter

Sleep 3s
