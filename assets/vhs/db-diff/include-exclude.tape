Hide
Type "export PATH=/tmp/db-diff-demo/bin:$PATH && source /tmp/db-diff-demo/env.sh && clear"
Enter
Show

Sleep 500ms

Type "# Three rows drifted in line_items"
Enter

Sleep 500ms

Set TypingSpeed 5ms

Type "db-diff --source=$PG_SRC --target=$PG_DST --table=line_items"
Enter

Wait+Screen@60s /differing rows/

Set TypingSpeed 50ms

Type "# Exclude the one column that changed"
Enter

Sleep 500ms

Set TypingSpeed 5ms

Type "db-diff --source=$PG_SRC --target=$PG_DST --table=line_items --exclude=quantity"
Enter

Wait+Screen@60s /differing rows/

Set TypingSpeed 50ms

Type "# ✨ Skip the noise, keep the signal ✨"
Enter

Sleep 3s
