Type "# Fakedata now supports ClickHouse!"
Enter

Sleep 1s

Type "# Point it at your ClickHouse instance and it introspects your schema"
Enter

Sleep 1s

Type "# Let's see what it would generate"
Enter

Sleep 1s

Set TypingSpeed 5ms

Type "fakedata --dsn clickhouse://localhost:19000/default -t events:10 --dry-run"
Enter

Sleep 3s

Type "# Now let's generate the data for real"
Enter

Sleep 500ms

Type "fakedata --dsn clickhouse://localhost:19000/default -t events:10"
Enter

Sleep 3s

Set TypingSpeed 50ms

Type "# Check the data in ClickHouse"
Enter

Sleep 500ms

Set TypingSpeed 5ms

Type "docker exec fakedata-clickhouse clickhouse-client --query 'SELECT count() FROM events'"
Enter

Sleep 1s

Type "docker exec fakedata-clickhouse clickhouse-client --query 'SELECT * FROM events ORDER BY timestamp LIMIT 5 FORMAT PrettyCompactNoEscapes'"
Enter

Sleep 2s

Set TypingSpeed 50ms

Type "# 🎉 ClickHouse support is live! 🎉"
Enter

Sleep 3s
