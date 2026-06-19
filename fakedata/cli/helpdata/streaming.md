# Streaming

Generate rows indefinitely until interrupted:

```
fakedata --stream email
```

Press Ctrl+C to stop. Works with templates too:

```
echo '{{Email}}' | fakedata --stream
```

The tool handles SIGINT and SIGTERM for graceful shutdown.
