Output pro-clickhouse-light.gif
Set FontFamily "JetBrainsMono Nerd Font"
Set FontSize 22
Set Width 1300
Set Height 650
Set Padding 10
Set TypingSpeed 50ms
Set Theme {"name":"Vetrina Light","black":"#5c5f77","red":"#d20f39","green":"#40a02b","yellow":"#df8e1d","blue":"#1e66f5","magenta":"#ea76cb","cyan":"#179299","white":"#acb0be","brightBlack":"#6c6f85","brightRed":"#d20f39","brightGreen":"#40a02b","brightYellow":"#df8e1d","brightBlue":"#1e66f5","brightMagenta":"#ea76cb","brightCyan":"#179299","brightWhite":"#bcc0cc","background":"#f4f4f5","foreground":"#1a1a1a","cursor":"#1a1a1a","cursorAccent":"#f4f4f5","selection":"#acb0be"}

Set TypingSpeed 20ms

Type "# Fakedata now supports ClickHouse!"
Enter

Sleep 1s

Set TypingSpeed 5ms

Type "fakedata --dsn clickhouse://localhost:9000/default -t users:400000 -t orders:300000 -t events:300000"
Enter

Sleep 2s

Set TypingSpeed 20ms

Type "# 1M rows done — let's check"
Enter

Sleep 500ms

Set TypingSpeed 5ms

Type "clickhouse client --query 'SELECT count() FROM users UNION ALL SELECT count() FROM orders UNION ALL SELECT count() FROM events FORMAT PrettyCompactNoEscapes'"
Enter

Sleep 2s

Set TypingSpeed 20ms

Type "# 🎉 1M rows across 3 tables — concurrently! 🎉"
Enter

Sleep 3s
