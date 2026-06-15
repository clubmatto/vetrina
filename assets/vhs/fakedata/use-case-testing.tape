Type "# Use case: Testing"
Enter

Sleep 1s

Type "# Generate test data for your database"
Enter

Sleep 500ms

Type 'fakedata -n 10 -H -s "," first_name last_name email country > users.csv'
Enter

Sleep 1.5s

Type "# Preview the test data"
Enter

Sleep 500ms

Type "head users.csv"
Enter

Sleep 2s

Type "# Deterministic results with seeds"
Enter

Sleep 500ms

Type "fakedata --seed 42 -n 3 email country"
Enter

Sleep 3s
