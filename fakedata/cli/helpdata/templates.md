# Templates

Templates define custom output layouts beyond the default column mode. Pass a
`.tmpl` file with `-T` or pipe a template via stdin.

## Usage

```
fakedata -T mytemplate.tmpl -n 5
echo '{{FirstName}} {{LastName}}' | fakedata -n 5
```

## Generator Names

Generator names are converted to CamelCase for use in templates.
Underscores are removed and the next letter is capitalized:

| CLI name | Template function |
|---|---|
| `first_name` | `{{FirstName}}` |
| `last_name` | `{{LastName}}` |
| `country_code` | `{{CountryCode}}` |
| `programming_language` | `{{ProgrammingLanguage}}` |

Use the name **without** a leading dot — `{{FirstName}}`, not `{{.FirstName}}`.
Generators are registered as template functions, not data fields.

## Built-in Functions

### Loop

```
{{range $i := Loop 5}}
  ...{{$i}}...
{{end}}
```

- `Loop n` — returns slice `[0..n)` for iteration
- `Loop min max` — returns slice with random length between min and max

### Odd / Even

```
{{if Odd $i}}odd row{{end}}
{{if Even $i}}even row{{end}}
```

Takes an integer, returns true if the value is odd or even.

### Int

```
{{Int 10 20}}
```

Returns a random integer in the given range (inclusive).

### Enum

```
{{Enum "red" "green" "blue"}}
```

Returns a random value from the given list.

### File

```
{{File "names.txt"}}
```

Returns a random line from the given file (one value per line).

### Date

```
{{Date "2024-01-01" "2024-12-31"}}
```

Returns a random date in YYYY-MM-DD format between the given dates.

## Examples

### CSV rows with iteration counter

```
{{range $i := Loop 5}}{{$i}},{{FirstName}},{{Email}},{{Country}}
{{end}}
```

### JSON lines

```
{{range $i := Loop 3}}{"name":"{{FirstName}}","email":"{{Email}}"}
{{end}}
```

### Markdown table

```
| Name | Email | Country |
|------|-------|---------|
{{range $i := Loop 5}}| {{FirstName}} {{LastName}} | {{Email}} | {{Country}} |
{{end}}
```
