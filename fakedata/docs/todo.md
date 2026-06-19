# TODO

## ~~Country-specific first/last name generators~~ (ALREADY EXISTS)

`first_name_<cc>` and `last_name_<cc>` already exist in `core/people.go`:
`registerCountryNames()` reads `namedata.ForenameIndex` / `SurnameIndex` and
registers hidden per-country variants. My initial exploration missed this.

## Date pair detection — support more word variants (DONE)

Renamed to "ordered column pairs" (the mechanism is purely lexicographic,
not date-specific). Added:

- `departure` / `arrival`
- `opening` / `closing`
- `opened` / `closed`
- `created` / `updated`

Renamed file `core/date_pairs.go` → `core/column_pairs.go`.
Renamed types: `DatePairConfig` → `ColumnPairConfig`.
Renamed funcs: `ensureValidDatePairs` → `ensureOrderedPairs`, etc.

## Custom generator quirks (code bugs) (DONE)

Three issues in `core/types.go`:

1. **`float` separator** — changed `:` to `,` to match all other custom generators
2. **`file` nil/nil** — was already fixed (returns proper error on empty path)
3. **`float` malformed options** — now returns `fmt.Errorf` instead of `nil, nil`

## VHS assets — broken template in assets (NOT AN ISSUE)

`assets/vhs/fakedata/user.tmpl` does not exist on disk. The README example
already uses the correct `{{FirstName}}` syntax (no dot prefix).
