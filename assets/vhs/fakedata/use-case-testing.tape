Type "# Test with deterministic data"
Enter

Sleep 1s

Type "# Generate test data for your database"
Enter

Sleep 500ms

Type 'fakedata -n 10 -H -s "," first_name last_name email country'
Enter

Sleep 1.5s

Type "# Deterministic results with seeds"
Enter

Sleep 500ms

Type "fakedata --seed 42 -n 3 email country"
Enter

Sleep 500ms

Type "# ✨ Deterministic by design ✨"
Enter

Sleep 3s
