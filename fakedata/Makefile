SOURCE_FILES?=$$(go list ./... | grep -v /integration | grep -v /scripts)
TEST_PATTERN?=.
TEST_OPTIONS?=

unit: ## Run tests
	@go test $(TEST_OPTIONS) -cover $(SOURCE_FILES) -run $(TEST_PATTERN) -timeout=30s

integration: build-with-cover ## Run integration tests
	@go test $(TEST_OPTIONS) $$(go list ./integration/...) -timeout=30s
	@go tool covdata percent -i=.coverdata

test: unit integration

coverage: build-with-cover ## Run all tests with combined coverage
	@rm -f .unit.out coverage.txt
	@echo "=== Unit Test Coverage ==="
	@go test -coverprofile=.unit.out $(SOURCE_FILES) -timeout=120s
	@echo ""
	@echo "=== Integration Coverage ==="
	@go test $$(go list ./integration/...) -timeout=120s
	@go tool covdata textfmt -i=.coverdata -o=coverage.txt
	@echo ""
	@echo "=== Combined Coverage ==="
	@go run scripts/merge_coverage.go .unit.out coverage.txt

bench: ## Run benchmarks
	@go test $(TEST_OPTIONS) -cover $(SOURCE_FILES) -bench $(TEST_PATTERN) -benchmem -timeout=30s

lint: ## Run linters
	@golangci-lint run

VERSION?=$$(git describe --tags --always --dirty 2>/dev/null || echo "v0.0.0")

build: ## Build a dev version of fakedata
	@mkdir -p bin
	@go build -ldflags="-s -w -X main.version=$(VERSION)" -o bin/fakedata

build-with-cover: ## Build a cover version of fakedata
	@rm -fr .coverdata
	@mkdir -p .coverdata bin
	@go build -cover -ldflags="-X main.version=main" -o bin/fakedata-with-cover

import: ## Import all data (corpora + world)
	@go build -o /tmp/fakedata-import ./tools/import/ && /tmp/fakedata-import

.DEFAULT_GOAL := build
