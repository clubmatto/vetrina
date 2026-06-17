Type "# Customize FakeData's behavior on a per-column basis"
Enter

Sleep 1s

Type "# First, let's check what FakeData would do"
Enter

Sleep 1s

Type "fakedata --dsn sqlite:pro.db -t products:5 --dry-run"
Enter

Sleep 3s

Type "# FakeData chose a float for price by default"
Enter

Sleep 500ms

Type "# With -c we can constrain it to an integer range"
Enter

Sleep 1s

Type "fakedata --dsn sqlite:pro.db -t products:5 -c products.price=int:10,100 --dry-run"
Enter

Sleep 500ms

Type "# ✨ Customized to perfection ✨"
Enter

Sleep 3s
