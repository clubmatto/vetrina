# Custom Generators

A custom generator accepts user-provided options to change its behaviour.
These are marked with `*` in the generator list.

## How It Works

Each generator has either a `Func` (no options) or a `CustomFunc` (with
options). The `CustomFunc` signature is:

```
func(options string) (func() string, error)
```

It receives the raw option string (everything after `:` in the column spec),
parses it, and returns a closure that generates values.

## Option Convention

Options are comma-separated. Most generators split on `,`:

- `int:10,20` → split `"10,20"` → `["10", "20"]`
- `enum:red,green,blue` → split → `["red", "green", "blue"]`
- `date:2024-01-01,2024-12-31` → split → `["2024-01-01", "2024-12-31"]`

The exception is `float` which uses `:` as separator (`float:6:2`).

## Example

Register a generator that returns a random greeting:

```go
r.Register(Generator{
    Name: "greeting",
    Desc: "random greeting, optionally filtered by style",
    CustomFunc: func(options string) (func() string, error) {
        greetings := []string{
            "Hello", "Hi", "Hey", "Howdy",
        }
        if options == "formal" {
            greetings = []string{"Good day", "Greetings", "Salutations"}
        }
        return r.withList(greetings), nil
    },
})
```

Then use it:

```
fakedata greeting:formal
```
