Type "# Use case: Load Testing"
Enter

Sleep 1s

Type "# Stream thousands of rows"
Enter

Sleep 500ms

Type "fakedata --stream -f ndjson email country > data.jsonl &"
Enter

Sleep 1.5s

Type "# Monitor the output"
Enter

Sleep 1s

Type "wc -l data.jsonl"
Enter

Sleep 2s

Type "# Stop when ready"
Enter

Sleep 500ms

Type "kill %1"
Enter

Sleep 3s
