Hide
Type "export PATH=/tmp/db-diff-demo/bin:$PATH && source /tmp/db-diff-demo/env.sh && clear"
Enter
Show

Set TypingSpeed 20ms

Sleep 500ms

Type "# Three rows drifted in line_items"
Enter

Sleep 500ms

Type "db-diff --source=$PG_SRC --target=$PG_DST --table=line_items"
Enter

Sleep 1500ms

Type "# Exclude the one column that changed"
Enter

Sleep 500ms

Type "db-diff --source=$PG_SRC --target=$PG_DST --table=line_items --exclude=quantity"
Enter

Sleep 1500ms

Type "# ✨ Skip the noise, keep the signal ✨"
Enter

Sleep 3s
