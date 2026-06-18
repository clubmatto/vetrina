# TODO

## Country-specific first/last name generators

`first_name_<cc>` and `last_name_<cc>` don't exist yet, but the data already has per-country names:

- `data/names/forenames.go` — `Forenames` has `Name` and `CountryCode` fields
- `data/names/surnames.go` — `Surnames` has `Name` and `CountryCode` fields

Add to `core/geo.go` `registerCountryVariants()` following the same pattern as
`city_<cc>` / `state_<cc>`: filter by country code, register as hidden generator.

## Date pair detection — support more word variants

The date pair validation in `core/date_pairs.go` only recognizes:

- Prefixes: `start_`, `begin_`, `end_`, `finish_`
- Suffixes: `_from`, `_to`, `_until`
- Mid words: `start`, `begin`, `end`, `finish`, `_from`, `_to`, `_until`

Common column names like `departure` / `arrival` are not detected. Could add:

- `departure` / `arrival`
- `opening` / `closing`
- `opened` / `closed`
- `created_at` / `updated_at` (suffix might already catch `_at`?)

Add to `prefixes`, `suffixes`, and `midWords` slices, plus `isStartVariant` /
`isEndVariant` functions.

## Custom generator quirks (code bugs)

Three issues in `core/types.go` that should be fixed at source:

1. **`float` uses `:` as separator** — inconsistent with every other custom gen
   (`,`). Should accept `,` like all others, or at minimum support both.

2. **`file` returns `nil, nil` on empty options** — should return a proper error.

3. **`float` silently ignores malformed options** — `return nil, nil` instead of
   returning an error when the option isn't in `precision:scale` format.

## VHS assets — broken template in assets

`assets/vhs/fakedata/user.tmpl` uses `{{.FirstName}}` (dot prefix) but generators
are registered as template functions, not data fields. Should be `{{FirstName}}`.
Not used in any active demo tape, but could confuse anyone reading it.
