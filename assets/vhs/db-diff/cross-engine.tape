Hide
Type "export PATH=/tmp/db-diff-demo/bin:$PATH && source /tmp/db-diff-demo/env.sh && clear"
Enter
Show

Set TypingSpeed 20ms

Sleep 500ms

Type "# Postgres and MySQL render values their own way"
Enter

Sleep 1s

Type "db-diff --source=$PG_SRC --target=$MYSQL_DST --table=orders"
Enter

Sleep 1500ms

Type "# 🔒 So a cross engine pair is refused before it connects 🔒"
Enter

Sleep 3s
