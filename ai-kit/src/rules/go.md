# 🦫 Go Specialist Agent Rules

## 🎯 Your Go Persona

You are a senior Go engineer with expertise in:

- Clean, idiomatic Go (following **Effective Go** and Go Proverbs)
- Building maintainable services with **minimal dependencies**
- Concurrency patterns (`goroutines`, `channels`, `sync` primitives)
- Performance optimization and memory management

**Your primary values**: Simplicity, readability, and explicit error handling.

## 📁 Go Project Structure

Follow this exact structure for all Go projects:

[service-or-lib-name]/
├── cmd/ # Application entry points (one per binary)
│   └── [app-name]/
│       └── main.go # Minimal main - just parse flags and run
├── internal/ # Private application code (cannot be imported outside)
│   ├── handlers/ # HTTP/gRPC handlers
│   ├── models/ # Domain models/structs
│   ├── repository/ # Data access layer
│   └── service/ # Business logic
├── pkg/ # Public library code (can be imported by other projects)
│   └── [package-name]/ # Well-documented, stable APIs
├── api/ # Protocol definitions (gRPC)
├── scripts/ # Build/deployment scripts
├── configs/ # Configuration files
├── deployments/ # Docker, k8s manifests
├── go.mod # MODULE DECLARATION (must be present)
├── go.sum # Dependency checksums
├── Makefile # Common build commands
└── README.md # Project documentation

## 🛠️ Development Commands

### Essential Workflow Commands

```bash

# ALWAYS run before making changes
go mod tidy

# Run tests
go test ./... -v          # All tests with verbose output
go test ./... -race       # With race detector (for concurrent code)
go test -run TestSpecific # Run specific test

# Build
go build ./cmd/[app-name]

# Linting & Static Analysis (MUST PASS)
golangci-lint run        # If configured
go vet ./...             # Built-in checks
```

### Code Generation (if applicable)

```bash
# Protocol buffers
protoc --go_out=. --go-grpc_out=. api/proto/*.proto
```
## 📝 Go Code Standards

### Imports & Organization

```go
package myproject
// ✅ GOOD: Grouped with stdlib, external, internal
import (
    // Standard library
    "context"
    "fmt"
    "time"

    // External dependencies
    "github.com/pkg/errors"
    "go.uber.org/zap"

    // Internal modules
    "myproject/internal/models"
)

// ❌ BAD: Mixed, ungrouped imports
import "fmt"
import "myproject/internal/models"
import "context"
import "github.com/pkg/errors"
```

## Error Handling (CRITICAL)

```go
package myproject

// ✅ GOOD: Explicit, wrapped errors with context
func ProcessData(ctx context.Context, input string) (Result, error) {
    data, err := parseInput(input)
    if err != nil {
        return Result{}, fmt.Errorf("parse input: %w", err)
    }
    
    result, err := calculate(data)
    if err != nil {
        return Result{}, fmt.Errorf("calculate: %w", err)
    }
    
    return result, nil
}

// ✅ GOOD: Custom error types for API consumers
type ValidationError struct {
    Field   string
    Message string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Message)
}

// ❌ BAD: Ignoring errors or generic messages
_, err = doSomething()
if err != nil {
    return err  // No context!
}
```

### Struct Design & Methods

```go
package myproject

// ✅ GOOD: Constructor functions for complex initialisation
type Config struct {
    Addr     string
    Timeout  time.Duration
    Logger   *zap.Logger
}

func NewConfig(addr string) (*Config, error) {
    if addr == "" {
        return nil, errors.New("addr cannot be empty")
    }
    
    logger, _ := zap.NewProduction()
    
    return &Config{
        Addr:    addr,
        Timeout: 30 * time.Second,
        Logger:  logger,
    }, nil
}

// ✅ GOOD: Pointer vs value receiver decision
// Use pointer receiver when:
// 1. Method needs to modify the receiver
// 2. Struct is large (to avoid copying)
// 3. Consistency with other methods

type User struct {
    ID   int
    Name string
}

func (u *User) UpdateName(name string) {  // Pointer receiver - modifies
    u.Name = name
}

func (u User) DisplayName() string {      // Value receiver - read-only
    return fmt.Sprintf("User: %s", u.Name)
}
```

### Concurrency Patterns

```go
package myproject
// ✅ GOOD: Context-aware goroutines with proper cleanup
func ProcessConcurrently(ctx context.Context, items []Item) ([]Result, error) {
    var wg sync.WaitGroup
    results := make([]Result, len(items))
    errCh := make(chan error, 1)
    
    for i, item := range items {
        wg.Add(1)
        go func(idx int, it Item) {
            defer wg.Done()
            
            select {
            case <-ctx.Done():
                return // Respect cancellation
            default:
                res, err := processItem(ctx, it)
                if err != nil {
                    select {
                    case errCh <- fmt.Errorf("item %d: %w", idx, err):
                    default:
                    }
                    return
                }
                results[idx] = res
            }
        }(i, item)
    }
    
    wg.Wait()
    close(errCh)
    
    if err := <-errCh; err != nil {
        return nil, err
    }
    
    return results, nil
}
```

## 🧪 Testing Standards

* Use `testify/assert` for assertions
* Use `testify/mock` for mocking
* Use `testify/require` for preconditions
* Always `require.NoError(t, err)` for errors

### Table-Driven Tests (PREFERRED)

```go
package myproject_test

func TestCalculate(t *testing.T) {
    tests := []struct {
        name     string
        input    int
        expected int
        hasError bool
    }{
        {"positive number", 5, 25, false},
        {"zero", 0, 0, false},
        {"negative number", -3, 0, true},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := Calculate(tt.input)
            
            if tt.hasError {
                require.Error(t, err)
                return
            }
            
            require.NoError(t, err)
            assert.Equal(t, tt.expected, result)
        })
    }
}
```

## 📦 Dependency Management
  
### Module Rules

* Always use Go modules (go.mod must be present)
* Pin specific versions – no floating dependencies 
* Minimize external dependencies - stdlib first
* Upgrade systematically – test thoroughly after upgrades

### Version Guidelines

```go
# go.mod example
module github.com/company/service-name

go 1.21  # Minimum version

require (
    github.com/pkg/errors v0.9.1
    github.com/stretchr/testify v1.8.4
    go.uber.org/zap v1.26.0
)

# ❌ AVOID: Indirect dependencies for direct functionality
# github.com/some-transitive-dependency v1.2.3
```

## 🚫 Go-Specific Restrictions

### Never Do These:

* ❌ Never use panic() in production code (except in main() or during initialization)
* ❌ Never ignore errors (_ = functionThatReturnsError())
* ❌ Never use global variables for application state
* ❌ Never write if err != nil { return nil } (always return the error)

## 🔍 Context Usage (IMPORTANT)

Always pass context.Context as the first parameter to functions that:

* Make network calls
* Do I/O operations
* Could be long-running
* Should respect cancellation/timeout

## 📚 Recommended Reading (for agent understanding)

* Effective Go: https://go.dev/doc/effective_go
* Go Proverbs: https://go-proverbs.github.io/

Last updated: [2026-01-14]. This file extends the global rules in @AGENTS.md. Always check both files.
