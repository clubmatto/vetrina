Type "# Point FakeData at your DB, it generates data for all your tables"
Enter

Sleep 1s

Type "fakedata --dsn sqlite:pro.db"
Enter

Sleep 2s

Type "# Let's check what happened"
Enter

Sleep 1s

Set TypingSpeed 5ms

Type "sqlite3 -header -column pro.db 'SELECT u.name, u.email, p.name AS product, o.quantity FROM orders o JOIN users u ON u.id = o.user_id JOIN products p ON p.id = o.product_id LIMIT 8;'"
Enter

Sleep 500ms

Set TypingSpeed 50ms

Type "# 🎉 Effortless generation! 🎉"
Enter

Sleep 3s

