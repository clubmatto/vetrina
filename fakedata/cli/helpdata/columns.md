# Column Spec

The column spec syntax lets you name columns, pick generators, and pass
options — all from a single argument.

## Syntax

```
[name:][generator[:options]]
```

| Spec              | Meaning                                         |
|-------------------|-------------------------------------------------|
| `email`           | Column "email" using email generator            |
| `int:10,20`       | Column "int" using int generator, range 10-20   |
| `login:email`     | Column "login" using email generator            |
| `count:int:10,20` | Column "count" using int generator, range 10-20 |

## Disambiguation

When two parts are given (`foo:bar`), the parser decides:

- If `foo` is a known generator and `bar` is not → `generator:options`
  (`int:10,20`)
- Otherwise → `column:generator` (`login:email`)

Three parts are `column:generator:options` — unless the first part is a known
generator and the second isn't, in which case it's `generator:options`
(`distinct:50000:uuidv4`).

## Custom Generator Options

| Generator      | Options format             | Example                         | Default    |
|----------------|----------------------------|---------------------------------|------------|
| `int`          | `min,max`                  | `int:10,20`                     | `0,1000`   |
| `float`        | `precision,scale`          | `float:6,2`                     | normal distribution, 4 decimals |
| `enum`         | `v1,v2,...`                | `enum:red,green,blue`           | `foo,bar,baz` |
| `file`         | path                       | `file:./names.txt`              | required   |
| `distinct`     | `count:generator[:options]`| `distinct:50000:uuidv4`         | required   |
| `date`         | `min,max` (YYYY-MM-DD)     | `date:2024-01-01,2024-12-31`    | last 365 days |
| `datetime`     | `min,max` (YYYY-MM-DD)     | `datetime:2024-01-01,`          | last year  |
| `timestamp`    | `min,max` (YYYY-MM-DD)     | `timestamp:2024-01-01,`         | last year, RFC3339Nano |
| `phone_number` | digit count (8-12)         | `phone_number:10`               | 8 digits   |

`distinct` samples each row from a fixed pool of N unique values produced by an
inner generator. This controls the *cardinality* of a column — how many distinct
values appear across your rows. The inner generator may take its own options
(`distinct:10000:date:2025-01-01,2026-08-01`) and must be able to produce at
least N distinct values.

## Ordered Column Pairs

When two columns use start/end naming conventions, their values are
automatically ordered so the start always comes before the end:

```
fakedata -H start_date:date end_date:date
fakedata -H begin_at:timestamp finish_at:timestamp
fakedata -H date_from:date date_to:date
fakedata -H departure:date arrival:date
fakedata -H created_at:date updated_at:date
```

The mechanism is purely lexicographic — any generator type works, not just dates.

### Recognized patterns

| Start variants | End variants   |
|----------------|----------------|
| `start_`       | `end_`         |
| `begin_`       | `finish_`      |
| `departure`    | `arrival`      |
| `opening`      | `closing`      |
| `opened`       | `closed`       |
| `created`      | `updated`      |
| `_from` suffix | `_to` suffix   |
|                | `_until` suffix|

Pairs are matched by their shared base name. For example `start_date` and
`end_date` both have base `date`. If the generated end value happens to be
smaller than the start value, they are swapped.
