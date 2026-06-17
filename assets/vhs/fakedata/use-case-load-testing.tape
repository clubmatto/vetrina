Type "# Load test with real-time streams"
Enter

Sleep 1s

Type "fakedata --stream -f ndjson email country > data.jsonl &"
Enter

Sleep 1.5s

Type "head -3 data.jsonl"
Enter

Sleep 1s

Type "wc -l data.jsonl"
Enter

Sleep 500ms

Type "kill %1"
Enter

Sleep 500ms

Type "# ✨ Endless data, zero effort ✨"
Enter

Sleep 3s
