Type "# Multiple output formats, no boilerplate needed"
Enter

Sleep 1s

Type "# Tab-separated (default)"
Enter

Sleep 500ms

Type "fakedata email country"
Enter

Sleep 1.5s

Type "# CSV"
Enter

Sleep 500ms

Type 'fakedata -s "," email country'
Enter

Sleep 1.5s

Type "# CSV with headers"
Enter

Sleep 500ms

Type 'fakedata -H -s "," email country'
Enter

Sleep 1.5s

Type "# NDJSON — one JSON object per line"
Enter

Sleep 500ms

Type "fakedata --format ndjson -n 3 email country"
Enter

Sleep 500ms

Type "# ✨ Your data, your format ✨"
Enter

Sleep 3s
