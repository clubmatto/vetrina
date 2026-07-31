Set TypingSpeed 20ms

Type "# Fakedata now supports ClickHouse!"
Enter

Sleep 1s

Set TypingSpeed 5ms

Type "fakedata --dsn clickhouse://localhost:9000/default -t users:400000 -t orders:300000 -t events:300000"
Enter

Sleep 7s

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
