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

## PostgreSQL Generators

These generators produce output compatible with PostgreSQL data types:

| Generator | Description | Example output |
|---|---|---|
| `json` | JSON object | `{"key":"foo","value":42}` |
| `jsonb_array` | JSONB array | `[{"id":42,"active":true}]` |
| `pg_array_int` | Integer array | `{1,2,3}` |
| `pg_array_text` | Text array | `{"foo","bar"}` |
| `polygon` | Polygon type | `(0.123,0.456,0.789,0.012)` |
