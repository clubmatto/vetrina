# Output Formats

## Column Mode (default)

Tab-separated values written to stdout:

```
fakedata email country
```

### Custom separator

```
fakedata -s "," email country
fakedata -H -s " | " email country
```

### Header row

```
fakedata -H email country
fakedata -H -s "," email:first_name country
```

## NDJSON

Newline-delimited JSON, one row per line:

```
fakedata --format ndjson -n 3 email country
```
