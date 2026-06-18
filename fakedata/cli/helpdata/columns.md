# Column Spec

The column spec syntax lets you name columns, pick generators, and pass
options — all from a single argument.

## Syntax

```
[name:][generator[:options]]
```

| Spec | Meaning |
|---|---|
| `email` | Column "email" using email generator |
| `int:10,20` | Column "int" using int generator, range 10-20 |
| `login:email` | Column "login" using email generator |
| `count:int:10,20` | Column "count" using int generator, range 10-20 |

## Disambiguation

When two parts are given (`foo:bar`), the parser decides:

- If `foo` is a known generator and `bar` is not → `generator:options`
  (`int:10,20`)
- Otherwise → `column:generator` (`login:email`)

Three parts are always `column:generator:options`.

## Custom Generator Options

| Generator | Options format | Example | Default |
|---|---|---|---|
| `int` | `min,max` | `int:10,20` | `0,1000` |
| `float` | `precision:scale` | `float:6:2` | normal distribution, 4 decimals |
| `enum` | `v1,v2,...` | `enum:red,green,blue` | `foo,bar,baz` |
| `file` | path | `file:./names.txt` | required |
| `date` | `min,max` (YYYY-MM-DD) | `date:2024-01-01,2024-12-31` | last 365 days |
| `datetime` | `min,max` (YYYY-MM-DD) | `datetime:2024-01-01,` | last year |
| `timestamp` | `min,max` (YYYY-MM-DD) | `timestamp:2024-01-01,` | last year, RFC3339Nano |
| `phone_number` | digit count (8-12) | `phone_number:10` | 8 digits |
