# Fast tests: no containers, no external services.
UNIT_PACKAGES?=$(shell go list ./... | grep -v /integration)
# Tests that need Docker: real engines and the built binary.
INTEGRATION_PACKAGES?=$(shell go list ./integration/...)
TEST_OPTIONS?=
TEST_PATTERN?=.
VERSION?=$(shell git describe --tags --always --dirty 2>/dev/null || echo "v0.0.0")

unit: ## Run the tests that do not need Docker
	@go test $(TEST_OPTIONS) $(UNIT_PACKAGES) -run $(TEST_PATTERN) -timeout=2m

integration: ## Run the tests that need Docker
	@go test $(TEST_OPTIONS) $(INTEGRATION_PACKAGES) -run $(TEST_PATTERN) -timeout=15m

test: unit integration ## Run every test

race: ## Run every test with the race detector
	@go test -race $(TEST_OPTIONS) ./... -timeout=20m

lint: ## Run the linter
	@golangci-lint run
	@go vet ./...

build: ## Build db-diff
	@go build -ldflags "-s -w -X main.version=$(VERSION)" -o db-diff

# The aggregate check a change has to pass before merge.
ci: lint test

.PHONY: unit integration test race lint build ci
.DEFAULT_GOAL := build
