# Seeding & Streaming

## Deterministic Output

Use `--seed` to get the same output every time:

```
fakedata --seed 42 -n 3 email country
fakedata --seed 42 -n 3 email country  # same output
```

Useful for reproducible test data, snapshots, and golden files.

## Row Count

```
fakedata -n 20 email country
```

Default is 10 rows.

## Streaming

Generate rows indefinitely until interrupted:

```
fakedata --stream email
```

Press Ctrl+C to stop. Works with templates too:

```
echo '{{Email}}' | fakedata --stream
```

The tool handles SIGINT and SIGTERM for graceful shutdown.
